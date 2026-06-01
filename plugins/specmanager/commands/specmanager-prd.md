---
description: Draft a PRD for a SpecManager feature via the prd-writer subagent. Creates the feature if it doesn't exist yet.
argument-hint: "<feature title, or existing featureId/slug>"
---

Draft a PRD for: **$ARGUMENTS**.

This is the entry point for a new feature. The argument is normally a short
feature **title** (e.g. "Checkout corridor"). If the argument already matches an
existing feature, the PRD is drafted for that feature instead.

## Steps

1. **Resolve or create the feature.** Call `list_features`.
   - If a feature's `id` or `slug` matches the argument, use it.
   - Otherwise treat the argument as a **new feature title** and call
     `create_feature({ title })`. It generates a kebab-case slug, scaffolds the
     per-stage folders, writes `feature.json`, and refreshes `manifest.json`.
     Report the new `id`, `slug`, and folder path.
   - If no argument was given, ask the user for one short title and stop.
2. **Check for an existing draft.** Call
   `list_documents({ featureId, stage: "prd" })`. If a PRD already exists, ask
   whether to (a) iterate on it via the panel UI or (b) start over (the user
   must delete it manually). Do **not** create a duplicate.
3. **Invoke the subagent.** Use the `Task` tool with `subagent_type: "prd-writer"`
   and a prompt that includes:
   - The feature id and title.
   - Any extra context the user gave alongside the slash command.
4. **Sync CLAUDE.md.** When the subagent reports success, call `sync_claude_md`
   so the managed block reflects the new feature and draft.
5. **Report.** Tell the user the new document id and file path. Suggest opening
   it in the board (`/specmanager-board`) to review, then approve.

## Don't
- Don't approve the PRD — only the user does that.
- Don't approve the new feature; features start in `draft`.
- Don't write the PRD inline in this conversation. Always go through the subagent
  so the system prompt + tool boundaries apply.
