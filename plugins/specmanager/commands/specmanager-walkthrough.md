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
3. **Single-phase `final` short-circuit (refuse early).** If `<phaseName> === "final"` **and** `list_phases({ featureId })` returns exactly **one** phase, refuse before touching the gate: "Single-phase feature: the per-phase walkthrough is terminal; there is no `final` roll-up. Run `/specmanager-walkthrough <feature> <thatPhaseName>` instead." Approving that single per-phase walkthrough ships the feature (`isFeatureShipped`).
4. **Gate → no duplicate.** `check_gate({ featureId, stage: "walkthrough", phase: "<phaseName>" })`. If closed, report `reason` and stop. Then `list_documents({ featureId, stage: "walkthrough" })` filtered to `frontmatter.phase === "<phaseName>"`. Don't duplicate.
5. **Invoke the subagent.** `Agent({ subagent_type: "walkthrough-writer", prompt: ... })` with the feature id/title/slug, the Plan doc id, and **the phase name** (REQUIRED — it drives which mode the agent runs in). **Per-phase mode:** also pass the phase's exit-test line lifted from `plan.md`. Pass the phase's `kind` (`list_phases({ featureId })`) so a `"spike"` phase gets its `## Spike findings`. A manual run has no build log: tell the agent its `## Lessons learned` draws on the phase commits and `meta.blocked` notes only. **Final mode:** also pass the phase walkthrough doc ids (`list_documents({ featureId, stage: "walkthrough" })`).
6. **Report.** Document id + file path (`walkthroughs/<slug>/phase-<phaseName>.md`, or `feature.md` for `final`). Suggest a user review pass before approving.

## Don't
- Don't approve the walkthrough — that's the user's call.
