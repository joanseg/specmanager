---
id: wt-loop-command-specmanager-loop-024
featureId: feat-loop-command-specmanager-loop
stage: walkthrough
status: draft
stale: false
title: Loop command (/specmanager-loop) — Phase loop walkthrough
dependsOn:
  - plan-loop-command-specmanager-loop-021
basedOn:
  plan-loop-command-specmanager-loop-021: 1
generatedBy: agent
version: 1
phase: loop
createdAt: '2026-10-01T12:36:52.417Z'
updatedAt: '2026-10-01T12:36:52.417Z'
---
# Loop command (/specmanager-loop) — Phase loop walkthrough

Phase `loop` is the feature's only phase (plan `plan-loop-command-specmanager-loop-021`), so this walkthrough is terminal: approving it ships the feature. It delivers `/specmanager:specmanager-loop`, a main-session orchestration prompt that takes a one-line intent (or an existing feature id/slug), asks at most 2 rounds of ≤4 questions, dispatches each stage (PRD → Architecture → Design if UI-facing → Plan) to its existing subagent, **approves each stage's document automatically**, runs one inline cross-doc review, asks the remaining open questions, prints a report and stops before Build. Around it: a loop-mode carve-out in `agents/planner.md`, prompt invariants INV-38…INV-44, the managed-block Commands line, doc listings and a 1.0.2 → 1.1.0 version bump.

> `cd plugins/specmanager/server && npm run build && npm run selftest-prompts && npm run selftest && npm run selftest-directory` passes and `claude plugin validate plugins/specmanager` prints `✔ Validation passed`.

You need: the repo checked out at branch `feat/specmanager-loop` (commits `6cc25f8..262f4bf`), Node 20+, npm, and the `claude` CLI.

## 0. Prerequisites

- macOS or Linux, Node 20+ (`node -v`), npm, `claude` CLI on `PATH`.
- Branch `feat/specmanager-loop` at `262f4bf` or later. Commits in this phase, one per task:

| Task | Commit | Files |
|---|---|---|
| task-001 (1.1) frontmatter, intent, resolution, refinement | `6cc25f8` | `plugins/specmanager/commands/specmanager-loop.md` (new) |
| task-002 (1.2) stage chain, auto-approval, conditional Design, failure stop | `ce656d8` | same |
| task-003 (1.3) planner loop-mode sentence | `eb4ad58` | `plugins/specmanager/agents/planner.md` |
| task-004 (1.4) review, end questions, report, Don't list | `897e9a8`, `262f4bf` (reviewer fix, R7) | `commands/specmanager-loop.md` |
| task-005 (1.5) INV-38…INV-44 | `77bdf64` | `server/src/selftest-prompts.ts`, `server/dist/selftest-prompts.js` |
| task-006 (1.6) managed-block Commands line | `8e869c2` | `server/src/core/claude-md.ts`, `server/dist/core/claude-md.js` |
| task-007 (1.7) README / CLAUDE.md listings | `1be3457` | `README.md`, `plugins/specmanager/README.md`, `CLAUDE.md` |
| task-008 (1.8) release prep, version 1.1.0 | `a580594` | `plugins/specmanager/.claude-plugin/plugin.json` |

- The main checkout may carry unrelated uncommitted work (board-server / UI changes for other features). Run the checks on a **clean worktree** so they test only this branch:

```bash
cd /Users/joan/Documents/projects/specmanager
git worktree add /tmp/loop-wt feat/specmanager-loop
cd /tmp/loop-wt
```

No seed data is needed; the self-tests build their own tmp dirs.

## 1. Build

From the worktree root (CLAUDE.md `## Releasing` step 2):

```bash
cd plugins/specmanager && npm ci
cd server && npm ci && npm run build
cd ../ui && npm ci && npm run build
cd ../../.. && git status --short plugins/specmanager
```

Expected: `tsc` exits 0; `git status` prints nothing — the committed `server/dist` already matches the source (tasks 005/006 committed their dist files) and the UI build does not move `ui/dist` (no UI change this phase).

