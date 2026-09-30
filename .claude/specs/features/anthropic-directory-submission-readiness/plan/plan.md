---
id: plan-anthropic-directory-submission-readiness-020
featureId: feat-anthropic-directory-submission-readiness
stage: plan
status: approved
stale: true
title: Anthropic directory submission readiness plan
dependsOn:
  - arch-anthropic-directory-submission-readiness-026
basedOn:
  arch-anthropic-directory-submission-readiness-026: 3
generatedBy: agent
version: 2
createdAt: '2026-09-30T10:33:43.230Z'
updatedAt: '2026-09-30T11:28:06.617Z'
---
## Overview

Implements Architecture `arch-anthropic-directory-submission-readiness-026` (v3) for PRD `prd-anthropic-directory-submission-readiness-040` (v3): make `plugins/specmanager/` pass the directory's Validate and scan, mostly by deleting machinery, with the owner decisions OD-1 (chat removed), OD-2 (Stop hook byte-identical, hold A3) and OD-3 (React chunks accepted, hold A4) already settled. The plugin stays at `plugins/specmanager/`; first directory version is `1.0.0`.

**One phase.** There is no point mid-build where the owner should stop and verify a partial result: the folder is either submittable or it is not, and the only real checkpoint is the owner's portal and Cowork work, which comes after the build (see [Owner steps after the build](#owner-steps-after-the-build)). The conformance selftest is the ladder inside the phase: written first, red on `main`, green by the end.

**Scale:** `1` trivial · `2` small · `3` moderate · `5` substantial · `8` large · `13`/`21` epic.

*Every task below is decomposed to **≤3 points**. Two items were split for granularity only (the conformance selftest, and the agent-chat removal across server and UI); the phase subtotal is unchanged by the splits.*

| Phase | Theme | Points |
|---|---|---|
| conformance | Directory-conformant plugin folder, verified locally | 27 |
| **Total** | | **27** |

---

## Phase conformance — Directory-conformant plugin folder, verified locally

**Exit test:** from the repo root:

```bash
cd plugins/specmanager/server && npm run build && for s in selftest-directory selftest selftest-board selftest-phases selftest-build selftest-tiers selftest-stopgate selftest-roundtrip selftest-pidfile selftest-shutdown selftest-autoport selftest-repos selftest-specslice selftest-prompts smoke-mcp; do npm run -s "$s" || exit 1; done
```

*(All 15 scripts exit 0. `selftest-directory` is red by design until task 1.10 lands; the other 14 are green on `main` today — baseline re-run while planning — and must stay green after every task. `claude plugin validate plugins/specmanager` is checked in tasks 1.4, 1.9 and 1.13 rather than in the gate command.)*

Rules for every task: rebuild and commit `server/dist` when `server/src` or `server/tsconfig.json` changes, and `ui/dist` when `ui/src` or `ui/vite.config.ts` changes (the committed `dist/` is what ships); `hooks/stop-gate.sh` must show an empty `git diff` throughout (OD-2); nothing under `server/src/core/**`, `mcp.ts`, `commands/`, `agents/` or `.claude-plugin/marketplace.json` is touched.

