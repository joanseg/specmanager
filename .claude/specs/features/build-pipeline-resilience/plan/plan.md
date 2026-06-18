---
id: plan-build-pipeline-resilience-014
featureId: feat-build-pipeline-resilience
stage: plan
status: approved
stale: false
title: Build pipeline resilience plan
dependsOn:
  - arch-build-pipeline-resilience-019
basedOn:
  arch-build-pipeline-resilience-019: 1
generatedBy: agent
version: 1
createdAt: '2026-06-18T11:08:56.874Z'
updatedAt: '2026-06-18T11:11:16.565Z'
---
Based on Architecture `arch-build-pipeline-resilience-019` v1.

## Overview

Hardens the build pipeline against three compounding failure modes observed in a real 27-minute, 21-task session: the post-phase pipeline (walkthrough + doc-sync) silently skipping on a crashed builder; whole-phase single-Task dispatch amplifying a 529's blast radius; and single-phase features generating a spurious `final` walkthrough attempt. All three fixes converge on one principle — post-phase automation is driven by persisted task state, not the builder's exit path. The change surface is mostly prompt-only (four command/agent files). One small server addition (`core/phase-completion.ts` + MCP tool) provides the deterministic phase-completion predicate that anchors the entire P1 re-resolve branch. A single phase is correct: there is no useful partial increment before all three fixes are in place — the server helper exists only to support the build-command rewrite, so shipping them separately would leave the prompts in a broken intermediate state.

**Scale:** `1` trivial · `2` small · `3` moderate · `5` substantial · `8` large · `13`/`21` epic.

_Every task below is decomposed to ≤3 points. Some work items that might have scored higher are split into granular subtasks; subtotals reflect the same total effort._

## Phase summary table

| Phase | Theme | Points |
|---|---|---|
| resilience | Core helper + prompt hardening | 25 |
| **Total** | | **25** |

---

## Phase resilience — Core helper + prompt hardening

**Exit test:** (1) `cd plugins/specmanager/server && npm run build` exits 0 (no TypeScript errors); (2) `npm run selftest-build` passes including all four new `get_phase_completion` cases (all-done+no-walkthrough, 18/21-done, all-done+existing-walkthrough, single-phase all-done); (3) `npm run selftest-phases` passes; (4) `claude plugin validate plugins/specmanager` passes; (5) manual smoke: call `get_phase_completion` on a feature with all tasks done → `complete: true, needsWalkthrough: true` returned.

| # | Task | Pts | Notes |
|---|---|---|---|
| 1.1 | Create feature branch `feat/build-pipeline-resilience` from `main` | 1 | `git checkout -b feat/build-pipeline-resilience`; exit test requires this branch exists before any other task. |
| 1.2 | Implement `core/phase-completion.ts` with `getPhaseCompletion` and `PhaseCompletion` interface | 3 | New file. Composes `listPhases`/`rollupPhases` (`core/phases.ts`) for task counts + `complete`; `listDocuments({ featureId, stage:"walkthrough" })` filtered to `phase===<phase>` for `hasWalkthrough`; `phases.length===1` for `isSinglePhase`. Returns `null` on unknown phase. ~15 lines per arch R1. No external dependencies. |
| 1.3 | Export `phase-completion` from `core/index.ts` | 1 | Add `export * from "./phase-completion.js";` after line 16 (the `shipped` export), matching the pattern at lines 12–16. |
| 1.4 | Register `get_phase_completion` MCP tool in `mcp.ts` | 2 | New `server.registerTool("get_phase_completion", ...)` block after `get_next_phase` (lines 377–385). `inputSchema: z.object({ featureId: z.string(), phase: z.string() })`. Handler: `ok(await getPhaseCompletion(featureId, phase, PROJECT_DIR))`. Import `getPhaseCompletion` from core. |
| 1.5 | Add `get_phase_completion` selftest cases to `selftest-build.ts` | 3 | Four cases per arch R1 selftest implications: (a) all-done, no walkthrough → `complete && needsWalkthrough`; (b) 18/21 done → `!complete && !needsWalkthrough`; (c) all-done + existing draft walkthrough → `complete && !needsWalkthrough`; (d) single-phase all-done → `isSinglePhase true`. Append to existing 334-line file. |
| 1.6 | Rebuild `server/dist` and verify selftests pass | 2 | `cd plugins/specmanager/server && npm run build`. Run `npm run selftest-build` and `npm run selftest-phases`. Commit compiled `dist/` — this is what ships. Depends on 1.2–1.5. |
| 1.7 | Rewrite `specmanager-build.md` step 7: per-task dispatch as enforced default + `--bulk` opt-in | 3 | Remove the whole-phase parenthetical as the default. Add `--bulk` to `argument-hint` + step 1 parse. Default: per-task loop (complexity→tier→alias→Task per task). `--bulk`: dispatch all in one builder Task at max tier. Wrap each per-task dispatch in R=2 transient-retry (529/Overloaded only); on exhausted retries mark task blocked, stop phase, do NOT `clear_active_build`. Document boundary: R=2 = pre-completion transport retry; Stop-gate N=3 = post-stop iteration cap. Per arch R3. |
| 1.8 | Rewrite `specmanager-build.md` step 8: unconditional `get_phase_completion` re-resolve on return or error | 3 | After the per-task dispatch loop (step 7) finishes — whether the last builder Task returned normally or errored — always call `get_phase_completion({ featureId, phase })`. `complete=true` → reviewer (if not run) → `clear_active_build` → `needsWalkthrough?` auto-invoke walkthrough-writer → 3-option doc-sync `AskUserQuestion` → `sync_design_md`. `complete=false` → report partial state + failing task id + error verbatim; do NOT `clear_active_build`. Per arch R2. |
| 1.9 | Add `isSinglePhase` terminal reporting to `specmanager-build.md` step 8 | 2 | After auto-firing the per-phase walkthrough: if `isSinglePhase`, report the phase walkthrough as the terminal artifact; never suggest/attempt `final`. Per arch R4. Depends on 1.8 (same file, same step). |
| 1.10 | Edit `specmanager-walkthrough.md`: refuse `final` early for single-phase features | 2 | Before the `final` gate check at step 3: if `list_phases({ featureId }).length === 1`, refuse early — "single-phase feature: the per-phase walkthrough is terminal; no `final` roll-up." Per arch R4. |
| 1.11 | Edit `agents/builder.md`: clarify single-phase terminality on success | 1 | In the "On success" section (line 82): the existing "suggest `/specmanager-walkthrough <feature> <phaseName>`" line stands; add that for a single-phase feature this walkthrough is the terminal artifact — never suggest `final`. Per arch R4. |
| 1.12 | Edit `agents/walkthrough-writer.md`: document `phase: "final"` as multi-phase only | 2 | At lines 11, 40–46, 83: document `phase: "final"` mode as multi-phase only; in single-phase features the per-phase walkthrough is terminal and no `final` is written. Reinforces the existing "Don't write `phase: \"final\"` unless every phase walkthrough is approved" constraint. Per arch R4. |
| 1.13 | Run `claude plugin validate plugins/specmanager` and verify all modified files | 1 | Validation gate. Catches any broken frontmatter or command syntax before the branch is pushed. |

