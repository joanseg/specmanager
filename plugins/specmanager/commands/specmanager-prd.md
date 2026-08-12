---
description: Draft a PRD for a SpecManager feature via the prd-writer subagent. Creates the feature if it doesn't exist yet.
argument-hint: "<feature title, or existing featureId/slug>"
---

Draft a PRD for: **$ARGUMENTS**.

This is the entry point for a new feature: the argument is normally a short
feature **title** (e.g. "Checkout corridor"), but if it matches an existing
feature, the PRD is drafted for that feature instead.

## Steps

1. **Resolve or create the feature.** Call `list_features`. If a feature's `id`
   or `slug` matches the argument, use it. Otherwise treat the argument as a
   **new feature title** and call `create_feature({ title })` — it generates a
   kebab-case slug, scaffolds the per-stage folders, writes `feature.json`, and
   refreshes `manifest.json`; report the new `id`, `slug`, and folder path. If no
   argument was given, ask the user for one short title and stop.
2. **Check for an existing draft.** Call
   `list_documents({ featureId, stage: "prd" })`. **Ignore docs with
   `kind: "interview"`** — an interview is pre-PRD material, not a PRD; an
   interview-first flow must not be reported as "a PRD already exists". If a
   non-interview PRD already exists, ask whether to (a) iterate on it via the
   panel UI or (b) start over (the user must delete it manually). Do **not**
   create a duplicate.
3. **Invoke the subagent.** Use the `Task` tool with `subagent_type: "prd-writer"`
   and a prompt carrying the feature id + title and any extra context the user
   gave alongside the slash command.
4. **Report.** The new document id and file path. Suggest opening it in the board
   (`/specmanager-board`) to review, then approve.

## Don't
- Don't approve the PRD — only the user does that.
- Don't approve the new feature; features start in `draft`.
- Don't write the PRD inline — always go through the subagent so its system
  prompt and tool boundaries apply.
