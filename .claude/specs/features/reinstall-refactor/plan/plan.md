---
id: plan-reinstall-refactor-005
featureId: feat-reinstall-refactor
stage: plan
status: approved
stale: false
title: Reinstall refactor plan
dependsOn:
  - arch-reinstall-refactor-005
basedOn:
  arch-reinstall-refactor-005: 2
generatedBy: agent
version: 1
createdAt: '2026-06-01T10:06:07.288Z'
updatedAt: '2026-06-01T10:11:13.422Z'
---
## Overview

This plan eliminates the orphaned-board-server / port-4317 ritual described in the PRD by making the in-process MCP server self-terminate when its parent `claude` goes away, plus a PID-file reap backstop for the one untrappable case (`kill -9`). Per the approved Architecture, no pillars change: the board stays in-process, binding stays `127.0.0.1`-only, the port stays 4317. The work splits into three phases along clean test boundaries: a pure, isolated **PID-file helper** (Phase A) that can be exercised without touching Fastify or the MCP transport; the **board-server boot/stop integration** (Phase B) that wires reap-before-bind / write-after-bind / remove-in-stop and surfaces the offending PID on a failed bind; and the **MCP self-termination** (Phase C) that adds the idempotent shutdown guard, `SIGHUP`, and the stdin-EOF watch. Each phase ends with a rebuilt `dist/` and a runnable `selftest-*` (or `smoke-mcp`-style) check, so the plugin is installable and demonstrably better after every phase rather than only at the end.

**Scale:** `1` trivial · `2` small · `3` moderate · `5` substantial · `8` large · `13`/`21` epic.

_Every task below is decomposed to **≤3 points**. The feature is genuinely small and surgical (three source edits plus a new helper and two selftests), so nothing needed splitting down from 5/8 — the points reflect real, self-contained units of work, and the phase subtotals are unchanged by the granularity._

| Phase | Theme | Points |
|-------|-------|--------|
| A — PID-file helper | New `core/pidfile.ts` module + isolated selftest | 6 |
| B — Board-server integration | Reap/write/remove wired into `startBoardServer` + bind diagnostic | 7 |
| C — MCP self-termination | Idempotent shutdown guard, `SIGHUP`, stdin-EOF watch + shutdown selftest | 7 |
| **Total** | | **20** |

---

## Phase A — PID-file helper

A pure `node:fs` / `node:process` helper, mirroring `core/paths.ts`, that nothing else depends on yet. Building it first means Phase B can wire ready-tested functions instead of inventing them inline.

**Exit test:** `npm run build` in `plugins/specmanager/server/`, then `node dist/selftest-pidfile.js` passes: it asserts (1) `pidFilePath()` resolves under `${CLAUDE_PLUGIN_DATA}` when set and falls back to `os.tmpdir()` when unset; (2) `reapStalePid` is a no-op when no file exists; (3) `writePidFile()` then `removePidFile()` round-trips a file containing the live PID, with `removePidFile()` swallowing ENOENT; (4) a spawned live child PID is detected alive via `process.kill(pid, 0)` and SIGTERM'd by `reapStalePid`, while a dead PID is treated as "no live predecessor".

| # | Task | Pts | Notes |
|---|------|-----|-------|
| A.1 | Create `core/pidfile.ts` with `pidFilePath()` env resolution | 1 | New module beside `core/paths.ts`. Resolve `${CLAUDE_PLUGIN_DATA}/board.pid` from `process.env`; fall back to `os.tmpdir()` when unset. Pure path resolution, no fs side effects. |
| A.2 | Add `writePidFile()` / `removePidFile()` to `core/pidfile.ts` | 1 | `writePidFile()` writes `String(process.pid)`; `removePidFile()` unlinks and ignores `ENOENT`. Best-effort: swallow write errors per the "best-effort teardown" convention. |
| A.3 | Add liveness probe + `reapStalePid(port)` to `core/pidfile.ts` | 2 | Read the file; parse the PID; `process.kill(pid, 0)` — treat success **and** `EPERM` as alive, `ESRCH`/unparsable/missing as "no predecessor". If alive, `SIGTERM` it and `await` ~200ms. Never throws. |
| A.4 | Re-export `pidfile` from `core/index.ts` | 1 | Add `export * from "./pidfile.js";` alongside the existing path-helper exports so consumers import from `core` like the other helpers. |
| A.5 | Add `selftest-pidfile.ts` + `selftest-pidfile` script | 2 | New `node dist/selftest-pidfile.js` matching the existing `selftest-*` convention; register the script in `server/package.json`. Covers path resolution, reap no-op, write/remove round-trip, and reap of a spawned live process. |

