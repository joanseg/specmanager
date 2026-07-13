---
id: wt-multi-session-boards-auto-port-017
featureId: feat-multi-session-boards-auto-port
stage: walkthrough
status: draft
stale: false
title: Multi-session boards (auto-port) — Phase autoport walkthrough
dependsOn:
  - plan-multi-session-boards-auto-port-015
basedOn:
  plan-multi-session-boards-auto-port-015: 1
generatedBy: agent
version: 1
phase: autoport
createdAt: '2026-07-10T11:55:17.365Z'
updatedAt: '2026-07-10T11:55:17.365Z'
---
# Multi-session boards (auto-port) — Phase autoport walkthrough

This phase makes two `claude` sessions in **different projects** each open their own board. The board server's single fixed-port bind became **preferred-port → sequential fallback (`+1..+20`) → ephemeral(`0`)**; the **real** bound port is surfaced on `BoardServer.url`/`.port` and through the `board_url`/`open_board` MCP tools; and `core/pidfile.ts` is now scoped **per project** (`board-<sha1(root).slice(0,8)>.pid`) so one session's reap backstop can never SIGTERM a peer session's live board. It is the only phase — approving this walkthrough ships the feature.

> **Exit test:** From repo root, `cd plugins/specmanager/server && npm run build && npm run selftest-autoport && npm run selftest-pidfile && npm run selftest-shutdown && npm run selftest-roundtrip` — all green. `selftest-autoport` proves: a child whose preferred port is occupied binds `preferred+1` and `board_url` reports that real port with `available:true`; two children in two temp project dirs on the same preferred port get **two distinct** bound ports and **both stay alive** (no cross-kill); ports freed on teardown. *(Manual confirm: two `claude` sessions in two different projects each open their own board on distinct ports.)*

You should already have: the repo checked out at the commit(s) below, Node 20+, and `npm` on PATH. No new dependencies were added.

## 0. Prerequisites

- **OS/runtime:** macOS or Linux, Node ≥ 20, npm. (`127.0.0.1`-only, single-user, no-auth — unchanged.)
- **Repo/branch:** this repo (`specmanager`) at the phase's landed commits — `a1d1488` (pidfile scoping), `774d124` + `b4ddea9` (bind fallback + wiring), `46e762e` (mcp URL tools), `28158d4` (pidfile selftest), `56a9f79` (autoport selftest), `facba02` (npm script), `4e43ecd` (rebuilt `dist/`).
- **Seed data:** none. The selftests create their own throwaway temp project dirs and pidfiles; they never touch `.claude/specs/`.
- **Repo root, used below:** `/Users/joan/Documents/projects/specmanager` — export it once so the roundtrip step can reference it:
  ```bash
  REPO_ROOT=/Users/joan/Documents/projects/specmanager
  ```

## 1. Build

The server ships compiled `dist/` — rebuild it before running any selftest (they run `node dist/<name>.js`).

```bash
cd "$REPO_ROOT/plugins/specmanager/server"
npm install          # first time only
npm run build        # tsc -p tsconfig.json → dist/
```

Expect a clean `tsc` (no output, exit 0). The new/changed compiled units are `dist/board-server.js`, `dist/core/pidfile.js`, `dist/mcp.js`, `dist/selftest-pidfile.js`, `dist/selftest-autoport.js` (all present in commit `4e43ecd`).

**If the build fails, stop here** — the selftests below load `dist/`, so a stale or broken build makes every check below meaningless.

## 2. Run the exit-test sweep

Run the four selftests the exit criterion names. Each is a hand-rolled script (not a test runner) that prints `ok — …` per assertion and exits non-zero on the first failure.

```bash
cd "$REPO_ROOT/plugins/specmanager/server"
npm run selftest-autoport
npm run selftest-pidfile
npm run selftest-shutdown
CLAUDE_PROJECT_DIR="$REPO_ROOT" npm run selftest-roundtrip
```

> **IMPORTANT — `selftest-roundtrip`:** it resolves the project root as `CLAUDE_PROJECT_DIR ?? cwd` and **does not walk up**. Run from `server/` (as above), plain `npm run selftest-roundtrip` would resolve the root to `server/` and fail; you **must** pass the repo root explicitly: `CLAUDE_PROJECT_DIR="$REPO_ROOT" npm run selftest-roundtrip`.

