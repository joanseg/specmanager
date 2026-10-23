---
id: prd-cowork-support-041
featureId: feat-cowork-support
stage: prd
status: draft
stale: false
title: Cowork support PRD
dependsOn: []
basedOn: {}
generatedBy: agent
version: 1
createdAt: '2026-09-30T15:33:36.410Z'
updatedAt: '2026-09-30T15:33:36.410Z'
---
## Problem

SpecManager 1.0.1 ships to the Anthropic plugin directory as **Claude Code only** (owner decision, 2026-09-30); `plugins/specmanager/README.md` "Where it works" says Cowork is not supported. People who find the listing from claude.ai or the desktop app and install it into Cowork get the commands (shown as `/specmanager-<name>`) and nothing behind them: no SpecManager tool is available, so every command fails. The portal works out supported surfaces itself and may list Cowork anyway (`docs/directory-submission.md` section 4, step 8), which makes the dead end more likely.

Three uploads to Cowork on the owner's Mac on 2026-09-30 found three separate causes. The full record, with the desktop app's log lines, is `docs/directory-submission.md` section 3(b); this PRD cites it and does not replace it.

| Test | Zip | What happened |
|---|---|---|
| T1 | Shipped `1.0.0`, commit `f00d3f0` | Commands loaded; no tool available. Log (`~/Library/Logs/Claude/main.log`): `server "specmanager": config references plugin user configuration (board_port) — user_config is not supported on the desktop host bridge; dropping server`. The reference is `${user_config.board_port}` in `.mcp.json`; the option has a default. |
| T2 | `1.0.0-cowork-test.1` (never committed): that reference removed | Server no longer dropped; three start attempts, each `Failed to connect to plugin:specmanager:specmanager: Connection closed`. The downloaded copy (under `~/Library/Application Support/Claude/local-agent-mode-sessions/…/rpm/`) had all 228 files and no `node_modules`; by hand: `ERR_MODULE_NOT_FOUND: Cannot find package '@modelcontextprotocol/sdk'`. The desktop app does not install a plugin's Node dependencies. |
| T3 | `1.0.0-cowork-test.2` (never committed): server bundled by esbuild into single files (`mcp.js` 2.8 MB unminified, plus the two Stop-hook Node scripts), no `user_config` reference | `Connected to plugin:specmanager:specmanager (28 tools)`, then every tool failed. The live process had `CLAUDE_PLUGIN_ROOT` and nothing else (no `CLAUDE_PROJECT_DIR`, no `CLAUDE_PLUGIN_DATA`), working directory `/`, so it tried to create `/.claude`. The app started the server when the plugin synced, before any Cowork session or folder existed: one server process for the app, not one per project. |

Also observed: the T3 zip worked end to end in Claude Code via `claude --plugin-dir <zip>` with no install step. In Cowork the session's own shell commands run in a separate workspace with the user's folder mounted, while the MCP server runs on the Mac itself.

**Nothing beyond "Cowork is a separate, later feature" has been decided.** Scope, priority and approach are open; this PRD lists them as owner questions (OQ) and does not settle them.

## Users and jobs-to-be-done

| User | Job |
|---|---|
| Person who finds SpecManager in the directory from claude.ai / the desktop app and works in Cowork | Install it and run the lifecycle (init, draft documents, open the board) in the folder their Cowork session is working in. |
| Existing Claude Code user (directory or GitHub marketplace install) | Keep everything working as today, including the board port preference if they set one. |
| Plugin owner (Joan, sole maintainer) | Decide whether and how far to support Cowork; run one acceptance test that proves it; keep the directory listing green. |
| Directory reviewer / security scan | Read what ships; see README, portal answers and behaviour agree. |

## Goals

- G1. In a Cowork session running on the user's computer, SpecManager tools work against the folder that session is working in.
- G2. Claude Code behaviour does not regress.
- G3. The plugin runs with no install step on any surface.
- G4. The directory listing stays conformant: zero Blocking, zero Warning, no new class of hold.
- G5. README, portal Data handling answers and actual behaviour say the same thing about Cowork.