---

## Phase B — Board-server integration

Wire the Phase A helpers into `startBoardServer` so a fresh boot clears a stale predecessor and records itself as the new owner, and a clean stop removes the file. The failed-bind path keeps the existing `return null` fallback but now names the offending PID (Architecture open question — "Answer: yes").

**Exit test:** `npm run build` + reinstall the plugin. Boot a session so the board is up and `${CLAUDE_PLUGIN_DATA}/board.pid` exists and contains the live owner's PID. Then `kill -9` the process holding 4317 (leaving the stale `board.pid`), and boot again: the second process reaps the stale PID and binds 4317 successfully (`lsof -nP -iTCP:4317 -sTCP:LISTEN` shows the new owner), and a clean stop removes `board.pid`.

| # | Task | Pts | Notes |
|---|------|-----|-------|
| B.1 | Call `reapStalePid(port)` immediately before `app.listen` | 2 | In `startBoardServer` (`board-server.ts` ~line 309), `await reapStalePid(port)` before the single `app.listen({ port, host: "127.0.0.1" })` attempt. Single attempt after the ~200ms wait, per the PRD/Architecture decision. |
| B.2 | Call `writePidFile()` after a successful bind | 1 | Immediately after `app.listen` resolves (`board-server.ts` ~line 315), before wiring WS/watcher, so the file only ever reflects a real owner of 4317. |
| B.3 | Remove `board.pid` as the last step of `stop()` | 1 | In the returned `stop()` (`board-server.ts` ~lines 366-373), `await removePidFile()` after `app.close()` so a clean teardown leaves no stale file. |
| B.4 | Include the offending PID in the bind-failure log | 1 | Extend the existing `return null` stderr line (`board-server.ts` ~line 313) to name the PID still holding the port (read from the pid file), keeping the `return null` fallback unchanged otherwise. |
| B.5 | Add a board reap/rebind assertion to `selftest-board.ts` | 2 | Extend the existing board selftest: write a stale `board.pid` for a spawned-then-killed process, start the board, assert it binds and that `board.pid` now holds the new owner; assert `stop()` removes the file. Follows the `selftest-board` pattern. |

---

## Phase C — MCP self-termination

Make the MCP process exit when its parent goes away. Replace the single `shutdown` with an idempotent guarded version, add `SIGHUP`, and watch `process.stdin` for `end`/`close` — attached **after** `server.connect(transport)` so they don't interfere with the SDK's stdio transport. Because the board's `stop()` now removes the pid file (Phase B), shutdown frees 4317 and clears `board.pid` in one path.

**Exit test:** `npm run build` + reinstall. (1) Normal `claude` exit leaves no `specmanager` node process and `lsof -nP -iTCP:4317 -sTCP:LISTEN` is empty. (2) `node dist/selftest-shutdown.js` spawns `dist/mcp.js`, completes the handshake, calls `child.stdin.end()` with **no signal**, and asserts the child exits and 4317 frees. (3) Firing `SIGTERM` and stdin EOF together yields exactly one `board.stop()` and a single clean exit (no double-close errors on stderr). (4) `SIGHUP` triggers the same clean shutdown.

