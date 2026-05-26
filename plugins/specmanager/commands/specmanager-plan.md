---
description: Draft the execution Plan AND emit task records for a SpecManager feature via the planner subagent. Plans are organised into phases with Fibonacci-scored tasks ≤3.
argument-hint: "<featureId or slug>"
---

Generate a Plan + phased tasks for the feature: **$ARGUMENTS**.

## Steps

1. **Resolve the feature.** `list_features` → match by `id`/`slug`. Stop if not found.
2. **Check the gate.** `check_gate({ featureId, stage: "plan" })` — Architecture must be approved. If closed, report and stop.
3. **Confirm no draft already exists.** `list_documents({ featureId, stage: "plan" })`. Don't duplicate.
4. **Invoke the subagent.** `Task({ subagent_type: "planner", prompt: ... })`. Include:
   - Feature id, title, slug.
   - The Architecture doc id (look up first, pass explicitly).
   - The PRD doc id (for context).
   - Any extra context the user gave.

   The planner writes `plan.md` (organised into `## Phase <name> — <theme>` sections with `**Exit test:**` lines) AND emits a `create_task` call per Build-order item with `phase` and Fibonacci `complexity` (≤3).
5. **Sync CLAUDE.md.** Call `sync_claude_md`.
6. **Report.** Plan doc id + file path + per-phase task counts (e.g. `Phase A: 5 tasks, Phase B: 7 tasks`). Suggest opening the board to see the Build column populated.

## Don't
- Don't generate the plan inline — go through the subagent.
- Don't call `create_task` from this orchestration command. The subagent does it so plan body + tasks stay consistent.
- Don't accept a flat plan with no phases — if the subagent returns one, send it back to redo.
