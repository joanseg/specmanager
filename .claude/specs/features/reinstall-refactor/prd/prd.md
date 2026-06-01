---
id: prd-reinstall-refactor-006
featureId: feat-reinstall-refactor
stage: prd
status: approved
stale: false
title: Reinstall refactor — orphaned board-server process & port 4317 cleanup PRD
dependsOn: []
basedOn: {}
generatedBy: agent
version: 1
createdAt: '2026-06-01T09:48:16.656Z'
updatedAt: '2026-06-01T09:53:13.489Z'
---
## Problem

Every plugin reinstall — and frequently a plain `claude` exit — leaves the SpecManager MCP server process orphaned. Because the board server runs **in-process** inside the MCP server, that orphaned process keeps holding TCP port 4317. The next `claude` session then can't bind 4317 cleanly, surfacing as a "board server is not running" state or a stale UI.

Today the user must perform a manual cleanup ritual on nearly every reinstall:

```
pkill -f '^claude$'
claude daemon stop
ps aux | grep specmanager | grep -v grep   # kill stragglers
lsof -nP -iTCP:4317 -sTCP:LISTEN
```

…followed by `/mcp reconnect`. Eliminating this ritual is the goal of this feature.

### Root cause (already proven this session — background, not to be re-investigated)

- The board server runs **in-process** inside the MCP server. `main()` in `plugins/specmanager/server/src/mcp.ts` calls `startBoardServer(...)` (mcp.ts:485), which does `app.listen({ port: 4317, host: "127.0.0.1" })` (board-server.ts:310). So **port 4317 is held by the MCP node process itself** — killing that process frees the port.
- **The defect:** teardown only handles `SIGINT` and `SIGTERM` (mcp.ts:502-507). There is no handling for the parent `claude` process going away. When `claude` exits — especially on a hard kill or reinstall — it closes the stdin pipe to the MCP child but does not reliably `SIGTERM` it. With no `SIGHUP` handler and nothing watching stdin for EOF, the MCP child is orphaned and keeps holding 4317. That orphan is the "straggler" the user kills by hand and the process `lsof :4317` keeps finding.
- **Secondary issue:** if 4317 is already taken at boot, `app.listen` throws and `startBoardServer` returns `null` (board-server.ts:311-315) — no UI, no attempt to reap a stale owner.
- **`/mcp reconnect` is genuinely client-side.** Claude Code holds the old MCP connection; no plugin API can force the client to reconnect. So eliminating it is out of scope — but it should become *unnecessary in the common case* (fresh `claude` start / restart) once teardown is fixed.

## Users

- **Primary: the single local SpecManager user (developer running `claude` in the target project).** Job-to-be-done: reinstall or restart the plugin and have the board come back up, without hand-rolling a `pkill`/`ps`/`kill`/`lsof` sequence to free port 4317.
- **Secondary: maintainers iterating on the plugin** who reinstall frequently during development and hit the orphan/port-conflict loop on every cycle.

## Goals / non-goals

### Goals

1. **The MCP process terminates itself when its parent `claude` goes away, releasing port 4317.** Concretely:
   - Handle `SIGHUP`.
   - Watch stdin for `end`/`close` (EOF = the client closed the MCP pipe) and shut down cleanly: stop the board server, then exit.
   - Make the shutdown handler **idempotent** — guard against multiple signals (e.g. `SIGTERM` + stdin EOF) firing at once so teardown runs exactly once.
2. **A boot-time backstop for the one case EOF cannot catch — `kill -9`** (cannot be trapped). Before binding:
   - Read a PID file from `${CLAUDE_PLUGIN_DATA}`.
   - If the recorded PID is still alive, `SIGTERM` it, wait briefly (~200ms), then bind.
   - Write the PID file **after** a successful bind.
   - This auto-clears a port held by a `-9`'d predecessor.
3. **A normal reinstall-and-restart flow requires at most `/mcp reconnect` (or just restarting `claude`) — never the kill sequence.**

### Non-goals

