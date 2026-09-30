---
id: prd-anthropic-directory-submission-readiness-040
featureId: feat-anthropic-directory-submission-readiness
stage: prd
status: approved
stale: false
title: Anthropic directory submission readiness PRD
dependsOn: []
basedOn: {}
generatedBy: agent
version: 3
createdAt: '2026-09-30T10:05:29.292Z'
updatedAt: '2026-09-30T12:41:51.075Z'
---
## Problem

SpecManager is installable today only by people who already know the marketplace command (`/plugin marketplace add joanseg/specmanager`). The Anthropic plugin directory (claude.ai **Customize > Plugins > Discover**) is the discovery channel, and it gates listing behind portal validation plus a security scan on every commit of the tracked branch.

As of `main` on 2026-09-30 the plugin folder (`plugins/specmanager/`) would fail validation with two Blocking findings, raise four classes of reviewer hold, and show two Warnings. The owner cannot submit until the Blocking findings are gone, and each avoidable hold adds review delay on the first listing and again on every later version.

Requirement source: the Anthropic docs "Plugin pre-submission checklist", "Plugin feature support across platforms", "Publish to the directory", and "Node.js package dependencies" (in the plugin loading reference). This PRD cites their rules by name and does not restate them.

## Users and jobs-to-be-done

| User | Job |
|---|---|
| Plugin owner (Joan, sole maintainer) | Submit at claude.ai/directory/manage and get listed with the least reviewer friction; keep the listing green on every later commit without re-learning the rules. |
| Directory reviewer / security scan | Read what the plugin runs, installs, writes and opens, from the plugin-folder README and readable source. |
| New user finding SpecManager in the directory | Understand before installing what it does, where it works (and does not), and what it touches on their machine. |
| Existing user on the GitHub marketplace path | Keep installing and updating exactly as today. |
| Contributor / owner developing in place | Keep running the plugin from a local checkout. |

## Decisions already made (owner, this session)

- **D1 Scope:** remove every *avoidable* hold, not only the blockers.
- **D2 Layout:** the plugin stays at `plugins/specmanager/`. No move to repo root, no separate distribution repo. Portal "Plugin path" = `plugins/specmanager`.
- **D3 Surfaces:** Claude Code, and Cowork sessions running on the user's computer. Chat is explicitly unsupported (it ignores local MCP servers, agents and hooks). No chat-only skills.
- **D4 Version:** first directory release is `1.0.0` in `plugin.json`.
- **D5 Agent chat (2026-09-30):** remove the in-board agent chat and the `@anthropic-ai/claude-agent-sdk` dependency — conformance forces it (credential hold, 63 MB install).
- **D6 Stop hook (2026-09-30):** option S1 — leave `hooks/stop-gate.sh` unchanged and accept its hold as A3.
- **D7 React chunks (2026-09-30):** accept the three upstream-minified React chunks as a possible hold, A4.

## Goals

- G1. Portal **Validate** on the submitted commit reports zero Blocking findings and zero Warnings.
- G2. The only Policy holds remaining are the accepted residual holds (A1–A4 below).
- G3. The security scan finds no undisclosed behaviour: everything the plugin runs, installs, writes, opens or calls is described in the plugin-folder README and is readable in source.
- G4. A local conformance check catches regressions before they reach the tracked branch.
- G5. Existing install and in-place development paths keep working.

## Non-goals

- Moving the plugin to a repo root or a separate repo (D2).
- Supporting Chat, or adding skills so the plugin "does something" in Chat (D3).
- Submitting an MCP connector listing (SpecManager has no remote MCP server).
- Automating the portal submission, or handling any credentials.
- Pursuing the **Verified** label or directory placement (Anthropic decides both in review).
- Functional changes to the lifecycle, board or build pipeline beyond what conformance forces. The one forced exception is removing the in-board agent chat (D5).
- Rework of items already compliant on `main` (no work expected; the conformance check guards them): manifest `name` / `displayName` / `author` / `license: MIT`; no `bin/`; no tracked symlinks, submodules, LFS pointers, `.DS_Store`, `.npmrc`, `.gitattributes`; 184 tracked files (limit 512); repo 8.3 MiB and public; command and agent frontmatter valid; no outbound network calls in server source.

## Gap analysis (evidence from `main`, 2026-09-30)

