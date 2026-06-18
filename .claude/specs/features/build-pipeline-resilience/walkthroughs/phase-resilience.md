---
id: wt-build-pipeline-resilience-016
featureId: feat-build-pipeline-resilience
stage: walkthrough
status: approved
stale: false
title: Build pipeline resilience — Phase resilience walkthrough
dependsOn:
  - plan-build-pipeline-resilience-014
basedOn:
  plan-build-pipeline-resilience-014: 1
generatedBy: agent
version: 1
phase: resilience
createdAt: '2026-06-18T11:23:54.616Z'
updatedAt: '2026-06-18T11:32:07.442Z'
---
# Build pipeline resilience — Phase resilience walkthrough

This phase hardens the build pipeline against three compounding failure modes observed in a real 27-minute, 21-task session (the "x402" session): a crashed builder silently skipping the post-phase walkthrough and doc-sync; whole-phase single-Task dispatch amplifying a 529's blast radius across every task; and single-phase features generating a spurious `final` walkthrough attempt. All three fixes converge on one principle — post-phase automation is anchored to persisted task state, not to whether the builder returned cleanly.

The server side adds one new read-only helper (`core/phase-completion.ts` + `get_phase_completion` MCP tool) that provides the deterministic completion predicate the build command now queries unconditionally. The prompt side rewrites `/specmanager-build` steps 7–8 to use that predicate and adds single-phase `final`-suppression guards to the walkthrough command, builder agent, and walkthrough-writer agent.

**This is a single-phase feature. Approving this walkthrough ships the feature (`isFeatureShipped`). There is no `final` roll-up.**

> **Exit test:** (1) `cd plugins/specmanager/server && npm run build` exits 0 (no TypeScript errors); (2) `npm run selftest-build` passes including all four new `get_phase_completion` cases (all-done+no-walkthrough, 18/21-done, all-done+existing-walkthrough, single-phase all-done); (3) `npm run selftest-phases` passes; (4) `claude plugin validate plugins/specmanager` passes; (5) manual smoke: call `get_phase_completion` on a feature with all tasks done → `complete: true, needsWalkthrough: true` returned.

The reader should already have Node 20+, the repo on branch `feat/build-pipeline-resilience` (or `main` after merge), and the SpecManager plugin installed.

---

## 0. Prerequisites

| Requirement | Version / detail |
|---|---|
| Node.js | 20+ (`node --version`) |
| npm | bundled with Node 20 |
| OS | macOS (darwin) or Linux |
| Repo | `specmanager`, branch `feat/build-pipeline-resilience` (commits e3258c0–eeddebc) |
| Claude Code | with `plugins/specmanager` installed (`claude plugin list`) |

No seed data required — the selftests scaffold their own tmp directories.

---

## 1. Build

Run from `plugins/specmanager/server/`:

```bash
cd /path/to/specmanager/plugins/specmanager/server
npm install        # only needed once or after lockfile changes
npm run build      # tsc -p tsconfig.json → dist/
```

Expected: exits 0, no TypeScript errors. The build compiles `core/phase-completion.ts` (task-002), its re-export in `core/index.ts` (task-003), the updated `mcp.ts` tool registration (task-004), and the four new selftest cases in `selftest-build.ts` (task-005).

**New compiled outputs for this phase** (task-006 artifacts):

- `dist/core/phase-completion.js`
- `dist/core/index.js` (re-exports `phase-completion`)
- `dist/mcp.js` (registers `get_phase_completion`)
- `dist/selftest-build.js` (includes the four new cases)

If `npm run build` fails, stop here — a TypeScript error in `phase-completion.ts` or `mcp.ts` means the MCP tool will not be available at runtime.

---

## 2. Run selftests

```bash
npm run selftest-build
npm run selftest-phases
```

### New assertions in `selftest-build.js` (task-005, lines 328–417 of source)

The four new cases run under the heading `get_phase_completion: deterministic post-phase branch predicate`:

