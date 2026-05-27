---
description: Scaffold .claude/specs/ in the current project and write the managed SpecManager block into CLAUDE.md.
---

Initialize this project for SpecManager.

## What this does

1. Creates `.claude/specs/` (and `features/`) if missing.
2. Writes/refreshes `manifest.json` (the rebuildable board index).
3. Writes a managed block into the project's `CLAUDE.md` between
   `<!-- specmanager:start -->` and `<!-- specmanager:end -->`. Content
   outside those markers is never touched. If `CLAUDE.md` does not exist
   it is created with just the managed block.
4. **Creates or refreshes `./docs/DESIGN.md`** — the repo-level design-system
   spec, following the [Google Stitch DESIGN.md spec](../docs/references/stitch-design-md.md).
   Tokens (colors, typography, spacing, components) are inferred from the
   existing UI source files (CSS custom properties, sample component files,
   Tailwind config). The managed region lives between
   `<!-- specmanager:design:start -->` / `<!-- specmanager:design:end -->`;
   anything outside is the user's territory. Re-runs are idempotent and
   non-destructive.

## Steps

Call the **`specmanager_init`** MCP tool (idempotent — safe to re-run).
After it returns, report what changed: which directories were created,
whether `CLAUDE.md` was created/updated, and whether `./docs/DESIGN.md` was
created/updated.

## Notes on the optional Design stage

SpecManager's lifecycle now includes an optional Design stage between
Architecture and Plan (`PRD → Architecture → Design (optional) → Plan → Build
→ Walkthroughs`). Run `/specmanager-design <feature>` after the PRD is
approved to produce an HTML design brief. The Plan gate stays open if you
skip Design entirely; if a design brief exists in `draft`, the Plan gate
refuses to open until you either approve it or delete the draft.

## Don't

- Don't edit files outside the `<!-- specmanager:start -->` / `<!-- specmanager:end -->`
  markers in `CLAUDE.md`. The user owns that content.
- Don't edit content **between** the design markers in `./docs/DESIGN.md` by
  hand — SpecManager regenerates it after every feature ships. Hand-edits
  belong above the start marker or below the end marker.
- Don't create features here — point the user at `/specmanager-feature`.
