---
description: Draft an Architecture doc for a SpecManager feature via the architect subagent (PRD-grounded + repo-grounded).
argument-hint: "<featureId or slug>"
---

Generate an Architecture draft for the feature: **$ARGUMENTS**.

## Steps

1. **Resolve → gate → no duplicate.** `list_features`, match by `id`/`slug`; stop if not found. Then `check_gate({ featureId, stage: "architecture" })` — if `ok: false`, report `reason` and stop; never draft around a closed gate. Then `list_documents({ featureId, stage: "architecture" })` — if a doc exists, point the user at the panel to edit it, or to delete it before regenerating. Don't duplicate.
2. **Invoke the subagent.** Use the `Task` tool with `subagent_type: "architect"` and a prompt carrying the feature id/title/slug, the PRD id (look it up via `list_documents({ featureId, stage: "prd" })` and pass it explicitly so the subagent doesn't search for it), and any context the user gave alongside the slash command. The architect reads the PRD, scans repo conventions, and calls `create_document` itself.
3. **Report.** Document id + file path. Suggest reviewing in the board.

## Don't
- Don't draft architecture inline — the subagent has the system prompt that enforces repo-grounded design.
