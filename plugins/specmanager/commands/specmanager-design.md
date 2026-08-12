---
description: Design the actual screens for a SpecManager feature as stacked high-fi HTML mockups via the designer subagent. Optional — Plan can run without one, but if a draft exists, Plan refuses to open until it's approved.
argument-hint: "<featureId or slug> [optional one-line context]"
---

Design the screens for the feature: **$ARGUMENTS**.

## Steps

1. **Resolve → gate → no duplicate.** `list_features`, matching `id`/`slug` against the **first whitespace-separated token** of the argument (anything after it is extra context to forward to the subagent); if none match, ask the user to clarify and stop. Then `check_gate({ featureId, stage: "design" })` — open once the PRD is approved; Architecture is **not** required, design can run in parallel with it. If closed, report `reason` and stop. Then `list_documents({ featureId, stage: "design" })` — if a doc exists, point the user at the panel to edit, or delete the file before regenerating. Don't duplicate.
2. **Look up PRD and Architecture ids** to pass into the subagent prompt (`list_documents` per stage). Architecture may be absent or in draft — pass `null` if so.
3. **Collect attachments.** If the user pasted screenshot paths in the conversation before invoking the command, list them — the designer uses them as visual reference and may inline them as data URIs. If no attachments, the designer works from the PRD + DESIGN.md alone. **Optional design reference (R5/AC7):** when `docs/DESIGN.md` holds only placeholder/`# TODO` tokens, the designer may invite an optional design reference (a screenshot/example through this same attachment path) to ground a synthesized token system — always optional, never required; the designer proceeds and synthesizes if none is given.
4. **Invoke the subagent.** Use the `Task` tool with `subagent_type: "designer"` and a prompt carrying: the feature id/title/slug, the PRD id + version, the Architecture id + version (if any), the screenshot paths the user attached (if any), and any extra context given after the feature id. The designer reads the upstream docs and `./docs/DESIGN.md`, designs the actual screens as one self-contained HTML file (high-fi mockups stacked with explanatory notes), and calls `create_design_brief` itself.
5. **Report.** Document id + file path (`design/mockups.html`). Suggest opening it in the board — the doc panel renders the stacked mockups in a sandboxed iframe preview.

## Don't
- Don't design the screens inline in chat — the subagent has the system prompt that enforces self-contained, DESIGN.md-grounded, high-fi HTML.
- Don't call `create_document` directly with `stage: "design"` — always go through `create_design_brief` so the `---` escape and the 5MB cap apply.
