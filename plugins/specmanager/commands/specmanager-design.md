---
description: Draft an HTML design brief for a SpecManager feature via the designer subagent. Optional — Plan can run without one, but if a draft brief exists, Plan refuses to open until it's approved.
argument-hint: "<featureId or slug> [optional one-line context]"
---

Generate a design brief for the feature: **$ARGUMENTS**.

## Steps

1. **Resolve the feature.** Call `list_features`. Find the feature whose `id` or `slug` matches the first whitespace-separated token of the argument. If none match, ask the user to clarify and stop. (Anything after the first token is treated as extra context to forward to the subagent.)
2. **Check the gate.** Call `check_gate({ featureId, stage: "design" })`. The design gate is open once the PRD is approved (Architecture is NOT required — design can run in parallel with Architecture). If closed, report `reason` and stop.
3. **Confirm no draft already exists.** `list_documents({ featureId, stage: "design" })`. If a doc exists, point the user at the panel to edit, or delete the file before regenerating. Don't duplicate.
4. **Look up PRD and Architecture ids** to pass into the subagent prompt. `list_documents({ featureId, stage: "prd" })` and `list_documents({ featureId, stage: "architecture" })`. Architecture may be absent or in draft — pass `null` if so.
5. **Collect attachments.** If the user pasted screenshot paths in the conversation before invoking the command, list them — the designer will inline them as data URIs. If no attachments, the brief is text-only.
6. **Invoke the subagent.** Use the `Task` tool with `subagent_type: "designer"` and a prompt that includes:
   - The feature id, title, and slug.
   - The PRD id + version.
   - The Architecture id + version (if any).
   - The screenshot paths the user attached (if any).
   - Any extra context the user gave after the feature id.

   The designer reads the upstream docs and `./docs/DESIGN.md`, generates HTML, and calls `create_design_brief` itself.
7. **Sync CLAUDE.md.** After the subagent returns, call `sync_claude_md`.
8. **Report.** Document id + file path. Suggest reviewing in the board (HTML preview lands in Phase D — until then the panel will show raw HTML in the markdown editor).

## Don't
- Don't bypass `check_gate`. The gate is the contract.
- Don't draft the brief inline — the subagent has the system prompt that enforces self-contained HTML and proper token references.
- Don't call `create_document` directly with `stage: "design"` — always go through `create_design_brief` so the `---` escape and the 2MB cap apply.
