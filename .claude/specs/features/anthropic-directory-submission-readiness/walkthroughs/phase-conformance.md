---
id: wt-anthropic-directory-submission-readiness-023
featureId: feat-anthropic-directory-submission-readiness
stage: walkthrough
status: approved
stale: false
title: Anthropic directory submission readiness — Phase conformance walkthrough
dependsOn:
  - plan-anthropic-directory-submission-readiness-020
basedOn:
  plan-anthropic-directory-submission-readiness-020: 2
generatedBy: agent
version: 1
phase: conformance
createdAt: '2026-09-30T12:03:43.133Z'
updatedAt: '2026-09-30T12:44:05.893Z'
---
# Anthropic directory submission readiness — Phase conformance walkthrough

This phase changes the plugin folder `plugins/specmanager/` so that it meets the mechanically testable rules of the Anthropic plugin directory, and adds the documents the owner needs to submit it. The work is 13 commits on the branch `directory-readiness`, on top of `main` (`3c898ea`). The branch has no upstream: nothing is pushed and nothing is merged. **The plugin has not been submitted.** Everything in the portal, in Cowork and in a real `claude --plugin-dir` session is still the owner's to do (section 7).

This is a single-phase feature, so this walkthrough is the last document of the feature. There is no `final` roll-up. Approving it marks the feature as shipped in SpecManager and refreshes `docs/DESIGN.md`; it does not mean the directory submission has happened.

The phase's exit criterion, from Plan `plan-anthropic-directory-submission-readiness-020` (v2):

> **Exit test:** from the repo root:
>
> ```bash
> cd plugins/specmanager/server && npm run build && for s in selftest-directory selftest selftest-board selftest-phases selftest-build selftest-tiers selftest-stopgate selftest-roundtrip selftest-pidfile selftest-shutdown selftest-autoport selftest-repos selftest-specslice selftest-prompts smoke-mcp; do npm run -s "$s" || exit 1; done
> ```

What landed, one commit per plan task:

| Plan | Commit | What changed |
|---|---|---|
| 1.1 | `3df0176` | New `server/src/selftest-directory.ts` with the file-tree assertions (1, 2, 3, 4, 8, 10), registered as `selftest-directory` in `server/package.json`. |
| 1.2 | `635cfe7` | Assertions 5, 6, 7 and 9 added (manifest, hook and MCP commands, MCP env, root package files). At this commit 11 assertions failed by design. |
| 1.3 | `e6de321` | New `plugins/specmanager/package.json` (`specmanager-plugin`: runtime dependencies only, no `version`, `scripts` or `devDependencies`) and `package-lock.json`. The lockfile was generated from a copy of `server/package-lock.json` with `npm install --package-lock-only --ignore-scripts`, so no resolved version moved. `server/package.json` keeps only scripts and dev dependencies. |
| 1.4 | `7286d66` | `.mcp.json` env reduced to `SPECMANAGER_BOARD_PORT` (`NODE_PATH` and `SPECMANAGER_PROJECT_DIR` removed). `hooks/hooks.json` reduced to `Stop` (`SessionStart` and `FileChanged` removed). The `Stop` command string is unchanged. |
| 1.5 | `2699789` | `server/tsconfig.json` sets `sourceMap: false`; the 44 tracked `server/dist/**/*.map` files are deleted. |
| 1.6 | `281164e` | `ui/vite.config.ts` builds unminified (`minify: false`) with one chunk per npm package (`manualChunks`). `ui/dist` goes from 15 files to 100. |
| 1.7 | `bf83bbc` | Agent chat removed from the UI: `ChatPanel.tsx` deleted; the Chat toggle and column removed from `DocPanel.tsx`, `MarkdownEditor.tsx` and `MarkdownToolbar.tsx`; `fetchChatStatus` / `openChatSocket` removed from `api.ts`; the `chat.*` events and `ChatStatus` removed from `types.ts`; the chat CSS removed from `styles.css`, together with the toggle, spacer and `cols-2` / `cols-3` rules and the design-doc toolbar row. The `ChatPanel.tsx` line is removed from `docs/DESIGN.md`. |
| 1.8 | `ea7e433` | Agent chat removed from the server: `server/src/agent-chat.ts` and its `dist` output deleted; `board-server.ts` loses the import, the `ClientChat*` types, `handleClientMessage` with its websocket `message` listener, the `isClientMessage` / `safeSend` helpers and `GET /api/chat/status`. The websocket's server-to-client broadcast is unchanged. `@anthropic-ai/claude-agent-sdk` is removed from the root `package.json`; 16 lockfile entries leave (the SDK, its 8 platform packages, 7 packages reachable only through it) and no other entry changes. 11 runtime dependencies remain. |
| 1.9 | `29aca8a` | `plugin.json`: `"version": "1.0.0"` and a new `board_port` description. |
| 1.10 | `18678a2` | New `plugins/specmanager/README.md`, the text the directory shows as the listing. |
| 1.11 | `d0ba883` | New `docs/directory-submission.md`, the owner's submission and release checklist. |
| 1.12 | `79f8f08` | Root `README.md`, `CLAUDE.md` (outside the managed markers) and `.gitignore` updated to the new install and build steps, 15 selftests and the release rule; `.gitignore` now ignores `**/.claude/settings.local.json`. |
| 1.13 | `1bccb55` | The local verification results added to `docs/directory-submission.md`, section 3, "Local results, 2026-09-30". |

