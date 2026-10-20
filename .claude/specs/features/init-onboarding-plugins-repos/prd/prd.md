---
id: prd-init-onboarding-plugins-repos-045
featureId: feat-init-onboarding-plugins-repos
stage: prd
status: approved
stale: false
title: 'Init onboarding: plugins & repos PRD'
dependsOn: []
basedOn: {}
generatedBy: agent
version: 2
createdAt: '2026-10-20T15:40:49.957Z'
updatedAt: '2026-10-20T18:18:19.633Z'
---
## Problem

`/specmanager-init` (`plugins/specmanager/commands/specmanager-init.md`) today calls `specmanager_init` (optional `repoPaths`), runs native `/init`, and reports. It leaves out two things a new user needs, and the managed block it writes has a bug:

1. **Recommended plugins are invisible.** SpecManager's agents run better with companion plugins, but they all *detect-then-defer* and degrade silently when one is missing. The builder hands off to Superpowers (TDD, systematic-debugging, two-stage review) and `frontend-design` (`agents/builder.md`, "Skill leverage"). The designer defers to `frontend-design` (`agents/designer.md`). The reviewer drives UI checks with "the session's browser MCP tools" and otherwise judges from the diff (`agents/reviewer.md` step 4). The repo standard "Use latest APIs" is what context7 serves. A user who never installs these gets the weaker flow and is never told.
2. **Multi-repo is opt-in by argument only.** Sibling repos are declared only when the user already knows to pass paths (`/specmanager:specmanager-init /path-1 /path-2`, handled by `server/src/core/repos.ts`). Nothing prompts for them, and init does not show which repos are already declared.
3. **The stage label in the managed CLAUDE.md block is wrong (proven bug).** `currentStage` is written once as `"prd"` at feature creation (`server/src/core/features.ts:75`) and nothing advances it. All 39 features in `list_features` have `currentStage: "prd"`. `currentStageLabel` (`server/src/core/claude-md.ts:57-67`) reads that field, so the table shows "PRD (approved)" even after a feature's Plan is approved. `notesFor` (`claude-md.ts:43`, `currentStage === "plan"`) never runs for the same reason. Init writes this block, so new users see it first.

## Users

- **New SpecManager user setting up a project.** Job: get to a working setup in one command, with the companion plugins the agents expect and every repo this instance should see.
- **Existing user re-running init.** Job: check for missing recommended plugins, add more sibling repos, see what is already declared, all without losing earlier mirrors (re-runs already reconcile write-if-absent).
- **Anyone reading the managed CLAUDE.md block, human or agent.** Job: trust the "Current stage" column when deciding what to do next. CLAUDE.md tells agents to "read the approved doc for a feature's stage before implementing", so a wrong label sends them to the wrong doc.

## Goals

- **G1. Detect plugins.** Init finds out which plugins are installed in the session and compares them with a curated recommended list.
- **G2. Offer installs, never force them.** Init lists each missing recommended plugin with a one-line reason tied to the agent that uses it, asks which ones to install, and installs only those, using `claude plugin install <name>@<marketplace>` run by Claude in the session. Nothing is installed silently.
- **G3. Guide repo declaration.** When init runs without path arguments, it lists the repos already declared, asks whether this instance should work with other repos, collects absolute paths, and passes them as `repoPaths`. Path arguments, when given, behave as today.
- **G4. Fix the stage label.** The managed block's stage label comes from the furthest lifecycle stage that has a doc, not from the stale `currentStage` field, and `notesFor`'s plan-stage note works again. This is a task in this feature.
- **G5. Report everything.** Init's report also covers plugins that were found, offered, installed or declined (with any install failures), and repos that were declared.

## Non-goals

- The server installing plugins, or contacting a network or model. The constraint is "No model or API calls from the plugin": the server only touches the local filesystem and `127.0.0.1`.
- Install hooks or any packaging change that installs plugins automatically. The Anthropic directory scans releases and blocks these.
- Making any agent *require* a companion plugin. Detect-then-defer and graceful degradation stay exactly as they are.
- Copying any companion plugin's content into this repo.
- Cowork support. Cowork is not supported; see `feat-cowork-support`.
- Board or UI changes. Init is a slash-command and MCP flow in the Claude session, and no board screen changes.
- Changing how `repos.ts` validates or seeds repos: the read grant, write-inside-meta-root, write-if-absent, and conflict rejection stay as they are.
- Removing or migrating the `currentStage` field itself. G4 only changes where the label comes from (see Q5).

## Recommended plugin list (assumption: researched and justified)

The list is grounded in what SpecManager's agents actually call. Names below are from `claude-plugins-official`, checked against the owner's `claude plugin list` on 2026-10-20.

| Plugin | Used by | Why recommend | Without it |
|---|---|---|---|
| `superpowers@claude-plugins-official` | builder | TDD, systematic-debugging and two-stage-review hand-offs (execution discipline only) | plain execution loop |
| `frontend-design@claude-plugins-official` | builder (UI tasks), designer | visual-judgment hand-off, still grounded in `docs/DESIGN.md` tokens | DESIGN.md-only / distilled fallback |
| `context7@claude-plugins-official` | all writers and builder | current library docs, in line with the "use latest APIs" convention | model memory only |
| `playwright@claude-plugins-official` | reviewer UI check (web) | browser MCP tools to drive the happy path | reviewer judges from the diff and says so |