| Case | Setup | Expected result |
|---|---|---|
| (a) 1/2 tasks done | Two-phase feature, P1 has 2 tasks, only 1 done | `!complete && !needsWalkthrough`, `!isSinglePhase` |
| (b) all-done, no walkthrough | P1 both tasks done, no walkthrough doc exists | `complete && needsWalkthrough`, `hasWalkthrough === false` |
| (c) all-done + existing draft walkthrough | P1 both done, a draft walkthrough is created | `complete && !needsWalkthrough` (dedupe), `hasWalkthrough === true` |
| (d) single-phase all-done | Feature with exactly one phase, all tasks done | `isSinglePhase === true && complete && needsWalkthrough` |

Plus one boundary: unknown phase name → `null` (line 396–397).

Expected `selftest-build` tail:
```
ok — get_phase_completion: 1/2 done ⇒ !complete && !needsWalkthrough
ok — get_phase_completion: two phases ⇒ !isSinglePhase
ok — get_phase_completion: all-done + no walkthrough ⇒ complete && needsWalkthrough
ok — get_phase_completion: no walkthrough ⇒ hasWalkthrough false
ok — get_phase_completion: all-done + existing draft walkthrough ⇒ complete && !needsWalkthrough (dedupe)
ok — get_phase_completion: walkthrough present ⇒ hasWalkthrough true
ok — get_phase_completion: unknown phase ⇒ null
ok — get_phase_completion: single-phase all-done ⇒ isSinglePhase && complete && needsWalkthrough
```

Expected `selftest-phases` tail: no regressions (existing phase rollup logic untouched).

If either selftest fails, stop here.

---

## 3. Validate plugin manifest

```bash
cd /path/to/specmanager
claude plugin validate plugins/specmanager
```

Expected: exits 0, no errors. This guards against broken command frontmatter in the four modified prompt files (tasks 007–012).

---

## 4. Install / run

The `get_phase_completion` MCP tool requires a plugin reinstall and reload to be live in the current Claude session. The rebuilt `dist/` already contains the compiled tool.

```bash
/plugin marketplace update specmanager
/plugin install specmanager@specmanager
/reload-plugins
```

Then reconnect via `/mcp`. If `/mcp` shows the server as disconnected after `/reload-plugins`, a full Claude restart is the reliable fix (see README Troubleshooting).

After reconnect, confirm the tool is registered:

```bash
/mcp
```

Expected: `specmanager` listed as connected. The `get_phase_completion` tool is discoverable but has no separate listing in `/mcp` output — it will appear when the build command calls it.

---

## 5. Phase resilience exit checks

### 5.1 TypeScript build exits 0

```bash
cd /path/to/specmanager/plugins/specmanager/server
npm run build
echo "exit: $?"
```

Expected output: `exit: 0` (no TypeScript errors). Any non-zero exit means a type error in `phase-completion.ts`, `core/index.ts`, or `mcp.ts`.

### 5.2 `selftest-build` passes all get_phase_completion cases

```bash
npm run selftest-build 2>&1 | grep -E "get_phase_completion|FAIL|Error"
```

Expected: eight lines beginning `ok — get_phase_completion:` (the four cases plus four sub-assertions), zero `FAIL` or `Error` lines.

```bash
npm run selftest-build 2>&1 | tail -5
```

Expected: final line is `ok — get_phase_completion: single-phase all-done ⇒ isSinglePhase && complete && needsWalkthrough` (or the overall pass summary if the selftest emits one).

### 5.3 `selftest-phases` passes without regression

```bash
npm run selftest-phases 2>&1 | grep -E "FAIL|Error|ok"
```

Expected: all lines begin `ok —`, zero `FAIL` or `Error`.

### 5.4 `claude plugin validate` passes

```bash
claude plugin validate plugins/specmanager 2>&1
echo "exit: $?"
```

Expected: `exit: 0`. Any validation error points to a broken frontmatter field in one of the four modified command/agent `.md` files.

### 5.5 Manual smoke: `get_phase_completion` on a done feature → `complete: true, needsWalkthrough: true`