- **Do not** make `/mcp reconnect` automatic or eliminate it — it is client-side with no plugin hook.
- **Do not** move the board server out-of-process or otherwise change the in-process architecture pillar ("One MCP process boots the board server").
- **Do not** change the bound port (4317) or the `127.0.0.1`-only binding.

## Success metrics

- **Zero manual kill rituals** for a normal reinstall/restart: the user never needs `pkill`/`ps`/`kill`/`lsof` to recover the board.
- **No orphaned process after a normal `claude` exit:** no `specmanager` node process remains; `lsof -iTCP:4317` is empty.
- **Successful self-heal after an untrappable kill:** after `kill -9` of the MCP process, the next boot binds 4317 by reaping the stale PID — no manual intervention.

## Constraints & assumptions

- **In-process board server stays** (architecture pillar). Freeing the port means terminating the MCP process, not detaching the server.
- **Binding stays `127.0.0.1`-only**; port stays 4317. No auth (single-user local mode).
- **Resolve the PID-file location from `${CLAUDE_PLUGIN_DATA}`** (and project root from `${CLAUDE_PROJECT_DIR}`), never from cwd — consistent with the persistent-deps and path-resolution pillars.
- **Build/reinstall constraint:** these are TypeScript sources under `plugins/specmanager/server/src/`. Changes only take effect after rebuilding `dist/` and reinstalling the plugin. Acceptance testing must run against a rebuilt, reinstalled plugin — not the source tree.
- **`kill -9` is untrappable** by design; the PID-file reap is the only mechanism that covers it, and it is best-effort (the ~200ms wait is a heuristic, not a guarantee).
- **Assumption:** the parent `claude` closes the MCP child's stdin pipe on exit in the common cases (normal exit, reinstall). The stdin-EOF watch relies on this; `SIGHUP` and the PID-file reap cover cases where it does not.

## High-level user flows

- **Normal `claude` exit / restart:** `claude` exits → child stdin hits EOF (and/or `SIGHUP`/`SIGTERM`) → idempotent shutdown stops the board server and exits → 4317 freed. Next start binds cleanly; at most a `/mcp reconnect`.
- **Reinstall:** old MCP child receives stdin EOF / signal → shuts down → 4317 freed → new MCP child boots, finds no live PID owner, binds 4317, writes its PID.
- **Hard kill (`kill -9`) of the MCP process:** no handler runs, port may linger → next boot reads the PID file, finds the recorded PID still alive (stale), `SIGTERM`s it, waits ~200ms, binds 4317, rewrites the PID file.
- **Duplicate signals (`SIGTERM` + stdin EOF together):** shutdown handler runs once (idempotency guard); no double-stop, no error noise.

## Acceptance criteria

- After `claude` exits **normally**, no `specmanager` node process remains and `lsof -iTCP:4317` returns empty.
- After a **`kill -9`** of the MCP process followed by a fresh boot, the new process successfully binds 4317, having reaped the stale PID recorded in `${CLAUDE_PLUGIN_DATA}`.
- The **shutdown handler is safe under duplicate signals** — firing `SIGTERM` and stdin EOF (or two signals) results in exactly one teardown, board server stopped once, clean exit.
- `SIGHUP` triggers the same clean shutdown as `SIGINT`/`SIGTERM`.
- The PID file is written **only after** a successful bind, and reflects the current owner of 4317.
- All of the above verified against a **rebuilt `dist/` and reinstalled plugin**, not the source tree.

## Open questions

- **PID liveness check semantics:** use `process.kill(pid, 0)` for the liveness probe? Confirm the intended signal/method and how to treat the edge case where the PID has been recycled to an unrelated process (reaping the wrong PID). May warrant a guard (e.g. record more than the bare PID), or may be accepted as out-of-scope for single-user local mode.
- **Wait-then-bind retry:** after `SIGTERM`-ing the stale owner and waiting ~200ms, should the bind retry on first failure (a couple of attempts) or fail fast and surface the existing "board server is not running" state? (Assumption for the draft: single attempt after the wait, matching current simplicity bias.)
- **Should a failed reap surface a clear diagnostic** to the user (e.g. "port 4317 still held by PID N"), given there is no longer a manual ritual documented? Out of scope to design, but flag for the architect.
