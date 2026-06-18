---
id: plan-stop-gate-active-card-scoping-fix-013
featureId: feat-stop-gate-active-card-scoping-fix
stage: plan
status: approved
stale: false
title: Stop-gate active-card scoping fix plan
dependsOn:
  - arch-stop-gate-active-card-scoping-fix-017
basedOn:
  arch-stop-gate-active-card-scoping-fix-017: 1
generatedBy: agent
version: 1
createdAt: '2026-06-15T15:24:22.313Z'
updatedAt: '2026-06-15T15:26:09.475Z'
---
## Overview

This feature re-enables the SpecManager Stop-gate by replacing the broken project-wide `resolveActiveCard` scan with a marker-first resolver. A new `core/active-build.ts` module owns an explicit `.cache/active-build.json` marker (Option B from the architecture); `/specmanager-build` writes the marker on phase start and clears it on completion; `resolveActiveCard` becomes a no-op whenever no marker exists — fixing the bug where every session stop was locking onto an unrelated feature. The hook is re-enabled only as the final gated step, after the reworked selftest is green. All work is a single deliverable: no testable partial increment exists before the scoping is correct, the selftest regression case passes, and the hook is back on.

**Scale:** `1` trivial · `2` small · `3` moderate · `5` substantial · `8` large · `13`/`21` epic.

_Every task below is decomposed to ≤3 points — whether items were split or the work was genuinely small; phase subtotals unchanged._

| Phase | Theme | Points |
|---|---|---|
| core | Marker module, resolver rewrite, MCP tools, build-command wiring, selftest rework, hook re-enable | 17 |
| **Total** | | **17** |

---

## Phase core — Marker, resolver, wiring, selftest, re-enable

**Exit test:** `cd plugins/specmanager/server && npm run build` exits 0 (clean compile); `npm run selftest-stopgate` exits 0 (all cases including the no-op regression); `npm run selftest-phases && npm run selftest-build` both exit 0 (no regressions); `claude plugin validate plugins/specmanager` passes; and a manual no-op check: Stop in a session with no `.claude/specs/.cache/active-build.json` marker exits 0 even when an unrelated feature has open tasks.

| # | Task | Pts | Notes |
|---|---|---|---|
| 1.1 | Add `build.started` and `build.cleared` event types to the `SpecEvent` union in `core/events.ts` | 1 | Two discriminated-union members appended; no other file changes in this task. Needed by 1.2 before active-build.ts can emit events. |
| 1.2 | Create `core/active-build.ts`: `ActiveBuildMarker` interface, `activeBuildPath`, `readActiveBuild`, `setActiveBuild`, `clearActiveBuild` | 2 | Marker at `.cache/active-build.json` (sibling of `.cache/stop-gate/`). `setActiveBuild` emits `build.started`; `clearActiveBuild` emits `build.cleared` (idempotent, missing file is no-op). Read uses try/catch typed-default (mirrors `tasks.ts:56-64`). `sessionId` field diagnostic only. Depends on 1.1 (event types). |
| 1.3 | Export `core/active-build.ts` from `core/index.ts` | 1 | Append `export * from "./active-build.js";` to `core/index.ts` alongside `active-card.js` at line 13. Depends on 1.2. |
| 1.4 | Rewrite `resolveActiveCard` in `core/active-card.ts` to be marker-first (R1) | 3 | Remove the `listFeatures` project-wide scan. New flow: (1) `readActiveBuild` — absent ⇒ return `null`; (2) `findFeatureById` — gone ⇒ clear marker + return `null`; (3) load tasks, filter to marker's phase, compute `openTaskIds`; (4) false-in-flight guard — zero open tasks ⇒ `clearActiveBuild` + return `null`; (5) build and return `ActiveCard` (same fields/shape, same `exitTestForPhase` helper kept verbatim). Signature `(root?) => Promise<ActiveCard | null>` and `ActiveCard` interface unchanged — `resolve-active-card.ts` and `resolve_active_card` MCP tool are untouched. Depends on 1.2, 1.3. |
| 1.5 | Register `set_active_build` and `clear_active_build` MCP tools in `mcp.ts` | 2 | Mirror the `resolve_active_card` registration at `mcp.ts:407-414`. `set_active_build` accepts `{ featureId: string, phase: string }`, fills `sessionId` from env if present else `null`, calls `setActiveBuild`. `clear_active_build` accepts `{}`, calls `clearActiveBuild`. Both use the `ok()/fail()` pattern. Depends on 1.3. |
| 1.6 | Wire `specmanager-build.md`: write marker at step 4c, clear on phase-done and blocked-cap paths | 2 | After step 4 (target phase resolved), insert step 4c: call `set_active_build({ featureId, phase: <resolvedPhaseName> })` — using the concrete phase name, never `"next"`. On the step-8 open-gate path (phase fully done), call `clear_active_build()` before the walkthrough auto-fire. On the step-9 blocked-cap path, call `clear_active_build()` when reporting a persistent-fail blocked phase. Add to the Don't list: "Don't leave an active-build marker after a phase completes or is blocked — always pair `set_active_build` with a `clear_active_build` on all terminal paths." Mid-phase stop must not clear (build still in flight). Depends on 1.5. |
| 1.7 | Rework `selftest-stopgate.ts`: update existing in-flight cases to use explicit marker; add no-op regression, stale-marker, and clear-on-done cases | 3 | Import `setActiveBuild`, `clearActiveBuild`, `readActiveBuild` from `core/index.js`. (a) **No-op regression (the bug, R4 case 1):** init project, create unrelated feature with open task + approved plan, assert no marker exists, `runHook` → code 0 and empty stderr. (b) **Rework existing cases 2–5:** before each case that expects the gate to fire, call `setActiveBuild({ featureId, phase: "core" })` to pin the marker. Remove the comment at line 99 ("resolveActiveCard now targets the cap feature") — the cap test must also set its own marker explicitly. Cases 3 (task done + pass) and 4 (none-marker) must clear the marker or set a new one as appropriate. (c) **Stale-marker guard (R4 case 3):** set marker on a feature/phase whose tasks are all done; `runHook` → code 0; assert `readActiveBuild(root) === null` (auto-cleared). (d) **Clear-on-done (R4 case 4):** set marker + open task → exit 2; mark task done + `clearActiveBuild`; assert next `runHook` → exit 0. Depends on 1.2, 1.3, 1.4. |
| 1.8 | Rebuild `server/dist` (`npm run build`) | 1 | `cd plugins/specmanager/server && npm run build`. All source changes from 1.1–1.7 must be present before this task. Committed dist is what ships. Depends on 1.1–1.7. |
| 1.9 | Re-enable the Stop hook: remove `exit 0` from `stop-gate.sh`, restore the Stop entry in `hooks/hooks.json` | 2 | `stop-gate.sh:17-21`: delete the TEMP-DISABLE block (`# TEMP DISABLE: …` comment + `exit 0`). `hooks/hooks.json`: restore the `Stop` array exactly as it appeared before commit 448610c removed it — verified from git diff: `"Stop": [{ "hooks": [{ "type": "command", "command": "bash \"${CLAUDE_PLUGIN_ROOT}/hooks/stop-gate.sh\"" }] }]`. No other changes to the bash script or hooks file. Depends on 1.7, 1.8 (selftest must be green and dist rebuilt before the live hook fires). |