If any of these fail, stop and read the Troubleshooting section — do not approve.

## 3. Phase autoport exit checks

Each check below maps to a claim in the exit criterion. The first two are the new behaviour; the rest are the covering selftests. You can run each in isolation.

### 3.1 Preferred port free → board lands exactly on it (no regression)

The lone-session case must be unchanged: a free preferred port means the scan never advances. `selftest-autoport` first asserts `preferred` (default `4321`) is free before it occupies it; `selftest-roundtrip`/`selftest-shutdown` boot on their own default ports and land on them. Confirm the default preferred is not already taken on your machine:

```bash
lsof -iTCP:4321 -sTCP:LISTEN    # expect: no output (port free)
```

Expected: no output. (If something is listening, `selftest-autoport`'s first assertion `preferred port 4321 is free before the test` will fail — free it first, or set `SPECMANAGER_BOARD_PORT` to another free port for that run.)

### 3.2 Preferred occupied → board falls forward to `preferred+1`, real port surfaced

This is the heart of R1/R2. `selftest-autoport` occupies `4321` with a plain `net` server, boots one MCP child asking for `4321`, then calls the `board_url` tool over stdio.

```bash
cd "$REPO_ROOT/plugins/specmanager/server"
npm run selftest-autoport
```

Expected lines (case 1 — fallback bind):
```
ok — preferred port 4321 is free before the test
ok — preferred port 4321 occupied by net server
ok — board_url reports available:true
ok — board_url echoes preferredPort 4321
ok — board fell forward to preferred+1 (4322), got 4322
ok — board is actually listening on 4322
ok — fallback port 4322 freed after exit
ok — preferred port 4321 freed after occupier closed
```
This proves `bindWithFallback` (`board-server.ts:99`) advanced past the occupied `4321`, and that `board_url` returns the **real** `4322` (read from `app.server.address()`), shaped `{ url, available: true, preferredPort: 4321 }` — never a fabricated `http://127.0.0.1:4321`.

### 3.3 Two sessions, two projects, same preferred → distinct ports, both alive (no peer-reap)

The core safety win (R3/R4). Case 2 of `selftest-autoport` boots two MCP children on the same preferred `4321` in **two distinct temp project dirs**.

Expected lines (case 2 — isolation + teardown):
```
ok — session A board_url available:true
ok — session B board_url available:true
ok — two sessions got DISTINCT bound ports (A=4321, B=4322)
ok — session A still alive after B booted (no peer-reap)
ok — session B still alive
ok — session A still listening on <portA>
ok — session B still listening on <portB>
ok — session A port <portA> freed after teardown
ok — session B port <portB> freed after teardown

All autoport assertions passed.
```
The load-bearing assertion is **`session A still alive after B booted`**: before the per-project pidfile, booting B would have read A's global `board.pid` and SIGTERM'd A's live board. Now each project writes `board-<hash8>.pid`, so B's reap backstop never sees A.

### 3.4 Per-project pidfile scoping + cross-project no-reap (unit-level)

`selftest-pidfile` exercises `core/pidfile.ts` in isolation (no Fastify, no MCP).

```bash
cd "$REPO_ROOT/plugins/specmanager/server"
npm run selftest-pidfile
```

Expected `ok —` lines include:
```
ok — pidFilePath(root) resolves under ${CLAUDE_PLUGIN_DATA} with a board-<hash8>.pid filename
ok — pidFilePath(root) falls back to os.tmpdir() when unset
ok — pidFilePath() yields distinct paths for distinct project roots
ok — reapStalePid(port, root) SIGTERM'd the live predecessor
ok — reapStalePid(port, rootB) does not kill rootA's live process
ok — reapStalePid(port, rootB) leaves rootA's pidfile untouched

All Phase A pidfile assertions passed.
```
The last two are the R3 cross-project safety property proven at the function level: reaping project B leaves project A's live process and pidfile untouched.

### 3.5 Clean-shutdown + full round-trip regression stay green

```bash
cd "$REPO_ROOT/plugins/specmanager/server"
npm run selftest-shutdown
CLAUDE_PROJECT_DIR="$REPO_ROOT" npm run selftest-roundtrip
```

Expected: both end with their all-passed banner and exit 0. These confirm the bind/pidfile rework did not regress single-session teardown (`selftest-shutdown` boots a real board on its own default port and asserts a clean stop leaves no stale pidfile) or the MCP↔core doc round-trip (`selftest-roundtrip`).

### 3.6 `open_board` refuses when the board is null (R2)

Read-only source check — `open_board` no longer fabricates a URL when the board failed to boot:

```bash
grep -n "board server is not running" "$REPO_ROOT/plugins/specmanager/server/src/mcp.ts"
```

Expected: one hit — `return fail("board server is not running — restart the Claude Code session");` (mcp.ts, `open_board` handler). The non-null path (`spawn`s the OS opener on `board.url`) is unchanged.

## 4. Pass criteria

All required.

- [ ] `npm run build` completes clean (exit 0), `dist/` rebuilt.
- [ ] `npm run selftest-autoport` — case 1 shows `board fell forward to preferred+1 (4322)` and `board_url reports available:true` with `preferredPort 4321`.
- [ ] `npm run selftest-autoport` — case 2 shows `two sessions got DISTINCT bound ports` **and** `session A still alive after B booted (no peer-reap)`, then both ports freed on teardown, ending `All autoport assertions passed.`
- [ ] `npm run selftest-pidfile` — includes `reapStalePid(port, rootB) does not kill rootA's live process` and `… leaves rootA's pidfile untouched`, ending `All Phase A pidfile assertions passed.`
- [ ] `npm run selftest-shutdown` — green, clean teardown leaves no stale pidfile.
- [ ] `CLAUDE_PROJECT_DIR="$REPO_ROOT" npm run selftest-roundtrip` — green (run with the explicit root, from `server/`).
- [ ] `grep` confirms `open_board` returns `fail("board server is not running …")` on a null board (no fabricated URL).

## 5. Deferred / Out of scope (expected, not a bug)

- **Two sessions in the SAME project still share one per-project pidfile** — the newer board SIGTERM-takes-over the older. This is existing single-board-per-project semantics; the PRD only forbids killing a **peer (different-project)** board, which is satisfied. Not a regression, not addressed here.
- **No pinned-port / fail-hard-if-taken mode** (`board_port_exact`) — v1 is "preferred, falls forward" only.
- **Scan bound `N = 20` is a fixed internal constant** in `bindWithFallback`, not user-config.
- **No cross-session port registry / lockfile** to re-find a floated port — in-session `/specmanager-board` always opens the current session's real port; a second terminal cannot rediscover it.
- **No UI change** — the board URL is never rendered in CLAUDE.md, and the UI discovers its own origin from the browser.

## 6. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `selftest-autoport` fails at `preferred port 4321 is free before the test` | Something is already listening on 4321 | `lsof -iTCP:4321 -sTCP:LISTEN` to find/stop it, or run with `SPECMANAGER_BOARD_PORT=<free port> npm run selftest-autoport`. |
| `selftest-roundtrip` fails to find specs / wrong root | Run from `server/` without `CLAUDE_PROJECT_DIR` — it resolves `CLAUDE_PROJECT_DIR ?? cwd` and does not walk up, so cwd is `server/` | Re-run as `CLAUDE_PROJECT_DIR="$REPO_ROOT" npm run selftest-roundtrip`. |
| `Cannot find module 'dist/selftest-autoport.js'` | `dist/` not rebuilt after checkout | `npm run build` first (Section 1). |
| `selftest-autoport` case 2 fails at `session A still alive after B booted` | The per-project pidfile scoping regressed — B reaped A via a shared pidfile | Verify `core/pidfile.ts` filename is `board-<hash8>.pid` (commit `a1d1488`) and that `startBoardServer` threads `root` into `reapStalePid`/`writePidFile`/`removePidFile` (commit `b4ddea9`); rebuild. |
| Selftest leaves an orphaned child/port | Interrupted mid-run (SIGINT) before the `finally` cleanup | Rare — the tests clean up temp dirs, children (SIGKILL), and the `net` occupier in a `finally`. If interrupted, `lsof` the port and kill the stray node PID manually. |

## 7. What ships next

Nothing — this is a single-phase feature. Approving this walkthrough fires `feature.shipped` and refreshes `docs/DESIGN.md`; there is no `final` roll-up. The natural follow-on forks (shared single-board-serves-N-projects; a cross-session port registry) are listed under Out of scope and are deferred future work, not part of this feature.
