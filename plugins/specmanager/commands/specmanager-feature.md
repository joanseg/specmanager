---
description: Create a new SpecManager feature pipeline (a new row on the board).
argument-hint: "<feature title>"
---

Create a new feature pipeline. Each feature flows through
PRD → Architecture → Plan → Build → Walkthroughs.

## Inputs

- The feature title is the argument. If absent, ask the user for one short
  title (e.g. "Checkout corridor").

## Steps

1. Call **`create_feature`** with `{ title }`. It generates a kebab-case slug,
   scaffolds the per-stage folders, writes `feature.json`, refreshes
   `manifest.json`, and updates the managed `CLAUDE.md` block.
2. Report the new feature's `id`, `slug`, and folder path so the user can
   find the files in git.
3. Suggest the next step: drafting the PRD by creating a doc in the `prd`
   stage. In Phase 1 there is no `/specmanager:prd` skill yet — use the
   `create_document` MCP tool directly. Phase 4 will add the stage skills.

## Don't

- Don't create stage documents implicitly — the user owns when the PRD starts.
- Don't approve anything; new features start in `draft`.