| # | Task | Pts | Notes |
|---|------|-----|-------|
| C.1 | Make `shutdown` idempotent with a `shuttingDown` guard | 2 | Replace `shutdown` (`mcp.ts` lines 502-505) with the guarded form from the Architecture: early-return if `shuttingDown`, else set it, `await board.stop().catch(() => undefined)` (now also removes `board.pid`), `process.exit(0)`. |
| C.2 | Register `SIGHUP` alongside `SIGINT`/`SIGTERM` | 1 | Add `process.on("SIGHUP", shutdown)` next to the existing `SIGINT`/`SIGTERM` registrations (`mcp.ts` line 507). |
| C.3 | Attach stdin `end`/`close` EOF watch after `server.connect` | 2 | In `main()`, after `await server.connect(transport)` (`mcp.ts` line 499), attach `process.stdin.on("end", shutdown)` and `on("close", shutdown)` so the EOF watch is purely additive to the established transport `data` consumer. |
| C.4 | Add `selftest-shutdown.ts` + `selftest-shutdown` script | 2 | New `node dist/selftest-shutdown.js` modelled on `smoke-mcp.ts`: spawn `dist/mcp.js`, handshake, `child.stdin.end()`, assert exit + 4317 freed; plus the duplicate-signal (`SIGTERM` + EOF → single teardown) and `SIGHUP` cases. Register the script in `server/package.json`. |

---

## Risk & sequencing notes

- **Helper before integration.** Phase A must land before Phase B — B.1–B.4 import the functions A defines. B's selftest (B.5) also relies on A's `pidFilePath()` to seed/inspect the file.
- **Integration before self-termination verification.** C.1's `board.stop()` removing the pid file is only true once B.3 ships; sequence Phase C after Phase B so the self-terminate path frees the port *and* clears the file in one go. The mcp.ts edits themselves don't import board-server internals, but their exit test depends on B's stop() behaviour.
- **stdin watch ordering is load-bearing.** C.3 must attach `end`/`close` **after** `server.connect(transport)`; attaching earlier risks racing the SDK transport's `data` consumer setup. This is an ordering constraint within one task, not a separate task.
- **Rollback.** All three phases are additive and independently revertable. The riskiest single change is C.3 (stdin watch) — if a future `claude` keeps the pipe open, `SIGHUP` (C.2) and the Phase B reap remain backstops, so a partial rollback of C.3 alone degrades gracefully rather than regressing below today's behaviour.
- **`kill -9` is best-effort by design.** The ~200ms reap wait is a heuristic; a predecessor that ignores `SIGTERM` falls through to the existing `return null` path (B.4), which is no worse than today.

## Test strategy

Per the repo convention, tests are `node dist/*.js` selftests, not a new framework — each phase adds or extends one as its own task (A.5, B.5, C.4) rather than a deferred final pass, so every phase's exit test is a real gate. Phase A's `selftest-pidfile` runs in isolation (no Fastify, no install needed beyond the build). Phase B extends `selftest-board`. Phase C adds `selftest-shutdown` (a `smoke-mcp`-style spawn harness) and is the one phase whose exit test must run against a **rebuilt `dist/` and reinstalled plugin**, since it exercises real process teardown. All three new/extended scripts are registered in `server/package.json` so they run like the existing `selftest-*` entries.

## Out of scope

- **Making `/mcp reconnect` automatic or eliminating it** — it is client-side with no plugin hook (PRD non-goal). The aim is to make it *unnecessary* in the common case, not to remove it.
- **Moving the board server out-of-process** — the in-process pillar is preserved; freeing the port means terminating the MCP process, not detaching the server.
- **Changing the port or binding** — stays 4317 / `127.0.0.1`-only.
- **A recycled-PID guard** (recording start-time or a magic token alongside the bare PID) — accepted as a residual risk for single-user local mode per the Architecture; deferred, not built here.
- **A wait-then-bind retry loop** — locked to a single `app.listen` attempt after the ~200ms wait; a bounded retry is a possible follow-up, not this plan.

## Notes on estimates

Points here are **relative complexity**, not clock time — calibrate them to your own velocity after the first phase ships and you've felt how a "2" actually lands in this codebase. Every task is scoped to **≤3 points** and shippable in one sitting; this feature was genuinely small, so nothing was split down from a 5/8 — had it been, that split would be a granularity change only and would leave the phase subtotals untouched. Note that the test work is not folded into the implementation tasks: each phase carries its selftest as its own task (A.5, B.5, C.4) so "rebuild, reinstall, run the selftest" stays a real, demonstrable exit gate for the phase rather than an afterthought tacked on at the end.
