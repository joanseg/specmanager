---
id: prd-build-pipeline-resilience-027
featureId: feat-build-pipeline-resilience
stage: prd
status: approved
stale: false
title: Build pipeline resilience PRD
dependsOn: []
basedOn: {}
generatedBy: human
version: 2
createdAt: '2026-06-18T09:56:34.271Z'
updatedAt: '2026-06-18T10:15:40.216Z'
---
## Problem

A real session (project Sprint-specmanager, feature `x402-payment-acceptance`, single phase, 21 tasks, \~27 min, 122 tool calls) exposed three compounding failure modes:

1. **Post-phase automation is coupled to a clean builder return.** The builder subagent crashed (529 Overloaded) at 18/21 tasks. The parent session recovered manually, cleared the active-build marker, and stopped — but the post-phase pipeline (auto-walkthrough gate check → walkthrough-writer invocation → doc-sync AskUserQuestion → `sync_design_md`) was never entered. These steps only trigger on a normal Task return, not on an error recovery path. The user had to manually request the walkthrough; `sync_design_md` was never called; the doc-sync prompt never appeared.
1. **Whole-phase single-Task dispatch amplified the 529 blast radius.** The build command ran all 21 tasks inside one builder Task. No tier savings were realised; a single transient 529 nearly invalidated 27 minutes of work. Five 529s occurred across the session.
1. **Single-phase features produced a redundant** **`final`** **walkthrough attempt.** After the manual recovery the agent self-initiated a `final` roll-up walkthrough. The gate correctly refused it, but the attempt wasted a Task + tokens. The core already ships single-phase features on their per-phase walkthrough approval (`core/shipped.ts` / `isFeatureShipped`); the gap is prompt behaviour.

## Users

| User                                                 | Job-to-be-done                                                                                                                                     |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Developer using `/specmanager-build` on a long phase | Wants build automation (walkthrough, doc-sync) to complete reliably even when the builder subagent crashes mid-phase                               |
| Same user on a multi-task phase                      | Wants tier-cost savings per task (cheaper tasks run on cheaper models) and per-task failure isolation so a 529 on one task doesn't abort the phase |
| Same user on a single-phase feature                  | Wants the build → walkthrough flow to terminate cleanly without a spurious `final` attempt                                                         |

## Goals

- **G1** Post-phase automation (auto-walkthrough gate check + invocation, doc-sync prompt) runs regardless of whether the phase reached `done` via a normal builder return or an error-recovery path.

- **G2** Phases above a small task-count threshold dispatch tasks individually (per-task tier dispatch), isolating 529s to a single task and realising tier savings. A bounded retry policy handles transient overload errors on individual task dispatches.

- **G3** Single-phase features never produce, suggest, or attempt a `final` walkthrough document. The per-phase walkthrough is terminal for single-phase features.

### Non-goals

- Changing gate semantics, the reviewer, or the tier mapping table in `core/tiers.ts`.

- Changing the core shipped/marker/active-build logic (already landed: `core/active-build.ts`, `core/active-card.ts`, `core/shipped.ts`/`isFeatureShipped`).

- Infinite or exponential retry policies (bounded only).

- Adding new UI surfaces.

## Success metrics

| Metric                                                               | Target                                                                                                              |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Post-phase walkthrough + doc-sync fires after builder error recovery | 100% of cases where all phase tasks are `done` at build-command exit                                                |
| Per-task tier dispatch default                                       | Phases above threshold N tasks dispatch individually; whole-phase single-Task becomes explicit opt-in or is removed |
| Zero `final` walkthrough attempts on single-phase features           | Gate refusal never triggered for a single-phase feature                                                             |
| 529-resilience                                                       | Individual task dispatch retries at least once before surfacing as blocked                                          |

## Constraints & assumptions