---

## Risk & sequencing notes

- Tasks 1.1 → 1.2 → 1.3 must land in order; 1.4 and 1.5 can proceed in parallel after 1.3; 1.6 after 1.5; 1.7 after 1.2 and 1.4; 1.8 after all source tasks; 1.9 absolutely last.
- The re-enable task (1.9) is the only task that makes the hook live. Doing it before 1.4 is correct and 1.7 is green would restore the bug in a new form. The `dependsOn` ordering enforces this.
- `stop-gate.sh` needs no logic changes — the `CARD_JSON == null` early-exit at lines 40-42 already handles the no-marker case correctly once the `exit 0` at line 21 is removed.
- The `SpecEvent` union extension (1.1) is additive; no existing listeners need updating.
- Corrupt or missing `active-build.json` is handled in `readActiveBuild` with a typed-default fallback (try/catch → `null`), matching the existing `tasks.ts` pattern, so no defensive callers needed.
- After 1.9 ships, plugin reinstall/reload is required for the hook to take effect in live sessions (per CLAUDE.md: `/plugin marketplace update specmanager` → install → reload or full restart).

## Test strategy

- All selftest changes (1.7) ship in the same task as the resolver rewrite dependency they exercise. The reworked selftest is the regression gate — it must be green before 1.8 (dist rebuild) and 1.9 (hook re-enable).
- `selftest-phases` and `selftest-build` are run as part of the exit test to confirm no regressions in the broader phase/build machinery.
- `selftest-stopgate` must pass both the original in-flight cases (now marker-explicit) and the new no-op / stale / clear-on-done cases before the hook goes live.
- `claude plugin validate plugins/specmanager` confirms the manifest + hooks.json are well-formed after 1.9.

## Out of scope

- Multi-session or session-id-matched resolution (PRD Out-of-scope; session id is stored for observability only).
- Any change to the iteration cap logic, test-command discovery, tier dispatch, the reviewer subagent, or `set-phase-blocked.js`.
- Schema migrations to `tasks.json`, `TaskSchema`, `PhaseMeta`, or frontmatter.
- Redesigning `getNextPhase` — it remains the build command's way to pick a target phase; it is no longer part of gate resolution.

## Notes on estimates

Points are relative complexity, not hours — a 3 is roughly as complex as `resolveActiveCard`'s rewrite or the selftest rework, each of which requires careful state threading and multiple assertions. Every task is ≤3; the two that were naturally larger (the resolver rewrite and the selftest rework) each landed at exactly 3 because the work is self-contained in one file with a clear input/output contract. Testing and the dist rebuild are their own tasks so the "installable and testable" gate stays real, not folded into an adjacent implementation task. Calibrate complexity against the first task you complete (1.1, trivially small); from there the scale holds across the rest of the phase.