---

## Risk & sequencing notes

Tasks 1.2–1.6 are the server path and must proceed in dependency order: implement (1.2) → export (1.3) → register MCP tool (1.4) → add selftests (1.5) → rebuild dist (1.6). The committed `dist/` is what ships; 1.6 must not be skipped.

Tasks 1.7–1.9 are edits to `specmanager-build.md` and should be done in order (steps 7 then 8 then the single-phase addition to step 8) to maintain internal coherence of the command file. Task 1.9 depends on 1.8 since it modifies the same step.

Tasks 1.10–1.12 are independent of each other (different files) and independent of 1.7–1.9; they can be done in any order once 1.1 is done. 1.13 is the final gate and depends on everything.

The P3 prompt edits (1.10–1.12) can be done before or after the server work (1.2–1.6) since they touch different files. P2 (1.7) and P1 (1.8) both land in `specmanager-build.md`; 1.7 must precede 1.8 so step 7 is correct before step 8 references its output.

Rollback notes: the four prompt files (specmanager-build.md, specmanager-walkthrough.md, agents/builder.md, agents/walkthrough-writer.md) have no compiled artefact and revert cleanly via git. The server path (1.2–1.6) must be reverted atomically — partial revert (e.g. removing the MCP tool without removing the core export) would leave a broken import at startup.

## Test strategy

The repo uses hand-rolled selftest scripts under `server/src/selftest-*.ts` compiled to `dist/` (not a test runner). New `get_phase_completion` cases go in the existing `selftest-build.ts` (task 1.5) following the file's existing pattern: scaffold a tmp dir feature, seed tasks via core, call the helper, assert the returned fields. `npm run selftest-phases` guards the existing phase rollup logic. `claude plugin validate` guards the command/agent manifest.

No new selftest file is needed. The four prompt files have no unit test surface — correctness is verified by the exit test's manual smoke check and the `plugin validate` gate.

## Out of scope

- `core/tiers.ts`, `core/active-build.ts`, `core/active-card.ts`, `core/shipped.ts` — unchanged, per PRD non-goals.
- `hooks/stop-gate.sh` — unchanged; the Stop-gate's N=3 iteration cap is separate from the R=2 dispatch retry (arch R3 boundary note).
- `agents/reviewer.md` — unchanged.
- New UI surfaces.
- Infinite or exponential retry policies.

## Notes on estimates

Points are relative complexity, not hours — calibrate by comparison after the first few tasks rather than translating to wall-clock time. Every task is ≤3; the items that might have scored higher (rewriting step 7 and step 8 of specmanager-build.md, the selftest additions) are split into single-step tasks so each is completable in one sitting. Testing and the dist rebuild are their own tasks (1.5, 1.6, 1.13) so "installable and testable" remains a real gate — not an afterthought folded into the last implementation task.