## Non-goals

- Chat on claude.ai stays unsupported (it does not load local MCP servers, agents or hooks). No chat-only skills.
- No install hook or other workaround that fetches dependencies at runtime (`docs/directory-submission.md` 3(b): "Do not add an install hook or any other workaround").
- No move of the plugin out of `plugins/specmanager/` (D2 of `prd-anthropic-directory-submission-readiness-040`).
- Proposed, owner to confirm (OQ2, OQ6): Cowork sessions that do not run on the user's computer; Cowork on Windows or Linux (all evidence is from one Mac).

## What Cowork support appears to need

All three are needed for G1. **Requirement R3 is the large, risky part.** It changes load-bearing invariants and its feasibility depends on facts nobody has tested. **R2 has clear value for Claude Code on its own; R1 is small but has a cost there** (see "Phasing").

| Need | Requirement | Size / risk |
|---|---|---|
| No `${user_config.*}` reference in `.mcp.json` | R1 | Small. Cost: Claude Code users lose the `board_port` setting unless the port reaches the server another way. |
| A server that runs with no install step | R2 | Medium. The T3 bundle proves it runs, but its 2.8 MB `mcp.js` is over the directory's 256 KiB per-file limit, so it cannot ship as built. |
| The server learns the project folder per session, not from the environment | R3 | Large, risky. Touches "Resolve the project root from the env", the board server, per-project pidfiles and the CLAUDE.md / DESIGN.md auto-sync, which all assume one project per server process. Feasibility unknown (AQ1). |

## Requirements

**R1. No plugin user configuration in `.mcp.json`.**
- AC1: `plugins/specmanager/.mcp.json` contains no `${user_config.*}` reference.
- AC2: after a Cowork upload, the desktop app log has no `dropping server` line for `specmanager`.
- AC3: the owner's decision on OQ3 (what happens to `board_port`) is implemented, and `plugin.json` `userConfig`, the README and `selftest-autoport` agree with it.
- AC4: with no port configured anywhere, the board still prefers 4317 and falls forward to the next free port.

**R2. The server and hook scripts run with no install step.**
- AC1: from a clean copy of the shipped files (`git archive … HEAD:plugins/specmanager`), with no `node_modules` and no network, `node server/dist/mcp.js` starts and `smoke-mcp` passes against it.
- AC2: the same holds for the two Node scripts the Stop hook runs (`server/dist/resolve-active-card.js`, `server/dist/set-phase-blocked.js`); `selftest-stopgate` passes from that copy.
- AC3: `claude --plugin-dir <zip of the shipped files>` registers every tool with no manual `npm` step (today: 0 tools).
- AC4: shipped files stay inside the directory limits: every non-image/font file under 256 KiB, at most 512 files (228 today), readable unminified code. `selftest-directory` passes.
- AC5: the zip stays inside Cowork's upload limits (5,000 files, 200 MB).
- AC6: no hook, and nothing a hook or the server runs, installs packages or uses a package launcher.
- AC7: the plugin-root `package.json` and lockfile are either gone or no longer needed at runtime (AQ7); the README's "Installs dependencies" bullet, "Requirements" (`npm` on `PATH`) and the Troubleshooting entry for a failed install are rewritten to match.
- AC8: the board UI still loads and works from the shipped `ui/dist`.

