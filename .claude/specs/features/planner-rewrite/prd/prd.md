---
id: prd-planner-rewrite-043
featureId: feat-planner-rewrite
stage: prd
status: approved
stale: false
title: Planner rewrite PRD
dependsOn: []
basedOn: {}
generatedBy: agent
version: 4
createdAt: '2026-10-20T10:36:55.611Z'
updatedAt: '2026-10-20T11:21:42.667Z'
---
## Problem

The plan agent "does not work properly": it does not plan effectively. Reviewing today's logic (`agents/planner.md`, `commands/specmanager-plan.md`, `commands/specmanager-build.md`, `agents/reviewer.md`, `agents/walkthrough-writer.md`) shows these gaps:

- **Phase splitting has one trigger only.** The planner defaults to one phase and splits only for "a genuinely large project with a real, testable increment partway through". It has no rule for unknowns that need a **spike**, no rule for **human setup** (accounts, credentials), and no size threshold.
- **Human work leaks into task lists.** Nothing stops a plan from carrying "human verifies X" tasks, even though verification is the walkthrough's job and the reviewer's.
- **Human setup is found late.** Nothing in the planner or the build command collects what the user must provide (a database account, a test account with real data or money). The builder subagent cannot ask the user, so a missing credential only shows up when a task fails mid-build.
- **The reviewer cannot check what users see.** Its tools are `Read, Glob, Grep, Bash`, and it judges only the diff against the spec slice. It has no way to drive a web UI, the iOS simulator or Android, and no test account to do it with.
- **Git strategy is implicit.** The builder commits on whatever branch is checked out. Nothing asks the user which base branch, branch name, commit granularity or push policy to use, even when the default branch must not be touched (for example, while it is under directory review).
- **Walkthroughs are written for engineers only.** The per-phase walkthrough is a full technical test script for "a future engineer reading this six months from now". A non-technical stakeholder has no short guide, and the build's lessons learned are not captured anywhere.

Kept as is (the user likes it): Fibonacci task sizing, with every persisted task ≤3 points (1, 2 or 3).

This is a new feature, separate from the shipped `feat-plan-and-walkthrough-optimisations`.

## Users

- **Feature owner / developer (primary).** Runs `/specmanager-plan`, `/specmanager-build`, `/specmanager-walkthrough` and `/specmanager-loop`. Jobs:
  - get a plan with the right number of phases for the work's actual risk and size;
  - be asked about human setup once, up front, without being blocked if they are busy;
  - have no manual-check tasks in the plan.
- **Non-technical stakeholder.** Reads the walkthrough. Job: test the happy path and a few edge cases, step by step, without engineering knowledge.
- **Future engineer.** Reads the rest of the walkthrough. Job: understand what shipped and what the build taught.
- **Reviewer subagent.** Job: confirm a built phase matches its spec, including the UI it changed, using real access and a real test account.

## Goals

**G1 — Phase-split rules (planner + `/specmanager-plan`).** One phase stays the default. Split only for these triggers:
- **G1a Spike.** When there are many unknowns, create a spike phase first and an empty **placeholder build phase** after it.
- **G1b Human setup.** When the build needs human work (for example, creating a database account), list each item and ask the user for it at the start (see G2). Human setup on its own does not force a split. Open question Q1 covers whether it can.
- **G1c Size.** When the plan totals about **100 points**, suggest splitting it into **two phases**. Always ask the user first, with options (the split and a single-phase alternative). Never split for size without the user's answer, except in loop mode (G6).
- **G1d No human-check tasks.** A phase never contains a human verification task. Verification belongs to the walkthrough (G4) and the reviewer (G3).
- **G1e Keep the existing rules.** Fibonacci ≤3 sizing, the parsed plan shapes (`## Phase <name> — <theme>`, `**Exit test:**`, `# | Task | Pts | Notes`, `**Scale:**` legend, `| Phase | Theme | Points |` + **Total**, dotted numbering), `set_phase_meta` with a `testCommand` for every phase, and `dependsOn`/`basedOn` on the plan doc.

**G1a detail — filling the placeholder.** Re-running `/specmanager-plan` after the spike phase's tasks are all `done` detects the finished spike. It fills the placeholder build phase with tasks based on the spike's findings and updates the Plan doc in place. Today the command refuses when a plan doc already exists, so this re-run path is new.

**G2 — Human-setup handling (`/specmanager-build`, main session).**
- At the start of a build, list the human prerequisites the plan recorded and ask for them up front.
- Offer the option "start now and ask when actually needed", so a busy user is not blocked. The question then comes back at the first task that needs that item.
- Always suggest granting Claude access (MCP server, CLI login, API token) so it can handle the setup itself rather than the user doing it by hand.

**G3 — Reviewer with real access.**
- Give the reviewer the access it needs to check the UI a phase changed: web, iOS (Xcode simulator), Android, and similar.
- Let it check with a **real test account**. If one is needed, ask the user at the start of the build (with G2) to set up a test account with actual data or money.
- It remains a reviewer: it returns a verdict and never advances the card.

