---
id: arch-multi-session-boards-auto-port-020
featureId: feat-multi-session-boards-auto-port
stage: architecture
status: approved
stale: false
title: Multi-session boards (auto-port) architecture
dependsOn:
  - prd-multi-session-boards-auto-port-032
basedOn:
  prd-multi-session-boards-auto-port-032: 2
generatedBy: agent
version: 1
createdAt: '2026-07-06T10:22:16.202Z'
updatedAt: '2026-07-10T11:00:37.655Z'
---
## Summary

Make each `claude`/MCP session bring up its **own** board without port collisions. Today `startBoardServer` (`server/src/board-server.ts`) does a single `app.listen({ port, host })` on the fixed `SPECMANAGER_BOARD_PORT` (default `4317`) and returns `null` on `EADDRINUSE`, so a second concurrent session never gets a board. This feature turns that one bind into **preferred-port → sequential fallback → ephemeral(`0`)**, surfaces the **actual** bound port on every URL path, and re-scopes the currently-global `board.pid` **per project** so one session's reap backstop can never SIGTERM a peer session's live board. It is a localized change to the bind path (`board-server.ts`), the pidfile module (`core/pidfile.ts`), and the two URL-surfacing tools in `mcp.ts` — no new dependencies, no change to the single-user / `127.0.0.1`-only / no-auth posture. Grounded in PRD `prd-multi-session-boards-auto-port-032` (v2). Non-goals recorded there (shared single-board-serves-N, cross-restart port registry/lockfile, redefining `board_port` beyond "preferred") stay out of scope.

## Affected components

| Path | Change |
| --- | --- |
| `server/src/board-server.ts` | Replace the single `app.listen` (lines 315–331) with a preferred-then-fallback bind loop; derive `url`/`port` (lines 382–388) from the **actually bound** port via `app.server.address()`; pass project `root` to reap/write pidfile calls. |
| `server/src/core/pidfile.ts` | Scope the pidfile **per project**: `pidFilePath(root)` returns `board-<hash>.pid`; thread `root` through `writePidFile`/`removePidFile`/`reapStalePid`. Behaviour otherwise unchanged (best-effort, SIGTERM-by-PID). |
| `server/src/mcp.ts` | `board_url` / `open_board` (lines 517–548) must not fabricate `http://127.0.0.1:${BOARD_PORT}` when `board === null`; report `available:false` with a null URL instead. Boot path (line 606) already passes `port: BOARD_PORT` as the *preferred* — no signature change needed there. |
| `server/src/core/index.ts` | No change — already `export * from "./pidfile.js"`; new/renamed signatures re-export automatically. |
| `server/src/selftest-pidfile.ts` | Update assertions: filename is now `board-<hash>.pid`, and calls take a `root`. |
| `server/src/selftest-autoport.ts` (new) | New hand-rolled selftest for the fallback bind + per-project pidfile isolation (see `testing`). |
| `server/package.json` | Add `"selftest-autoport": "node dist/selftest-autoport.js"` alongside the existing `selftest-*` scripts. |

No UI (`ui/`) change: the board URL is never rendered in CLAUDE.md (`renderBlock`/`core/claude-md.ts` prints commands, not the URL — confirmed), and the UI discovers its own origin from the browser. `docs/DESIGN.md` untouched (no design doc for this feature; backend-only).

## R1 — Preferred-then-fallback port bind

The single point of change. `startBoardServer` keeps `port` as the **preferred** starting point (from `opts.port ?? SPECMANAGER_BOARD_PORT ?? 4317`) and binds via a new internal helper instead of one `app.listen`:

- **Attempt order:** preferred `P` → `P+1, P+2, … P+N` (bounded sequential scan) → ephemeral `{ port: 0 }` (OS-assigned) as the guaranteed last resort.
- **Mechanism:** attempt `await app.listen({ port: candidate, host: "127.0.0.1" })`; on the caught error, if `err.code === "EADDRINUSE"` (or `"EACCES"`) advance to the next candidate; rethrow any other error. Retrying `listen()` on the **same** Fastify instance after `EADDRINUSE` is supported — Fastify's own `test/listen.5.test.js` does exactly this (verified via Context7 `/fastify/fastify`). This attempt-and-catch avoids a probe-then-bind TOCTOU race (no separate `net.createServer` pre-check).
- **Scan bound `N`:** small and predictable so two–three concurrent boards land on adjacent, memorable ports (e.g. `4317`→`4318`→`4319`). Recommended `N = 20`. Beyond `N`, ephemeral guarantees liveness.
- **Actual port read-back:** after a successful `listen`, the bound port is `(app.server.address() as AddressInfo).port` — this is the real port even for the ephemeral `0` case. `url` (line 382) and the returned `BoardServer.port` must use this value, **not** the requested `port`.
- **Reap runs against the preferred port only** (see `R3`) before the loop, so a lone session tends to reclaim and re-land on `4317`.