Not touched, confirmed by an empty `git diff main..HEAD` over these paths: `hooks/stop-gate.sh`, `server/src/core/**`, `server/src/mcp.ts`, `commands/`, `agents/`, `.claude-plugin/marketplace.json`.

Before you start, you should have: this repository checked out on `directory-readiness` at `1bccb55` or later, and `docs/directory-submission.md` open next to this document. That file is the working checklist; this walkthrough records what was built and checked, and refers to it by section.

## 0. Prerequisites

- macOS or Linux with `bash`, `git` and network access to the npm registry.
- Node.js 20 or later with `npm` on `PATH`. The recorded results used Node v25.6.1, npm 11.9.0 and Claude Code 2.1.281.
- The `claude` CLI, for `claude plugin validate` and the `--plugin-dir` session.
- Branch `directory-readiness`. The checks below do not pass on `main` until the branch is merged.
- No seed data. The selftests create their own temporary projects.
- A machine that is not under heavy load. Two of the selftests have a 3-second budget (section 6, item 2).

## 1. Build

From the repo root:

```bash
cd plugins/specmanager && npm ci          # runtime dependencies, used by server/dist
cd server && npm ci && npm run build      # tsc -> server/dist
cd ../ui && npm ci && npm run build       # tsc + vite -> ui/dist
cd ../../.. && git status --short plugins/
```

Expected: both builds finish without errors, and `git status --short plugins/` prints nothing. The committed `dist` folders are what ships, so a fresh build must reproduce them exactly.

New in this phase:

- A 15th selftest, `npm run selftest-directory`, which ends with `All directory-conformance assertions passed.`
- The root `npm ci` step. Before this phase the runtime dependencies lived in `server/package.json`.
- `server/dist` contains no `.map` files and no `agent-chat.js`.
- `ui/dist/assets` holds about one file per npm package in place of one minified bundle.

If any of these fail, stop here.

## 2. Install / run

The work is not on `main`, so a marketplace install (`/plugin marketplace add joanseg/specmanager`) still delivers the old plugin. To run this phase's build, load the folder in place:

```bash
cd plugins/specmanager && npm ci
cd ../.. && claude --plugin-dir plugins/specmanager
```

`--plugin-dir` does not install dependencies, which is why the `npm ci` comes first. For that session this copy replaces your installed SpecManager without any message.

If the plugin does not load:

- `/mcp` does not list `specmanager` as connected: the root `npm ci` did not run or did not finish. Run it, then reconnect from `/mcp`.
- Reconnect fails: quit Claude completely and start the same command again.
- The old behaviour is still there (for example a Chat toggle in the board): the session was started without `--plugin-dir`, so the installed copy from the plugin cache is running.

After the merge to `main`, the normal path applies: `/plugin marketplace update specmanager`, `/plugin install specmanager@specmanager`, `/reload-plugins`, then reconnect from `/mcp`.

## 3. Phase conformance exit checks

Checks 3.1 to 3.8 were re-run while this walkthrough was written, on `1bccb55`, and gave the results shown. Check 3.9 is the one the owner has not done.

### 3.1 The exit test

```bash
cd plugins/specmanager/server && npm run build && for s in selftest-directory selftest selftest-board selftest-phases selftest-build selftest-tiers selftest-stopgate selftest-roundtrip selftest-pidfile selftest-shutdown selftest-autoport selftest-repos selftest-specslice selftest-prompts smoke-mcp; do npm run -s "$s" || exit 1; done; echo "exit=$?"
```