**G4 — Two-part walkthrough (walkthrough-writer + `/specmanager-walkthrough`).**
- **Part 1, at the top: a stakeholder test guide.** Plain, explain-like-I'm-5 language. Numbered steps saying what to test and how: the happy path first, then some edge cases.
- **Part 2: the full technical document.** The existing comprehensive content.
- **Lessons learned.** A new section on what the build taught. It is drawn from what the build actually recorded (commits, reviewer verdicts, retries and blockers), because task records have no notes field.

**G5 — Core/MCP support.** Add whatever core or MCP support G1–G4 need. Known needs:
- **An empty placeholder phase must exist.** `list_phases` currently builds phases from tasks only, so a phase with no tasks does not appear.
- **Phase counts must include the placeholder.** `get_phase_completion.isSinglePhase` (`phases.length === 1`) must not treat a spike-plus-placeholder plan as single-phase.
- **Somewhere to store human prerequisites and test-account needs**, so the build command can read them.

**G6 — Loop mode.** The new user questions (size split, human setup, test account) follow the existing loop carve-out: in `/specmanager-loop` the planner does not call `AskUserQuestion`. It applies its recommended choice and records the decision and the alternative it did not take under Open questions. `commands/specmanager-loop.md` is updated where it describes planner behaviour.

**G7 — Invariants and snippets stay green.**
- `selftest-prompts` passes. Invariants that change meaning are updated in the same change; they are not dropped.
- Fragments in `docs/agent-snippets/` stay in parity with every carrier (design grounding; the lossless density contract).
- Every agent and stage command keeps "Don't approve" (INV-25).

**G8 — Git strategy before a build (`/specmanager-build`, main session; added 2026-10-20).**
- **Learn the pattern.** Before the first task, inspect the repo's git practice: current and default branch, branch naming pattern, unmerged/stacked branches, commit message style and granularity, uncommitted work, and the git strategy recorded in earlier walkthroughs' Lessons learned.
- **Suggest the best approach** — base branch, working branch name, commit granularity, commit message style, push policy, what to do with unrelated uncommitted changes — and **let the user check it and suggest changes** (`AskUserQuestion`: accept, or edit) before anything is created or committed.
- **Apply only what was confirmed**, and pass it to every builder dispatch.
- **Record it.** The strategy used in the phase (proposed, what the user changed, and why) is stored in that phase walkthrough's Lessons learned, so later builds learn from it.
- **Sync to CLAUDE.md.** The post-phase doc sync also updates the project's `CLAUDE.md` with the latest git strategy, so every session (and the next build) sees it without reading walkthroughs.

## Non-goals

- No UI work. A placeholder phase shows on the board as an ordinary empty phase.
- No change to Fibonacci sizing or the ≤3 cap.
- No change to tier dispatch (`core/tiers.ts`), the Stop-gate's N=3 cap, the R=2 transport retry, per-task dispatch or `--bulk`.
- The reviewer does not grade style or taste, and does not write files or task state.
- No model or API calls from the plugin server or board. All new access (browsers, simulators, accounts) is used by Claude-side agents, not by the plugin.
- Gates stay in core. Prompts must not open any gate.
- No automatic builds from `/specmanager-loop`: it still stops before Build.
- No change to the `final` walkthrough's roll-up role. The two-part structure applies to per-phase walkthroughs (open question Q4).

## Success metrics