Use the MCP tool directly via the Claude Code session (after reinstall/reload from step 4). Pick any feature in the project that has all tasks done and no walkthrough yet — or use the dogfooding feature itself while tasks are done but before this walkthrough is approved:

```
get_phase_completion({ featureId: "feat-build-pipeline-resilience", phase: "resilience" })
```

Expected response:
```json
{
  "phase": "resilience",
  "taskCount": 13,
  "doneCount": 13,
  "complete": true,
  "hasWalkthrough": false,
  "needsWalkthrough": true,
  "isSinglePhase": true
}
```

After this walkthrough doc is created (draft), re-calling returns `hasWalkthrough: true, needsWalkthrough: false` — confirming the dedupe logic (selftest case (c)).

### 5.6 Verify the P1 fix: builder-error path still fires post-phase steps

This is the scenario that motivated the feature: a builder that errors after the last task is already `done` must still trigger the walkthrough + doc-sync. The mechanism is that `specmanager-build.md` step 8 now calls `get_phase_completion` unconditionally — whether the builder Task returned or threw.

Read the relevant paragraph in `specmanager-build.md`:

```bash
grep -A3 "whether the last builder Task returned normally OR errored" \
  /path/to/specmanager/plugins/specmanager/commands/specmanager-build.md
```

Expected output includes: `always call get_phase_completion({ featureId, phase: "<phaseName>" })` and the note that this fires `complete === true` branch regardless of how the last task completed.

To confirm the old failure mode cannot recur: the prior implementation inferred "phase done" from the builder returning cleanly. With this change, `get_phase_completion` reads task statuses from `tasks.json` (persisted state), so a 529 that crashes the builder after `update_task(status: "done")` was written still produces `complete: true` on the next re-resolve call.

### 5.7 Per-task dispatch is the enforced default; `--bulk` is opt-in

Read `specmanager-build.md` step 7:

```bash
grep -n "Default.*per.task\|bulk\|N=1" \
  /path/to/specmanager/plugins/specmanager/commands/specmanager-build.md | head -10
```

Expected: lines confirming `Default — per task (N=1, no flag)` and `--bulk` is the opt-in for whole-phase dispatch.

### 5.8 R=2 transient retry is scoped to 529/Overloaded only; separate from Stop-gate N=3

```bash
grep -n "R=2\|Retry-budget boundary\|N=3" \
  /path/to/specmanager/plugins/specmanager/commands/specmanager-build.md
```

Expected lines include: `R=2` described as `pre-completion transport retry`, `N=3` described as `post-stop iteration cap`, and a boundary note that they are not nested.

### 5.9 Single-phase `final` suppression: `specmanager-walkthrough.md` refuses early

```bash
grep -n "single.phase\|final.*refuse\|refuse.*final" \
  /path/to/specmanager/plugins/specmanager/commands/specmanager-walkthrough.md
```

Expected: a step labelled `Single-phase final short-circuit (refuse early)` that fires before the gate check when `phaseName === "final"` and `list_phases` returns exactly one phase.

### 5.10 Single-phase terminality propagated to builder.md and walkthrough-writer.md

```bash
grep -n "single.phase\|final.*multi.phase\|terminal" \
  /path/to/specmanager/plugins/specmanager/agents/builder.md

grep -n "single.phase\|final.*multi.phase\|terminal" \
  /path/to/specmanager/plugins/specmanager/agents/walkthrough-writer.md
```

Expected in `builder.md`: "For a **single-phase feature** ... this per-phase walkthrough is the **terminal** artifact ... Never suggest a `final` walkthrough for a single-phase feature; `final` is multi-phase only."

Expected in `walkthrough-writer.md`: "`final` is multi-phase only" and "single-phase feature — the per-phase walkthrough is terminal and ships the feature on approval."

---

## 6. Pass criteria