| # | Task | Pts | Notes |
|---|---|---|---|
| 1.1 | Add `selftest-directory` with the file-tree assertions | 3 | New `server/src/selftest-directory.ts` per Architecture R8: header and `PLUGIN_ROOT` as in `selftest-stopgate.ts`, local `check(cond, msg)` that counts and exits 1 at the end, enumeration via `git ls-files -z --cached --others --exclude-standard` keeping files that exist on disk. Assertions 1, 2, 3, 4, 8, 10. Register the `selftest-directory` script in `server/package.json`; build; commit `dist`. Verify: it runs to the end and exits 1 on this tree, each message naming a file (README missing, `ui/dist/assets/index-*.js` over 256 KiB, `.map` files). |
| 1.2 | Add the manifest, command and package assertions to `selftest-directory` | 3 | Assertions 5, 6, 7, 9 (R8 table). Verify: still exits 1, now also naming the missing `version`, the `SessionStart` command, `NODE_PATH`, and the missing root `package.json` / lockfile; the full failure list matches evidence E12's "red on `main`". Depends on 1.1. |
| 1.3 | Move runtime dependencies to a plugin-root `package.json` + `package-lock.json` | 3 | Per R4 / Q6: root file with runtime deps only, no `version`, `scripts` or `devDependencies`; root lockfile generated from a copy of `server/package-lock.json` with `npm install --package-lock-only --ignore-scripts` so versions do not drift. `server/package.json` drops `dependencies`; regenerate its lockfile. **Keep `@anthropic-ai/claude-agent-sdk` in the root file for now** — `board-server.ts` still imports it; task 1.8 drops it. Verify: `npm ci --ignore-scripts` at the plugin root, `npm ci && npm run build` in `server/`, `git diff` of `server/dist` empty, 14 existing scripts pass with `NODE_PATH` unset; assertion 9 green. Depends on 1.2. |
| 1.4 | Reduce `.mcp.json` env to the board port and `hooks.json` to `Stop` only | 1 | Per R3 / Q3 / Q4: delete `NODE_PATH` and `SPECMANAGER_PROJECT_DIR`; delete the `SessionStart` and `FileChanged` groups; `Stop` command string unchanged. Verify: `claude plugin validate plugins/specmanager`, `smoke-mcp`, `selftest-stopgate`; assertions 6 and 7 green. Depends on 1.3 (imports must already resolve from the root `node_modules`). |
| 1.5 | Turn off server source maps and delete the tracked `.map` files | 1 | `server/tsconfig.json` `sourceMap: false`; rebuild; remove every `server/dist/**/*.map` (43 on `main`, plus the ones tasks 1.1–1.2 emitted). Verify: no `.map` in `git ls-files`, no `sourceMappingURL` in `server/dist`, 14 scripts pass; the `.map` part of assertion 10 green. Depends on 1.2. |
| 1.6 | Build the UI unminified, one chunk per npm package | 2 | Add the Q5 block to `ui/vite.config.ts` `build` (`server.proxy` and `outDir` untouched); `npm ci && npm run build` in `ui/`; commit `ui/dist` (15 → about 100 files). Verify: `tsc` clean, largest non-font file under 256 KiB (expected `react-dom` about 195 KB), `selftest-board` passes, and a headless-Chrome DOM dump of the running board shows the kanban (repeat of E9); assertion 2 green. |
| 1.7 | Remove agent chat from the UI | 3 | Per Architecture "Agent chat removal": delete `ui/src/ChatPanel.tsx`; remove the Chat toggle and column from `DocPanel.tsx`, `MarkdownEditor.tsx`, `MarkdownToolbar.tsx`; `fetchChatStatus` / `openChatSocket` from `api.ts`; the `chat.*` events and `ChatStatus` from `types.ts`; the chat rules from `styles.css`; the `ChatPanel.tsx` line in `docs/DESIGN.md`. Rebuild and commit `ui/dist`. UI goes first so the board never calls a route the server no longer has. Verify: `tsc` clean, no `chat` match left in `ui/src`, `selftest-board` passes, headless DOM dump still shows the kanban. Depends on 1.6. |
| 1.8 | Remove agent chat from the server and drop the agent SDK dependency | 2 | Delete `server/src/agent-chat.ts` and `server/dist/agent-chat.js`; in `board-server.ts` remove the import, the `ClientChat*` types, `handleClientMessage` with its websocket wiring, and `GET /api/chat/status`. Remove `@anthropic-ai/claude-agent-sdk` from the root `package.json`; regenerate the root lockfile the same way as 1.3. Rebuild and commit `server/dist`. Verify: no `chat` or `claude-agent-sdk` match in `server/src` or the root package files, root `npm ci --ignore-scripts` succeeds, 14 scripts pass, assertion 9 still green. Depends on 1.3, 1.7. |
| 1.9 | Set `version` 1.0.0 and the new `board_port` description in `plugin.json` | 1 | Per R7: `"version": "1.0.0"`; description text exactly as R7 gives it; `default: 4317` stays; `marketplace.json` not changed (Q9). Verify: `claude plugin validate plugins/specmanager` prints validation passed with no `version` warning; assertion 5 green. |
| 1.10 | Write the plugin-folder README | 2 | New `plugins/specmanager/README.md` per R1 and R2: what it does, install, the `/specmanager:*` commands, surfaces per PRD D3 with the plain "Chat is unsupported" sentence and why, the "What this plugin does on your machine" section (one bullet per R2 AC, each matching its source of truth, including "makes no model or API calls of its own"), Requirements (Node 20+, npm on `PATH`), Troubleshooting (manual `npm ci --ignore-scripts` recovery from Q1; optional deletion of the stale data-dir `node_modules` from R9). No images. Verify: assertion 1 green and `selftest-directory` exits 0 for the first time. Depends on 1.4, 1.8 (it describes the final hooks and the no-API-calls state). |
| 1.11 | Write `docs/directory-submission.md`, the owner's submission checklist | 2 | Per R10 and PRD R10, in the PRD's step order: connect GitHub; Source (repo `joanseg/specmanager`, branch `main`, Plugin path `plugins/specmanager`); Validate / Re-validate; Listing details; Data handling with the suggested answers tied to R2; Compliance; Submit; Publish. Also: eligibility preconditions, accepted holds A1–A4 with the files each names, the release rule (bump `version` every release, or marketplace users get no update), the pre-push `selftest-directory` step, the exec-form fallback for the hook command (R3), and the owner-run surface tests of R11 with the four Cowork observations and the two portal unknowns. No credentials, no automation. Depends on 1.9. |
| 1.12 | Update contributor and install text in root `README.md`, `CLAUDE.md` and `.gitignore` | 2 | Per R9 AC3 / R7 AC5 / R8 AC10. `README.md`: correct line 68 (the `SessionStart` sentence) and the contributor build steps (`npm ci` at the plugin root, then `npm ci && npm run build` in `server/` and `ui/`). `CLAUDE.md`, **outside the managed markers only**: Layout bullets for `.mcp.json` and `hooks/`, the "Persistent deps via `${CLAUDE_PLUGIN_DATA}`" convention, the agent SDK in the "Latest APIs" line, build commands, the selftest block (14 → 15, adding `selftest-directory` as the pre-push check), and the release rule. `.gitignore`: the contributor comment; also add `**/.claude/settings.local.json`, so the protection does not depend on a contributor's global git config. Verify: `selftest-prompts` passes; no `SessionStart`, `NODE_PATH` or `FileChanged` claim left in the three files. Depends on 1.4, 1.8. |
| 1.13 | Run the local surface tests and record the results | 2 | (a) the exit test above, all 15 green; (b) `claude plugin validate plugins/specmanager` (PRD R11 AC1); (c) end-user state: copy the shipped files (`git ls-files`) to a clean directory outside the repo, `npm ci --ignore-scripts` there with a fresh cache, then `smoke-mcp`, `selftest-board` and `selftest-stopgate` from that copy with no `server/node_modules` (repeat of E3 / E7) — record install time, download size and `node_modules` size against the 60 s limit; (d) tracked file count against the projected 228. Record every result on the task record so the walkthrough carries it (PRD R11 AC4). No source change expected; a failure here is fixed in the task that owns it. Depends on 1.5, 1.10, 1.11, 1.12. |

