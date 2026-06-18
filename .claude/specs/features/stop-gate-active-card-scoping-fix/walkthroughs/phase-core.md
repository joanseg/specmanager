---
id: wt-stop-gate-active-card-scoping-fix-015
featureId: feat-stop-gate-active-card-scoping-fix
stage: walkthrough
status: approved
stale: false
title: Stop-gate active-card scoping fix — Phase core walkthrough
dependsOn:
  - plan-stop-gate-active-card-scoping-fix-013
basedOn:
  plan-stop-gate-active-card-scoping-fix-013: 1
generatedBy: agent
version: 1
phase: core
createdAt: '2026-06-15T15:37:59.794Z'
updatedAt: '2026-06-15T15:41:59.409Z'
---
# Stop-gate active-card scoping fix — Phase core walkthrough

This phase fixes the shipped bug where the Stop-gate hook misfired by scanning all features project-wide, locking onto any feature with open tasks regardless of whether it was being actively built. The fix introduces an explicit active-build marker file (`.claude/specs/.cache/active-build.json`) owned by a new `core/active-build.ts` module, rewrites `resolveActiveCard` to be marker-first (no marker → null → no-op pass), wires the marker writes/clears into `/specmanager-build`, reworks the stop-gate selftest to include the no-op regression case, rebuilds `server/dist`, and re-enables the previously-disabled Stop hook as the final gated step.

> **Exit test:** `cd plugins/specmanager/server && npm run build` exits 0 (clean compile); `npm run selftest-stopgate` exits 0 (all cases including the no-op regression); `npm run selftest-phases && npm run selftest-build` both exit 0 (no regressions); `claude plugin validate plugins/specmanager` passes; and a manual no-op check: Stop in a session with no `.claude/specs/.cache/active-build.json` marker exits 0 even when an unrelated feature has open tasks.