| Id | Level | Finding |
|---|---|---|
| B1 | Blocks | No README inside the plugin folder (only the repo-root `README.md`). |
| B2 | Blocks | `SessionStart` hook command in `hooks/hooks.json` uses `${CLAUDE_PLUGIN_DATA}`, `cd`, shell chaining and an inline `npm install`. Subfolder plugins must write each hook/MCP command path in full from `${CLAUDE_PLUGIN_ROOT}` with no other variable, substitution or inline program. |
| H1 | Held | `ui/dist/assets/index-BEk9In3O.js` is 609 KiB (limit 256 KiB per non-image/font file) and minified. It is the only tracked file over the limit. 43 `.map` files are also tracked (all under `server/dist`). |
| H2 | Held | Package install run from a hook, unpinned, no lockfile at the plugin root. `package.json` / `package-lock.json` live in `server/` and `ui/` only. |
| H3 | Held (subfolder-only rule) | `hooks/stop-gate.sh` uses shell variables other than `${CLAUDE_PLUGIN_ROOT}`, command substitutions, and calls other plugin files (node resolver scripts). The MCP server is a non-shell (Node) file. |
| H4 | Held / scan | No plugin-folder README discloses: dependency install from the npm registry; the local board server bound to `127.0.0.1`; the Stop hook running the project's phase test command via `bash -lc`; writes into the target project's `CLAUDE.md`, `docs/DESIGN.md` and `.claude/specs/`; spawning the OS browser opener; the agent-chat use of `@anthropic-ai/claude-agent-sdk`. |
| W1 | Warning | `version` missing from `plugin.json`. |
| W2 | Warning (quality) | `board_port` userConfig description still says "(Phase 2+)". |

Also observed while drafting (not in the original gap list; see Q3, Q4): `.mcp.json` `env` references `${CLAUDE_PLUGIN_DATA}` (`NODE_PATH`) and `${user_config.board_port}`; the `FileChanged` hook command is an inline `echo` with no plugin path.

## Accepted residual holds

A hold is **not** a rejection: the owner can submit, and a reviewer reads the held version before it goes live. The scan can raise the same hold again on each new version. A1 and A2 cannot be removed under D2; A3 and A4 were accepted by the owner on 2026-09-30 (D6, D7):

- **A1 "Dependencies install from a lockfile".** Always reviewer-checked (checklist, "Choices a reviewer always checks"). It replaces the avoidable hook-install hold H2.
- **A2 "Scripts the validator couldn't follow" for the Node MCP server file.** Applies whenever the plugin folder is a repo subfolder and a hook or server command runs a non-shell file; it only goes away at the root of the plugin's own repo, which D2 declines.
- **A3 "Scripts the validator couldn't follow" for the Stop hook.** Covers `hooks/stop-gate.sh` and the two Node shims it calls (`server/dist/resolve-active-card.js`, `server/dist/set-phase-blocked.js`). No design avoids it in a subfolder plugin while keeping the gate's behaviour (D6).
- **A4 Upstream-minified React chunks.** The `react`, `react-dom` and `scheduler` chunks in `ui/dist` are React 18's pre-minified production builds and may be held as code the scan can't read (D7).

Any other hold in the Validate report is a defect against G2 unless the owner explicitly adds it to this list.

## Requirements

**R1. Plugin-folder README.** `plugins/specmanager/README.md` exists.
- AC1: at least 40 words outside code blocks.
- AC2: covers what the plugin does, how to use it (install + the `/specmanager:*` commands), and what data it sends.
- AC3: states supported surfaces per D3 and says plainly that Chat is unsupported and why.
- AC4: bundled images, if any, use Markdown image syntax only; no image/font path in backticks or code blocks.

**R2. Behaviour disclosure (H4).** The R1 README names each of the following, in plain language:
- AC1: dependencies are installed from the npm registry at plugin install time, from a lockfile.
- AC2: a local board web server starts, bound to `127.0.0.1`, no auth, on the preferred port with fall-forward.
- AC3: the Stop hook runs the project's phase test command via `bash -lc` during an in-flight build.
- AC4: the plugin writes to the target project's `CLAUDE.md` (managed markers only), `docs/DESIGN.md` and `.claude/specs/`.
- AC5: it spawns the OS browser opener to show the board.
- AC6: the README states the plugin makes no model or API calls of its own.
- AC7: a "data the plugin sends" statement consistent with the portal Data handling answers (R10).

**R3. Hook and MCP commands follow the subfolder path rule (B2).**
- AC1: every hook command and the MCP server command writes each path in full from `${CLAUDE_PLUGIN_ROOT}`; no other variable, command substitution, wildcard, `cd`, chaining or inline program.
- AC2: no hook, and no script a hook or the MCP server runs, performs a package install or uses a package launcher.
- AC3: the MCP server is still started by running a plugin file with plain arguments (no shell, no `npm run`).
- AC4: `hooks/hooks.json` stays valid and is not referenced from `plugin.json`.

