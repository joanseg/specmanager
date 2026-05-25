---
description: Open the SpecManager kanban board in your default browser.
---

Open the SpecManager kanban board.

## Steps

1. Call **`open_board`**. It launches the user's default browser at the localhost URL where the board server is listening (e.g. `http://127.0.0.1:4317`).
2. If `open_board` reports the server is not running, suggest the user restart their Claude Code session — the MCP process boots the board server on startup. Report the URL anyway so the user can open it manually.

## Don't

- Don't try to start a separate process or use `Bash` to launch the browser. The MCP tool handles platform-specific opening (`open` on macOS, `xdg-open` on Linux, `start` on Windows).
