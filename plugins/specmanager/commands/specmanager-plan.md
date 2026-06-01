---
description: Draft the execution Plan AND emit task records for a SpecManager feature via the planner subagent. Plans are organised into phases with Fibonacci-scored tasks ≤3.
argument-hint: "<featureId or slug>"
---

Generate a Plan + phased tasks for the feature: **$ARGUMENTS**.

## Steps

1. **Resolve the feature.** `list_features` → match by `id`/`slug`. Stop if not found.
2. **Check the gate.** `check_gate({ featureId, stage: "plan" })` — Architecture must be approved AND (no design doc exists OR design approved). If closed, report `reason` to the user (the reason string says which leg of the compound gate failed) and stop. A common case: design doc is in `draft` — the user either approves it or deletes the brief to skip design entirely.
3. **Confirm no draft already exists.** `list_documents({ featureId, stage: "plan" })`. Don't duplicate.
4. **Look up the design doc id (optional).** `list_documents({ featureId, stage: "design" })`. If a doc exists (it must be approved at this point — the gate enforced it), grab its id + version. If none exists, pass `null` in the subagent prompt.
5. **Invoke the subagent.** `Task({ subagent_type: "planner", prompt: ... })`. Include:
   - Feature id, title, slug.
   - The Architecture doc id (look up first, pass explicitly).
   - The PRD doc id (for context).
   - The Design doc id + version (or `null`), so the planner's design-grounding step can read it.
   - Any extra context the user gave.

   The planner writes `plan.md` (organised into `## Phase <name> — <theme>` sections with `**Exit test:**` lines) AND emits a `create_task` call per Build-order item with `phase` and Fibonacci `complexity` (≤3). Most features come back as a **single named phase** — that is the expected common output, not a degenerate case. The planner only splits into multiple phases for a genuinely large project with a real mid-build test boundary, and confirms any such split with you via `AskUserQuestion` before persisting tasks. When a design doc was passed in, the planner references the brief's screens/components/tokens by name in the plan body.
6. **Sync CLAUDE.md.** Call `sync_claude_md`.
7. **Report.** Plan doc id + file path + per-phase task counts (e.g. `Phase A: 5 tasks, Phase B: 7 tasks`) and whether the plan was grounded in a design brief. Suggest opening the board to see the Build column populated.

## Don't
- Don't generate the plan inline — go through the subagent.
- Don't call `create_task` from this orchestration command. The subagent does it so plan body + tasks stay consistent.
- Don't accept a truly flat plan with no `## Phase` heading at all — if the subagent returns one, send it back to redo. A **single named phase** is correct and expected, though; don't push the planner to invent extra phases just to have more than one.