- The browser tool is an assumption. The reviewer only asks for "the session's browser MCP tools". chrome-devtools MCP works too, but it is configured as an MCP server, not a plugin in this marketplace (see Q2). Init recommends one browser option, not both.
- Only the builder has an explicit `tools:` allowlist, and it already includes `Skill`. That is what lets Superpowers and `frontend-design` hand-offs fire at all (see `docs/verification/prompt-simplification-ledger.md`). This feature does not change agent tool lists.
- Leaving the list out: `code-review`, `feature-dev`, `github` and similar plugins have no SpecManager agent that calls them, so they are not recommended.

## Success metrics

- **M1.** On a fresh project with none of the recommended plugins, one init run lists all four with reasons, installs exactly the ones the user picks, and installs nothing the user did not pick (checked with a headless surface test in the shape of `docs/directory-submission.md`).
- **M2.** Re-running init when every recommended plugin is installed asks nothing about plugins and reports "all recommended plugins present".
- **M3.** Init without arguments asks about repos and lists the declared ones. Init with path arguments behaves byte-for-byte as before (`selftest-repos` still passes).
- **M4.** After the fix, every feature in this repo whose Plan is approved shows a Plan-stage label in the managed block, not "PRD (approved)", and the plan-stage note appears. A self-test covers this.
- **M5.** `selftest-directory`, `selftest-prompts` and `claude plugin validate` all pass. No new install hook. No new network or model call from `server/`.

## Constraints & assumptions

- **C1. Who installs.** Claude runs plugin installation in the session, never the server (the no-model/API rule; repo CLAUDE.md "Conventions").
- **C2. No install hooks or workarounds.** If a surface test fails, report it and let the owner decide (repo CLAUDE.md "Releasing").
- **C3. Release process applies.** Version bump, rebuild of committed `dist/`, `selftest-directory`, `claude plugin validate`, and a surface test, because the command file and `core/claude-md.ts` change.
- **C4. Prompt invariants.** `selftest-prompts` pins line counts in `commands/*.md`, so edits to the init command may need INV updates in the same commit. Any fragment shared with other prompts lives in `docs/agent-snippets/`.
- **C5. Paths.** Recommend absolute paths. Relative paths resolve against the MCP server's `process.cwd()`.
- **C6. Detection must come from the session.** Assumption: `claude plugin list` (or the session's own view of installed plugins) is how plugins are found. The server does not read Claude Code's plugin config.
- **C7. Loop mode.** Under `/specmanager-loop`, nobody can answer prompts. Assumption: init then skips the plugin offer and the repo question, and only reports what is missing (Q4).
- **C8. Other hosts.** SpecManager also ships Cursor, Codex and Antigravity plugins (approved PRDs), where `claude plugin install` does not exist. Assumption: the plugin offer applies only to Claude Code. On other hosts, init lists the recommendations without installing (Q3).
- **A1.** Installing a plugin may need `/reload-plugins` or a restart before its skills appear. Init tells the user this, and does not count it as a failure.

## High-level user flows

**Plugins (every init run)**
- `specmanager_init` runs as today.
- Claude lists installed plugins, then compares them with the recommended list.
- No gaps: report "all present" and move on.
- Gaps: show each missing plugin with its "Used by / why" line, ask which to install (multi-select, default none), and run `claude plugin install` for each one chosen.
- Report the outcome of each install, and remind the user to reload.

**Repos (no path arguments given)**
- Show the repos already declared (from the `repos/` tree).
- Ask whether this instance should work with other repos.
- Yes: collect absolute paths, then call `specmanager_init` with `repoPaths`, and report `declaredRepos` and `rejectedRepos` as today.
- No: skip.

**Repos (path arguments given):** unchanged from today; no question asked.

**Then:** native `/init`, then the combined report (existing items plus G5).

**Stage label:** no user flow. Every managed-block sync shows the furthest stage that has a doc.

## Open questions

_All resolved by the owner on 2026-10-20 in the `/specmanager-loop` end questions (decisions detailed in `arch-init-onboarding-plugins-repos-030`)._

- **Q1 — resolved:** the recommended list is a table in `commands/specmanager-init.md` (one carrier, no snippet, no server data file).
- **Q2 — resolved:** recommend `playwright`; the browser row counts as satisfied when the session already has chrome-devtools MCP tools. Never recommend both.
- **Q3 — resolved:** where `claude` is unavailable, list the recommendations as "not installable here" and install nothing.
- **Q4 — resolved:** headless / non-interactive → skip both questions and report only. `/specmanager-loop` does not call init, so no flag.
- **Q5 — resolved:** drafts count, Design counts as a stage, walkthroughs outrank Plan, interview excluded; no doc → `PRD`.
- **Q6 — resolved:** keep `currentStage`, stop reading it (dead field, later cleanup).
- **Q7 — resolved:** presence only, no version check.
- **Q8 — resolved:** default CLI scope (user); no `--scope` flag.
- **M1 test — resolved:** the headless surface test runs in an isolated `CLAUDE_CONFIG_DIR` (the owner already has all four plugins installed), falling back to the M2 check if the login does not carry over.
