---
id: arch-anthropic-directory-submission-readiness-026
featureId: feat-anthropic-directory-submission-readiness
stage: architecture
status: approved
stale: true
title: Anthropic directory submission readiness architecture
dependsOn:
  - prd-anthropic-directory-submission-readiness-040
basedOn:
  prd-anthropic-directory-submission-readiness-040: 3
generatedBy: agent
version: 3
createdAt: '2026-09-30T10:21:40.262Z'
updatedAt: '2026-09-30T11:28:06.612Z'
---
## Summary

Make `plugins/specmanager/` pass the directory's Validate and scan (PRD `prd-anthropic-directory-submission-readiness-040`, R1–R11) mostly by **deleting machinery**: the `SessionStart` install hook, the `NODE_PATH` env, the `node_modules` symlink, the inert `FileChanged` hook and the 43 `.map` files all go. Runtime dependencies move to a `package.json` + `package-lock.json` at the plugin root so Claude Code's native `npm ci --ignore-scripts` supplies them through ordinary Node resolution. The UI is rebuilt unminified, one chunk per npm package. A new `selftest-directory` guards the mechanically checkable rules. No `core/` logic changes.

Three things could not be fully met. The owner decided each on 2026-09-30 (recorded under [Open questions / risks](#open-questions--risks)):

- **OD-1 — remove** the in-board agent chat and the `@anthropic-ai/claude-agent-sdk` dependency. It cost a 63 MB platform binary at install and read an API credential from the user's environment (a separate avoidable hold).
- **OD-2 — S1:** `hooks/stop-gate.sh` stays unchanged; its "Scripts the validator couldn't follow" hold is accepted as A3. No Stop-hook design avoids that hold in a subfolder plugin while keeping its behaviour.
- **OD-3 — accept** the three upstream-minified React chunks as a possible hold, A4. React 18 ships only a pre-minified production build, so `ui/dist` cannot be 100% readable under the 256 KiB limit.

All experiments ran in a scratch copy; no tracked file was modified.

## Evidence log

Machine: darwin-arm64, Node 25.6.1, npm 11.9.0, Claude Code 2.1.281, Vite 5.4.21. Scratch copy = `plugins/specmanager` minus `node_modules`.

| # | Experiment | Result |
|---|---|---|
| E1 | `npm ci --ignore-scripts --cache <fresh>` of `server/package.json` as on `main` (runtime + dev deps) | 9.31 s, `node_modules` 298 MB, 80 MB downloaded |
| E2 | Same, runtime deps only, agent SDK kept | 9.49 s, 272 MB, 75 MB downloaded, 241 packages, 8,543 files |
| E3 | Same, runtime deps only, agent SDK removed | 5.85 s, 48 MB, 12 MB downloaded, 232 packages, 6,615 files |
| E4 | Agent SDK package inspection (locked 0.3.150; latest on npm 0.3.285) | No `scripts` in the SDK or its platform package; `hasInstallScript` count in the lockfile = 0. Platform package `@anthropic-ai/claude-agent-sdk-darwin-arm64` = one 213 MB `claude` executable (tarball 62,979,527 bytes); after `--ignore-scripts` it is executable and runs (`2.1.150 (Claude Code)`). Other platforms unpack to 216–239 MB. |
| E5 | Root-lockfile layout (see [R4](#r4--native-lockfile-install)): root `npm ci --ignore-scripts`, `server/` holding dev deps only, `npm run build` | `tsc` succeeds; output byte-identical to committed `server/dist` |
| E6 | All 13 selftests + `smoke-mcp` in that layout with `NODE_PATH` unset | All pass. (`selftest-prompts` and `selftest-roundtrip` need `docs/agent-snippets` and `.claude/specs` from the repo, which a copy outside the repo lacks; both pass once supplied.) |
| E7 | Same with `server/node_modules` (dev deps) moved away — the end-user state | `smoke-mcp`, `selftest-board`, `selftest-stopgate` pass |
| E8 | Vite build, `minify: false` + one chunk per npm package | 100 files in `ui/dist` (86 JS, 1 CSS, 12 fonts, `index.html`), largest non-font file 195,298 bytes, 1.8 MB total, `tsc` clean, deterministic file names across rebuilds |
| E9 | Board served from the scratch copy with the E8 build, rendered in headless Chrome | Kanban renders (81 cards, this feature's row present), zero console errors. **Not click-tested:** opening a doc panel (Milkdown editor). |
| E10 | Env of the live plugin MCP server process (`ps eww`) under Claude Code 2.1.263–2.1.284 | `CLAUDE_PROJECT_DIR`, `CLAUDE_PLUGIN_ROOT`, `CLAUDE_PLUGIN_DATA` are exported natively. No `CLAUDE_PLUGIN_OPTION_*` variable is present. `ANTHROPIC_API_KEY` is present on this machine, so agent chat is live here. |
| E11 | Proposed `.mcp.json`, `hooks.json`, `plugin.json` in the scratch copy | `claude plugin validate` prints `✔ Validation passed` (on `main`: passes with the `version` warning) |
| E12 | Prototype of the R8 check | 11 failing assertions on `main`; 18/18 pass on the scratch "after" tree (229 files) |

Library docs consulted: Claude Code hooks reference (`code.claude.com/docs/en/hooks`, fetched 2026-09-30) for `FileChanged` matcher semantics and env export. Context7 was not needed.

## Q1 — Install time and the agent SDK

- **Timing:** E1–E3. On this connection every variant finishes in under 10 s. The limit is a bandwidth question: 75 MB inside ~55 s needs about 11 Mbit/s sustained; 12 MB needs about 2 Mbit/s.
- **Lifecycle scripts / platform binaries:** no lifecycle script is needed (E4), so R4 AC3 holds. The SDK does need its optional platform package: that 63 MB tarball is 84% of the install download.
- **Where `server/src/agent-chat.ts` is used:** statically imported by `server/src/board-server.ts` (line 34), which `server/src/mcp.ts` imports, so the SDK loads at every server start. It serves `GET /api/chat/status` and the `chat.send` / `chat.cancel` websocket messages behind `ui/src/ChatPanel.tsx` (the "Chat" toggle in `DocPanel.tsx`). The feature is live but gated: `chatAvailable()` requires `ANTHROPIC_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN` or `CLAUDE_AGENT_SDK_OAUTH_TOKEN` in the server's environment. Making the import lazy does not help: the dependency is either in the lockfile (and installed) or not.
- **Fallback without a hook install:** none is automatic. The loading reference says a timed-out install "can leave a partial `node_modules` tree" and offers only a hook install as remedy, which R3 AC2 forbids. The design therefore (a) shrinks the payload so the limit is far away (OD-1, E3) and (b) documents the manual recovery in the plugin README: run `npm ci --ignore-scripts` in the plugin's cache version directory, then reconnect via `/mcp`.
- **Rejected:** bundling server deps into `dist` (would also remove A1). Unminified it needs chunking under 256 KiB across a 48 MB dependency tree, and the 213 MB SDK binary exceeds the 5 MiB per-file cap.

## Q2 — Stop hook and the subfolder rule

Checklist wording, "Review what the plugin runs": for a subfolder plugin, scripts a hook runs must be free of "shell variables other than `${CLAUDE_PLUGIN_ROOT}`, command substitutions, and calls to other files in the plugin" — else **Scripts the validator couldn't follow**. "Choices a reviewer always checks": "the validator follows only plain shell scripts"; a hook that "runs a non-shell file from the plugin … or runs a shell script that itself runs another file" is held; the only escapes are the repo root (declined by D2) or "shell scripts that name each path as `${CLAUDE_PLUGIN_ROOT}/<file>`".

**No design avoids the hold.** The behaviour `selftest-stopgate` asserts needs: the project directory, `session_id` from stdin, the active-build marker, phase/task resolution through `core` (`resolveActiveCard`, stale-marker auto-clear), a dynamic test command, a per-phase counter, and `setPhaseBlocked`. A shell script with no variables and no substitutions cannot hold any of that state, and a Node implementation is a non-shell file. Re-implementing `core` in variable-free shell would also break the "one shared `core`" invariant.

| Option | Change | Held files (same finding title as A2) |
|---|---|---|
| **S1 (recommended)** | None. `hooks/stop-gate.sh` stays byte-identical. | `hooks/stop-gate.sh`, `server/dist/resolve-active-card.js`, `server/dist/set-phase-blocked.js` |
| S2 | Port the gate to one Node entry point run as `node ${CLAUDE_PLUGIN_ROOT}/server/dist/stop-gate.js`; delete the bash script and both shims; re-point `selftest-stopgate`'s `runHook`. | One file |

S1 is the simplest and carries zero regression risk; S2 is a rewrite that buys only a shorter held-file list. Either way the hook command string in `hooks.json` already satisfies the Blocking path rule. See OD-2.

## Q3 — `.mcp.json` env

The path rule's scope is "the command of a hook or an MCP server"; the checklist does not mention `env`, and it names `${user_config.KEY}` as the endorsed way to reference configuration. Whether the validator also inspects `env` is **unknown — verify at portal Validate**. Simplest compliant form, which makes the question moot for two of three entries:

- `NODE_PATH` — delete (unneeded under R4; E6/E7).
- `SPECMANAGER_PROJECT_DIR: ${CLAUDE_PROJECT_DIR}` — delete. Claude Code sets `CLAUDE_PROJECT_DIR` for stdio MCP servers (hooks reference; E10), and `server/src/mcp.ts` line 48 and `core/paths.ts` already fall back to it.
- `SPECMANAGER_BOARD_PORT: ${user_config.board_port}` — keep. No `CLAUDE_PLUGIN_OPTION_*` variable reaches the process (E10), so this is the only way the port arrives.

## Q4 — `FileChanged` hook

The inline `echo` has no path, variable, substitution or wildcard, so it does not obviously break the path rule; the checklist is silent on path-less commands. The question is moot because **the hook is inert and is deleted**: per the hooks reference, a `FileChanged` matcher is split on `|` and each segment is "registered as a literal filename in the working directory", so `.claude/specs/**` watches a file literally named `.claude/specs/**`; and the event has no decision control and does not return stdout to Claude.

## Q5 — UI bundle

Yes on size, with one readability exception. The config that worked (E8, E9), added to `ui/vite.config.ts` `build`:

```ts
minify: false,
rollupOptions: {
  output: {
    manualChunks: (id) =>
      id.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/)?.[1]?.replace("@", "").replace("/", "-"),
  },
},
```

- Every emitted JS/CSS file is under 256 KiB: largest are `react-dom` 195,298 bytes and `prosemirror-view` 192,637 bytes; the CSS is 53,820 bytes. `ui/dist` goes from 15 to 100 files.
- **Exception:** the `react-dom`, `react` and `scheduler` chunks (about 213 KB of 1.8 MB) contain upstream's pre-minified production builds (`react-dom.production.min.js`), re-indented but with mangled identifiers. React 18's readable build, `react-dom.development.js`, is 1,029,622 bytes in a single module, and Rollup chunks are module-granular, so it cannot be split under the limit. See OD-3.
- Per-package chunking was preferred over hand-tuned groups: fewer files, but a dependency bump could push a group over the limit.
- **`.map` files:** drop all 43. They sit under `server/dist` only, that output is unminified `tsc` and `server/src` ships beside it. Set `"sourceMap": false` in `server/tsconfig.json`; a rebuild then emits no maps and no `sourceMappingURL` comments (verified).

## Q6 — Where the root package files go

`plugins/specmanager/package.json` + `plugins/specmanager/package-lock.json`, holding **runtime dependencies only** (E5–E7):

- (a) `server/dist/*.js` resolves packages by walking up to `plugins/specmanager/node_modules`. No `NODE_PATH`, no symlink.
- (b) The native command is `npm ci --ignore-scripts` with no `--omit=dev`, so anything in the root `devDependencies` would reach end users. The root file therefore has none. `ui/package.json` and its lockfile stay untouched in `ui/` and are never installed for users.
- (c) `server/package.json` keeps `type`, `scripts` and `devDependencies` (`typescript`, `@types/node`, `@types/ws`) and loses `dependencies`; its lockfile shrinks to 1.9 KB. `cd server && npm run build` and every `npm run selftest-*` keep working from the same directory as today.
- No npm workspaces: a workspace root install would pull UI dev deps.
- The root lockfile is always reviewer-held (A1, accepted).

## Q7 — Cowork upload and the native install

The docs describe the install only for Claude Code copying a plugin into its cache; they do not say whether a Cowork zip upload runs it. **Unknown — verify during surface testing.** Two facts bound the outcome: `--plugin-dir` loads in place and never installs (so R11 AC2 needs a manual `npm ci`), and a zip cannot carry `node_modules` (6,615 files without the SDK, against Cowork's 5,000-file limit; 272 MB with it, against 200 MB). Expectation for R11 AC3 is defined in [R11](#r11--surface-testing).

## Q8 — Agent-chat traffic

Trace: `ChatPanel.tsx` → websocket `chat.send` → `board-server.ts` `handleClientMessage` → `agent-chat.ts` `runChat` → SDK `query()`, which spawns the bundled `claude` executable with `cwd` = project root.

- **Destination:** the Anthropic API as that executable resolves it (`api.anthropic.com` by default; a base-URL or Bedrock/Vertex setting in the user's environment would redirect it). The plugin has no endpoint of its own; the only URL literal in `server/src` is `http://127.0.0.1:${boundPort}`.
- **Credentials:** whichever of `ANTHROPIC_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN`, `CLAUDE_AGENT_SDK_OAUTH_TOKEN` the server process inherited. The plugin reads them only to gate availability; the child process sends them.
- **Payload:** the document's frontmatter and body (system prompt), the user's chat message, and whatever project files the agent reads through its `Read`/`Glob`/`Grep` tools.
- **Trigger:** only when the user sends a chat message in the board.
- Not verified: any network behaviour of the bundled executable beyond the API call.

Checklist consequence not in the PRD gap list: "Don't read a credential that is already set in the user's environment … and send it to a server" → hold **Uses a credential from the user's machine**. The endorsed alternative (a `sensitive` `userConfig` key) is unusable: Cowork ignores an MCP server whose referenced option has no default. See OD-1.

## Q9 — Marketplace manifest version

No. Per the loading reference, the `version` in the plugin's manifest "comes first", then the marketplace entry's. `.claude-plugin/marketplace.json` has no `version` on its plugin entry today and should stay that way: one source of truth. For a plugin installed from the claude.ai-hosted directory, "the manifest's `version` isn't read"; claude.ai's recorded version applies.

Side effect to document (R7 AC5): without a `version`, the GitHub-marketplace path used the commit SHA, so every commit was an update. Once `1.0.0` is pinned, a commit without a bump is invisible to `claude plugin update`.

## R1 — Plugin-folder README

New file `plugins/specmanager/README.md`: what it does, install, the `/specmanager:*` commands, supported surfaces per D3 with the plain "Chat is unsupported" sentence, the R2 disclosures, a Requirements line (Node 20+, npm on `PATH`), and Troubleshooting (manual `npm ci` recovery from Q1; optional removal of the stale data-dir `node_modules` from R9). No images (AC4 is then vacuous and no file is added). The repo-root `README.md` stays the long-form doc; its line 68 (the `SessionStart` sentence) is corrected.

## R2 — Behaviour disclosure

One "What this plugin does on your machine" section in the R1 README, one bullet per AC, each traceable to code:

| AC | Source of truth |
|---|---|
| AC1 npm install from lockfile | root `package.json` / `package-lock.json` ([R4](#r4--native-lockfile-install)) |
| AC2 board on `127.0.0.1`, fall-forward port | `board-server.ts` `bindWithFallback` |
| AC3 Stop hook runs the phase test command via `bash -lc` | `hooks/stop-gate.sh` line 103 |
| AC4 writes to `CLAUDE.md` markers, `docs/DESIGN.md`, `.claude/specs/` | `core/claude-md.ts`, `core/design-md.ts` |
| AC5 OS browser opener | `mcp.ts` `open_board` (`open` / `start` / `xdg-open`) |
| AC6 agent chat | The README states the plugin makes no model or API calls of its own (chat is removed; [Q8](#q8--agent-chat-traffic) records what the removed path did). |
| AC7 data sent | Nothing leaves the machine from plugin code; npm registry at install |

Also disclosed: pidfile and the stop-gate retry counter locations (`${CLAUDE_PLUGIN_DATA}`, `.claude/specs/.cache/`).

## R3 — Hook and MCP commands

Final `hooks/hooks.json` has the `Stop` group only, command unchanged: `bash "${CLAUDE_PLUGIN_ROOT}/hooks/stop-gate.sh"`. `SessionStart` (B2, H2) and `FileChanged` ([Q4](#q4--filechanged-hook)) are deleted.

Final `.mcp.json`: `command: "node"`, `args: ["${CLAUDE_PLUGIN_ROOT}/server/dist/mcp.js"]`, `env: { "SPECMANAGER_BOARD_PORT": "${user_config.board_port}" }` ([Q3](#q3--mcpjson-env)).

Both validate (E11). If portal Validate objects to the quoted path in the hook command, the fallback is the documented exec form (`"command": "bash", "args": ["${CLAUDE_PLUGIN_ROOT}/hooks/stop-gate.sh"]`).

## R4 — Native lockfile install

- New `plugins/specmanager/package.json`: `name: "specmanager-plugin"`, `private`, `license`, `type: "module"`, `engines.node >=20`, `dependencies` = today's `server/package.json` dependencies minus `@anthropic-ai/claude-agent-sdk` (OD-1). No `version` (nothing to keep in step), no `scripts`, no `devDependencies`. Verified installable without a `version`.
- New `plugins/specmanager/package-lock.json`: generated by copying `server/package-lock.json` beside the new `package.json` and running `npm install --package-lock-only --ignore-scripts`, so resolved versions do not drift. About 117 KB, under the file limit.
- `server/package.json`: drop `dependencies`; regenerate `server/package-lock.json`.
- AC6: met with wide margin (E3: 12 MB downloaded, 5.85 s).

## R5 — UI bundle and file limits

`ui/vite.config.ts` gains the [Q5](#q5--ui-bundle) block (existing `server.proxy` and `outDir` untouched); rebuild and commit `ui/dist`. `server/tsconfig.json` sets `sourceMap: false`; delete the 43 tracked maps. Projected tracked file count: 184 − 15 + 100 − 43 + 3 (README, root package files) + 2 (selftest source and output) − 3 (`agent-chat.ts`, its `dist` output, `ChatPanel.tsx`) = **228**, against the 512 limit.

## R6 — Stop hook

Per [Q2](#q2--stop-hook-and-the-subfolder-rule): AC1 is infeasible; AC2 is preserved by changing nothing (S1); AC3 was invoked and the owner accepted the hold as A3 (OD-2). `selftest-stopgate` is untouched and passes in the new layout (E6, E7).

## R7 — Manifest

`.claude-plugin/plugin.json`: add `"version": "1.0.0"`; `board_port.description` becomes "Preferred localhost port for the kanban board. If it is taken, the board uses the next free port."; `default: 4317` stays. `marketplace.json` is not changed ([Q9](#q9--marketplace-manifest-version)). AC5: the "bump `version` on every release, or users get no update" rule is written in `docs/directory-submission.md` ([R10](#r10--portal-submission-checklist)) and in the root `CLAUDE.md` build section.

## R8 — Conformance selftest

New `server/src/selftest-directory.ts`, registered in `server/package.json` as `"selftest-directory": "node dist/selftest-directory.js"` (scripts stay in `server/`, per [Q6](#q6--where-the-root-package-files-go)).

- **Style:** same header comment, `PLUGIN_ROOT = path.resolve(here, "..", "..")` as `selftest-stopgate.ts`. One deviation: a local `check(cond, msg)` that prints `ok — …` / `FAIL: …` and counts, exiting 1 at the end, so one run lists every finding instead of stopping at the first.
- **Enumeration:** `git ls-files -z --cached --others --exclude-standard` with `cwd: PLUGIN_ROOT`, keeping entries that exist on disk. That is "what a commit of the current tree would ship": tracked plus new unignored files, minus files a rebuild deleted; `node_modules` is excluded by `.gitignore`. It therefore works straight after a UI rebuild, before `git add`. It needs a git checkout, so it is a contributor check, not runnable from an installed copy.
- **Assertions** (each message names the file or field):

| # | Rule | PRD |
|---|---|---|
| 1 | `README.md` at plugin root; ≥ 40 words after stripping fenced blocks and inline code | R8 AC1 |
| 2 | No file over 256 KiB unless its extension is png/jpg/jpeg/gif/webp/woff/woff2/ttf/otf (SVG is treated as text) | AC2 |
| 3 | ≤ 512 files | AC3 |
| 4 | No non-image/font file containing a NUL byte in its first 8,000 bytes | AC4 |
| 5 | `plugin.json`: semver `version`; `board_port.default` present; no `hooks` key | AC5, R7 AC3, R3 AC4 |
| 6 | Every hook command and the MCP `command` + `args`: after removing `${CLAUDE_PLUGIN_ROOT}`, no `$`, backtick, wildcard, `; & | < >`, `cd`, `-c`/`-e`, or package launcher/installer word; and every `${CLAUDE_PLUGIN_ROOT}/<path>` is a shipped file | AC6 |
| 7 | `.mcp.json` `env`: no `NODE_PATH`; values are literals or `${user_config.*}` | Q3 |
| 8 | No `.DS_Store`, `Thumbs.db`, `desktop.ini`, `__MACOSX` path segment | AC7 |
| 9 | Root `package.json` + `package-lock.json` present; `dependencies` equal the lockfile's root entry; no root `devDependencies`; no lock entry with `hasInstallScript` | R4 AC1–AC3 |
| 10 | No `.npmrc`, `bunfig.toml`, `uv.toml`, `.gitattributes`, `.map`, symlink, or top-level `bin/` | R4 AC4, R5 AC6, PRD non-goals |

- **AC8:** prototype fails 11 assertions on `main` and passes on the target tree (E12).
- **AC10:** listed in the root `CLAUDE.md` selftest block (14 → 15) and in `docs/directory-submission.md` as the pre-push check.
- Not asserted: "readable code" (no cheap honest test; see OD-3) and frontmatter validity (`claude plugin validate` covers it).

## R9 — Existing paths

- AC1: a GitHub-marketplace install copies the plugin to the cache and runs the native install there — the same path as the directory.
- AC2: `1.0.0` lands in a fresh cache version directory, so no stale symlink carries over. Leftover: `~/.claude/plugins/data/specmanager-specmanager/node_modules` (about 290 MB) is no longer referenced. It is harmless and is not auto-removed, since a cleanup hook would violate R3; the README mentions optional manual deletion. Pidfiles keep using that directory (`core/pidfile.ts`).
- AC3: native install does not run for in-place plugins. Documented contributor steps: `npm ci` in `plugins/specmanager`, then `npm ci && npm run build` in `server/` and in `ui/`. Update the root `README.md`, the root `CLAUDE.md` (Layout bullets for `.mcp.json` and `hooks/`, the "Persistent deps via `${CLAUDE_PLUGIN_DATA}`" convention, build commands) and the `.gitignore` comment.
- AC4: E6.

## R10 — Portal submission checklist

New `docs/directory-submission.md` (outside the plugin folder), in the PRD's step order. It lists the accepted holds A1–A4, the release rule from [R7](#r7--manifest), the pre-push `selftest-directory` step, and the eligibility preconditions. Suggested Data handling answers, each tied to [R2](#r2--behaviour-disclosure): no telemetry or analytics; spec data stays in the user's repository; network use is the npm registry at install and a loopback-only board; no credentials collected.

## R11 — Surface testing

As the PRD lists, plus what this investigation left open:

- AC2 (`--plugin-dir`): run `npm ci` in `plugins/specmanager` first; then open a document in the board and edit it, which covers the Milkdown path E9 did not click-test.
- AC3 (Cowork upload), record four observations: did `node_modules` get installed ([Q7](#q7--cowork-upload-and-the-native-install)); does the MCP server start; does the project root resolve without `SPECMANAGER_PROJECT_DIR` ([Q3](#q3--mcpjson-env)); does the board port arrive. If the install does not run, the server cannot start and D3's Cowork claim becomes an owner decision — it is not to be designed around.
- Portal Validate: confirm the holds are exactly the accepted list and whether `env` draws a finding.

## Agent chat removal

Decided by the owner (OD-1). Delete `server/src/agent-chat.ts` and `ui/src/ChatPanel.tsx`. In `server/src/board-server.ts` remove the import, the `ClientChat*` types, `handleClientMessage` and its websocket wiring, and `GET /api/chat/status`. In the UI remove the Chat toggle and column (`DocPanel.tsx`, `MarkdownEditor.tsx`, `MarkdownToolbar.tsx`), `fetchChatStatus` / `openChatSocket` (`api.ts`), the `chat.*` events and `ChatStatus` (`types.ts`), and the chat rules in `styles.css`. Drop the SDK from the root `package.json`, update `docs/DESIGN.md` line 88, rebuild both `dist` trees. No selftest references chat.

## Affected components

| Path | Change |
|---|---|
| `plugins/specmanager/README.md` | new |
| `plugins/specmanager/package.json`, `package-lock.json` | new |
| `plugins/specmanager/.mcp.json` | `env` reduced to the board port |
| `plugins/specmanager/hooks/hooks.json` | `Stop` only |
| `plugins/specmanager/hooks/stop-gate.sh` | unchanged (OD-2 / S1) |
| `plugins/specmanager/.claude-plugin/plugin.json` | `version`, port description |
| `plugins/specmanager/server/package.json`, `package-lock.json` | dev deps + scripts only; new script |
| `plugins/specmanager/server/tsconfig.json` | `sourceMap: false` |
| `plugins/specmanager/server/src/selftest-directory.ts` | new |
| `plugins/specmanager/server/dist/**` | rebuilt; 43 maps deleted |
| `plugins/specmanager/ui/vite.config.ts`, `ui/dist/**` | unminified per-package chunks |
| `README.md`, `CLAUDE.md` (outside the managed markers), `.gitignore` | contributor and install text |
| `docs/directory-submission.md` | new |
| chat files listed under [Agent chat removal](#agent-chat-removal) | deleted or edited (OD-1) |

Untouched: `server/src/core/**`, `mcp.ts`, `commands/`, `agents/`, `.claude-plugin/marketplace.json`.

## Data model changes

None. No schema, frontmatter, manifest or task-record change; no migration.

## Interfaces

No new MCP tool, REST route, event or `core` export. New surface is one npm script (`selftest-directory`) and the two config files in [R3](#r3--hook-and-mcp-commands). `GET /api/chat/status` and the `chat.*` websocket messages are removed (OD-1).

## Sequence / flow

- **End-user install:** Claude Code copies the plugin folder to its cache → sees root `package.json` + `package-lock.json` → `npm ci --ignore-scripts` (60 s cap) → session start runs `node <root>/server/dist/mcp.js` → imports resolve from `<root>/node_modules` → board boots in-process.
- **Contributor:** `npm ci` at the plugin root → build `server/` and `ui/` → `npm run selftest-directory` → commit.
- **Release:** bump `plugin.json` `version` → rebuild → `selftest-directory` → merge to `main` → directory rescans.
- **Suggested build order** (each step leaves the selftests green): conformance selftest first (red on `main`); root package files with `.mcp.json` and `hooks.json`; UI build config and map removal; manifest, README and docs; chat removal; surface tests.

## Failure & edge cases

- **Install times out or npm is missing:** the plugin still loads, the MCP server fails on a missing module, and the only sign is a warning in `claude --debug`. Handling is the README troubleshooting step; no code guard is added.
- **Lockfile out of step with `package.json`:** `npm ci` fails at install for every user. Assertion 9 catches it before push.
- **Version not bumped:** marketplace users silently stay on the old build ([Q9](#q9--marketplace-manifest-version)). Process rule only.
- **A dependency grows past 256 KiB as a single package chunk:** assertion 2 fails at build time; the remedy then is a targeted split, not designed now.
- **Host does not substitute or export variables:** one non-Claude-Code host observed on this machine passes `.mcp.json` env values through unsubstituted. Dropping `SPECMANAGER_PROJECT_DIR` removes that failure for the project root; the board port would fall to `NaN` there. Cowork's behaviour is unknown and is an R11 observation.
- **Stop-gate literals:** `stop-gate.sh` contains the strings `"npm "`, `"uv "`, `"cargo "` as match patterns, not invocations. Low risk of a naive launcher match.

## Conventions used

- Hand-rolled `selftest-*` scripts compiled to `dist/`, run by name; no test runner.
- TypeScript strict with `noUncheckedIndexedAccess` (the Vite snippet is written to pass it); ESM, Node 20+.
- Committed `dist/` is what ships; rebuild before committing.
- Project root resolved from env (`SPECMANAGER_PROJECT_DIR ?? CLAUDE_PROJECT_DIR ?? cwd`), never assumed.
- All mutation logic stays in `core/`; nothing is duplicated into hooks or entry points.
- Owner's standing rules: simplest design, no defensive code, delete before adding.

## Open questions / risks

**Owner decisions (2026-09-30)**

- **OD-1 — Agent chat: removed.** Install drops from 75 MB to 12 MB (E2 → E3), R4 AC6 is safe on slow links, the "Uses a credential from the user's machine" hold disappears, and R2 AC6 becomes a "makes no API calls" statement. The board loses its Chat column; the PRD records this as the one functional change conformance forces (D5).
- **OD-2 — Stop hook: S1.** `hooks/stop-gate.sh` is unchanged and its hold is accepted as A3 ([Q2](#q2--stop-hook-and-the-subfolder-rule); PRD D6).
- **OD-3 — React chunks: accepted.** The upstream-minified `react`, `react-dom` and `scheduler` chunks may draw a "code the scan can't read" hold, accepted as A4 ([Q5](#q5--ui-bundle); PRD D7). R5 AC2 is otherwise met.

**Unknown until surface testing or portal Validate**

- Whether a Cowork upload runs the native install ([Q7](#q7--cowork-upload-and-the-native-install)), and whether Cowork exports `CLAUDE_PROJECT_DIR`.
- Whether the validator inspects `.mcp.json` `env` ([Q3](#q3--mcpjson-env)) or objects to the quoted hook path ([R3](#r3--hook-and-mcp-commands)).
- Whether opening and editing a document works on the unminified build (E9 covered the board only).

**Observations, no action proposed**

- `ui/package.json` lists five CodeMirror packages that `ui/src` never imports; they are not in the bundle and are not installed for users.
- `selftest-prompts` reads `docs/agent-snippets/` outside the plugin folder. It is not run by a hook or the server, so the "files inside the plugin folder" rule does not apply, but it cannot run from an installed copy.
- The PRD's "no outbound network calls in server source" is true of the plugin's own code; the agent chat reaches the network through the SDK's child process (Q8).
