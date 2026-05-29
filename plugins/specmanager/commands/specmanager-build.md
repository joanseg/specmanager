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
8. **Report.** When the builder returns:
   - List the tasks it completed and the artifacts recorded.
   - If the phase is now fully done, suggest **`/specmanager-walkthrough <feature> <phaseName>`** as the next step (do NOT invoke it — user reviews first).
   - If the builder stopped mid-phase on a failure, surface the task id and the error verbatim. Do not retry automatically.

## Don't
- Don't bypass the plan-approved check. The Plan is the contract.
- Don't run two phases back-to-back. The phase is the testable boundary; the user reviews each one.
- Don't approve any documents.
- Don't mark tasks `done` from this command — the builder owns task state transitions.
- Don't drive a phase that is already done.