---

## Owner steps after the build

These are **not build tasks** — only the owner can do them, and the builder cannot verify them on this machine. They are written into `docs/directory-submission.md` by task 1.11 so nothing is lost when the phase closes:

1. **`claude --plugin-dir plugins/specmanager` session** (PRD R11 AC2): MCP tools register, board opens, one `/specmanager:*` command runs, and a document is opened and edited in the board. The last step covers the Milkdown editor on the unminified build, which E9 did not click-test and which the builder has no browser tooling to click through.
2. **Cowork zip upload** (PRD R11 AC3), recording the four observations of Architecture R11: was `node_modules` installed (Q7); does the MCP server start; does the project root resolve without `SPECMANAGER_PROJECT_DIR` (Q3); does the board port arrive. If the install does not run, PRD D3's Cowork claim becomes an owner decision — it is not to be designed around.
3. **Developer portal** (PRD R10): connect GitHub, Source, Validate, Listing details, Data handling, Compliance, Submit, Publish. At Validate, confirm the holds are exactly A1–A4, whether `.mcp.json` `env` draws a finding (Q3), and whether the quoted hook path is accepted (R3 fallback: exec form).
4. **Add the results of 1–3 to the feature walkthrough** (PRD R11 AC4).
5. PRD R9 AC1 / AC2 (fresh GitHub-marketplace install, update of an existing install to 1.0.0) can only be observed once the commit is on `main`; check them at the same time.

## Risk & sequencing notes

