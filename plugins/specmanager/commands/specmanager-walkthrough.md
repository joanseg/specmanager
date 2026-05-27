---
description: Draft a per-phase Walkthrough doc for a feature whose phase is complete, or — with phaseName="final" — the feature-level roll-up once every phase walkthrough is approved.
argument-hint: "<featureId or slug> <phaseName | \"final\">"
---

Generate a Walkthrough for **$ARGUMENTS**.

`$ARGUMENTS` is `<featureId or slug> <phaseName | "final">`.
- `phaseName` is the exact name from `plan.md`'s `## Phase <name> — <theme>` headings (e.g. `A`, `core`). For legacy single-phase features that pre-date phased plans, use `default`.
- `final` writes the feature-level roll-up that links every phase walkthrough. Only opens when every phase has an `approved` walkthrough.

## Steps

1. **Parse the arguments.** Split into `<feature>` and `<phaseName>`. If `<phaseName>` is missing, ask the user which phase (offer `list_phases({ featureId })` to enumerate).
2. **Resolve the feature.** `list_features` → match by `id`/`slug`.
3. **Check the gate.** `check_gate({ featureId, stage: "walkthrough", phase: "<phaseName>" })`. If closed, report `reason` and stop.
   - For a phase name: gate fails until every task in that phase is `done`.
   - For `final`: gate fails until every phase has an **approved** walkthrough (lists missing phases).
4. **Confirm no draft already exists for this phase.** `list_documents({ featureId, stage: "walkthrough" })` and filter to `frontmatter.phase === "<phaseName>"`. Don't duplicate.
5. **Invoke the subagent.** `Task({ subagent_type: "walkthrough-writer", prompt: ... })`. Include:
   - Feature id, title, slug.
   - **The phase name** (REQUIRED — drives which mode the agent runs in: per-phase or final).
   - The Plan doc id.
   - **Per-phase mode**: the phase's exit-test line lifted from `plan.md`; hint that task artifacts for that phase are available via `list_tasks` filtered by `phase`.
   - **Final mode**: the list of phase walkthrough doc ids (look up via `list_documents({ featureId, stage: "walkthrough" })`) — pass them explicitly so the agent doesn't waste tokens searching.
6. **Sync CLAUDE.md.** Call `sync_claude_md`.
7. **Report.** Document id + file path (e.g. `walkthroughs/<slug>/phase-<phaseName>.md`, or `walkthroughs/<slug>/feature.md` for `final`). Suggest a user review pass before approving.

## Don't
- Don't fabricate code tours. The subagent must read real files in per-phase mode; in final mode it must read the existing phase walkthroughs and link, not re-explain.
- Don't approve the walkthrough — that's the user's call.
- Don't try `final` before every phase walkthrough is approved; the gate will refuse.
