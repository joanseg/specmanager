---
id: prd-multi-session-boards-auto-port-032
featureId: feat-multi-session-boards-auto-port
stage: prd
status: approved
stale: false
title: Multi-session boards (auto-port) PRD
dependsOn: []
basedOn: {}
generatedBy: human
version: 2
createdAt: '2026-07-06T10:12:38.145Z'
updatedAt: '2026-07-06T10:15:21.350Z'
---
## Problem

SpecManager can run only **one** kanban board at a time. The board server binds a single **fixed** port — `SPECMANAGER_BOARD_PORT` (`user_config.board_port`, default `4317`) — and `mcp.ts` boots it in-process at session start via `startBoardServer({ port: BOARD_PORT })`.

`startBoardServer` (board-server.ts) does a **single** `app.listen({ port, host: "127.0.0.1" })`. On `EADDRINUSE` it logs and returns `null`; `mcp.ts` catches that as non-fatal and leaves `board = null`. When a user runs a **second** **`claude`** **session in a different project**, that session's MCP process tries to bind the same `4317`, fails, and its board never comes up. There is no per-session port allocation, so N concurrent sessions cannot have N boards.

Downstream symptom: with `board === null`, `open_board` returns `board server is not running on http://127.0.0.1:4317 — restart the Claude Code session`, and `board_url` reports `available: false`. Observed live in this session after an MCP reconnect.

## Users & jobs-to-be-done

Single developer using SpecManager (single-user, localhost, no-auth model).

| User                                                                                 | Job                                                                                                |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Dev with **multiple projects open**                                                  | Run `claude` in project A and project B concurrently and have **each** open its own working board. |
| Dev who **reconnects** **`/mcp`** or restarts a session while another holds the port | Get a board without a "port in use / not running" dead end.                                        |

Today both jobs fail: only the first session to bind `4317` gets a board.

## Goals / non-goals

**Goals (v1 — auto-port wedge)**

- Each specmanager session opens **its own** board; two projects → two boards on two ports, no collision, no manual config.

- The board server binds an **available** port instead of hard-failing on a taken one.

- Every path that surfaces the board URL reports the **actual bound port**, never an assumed one.

- A taken `board_port` degrades gracefully — the MCP boot does not crash and the board still comes up (on another port).

**Non-goals (v1)**

- **Shared single-board-serves-N-projects** design — the explicit architectural alternative to auto-port. Deferred; see Open Questions.

- **Cross-restart port discovery / a port registry / lockfile** so a user can re-find a board opened earlier once its port floats. Deferred.

- Redefining the semantics of `board_port` config beyond "preferred starting point" (see Open Questions).

- Any change to the single-user / localhost-only / `127.0.0.1` / no-auth posture. Auto-port stays bound to `127.0.0.1`; nothing here widens exposure.

## Success metrics

- Two concurrent `claude` sessions in different projects each return a **running** board (`board_url.available === true`) on **distinct** ports. (Today: exactly one does.)

- `open_board` in the second session **opens a browser** (`opened: true`) rather than returning the "not running" error, in the common case where only `4317` is taken.

- Boot with `4317` already held **never** leaves `board === null` when any free port exists.

- Zero regressions to the single-session case: a lone session still lands on the configured `board_port`.

## Constraints & assumptions

- **Bind is the single point of change.** `startBoardServer` currently attempts one `listen`; v1 turns that into preferred-port-then-fallback.

- **URL surfacing mostly already correct.** `board.url`/`board.port` are derived from the port the server actually bound, so `open_board` and `board_url` already reflect the real port _when_ _`board`_ _is non-null_. The one hardcoded reference is the `?? http://127.0.0.1:${BOARD_PORT}` fallback used when `board === null`; it must not present a fabricated port as if a board were there.

- **CLAUDE.md does not surface the URL.** `renderBlock` (core/claude-md.ts) prints commands, not the board URL — so the managed CLAUDE.md block is **not** a URL-surfacing path today and needs no change. Assumption to confirm: no other writer emits a hardcoded `4317` URL.

- **Global pidfile is the sharp edge.** The pidfile is a **single global** `${CLAUDE_PLUGIN_DATA}/board.pid`, not scoped per project or port. On boot, `reapStalePid` reads it and **SIGTERMs whatever PID it names** — and it ignores the port (`void port`). Under auto-port with two live sessions, session B's boot would reap session A's **live** board (killing project A's board) and A's pidfile write would clobber B's. v1 must not let the reap backstop cross sessions. This is the primary technical risk to resolve in Architecture.

- **Port range assumption:** at least one free port exists near `board_port`; if all candidates are taken, an ephemeral (OS-assigned, port `0`) bind is the last resort.

- No new dependencies; stays Fastify `listen` + Node.

## High-level user flows

**Two projects, two boards (happy path)**

- Session A (`claude` in project A) boots → binds preferred `4317` → board at `http://127.0.0.1:4317`.

- Session B (`claude` in project B) boots → `4317` taken → falls forward to next free port (e.g. `4318`) → board at `http://127.0.0.1:4318`.

- `open_board` in each session opens that session's own URL.

**Configured port taken, single session**

- `board_port` (`4317`) is held by an unrelated process → board binds the next free port instead of returning `null` → `board_url`/`open_board` report the real port.

**All near ports taken**

- Fall back to an ephemeral OS-assigned port (`listen` on `0`) → board still comes up on whatever the OS grants; the actual port is surfaced.

## Open questions

1. **`board_port`** **semantics — "preferred" vs "exact"?** v1 treats it as a preferred starting point that falls forward. Should a user who genuinely wants a _pinned_ port (e.g. reverse-proxy / bookmark) get an opt-out ("exact, fail if taken")? Default answer: preferred; revisit if pinning is requested.
1. **Fallback strategy — sequential scan vs ephemeral?** Prefer `board_port`, then next-free (scan `+1, +2, …` up to a small bound), then ephemeral `0`. Which — and how wide the scan — is an Architecture call. A pure ephemeral fallback is simplest but yields less predictable ports.
1. **Discoverability after the port floats.** If session B's board lands on `4318`, how does the user find it later (new terminal, forgot the port)? Deferred (no registry in v1) — but `board_url`/`open_board` always report the current session's real port, so an in-session `/specmanager-board` is the answer for now. A cross-session port registry/lockfile is the deferred follow-up. Answer: user just runs specmanager...-board command to open the right board.
1. **Global pidfile scoping.** To make the reap backstop safe under multiple sessions, the pidfile likely needs to be **per-project or per-port** (or carry owner identity) so `reapStalePid` only ever reaps _this_ project's dead predecessor, never a peer session's live board. Exact scheme is an Architecture decision; this PRD only requires that auto-port not let one session kill another's board.
1. **Shared-board alternative (deferred, recorded).** Instead of N boards on N ports, one board could serve all projects (project switcher in the UI, board reads multiple `.claude/specs/` roots). This is the real fork in the road vs auto-port. Auto-port is the v1 wedge because it is a localized change to `listen` + pidfile scoping and preserves the "one board = one project" mental model; the shared board is a larger UI + multi-root data change. Recorded as the primary future direction, explicitly out of v1 scope.