Resolves PRD Open Question 2 (fallback strategy): sequential-then-ephemeral, `N≈20`.

## R2 — Surface the real bound port on every path

Every URL-surfacing path must report the port the server **actually** bound, never an assumed one.

- `BoardServer.url` / `BoardServer.port` — already derived from the bind; under `R1` they now derive from `app.server.address()` so they stay correct when fallback moved the port. This is the load-bearing fix that makes `open_board` and `board_url` (which read `board.url`) automatically correct.
- `mcp.ts` `board_url` (line 519): change the `board_url` `??` fallback (today it yields `http://127.0.0.1:${BOARD_PORT}`) to **not** present a fabricated port when `board === null`. Return `{ url: board?.url ?? null, available: board !== null }`. Optionally include `preferredPort: BOARD_PORT` for diagnostics.
- `mcp.ts` `open_board` (line 532–534): when `board === null`, drop the fabricated `http://127.0.0.1:${BOARD_PORT}` from the message; return `fail("board server is not running — restart the Claude Code session")`. When `board` is non-null it already opens `board.url` (the real port) — unchanged.

Confirms PRD constraint "URL surfacing mostly already correct; the one hardcoded reference is the `??` fallback". PRD Open Question 3 (discoverability after the port floats) is answered as designed: `board_url`/`open_board`/`/specmanager-board` always report the current session's real port; no cross-session registry in v1.

## R3 — Per-project pidfile scoping (safe reap under concurrency)

The primary technical risk from the PRD. Today `pidFilePath()` (`core/pidfile.ts:12`) returns a **single global** `${CLAUDE_PLUGIN_DATA}/board.pid`, and `reapStalePid` (`:79`) `void port`s and SIGTERMs whatever PID it names. With two live sessions this reaps a **peer** session's live board and clobbers its pidfile. Fix: **scope the pidfile per project.**

- `pidFilePath(root?: string)` derives the filename from a short stable hash of the resolved project root: `board-<sha1(root).slice(0,8)>.pid`, under `${CLAUDE_PLUGIN_DATA}` (or `os.tmpdir()` fallback, unchanged). `root` defaults to `projectRoot()`.
- `writePidFile(root?)`, `removePidFile(root?)`, `reapStalePid(port, root?)` thread `root` to `pidFilePath(root)`. `board-server.ts` passes its `root` (`opts.root ?? projectRoot()`).
- **Effect:** project A and project B write **different** pidfiles. Session B's `reapStalePid` reads only project B's file — never sees A's PID — so it can never SIGTERM A. B fails to bind the preferred `4317` (A holds it, `EADDRINUSE`), and `R1` falls it forward. A stays alive. This is exactly the PRD happy path.
- **Reap still does its job:** a project's own kill-`9`'d predecessor leaves that project's pidfile pointing at a dead PID → `isProcessAlive` false → no-op; the freed preferred port is reclaimed on the next bind. A `/mcp` reconnect in the *same* project reads the same per-project file, SIGTERMs the mid-teardown predecessor, and re-lands on `4317` — the "reconnects /mcp" JTBD.
- **Kept minimal** (per "be simple"): the pidfile still stores only the PID. `reapStalePid` may keep `void port` (SIGTERM is by PID); the `port` arg stays for caller symmetry and a possible future per-port scheme.

Resolves PRD Open Question 4 (pidfile scoping): per-project, keyed by hashed root.

**Residual, flagged:** two `claude` sessions in the *same* project share one per-project pidfile, so the second still SIGTERM-takes-over the first (existing single-board-per-project semantics, unchanged). PRD only requires not killing a **peer** (different-project) board; same-project takeover is out of scope but noted in Open questions.

## R4 — Graceful degradation (all near ports taken)

Boot with the preferred port held must **never** leave `board === null` while any free port exists.