Then the exit-test suites, from `plugins/specmanager/server`:

```bash
npm run selftest-prompts
npm run selftest
npm run selftest-directory
```

Expected final lines:

- `selftest-prompts` → `All prompt invariant assertions passed (52 invariants checked: match + mutation).` — new this phase: rows `INV-38`…`INV-44` (Part C).
- `selftest` → `All Phase 1 assertions passed.`
- `selftest-directory` → `All directory-conformance assertions passed.`

If any of these fail, stop here.

## 2. Install / run

SpecManager is itself a Claude Code plugin, so the new command is reachable only after a reinstall. Two options:

- **Local, no install:** `claude --plugin-dir /tmp/loop-wt/plugins/specmanager` in a scratch project.
- **Marketplace dance** (only after the owner pushes 1.1.0 to `main`): `/plugin marketplace update specmanager` → `/plugin install specmanager@specmanager` → `/reload-plugins`, then reconnect via `/mcp`.

Reload troubleshooting: if `/specmanager:specmanager-loop` does not appear in the slash menu, or the MCP server shows the old version, run `/reload-plugins` again and reconnect via `/mcp`; a full Claude restart is the reliable fix.

## 3. Phase loop exit checks

### 3.1 Server builds and prompt invariants pass

```bash
cd /tmp/loop-wt/plugins/specmanager/server
npm run build && npm run selftest-prompts | tail -1
```

Expected: `All prompt invariant assertions passed (52 invariants checked: match + mutation).`

The new rows (`server/src/selftest-prompts.ts`, Part C) and what each pins:

| Id | Pattern | File | Count | Pins |
|---|---|---|---|---|
| INV-38 | `check_gate` | `commands/specmanager-loop.md` | 1–1 | gate called before each stage |
| INV-39 | `subagent_type: "(prd-writer\|architect\|designer\|planner)"` | same | 4–4 | every drafting stage delegated |
| INV-40 | `set_status({… status: "approved"` | same | 1–1 | the auto-approval |
| INV-41 | `main session` | same | 1–4 | refinement/review/questions not in a subagent |
| INV-42 | `subagent_type: "builder"` or `set_active_build(` | same | 0–0 (negative) | loop never builds or arms the Stop-gate |
| INV-43 | `approves each stage's document automatically` | same | 1–2 | R11 opt-in statement |
| INV-44 | `loop mode` | `agents/planner.md` | 1–1 | planner carve-out stated once |

INV-16 and INV-25 are untouched.

### 3.2 Mutation spot-check (optional, proves INV-42 bites)

```bash
cd /tmp/loop-wt/plugins/specmanager
echo 'Task({ subagent_type: "builder" })' >> commands/specmanager-loop.md
(cd server && npm run selftest-prompts; echo "exit=$?")
git checkout commands/specmanager-loop.md
```

Expected: a failure naming `INV-42` and a non-zero `exit=`; after the `git checkout`, 3.1 passes again.

### 3.3 Core self-test

```bash
cd /tmp/loop-wt/plugins/specmanager/server && npm run selftest | tail -1
```

Expected: `All Phase 1 assertions passed.`

### 3.4 Managed-block Commands line

```bash
grep -n 'specmanager-loop' /tmp/loop-wt/plugins/specmanager/server/src/core/claude-md.ts /tmp/loop-wt/plugins/specmanager/server/dist/core/claude-md.js
```

Expected: one hit in each file, both ending the Commands string with
`` · `/specmanager-loop` (auto-approves, stops before Build)``.

### 3.5 Directory conformance

```bash
cd /tmp/loop-wt/plugins/specmanager/server && npm run selftest-directory | tail -1
```

Expected: `All directory-conformance assertions passed.`

### 3.6 Plugin validate and version

```bash
cd /tmp/loop-wt
claude plugin validate plugins/specmanager
grep '"version"' plugins/specmanager/.claude-plugin/plugin.json
```