**R3. The project folder is resolved per session.**
- AC1: in a Cowork session on the user's computer, every SpecManager tool reads and writes under the folder that session is working in, on the user's Mac.
- AC2: `specmanager_init` in that session creates `.claude/specs/`, the managed block in `CLAUDE.md` and `docs/DESIGN.md` in that folder and nowhere else.
- AC3: when the server cannot determine the folder, every tool fails with a message that says so and says what to do. It never writes to `/`, the home directory, the plugin folder, or another project.
- AC4: writes stay contained to the resolved project root (the existing `assertInsideRoot` guarantee holds per project).
- AC5: two Cowork sessions in different folders never write into each other's folder. Whether both can work at the same time, or the second gets a clear refusal, is OQ5.
- AC6: the CLAUDE.md / DESIGN.md auto-sync writes only into the project whose document or status changed.
- AC7: in Claude Code the project root resolves exactly as today (`SPECMANAGER_PROJECT_DIR` ?? `CLAUDE_PROJECT_DIR` ?? cwd), one server per session, with no new prompt or step for the user.
- AC8: the repo-root `CLAUDE.md` invariants that change ("Resolve the project root from the env", per-project pidfiles, one board per server) are rewritten in the same release.

**R4. The board works from a Cowork session.**
- AC1: the board command returns a real `http://127.0.0.1:<port>` address and the board opens in the user's browser showing the session's project.
- AC2: an edit saved in the board lands in that project's `.claude/specs/` files.
- AC3: `board_url` / `open_board` keep returning `available:false` / null rather than a fabricated address when no board is up for that project.
- AC4: the pidfile works without `CLAUDE_PLUGIN_DATA` (absent in Cowork), and one project's board is never terminated on behalf of another project.

**R5. Commands, agents and the Stop hook in Cowork.** Depends on OQ2 (how much of the lifecycle Cowork supports).
- AC1: every command inside the scope chosen in OQ2 runs in Cowork under the name Cowork shows (`/specmanager-<name>`); text in commands and agents that tells the user or Claude to run `/specmanager:specmanager-<name>` does not mislead there.
- AC2: each part of the plugin outside that scope (for example build and the Stop gate, if excluded) is named in the README as not supported in Cowork, and fails with a clear message rather than half-working.
- AC3: the Stop hook never blocks a Cowork session it has no in-flight build for (the existing no-op rule holds when `CLAUDE_PROJECT_DIR` and the session id are missing).

**R6. Claude Code does not regress.**
- AC1: all 15 scripts pass (`selftest-directory` plus the 14 listed in `docs/directory-submission.md` section 3).
- AC2: `docs/directory-submission.md` tests 3(a) and 3(c) pass: folder load, fresh marketplace install, update of an existing install with no manual cleanup.
- AC3: two Claude Code sessions in different projects still get two boards on distinct ports; same-project sessions still share one pidfile.
- AC4: session-scoped Stop-gate behaviour is unchanged.
- AC5: an existing install that has `board_port` set behaves as OQ3 decides, and the README says what happened to the setting.

**R7. Cowork end-to-end acceptance test (owner-run, manual).** Replaces the table in `docs/directory-submission.md` section 3(b).
1. `git archive --format=zip -o ~/Desktop/specmanager-plugin.zip HEAD:plugins/specmanager` (add `--prefix=specmanager/` if Cowork refuses the zip).
2. Desktop app: **Customize > Plugins > Add > Upload plugin**, choose the zip.
3. Start a Cowork session that runs on your computer, in an empty scratch folder.
4. Ask Claude to list SpecManager features.
5. Run the init command.
6. Run the board command.

- AC1 (step 2): the log shows `Connected to plugin:specmanager:specmanager (<n> tools)` with the same tool count as Claude Code, and no `dropping server` or `Connection closed` line.
- AC2 (step 4): Claude calls a SpecManager tool and gets an answer (an empty list or a clear "not initialised" message, not an error about `/.claude`).
- AC3 (step 5): `.claude/specs/`, `CLAUDE.md` and `docs/DESIGN.md` appear in the scratch folder on the Mac, and nothing is created at `/`, in the home directory or in the plugin's downloaded copy.
- AC4 (step 6): the board opens at `http://127.0.0.1:4317` or the next free port and shows that project.
- AC5: create a feature, then edit and save a document in the board; the change is in the scratch folder's files.
- AC6: repeat steps 3 to 6 in a second scratch folder without restarting the app; the result matches the OQ5 decision and the first folder is untouched.
- AC7: the filled results are copied into this feature's walkthrough.

