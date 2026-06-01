---
id: arch-reinstall-refactor-005
featureId: feat-reinstall-refactor
stage: architecture
status: approved
stale: false
title: Reinstall refactor architecture
dependsOn:
  - prd-reinstall-refactor-006
basedOn:
  prd-reinstall-refactor-006: 1
generatedBy: human
version: 2
createdAt: '2026-06-01T09:57:08.387Z'
updatedAt: '2026-06-01T10:05:40.335Z'
---
## Summary

The SpecManager MCP process boots the kanban board server **in-process** (`startBoardServer` in `mcp.ts:485`), so port 4317 is held by the MCP node process itself. Today teardown only traps `SIGINT`/`SIGTERM` (`mcp.ts:506-507`); when the parent `claude` exits or a reinstall happens it commonly just closes the stdio pipe without delivering `SIGTERM`, orphaning the child and leaving 4317 held. This feature makes the MCP process **self-terminate when its parent goes away** (add `SIGHUP` + a stdin-EOF watch, behind an idempotent shutdown guard) and adds a **PID-file reap backstop** for the one untrappable case (`kill -9`), executed in `board-server.ts` just before `app.listen`. No architectural pillars change: the board stays in-process, binding stays `127.0.0.1`-only, port stays 4317.

## Affected components

**Edit —** **`plugins/specmanager/server/src/mcp.ts`**

- Replace the single `shutdown` (lines 502-507) with an idempotent version guarded by a `shuttingDown` flag.

- Wire `SIGHUP` alongside `SIGINT`/`SIGTERM`.

- After `server.connect(transport)` in `main()`, attach `end`/`close` listeners on `process.stdin` that invoke `shutdown`.

**Edit —** **`plugins/specmanager/server/src/board-server.ts`**

- In `startBoardServer`, immediately before `app.listen` (line 309), call the reap helper to clear a stale predecessor still holding the port.

- After a successful bind (after line 310), write the current `process.pid` to the PID file.

- In the returned `stop()` (lines 366-373), remove the PID file as the last step.

**New —** **`plugins/specmanager/server/src/core/pidfile.ts`** (new small helper module, alongside `paths.ts`)

- Resolves the PID-file path, performs the liveness probe + reap, and writes/removes the file. Kept in `core/` next to `paths.ts` because it is pure path/process plumbing with no Fastify dependency; this matches the repo's "one shared core" layout. Re-exported from `core/index.ts` like the other path helpers.

**Edit —** **`plugins/specmanager/server/src/smoke-mcp.ts`** (or a new `selftest-shutdown.ts` `node dist/*.js` script, matching the existing `selftest-*` convention in `server/package.json`)

- Add an assertion path that spawns `dist/mcp.js`, closes its stdin, and asserts the child exits and 4317 frees. See Verification.

## Data model changes

None. No schemas, frontmatter, or `tasks.json` shapes change. The only new persistent artifact is an ephemeral runtime file:

- **`${CLAUDE_PLUGIN_DATA}/board.pid`** — a plain-text file containing a single integer: the PID of the process that currently owns port 4317. It is not a spec document, is not tracked by the manifest, and is safe to delete (a missing file simply means "no known predecessor"). It lives in `${CLAUDE_PLUGIN_DATA}` (the same persistent-deps location the `SessionStart` hook uses in `hooks/hooks.json`), not under `.claude/specs/`, so it never pollutes the spec tree or git.

## Interfaces

New module `core/pidfile.ts`, mirroring the `paths.ts` function style (env-resolved, defaulted args):

```ts
// Resolve ${CLAUDE_PLUGIN_DATA}/board.pid. Falls back to os.tmpdir() when the
// env var is unset (e.g. selftests run outside a plugin install).
export function pidFilePath(): string;

// Best-effort reap of a predecessor on `port`. Reads pidFilePath(); if it holds
// a live PID, SIGTERM it, wait ~200ms, return. Never throws — all errors swallowed.
export async function reapStalePid(port: number): Promise<void>;

// Write process.pid to pidFilePath() (called only after a successful bind).
export async function writePidFile(): Promise<void>;

// Remove pidFilePath() (called on clean stop). Ignores ENOENT.
export async function removePidFile(): Promise<void>;
```