- [ ] `npm run build` exits 0 (check 5.1)
- [ ] `npm run selftest-build` passes all eight `get_phase_completion` assertions with zero `FAIL` lines (check 5.2)
- [ ] `npm run selftest-phases` passes with zero `FAIL` lines (check 5.3)
- [ ] `claude plugin validate plugins/specmanager` exits 0 (check 5.4)
- [ ] Manual MCP call `get_phase_completion({ featureId: "...", phase: "resilience" })` on an all-done phase returns `complete: true, needsWalkthrough: true` (check 5.5)
- [ ] `specmanager-build.md` step 8 unconditionally calls `get_phase_completion` after the builder loop regardless of exit path (check 5.6)
- [ ] Per-task dispatch is the default; `--bulk` flag required for whole-phase single-Task dispatch (check 5.7)
- [ ] R=2 retry is 529/Overloaded-only; boundary note distinguishes it from Stop-gate N=3 (check 5.8)
- [ ] `specmanager-walkthrough.md` refuses `final` early for single-phase features (check 5.9)
- [ ] `builder.md` and `walkthrough-writer.md` both document per-phase walkthrough as terminal for single-phase features; neither suggests `final` (check 5.10)

All items are required. A partial pass is not a pass.

---

## 7. Deferred / Out of scope

The following are intentionally absent — expected, not a bug:

- **`hooks/stop-gate.sh` unchanged** — the Stop-gate's N=3 post-stop iteration cap is distinct from R=2 and was not modified in this phase.
- **`agents/reviewer.md` unchanged** — no reviewer behaviour changes in scope.
- **`core/tiers.ts`, `core/active-build.ts`, `core/active-card.ts`, `core/shipped.ts` unchanged** — per PRD non-goals.
- **No new UI surfaces** — the board does not expose `get_phase_completion`.
- **No exponential backoff in R=2** — the retry is immediate; the agent has no `sleep` primitive, and the natural inter-tool latency was deemed sufficient.
- **`selftest-board`, `selftest-stopgate`, `selftest-tiers` unchanged** — no new cases needed; changes are confined to `selftest-build` and `selftest-phases`.

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `npm run build` TypeScript error in `phase-completion.ts` | `listPhases` or `listDocuments` import path wrong (missing `.js` extension) | Check `plugins/specmanager/server/src/core/phase-completion.ts` lines 2–3; imports must end with `.js` in ESM |
| `selftest-build` fails with `getPhaseCompletion is not a function` | `core/index.ts` missing the re-export | Check that `export * from "./phase-completion.js";` is present in `core/index.ts` (task-003) |
| `selftest-build` fails `get_phase_completion: unknown phase ⇒ null` | `listPhases` returning the phase name with unexpected casing | Phase names are case-sensitive; check the test fixture seeds the phase name as `"P1"` matching the assertion |
| `/mcp` shows specmanager disconnected after `/reload-plugins` | Plugin server didn't restart cleanly | Do a full Claude restart; this is the reliable fix documented in the repo README |
| `get_phase_completion` MCP call returns `null` unexpectedly | Phase name mismatch between `tasks.json` and the call argument | Run `list_phases({ featureId })` to confirm the exact phase name string, then retry |
| `claude plugin validate` reports a missing field | One of the modified command `.md` files has invalid frontmatter | Check `specmanager-build.md`, `specmanager-walkthrough.md`, `agents/builder.md`, `agents/walkthrough-writer.md` frontmatter against `plugin.json` schema |
| `needsWalkthrough` is `false` even though no walkthrough was written | A stale `draft` walkthrough doc from a prior partial run exists for this phase | Run `list_documents({ featureId, stage: "walkthrough" })` — if a draft exists for the phase, the dedupe is working correctly; delete it if it's spurious |

---

## 9. What ships next (preview)

This is a **single-phase feature** — this walkthrough is the terminal artifact. Approving it fires `isFeatureShipped` and refreshes `docs/DESIGN.md`. There is no `final` roll-up.

For subsequent work in the SpecManager pipeline: the `get_phase_completion` MCP tool is now available to any future automation that needs a deterministic, state-grounded answer to "is this phase actually done and does it need a walkthrough?" — independent of how or whether the builder returned.
