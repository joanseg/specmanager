---
description: Draft an Architecture doc for a SpecManager feature via the architect subagent (PRD-grounded + repo-grounded).
argument-hint: "<featureId or slug>"
---

Generate an Architecture draft for the feature: **$ARGUMENTS**.

## Steps

1. **Resolve the feature.** Call `list_features`; match by `id` or `slug`. Stop if not found.
2. **Check the gate.** Call `check_gate({ featureId, stage: "architecture" })`. If `ok: false`, report `reason` to the user and stop — do NOT try to generate around a closed gate.
3. **Confirm no draft already exists.** `list_documents({ featureId, stage: "architecture" })`. If a doc exists, point the user at the panel to edit, or to delete it before regenerating. Don't duplicate.
4. **Invoke the subagent.** Use the `Task` tool with `subagent_type: "architect"` and a prompt that includes:
   - The feature id, title, and slug.
   - The PRD id (look it up via `list_documents({ featureId, stage: "prd" })` and pass it explicitly so the subagent doesn't waste tokens searching).
   - Any context the user gave alongside the slash command.

   The architect will read the PRD, scan repo conventions, and call `create_document` itself.
5. **Sync CLAUDE.md.** After the subagent returns, call `sync_claude_md`.
6. **Report.** Document id + file path. Suggest reviewing in the board.

## Don't
- Don't bypass `check_gate`. The gate is the contract.
- Don't draft architecture inline — the subagent has the system prompt that enforces repo-grounded design.