Expected: `exit=0`, and each script's closing line, in this order:

```
All directory-conformance assertions passed.
All Phase 1 assertions passed.
Phase B reap/rebind assertions passed.
All Phase 7.A assertions passed.
All Phase 7.B assertions passed.
All R2 tier assertions passed.
All R1 Stop-gate assertions passed.
PASS — selftest-roundtrip
All Phase A pidfile assertions passed.
All Phase C shutdown assertions passed.
All autoport assertions passed.
All multi-repo declare/seed/render/reconcile + containment assertions passed.
All R6 spec-slice assertions passed.
All prompt invariant assertions passed (45 invariants checked: match + mutation).
ok — all 18 tools registered
```

### 3.2 The conformance selftest on its own

```bash
cd plugins/specmanager/server && npm run -s selftest-directory
```

Expected, exit code 0:

```
ok — README.md exists at the plugin root
ok — README.md has at least 40 words outside code (711)
ok — no non-image/font file over 256 KiB
ok — plugin ships at most 512 files (228)
ok — no binary file other than images/fonts
ok — plugin.json version is semver (1.0.0)
ok — plugin.json userConfig.board_port has a default
ok — plugin.json has no hooks key
ok — hooks.json Stop: command uses only ${CLAUDE_PLUGIN_ROOT} paths and plain arguments — bash "${CLAUDE_PLUGIN_ROOT}/hooks/stop-gate.sh"
ok — hooks.json Stop: every referenced plugin path is a shipped file (hooks/stop-gate.sh)
ok — .mcp.json specmanager: command uses only ${CLAUDE_PLUGIN_ROOT} paths and plain arguments — node ${CLAUDE_PLUGIN_ROOT}/server/dist/mcp.js
ok — .mcp.json specmanager: every referenced plugin path is a shipped file (server/dist/mcp.js)
ok — .mcp.json specmanager.env.SPECMANAGER_BOARD_PORT is a literal or a ${user_config.*} reference — ${user_config.board_port}
ok — no OS system files
ok — package.json and package-lock.json exist at the plugin root
ok — package.json dependencies match the package-lock.json root entry
ok — root package.json has no devDependencies
ok — no locked dependency has an install script
ok — no .npmrc, bunfig.toml, uv.toml or .gitattributes
ok — no .map files
ok — no symlinks
ok — no top-level bin/ directory

All directory-conformance assertions passed.
```

The script checks tracked files plus new unignored files that exist on disk, so it needs a git checkout. Every assertion runs; a `FAIL:` line names the file or field at fault.

### 3.3 Committed `dist` equals a fresh build

```bash
cd plugins/specmanager/ui && npm run build && cd ../../.. && git status --short plugins/
```

Expected: no output from `git status`. (3.1 already rebuilt the server.)

### 3.4 Manifest validation

```bash
claude plugin validate plugins/specmanager
```

Expected: `Validation passed` with a check mark, and no warning lines. This checks syntax only. The portal's Validate is the real test and has not been run.

### 3.5 Plugin configuration

```bash
cd plugins/specmanager
node -e 'const j=f=>JSON.parse(require("fs").readFileSync(f,"utf8"));
console.log(Object.keys(j(".mcp.json").mcpServers.specmanager.env));
console.log(Object.keys(j("hooks/hooks.json").hooks));
console.log(j(".claude-plugin/plugin.json").version);
console.log(Object.keys(j("package.json").dependencies).length, Object.keys(j("package.json")).includes("scripts"))'
git diff main..HEAD --stat -- hooks/stop-gate.sh
```

Expected:

```
[ 'SPECMANAGER_BOARD_PORT' ]
[ 'Stop' ]
1.0.0
11 false
```

and no output from `git diff` (the Stop hook script is byte-identical to `main`).

### 3.6 Nothing left of chat, the agent SDK or source maps

```bash
cd plugins/specmanager
grep -rli chat ui/src server/src
grep -l claude-agent-sdk package.json package-lock.json
grep -rl sourceMappingURL server/dist
git ls-files . | grep -c '\.map$'
cd ../.. && grep -n 'SessionStart\|NODE_PATH\|FileChanged' README.md CLAUDE.md .gitignore
```

Expected: the three `grep` commands in the plugin folder print nothing, the count is `0`, and the last `grep` prints nothing.

### 3.7 Size limits

