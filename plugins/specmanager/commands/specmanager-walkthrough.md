---
description: Draft a per-phase Walkthrough doc for a feature whose phase is complete, or — with phaseName="final" — the feature-level roll-up once every phase walkthrough is approved.
argument-hint: "<featureId or slug> <phaseName | \"final\">"
---

Generate a Walkthrough for **$ARGUMENTS**.

`$ARGUMENTS` is `<featureId or slug> <phaseName | "final">`.
- `phaseName` is the exact name from `plan.md`'s `## Phase <name> — <theme>` headings (e.g. `A`, `core`). For legacy single-phase features that pre-date phased plans, use `default`.
- `final` writes the feature-level roll-up that links every phase walkthrough.

## Steps

1. **Parse the arguments.** Split into `<feature>` and `<phaseName>`. If `<phaseName>` is missing, ask the user which phase (offer `list_phases({ featureId })` to enumerate).
2. **Resolve the feature.** `list_features` → match by `id`/`slug`.
3. **Single-phase `final` short-circuit (refuse early).** If `<phaseName> === "final"` **and** `list_phases({ featureId })` returns exactly **one** phase, refuse before touching the gate: "Single-phase feature: the per-phase walkthrough is terminal; there is no `final` roll-up. Run `/specmanager-walkthrough <feature> <thatPhaseName>` instead." Approving that single per-phase walkthrough ships the feature (`isFeatureShipped`). `final` is valid only for multi-phase features. Don't burn a gate round-trip or a subagent Task.
4. **Gate → no duplicate.** `check_gate({ featureId, stage: "walkthrough", phase: "<phaseName>" })` — for a phase name it fails until every task in that phase is `done`; for `final` it fails until every phase has an **approved** walkthrough (it lists the missing ones, and is only reachable for multi-phase features — single-phase `final` was refused at step 3). If closed, report `reason` and stop. Then `list_documents({ featureId, stage: "walkthrough" })` filtered to `frontmatter.phase === "<phaseName>"`. Don't duplicate.
5. **Invoke the subagent.** `Task({ subagent_type: "walkthrough-writer", prompt: ... })` with the feature id/title/slug, the Plan doc id, and **the phase name** (REQUIRED — it drives which mode the agent runs in). **Per-phase mode:** also pass the phase's exit-test line lifted from `plan.md`, and hint that that phase's task artifacts come from `list_tasks` filtered by `phase`. **Final mode:** also pass the phase walkthrough doc ids (`list_documents({ featureId, stage: "walkthrough" })`) explicitly, so the agent doesn't search for them.
6. **Report.** Document id + file path (`walkthroughs/<slug>/phase-<phaseName>.md`, or `feature.md` for `final`). Suggest a user review pass before approving.

## Don't
- Don't fabricate code tours. The subagent must read real files in per-phase mode; in final mode it must read the existing phase walkthroughs and link, not re-explain.
- Don't approve the walkthrough — that's the user's call.