**What should already be in place:** Node 20+, the `specmanager` repo checked out, and the plugin installed in Claude Code (or a fresh reinstall of it from this phase's working tree). The Stop hook is now live after task-009; a reinstall/reload propagates the fixed version to the running session.

---

## 0. Prerequisites

| Item | Requirement |
|---|---|
| OS | macOS/Linux (Darwin 25.2.0 used during build) |
| Node | 20+ (`node --version` → `v20.x` or later) |
| Repo | `specmanager`, branch `main`, commits through `92f5763` (task-009) |
| Plugin state | Working tree has the live Stop hook (hooks.json `Stop` entry restored); `server/dist/` includes the compiled phase artifacts |
| Plugin installed | `specmanager` plugin installed in Claude Code; reinstall required if upgrading from a version where the hook was disabled |

Verify the commits are present:

```bash
cd /path/to/specmanager
git log --oneline 2acecab ab304fb 3f3835a c65cdb6 2cdb714 16a0dd5 0fdae6f a920404 92f5763 2>/dev/null | wc -l
```

Expected output: `9` (all nine commits reachable).

---

## 1. Build

```bash
cd plugins/specmanager/server
npm install
npm run build
```

Expected: exits 0. No TypeScript errors. The compiled artifacts from this phase appear in `dist/`:

```
dist/core/active-build.js          # new — task-002
dist/core/active-card.js           # rewritten — task-004
dist/core/index.js                 # export added — task-003
dist/mcp.js                        # two new tools — task-005
dist/selftest-stopgate.js          # reworked — task-007
```

Confirm the key compiled files are present:

```bash
ls plugins/specmanager/server/dist/core/active-build.js \
   plugins/specmanager/server/dist/core/active-card.js \
   plugins/specmanager/server/dist/selftest-stopgate.js
```

Expected output: three paths, no "No such file" errors.

If `npm run build` fails, stop here and check for TypeScript errors before continuing.

---

## 2. Install / run

The selftest suite runs against the compiled `dist/` directly — no server boot needed. After the selftests pass, the hook runs live in Claude Code via the `Stop` hook entry in `hooks/hooks.json`.

To propagate the fixed hook to a live Claude Code session after pulling this phase:

```
/plugin marketplace update specmanager
/plugin install specmanager@specmanager
/reload-plugins
```

If `/reload-plugins` does not reconnect the MCP tools, perform a full Claude Code restart. The `SessionStart` hook will reinstall runtime deps into `${CLAUDE_PLUGIN_DATA}` automatically on next session open.

Verify the Stop hook entry is present in the working tree:

```bash
node -e "const h=JSON.parse(require('fs').readFileSync('plugins/specmanager/hooks/hooks.json','utf8')); console.log(JSON.stringify(h.hooks.Stop,null,2))"
```

Expected output:

```json
[
  {
    "hooks": [
      {
        "type": "command",
        "command": "bash \"${CLAUDE_PLUGIN_ROOT}/hooks/stop-gate.sh\""
      }
    ]
  }
]
```

---

## 3. Phase core exit checks

### 3.1 Clean build

```bash
cd plugins/specmanager/server && npm run build
echo "exit: $?"
```

Expected: `exit: 0`. No errors printed. This confirms the `build.started` / `build.cleared` event union extension (task-001), the `active-build.ts` module (task-002), the `core/index.ts` re-export (task-003), the `active-card.ts` rewrite (task-004), and the two new MCP tools in `mcp.ts` (task-005) all compile cleanly together.

### 3.2 Stop-gate selftest (18 assertions, no-op regression included)

```bash
cd plugins/specmanager/server && npm run selftest-stopgate
```

Expected: exits 0. The final two lines of stdout are:

```
All R1 Stop-gate assertions passed.
Inspect the tmp project at: /tmp/specmanager-stopgate-XXXXXX
```

The 18 assertions that must all print `ok —` before that final line (in order):

| # | Assertion text |
|---|---|
| 1 | `no active-build marker exists initially` |
| 2 | `no-op pass when no marker exists despite an unrelated open-task feature` |
| 3 | `no-marker no-op writes no stderr` |
| 4 | `exit 2 when the pinned phase has open tasks` |
| 5 | `stderr names the open task` |
| 6 | `exit 0 when command passes and all pinned-phase tasks done` |
| 7 | `finished phase auto-clears the marker (false-in-flight guard)` |
| 8 | `none-marker still fails on open tasks (criteria only)` |
| 9 | `none-marker never reports a test failure` |
| 10 | `clear-on-done: no marker after clearActiveBuild → exit 0` |
| 11 | `stale marker (phase all done) → exit 0` |
| 12 | `stale marker auto-cleared after the guard fires` |
| 13 | `cap attempt 1 → exit 2` |
| 14 | `cap attempt 2 → exit 2` |
| 15 | `cap attempt 3 → exit 0 (blocked, no infinite loop)` |
| 16 | `cap attempt 3 stderr announces BLOCKED` |
| 17 | `blocked note recorded for the phase` |
| 18 | `counter reset after cap → next fail is exit 2 again` |

Assertions 1–3 cover the no-op regression (the original bug): an unrelated feature with an open task and an approved plan does not trigger the gate when no marker file exists.

### 3.3 No regressions in selftest-phases and selftest-build

```bash
cd plugins/specmanager/server && npm run selftest-phases && npm run selftest-build
echo "exit: $?"
```

Expected: both selftests exit 0; final line prints `exit: 0`.

### 3.4 Plugin manifest validation

```bash
claude plugin validate plugins/specmanager
```

Expected: exits 0 with no validation errors. This confirms `hooks/hooks.json` (Stop entry restored, task-009) and the plugin manifest are well-formed.

### 3.5 Manual no-op check — live hook with no marker

This check runs against the real specmanager project, which has multiple features with open tasks. The absence of a marker must make the hook a no-op regardless.

First confirm no marker exists:

```bash
ls plugins/specmanager/.claude/specs/.cache/active-build.json 2>&1 || echo "no marker — correct"
```

Expected: `no marker — correct` (or "No such file" — both confirm absence).

Then invoke the hook directly:

```bash
echo '{}' | bash plugins/specmanager/hooks/stop-gate.sh
echo "exit: $?"
```

Expected: `exit: 0` and no output to stderr. This confirms that with the hook live and the real project having unrelated open-task features, the marker-first resolver returns null and the hook is a no-op — the original bug does not recur.

### 3.6 new event types in core/events.ts

```bash
node -e "
const src = require('fs').readFileSync('plugins/specmanager/server/src/core/events.ts','utf8');
console.log('build.started:', src.includes('build.started'));
console.log('build.cleared:', src.includes('build.cleared'));
"
```

Expected:

```
build.started: true
build.cleared: true
```

### 3.7 active-build.ts exports via core/index.ts

```bash
node -e "
const idx = require('fs').readFileSync('plugins/specmanager/server/src/core/index.ts','utf8');
console.log('active-build export:', idx.includes('export * from \"./active-build.js\"'));
"
```

Expected: `active-build export: true`

### 3.8 resolveActiveCard is marker-first (no listFeatures scan)

```bash
grep -n "listFeatures\|findAllFeatures\|list_features" plugins/specmanager/server/src/core/active-card.ts
echo "exit: $?"
```

Expected: no lines printed; exit 0 (grep exits 1 when nothing matches, but the `echo` will still print). The point is zero hits — the project-wide feature scan is gone. The rewritten function (task-004, commit `c65cdb6`) calls only `readActiveBuild`, `findFeatureById`, and `listTasks`.

To confirm the new first-line logic directly:

```bash
head -5 plugins/specmanager/server/src/core/active-card.ts
```

Expected first non-comment logic line references `readActiveBuild`.

### 3.9 MCP tools registered in mcp.ts

```bash
grep -n "set_active_build\|clear_active_build" plugins/specmanager/server/src/mcp.ts
```

Expected: at least two matching lines — one for `set_active_build` registration and one for `clear_active_build`.

### 3.10 specmanager-build.md wired with marker calls

```bash
grep -n "set_active_build\|clear_active_build" plugins/specmanager/commands/specmanager-build.md
```

Expected: at least two matching lines — one for `set_active_build` (step 4c, phase start) and at least one for `clear_active_build` (phase-done and blocked-cap terminal paths).

### 3.11 Stop hook re-enabled — no TEMP-DISABLE block in stop-gate.sh

```bash
grep -n "TEMP.DISABLE\|exit 0" plugins/specmanager/hooks/stop-gate.sh | head -20
```

Expected: the only `exit 0` lines are the legitimate gate-pass exits (line 24 — no node/plugin root, line 29 — no resolver, line 35 — null card, line 132 — gate passes, line 153 — cap reached). No line matching `TEMP.DISABLE` or `TEMP DISABLE` appears. The short-circuit block from commit `448610c` is gone (task-009, commit `92f5763`).

---

## 4. Pass criteria

- [ ] `npm run build` exits 0 — clean TypeScript compile of all phase changes
- [ ] `npm run selftest-stopgate` exits 0 — all 18 assertions pass, including the no-op regression (assertions 1–3)
- [ ] `npm run selftest-phases` exits 0 — no regressions
- [ ] `npm run selftest-build` exits 0 — no regressions
- [ ] `claude plugin validate plugins/specmanager` exits 0 — manifest and hooks.json well-formed
- [ ] Manual no-op check: `echo '{}' | bash hooks/stop-gate.sh` exits 0 with no stderr when no `active-build.json` marker exists, even with unrelated open-task features present
- [ ] `hooks/hooks.json` contains the `Stop` array entry with `stop-gate.sh`
- [ ] `hooks/stop-gate.sh` contains no `TEMP-DISABLE` or early `exit 0` block
- [ ] `core/active-build.ts` exists and exports `readActiveBuild`, `setActiveBuild`, `clearActiveBuild`, `activeBuildPath`, `ActiveBuildMarker`
- [ ] `core/index.ts` re-exports `active-build.js`
- [ ] `core/active-card.ts` `resolveActiveCard` calls `readActiveBuild` first; no project-wide feature scan

All items are required; none may be deferred.

---

## 5. Deferred / out of scope

The following are expected absences — not bugs:

- **Multi-session or session-id-matched resolution.** The `sessionId` field in `ActiveBuildMarker` is stored for observability only and is never used for gate resolution. Single-user assumption holds; concurrent session support is out of scope.
- **`getNextPhase` logic changes.** The build command's phase-picker is untouched; this fix only affects gate resolution.
- **Schema changes to `tasks.json`, `TaskSchema`, `PhaseMeta`, or frontmatter.** None were made.
- **Iteration cap logic changes.** The N=3 cap in `stop-gate.sh` is unchanged; only the marker-resolved `CARD_JSON` input to it changed.
- **`set-phase-blocked.js` or reviewer subagent.** Untouched.

---

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `selftest-stopgate` exits 1 with `FAIL: no-op pass when no marker exists…` | `resolveActiveCard` is still the old project-wide scan (wrong `dist/` version built) | Rebuild: `npm run build` in `server/`, then re-run the selftest |
| `selftest-stopgate` exits 1 with `FAIL: exit 2 when the pinned phase has open tasks` | `setActiveBuild` call is not reaching the correct tmp project root — env mismatch in `runHook` | Check that `SPECMANAGER_PROJECT_DIR` is set in `runHook`'s env; verify `dist/selftest-stopgate.js` matches the source |
| `claude plugin validate` reports unknown hook event `Stop` | Stale plugin manifest or hooks.json version in `CLAUDE_PLUGIN_DATA` | Reinstall: `/plugin marketplace update specmanager` → install → `/reload-plugins` |
| Manual no-op check exits 2 with `not done` in stderr | An `active-build.json` marker exists from a previous (possibly crashed) build | Remove it: `rm .claude/specs/.cache/active-build.json` and re-run the check |
| Stop hook fires during normal work after reinstall | Expected — this is the fixed behaviour; the hook only gates when a marker exists | If the marker is stale (build finished but marker was not cleared), `clearActiveBuild` via MCP or delete the file |
| `dist/core/active-build.js` missing | `npm run build` was not run after task-002 landed, or wrong working directory | `cd plugins/specmanager/server && npm run build` |
| `grep` for `set_active_build` in `mcp.ts` returns nothing | Wrong file path or viewing the `dist/` file (compiled JS renames nothing — check `src/mcp.ts`) | Search `plugins/specmanager/server/src/mcp.ts`, not `dist/` |

---

## 7. What ships next (preview)

This is the only phase in this feature. On approval of this walkthrough, the feature walkthrough roll-up (`walkthroughs/stop-gate-active-card-scoping-fix/feature.md`) is the next document to produce, verifying the PRD success metrics end-to-end. The hook is already live in the working tree; the primary remaining action is reinstalling the plugin in active Claude Code sessions to pick up the re-enabled Stop entry.
