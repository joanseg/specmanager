---
description: Draft the execution Plan AND emit task records for a SpecManager feature via the planner subagent. Plans are organised into phases with Fibonacci-scored tasks ≤3.
argument-hint: "<featureId or slug>"
---

Generate a Plan + phased tasks for the feature: **$ARGUMENTS**.

## Steps

1. **Resolve → gate → mode.** `list_features`, match by `id`/`slug`; stop if not found. Then `check_gate({ featureId, stage: "plan" })` — Architecture approved AND (no design doc exists OR design approved). If closed, report `reason` (it names which leg of the compound gate failed) and stop; the common case is a design doc still in `draft`, which the user either approves or deletes to skip design entirely. Then `list_documents({ featureId, stage: "plan" })` and pick the mode:
   - No plan doc → **normal mode**.
   - Plan doc exists, `list_phases` shows a `kind: "placeholder"` phase with `taskCount 0`, the `kind: "spike"` phase is `status: "done"`, and that phase's walkthrough (`list_documents({ featureId, stage: "walkthrough" })`) is `approved` → **fill mode**.
   - Placeholder exists but the spike is not done → refuse: "spike not finished — build it first". Spike done but its walkthrough missing or `draft` → refuse: "approve the spike walkthrough first (it holds the findings)".
   - Otherwise → refuse: a plan already exists; don't duplicate.
2. **Look up the design doc id (optional).** `list_documents({ featureId, stage: "design" })`. If a doc exists (it must be approved at this point — the gate enforced it), grab its id + version; otherwise pass `null` in the subagent prompt.
3. **Invoke the subagent.** `Task({ subagent_type: "planner", prompt: ... })`. Include:
   - Feature id, title, slug.
   - The Architecture doc id (look up first, pass explicitly).
   - The PRD doc id (for context).
   - The Design doc id + version (or `null`), so the planner's design-grounding step can read it.
   - Any extra context the user gave.

   **Fill mode** instead: first `set_status({ id: planId, status: "draft" })` so the user re-approves the filled phase (`/specmanager-build` refuses a non-approved plan; the spike walkthrough goes stale, which is expected). Setting `draft` is not approving. Then pass `Mode: fill`, the plan doc id + its new `version`, the placeholder phase name, the spike walkthrough id, and the spike tasks' artifacts (commits + files from `list_tasks`).

   The planner writes `plan.md` (organised into `## Phase <name> — <theme>` sections with `**Exit test:**` lines) AND emits a `create_task` call per Build-order item with `phase` and Fibonacci `complexity` (≤3), referencing the design brief's screens/components/tokens by name when one was passed in. The default is a **single named phase** — the expected output, not a degenerate case. The planner splits only for a **spike** (core unknowns that change which tasks exist → a spike phase + an empty placeholder phase, filled by re-running this command) or a total of **≈100 points**, and confirms either with you via `AskUserQuestion` before persisting tasks. In fill mode it adds tasks to the placeholder phase only.
4. **Report.** Plan doc id + file path + per-phase task counts (e.g. `Phase A: 5 tasks, Phase B: 7 tasks`) and whether the plan was grounded in a design brief. In fill mode, say the plan is back in `draft` and needs re-approval before building. Suggest opening the board to see the Build column populated.

## Don't
- Don't generate the plan inline — go through the subagent.
- Don't call `create_task` from this orchestration command. The subagent does it so plan body + tasks stay consistent.
- Don't accept a truly flat plan with no `## Phase` heading at all — send it back to redo. A **single named phase** is correct and expected; don't push the planner to invent extra phases just to have more than one.
- Don't approve the plan — fill mode only sets it back to `draft`; approval is the user's call.
