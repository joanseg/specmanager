#!/usr/bin/env bash
# Stop-gate hook, registered on SubagentStop for `specmanager:builder` only.
# Pure bash, zero model calls; every decision lives in TS core. The whole hook
# JSON goes to resolve-active-card.js, which reads the builder's `Dispatch:`
# line from its transcript and prints the gate card, or `null` (pass).
#
#   dispatched tasks open        ⇒ exit 2; stderr is the builder's next instruction
#   done, other phase tasks open ⇒ exit 0, no tests (card.runTests false)
#   done, phase otherwise done   ⇒ run the phase test; red ⇒ exit 2, green ⇒ exit 0
#
# Retry budget: N=3 consecutive fails per dispatch (card.counterKey). The third
# blocks card.blockTaskId alone, clears that dispatch's counter and exits 0 so the
# builder returns. A pass deletes only that dispatch's counter; set_active_build
# resets the phase's counters. Absence of a signal is never a failure.

set -uo pipefail

HOOK_INPUT="$(cat 2>/dev/null || true)"

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-}"
PROJECT_DIR="${SPECMANAGER_PROJECT_DIR:-${CLAUDE_PROJECT_DIR:-}}"
NODE_BIN="$(command -v node || true)"

# No node, plugin root or project dir ⇒ cannot resolve; never invent a failure.
if [[ -z "$NODE_BIN" || -z "$PLUGIN_ROOT" || -z "$PROJECT_DIR" ]]; then
  exit 0
fi

RESOLVER="$PLUGIN_ROOT/server/dist/resolve-active-card.js"
if [[ ! -f "$RESOLVER" ]]; then
  exit 0
fi

CARD_JSON="$(printf '%s' "$HOOK_INPUT" | SPECMANAGER_PROJECT_DIR="$PROJECT_DIR" "$NODE_BIN" "$RESOLVER" 2>/dev/null || echo null)"

# Not a gated builder stop ⇒ pass.
if [[ -z "$CARD_JSON" || "$CARD_JSON" == "null" ]]; then
  exit 0
fi

# One card field as text (arrays space-joined, null ⇒ empty). No jq dependency.
card_field() {
  printf '%s' "$CARD_JSON" | "$NODE_BIN" -e '
    let s=""; process.stdin.on("data",d=>s+=d).on("end",()=>{
      try { const v=JSON.parse(s)[process.argv[1]];
        process.stdout.write(v==null ? "" : Array.isArray(v) ? v.join(" ") : String(v));
      } catch {}
    });' "$1"
}

FEATURE_ID="$(card_field featureId)"
SLUG="$(card_field slug)"
PHASE="$(card_field phase)"
TEST_COMMAND="$(card_field testCommand)"
EXIT_TEST="$(card_field exitTest)"
OPEN_TASKS="$(card_field openTaskIds)"
RUN_TESTS="$(card_field runTests)"
COUNTER_KEY="$(card_field counterKey)"
BLOCK_TASK="$(card_field blockTaskId)"

MAX_ITERATIONS=3
CACHE_DIR="$PROJECT_DIR/.claude/specs/.cache/stop-gate"
COUNTER_FILE="$CACHE_DIR/$COUNTER_KEY"

clear_counter() {
  rm -f "$COUNTER_FILE" 2>/dev/null || true
}

# ── Open-tasks leg first; the test leg runs only when the card says so ────────
REASON=""
RUN_CMD=""
if [[ -n "$OPEN_TASKS" ]]; then
  REASON="dispatched task(s) not done: $OPEN_TASKS"
elif [[ "$RUN_TESTS" == "true" && "$TEST_COMMAND" != "none" ]]; then
  if [[ -n "$TEST_COMMAND" ]]; then
    RUN_CMD="$TEST_COMMAND"
  elif [[ "$EXIT_TEST" == *"npm "* || "$EXIT_TEST" == *"uv "* || "$EXIT_TEST" == *"cargo "* ]]; then
    # No meta.testCommand ⇒ the plan's **Exit test:** line, if it looks runnable.
    RUN_CMD="$EXIT_TEST"
  fi
fi

if [[ -n "$RUN_CMD" ]]; then
  TEST_OUTPUT="$(cd "$PROJECT_DIR" && bash -lc "$RUN_CMD" 2>&1)"
  if [[ $? -ne 0 ]]; then
    REASON="phase '$PHASE' tests failing (\`$RUN_CMD\`):"$'\n'"$(printf '%s\n' "$TEST_OUTPUT" | tail -n 20)"
  fi
fi

if [[ -z "$REASON" ]]; then
  clear_counter
  exit 0
fi

# ── Fail: strike this dispatch's budget ───────────────────────────────────────
mkdir -p "$CACHE_DIR" 2>/dev/null || true
PREV="$(cat "$COUNTER_FILE" 2>/dev/null || echo 0)"
COUNT=$(( PREV + 1 ))
printf '%s' "$COUNT" > "$COUNTER_FILE" 2>/dev/null || true

if [[ "$COUNT" -ge "$MAX_ITERATIONS" ]]; then
  REASON_TEXT="iteration cap ($MAX_ITERATIONS) reached: $REASON"
  clear_counter
  if SPECMANAGER_PROJECT_DIR="$PROJECT_DIR" "$NODE_BIN" "$PLUGIN_ROOT/server/dist/set-phase-blocked.js" \
      "$FEATURE_ID" "$PHASE" "$BLOCK_TASK" "$REASON_TEXT" >/dev/null 2>&1; then
    {
      echo "specmanager Stop-gate: $BLOCK_TASK BLOCKED after $MAX_ITERATIONS failed gate attempts (phase '$PHASE', ${SLUG})."
      echo "  Reason: $REASON"
      echo "  Only $BLOCK_TASK is blocked; every other task keeps its status."
      echo "  Running /specmanager-build for this phase again resets the retry budget."
    } >&2
  else
    {
      echo "specmanager Stop-gate: $MAX_ITERATIONS failed gate attempts (phase '$PHASE', ${SLUG}), but recording $BLOCK_TASK as blocked failed; no task status changed."
      echo "  Reason: $REASON"
    } >&2
  fi
  exit 0
fi

# Under the cap: keep the builder working.
{
  echo "specmanager Stop-gate: not done yet — keep working (attempt $COUNT/$MAX_ITERATIONS, phase '$PHASE')."
  echo "  - $REASON"
  if [[ -n "$OPEN_TASKS" ]]; then
    echo "  Finish each and mark it done with update_task (commit + file artifacts)."
  else
    echo "  Fix the failure, then stop again."
  fi
  echo "  If a human prerequisite is missing, reply starting NEEDS_HUMAN: instead."
  echo "  On attempt $MAX_ITERATIONS the gate blocks $BLOCK_TASK and lets you stop."
} >&2
exit 2
