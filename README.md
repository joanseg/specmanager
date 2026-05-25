# SpecManager

A Claude Code plugin that manages a software project's lifecycle — PRD → architecture → plan → tasks → build → walkthroughs — as a kanban board over plain markdown in the repo.

**Status:** Phase 1 complete (headless core + MCP server + init/feature skills). UI lands in Phase 2.

## Design docs

- `docs/architecture-and-spec.md` — full architecture & specification (source of truth).
- `docs/phase-tasks.md` — six-phase implementation plan (≤ 3 points per task).
- `docs/phase-1-test-walkthrough.md` — exact steps to install and test Phase 1 in a scratch repo.

## Build

```bash
cd plugins/specmanager/server
npm install
npm run build
npm run selftest        # core flow against a tmp dir
npm run smoke-mcp       # MCP wire protocol + tool registration
```

## Install

This repo ships its own marketplace (`.claude-plugin/marketplace.json`), so it
can be installed directly:

```
# from GitHub
/plugin marketplace add <owner>/specmanager
/plugin install specmanager@specmanager

# from a local checkout
/plugin marketplace add /path/to/specmanager
/plugin install specmanager@specmanager
```

The compiled `plugins/specmanager/server/dist/` is committed — installs work
with no build step on the user's machine. Contributors run
`cd plugins/specmanager/server && npm install && npm run build` before
committing source changes.

See `docs/phase-1-test-walkthrough.md` for the end-to-end install + test flow.

## Layout

```
specmanager/                              # repo root = marketplace root
  .claude-plugin/marketplace.json         # the marketplace manifest
  docs/                                   # design docs + walkthroughs
  plugins/
    specmanager/                          # the plugin root
      .claude-plugin/plugin.json          # plugin manifest
      .mcp.json                           # auto-starts the MCP server
      hooks/
        hooks.json                        # SessionStart deps install + FileChanged notice
        install-deps.mjs                  # copies server/package.json into CLAUDE_PLUGIN_DATA, npm install
      skills/
        init/SKILL.md                     # /specmanager:init
        feature/SKILL.md                  # /specmanager:feature
      server/
        src/
          core/                           # @specmanager/core — schema, state machine, deps, manifest, CLAUDE.md
          mcp.ts                          # MCP server bootstrap + all Phase 1 tools
          selftest.ts / smoke-mcp.ts      # validation scripts
```

Source-of-truth artifacts in *target* projects live under `.claude/specs/features/<slug>/` and the project's `CLAUDE.md` carries a managed block between `<!-- specmanager:start -->` / `<!-- specmanager:end -->` markers.
