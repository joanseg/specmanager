# SpecManager

A Claude Code plugin that manages a software project's lifecycle — PRD → architecture → plan → tasks → build → walkthroughs — as a kanban board over plain markdown in the repo.

**Status:** Phase 2 complete (headless core + MCP server + read-only kanban board served at `http://127.0.0.1:4317` with live updates).

## Design docs

- `docs/architecture-and-spec.md` — full architecture & specification (source of truth).
- `docs/phase-tasks.md` — six-phase implementation plan (≤ 3 points per task).
- `docs/phase-1-test-walkthrough.md` — exact steps to install and test Phase 1 in a scratch repo.
- `docs/phase-2-test-walkthrough.md` — exact steps to verify the board UI + live updates.

## Build

```bash
cd plugins/specmanager/server
npm install
npm run build
npm run selftest          # Phase 1 — core flow against a tmp dir
npm run selftest-board    # Phase 2 — boots board, REST + WS + watcher
npm run smoke-mcp         # MCP wire protocol + 17 tools registered

cd ../ui
npm install
npm run build             # produces ui/dist/ served by the board server
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

Both `plugins/specmanager/server/dist/` and `plugins/specmanager/ui/dist/` are
committed — installs work with no build step on the user's machine. Contributors
rebuild before committing source changes.

See `docs/phase-1-test-walkthrough.md` and `docs/phase-2-test-walkthrough.md`
for the end-to-end install + test flows.

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
      commands/
        specmanager-init.md               # /specmanager-init
        specmanager-feature.md            # /specmanager-feature
        specmanager-board.md              # /specmanager-board
      server/                             # MCP server + board server (Fastify + ws + chokidar)
        src/
          core/                           # @specmanager/core — schema, state machine, deps, manifest, CLAUDE.md
          mcp.ts                          # MCP server bootstrap, boots board on startup, all Phase 1+2 tools
          board-server.ts                 # HTTP REST + WS + file watcher (Phase 2)
          selftest*.ts / smoke-mcp.ts     # validation scripts
      ui/                                 # React + Vite kanban board → ui/dist/
        src/
          App.tsx                         # grid + cell components
          api.ts                          # /api/board + WS client
          styles.css
```

Source-of-truth artifacts in *target* projects live under `.claude/specs/features/<slug>/` and the project's `CLAUDE.md` carries a managed block between `<!-- specmanager:start -->` / `<!-- specmanager:end -->` markers.