```bash
git ls-files plugins/specmanager | wc -l
git ls-files -z plugins/specmanager | xargs -0 stat -f '%z %N' | grep -Ev '\.(png|jpe?g|gif|webp|woff2?|ttf|otf)$' | sort -rn | head -2
```

Expected: `228` (limit 512), then

```
195298 plugins/specmanager/ui/dist/assets/react-dom-3WAF5SeA.js
192637 plugins/specmanager/ui/dist/assets/prosemirror-view-R3B9ydcM.js
```

The limit is 262,144 bytes (256 KiB). On Linux use `stat -c '%s %n'`.

### 3.8 The end-user state: a clean copy with only the root install

This is the state a user gets from a directory install: the shipped files, the root dependencies, no `server/node_modules`, no dev dependencies.

```bash
T=$(mktemp -d)
git archive HEAD plugins/specmanager | tar -x -C "$T"
cd "$T/plugins/specmanager"
find . -type f | wc -l
time npm ci --ignore-scripts --cache "$T/npm-cache"
du -sh node_modules "$T/npm-cache"
cd server && unset NODE_PATH
node dist/smoke-mcp.js && node dist/selftest-board.js && node dist/selftest-stopgate.js; echo "exit=$?"
```

Expected: `228` files; the install finishes well inside 60 seconds; `node_modules` about 48 MB; the cache (the download) about 12 MB; then `ok — all 18 tools registered`, `Phase B reap/rebind assertions passed.`, `All R1 Stop-gate assertions passed.` and `exit=0`. `npm ci` also prints an audit summary (section 6, item 1).

The commands above are the ones used for this walkthrough's re-run. The builder's own commands for the same check were not recorded, only its results.

### 3.9 Open and edit a document on the new UI build

Follow `docs/directory-submission.md`, section 3 (a): start `claude --plugin-dir plugins/specmanager`, run `/specmanager:specmanager-board`, open a draft document, change a word, select **Save**.

Expected: `/mcp` lists `specmanager` as connected; the board opens at `http://127.0.0.1:4317` or the next free port; the document opens in the editor with its toolbar; after **Save**, `git diff` shows the change in that file under `.claude/specs/`. Undo it with `git checkout -- <file>`. The panel has no Chat toggle.

Status: not done by the owner. A headless substitute was run and passed (section 5).

## 4. Pass criteria

All required.

- [ ] 3.1: the exit test prints the 15 closing lines and `exit=0`.
- [ ] 3.2: `selftest-directory` prints 22 `ok` lines, no `FAIL:` line, and exits 0.
- [ ] 3.3: `git status --short plugins/` is empty after rebuilding the server and the UI.
- [ ] 3.4: `claude plugin validate plugins/specmanager` passes with no warnings.
- [ ] 3.5: `.mcp.json` env has one key, `hooks.json` has one event, `plugin.json` version is `1.0.0`, the root `package.json` has 11 dependencies and no `scripts`, and `hooks/stop-gate.sh` is unchanged from `main`.
- [ ] 3.6: no `chat` match in `ui/src` or `server/src`, no `claude-agent-sdk` in the root package files, no `sourceMappingURL` in `server/dist`, no tracked `.map` file, no `SessionStart` / `NODE_PATH` / `FileChanged` text in the three root files.
- [ ] 3.7: 228 shipped files; the largest non-image, non-font file is 195,298 bytes.
- [ ] 3.8: in a clean copy, `npm ci --ignore-scripts` finishes within 60 seconds and the three scripts pass with no `server/node_modules`.
- [ ] 3.9: a document opens, is edited and saved in the board during a `claude --plugin-dir` session.

## 5. Who verified what

