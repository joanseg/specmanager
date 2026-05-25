---
description: Draft a PRD for a SpecManager feature via the prd-writer subagent.
argument-hint: "<featureId or slug>"
---

Generate a PRD draft for the feature: **$ARGUMENTS**.

## Steps

1. **Resolve the feature.** Call `list_features`. Find the feature whose `id` or `slug` matches the argument. If none match, ask the user to clarify and stop.
2. **Check the gate.** Call `check_gate({ featureId, stage: "prd" })`. The PRD gate is always open in normal flow, but a `draft` PRD may already exist — check `list_documents({ featureId, stage: "prd" })`. If one exists, ask whether to (a) iterate on it via the panel UI or (b) start over (the user must delete it manually). Do **not** create a duplicate.
3. **Invoke the subagent.** Use the `Task` tool with `subagent_type: "prd-writer"` and a prompt that includes:
   - The feature id and title.
   - Any extra context the user gave alongside the slash command.
4. **Sync CLAUDE.md.** When the subagent reports success, call `sync_claude_md` so the managed block reflects the new draft.
5. **Report.** Tell the user the new document id and file path. Suggest opening it in the board (`/specmanager-board`) to review, then approve.

## Don't
- Don't approve the PRD — only the user does that.
- Don't write the PRD inline in this conversation. Always go through the subagent so the system prompt + tool boundaries apply.
