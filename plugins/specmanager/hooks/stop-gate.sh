#!/usr/bin/env bash
# R1 — Stop-gate hook. Pure bash, zero model calls. On a Stop attempt it resolves
# the active card (feature with open plan tasks + its active phase), runs that
# phase's test command (or skips for the "none" marker), and verifies all phase
# tasks are done. Pass ⇒ exit 0 (allow stop). Fail ⇒ exit 2 with actionable
# stderr (the only channel back to Claude). Absence of a test command is never a
# failure — only a present command exiting non-zero, or unmet criteria, fails.
#
# Iteration cap (N=3) lives in this script too (see counter section): the Nth
# consecutive fail surfaces the phase as blocked and exits 0 to break the loop.

set -uo pipefail

# Drain stdin (the Stop-hook JSON); we don't need its fields for resolution.
cat >/dev/null 2>&1 || true

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-}"
PROJECT_DIR="${SPECMANAGER_PROJECT_DIR:-${CLAUDE_PROJECT_DIR:-$PWD}}"
NODE_BIN="$(command -v node || true)"

# No node or no plugin root ⇒ cannot resolve; never invent a failure.
if [[ -z "$NODE_BIN" || -z "$PLUGIN_ROOT" ]]; then
  exit 0
fi

RESOLVER="$PLUGIN_ROOT/server/dist/resolve-active-card.js"
if [[ ! -f "$RESOLVER" ]]; then
  exit 0
fi

CARD_JSON="$(SPECMANAGER_PROJECT_DIR="$PROJECT_DIR" "$NODE_BIN" "$RESOLVER" 2>/dev/null || echo null)"

# Nothing in flight ⇒ no-op pass.
if [[ -z "$CARD_JSON" || "$CARD_JSON" == "null" ]]; then
  exit 0
fi

# Extract one field from the card JSON via node (no jq dependency).
card_field() {
  local field="$1"
  printf '%s' "$CARD_JSON" | "$NODE_BIN" -e '
    let s=""; process.stdin.on("data",d=>s+=d).on("end",()=>{
      try { const c=JSON.parse(s); const v=c["'"$field"'"];
        if (v==null) { process.stdout.write(""); }
        else if (Array.isArray(v)) { process.stdout.write(v.join(" ")); }
        else { process.stdout.write(String(v)); }
      } catch { process.stdout.write(""); }
    });'
}

FEATURE_ID="$(card_field featureId)"
SLUG="$(card_field slug)"
PHASE="$(card_field phase)"
TEST_COMMAND="$(card_field testCommand)"
EXIT_TEST="$(card_field exitTest)"
OPEN_TASKS="$(card_field openTaskIds)"

# ── Iteration cap (N=3) ───────────────────────────────────────────────────────
# Counter keyed per feature-phase under the project cache. Reset when the phase
# key changes (fresh budget) or the gate passes (counter deleted). The Nth
# consecutive fail surfaces the phase as blocked and exits 0 to break the loop.
MAX_ITERATIONS=3
CACHE_DIR="$PROJECT_DIR/.claude/specs/.cache/stop-gate"
# Sanitize the key so it is filesystem-safe.
SAFE_KEY="$(printf '%s__%s' "$SLUG" "$PHASE" | tr -c 'A-Za-z0-9_.-' '_')"
COUNTER_FILE="$CACHE_DIR/$SAFE_KEY"

read_counter() {
  [[ -f "$COUNTER_FILE" ]] && cat "$COUNTER_FILE" 2>/dev/null || echo 0
}
clear_counter() {
  rm -f "$COUNTER_FILE" 2>/dev/null || true
}

# ── Resolve the command to run ────────────────────────────────────────────────
RUN_CMD=""
SKIP_RUN=0
if [[ "$TEST_COMMAND" == "none" ]]; then
  # Intentionally test-less phase: skip the run, verify criteria only.
  SKIP_RUN=1
elif [[ -n "$TEST_COMMAND" ]]; then
  RUN_CMD="$TEST_COMMAND"
else
  # Field absent (plans with no meta.phases) ⇒ fall back to the phase's
  # **Exit test:** line if it looks runnable. Nothing else is probed: a
  # project-root `npm test`/`pytest`/`cargo test` has no relationship to the
  # active phase, so inferring one would invent a failure. Unresolved ⇒ the test
  # leg is skipped and the open-tasks leg still gates.
  if [[ -n "$EXIT_TEST" ]] && [[ "$EXIT_TEST" == *"npm "* || "$EXIT_TEST" == *"uv "* || "$EXIT_TEST" == *"cargo "* ]]; then
    RUN_CMD="$EXIT_TEST"
  fi
fi

# ── Run the test command (when there is one) ──────────────────────────────────
TEST_FAILED=0
TEST_OUTPUT=""
if [[ "$SKIP_RUN" -eq 0 && -n "$RUN_CMD" ]]; then
  TEST_OUTPUT="$(cd "$PROJECT_DIR" && bash -lc "$RUN_CMD" 2>&1)"
  TEST_RC=$?
  if [[ "$TEST_RC" -ne 0 ]]; then
    TEST_FAILED=1
  fi
fi

# ── Compose failure reasons ───────────────────────────────────────────────────
REASONS=()
if [[ "$TEST_FAILED" -eq 1 ]]; then
  LAST="$(printf '%s\n' "$TEST_OUTPUT" | tail -n 20)"
  REASONS+=("tests failing for phase '$PHASE' (\`$RUN_CMD\`):"$'\n'"$LAST")
fi
if [[ -n "$OPEN_TASKS" ]]; then
  REASONS+=("phase '$PHASE' has tasks not done: $OPEN_TASKS")
fi

if [[ ${#REASONS[@]} -eq 0 ]]; then
  # Gate passes — clear the retry budget for this phase.
  clear_counter
  exit 0
fi

# Gate fails — increment the per-phase counter.
mkdir -p "$CACHE_DIR" 2>/dev/null || true
COUNT=$(( $(read_counter) + 1 ))
printf '%s' "$COUNT" > "$COUNTER_FILE" 2>/dev/null || true

if [[ "$COUNT" -ge "$MAX_ITERATIONS" ]]; then
  # Cap reached — surface the phase as blocked and allow the stop (no infinite loop).
  REASON_TEXT="iteration cap ($MAX_ITERATIONS) reached: ${REASONS[0]}"
  BLOCKER="$PLUGIN_ROOT/server/dist/set-phase-blocked.js"
  if [[ -f "$BLOCKER" ]]; then
    SPECMANAGER_PROJECT_DIR="$PROJECT_DIR" "$NODE_BIN" "$BLOCKER" \
      "$FEATURE_ID" "$PHASE" "$REASON_TEXT" >/dev/null 2>&1 || true
  fi
  clear_counter
  {
    echo "specmanager Stop-gate: phase '$PHASE' (${SLUG}) BLOCKED after $MAX_ITERATIONS failed gate attempts."
    echo "  Recorded blocked: $REASON_TEXT"
    echo "  Re-enter and rebuild the phase to reset the retry budget."
  } >&2
  exit 0
fi

# Under the cap — actionable stderr, force continue.
{
  echo "specmanager Stop-gate: phase '$PHASE' (${SLUG}) is not complete — keep working (attempt $COUNT/$MAX_ITERATIONS):"
  for r in "${REASONS[@]}"; do
    echo "  - $r"
  done
} >&2
exit 2
