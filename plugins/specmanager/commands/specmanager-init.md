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

1. Call the **`specmanager_init`** MCP tool first (idempotent — safe to
   re-run). This creates `.claude/specs/` + `manifest.json`, writes the
   managed CLAUDE.md block between the `<!-- specmanager:start -->` /
   `<!-- specmanager:end -->` markers, and creates/refreshes `./docs/DESIGN.md`.
2. After it returns, run the native **`/init`** slash command in-session to
   populate CLAUDE.md's general codebase-doc region. `/init` is a native
   interactive command the agent runs in-session — it is not a server/MCP call.
   It writes **only outside** the SpecManager markers, so it never clobbers the
   managed block (the marker-merge in `core/claude-md.ts` is line-anchored, so
   the regions are disjoint). Running `specmanager_init` first means the markers
   already exist when `/init` fills the surrounding codebase docs.
3. Report what changed across **both** regions:
   - From `specmanager_init`: which directories were created, whether the
     managed CLAUDE.md block was created/updated, and whether `./docs/DESIGN.md`
     was created/updated.
   - From `/init`: that the general codebase docs in CLAUDE.md (outside the
     markers) were (re)generated — so the user need not run `/init` separately.

## Notes on the optional Design stage

SpecManager's lifecycle now includes an optional Design stage between
Architecture and Plan (`PRD → Architecture → Design (optional) → Plan → Build
→ Walkthroughs`). Run `/specmanager-design <feature>` after the PRD is
approved to produce an HTML design brief. The Plan gate stays open if you
skip Design entirely; if a design brief exists in `draft`, the Plan gate
refuses to open until you either approve it or delete the draft.

## Don't

- Don't hand-edit content **between** the `<!-- specmanager:start -->` /
  `<!-- specmanager:end -->` markers in `CLAUDE.md` — that managed block is
  owned by `sync_claude_md`. Native `/init` writes only **outside** those
  markers (the general codebase-doc region); because the marker-merge in
  `core/claude-md.ts` is line-anchored, the two regions are disjoint and
  `/init` never clobbers the managed block.
- Don't edit content **between** the design markers in `./docs/DESIGN.md` by
  hand — SpecManager regenerates it after every feature ships. Hand-edits
  belong above the start marker or below the end marker.
- Don't create features here — point the user at `/specmanager-prd`.