**R4. Dependencies install natively from a lockfile (H2).**
- AC1: `package.json` and `package-lock.json` sit at the plugin root, so Claude Code's native install (`npm ci --ignore-scripts`) provides the server's runtime dependencies.
- AC2: `package.json` and the lockfile agree (frozen resolution does not fail).
- AC3: no dependency needs a lifecycle script to work at runtime (`--ignore-scripts`).
- AC4: no `.npmrc`, `bunfig.toml`, `uv.toml` or other package-source config in the plugin folder.
- AC5: the MCP server and board start after a clean native install with no hook-driven install step.
- AC6: the install completes inside the 60-second native timeout on a typical connection (see Q1).

**R5. File limits and readable code (H1).**
- AC1: no file in the plugin folder that is not an image or font exceeds 256 KiB.
- AC2: shipped UI code is readable (not minified or packed), except the A4 chunks.
- AC3: the plugin folder holds 512 files or fewer after the change.
- AC4: only text files, complete PNG/JPEG/GIF/WebP images and fonts are tracked; no `.ico`, `.pdf`, `.zip` or compiled executable.
- AC5: the board UI still loads and works from the shipped `ui/dist`.
- AC6: the 43 tracked `.map` files are either removed or kept by an explicit Architecture decision (Q5).

**R6. Stop hook raises no avoidable hold (H3).**
- AC1: the Stop hook is unchanged; its hold is accepted as A3.
- AC2: Stop-gate behaviour is unchanged: no-op outside an in-flight build, session-scoped, phase test command + all-tasks-`done` check, iteration cap N=3 surfacing `blocked`. `selftest-stopgate` still passes.
- AC3: discharged by D6 — avoiding the hold proved infeasible without losing AC2 (Architecture Q2 states why), and the owner extended the accepted list with A3. Behaviour wins over the hold.

**R7. Manifest (W1, W2, D4).**
- AC1: `plugin.json` has `"version": "1.0.0"`.
- AC2: the `board_port` description no longer says "(Phase 2+)" and describes the preferred-port behaviour.
- AC3: `board_port` keeps a default (Cowork does not prompt for `userConfig` values and ignores a server whose referenced option has no default).
- AC4: `claude plugin validate plugins/specmanager` prints validation passed.
- AC5: the release discipline "raise `version` with every release" is written down where the owner will see it at release time.

**R8. Local conformance selftest.** A new selftest under `plugins/specmanager/server`, in the existing hand-rolled `selftest-*` style, runnable by name via `npm run`.
- AC1: asserts README present with at least 40 words outside code blocks.
- AC2: asserts no non-image/font file over 256 KiB.
- AC3: asserts 512 files or fewer.
- AC4: asserts no disallowed binary types.
- AC5: asserts `version` is set in `plugin.json`.
- AC6: asserts the hook/MCP command path rule (R3 AC1).
- AC7: asserts no system files (`.DS_Store`, `Thumbs.db`, `desktop.ini`, `__MACOSX`).
- AC8: each assertion fails with a message naming the offending file or field; the check fails against today's `main` and passes after this feature.
- AC9: it evaluates what ships (tracked files), not local untracked artefacts such as `node_modules`.
- AC10: documented alongside the other selftests as the pre-push check, because the directory rescans every commit on the tracked branch.

**R9. Existing paths keep working.**
- AC1: `/plugin marketplace add joanseg/specmanager` then `/plugin install specmanager@specmanager` yields a working MCP server and board on a machine with no prior install.
- AC2: an existing install updates to 1.0.0 without manual cleanup.
- AC3: in-place / local-directory development works; because native dependency install does not run for in-place plugins, the manual dependency step is documented for developers.
- AC4: all existing selftests and `smoke-mcp` still pass.