| What | By whom | Result |
|---|---|---|
| The exit test, `dist` equal to a fresh build, `claude plugin validate`, the clean-copy install, file count and largest file | The builder, task 1.13, on commit `79f8f08`. Recorded in `docs/directory-submission.md`, section 3, "Local results, 2026-09-30" (commit `1bccb55`). | All pass. Clean-copy `npm ci --ignore-scripts` with an empty cache: 4.98 s (5.46 s on a second run) against the 60 s limit; 12 MB downloaded; `node_modules` 48 MB, 6,615 files, 232 packages; 228 shipped files; largest non-image, non-font file 195,298 bytes. |
| Spec compliance of the phase diff | The reviewer agent, reported by the build session. | First verdict `fail`, on one point: plan row 1.13 asked for the results to be recorded durably, and they were not, because task records have no notes field. Commit `1bccb55` fixed it and the re-review verdict was `pass`. Every other area passed on the first review, including the check that the extra CSS removed with the chat UI (`.panel__body--cols-2/3`, the spacer and toggle rules, the design-doc toolbar row) was used only by chat. |
| Opening and editing a document on the unminified UI build | The orchestrator, after the build, reported by the build session. Headless Chrome driven over the DevTools protocol, against the working-tree board serving a scratch copy of `.claude/specs`; no real document was touched. | The board rendered 35 feature rows and 126 cards. A draft PRD opened in the Milkdown editor, editable, with its toolbar. Typed text appeared, and **Save** wrote it to disk (version 1 to 2, `generatedBy: human`). A design document rendered in its iframe. The only console error was a 404 for `favicon.ico`. This covers the check that the Architecture's E9 left open. It was a headless check, not the owner's `claude --plugin-dir` session, so 3.9 stays open. |
| Checks 3.1 to 3.8 | This walkthrough's author, on `1bccb55`. | All as shown in section 3. The clean-copy install took 8.7 s on this run (48 MB `node_modules`, 12 MB cache). `claude plugin validate` also passed on the clean copy. |

Nobody has verified: the portal's Validate and security scan, a Cowork upload, a marketplace install or update from `main`, or a `claude --plugin-dir` session run by a person.

## 6. Open items, not resolved

These came up during the build and are still open. None blocks the exit test.

1. **11 npm audit advisories in the runtime dependency tree** (1 low, 3 moderate, 7 high). `npm audit` names `@fastify/static`, `@hono/node-server`, `body-parser`, `brace-expansion`, `fast-uri`, `fastify`, `find-my-way`, `hono`, `ip-address`, `js-yaml` and `qs`. The resolved versions are the same as before this feature. Nobody has examined the advisories. `docs/directory-submission.md` section 3 lists this as something to look at before submitting.
2. **Two selftests have a tight budget.** `selftest-shutdown` and `selftest-autoport` wait at most 3 seconds for the MCP handshake. Per the build session, both timed out intermittently mid-build while the machine was under heavy unrelated load (load average about 60). The measured cause was the load: the build from before the change behaved the same way, and once the agent SDK was removed, MCP startup under the same load dropped from roughly 0.9–1.3 s to 0.3–0.5 s. Both passed in every later run, including this walkthrough's. The 3-second budget itself is unchanged.
3. **The PRD is back in `draft`.** `prd-anthropic-directory-submission-readiness-040` went from `approved` to `draft` at 2026-09-30T11:28:06Z, while task 1.7 was in progress. Its body version is still 3. That transition flags the Architecture and the Plan as stale, and both show `stale: true` now. No builder has a tool that changes status. The cause was not established; the board's Edit button on an approved document does exactly this. The PRD has not been re-approved. That is the owner's call.
4. **An unrelated document has unparseable frontmatter.** `.claude/specs/features/fly-io-deployment/architecture/architecture.md` starts directly with its body, with no frontmatter block, and the board logs "skipping unparseable doc". It is not part of this feature.
5. **Reviewer observations, no action taken:**
   - The artifact lists of task-001 and task-002 still name `server/dist/selftest-directory.js.map`, which task 1.5 deleted.
   - `CLAUDE.md`'s "Editors" convention line describes a CodeMirror editor for HTML design briefs. No file in `ui/src` imports CodeMirror; the packages are only listed in `ui/package.json`. The line predates this feature.
   - `selftest-directory` assertion 6 is slightly stricter than the Architecture's R8: it fails a hook or MCP command that names no `${CLAUDE_PLUGIN_ROOT}` path at all.
6. **Behaviour changes a user will notice:**
   - The board's Chat column and toggle are gone (owner decision OD-1).
   - The `FileChanged` hook is gone. The Architecture found it never fired.
   - With `version` pinned at `1.0.0`, people who installed from the GitHub marketplace get an update only when the version string is raised. `docs/directory-submission.md` section 2 has the release rule.

## 7. What remains for the owner

None of this is done. The steps and the expected results are in `docs/directory-submission.md`; the section numbers below refer to it.

