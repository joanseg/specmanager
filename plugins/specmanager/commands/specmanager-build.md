---
description: Build one phase of a SpecManager feature's plan via the builder subagent. Stops at the phase boundary; never advances.
argument-hint: "<featureId or slug> <phaseName | \"next\"> [--force]"
---

Build one phase of the plan for **$ARGUMENTS**.

`$ARGUMENTS` is `<feature> <phaseName | "next"> [--force]`.
- `next` resolves to the first phase whose tasks aren't all done (`get_next_phase`).
- Otherwise `<phaseName>` must match a `## Phase <name>` heading from `plan.md` exactly.
- `--force` lets you build a phase out of order (e.g. start Phase B while Phase A still has open tasks). Off by default.

## Steps

1. **Parse the arguments.** Split into `<feature>`, `<phaseName>`, optional `--force`. If `<phaseName>` is missing, ask the user (offer `list_phases({ featureId })`).
2. **Resolve the feature.** `list_features` → match by `id`/`slug`. Stop if not found.
3. **Check the Plan is approved.** `check_gate({ featureId, stage: "plan" })` must be `ok: true` AND a `plan` doc with `status: "approved"` must exist for this feature (`list_documents({ featureId, stage: "plan" })`). If not approved, report and stop — the builder needs a stable plan to follow.
4. **Resolve the target phase.**
   - If `<phaseName> === "next"`: call `get_next_phase({ featureId })`. If it returns `null`, report "All phases done — nothing to build" and stop.
   - Otherwise: `list_phases({ featureId })` and find the entry matching `<phaseName>`. If none, list available phases and stop.
5. **Order check (unless `--force`).** Read `list_phases({ featureId })` in order. If any phase with a lower `order` than the target phase has `status !== "done"`, refuse: "Phase X has open tasks — build it first, or pass `--force`." Skip this check when `--force` is present.
6. **Idempotency.** If the target phase is already `done`, report and stop — suggest `/specmanager-walkthrough <feature> <phaseName>` instead.
7. **Invoke the builder.** `Task({ subagent_type: "builder", prompt: ... })`. Include:
   - Feature id, title, slug.
   - The target phase name (resolved — not `next`).
   - The Plan doc id (for context).
   - The phase's exit-test line lifted from `plan.md` so the builder knows what "done" looks like.
8. **Auto-fire the phase walkthrough (only if the phase is now fully done).** When the builder returns, re-check whether this phase is complete: `check_gate({ featureId, stage: "walkthrough", phase: "<phaseName>" })`. The gate opens only when every task in the phase is `done`.
   - If the gate is **closed** (the builder stopped mid-phase), skip auto-fire — go to step 9 and report the stop.
   - If the gate is **open**, guard against duplicates: `list_documents({ featureId, stage: "walkthrough" })` filtered to `frontmatter.phase === "<phaseName>"`. If a walkthrough for this phase already exists, **don't** create another — just note it in the report.
   - Otherwise, **auto-invoke** `Task({ subagent_type: "walkthrough-writer", prompt: ... })` in per-phase mode (same inputs the `/specmanager-walkthrough` command passes: feature id/title/slug, the phase name, the Plan doc id, the phase's exit-test line, and a hint that this phase's task artifacts are available via `list_tasks` filtered by `phase`). The walkthrough lands in `draft` — never approve it; the user reviews first.
   - **Then offer a post-phase doc sync (only on this open-gate path).** After the walkthrough has been auto-fired or deduped, present an `AskUserQuestion` with exactly **three** options so the user decides how to reconcile project docs now that the phase has landed. List **"Full sync now"** first and label it *(recommended)* — it is the default; convey the default by ordering it first and labelling it, matching the lightweight `AskUserQuestion` style used in `commands/specmanager-plan.md` and `agents/planner.md`. The three options and their action sequences:
     - **Full sync now** *(recommended)* — run the native `/init` slash command in-session, **then** `sync_claude_md`, **then** `sync_design_md({ mode: "refresh" })`, in that exact order. (`/init` is a native interactive slash command the agent runs in-session — it is not a server/MCP call.)
     - **Managed blocks only** — run `sync_claude_md`, **then** `sync_design_md({ mode: "refresh" })`. Do **not** run `/init`. (Lighter and faster; refreshes only the SpecManager-managed regions.)
     - **Wait until I've verified the phase** — run no sync at all (don't refresh the managed block — all three steps defer together). Print the verbatim manual re-sync block below so the user can re-trigger the same steps later:
       ```
       Docs not synced. After you've verified this phase, re-sync manually:
         /init   (then)   sync_claude_md   +   sync_design_md(refresh)
       ```
     - If the user **cancels or declines** the question, treat it as **Wait**: run no sync and print the manual re-sync block above.

     The exact per-branch action sequences (run the tools in this order):

     | Answer | Actions, in order |
     |---|---|
     | **Full sync now** *(recommended, default)* | `/init` → `sync_claude_md` → `sync_design_md({ mode: "refresh" })` |
     | **Managed blocks only** | `sync_claude_md` → `sync_design_md({ mode: "refresh" })` (no `/init`) |
     | **Wait until I've verified the phase** | no sync; print the manual re-sync block |
     | *(cancel / decline)* | same as **Wait** |
9. **Report.** 
   - List the tasks the builder completed and the artifacts recorded.
   - If step 8 auto-created a walkthrough, report its doc id + file path (`walkthroughs/<slug>/phase-<phaseName>.md`) and that it's a `draft` awaiting review. If a walkthrough already existed, say so and point at `/specmanager-walkthrough <feature> <phaseName>` to regenerate manually.
   - If the builder stopped mid-phase on a failure, surface the task id and the error verbatim. Do not retry automatically.

## Don't
- Don't bypass the plan-approved check. The Plan is the contract.
- Don't run two phases back-to-back. The phase is the testable boundary; the user reviews each one.
- Don't approve any documents.
- Don't mark tasks `done` from this command — the builder owns task state transitions.
- Don't drive a phase that is already done.
