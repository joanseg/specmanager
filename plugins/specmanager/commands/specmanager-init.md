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

## Steps

Call the **`specmanager_init`** MCP tool (idempotent — safe to re-run).
After it returns, report what changed: which directories were created,
and whether `CLAUDE.md` was created or updated.

## Don't

- Don't edit files outside the `<!-- specmanager:start -->` / `<!-- specmanager:end -->`
  markers in `CLAUDE.md`. The user owns that content.
- Don't create features here — point the user at `/specmanager-feature`.
