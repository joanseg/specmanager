---
id: plan-multi-session-boards-auto-port-015
featureId: feat-multi-session-boards-auto-port
stage: plan
status: approved
stale: false
title: Multi-session boards (auto-port) plan
dependsOn:
  - arch-multi-session-boards-auto-port-020
basedOn:
  arch-multi-session-boards-auto-port-020: 1
generatedBy: agent
version: 1
createdAt: '2026-07-10T11:05:27.880Z'
updatedAt: '2026-07-10T11:06:13.423Z'
---
## Overview

Turn the board server's single fixed-port bind into **preferred-port → sequential fallback → ephemeral(`0`)**, surface the **actual** bound port on every URL path, and re-scope the currently-global `board.pid` **per project** so one session's reap backstop can never SIGTERM a peer session's live board. Grounded in arch `arch-multi-session-boards-auto-port-020` (R1–R4) and PRD `prd-multi-session-boards-auto-port-032`. It is a localized change to `board-server.ts` (bind path), `core/pidfile.ts` (per-project scoping), and the two URL-surfacing tools in `mcp.ts` — no new deps, no change to the single-user / `127.0.0.1`-only / no-auth posture. **Single phase:** per-project pidfile scoping and the bind fallback have no independently demoable mid-build increment — the user-visible win (two concurrent boards on distinct ports) only exists once both land, so there is no meaningful stop-and-verify point partway.

**Scale:** `1` trivial · `2` small · `3` moderate · `5` substantial · `8` large · `13`/`21` epic.

*Every task below is decomposed to **≤3 points**. The work is genuinely small and localized, so no item needed splitting; the single phase's subtotal is unchanged.*

| Phase | Theme | Points |
| --- | --- | --- |
| autoport | Preferred-port fallback + per-project pidfile | 16 |
| **Total** | | **16** |

---

## Phase autoport — Preferred-port fallback + per-project pidfile

**Exit test:** From repo root, `cd plugins/specmanager/server && npm run build && npm run selftest-autoport && npm run selftest-pidfile && npm run selftest-shutdown && npm run selftest-roundtrip` — all green. `selftest-autoport` proves: a child whose preferred port is occupied binds `preferred+1` and `board_url` reports that real port with `available:true`; two children in two temp project dirs on the same preferred port get **two distinct** bound ports and **both stay alive** (no cross-kill); ports freed on teardown. *(Manual confirm: two `claude` sessions in two different projects each open their own board on distinct ports.)*

| # | Task | Pts | Notes |
| --- | --- | --- | --- |
| 1.1 | Per-project pidfile scoping in `core/pidfile.ts` | 2 | Add optional `root?` to `pidFilePath`/`writePidFile`/`removePidFile`/`reapStalePid`; filename becomes `board-<sha1(root).slice(0,8)>.pid` via `node:crypto`, still under `${CLAUDE_PLUGIN_DATA}` ?? `os.tmpdir()`. `root` defaults to `projectRoot()`. Behaviour otherwise unchanged (best-effort, SIGTERM-by-PID; `reapStalePid` keeps `void port`). Re-exported automatically by `core/index.ts` (no edit there). (R3) |
| 1.2 | `bindWithFallback` helper in `board-server.ts` | 3 | New non-exported `async bindWithFallback(app, host, preferred, scanBound)`. Attempt `preferred` → `+1..+N` → ephemeral `{port:0}`; on caught `err.code === "EADDRINUSE" \|\| "EACCES"` advance, rethrow anything else. `N = 20` fixed internal constant (not user-config). Read the real port back via `(app.server.address() as AddressInfo).port` (correct for `0` too). Throws only if even the ephemeral bind fails. Re-`listen` on the same Fastify instance after `EADDRINUSE` is supported (arch-verified). (R1) |
| 1.3 | Wire `startBoardServer` to `bindWithFallback` + thread `root` | 2 | Replace the single `app.listen` (`:316–331`) with `const boundPort = await bindWithFallback(app, "127.0.0.1", port, 20)`. Thread `opts.root ?? projectRoot()` into `reapStalePid(port, root)` (`:315`), the catch-block diagnostic `pidFilePath(root)`/`readFileSync` (`:323` — drift: arch table omits this call, but it must take `root`), `writePidFile(root)` (`:335`), and `removePidFile(root)` in `stop` (`:393`). Derive `url`/returned `port` (`:382–385`) from `boundPort`, not the requested `port`. (R1, R2, R3, R4) |
| 1.4 | Fix `board_url`/`open_board` null handling in `mcp.ts` | 1 | `board_url` (`:517–522`): return `{ url: board?.url ?? null, available: board !== null, preferredPort: BOARD_PORT }` — never fabricate `http://127.0.0.1:${BOARD_PORT}`. `open_board` (`:531–534`): when `board === null`, drop the fabricated URL and `fail("board server is not running — restart the Claude Code session")`; non-null path (opens `board.url`) unchanged. (R2) |
| 1.5 | Update `selftest-pidfile.ts` for per-project scoping | 2 | The two `pidFilePath()` assertions now expect `board-<hash8>.pid` (not `board.pid`) and pass a `root`; round-trip/reap assertions pass a `root`. Add assertions: two distinct roots yield **distinct** pidfile paths, and `reapStalePid(port, rootB)` does **not** touch `rootA`'s file/PID (the core safety property). (R3, testing) |
| 1.6 | New `selftest-autoport.ts` | 3 | Model on `selftest-shutdown.ts` (reuse its `portIsFree(port)` + spawn-`dist/mcp.js`-on-non-default-`SPECMANAGER_BOARD_PORT` pattern). (1) Occupy preferred with a `net` server, boot one MCP child, assert board bound `preferred+1` and `board_url` reports that real port with `available:true`. (2) Boot two children on the same preferred in two temp project dirs → assert two **distinct** bound ports and **both alive** (no cross-kill). (3) Tear down, assert both ports freed. Cleanup in a `finally`; never orphan children. (R1, R3, R4, testing) |
| 1.7 | Register `selftest-autoport` npm script | 1 | Add `"selftest-autoport": "node dist/selftest-autoport.js"` to `server/package.json` alongside the existing `selftest-*` scripts. (testing) |
| 1.8 | Rebuild `dist/` + run full regression | 2 | `npm run build` (server ships compiled `dist/`). Run `selftest-autoport`, `selftest-pidfile`, `selftest-shutdown`, `selftest-roundtrip`, and `smoke-mcp` — all green. Confirms no regression to the lone-session case (free preferred port → scan never advances → lands exactly on it). |