**R8. Directory re-verification.** Before the release that claims Cowork reaches `main`:
- AC1: `selftest-directory` passes, including any assertion it needs for the new shape (no `user_config` reference in `.mcp.json`; lockfile assertions changed if the lockfile goes).
- AC2: `claude plugin validate plugins/specmanager` prints `✔ Validation passed` with no warning.
- AC3: README "Where it works" states what Cowork supports (per OQ2) and that Chat is unsupported; "What this plugin does on your machine" matches the new install and state-file behaviour.
- AC4: `docs/directory-submission.md` section 6 Data handling answers are re-checked: the free-text fact about npm downloads at install is removed if it is no longer true; the "Cowork" caveat (spec files kept anywhere other than a folder on the user's own computer) is answered from the R7 result.
- AC5: `docs/directory-submission.md` is updated: section 3(b) no longer says "skip", its command-name line reads `/specmanager-<name>`, section 5 drops hold A1 if the lockfile install is gone, and the section 5 unknown about `env` in `.mcp.json` is closed if the entry is removed.
- AC6: `version` in `plugin.json` is raised; portal **Re-validate** on the pushed commit shows zero Blocking, zero Warning, and no hold outside the accepted list.

## Phasing (owner decision, OQ1)

- **R2 alone** helps Claude Code: no npm download at install, no 60-second install timeout to miss, no `npm` requirement, `--plugin-dir <zip>` works, and the "Dependencies install from a lockfile" hold (A1) goes away.
- **R1 alone** gives Claude Code little: it closes the unchecked portal question about `env` in `.mcp.json`, at the cost in OQ3. Its value is mostly as a Cowork precondition.
- **R1 + R2 without R3** moves Cowork from "no tools" to "tools connect, then every one fails" (T3). That is not Cowork support; the README must keep saying "not supported" until R3, R4 and R7 pass.
- **R3** may turn out not to be achievable with what the desktop app offers today (AQ1). A short investigation of AQ1 to AQ4 before committing to it would bound the risk.

## Success metrics

- R7 passes on the owner's Mac, every AC.
- All 15 selftests pass; 3(a) and 3(c) pass.
- Portal Validate on the release commit: 0 Blocking, 0 Warning, holds limited to the accepted list (A2 to A4, and A1 only if the lockfile install stays).
- A clean install makes no network request.
- No regression report from Claude Code users after the release.

## Constraints and assumptions

- Directory rules as recorded in `prd-anthropic-directory-submission-readiness-040` (R3, R5, R8) and its Architecture `arch-anthropic-directory-submission-readiness-026` still apply: subfolder path rule for hook and MCP commands, 256 KiB per file, 512 files, readable code, only `${CLAUDE_PLUGIN_ROOT}` in commands.
- The committed `dist/` is what ships; users get only the plugin folder.
- The desktop app's behaviour was observed once, on one Mac, on 2026-09-30, and is not documented as observed (dropping a server whose `user_config` option has a default is stricter than the platform-support table). It may change between app versions.
- Gate enforcement, staleness, frontmatter authority and optimistic concurrency stay in `core` and are not changed by this feature.
- Assumption: a Cowork session on the user's computer works in one folder that exists on the Mac's own disk, so files the host-side server writes are the files the session sees through its mount. Not verified (AQ3).
- Assumption: bundling puts third-party dependency code into shipped files the security scan reads directly. `npm ci` reports 11 audit advisories (1 low, 3 moderate, 7 high) that nobody has examined.

## High-level user flows

- **Cowork user:** installs from the directory (or uploads a zip); starts a session in a project folder; runs init; drafts a PRD; opens the board in the browser; edits and approves there; the files are in the folder.
- **Cowork user, second project:** starts another session in another folder; behaviour per OQ5.
- **Cowork user, folder unknown to the server:** gets a message naming the problem and the next step; nothing is written.
- **Claude Code user:** installs or updates; no dependency download; everything else as today.
- **Owner, release:** rebuild, 15 selftests, `claude plugin validate`, 3(a), R7, push, Re-validate, update README and portal answers together.

## Open questions for the owner

- **OQ1 Phasing.** (a) One release with R1 to R8. (b) Release R2 (and optionally R1) first for Claude Code, R3 to R5 later. (c) Investigate AQ1 to AQ4 first, then choose. (d) R2 only and leave Cowork unsupported.
- **OQ2 Cowork scope.** (a) Spec authoring only: init, interview, PRD, architecture, design, plan, board. (b) Full lifecycle including build, the Stop gate, reviewer and walkthroughs. Build edits code and makes git commits from the session's shell, which in Cowork is a separate workspace.
- **OQ3 `board_port` in Claude Code.** (a) Remove the setting; the board always prefers 4317 and falls forward. (b) Keep a way to set the port that does not go through `.mcp.json` `user_config` (Architecture to propose). (c) Keep `user_config` for Claude Code and ship something different to Cowork, if that is possible at all.
- **OQ4 Priority.** Where this sits against the other open features; no priority has been set.
- **OQ5 Several Cowork sessions.** Must one app-wide server serve sessions in different folders at the same time, or is "one project at a time, clear refusal for the second" acceptable for a first release?
- **OQ6 Platforms.** Is macOS enough for the Cowork claim, or must Windows be tested first?
- **OQ7 Audit advisories.** Examine the 11 advisories before shipping dependency code inside the plugin, or accept as is?

## Open questions for Architecture

Not tested on 2026-09-30, so unknown:

- **AQ1.** Does the desktop app's MCP client offer MCP roots, or any other way (request metadata, a tool argument supplied by the host, a notification) for the server to learn the session's folder? If none, what does R3 fall back to, and is that acceptable under R3 AC3?
- **AQ2.** Do agents and the Stop hook run in Cowork at all? If the hook runs, where (host or session workspace), and with which environment and stdin (`session_id`)? The active-build marker records `CLAUDE_CODE_SESSION_ID` from the server's environment, which T3 shows is absent in Cowork.
- **AQ3.** Is the board opened by the host-side server reachable and useful from a Cowork session? Does the path the session's workspace sees for the mounted folder match the path on the Mac, and which one does the server receive?
- **AQ4.** Can one server process serve several Cowork sessions in different folders at once? How does it tell sessions apart? What does that do to the board (one per project, or one for all), the pidfile, the file watcher and the auto-sync listeners?
- **AQ5.** How is the server bundled so every output file is under 256 KiB, unminified, readable, and the total stays under 512 files? The T3 single file is 2.8 MB. Does a bundled server change hold A2 or how many files it lists?
- **AQ6.** Does bundling keep `selftest-prompts` and the other selftests runnable, and does the committed-`dist`-equals-fresh-build check still hold?
- **AQ7.** With a self-contained server, do the plugin-root `package.json` and lockfile go entirely (removing A1 and the npm download), or stay for development only? If they stay, does Claude Code still run the native install?
- **AQ8.** If OQ3 is (b): how does a port preference reach the server in Claude Code without `${user_config.*}` in `.mcp.json`? The earlier Architecture found that no `CLAUDE_PLUGIN_OPTION_*` variable reaches the process.
- **AQ9.** Where do the pidfile and other state files go when `CLAUDE_PLUGIN_DATA` is absent, and is the current fallback (system temporary directory) right for an app-wide server?
- **AQ10.** When is the server started and stopped in Cowork (it started at plugin sync, before any session)? Does the board's lifetime still match "starts and stops with each Claude session", as the README says?
- **AQ11.** Does the portal validator object to `env` in `.mcp.json`? Still unanswered from `docs/directory-submission.md` section 5; R1 makes it moot only if the whole entry goes.
