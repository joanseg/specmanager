---
description: Draft the execution Plan AND emit task records for a SpecManager feature via the planner subagent. Plans are organised into phases with Fibonacci-scored tasks ≤3.
argument-hint: "<featureId or slug>"
---

Generate a Plan + phased tasks for the feature: **$ARGUMENTS**.

## Steps

1. **Resolve → gate → no duplicate.** `list_features`, match by `id`/`slug`; stop if not found. Then `check_gate({ featureId, stage: "plan" })` — Architecture approved AND (no design doc exists OR design approved). If closed, report `reason` (it names which leg of the compound gate failed) and stop; the common case is a design doc still in `draft`, which the user either approves or deletes to skip design entirely. Then `list_documents({ featureId, stage: "plan" })` — don't duplicate.
2. **Look up the design doc id (optional).** `list_documents({ featureId, stage: "design" })`. If a doc exists (it must be approved at this point — the gate enforced it), grab its id + version; otherwise pass `null` in the subagent prompt.
3. **Invoke the subagent.** `Task({ subagent_type: "planner", prompt: ... })`. Include:
   - Feature id, title, slug.
   - The Architecture doc id (look up first, pass explicitly).
   - The PRD doc id (for context).
   - The Design doc id + version (or `null`), so the planner's design-grounding step can read it.
   - Any extra context the user gave.

   The planner writes `plan.md` (organised into `## Phase <name> — <theme>` sections with `**Exit test:**` lines) AND emits a `create_task` call per Build-order item with `phase` and Fibonacci `complexity` (≤3), referencing the design brief's screens/components/tokens by name when one was passed in. Most features come back as a **single named phase** — that is the expected common output, not a degenerate case. The planner only splits into multiple phases for a genuinely large project with a real mid-build test boundary, and confirms any such split with you via `AskUserQuestion` before persisting tasks.
4. **Report.** Plan doc id + file path + per-phase task counts (e.g. `Phase A: 5 tasks, Phase B: 7 tasks`) and whether the plan was grounded in a design brief. Suggest opening the board to see the Build column populated.

## Don't
- Don't generate the plan inline — go through the subagent.
- Don't call `create_task` from this orchestration command. The subagent does it so plan body + tasks stay consistent.
- Don't accept a truly flat plan with no `## Phase` heading at all — send it back to redo. A **single named phase** is correct and expected; don't push the planner to invent extra phases just to have more than one.
