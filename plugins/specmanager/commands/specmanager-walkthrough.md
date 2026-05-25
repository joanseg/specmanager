---
description: Draft a Walkthrough doc for a feature whose Build is complete (all tasks done).
argument-hint: "<featureId or slug>"
---

Generate a Walkthrough for the feature: **$ARGUMENTS**.

## Steps

1. **Resolve the feature.** `list_features` → match by `id`/`slug`.
2. **Check the gate.** `check_gate({ featureId, stage: "walkthrough" })`. Unlike other stages, this gate is **completion-based**: it fails until every task in `list_tasks({ featureId })` has `status: "done"`. If closed, report which tasks are still open and stop.
3. **Confirm no draft already exists.** `list_documents({ featureId, stage: "walkthrough" })`. Don't duplicate.
4. **Invoke the subagent.** `Task({ subagent_type: "walkthrough-writer", prompt: ... })`. Include:
   - Feature id, title, slug.
   - The Plan doc id (for the `dependsOn` link).
   - Hint that task artifacts (commits, files, PR refs) are available via `list_tasks` and worth reading for the code tour.
5. **Sync CLAUDE.md.** Call `sync_claude_md`.
6. **Report.** Document id + file path. Suggest a user review pass before approving.

## Don't
- Don't fabricate code tours. The subagent must read real files via `Read`.
- Don't approve the walkthrough — that's the user's call.