- **Order differs from the Architecture's "Suggested build order" in one place:** chat removal (1.7, 1.8) runs before manifest, README and docs, so the README's "no API calls" statement and the final dependency list are written once, against the final tree.
- **The SDK leaves in 1.8, not 1.3.** `board-server.ts` imports `agent-chat.ts` statically, so dropping the dependency before the source would break every server start. 1.3 moves all twelve runtime dependencies as they are.
- **1.4 must follow 1.3.** Removing `NODE_PATH` before the root `node_modules` exists breaks module resolution.
- **`selftest-directory` is red from 1.1 to 1.10 by design.** Assertions go green in this order: 9 (1.3), 6 and 7 (1.4), 10 (1.5), 2 (1.6), 5 (1.9), 1 (1.10). Because the phase test command includes it, a session Stop before 1.10 is refused by the Stop-gate, and three such Stops mark the phase `blocked`. That is the gate working; finish the phase in one build run where possible.
- **`ui/dist` is committed twice** (1.6, then 1.7). File names are deterministic across rebuilds (E8), so the second diff is limited to the app chunk and the CSS.
- **Rollback:** every task is one revertible commit. The only one that changes a contributor's local state is 1.3 (`server/node_modules` becomes dev-only; the root gets its own `node_modules`); reverting it needs an `npm install` in `server/`.
- **This session's installed plugin is not affected** by the build: it runs from the plugin cache, not from the working tree.
- **Carried from the Architecture, no code guard planned:** install timeout or missing npm (README troubleshooting only); lockfile out of step (assertion 9); version not bumped (process rule); a dependency chunk growing past 256 KiB (assertion 2, targeted split when it happens); a host that does not substitute `.mcp.json` env values (board port would be `NaN`); the `"npm "` / `"uv "` / `"cargo "` match literals in `stop-gate.sh`.

## Test strategy

- Repo convention: hand-rolled `selftest-*` scripts compiled to `dist/`, run by name from `plugins/specmanager/server`; no test runner. This feature adds exactly one, `selftest-directory`, written first (1.1, 1.2) and proven red on `main` before any fix lands (PRD R8 AC8).
- No other new test. Chat has no selftest reference, so its removal is verified by `tsc`, `selftest-board`, `smoke-mcp` and a grep for leftovers.
- After every task: the 14 existing scripts pass. After 1.10: `selftest-directory` passes too.
- `claude plugin validate plugins/specmanager` after each config or manifest change (1.4, 1.9) and at the end (1.13).
- UI changes (1.6, 1.7) are checked by `tsc`, the size assertion, `selftest-board` and a headless-Chrome DOM dump of the board. Interactive behaviour (opening and editing a document) is an owner step.
- The end-user state (clean copy, root `npm ci --ignore-scripts`, no dev dependencies) is exercised once, in 1.13.

## Out of scope

- The Cowork upload, the `--plugin-dir` interactive session and everything in the developer portal (owner steps above).
- Any change to `hooks/stop-gate.sh` or its two Node shims (OD-2); option S2 is not built.
- Replacing React's pre-minified production build (OD-3).
- Bundling server dependencies into `dist`, npm workspaces, or a lazy SDK import (all rejected in the Architecture).
- A `version` in `marketplace.json` (Q9); any cleanup hook for the stale data-dir `node_modules` (R9).
- Removing the five unused CodeMirror packages from `ui/package.json`; making `selftest-prompts` runnable from an installed copy (Architecture observations, no action).
- Any change to `core/`, MCP tools, commands or agents; PRD non-goals (repo move, Chat support, connector listing, portal automation, the Verified label).
- An aggregate "run all selftests" npm script.

## Open questions

- **Verified, no action beyond 1.12:** `plugins/specmanager/server/.claude/settings.local.json` exists locally, is ignored only by this machine's global gitignore (`~/.config/git/ignore`), is not tracked and does not ship.
- **`docs/DESIGN.md` line 88 sits inside the managed `specmanager:design` markers.** Task 1.7 removes the line by hand as the Architecture asks; the block is regenerated from `ui/src` on `feature.shipped`, which yields the same result once `ChatPanel.tsx` is gone.
- **`CLAUDE.md` "Latest APIs" line** names `@anthropic-ai/claude-agent-sdk`. The Architecture's R9 list does not mention it; 1.12 removes it as part of the same edit.
- **`CLAUDE.md` has uncommitted changes in its managed block** on `main`'s working tree; 1.12 edits only text outside the markers.
- Carried unknowns, closed by the owner steps: whether a Cowork upload runs the native install and exports `CLAUDE_PROJECT_DIR`; whether the validator inspects `.mcp.json` `env` or objects to the quoted hook path; whether opening and editing a document works on the unminified build.

## Notes on estimates

Points are relative complexity, not hours; recalibrate after the first phase if the early tasks run consistently over or under. Most of this work is deletion and configuration, so the weight sits in the three 3-point tasks: the two selftest halves (assertion 6 is the fiddly one) and the UI chat removal (seven files). Every task is ≤3; the selftest and the chat removal were split for granularity only, so the 27-point subtotal is what the unsplit work would have scored. Docs (1.10–1.12) and verification (1.13) are their own tasks rather than riders on code tasks, so "installable and testable" is checked as a real gate at the end.