Liveness probe: `process.kill(pid, 0)` — sends no signal, throws `ESRCH` if the PID is dead, succeeds (or throws `EPERM`) if alive. Treat success **and** `EPERM` as "alive" (EPERM means the process exists but we lack permission — still worth a `SIGTERM` attempt). Treat `ESRCH` / unparsable / missing file as "no live predecessor → proceed".

Changed shutdown shape in `mcp.ts` (no new exported signature; internal):

```ts
let shuttingDown = false;
const shutdown = async (): Promise<void> => {
  if (shuttingDown) return;     // idempotency guard
  shuttingDown = true;
  if (board) await board.stop().catch(() => undefined);  // stop() now also removes the pid file
  process.exit(0);
};
```

No MCP tool surface changes — `board_url` / `open_board` are untouched.

## Sequence / flow

**Boot (`startBoardServer`):**

1. Build Fastify app + register routes (unchanged).
1. `await reapStalePid(port)` — read `board.pid`; if a live PID is recorded, `SIGTERM` it and wait \~200ms. (Covers a `kill -9`'d predecessor that never ran its handler.)
1. `await app.listen({ port, host: "127.0.0.1" })` — single attempt, matching the PRD's "single attempt after the wait" decision.

   - On success: `await writePidFile()` records this process as the new owner, then wire WS + watcher, return the `BoardServer`.

   - On failure (port still held): keep current behaviour — log to stderr and `return null` (board-server.ts:311-315). MCP stays usable without the UI.

**Normal exit / reinstall (the common path the PRD targets):**

1. `claude` exits and closes the child's stdin pipe (and/or sends `SIGHUP`/`SIGTERM`).
1. stdin emits `end`/`close` → `shutdown()` runs (guard ensures once).
1. `board.stop()` closes ws/watcher/fastify (frees 4317) and removes `board.pid`.
1. `process.exit(0)`. Next `claude` start finds no live PID, binds cleanly — at most a `/mcp reconnect`.

**Hard kill (`kill -9`):** no handler runs; `board.pid` is left behind pointing at a now-dead PID, port may linger briefly. Next boot's `reapStalePid` finds the recorded PID, `SIGTERM`s it (no-op if already gone), waits, then binds and rewrites `board.pid`.

**Duplicate signals (e.g.** **`SIGTERM`** **+ stdin EOF):** both call `shutdown`; the `shuttingDown` guard makes `board.stop()` and `process.exit` run exactly once — no double-close, no error noise.

## Failure & edge cases

- **stdin watch must not steal transport data.** Verified against the installed `@modelcontextprotocol/sdk` stdio transport (`server/stdio.js`): `StdioServerTransport.start()` attaches only `data` and `error` listeners on `process.stdin` and relies on flowing mode. `end`/`close` are end-of-stream lifecycle events, not data delivery — adding listeners for them is purely additive and does not consume or compete for the bytes the transport reads. Attach the `end`/`close` listeners **after** `server.connect(transport)` so the transport is already the established `data` consumer.

- **Reap doesn't free the port** (predecessor ignores `SIGTERM`, or 200ms is too short): `app.listen` throws → existing `return null` fallback. No regression vs today; the user sees the current "board server is not running" state rather than a crash.

- **Stale PID recycled to an unrelated program.** `process.kill(pid, 0)` cannot distinguish a recycled PID, so `reapStalePid` could `SIGTERM` an innocent process whose PID matches the recorded one. Accepted for single-user local mode per the PRD open question: the blast radius is one `SIGTERM` to whatever inherited that PID, and PID reuse within the short window between a `kill -9` and the next boot is rare on a single-user machine. Noted as a residual risk rather than guarded (recording more than the bare PID is deferred — see Open questions).

- **`${CLAUDE_PLUGIN_DATA}`** **unset** (selftests, dev runs outside an install): `pidFilePath()` falls back to `os.tmpdir()` so the helper never throws and the reap simply operates on a tmp-scoped file.

- **PID file write race on concurrent boots:** single-user local mode means at most one intended owner; last writer wins, which is correct because the reap runs before each bind. No locking needed.

- **`board.pid`** **write fails** (permissions/disk): swallow the error and continue — the file is a best-effort backstop, never a correctness dependency. Worst case the next boot has no predecessor hint and behaves like today.

## Conventions used

- **Env-resolved paths, never cwd** — `pidfile.ts` resolves `${CLAUDE_PLUGIN_DATA}` from `process.env`, matching `paths.ts` (`projectRoot` reads env) and the path-resolution pillar.

- **Core stays Fastify-free** — the helper is pure `node:fs`/`node:process`, re-exported from `core/index.js` like the existing path helpers.

- **ESM +** **`node:`** **import specifiers**, `node >=20`, TypeScript strict — consistent with `mcp.ts` / `board-server.ts` / `paths.ts`.

- **Best-effort teardown swallows errors** — mirrors the existing `board.stop().catch(() => undefined)` and the board's `return null`-on-bind-failure style; no defensive over-engineering.

- **`node dist/*.js`** **selftests** — verification follows the `selftest-*` / `smoke-mcp` pattern already in `server/package.json`, not a new test framework.

- **In-process board,** **`127.0.0.1`-only, port 4317 (override** **`SPECMANAGER_BOARD_PORT`)** — all preserved unchanged.

## Verification (acceptance, mirrors the PRD)

All run against a **rebuilt** **`dist/`** **and reinstalled plugin** (`npm run build` in `server/`, reinstall), per the PRD build constraint.

1. **Normal exit frees the port.** Start a `claude` session, confirm the board is up, exit normally → `lsof -nP -iTCP:4317 -sTCP:LISTEN` returns empty and no `specmanager` node process remains.
1. **stdin EOF self-terminates.** `smoke-mcp`-style: spawn `dist/mcp.js`, complete the handshake, `child.stdin.end()` → assert the child process exits and 4317 frees, without sending any signal.
1. **Rebind after** **`kill -9`.** Boot, `kill -9` the MCP pid (leaving `board.pid` behind), boot again → second process reaps the stale PID and binds 4317 successfully.
1. **Idempotent teardown under duplicate signals.** Fire `SIGTERM` and close stdin together → assert exactly one `board.stop()` and a clean single exit (no double-close errors on stderr).
1. **`SIGHUP`** **behaves like** **`SIGINT`/`SIGTERM`.** Send `SIGHUP` → clean shutdown, port freed.
1. **PID file lifecycle.** `board.pid` exists only after a successful bind, contains the live owner's PID, and is removed on clean stop.

## Open questions / risks

- **Recycled-PID guard (deferred).** The PRD open question asks whether to record more than the bare PID (e.g. a start-time or a magic token) so `reapStalePid` can refuse to `SIGTERM` a recycled PID. This design accepts the bare-PID risk for single-user local mode; if a stronger guard is wanted, the file format would carry `"<pid> <createdAtMs>"` and the reap would cross-check process start time where cheaply available. Flag for the planner to confirm scope.

- **Wait-then-bind retry.** Locked to a single `app.listen` attempt after the 200ms wait (PRD's stated assumption). If field testing shows 200ms is too short for the predecessor to release the socket, revisit with a short bounded retry (2–3 attempts, \~100ms apart) — but that is a follow-up, not this design.

- **Failed-reap diagnostic.** The PRD flags whether to surface a clear "port 4317 still held by PID N" message now that the manual ritual is gone. Low-cost to add to the existing `return null` log line in `board-server.ts:313`; recommend including the offending PID in that stderr message. Planner to decide whether to fold it in.

  Answer: yes.

- **stdin EOF reliability across** **`claude`** **versions.** The whole self-terminate path assumes `claude` closes the child's stdin on exit. Verified true for the SDK transport's view of stdin, but if a future `claude` keeps the pipe open on some exit paths, `SIGHUP` + the PID-file reap remain as the backstops. No action now; noted for awareness.