**R10. Portal submission checklist (out of band, manual).** A short owner checklist, kept in the repo outside the plugin folder, covering in order: connect GitHub; Source (repo `joanseg/specmanager`, branch `main`, Plugin path `plugins/specmanager`); Validate / Re-validate; Listing details; Data handling; Compliance; Submit for review; Publish.
- AC1: includes suggested Data handling answers, each traceable to a fact in R2 (draft: no telemetry or analytics; spec data stays in the user's repo; network use limited to the npm registry at install — to be verified in Architecture before the owner uses them).
- AC2: states the accepted holds A1–A4 so the owner recognises them in the report.
- AC3: contains no credentials and no automation.
- AC4: notes the eligibility preconditions (paid plan; the first organisation to submit a repo folder owns the listing).

**R11. Surface testing before submit.**
- AC1: `claude plugin validate plugins/specmanager` passes.
- AC2: `claude --plugin-dir plugins/specmanager` session: MCP tools register, board opens, one `/specmanager:*` command runs.
- AC3: Cowork, session on the user's computer: upload a zip of the plugin folder; MCP server loads, commands run as `/specmanager:<command>`, hooks and agents load.
- AC4: results are recorded in the feature's walkthrough.

## Success metrics

- Validate report on the submitted commit: 0 Blocking, 0 Warning, Policy holds limited to A1–A4.
- First submission passes the security scan (a failed first scan is a rejection, not a hold).
- The R8 selftest is green on the submitted commit and on every later commit to `main`.
- No regression reports from the GitHub-marketplace install path after 1.0.0.

## Constraints and assumptions

- Native install runs `npm ci --ignore-scripts`, only when `package.json` and a lockfile are at the plugin root, with a 60-second timeout, and not for in-place local-directory marketplace plugins.
- People who install get only the plugin folder; everything the plugin runs must be inside it.
- The directory follows the tracked branch and scans each new commit; a flagged later version can be held or fail to go live.
- Portal validation is the only authority on directory rules; `claude plugin validate` checks syntax and schema only, and the R8 selftest is a local approximation of the mechanically checkable rules.
- A complete README does not make a behaviour allowed; the Anthropic Software Directory Policy still applies.
- Assumption: the owner's claude.ai account is on an eligible plan and no other organisation has submitted this repo folder.
- Assumption: the committed `dist/` remains what ships (no build step for end users).

## High-level user flows

- **Owner, pre-submit:** build, run the conformance selftest, run R11 surface tests, push to `main`.
- **Owner, submit:** follow the R10 checklist in the portal; on Blocking findings, fix, push, Re-validate; on holds, confirm they are only A1–A4; submit; publish when approved.
- **Owner, later releases:** bump `version`, run the conformance selftest, merge to `main`; the directory rescans.
- **New user:** finds SpecManager in Discover, reads the README (surfaces, disclosures), installs; dependencies install natively; first session brings up the MCP server and board.
- **Developer in place:** clone, install dependencies manually per the documented step, run with `--plugin-dir` or a local-directory marketplace.

## Open questions (for Architecture unless noted)

**Resolved:** Q1–Q9 are answered in Architecture `arch-anthropic-directory-submission-readiness-026` (sections Q1–Q9); the owner decisions that followed are D5–D7 above. Q7 and the `env` part of Q3 are answered as "unknown — verify" and close in R11 surface testing / portal Validate. The questions are kept below for reference.

- **Q1 (resolved — see Architecture Q1).** Does `npm ci` of the server's runtime dependencies, including `@anthropic-ai/claude-agent-sdk`, finish inside the 60-second native timeout on a cold cache? If not, what is the fallback that does not reintroduce a hook install?
- **Q2 (resolved — see Architecture Q2).** Can the Stop hook keep its current behaviour (R6 AC2) with no shell variables, command substitutions or calls to other plugin files? If not, it collapses into the same finding as A2 and the owner must accept it explicitly. (Owner decision once Architecture reports.)
- **Q3 (resolved — see Architecture Q3).** Do `${CLAUDE_PLUGIN_DATA}` and `${user_config.board_port}` in `.mcp.json` `env` (not in `command`/`args`) trigger the path rule? `NODE_PATH` should become unnecessary under R4; confirm and remove.
- **Q4 (resolved — see Architecture Q4).** Is the `FileChanged` hook's inline `echo` acceptable under the path rule, or must it change or go?
- **Q5 (resolved — see Architecture Q5).** Can the UI bundle be split into readable (unminified) chunks each under 256 KiB while keeping the board working and the file count under 512? Should the 43 `.map` files be dropped?
- **Q6 (resolved — see Architecture Q6).** Where must the single root `package.json` / lockfile live relative to `server/` and `ui/` so both the native install and the existing build scripts work, and the UI's dev dependencies are not installed for end users?
- **Q7 (answered, to verify in R11 — see Architecture Q7).** Does a Cowork zip upload run the native dependency install? If not, R11 AC3 needs a defined expectation.
- **Q8 (resolved — see Architecture Q8).** Exactly what network traffic does the agent-chat path generate (destination, credentials used)? Needed for R2 AC6 and the R10 Data handling answers.
- **Q9 (resolved — see Architecture Q9).** Does the marketplace manifest (`.claude-plugin/marketplace.json`) carry a version that must stay in step with `plugin.json`?