Expected: `✔ Validation passed` with no warning; `"version": "1.1.0",`.

### 3.7 The command file's shape

```bash
cd /tmp/loop-wt/plugins/specmanager
head -4 commands/specmanager-loop.md
grep -c '^[0-9]*\. \*\*' commands/specmanager-loop.md
grep -n 'Loop mode:' commands/specmanager-loop.md
```

Expected:
- frontmatter `description:` contains `approves each stage's document automatically` and `argument-hint: "<intent description, or existing featureId/slug>"`;
- 13 numbered steps (1 parse intent · 2 opening turn · 3 resolve feature · 4 refine · 5 per-stage routine · 6 PRD · 7 Architecture · 8 Design if UI-facing · 9 Plan · 10 cross-doc review · 11 end questions · 12 final report · 13 failure stop);
- two `Loop mode:` lines — the generic one in step 5.3 and the planner split rule in step 9.

Content to eyeball against the architecture's R-ids (named in the file):
- **R10 / step 5.1** — approved doc reused; human draft → one `AskUserQuestion` (approve as-is *(recommended)* / stop); never overwritten.
- **R9 / step 5 retry** — on `529`/Overloaded, `list_documents` first; up to 2 retries (3 attempts); genuine failures not retried.
- **R5 / step 8** — Design only if UI-facing; designer gets `No attachments; proceed without a design reference.`
- **Step 9** — Plan approved only if `plan.md` has a `## Phase` heading and `list_tasks` is non-empty; otherwise stop.
- **R6 / step 10** — `write_document` with `baseVersion` (conflict → question, no retry); Design `---` lines → `<!-- --- -->`; tasks via `update_task`/`create_task`, removals → question; `link_documents` re-stamp; single pass.
- **R7 / step 11 (reviewer fix `262f4bf`)** — answered entries removed from / marked resolved in `Open questions`; skipped ones, skipped refinement Assumptions (R3) and unresolved review findings (R6) are written into the affected doc's `Open questions`.
- **R8 / step 12** — report says approvals were made by `/specmanager-loop`, not the user; next step `/specmanager:specmanager-build <slug> next`.
- **Don't list** — forbids starting a build / arming the Stop-gate / walkthroughs without the INV-42 literals.

### 3.8 Planner carve-out

```bash
grep -n -i 'loop mode' /tmp/loop-wt/plugins/specmanager/agents/planner.md
```

Expected: exactly one line (line 20), directly after "Confirm any split with the user first": in loop mode, no `AskUserQuestion`; apply the recommended split and record decision + alternative under **Open questions**.

### 3.9 Doc listings

```bash
cd /tmp/loop-wt
grep -n 'specmanager-loop' README.md plugins/specmanager/README.md CLAUDE.md
```

Expected: root `README.md` — the workflow code block line and the "optional too" paragraph; `plugins/specmanager/README.md` — one table row; `CLAUDE.md` — the `commands/*.md` Layout bullet (`specmanager-loop.md` also runs in the main session).

## 4. Pass criteria

- [ ] `npm run build` in `server/` exits 0 and leaves `server/dist` unchanged against the commit.
- [ ] `npm run selftest-prompts` ends `All prompt invariant assertions passed (52 invariants checked: match + mutation).`
- [ ] INV-42 fails on an injected `subagent_type: "builder"` (3.2).
- [ ] `npm run selftest` ends `All Phase 1 assertions passed.`
- [ ] `claude-md.ts` and `dist/core/claude-md.js` both carry `` `/specmanager-loop` (auto-approves, stops before Build)``.
- [ ] `npm run selftest-directory` ends `All directory-conformance assertions passed.`
- [ ] `claude plugin validate plugins/specmanager` prints `✔ Validation passed` with no warning.
- [ ] `plugin.json` version is `1.1.0`.
- [ ] `commands/specmanager-loop.md` has the 13 steps, two `Loop mode:` lines, and the step-11 R7 wording from `262f4bf`.
- [ ] `agents/planner.md` contains `loop mode` exactly once.
- [ ] The command is listed in root `README.md`, `plugins/specmanager/README.md` and the root `CLAUDE.md` Layout bullet.

