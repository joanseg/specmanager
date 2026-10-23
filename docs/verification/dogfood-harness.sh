#!/usr/bin/env bash
# Dogfood harness for feat-agent-prompt-simplification-opus-5-5 (Arch G4).
#
# Runs the fixed intent headless against the plugin at <sha>: /specmanager-loop,
# then /specmanager-build <slug> next, in a fresh scratch project outside the repo.
#
# Usage: docs/verification/dogfood-harness.sh <label> <sha> <scratch-dir>
#   e.g. dogfood-harness.sh before ad11cd8 /path/to/scratchpad/dogfood
#
# Outputs under <scratch-dir>/<label>/out/: loop.jsonl, build.jsonl, specs-tree.txt,
# specs/ (copy of .claude/specs), git-log.txt, summary.txt, tool-calls.txt.
#
# The child claude runs with a clean env (env -i): an inherited ANTHROPIC_API_KEY
# overrides the CLI login, and an inherited CLAUDE_PROJECT_DIR would point the MCP
# server at the wrong repo. The installed specmanager plugin is disabled so only the
# worktree's copy loads; CLAUDE_PLUGIN_DATA is scratch so no live board is reaped.
set -euo pipefail

LABEL=$1
SHA=$2
SCRATCH=$3
REPO=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
SLUG=hello-version-flag
INTENT='Add a --version flag to the hello CLI that prints the package.json version'
HARNESS_LINE='If AskUserQuestion is unavailable, take the (recommended) option.'

RUN=$SCRATCH/$LABEL
WT=$SCRATCH/plugin-$LABEL
PROJ=$RUN/proj
OUT=$RUN/out
DATA=$RUN/plugin-data

setup_worktree() {
  [ -d "$WT" ] || git -C "$REPO" worktree add --detach "$WT" "$SHA"
  (cd "$WT/plugins/specmanager" && npm ci --silent)
}

setup_project() {
  rm -rf "$RUN" && mkdir -p "$PROJ" "$OUT" "$DATA"
  cd "$PROJ"
  git init -q -b main
  cat > package.json <<'EOF'
{ "name": "hello", "version": "1.4.2", "type": "module", "bin": { "hello": "hello.js" }, "scripts": { "test": "node --test" } }
EOF
  cat > hello.js <<'EOF'
#!/usr/bin/env node
export function greet(name = 'world') { return `hello, ${name}`; }
if (import.meta.url === `file://${process.argv[1]}`) console.log(greet(process.argv[2]));
EOF
  cat > hello.test.js <<'EOF'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { greet } from './hello.js';
test('greets', () => assert.equal(greet('ada'), 'hello, ada'));
EOF
  git add -A && git commit -qm "hello CLI"
}

seed_interview() {
  local f=$PROJ/.claude/specs/features/$SLUG
  local now; now=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
  mkdir -p "$f/prd"
  cat > "$f/feature.json" <<EOF
{ "id": "feat-$SLUG", "slug": "$SLUG", "title": "Hello version flag", "currentStage": "prd", "createdAt": "$now" }
EOF
  cat > "$f/prd/interview.md" <<EOF
---
id: prd-$SLUG-001
featureId: feat-$SLUG
stage: prd
status: draft
stale: false
title: Hello version flag interview
dependsOn: []
basedOn: {}
generatedBy: agent
version: 1
kind: interview
createdAt: '$now'
updatedAt: '$now'
---
## Extracted

- **Problem:** users of the hello CLI cannot tell which version they run.
- **Users:** developers who install the hello CLI.
- **Scope:** \`hello --version\` prints the version field of package.json and exits 0; nothing else changes. One phase, covered by \`npm test\`.
- **UI-facing:** no. It is a command-line flag with no screens.

## Unresolved

- none
EOF
}

claude_run() {
  local name=$1 prompt=$2
  (cd "$PROJ" && env -i HOME="$HOME" PATH="$PATH" USER="$USER" SHELL="$SHELL" \
    LANG="${LANG:-en_US.UTF-8}" TMPDIR="$TMPDIR" CLAUDE_PLUGIN_DATA="$DATA" \
    claude --plugin-dir "$WT/plugins/specmanager" \
      --settings '{"enabledPlugins":{"specmanager@specmanager":false}}' \
      --append-system-prompt "$HARNESS_LINE" \
      --allowedTools 'mcp__plugin_specmanager_specmanager__*' Agent Read Edit Write Bash Glob Grep TodoWrite \
      -p "$prompt" --output-format stream-json --verbose > "$OUT/$name.jsonl" 2> "$OUT/$name.err" || true)
}

capture() {
  (cd "$PROJ" && find .claude/specs -type f | sort > "$OUT/specs-tree.txt")
  cp -R "$PROJ/.claude/specs" "$OUT/specs"
  git -C "$PROJ" log --all --format='%h %D | %s' > "$OUT/git-log.txt"
  git -C "$PROJ" status --short >> "$OUT/git-log.txt"
  for f in loop build; do
    jq -c 'select(.type=="result") | {run: "'$f'", is_error, num_turns, total_cost_usd, usage}' "$OUT/$f.jsonl"
  done > "$OUT/summary.txt"
  for f in loop build; do echo "== $f"; tool_calls "$OUT/$f.jsonl"; done > "$OUT/tool-calls.txt"
}

# One line per tool call: caller ("main" or the parent Agent tool_use id), tool, input prefix.
tool_calls() {
  jq -r 'select(.type=="assistant") | (.parent_tool_use_id // "main") as $p | .message.content[]?
    | select(.type=="tool_use")
    | "\($p[0:12]) \(.name|sub("mcp__plugin_specmanager_specmanager__";"sm:")) \((.input|tostring)[0:110])"' "$1"
}

setup_worktree
setup_project
seed_interview
claude_run loop "/specmanager:specmanager-loop $SLUG $INTENT"
claude_run build "/specmanager:specmanager-build $SLUG next"
capture
cat "$OUT/summary.txt"