- **M1** — On a sample of typical features, the planner returns a single phase unless a G1 trigger applies, and each split names its trigger.
- **M2** — No persisted task is a human verification task (checked by a `selftest-prompts` invariant and by the loop's cross-doc review).
- **M3** — A spike flow works end to end: plan creates spike + empty placeholder → the spike builds → re-running `/specmanager-plan` fills the placeholder and updates the Plan doc → the build phase can be built.
- **M4** — In a build that needs human setup, the user is asked before the first task and can choose "start now". No task fails for a missing credential that the plan had listed.
- **M5** — For a phase that touches a UI, the reviewer's verdict cites a check it ran against the running UI, not only the diff.
- **M6** — Every new per-phase walkthrough starts with the stakeholder guide (happy path + edge cases) and contains a Lessons learned section.
- **M7** — `selftest-prompts` and the snippet parity checks pass, and the release checks in CLAUDE.md pass (`selftest-directory`, `claude plugin validate`).
- **M8** — Every build asks the git-strategy question before the first builder dispatch, the user can change the proposal, builders commit on the confirmed branch only, and the phase walkthrough's Lessons learned records the git strategy used; after the post-phase sync, the managed `CLAUDE.md` block shows it.

## Constraints & assumptions

- **Files in scope:**
  - `plugins/specmanager/agents/planner.md`, `reviewer.md`, `walkthrough-writer.md`;
  - `commands/specmanager-plan.md`, `specmanager-build.md`;
  - `specmanager-walkthrough.md` and `specmanager-loop.md`, where they reference planner behaviour;
  - plus any `server/src/core` / `mcp.ts` support.
- **Subagents cannot ask the user.** The builder and reviewer cannot hold a conversation, so all human questions (setup, test account, "ask when needed") must run in the `/specmanager-build` main session. That is the same reason the interview and loop commands run in the main session.
- **The reviewer's access is limited today.** Its tools are `Read, Glob, Grep, Bash`, pinned at `model: opus`. UI checks need either more tools (for example browser MCP tools) or Bash-driven simulators. INV-22 (read-only claim) and INV-24 (spec compliance only) must still hold.
- **Task records have no notes field,** and `done` needs a commit or file artifact. Lessons learned and the spike's findings must come from artifacts, commits, reviewer verdicts and retry/blocked history.
- **Single-phase semantics** (`isFeatureShipped`; no `final` for single-phase features, INV-1) must stay correct once placeholder phases exist.
- **Optimistic concurrency.** Updating the Plan doc in place after a spike uses `write_document` with the base `version`. Updating an approved plan only bumps `version` and does not cascade staleness (CLAUDE.md invariant).
- **Release rules apply** (version bump, rebuild `dist/`, `selftest-directory`, `claude plugin validate`). A packaging-surface test is required only if `plugin.json`, `.mcp.json` or `hooks/` change.
- **Assumption A1:** "very large" means about 100 points total. This is a soft threshold, not a hard cap.
- **Assumption A2 (resolved 2026-10-20):** a spike's findings are recorded in the spike phase's walkthrough, so the re-plan has something durable to read.
- **Assumption A3:** human prerequisites are recorded in the Plan (and in any core store G5 adds) at plan time, so the build can ask before the first task.

## User flows

**Default (one phase).**
1. `/specmanager-plan` → planner → one phase with ≤3-point tasks and no human-check tasks → Plan draft.

**Spike.**
1. The planner sees many unknowns → spike phase plus an empty placeholder build phase.
2. `/specmanager-build <f> spike` → the spike tasks record their findings as artifacts.
3. `/specmanager-plan <f>` again → detects that the spike is done → fills the placeholder with tasks and updates the Plan doc.
4. The user re-approves the plan → builds the placeholder phase.

**Size.**
1. The planner totals about 100 points → `AskUserQuestion` with options (a two-phase split with stated boundaries, or a single phase).
2. The answer is applied.
3. In loop mode, the recommended option is applied and recorded under Open questions.

**Human setup and test account.**
1. `/specmanager-build` begins → lists the prerequisites (accounts, credentials, test account with real data or money) → suggests granting access via MCP or CLI.
2. The user provides them now, or picks "start now and ask when needed".
3. The build asks again at the first task that needs a missing item.

**Review.**
1. The phase's tasks are all `done` → the Stop-gate passes → the reviewer checks the diff against the slice.
2. If the phase touched a UI, the reviewer also drives it (web, iOS simulator, Android) using the test account.
3. Verdict.

**Walkthrough.**
1. The phase completes → walkthrough-writer → stakeholder guide (ELI5 happy path + edge cases) → full technical document → Lessons learned → draft.

**Git strategy.**
1. `/specmanager-build` begins → reads git state and earlier walkthroughs' git lessons → proposes base branch, branch name, commit granularity, message style, push policy.
2. The user accepts or edits it → the command switches/creates the branch.
3. Builders follow it → the walkthrough records it under Lessons learned.
4. The post-phase sync (`sync_claude_md`) mirrors that git strategy into `CLAUDE.md`.

## Open questions

- **Q1** — Can human setup force a phase split (for example, a setup phase before build), or is it always handled by the up-front ask in `/specmanager-build`? This PRD assumes the up-front ask, with no split.
- **Q2** — How should a spike be detected and recorded? Options: a phase-meta flag (for example `kind: "spike"`), a naming convention, or a placeholder marker. How is the placeholder stored so `list_phases` lists it with zero tasks? (Design is the architect's call.)
- **Q3** — What does re-approval look like after a placeholder is filled? An approved plan updated in place only bumps `version`. Should the plan drop back to `draft` so the user re-approves the filled phase before building it? *Resolved: yes, revert to `draft`.*
- **Q4** — Does the `final` roll-up walkthrough also get a stakeholder guide (the whole feature, end to end), or only the per-phase walkthroughs? *Resolved: `final` gets a short end-to-end guide.*
- **Q5** — Which tools does the reviewer get for UI checks (browser MCP tools, Bash with `xcrun simctl` / `adb`), and how does that square with the read-only claim (INV-22) and the existing note that Bash can write? *Resolved: `disallowedTools` denylist, verified headlessly, allowlist fallback.*
- **Q6** — Where do test-account credentials live during a build, given there is no auth and everything is local? (They must never be written into `.claude/specs/` or committed.)
- **Q7** — For the size trigger: is about 100 points measured before or after splitting into ≤3 tasks (the totals are the same either way), and should more than 200 points suggest three phases? *Resolved: measured after decomposition; ≈200+ also offers three phases.*
- **Q8** — Where are retries and blockers recorded so Lessons learned can cite them? Today R=2 retries and N=3 Stop-gate failures leave only `blocked` status, not a history.
- **Q9** — Should the "ask when actually needed" prompt come from the build command between per-task dispatches only, or can a builder stop early with a "needs human input" signal that the command then turns into a question?
