# Prompt simplification — dogfood before/after (G4)

Feature `feat-agent-prompt-simplification-opus-5-5`, Arch §G4. The behavioural gate: the *after* run (branch head, task-022) must meet every checklist item the *before* run (`ad11cd8`) met.

## Harness

`docs/verification/dogfood-harness.sh <label> <sha> <scratch-dir>`. task-022 reuses it unchanged with `after <head-sha>`.

- Worktree at `<sha>` under the scratch dir, `npm ci` at `plugins/specmanager`.
- Scratch project: `git init`, `hello.js`, `hello.test.js`, `package.json` (`"version": "1.4.2"`, `"test": "node --test"`), one commit on `main`.
- A seeded `kind: "interview"` doc (`prd-hello-version-flag-001`) covering problem, users, scope and UI-facing = no, so loop step 4 skips refinement.
- Fixed intent: `Add a --version flag to the hello CLI that prints the package.json version`.
- Runs: `-p "/specmanager:specmanager-loop hello-version-flag <intent>"`, then `-p "/specmanager:specmanager-build hello-version-flag next"`, both `--output-format stream-json --verbose`.
- Harness-only input, never plugin prose: `--append-system-prompt "If AskUserQuestion is unavailable, take the (recommended) option."`.
- Isolation: `env -i` (the parent session's `ANTHROPIC_API_KEY` overrode the CLI login and the first probe failed with "Invalid API key"), `--settings '{"enabledPlugins":{"specmanager@specmanager":false}}'` so only the worktree's plugin loads (init event: one `specmanager@inline`), scratch `CLAUDE_PLUGIN_DATA` (the board fell forward to 4318; the session's board on 4317 was untouched).
- Other user plugins load on both sides (superpowers, frontend-design, company-brain, …), so the environment is the same for before and after.

## Runs

| | Before | After |
|---|---|---|
| Plugin sha | `ad11cd8` (1.2.0) | _task-022_ |
| Date | 2026-10-20 | |
| Model (init event) | `claude-opus-5-5` | |
| Loop: turns / cost | 29 / $1.83 | |
| Build: turns / cost | 33 / $1.74 | |
| AskUserQuestion stall | none (tool unavailable in `-p`; recommended options taken, as the harness line asks) | |

Captures (scratch, not committed): `<scratch>/before/out/{loop,build}.jsonl`, `specs/`, `specs-tree.txt`, `git-log.txt`, `summary.txt`, `tool-calls.txt`.

## Checklist

| # | Item | Before | After |
|---|---|---|---|
| 1 | `check_gate` before every stage | **Met.** Loop main session: `check_gate` prd → Agent prd-writer; architecture → architect; plan → planner. Build: `check_gate` plan before `set_active_build`; walkthrough-writer `check_gate` walkthrough/core before `create_document`. Design skipped (not UI-facing) | |
| 2 | No `set_status` from a subagent; approvals from the loop's main session only | **Met.** 3 `set_status` calls, all `main` in the loop (PRD, Arch, Plan → approved). 0 in any subagent; 0 in the build run | |
| 3 | PRD, Architecture, Plan required sections | **Met.** PRD: Problem, Users, Goals, Non-goals, Success metrics, Constraints & assumptions, User flows (+ Open questions). Arch: section anchors; `get_spec_slice` returned `unresolvedRefs: []`, `fallbackUsed: false`. Plan: `**Scale:**` legend, `\| Phase \| Theme \| Points \|` + `**Total**` row, `## Phase core — …`, `**Exit test:**`, dotted 1.1–1.3, `## Human prerequisites`, `## Notes on estimates` | |
| 4 | Tasks ≤3 with `phase`, titles 1:1 with plan rows, `set_phase_meta` with `testCommand` + `architectureRefs` | **Met.** task-001/002/003 = rows 1.1/1.2/1.3 (identical titles), complexity 1/1/2, phase `core`. `set_phase_meta` core: `testCommand: "npm test"`, 6 `architectureRefs` | |
| 5 | Builder: `in_progress` before `done`, one commit per task, no branch switch or push, artifacts recorded | **Met.** Each of the 3 builder subagents: `update_task in_progress` first, `done` last with commit + file. Commits `70e8524`, `fdcb8db`, `b76ba0c` (one per task). No `git switch`/`checkout`/`push` in any builder; the branch `feat/hello-version-flag` was created by the build command's main session (step 6a) | |
| 6 | Reviewer verdict JSON returned | **Met.** `{ "verdict": "pass", "reasons": [6 items] }` | |
| 7 | Walkthrough: Stakeholder test guide first, `## Lessons learned` → `### Git strategy` last | **Met.** `phase-core.md`: `## Stakeholder test guide` is the first heading; `## Lessons learned` is the last `##`, opening with `### Git strategy` | |
| 8 | No `final` walkthrough (single-phase) | **Met.** Only `walkthroughs/phase-core.md` | |
| 9 | Directional: input tokens (main-session `result` usage; input + cache creation + cache read) | Loop 1,230,576 (output 9,762). Build 1,384,552 (output 10,716). Total **2,615,128** | |

### Before: `.claude/specs/` tree

```
.claude/specs/.gitignore
.claude/specs/features/hello-version-flag/architecture/architecture.md
.claude/specs/features/hello-version-flag/feature.json
.claude/specs/features/hello-version-flag/plan/plan.md
.claude/specs/features/hello-version-flag/plan/tasks.json
.claude/specs/features/hello-version-flag/prd/interview.md
.claude/specs/features/hello-version-flag/prd/prd.md
.claude/specs/features/hello-version-flag/walkthroughs/phase-core.md
.claude/specs/manifest.json
```

### Before: `git log --all`

```
b76ba0c HEAD -> feat/hello-version-flag | test --version flag
fdcb8db  | handle --version flag
70e8524  | add version() export
01caf19 main | hello CLI
?? .claude/
?? CLAUDE.md
?? docs/
```

### Before: observations outside the checklist

Not regressions to gate on; listed so the after run can be compared.

- The loop's cross-doc review found a real defect in the seed project: `hello.js`'s entry guard prints nothing when run through a symlink (`/tmp` → `/private/tmp`, npm bin links). It was left as an open question; the build stayed in scope.
- The build report flagged two SpecManager oddities: the managed CLAUDE.md table showed the feature at "PRD (approved)" with an approved Plan, and `sync_design_md` refresh created `docs/DESIGN.md` for a non-UI project.
- The build report says the walkthrough landed at `walkthroughs/phase-core.md`, "not under the `walkthroughs/<slug>/` folder the build instructions name" — a prompt/storage wording mismatch.
- Builders ran on `sonnet` (tier dispatch); the reviewer took 2 tool calls.