| <br />                  | <br />                                                                                                                                                                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core already shipped    | `core/active-build.ts` (marker), `resolveActiveCard` (marker-first), `core/shipped.ts`/`isFeatureShipped`. Do not re-implement.                                                                                                                      |
| Primary change surface  | Orchestration prompts: `commands/specmanager-build.md`, `commands/specmanager-walkthrough.md`, `agents/builder.md`, `agents/walkthrough-writer.md`. Server source changes require rebuilt `server/dist`.                                             |
| Single server process   | MCP + board share one process; no distributed coordination needed.                                                                                                                                                                                   |
| Build sessions are long | 529s are common in real sessions. Retry policy must be simple and bounded.                                                                                                                                                                           |
| Assumption              | The build command can determine whether all phase tasks are `done` by calling the existing `list_tasks` / phase completion logic after the builder returns (or errors) — no new core API strictly required, though a helper may improve determinism. |

## High-level user flows

### P1 — Error-resilient post-phase pipeline

1. Build command launches builder Task for the current phase.
1. Builder Task returns **or errors** (any error type, including 529).
1. Build command re-resolves phase completeness: queries task status for the current phase.
1. **If all phase tasks are** **`done`:** enter post-phase pipeline normally — check walkthrough gate → auto-invoke walkthrough-writer → present doc-sync AskUserQuestion → call `sync_design_md`.
1. **If tasks remain incomplete:** surface partial completion state; do not auto-fire walkthrough.
1. Post-phase pipeline is identical regardless of the builder's exit path.

### P2 — Per-task tier dispatch with 529 retry

1. Build command reads the phase task list.
1. **If task count > N (threshold TBD):** dispatch each task individually via a builder Task, resolving tier/model from `core/tiers.ts` per task complexity. If task count ≤ N: single-Task dispatch is acceptable.
1. For each individual task dispatch: on a transient error (529/Overloaded), retry up to R times (count TBD) before marking the task blocked.
1. After all per-task dispatches complete (or fail), fall through to step 3 of the P1 flow (re-resolve phase completeness).

### P3 — Single-phase final-walkthrough suppression

1. On `/specmanager-build` completion for a single-phase feature: the post-phase pipeline fires per P1, generating the per-phase walkthrough. No `final` walkthrough is attempted.
1. On `/specmanager-walkthrough` invocation: agent checks total phase count. If 1, the per-phase walkthrough is the terminal artifact; no `final` mode is entered, suggested, or offered.
1. `agents/walkthrough-writer.md`: `phase: "final"` mode is documented as multi-phase only.

## Open questions

| #   | Question                                                                                                                                                                                                                                                                                                                                                                  | Impact                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| OQ1 | **Per-task dispatch threshold N.** What task count triggers enforced per-task dispatch? Candidates: N=1 (always per-task), N=5 (small phases ok as single), N=10. Lower N = more 529 isolation + tier savings; higher N = fewer builder Task round-trips for tiny phases. Answer: architect to recommend.                                                                 | Determines default behaviour for the majority of real phases |
| OQ2 | **Retry count R and backoff for 529.** Candidates: R=2, R=3; fixed vs. exponential backoff. Must be simple (prompt logic, no new infra).                                                                                                                                                                                                                                  | Determines how aggressively transient errors are absorbed    |
| OQ3 | **P1: core helper vs. pure prompt logic.** Does the build command need a new core tool (e.g. `is_phase_complete_and_unwalkthroughed`) for deterministic post-phase detection, or is `list_tasks` + prompt reasoning sufficient? A helper reduces prompt hallucination risk but adds a server change + rebuild. Answer: architect to recommend                             | Determines whether server source is touched                  |
| OQ4 | **Detecting "builder errored but work landed."** The builder may have done partial work before crashing (e.g. 18/21 tasks marked `done`). The build command must distinguish "error + complete" from "error + incomplete." Mechanism: post-error `list_tasks` call? Or trust task records already updated by the builder before it crashed? Answer: architect to recomend | Correctness of P1 branch condition                           |
| OQ5 | **Whole-phase single-Task as opt-in vs. removed.** Should the fallback (all tasks in one builder Task) be retained as an explicit user opt-in (`--bulk` flag or plan-level annotation), or simply removed? Answer: architect to recomend                                                                                                                                  | Scope of prompt change; affects power-user workflows         |

<br />

