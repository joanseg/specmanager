---
id: plan-plan-and-walkthrough-optimisations-006
featureId: feat-plan-and-walkthrough-optimisations
stage: plan
status: approved
stale: false
title: Plan and walkthrough optimisations plan
dependsOn:
  - arch-plan-and-walkthrough-optimisations-006
basedOn:
  arch-plan-and-walkthrough-optimisations-006: 1
generatedBy: agent
version: 1
createdAt: '2026-06-01T12:46:02.208Z'
updatedAt: '2026-06-01T12:54:38.264Z'
---
# Plan and walkthrough optimisations — Plan

## Overview

This feature lands four thin, well-isolated changes the approved Architecture identified: a single-phase planner default (R1), an auto-fired phase walkthrough (R2), a proven walkthrough structure (R3), and a phase-count-conditional roll-up card (R4). The Architecture's load-bearing finding is that **none of this touches the `core` data model** — the work is concentrated in two agent prompts, one slash command, and one UI line. Because every change is independent and individually testable, and there is no point partway through where the user would need to stop and test a half-built increment, this is a **single phase**. The phase ships as one installable, testable unit.

**Scale:** `1` trivial · `2` small · `3` moderate · `5` substantial · `8` large · `13`/`21` epic.

_Every task below is decomposed to **≤3 points**. The work here is genuinely small — five focused prompt/command/UI edits plus one verification pass — so nothing needed splitting from a larger item; the phase subtotal reflects the real scope._

| Phase | Theme | Points |
|-------|-------|--------|
| core | Single-phase planning, auto-walkthroughs, proven structure, conditional roll-up | 13 |
| **Total** | | **13** |

---

## Phase core — Single-phase planning, auto-walkthroughs, proven structure, conditional roll-up

**Exit test:** With the plugin rebuilt and reinstalled, (a) `/specmanager-plan` on a small feature emits a single named `## Phase` with no multi-phase prompt; (b) finishing a phase via `/specmanager-build` auto-creates a `draft` phase walkthrough without a manual command, and re-running build does not duplicate it; (c) a generated phase walkthrough carries the nine-section exemplar skeleton (verbatim exit-criterion blockquote, Prerequisites, Build, install/reload, numbered runnable exit checks, pass-criteria checklist, deferred, troubleshooting, next-phase preview); (d) a one-phase feature shows no "Feature roll-up" card on the board, and adding a second phase makes it appear. _(SpecManager self-development is the verification vehicle — the feature's own walkthrough doubles as the acceptance script.)_

| # | Task | Pts | Notes |
|---|------|-----|-------|
| 1.1 | Rewrite `agents/planner.md`: single phase is the default; multi-phase only for genuinely large features, gated behind an `AskUserQuestion` confirming proposed boundaries; single phase gets a real meaningful name (not `default`); keep the `## Phase`/summary-table/dotted-numbering conventions intact for one phase. | 3 | R1. Preserve every parsing contract (R1.5). Declined split → fall back to single phase (Q4). |
| 1.2 | Reconcile `commands/specmanager-plan.md`: the "don't accept a flat plan with no phases" rule stays, but note that a single named phase **is** the expected common output and is not "flat". | 1 | R1. Small wording change so the orchestration command and planner agree. |
| 1.3 | Rewrite `commands/specmanager-build.md` step 8: after the builder returns and the phase is fully `done`, re-check `check_gate(stage:"walkthrough", phase)`, guard against an existing draft (`list_documents` filtered by phase), and **auto-invoke** the `walkthrough-writer` in per-phase mode; flip the "do NOT invoke it" Don't into the new behaviour, leaving `/specmanager-walkthrough` as the manual fallback. | 2 | R2. Auto-fire lives in the agent turn (the server can't invoke a subagent). Idempotent (R2.3); draft only (R2.2). |
| 1.4 | Rewrite `agents/walkthrough-writer.md` per-phase mode to enforce the nine-section exemplar skeleton with runnable exit checks and a pass-criteria checklist; make Build/install sections project-adaptive (full plugin-reinstall dance only when the feature under build is itself a plugin). Leave `final` mode intact. | 3 | R3 (R3.1–R3.4). Keep the existing "read real files/commits" evidence discipline. |
| 1.5 | In `ui/src/App.tsx#WalkthroughCell`, render `<FinalWalkthroughCard>` only when `phases.length > 1`; key strictly on phase count, not the existing `multiPhase` name heuristic. Rebuild the UI bundle. | 2 | R4. Reactive for free — `row.phases` is live from the manifest rollup (R4.3). No server/API change (Q5). |
| 1.6 | Verify end-to-end against the exit test, then author/refresh this phase's walkthrough (which doubles as the acceptance script) and update any affected plugin docs/`CLAUDE.md` notes. | 2 | Testing + docs as an explicit task so "installable & testable" stays a real gate. |

---

## Risk & sequencing notes

- **1.1 → 1.2** are coupled (both touch the planning contract); do 1.1 first so 1.2 reconciles against the final planner wording. The other tasks are mutually independent and can land in any order.
- **1.3 (R2) carries the only behavioural subtlety:** auto-fire must be idempotent and must re-check the gate, because the builder can stop mid-phase. The guard (`list_documents` by phase) and gate re-check are the safety rails — get them right or the command will spam duplicate drafts.
- **1.5 (R4) must key on `phases.length`, not the `multiPhase` heuristic** in `App.tsx` (which conflates count with "name ≠ default") — otherwise a single *named* phase would wrongly show the roll-up.
- No rollbacks are tricky: every change is a prompt/command/UI edit with no data migration. Reverting a task is a git revert with no state cleanup.

## Test strategy

Verification is per the Architecture §6 and is **manual self-development**: prompt/command behaviour (1.1–1.4) is non-deterministic agent output, so it is validated by running `/specmanager-plan`, `/specmanager-build`, and `/specmanager-walkthrough` against a real feature and diffing output against the exemplars and the single-phase expectation — captured as runnable exit checks in task 1.6's walkthrough. The UI change (1.5) is asserted against `/api/board` `phases.length` and the rendered card. No new `core` selftest assertions are required because the data model is unchanged.

## Out of scope

- Any `core`/server change — no `phase.completed` event, no server-side phase-completion badge (deferred per Architecture §8).
- Project-type *detection code* — R3 generalisation is a prompt instruction, not a code path.
- Changes to the `final` walkthrough gate or the data model.
- Auto-firing a walkthrough for phases completed directly on the board (no agent turn exists there) — the manual command + the existing "ready" card affordance cover that boundary.

## Notes on estimates

Points here are **relative complexity, not hours** — recalibrate to your own velocity after this phase ships. Every task is **≤3 points**; nothing was split down from a larger item because the work is genuinely small, so the phase subtotal of 13 is the real scope rather than a granularity artifact. Testing and docs are their own task (1.6) rather than an afterthought, so the phase's "installable & testable" exit test stays an honest gate.
