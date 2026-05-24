---
name: feature
description: Create a new SpecManager feature pipeline (a new row on the board). Use when starting a new initiative.
argument-hint: "<feature title>"
---

# /specmanager:feature

Create a new feature pipeline. Each feature flows through PRD → Architecture → Plan → Build → Walkthroughs.

## Inputs

- The feature title is the argument. If absent, ask the user for one short title (e.g. "Checkout corridor").

## Steps

1. Call **`create_feature`** with `{ title }`. It generates a kebab-case slug, scaffolds the per-stage folders, writes `feature.json`, refreshes `manifest.json`, and updates the managed `CLAUDE.md` block.
2. Report the new feature's `id`, `slug`, and folder path so the user can find the files in git.
3. Suggest the next step: drafting the PRD by creating a doc in the `prd` stage (eventually `/specmanager:prd <featureId>` in Phase 4; for Phase 1, use `create_document` directly).

## Don't

- Don't create stage documents implicitly — the user owns when the PRD starts.
- Don't approve anything; new features start in `draft`.