- After the bounded scan, the final attempt is `app.listen({ port: 0, host: "127.0.0.1" })` — the OS grants any free port; `app.server.address().port` reports it. `board` is non-null and `board_url.available === true` on whatever port the OS gave.
- `board` becomes `null` (and `main()` logs, non-fatal, line 611–613) **only** if even the ephemeral bind throws — a catastrophic host condition, not "port in use". The MCP server keeps serving tools without the UI, exactly as today.
- `startBoardServer` never throws for a taken port; it either returns a live `BoardServer` (common) or, on non-`EADDRINUSE` fatal errors, `null` (unchanged contract). `mcp.ts main()`'s existing try/catch stays.

## Data model changes

None persisted in `.claude/specs/`. The only on-disk artifact touched is the transient pidfile under `${CLAUDE_PLUGIN_DATA}`:

| Before | After |
| --- | --- |
| `${CLAUDE_PLUGIN_DATA}/board.pid` (global, one file) | `${CLAUDE_PLUGIN_DATA}/board-<hash8>.pid` (one per project root) |
| Contents: `<pid>` | Contents: `<pid>` (unchanged) |

Migration: none needed — an old global `board.pid` is simply ignored (no reader looks for it after this change) and reaped/orphaned harmlessly; the file is transient and rewritten every boot. No manifest or frontmatter impact (pidfile is not a spec artifact).

## Interfaces

Signatures in the project's TS-strict ESM style. Changed exports (`core/pidfile.ts`, re-exported by `core/index.ts`):

```ts
export function pidFilePath(root?: string): string;            // board-<hash8>.pid
export function writePidFile(root?: string): Promise<void>;
export function removePidFile(root?: string): Promise<void>;
export function reapStalePid(port: number, root?: string): Promise<void>;
```

New internal helper in `board-server.ts` (not exported):

```ts
// Bind preferred → preferred+1..+N → ephemeral(0). Returns the actual bound port.
// Throws only if even the ephemeral bind fails.
async function bindWithFallback(
  app: FastifyInstance,
  host: string,
  preferred: number,
  scanBound: number,          // recommended 20
): Promise<number>;
```

`BoardServer` (unchanged shape; `port`/`url` now reflect the actual bound port):

```ts
export interface BoardServer { url: string; port: number; stop: () => Promise<void>; }
```

`mcp.ts` tool result shape change (`board_url`): `{ url: string | null; available: boolean; preferredPort?: number }`.

## Sequence / flow

Two concurrent sessions, distinct projects (PRD happy path):