---

## Risk & sequencing notes

- **1.1 lands first** — the per-project pidfile is the primary safety fix (a global pidfile lets session B reap session A's live board). 1.3 threads its new `root` arg through the bind path, so 1.3 depends on 1.1; 1.5 tests it.
- **1.2 → 1.3** — the helper is written and unit-shaped before it's wired into `startBoardServer`. 1.2 is independent of the pidfile work and can proceed in parallel with 1.1.
- **1.6 depends on 1.3 + 1.4** — the autoport selftest exercises real fallback binding (1.3) and the corrected `board_url` shape (1.4).
- **1.8 is the gate** — `dist/` is what ships; rebuild before any commit, then the full selftest sweep. Rollback is clean: every change is localized to three source files + two selftests + one package.json line; reverting restores the single-bind behaviour with no data migration (the transient pidfile is rewritten every boot; an orphaned old global `board.pid` is harmlessly ignored).
- **Fastify re-`listen` after `EADDRINUSE`** is the one external assumption (arch-verified against Fastify's own `test/listen.5.test.js`). If a future Fastify major regresses it, swap `bindWithFallback`'s internals to probe-free-with-`net`-then-single-`listen` — the helper is deliberately self-contained so this is a local change.

## Test strategy

Per the repo's hand-rolled selftest convention (`node dist/<name>.js`, run by name — not a test runner):
- **1.5** updates `selftest-pidfile` in lockstep with the 1.1 signature/filename change and adds the cross-project no-reap safety assertion.
- **1.6** adds `selftest-autoport` covering the fallback bind, the real-port surfacing, and two-session isolation — the feature's success metrics.
- **1.8** keeps `selftest-shutdown` and `selftest-roundtrip` green as regression (a lone session on a free preferred port must still land exactly on it), plus `smoke-mcp` for the MCP wire protocol.

## Out of scope

- **`board_port_exact` / pinned-port opt-out** — resolved: v1 is "preferred, falls forward" only. No fail-hard-if-taken mode, no new user_config.
- **User-configurable scan bound** — `N = 20` is a fixed internal constant in `bindWithFallback`, not user-config.
- **Same-project concurrent sessions** — two `claude` sessions in the *same* project still share one per-project pidfile, so the newer SIGTERM-takes-over the older (existing single-board-per-project semantics). PRD only forbids killing a **peer** project's board; that is satisfied. Deferred unless observed harmful.
- **Cross-session port registry / lockfile** for re-finding a floated port — deferred; in-session `/specmanager-board` always opens the current session's real port.
- **Shared single-board-serves-N-projects** — the larger future fork; auto-port is the localized wedge.
- **UI changes** — none; the board URL is never rendered in CLAUDE.md (`renderBlock` prints commands, not the URL) and the UI discovers its own origin from the browser.

## Notes on estimates

Points are relative complexity, not clock time — calibrate against each other once the first task lands. Everything here is ≤3 by nature, not by splitting: the change touches three source files, two selftests, and one package.json line, so no task was large enough to break down. `bindWithFallback` (1.2) and the new `selftest-autoport` (1.6) are the two 3-pointers — the only genuinely new logic; the rest is signature threading (1.1, 1.3), a null-handling fix (1.4), and a selftest update (1.5). Testing and the rebuild are their own tasks (1.5–1.8) so "installable & testable" — the committed `dist/` builds and every selftest passes — stays a real exit gate rather than an assumption.
