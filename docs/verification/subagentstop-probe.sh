#!/usr/bin/env bash
# SubagentStop probe for feat-stop-gate-fixes (plan row 1.2, Arch Risks + dispatch-line).
#
# Answers two questions before the Stop-gate moves to SubagentStop:
#   1. Does SubagentStop fire for a background specmanager:builder, not only a foreground one?
#   2. Is the first record of agent_transcript_path the dispatch prompt (with its Dispatch: line)?
#
# Runs one headless `claude -p` session against this checkout's plugin in a scratch project.
# That session dispatches a foreground builder (Dispatch: task-001), then a background one
# (Dispatch: task-002). Both prompts are trivial, so spend stays small.
# A logging SubagentStop hook (no matcher, so every subagent) appends its stdin JSON to a log
# and copies the first record and the full transcript of agent_transcript_path.
#
# Usage: docs/verification/subagentstop-probe.sh <scratch-dir> [model]   (model defaults to sonnet)
# Needs network and writes outside the repo: run with the Bash sandbox disabled.
#
# Outputs under <scratch-dir>/out/: session.jsonl (main stream), session.err,
# subagentstop.jsonl (one hook payload per line), first-record-<agent_id>.json,
# transcript-<agent_id>.jsonl, tool-calls.txt, summary.txt.
set -euo pipefail

SCRATCH=$1
MODEL=${2:-sonnet}
REPO=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
PROJ=$SCRATCH/proj
OUT=$SCRATCH/out
DATA=$SCRATCH/plugin-data
HOOK=$SCRATCH/subagentstop-hook.sh

setup() {
  rm -rf "$PROJ" "$OUT" "$DATA" && mkdir -p "$PROJ" "$OUT" "$DATA"
  (cd "$PROJ" && git init -q -b main && echo probe > README.md && git add -A && git commit -qm probe)
  cat > "$HOOK" <<EOF
#!/usr/bin/env bash
in=\$(cat)
printf '%s\n' "\$in" >> "$OUT/subagentstop.jsonl"
tp=\$(printf '%s' "\$in" | jq -r '.agent_transcript_path // empty')
id=\$(printf '%s' "\$in" | jq -r '.agent_id // "unknown"')
if [ -n "\$tp" ] && [ -f "\$tp" ]; then
  head -n 1 "\$tp" > "$OUT/first-record-\$id.json"
  cp "\$tp" "$OUT/transcript-\$id.jsonl"
fi
exit 0
EOF
}

settings() {
  jq -cn --arg cmd "bash $HOOK" '{
    enabledPlugins: {"specmanager@specmanager": false},
    hooks: {SubagentStop: [{hooks: [{type: "command", command: $cmd}]}]}
  }'
}

PROMPT='This is a hook probe. Use the Agent tool exactly twice, with subagent_type "specmanager:builder".

1. Foreground (do not set run_in_background). The prompt must be exactly these two lines:
Dispatch: task-001
Probe only: reply DONE and change nothing. Call no tools.
Wait for its result.

2. Background (run_in_background: true). The prompt must be exactly these two lines:
Dispatch: task-002
Probe only: reply DONE and change nothing. Call no tools.
Wait for its completion notification before you finish.

Do nothing else. When both have finished, reply PROBE-COMPLETE.'

run() {
  (cd "$PROJ" && env -i HOME="$HOME" PATH="$PATH" USER="$USER" SHELL="$SHELL" \
    LANG="${LANG:-en_US.UTF-8}" TMPDIR="$TMPDIR" CLAUDE_PLUGIN_DATA="$DATA" \
    claude --plugin-dir "$REPO/plugins/specmanager" --settings "$(settings)" \
      --model "$MODEL" --allowedTools Agent \
      -p "$PROMPT" --output-format stream-json --verbose > "$OUT/session.jsonl" 2> "$OUT/session.err" || true)
}

# One line per Agent call in the main stream: subagent_type, run_in_background, prompt's first line.
tool_calls() {
  jq -r 'select(.type=="assistant" and .parent_tool_use_id == null) | .message.content[]?
    | select(.type=="tool_use")
    | "\(.name) type=\(.input.subagent_type) bg=\(.input.run_in_background // false) first=\((.input.prompt // "") | split("\n")[0])"' \
    "$OUT/session.jsonl" > "$OUT/tool-calls.txt"
}

summarize() {
  {
    echo "== session result"
    jq -c 'select(.type=="result") | {is_error, num_turns, total_cost_usd, result: (.result // "")[0:80]}' "$OUT/session.jsonl"
    echo "== SubagentStop payloads"
    [ -f "$OUT/subagentstop.jsonl" ] && jq -c '{hook_event_name, agent_type, agent_id, session_id,
      last_assistant_message: (.last_assistant_message // "" | .[0:120]), agent_transcript_path}' "$OUT/subagentstop.jsonl"
    echo "== first transcript records"
    for f in "$OUT"/first-record-*.json; do
      [ -f "$f" ] || continue
      jq -c --arg f "$(basename "$f")" '{file: $f, type, parentUuid, isSidechain,
        content_type: (.message.content | type),
        content_head: (.message.content | if type == "string" then .[0:60] else (map(.text // "") | join("")[0:60]) end)}' "$f"
    done
    echo "== SubagentHandback in transcripts"
    for f in "$OUT"/transcript-*.jsonl; do
      [ -f "$f" ] || continue
      echo "$(basename "$f"): $(grep -c 'SubagentHandback' "$f" || true) lines"
    done
  } > "$OUT/summary.txt"
}

setup
run
tool_calls
summarize
cat "$OUT/tool-calls.txt" "$OUT/summary.txt"
