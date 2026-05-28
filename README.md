# SpecManager

A Claude Code plugin that manages a software project's lifecycle — PRD → architecture → plan → tasks → build → walkthroughs — as a kanban board over plain markdown in the repo.



## Build

```bash
cd plugins/specmanager/server
npm install
npm run build
npm run selftest          # Phase 1 — core flow against a tmp dir
npm run selftest-board    # Phase 2 — boots board, REST + WS + watcher
npm run selftest-phases   # Phase 7.A — phase rollup + Fibonacci ≤3 validation
npm run selftest-execute  # Phase 7.B — per-phase gates + walkthrough storage + migration
npm run smoke-mcp         # MCP wire protocol + 17 tools registered

cd ../ui
npm install
npm run build             # produces ui/dist/ served by the board server
```

## Install

This repo ships its own marketplace (`.claude-plugin/marketplace.json`), so it
can be installed directly:

## 2. Install + reload the plugin in your test repo

```
/plugin marketplace update specmanager
/plugin uninstall specmanager
/plugin install specmanager@specmanager
/reload-plugins
```
Quit claude ctrl+c twice.
```
pkill -f '^claude$'
claude daemon stop
ps aux | grep specmanager | grep -v grep   # kill any leftovers (kill -9 <PID> if needed)
lsof -nP -iTCP:4317 -sTCP:LISTEN
cd /path/to/your/test/repo
claude
```
In the Claude session:

```
/mcp
```
If ❌failed, then slecte reconnect and click enter.

Open the board:

```
/specmanager-board
```

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