1. Session A boots (`mcp.ts main()` → `startBoardServer({ root: A, port: 4317 })`).
2. `reapStalePid(4317, A)` reads `board-<hashA>.pid` → none/dead → no-op.
3. `bindWithFallback(app, "127.0.0.1", 4317, 20)` → `listen(4317)` succeeds → bound `4317`.
4. `writePidFile(A)` records A's PID in `board-<hashA>.pid`. A's board at `http://127.0.0.1:4317`.
5. Session B boots (`root: B, port: 4317`).
6. `reapStalePid(4317, B)` reads `board-<hashB>.pid` → none → no-op (never touches A's file).
7. `bindWithFallback` → `listen(4317)` throws `EADDRINUSE` (A holds it) → `listen(4318)` succeeds → bound `4318`.
8. `writePidFile(B)` records B's PID in `board-<hashB>.pid`. B's board at `http://127.0.0.1:4318`.
9. `open_board` in each session opens that session's own `board.url`. A untouched.

## Failure & edge cases

| Case | Handling |
| --- | --- |
| Preferred port held by a peer session | `EADDRINUSE` caught → fall forward (`R1`). Peer's pidfile untouched (`R3`). |
| Preferred port held by an unrelated non-SpecManager process | Same fall-forward; reap no-op (its PID isn't in this project's pidfile). |
| All `P..P+N` taken | Ephemeral `listen(0)` → OS-assigned port (`R4`). |
| Even ephemeral bind fails | `startBoardServer` returns `null`; `main()` logs non-fatal; MCP tools keep working; `board_url.available === false`, `url: null` (`R2`,`R4`). |
| Reading the real port | `app.server.address()` as `AddressInfo` after a resolved `listen`; correct for `0` too. |
| Fastify `listen` retry after `EADDRINUSE` | Supported on the same instance (Context7 `/fastify/fastify`, `test/listen.5.test.js`). If a future Fastify major regressed this, fallback design = construct per-attempt or probe-with `net` first (flagged in Open questions). |
| Own kill-`9`'d predecessor | Per-project pidfile names a dead PID → reap no-op → freed preferred port reclaimed. |
| `/mcp` reconnect, same project | Per-project pidfile names mid-teardown predecessor → SIGTERM takeover → re-land on preferred (`R3`). |
| `${CLAUDE_PLUGIN_DATA}` unset | `pidFilePath` falls back to `os.tmpdir()`, still per-project hashed (unchanged fallback semantics). |
| `writePidFile` best-effort failure | Swallowed as today; only weakens the reap backstop, never blocks boot. |
| Two sessions, same project | Shared per-project pidfile → second takes over first (existing semantics; flagged). |

## Conventions used

- **TS strict + ESM** (`"type": "module"`, Node 20+); server ships compiled `dist/` — rebuild (`npm run build`) before committing.
- **Bind stays on `127.0.0.1`** — auto-port never widens exposure (PRD constraint).
- **No new dependencies** — `node:crypto` (hash) and `node:net`/`AddressInfo` are builtins; still Fastify `listen` + Node.
- **Best-effort pidfile teardown** — write/remove swallow errors (`core/pidfile.ts` convention preserved).
- **Latest APIs** — Fastify `listen` options object, `app.server.address()` (per Context7 `/fastify/fastify`).
- **`writePidFile` only after a successful bind** — `board.pid` never names a non-owner (`board-server.ts:333–335` invariant preserved, now per-project).
- **Hand-rolled selftests run by name** (`node dist/<name>.js`), not a test runner — matches `selftest-pidfile`, `selftest-shutdown`, `selftest-board`.
- **Non-fatal board failure** — `main()`'s try/catch keeps MCP alive without the UI (unchanged).

## testing

- **Update `selftest-pidfile.ts`:** the two `pidFilePath()` assertions now expect `board-<hash8>.pid` (not `board.pid`), and calls pass a `root`. Add an assertion that two distinct roots yield **distinct** pidfile paths and that `reapStalePid(port, rootB)` does **not** touch `rootA`'s file / PID (the core safety property).
- **New `selftest-autoport.ts`** (model on `selftest-shutdown.ts`, which already has `portIsFree(port)` and spawns `dist/mcp.js` on a non-default `SPECMANAGER_BOARD_PORT`): (1) occupy the preferred port with a `net` server, boot one MCP child, assert its board bound `preferred+1` and that `board_url` reports that real port with `available:true`; (2) boot two children on the same preferred port in two temp project dirs and assert **two distinct** bound ports and **both alive** (no cross-kill); (3) tear down and assert both ports freed. Register as `npm run selftest-autoport`.
- **Regression:** `selftest-shutdown` / `selftest-roundtrip` must still pass — a lone session on a free preferred port lands exactly on it (scan never advances).

## Open questions / risks

1. **`board_port` semantics — preferred vs exact (PRD OQ1).** Resolved for v1 as "preferred, falls forward." A pinned/exact opt-out (fail if taken, for reverse-proxy/bookmark) is deferred; if requested, add a `board_port_exact` user_config flag that skips the fallback loop. Planner: confirm no pinning requirement for v1.
2. **Scan bound `N`.** Design recommends `N = 20`. Confirm the value (and whether it should be user-configurable — leaning no, keep it a constant).
3. **Same-project concurrent sessions still take over (from `R3`).** Two `claude` sessions in the *same* project share one per-project pidfile, so the newer SIGTERM-reaps the older's live board. PRD only forbids killing a **peer** project's board, which is satisfied. Decide whether same-project should instead also fall-forward (would require per-port or owner-identity pidfiles, not just per-project) — deferred unless the takeover is observed as harmful.
4. **Fastify `listen` retry robustness.** Verified current Fastify supports re-`listen` after `EADDRINUSE` (Context7 `/fastify/fastify` `test/listen.5.test.js`). Low risk; if a future major regresses it, switch `bindWithFallback` to probe-free-port-with-`net`-then-single-`listen` (accepting a small TOCTOU window) — noted so the planner keeps the helper's internals swappable.
5. **Discoverability after the port floats (PRD OQ3).** Deferred: no cross-session registry/lockfile in v1. In-session `/specmanager-board` (→ `open_board`) always opens the current session's real port. A port registry/lockfile is the recorded follow-up.
6. **Shared-board alternative (PRD OQ5).** Recorded, explicitly out of v1 scope: one board serving N projects (project switcher UI + multi-root data) is the larger future fork; auto-port is the localized wedge that preserves "one board = one project."