Verified by the build (clean worktree of `a580594`): `selftest-directory`, `selftest-prompts` (52 invariants), `selftest`, and `claude plugin validate` all passed; `selftest-prompts` re-passed after `262f4bf`. The spec-compliance reviewer first failed the phase on R7 (answered/skipped Open-questions handling), which `262f4bf` fixed; the re-review passed.

## 5. Deferred / out of scope (expected, not bugs)

- **No dogfood run.** The owner dropped the dogfood task; prompt behaviour has no automated harness and is first exercised on real features after release. The risk is behavioural: subagents may still ask the user (loop mode is an instruction, not a tool restriction).
- **Not pushed.** `1.1.0` is a release only once pushed to `main`; the push and the post-release marketplace check (`claude plugin marketplace update specmanager`, then `claude plugin update specmanager@specmanager`) are the owner's. No packaging change → no surface test required.
- **Root `CLAUDE.md` managed block does not yet list `/specmanager-loop`.** The source/dist string changed in `8e869c2`, but the managed block is re-rendered by the running MCP server, which still runs the old dist until the plugin is reinstalled. It catches up on the next `sync_claude_md` after reinstall.
- **No server/UI behaviour change** beyond the Commands string: no new MCP tool (no `delete_task` — task removals surface as questions plus manual follow-ups), no `approvedBy` frontmatter (approvals recorded in the report only, Q8 deferred), no board UI, no auto-resume of an interrupted loop, no Build or walkthroughs.
- The four stage commands' and agents' "Don't approve" wording is unchanged (R11).
- Carried open questions (from `arch-loop-command-specmanager-loop-027` via the plan): tune the Q2 question cap and the R2 near-match heuristic after real runs; R6 value unproven (cut if runs yield nothing); inline R6 token cost; `delete_task` as a separate feature if removals are common.

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `selftest-prompts` fails `INV-39` (count ≠ 4) | a `subagent_type: "…"` literal added or removed in the loop file | keep exactly one dispatch literal per drafting stage (steps 6–9) |
| `selftest-prompts` fails `INV-42` | a `subagent_type: "builder"` or `set_active_build(` literal in the loop file | phrase the ban in prose, as the Don't list does |
| `selftest-prompts` fails `INV-44` (count 2) | `loop mode` repeated in `planner.md` | keep the phrase in one sentence only |
| `selftest-prompts` fails `INV-38`/`INV-40` (count 2) | a second `check_gate` / `set_status({ … "approved"` mention | refer back to step 5 instead of repeating the call |
| `git status` shows `server/dist` changes after build | source edited without committing dist | commit the rebuilt dist (CLAUDE.md: the committed dist is what ships) |
| Checks fail on files you didn't touch | running in the main checkout with other features' uncommitted work | use the clean worktree from §0 |
| `selftest-shutdown`/`selftest-autoport` time out (not part of this exit test) | 3 s MCP handshake on a loaded machine | re-run before treating as a regression |
| `/specmanager:specmanager-loop` missing after install | plugin not reloaded / MCP not reconnected | `/reload-plugins`, reconnect via `/mcp`, else restart Claude |
| `claude plugin validate` warns | manifest drift | fix the field it names; must be warning-free |

## 7. What ships next

This is the last (and only) phase — there is no feature roll-up for a single-phase feature; approving this walkthrough ships it. What remains is the owner's: push `feat/specmanager-loop` to `main` as the 1.1.0 release, run the marketplace check, reinstall so the managed `CLAUDE.md` block picks up `/specmanager-loop`, then exercise the loop on a real feature and feed results into the carried open questions above.

Clean up the worktree when done: `git worktree remove /tmp/loop-wt`.
