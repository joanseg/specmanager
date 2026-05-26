---
description: Draft a per-phase Walkthrough doc for a feature whose phase is complete (all tasks in that phase done).
argument-hint: "<featureId or slug> <phaseName>"
---

Generate a per-phase Walkthrough for **$ARGUMENTS**.

`$ARGUMENTS` is `<featureId or slug> <phaseName>`. `phaseName` is the exact name from `plan.md`'s `## Phase <name> — <theme>` headings (e.g. `A`, `core`). For legacy single-phase features that pre-date phased plans, use `default`. The sentinel `final` is **reserved** for the feature-level roll-up (Phase 7.C) — refuse it for now.

## Steps

1. **Parse the arguments.** Split into `<feature>` and `<phaseName>`. If `<phaseName>` is missing, ask the user which phase (offer `list_phases({ featureId })` to enumerate). Refuse `final`.
2. **Resolve the feature.** `list_features` → match by `id`/`slug`.
3. **Check the gate.** `check_gate({ featureId, stage: "walkthrough", phase: "<phaseName>" })`. This gate is **completion-based for the named phase**: it fails until every task with `phase === "<phaseName>"` has `status: "done"`. If closed, report which tasks are still open and stop.
4. **Confirm no draft already exists for this phase.** `list_documents({ featureId, stage: "walkthrough" })` and filter to `frontmatter.phase === "<phaseName>"`. Don't duplicate.
5. **Invoke the subagent.** `Task({ subagent_type: "walkthrough-writer", prompt: ... })`. Include:
   - Feature id, title, slug.
   - **The phase name** (REQUIRED — the agent scopes its code tour to this phase's task artifacts only).
   - The Plan doc id (for the `dependsOn` link).
   - The phase's exit-test line from `plan.md`.
   - Hint that task artifacts (commits, files, PR refs) for the phase are available via `list_tasks` filtered by `phase`.
6. **Sync CLAUDE.md.** Call `sync_claude_md`.
7. **Report.** Document id + file path (e.g. `walkthroughs/<slug>/phase-<phaseName>.md`). Suggest a user review pass before approving.

## Don't
- Don't fabricate code tours. The subagent must read real files via `Read`.
- Don't approve the walkthrough — that's the user's call.
- Don't accept the `final` phase argument until Phase 7.C ships.
- Don't write a single per-feature walkthrough anymore — every walkthrough is per-phase now.
