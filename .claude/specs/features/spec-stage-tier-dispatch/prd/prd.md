---
id: prd-spec-stage-tier-dispatch-025
featureId: feat-spec-stage-tier-dispatch
stage: prd
status: approved
stale: false
title: Spec-stage tier dispatch PRD
dependsOn: []
basedOn: {}
generatedBy: human
version: 2
createdAt: '2026-06-15T13:37:57.970Z'
updatedAt: '2026-06-15T15:31:27.634Z'
---
## Problem

The shipped "Build leverage primitives" feature routes the builder subagent per-task by complexity → tier → alias (via `core/tiers.ts`). The five spec/drafting subagents — prd-writer, architect, designer, planner, walkthrough-writer — are left unrouted and inherit the session model (typically Opus). Measured evidence: a live end-to-end feature lifecycle consumed \~3.1M window-relevant tokens, \~2.3M in subagents. Spec-stage drafting is the single largest remaining burn bucket. This feature routes those five subagents to appropriate tiers without introducing new dispatch concepts.

## Users & Jobs-to-be-done

| User                               | Job                                                                         |
| ---------------------------------- | --------------------------------------------------------------------------- |
| Solo developer / power user        | Reduce Opus API spend on routine drafting without degrading spec quality    |
| Team with multiple active features | Parallelize features cost-effectively; quality check remains board approval |

The primary pain is cost and rate-limit pressure on Opus during spec drafting — not quality degradation (board approval is the fidelity gate).

## Goals / Non-goals

**Goals**

- Apply `core/tiers.ts` aliases to every spec-stage command dispatch (one subagent call per stage).

- Adopt stage-level default tiers (see Defaults table below) rather than per-task complexity scoring (spec stages are single-call, not task lists).

- Allow per-invocation upward override (consistent with build command behaviour).

- Unknown/unavailable alias → omit `model:` and inherit session default (same safety rule as build).

- No new concepts, primitives, or config surfaces beyond what "Build leverage primitives" already shipped.

**Non-goals**

- The interview command — it runs in the main session, not as a subagent; not tierable by this mechanism.

- Adding a quality rubric for cheap/standard tier output (known gap inherited from "Token usage optimisation" feature; board approval remains the fidelity check).

- Pinning dated model ids anywhere (explicitly rejected by "Token usage optimisation" to avoid requiring plugin updates on new model releases).

- Changing `core/tiers.ts` logic or the alias mapping.

## Success Metrics

| Metric                                | Target                                                                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Spec-stage subagent token burn        | ≥40% reduction vs. all-Opus baseline on a representative 5-feature sample                                                            |
| Spec quality regression               | Zero features where board-approver requires more than one revision cycle attributable to model tier (subjective, tracked informally) |
| Incident rate: wrong model dispatched | 0 (verified by log inspection on first 3 features post-ship)                                                                         |

## Defaults Table

| Stage / Subagent   | Default tier | Rationale                                                                                       |
| ------------------ | ------------ | ----------------------------------------------------------------------------------------------- |
| prd-writer         | cheap        | Routine templated drafting; source is user prompt + interview                                   |
| planner            | standard     | Structured but mechanical; needs reliable task decomposition                                    |
| walkthrough-writer | cheap        | Summarisation of completed work; low synthesis demand                                           |
| designer           | standard     | Visual reasoning benefits from more capable model                                               |
| architect          | strong       | Heavy codebase research + cross-file reasoning; quality matters most; cheap explicitly rejected |

Aliases resolved via `core/tiers.ts`: cheap → haiku, standard → sonnet, strong → opus.

## Constraints & Assumptions

- **Hard dependency:** "Build leverage primitives" must be landed; `core/tiers.ts` and the per-Task `model` dispatch pattern are prerequisites.

- **Merge-ordering risk:** "Token usage optimisation" edits the same command and agent prompt files (`commands/specmanager-*.md`, `agents/*.md`). Implementation must reconcile with or sequence after that feature to avoid conflicts.

- **Assumption:** The five spec-stage commands each dispatch exactly one subagent Task per invocation; if a command spawns multiple agents the routing logic must be applied to each call individually.

- **Assumption:** The `Task({ subagent_type, model, prompt })` dispatch signature accepted by specmanager commands is stable post-"Build leverage primitives".

- No new user-facing config surfaces (no settings.json changes).

- Legal/privacy: no impact — routing change only.

## High-level User Flows

**Normal flow (no override)**

1. User runs `/specmanager-prd feat-foo`.
1. Command resolves stage → `cheap` → alias `haiku`.
1. Dispatches `Task({ subagent_type: "specmanager:prd-writer", model: "haiku", prompt: … })`.
1. If alias unknown/unavailable, omits `model:` field; prd-writer inherits session default.
1. Subagent drafts PRD; result persisted via MCP tool.

**Override flow**

1. User runs `/specmanager-architecture feat-foo --tier standard` (or equivalent override surface).
1. Command resolves to `sonnet` instead of the `strong` default.
1. Dispatch proceeds as above with overridden alias.

**Architect flow (unchanged UX, reduced cost vs. Opus-everywhere)**

1. `/specmanager-architecture` defaults to `strong` → `opus`.
1. No change visible to user; cost unchanged for this stage specifically, but overall lifecycle cost lower.

## Open Questions

| # | Question                                                                                                                                                                        | Risk if wrong                                                                                          |
| - | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1 | What is the override surface? Flag in the command prompt, a config key, or a board UI toggle? Architect should decide.                                                          | Low — parity with build command is the guiding constraint                                              |
| 2 | No cheap/standard quality rubric exists. Should a post-ship quality tracking mechanism be added (e.g. revision-count metadata on docs)? Answer: architect to review             | Medium — without it, regression detection is entirely subjective                                       |
| 3 | planner at `standard`: plans touch codebase structure directly; if quality suffers, should it default to `strong`? Answer: yes                                                  | Low — board gate catches bad plans; can tune post-ship                                                 |
| 4 | If "Token usage optimisation" ships first and modifies the same files, what is the merge strategy for this feature's edits? Answer: token usage optimisation is already shiped. | High — parallel edits to command prompts risk clobbering. Sequencing or explicit diff review required. |