1. Merge `directory-readiness` to `main` and push (section 1). The portal reads `main`.
2. The `claude --plugin-dir` session (section 3 (a); check 3.9 here).
3. The Cowork zip upload, recording the four observations (section 3 (b)). Whether Cowork runs the dependency install is unknown. If it does not, Cowork support becomes a decision for the owner, not something to patch around.
4. After the merge: a fresh marketplace install, and an update of an existing install to `1.0.0` (section 3 (c)).
5. The portal submission (sections 4 to 7).
6. At Validate, confirm that the holds are only the four accepted ones, and record whether `.mcp.json` `env` or the quoted hook path draws a finding (section 5):

   | Hold | What it covers |
   |---|---|
   | A1 | Dependencies installed from a lockfile |
   | A2 | The Node MCP server file, `server/dist/mcp.js` |
   | A3 | The Stop hook files: `hooks/stop-gate.sh` and the two Node files it runs |
   | A4 | React's upstream-minified chunks in `ui/dist/assets` |

The plan asks for these results to be added to this walkthrough. Fill them in here:

| Owner check | Date | Result |
|---|---|---|
| `--plugin-dir`: server connected, board opens, document edited and saved | | |
| Cowork 1: dependencies installed | | |
| Cowork 2: MCP server starts | | |
| Cowork 3: project root resolves | | |
| Cowork 4: board port arrives | | |
| Marketplace: fresh install | | |
| Marketplace: update to 1.0.0 | | |
| Validate: holds shown (expected A1 to A4 only) | | |
| Validate: finding on `.mcp.json` `env` | | |
| Validate: finding on the quoted hook path | | |
| Submission state after review | | |

## 8. Deferred / out of scope

Expected, not bugs. The full list is the "Out of scope" section of Plan `plan-anthropic-directory-submission-readiness-020`.

- There is no chat in the board. It was removed, not disabled.
- Chat on claude.ai is not supported; the plugin README says so and why.
- `hooks/stop-gate.sh` and its two Node shims are unchanged, so hold A3 stays (OD-2).
- React ships as its upstream pre-minified production build, so hold A4 stays (OD-3). The rest of the UI is unminified.
- `marketplace.json` has no `version`.
- A `node_modules` folder left in the plugin's data directory by a version before 1.0 is not cleaned up. The plugin README's Troubleshooting says it can be deleted.
- The five unused CodeMirror packages are still in `ui/package.json`.
- There is no single "run all selftests" npm script; the exit test's loop is the way to run them all.
- Carried risks with no code guard, listed in the Plan's "Risk & sequencing notes": an install that times out or a missing `npm`; a version that is not raised; a dependency chunk growing past 256 KiB; a host that does not substitute `.mcp.json` env values, in which case the board port would be `NaN`.

## 9. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| The MCP server does not start, in a checkout or under `--plugin-dir` | The root `node_modules` is missing. `server/dist` now resolves its imports from `plugins/specmanager/node_modules`. | `cd plugins/specmanager && npm ci` |
| The MCP server does not start after a real install | The native dependency install did not finish (slow network, or `npm` not on `PATH`). | `npm ci --ignore-scripts` in the plugin's install directory under `~/.claude/plugins/cache/`, then reconnect from `/mcp`. |
| `selftest-shutdown` or `selftest-autoport` fails with a timeout | The machine is under load and the 3-second handshake budget ran out. | Check `uptime`, wait for the load to drop, run the script again. |
| `selftest-directory` prints `FAIL:` for a file over 256 KiB | A dependency chunk in `ui/dist/assets` grew. | Split that package further in `ui/vite.config.ts` `manualChunks`, rebuild, commit `ui/dist`. |
| `selftest-directory` prints `FAIL:` for the package files | The root `package.json` and `package-lock.json` are out of step. | `npm install --package-lock-only --ignore-scripts` in `plugins/specmanager`, commit the lockfile. |
| `selftest-directory` fails on almost every line in a copied folder | It lists files with `git ls-files` and needs a git checkout. | Run it in the repository, not in an exported copy. |
| `git status --short plugins/` is not empty after a build | The committed `dist` is older than the source. | Commit the rebuilt `dist`. |
| `claude plugin update` says the plugin is already at the latest version | `version` in `plugin.json` was not raised, or the marketplace copy did not refresh. | Raise `version`; run `claude plugin marketplace update specmanager` first. |
| The portal validates the old plugin | The branch is not merged; the portal reads `main`. | Merge and push, then **Re-validate**. |
| The board log shows "skipping unparseable doc" | Section 6, item 4. Unrelated to this feature. | Add frontmatter to that file, or ignore it. |

## 10. What ships next

Nothing further is built. This is the only phase, so there is no feature roll-up to write. The next steps are the owner's, in section 7: merge, test on each surface, submit in the portal, and record the results in the table there. Before approving this walkthrough, decide on the PRD's status (section 6, item 3).
