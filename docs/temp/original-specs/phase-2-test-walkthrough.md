# Phase 2 — Test walkthrough

End-to-end test of the **read-only board**. Exit criteria:

> `/specmanager-board` opens the kanban at localhost; the features/docs from Phase 1 render in the right stages; editing a spec file on disk updates the board live.

## 0. Prerequisites

- Phase 1 walkthrough completed at least once (you know the install + scratch repo pattern).
- A scratch repo with `specmanager@specmanager` installed (project or user scope is fine).
- The plugin's `server/dist/` and `ui/dist/` shipped in the repo. Contributors run:
  ```bash
  cd plugins/specmanager/server && npm install && npm run build
  cd ../ui && npm install && npm run build
  ```
  before committing source changes.

## 1. Sanity-check the build

```bash
PLUGIN_DIR=~/Documents/projects/specmanager
cd "$PLUGIN_DIR/plugins/specmanager/server"
npm run selftest          # Phase 1 core flow
npm run selftest-board    # Phase 2 — boots board, hits REST + WS, checks file-change → event
npm run smoke-mcp         # MCP handshake + 17 tools registered (Phase 1: 16, +open_board)
```

Each must end with an `ok` line. If `selftest-board` fails, the UI install will not work.

## 2. Push, install, restart

If you changed plugin code:

```bash
cd "$PLUGIN_DIR"
git add -A
git commit -m "phase 2: board server + UI"
git push
```

Then in Claude Code in your scratch repo:

```
/plugin marketplace update specmanager
/plugin uninstall specmanager
/plugin install specmanager@specmanager
```

**Quit Claude Code and kill the daemon** so the new MCP server boots fresh:

```bash
pkill -f '^claude$'
claude daemon stop
cd "$SCRATCH"            # your scratch dir from Phase 1
claude
```

You should see in your shell (stderr from the MCP process):

```
specmanager: board server up at http://127.0.0.1:4317
```

If you see `failed to bind 127.0.0.1:4317`, port 4317 is already taken — change `board_port` in the plugin's user config or `lsof -i :4317` to find the squatter.

## 3. Open the board

Inside the Claude Code session:

```
/specmanager-board
```

Claude will call the `open_board` MCP tool and your default browser opens at `http://127.0.0.1:4317`. The page should show:

- Header: **SpecManager**, count of features, last-synced timestamp.
- One row per feature, five columns: **PRD · Architecture · Plan · Build · Walkthroughs**.
- Each existing doc renders as a card with status (`draft`/`approved`) and version. Cards with `stale: true` show an orange ⚠ badge.
- Empty cells for stages with no doc — dashed border. If the gate isn't met yet, the cell says "locked / prior stage not approved".
- Build cell shows a progress bar once `tasks.json` has entries.

If you don't have features yet, run `/specmanager-feature Checkout corridor` first, then refresh.

## 4. Live updates test

Keep the browser open. In another terminal:

```bash
SCRATCH=$(cat <<<"$SCRATCH")   # or paste your scratch path
echo '
<!-- touched at '$(date)' -->
' >> "$SCRATCH/.claude/specs/features/checkout-corridor/prd/prd.md"
```

Within ~100ms the board's `Last synced` timestamp should refresh and the header should briefly show `· file.changed` (the live event pulse). No browser refresh needed.

Try also from Claude Code:

```
Use the set_status tool to flip prd-checkout-corridor-001 to approved, then back to draft.
```

Each transition broadcasts a `status.changed` event; the PRD card's status badge updates live. Reopening (`approved → draft`) should also re-flag the Architecture card as stale within the same tick.

## 5. Pass criteria (all required)

- [ ] `npm run selftest-board` exits 0.
- [ ] `npm run smoke-mcp` reports **17** tools registered (Phase 1 had 16; we added `open_board`).
- [ ] After starting Claude Code in the scratch dir, stderr shows `board server up at http://127.0.0.1:<port>`.
- [ ] Visiting `http://127.0.0.1:<port>` in a browser renders the grid for the Phase 1 features.
- [ ] `GET /api/board` returns JSON with `features[]`, each with `documents[]` and `tasks`.
- [ ] A WebSocket connection to `/ws` receives a `file.changed` event within ~150 ms of editing any file under `.claude/specs/`.
- [ ] Status transitions made via MCP tools update the board cards without a page refresh.

## 6. Troubleshooting

- **Board page shows the "build the UI" fallback HTML** — `ui/dist/` wasn't shipped in the install cache. Contributors must run `npm run build` in `plugins/specmanager/ui/` and commit `ui/dist/` before pushing.
- **`/specmanager-board` reports "board server is not running"** — the MCP process didn't manage to bind the port (often a leftover from a previous session). Restart Claude Code; the SessionStart hook recreates the cache and the MCP boot spawns a fresh server.
- **REST endpoints work but WS never connects** — confirm the URL bar shows `http://127.0.0.1:` (not `localhost:`). Some browsers handle the two differently for WebSockets; the loopback IP is the reliable form.
- **Browser opens but page is blank** — check the JS console; in dev mode the Vite proxy expects the API on `:4317`. The built bundle uses relative URLs, so it should be fine when loaded from the same origin.
