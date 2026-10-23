---
id: plan-planner-rewrite-022
featureId: feat-planner-rewrite
stage: plan
status: approved
stale: false
title: Planner rewrite plan
dependsOn:
  - arch-planner-rewrite-028
basedOn:
  arch-planner-rewrite-028: 4
generatedBy: agent
version: 4
createdAt: '2026-10-20T10:46:15.493Z'
updatedAt: '2026-10-20T11:21:54.924Z'
---
## Overview

Implements `arch-planner-rewrite-028` (for `prd-planner-rewrite-043`, G1–G7): one small core change (phase meta gains `kind` + `prerequisites`; `rollupPhases` lists meta-only placeholder phases), then the prompt rewrites (planner, plan command fill mode, build command human-setup asks, builder `NEEDS_HUMAN`, reviewer denylist + UI check, two-part walkthrough, loop carve-out), the `selftest-*` updates, the R-1 headless check, and release prep. **Single phase** — no G1 trigger applies: the Architecture resolves its unknowns (R-1 is a verify-with-fallback task, not a spike that changes which tasks exist), the work needs no human setup, and the total (52 points, incl. the G8 git-strategy step and its CLAUDE.md sync added 2026-10-20) is well under the ≈100-point size trigger (A1). No design doc (not UI-facing).

**Scale:** `1` trivial · `2` small · `3` moderate · `5` substantial · `8` large · `13`/`21` epic.

*Every task below is decomposed to **≤3 points**; the work split naturally into small items, so no larger item needed splitting and the phase subtotal is unchanged.*

| Phase | Theme | Points |
|---|---|---|
| rewrite | Phase-split rules, human setup, reviewer access, two-part walkthrough | 52 |
| **Total** | | **52** |

---

## Phase rewrite — Phase-split rules, human setup, reviewer access, two-part walkthrough

**Exit test:** from the repo root, `cd plugins/specmanager/server && npm run build && npm run selftest && npm run selftest-phases && npm run selftest-build && npm run selftest-prompts && npm run selftest-directory` passes (placeholder rollup, spike-not-terminal, legacy `tasks.json` parse, new INV-45…INV-50, snippet parity), `claude plugin validate plugins/specmanager` prints `✔ Validation passed`, and the R-1 results file records that the reviewer could not `Write`/`Edit` or call `update_task`. *(R-1 runs a headless `claude` session; if `disallowedTools` is not honoured, the task applies the allowlist fallback and the results file records it.)*

| # | Task | Pts | Notes |
|---|---|---|---|
| 1.1 | Phase meta schema: `PrerequisiteSchema`, `kind` + `prerequisites` on `PhaseMetaSchema`; `setPhaseMeta` stores them | 2 | `core/types.ts`, `core/tasks.ts`; zod defaults, zero migration (Data model changes, Interfaces). Never a secret value. |
| 1.2 | `rollupPhases(tasks, metaPhases = {})` appends meta-only `kind: "placeholder"` phases as `empty`; `PhaseDescriptor` carries `kind`/`prerequisites`; `listPhases`, `buildManifest`, `final` gate pass `meta.phases` | 3 | `core/phases.ts`, `core/manifest.ts`, `core/dependencies.ts` (core-phase-rollup). Non-placeholder meta-only keys ignored (Q-A). |
| 1.3 | MCP `set_phase_meta` accepts optional `kind` / `prerequisites`; description updated | 1 | `server/src/mcp.ts` (Interfaces). `list_phases` shape otherwise unchanged. |
| 1.4 | `selftest-phases` assertions: placeholder listed `empty`, last, `kind: "placeholder"`; `getNextPhase` skips it; defaults without meta | 2 | `server/src/selftest-phases.ts` (core-phase-rollup Tests). |
| 1.5 | `selftest-build` assertions: spike + placeholder ⇒ `isSinglePhase === false`; spike walkthrough does not ship; `final` gate names the placeholder; legacy `tasks.json` parses | 2 | `server/src/selftest-build.ts`. |
| 1.6 | Planner: replace "The phase rule" with the G1a spike / G1c ≈100-point size triggers, split names its trigger in Overview, `**UI check:**` line, widened single loop-mode statement; re-word INV-44 `what` | 3 | `agents/planner.md`, `selftest-prompts.ts` (G1, G1c, G1e, G6). Keep "loop mode" count = 1 and snippet blocks byte-identical (INV-13/29, INV-15a/b). |
| 1.7 | Planner: fill mode (`Mode: fill`), `## Human prerequisites` section + per-phase `prerequisites` with `grantVia`, no human-check tasks rule + self-check step, `set_phase_meta` incl. placeholder | 3 | `agents/planner.md` (G1a fill mode, G1b, G1d). Spike findings are recorded in the spike phase's walkthrough (`## Spike findings`), not a separate file; spike tasks keep ordinary commit/prototype artifacts (A2, end-question answer). Fill mode reads the approved spike walkthrough. |
| 1.8 | Plan command: fill-mode detection (placeholder `taskCount 0` + spike `done` + spike walkthrough `approved`), refuse "spike not finished" / "spike walkthrough not approved", pass the spike walkthrough id, `set_status(plan, draft)` before dispatch | 2 | `commands/specmanager-plan.md` (G1a fill mode, Q3). Setting `draft` is not approving (INV-25). |
| 1.9 | Build command: placeholder-aware step 4 + new step 6c prerequisites ask ("Provide now" / "Start now and ask when actually needed", always suggest granting access via MCP/CLI/token) | 3 | `commands/specmanager-build.md` (G2). Answers in session state only, never on disk (Q6). |
| 1.10 | Build command: deferred asks before each `neededBy` task, `NEEDS_HUMAN` → ask + re-dispatch, `--bulk` asks all up front, reviewer hand-off (UI check line + test-account route), build log passed to walkthrough-writer | 3 | `commands/specmanager-build.md` (G2, G3, G4, Q9). `NEEDS_HUMAN` spends no R=2 retry; decline ⇒ mid-phase stop, marker stays (INV-2). |
| 1.11 | Builder: stop with `NEEDS_HUMAN: <prerequisite id>` instead of failing a task for a missing credential | 1 | `agents/builder.md` (Interfaces, Q9). |
| 1.12 | Reviewer: `tools:` allowlist → `disallowedTools: Write, Edit, NotebookEdit, Agent, mcp__plugin_specmanager_specmanager__*`; UI-check step citing checks in `reasons`, no-tooling fallback; re-word INV-22 `what` | 2 | `agents/reviewer.md`, `selftest-prompts.ts` (G3, Q5). INV-22/INV-24/INV-8 hold; `model: opus` stays. |
| 1.13 | R-1 headless check: run the reviewer in a headless `claude --plugin-dir` session and confirm it cannot `Write`/`Edit` or call `update_task`; apply the allowlist fallback if not honoured | 2 | Results file `docs/verification/reviewer-disallowedtools.md` is the task artifact (R-1). Scratch project outside the repo; `CLAUDE_PLUGIN_DATA` pointed at scratch. |
| 1.14 | Walkthrough-writer: Part 1 `## Stakeholder test guide` (ELI5, happy path + 2–4 edge cases), Part 2 unchanged sections 1–9, `## Lessons learned` from commits / `meta.blocked` / build log; final mode opens with a feature-level guide | 3 | `agents/walkthrough-writer.md` (G4, Q4, Q8). A `kind: "spike"` phase's walkthrough also carries `## Spike findings` (what was learned, decisions, recommended build work) — the source fill mode reads. Never invent lessons; snippet blocks byte-identical. |
| 1.15 | Walkthrough command: manual run has no build log, Lessons learned uses commits + blocked notes | 1 | `commands/specmanager-walkthrough.md` (G4). |
| 1.16 | Loop command: step 9 `Loop mode:` line covers all planner questions; step 10 adds "no human-verification task" (M2) and "a split names its trigger" (M1); step 11 gathers plural decisions | 2 | `commands/specmanager-loop.md` (G6). INV-42 stays green. |
| 1.17 | `selftest-prompts`: add planner invariants (spike / human-setup / ≈100-point triggers; no human verification tasks) with min/max + `negativeSample` | 2 | `server/src/selftest-prompts.ts` (G7, proposed INV-45…INV-46). |
| 1.18 | `selftest-prompts`: add build / reviewer / walkthrough invariants (start-now + grant-access offer; secrets never in `.claude/specs/` or committed; reviewer drives UI with test account; stakeholder guide first + Lessons learned) | 2 | `server/src/selftest-prompts.ts` (G7, proposed INV-47…INV-50). |
| 1.19 | Repo `CLAUDE.md`: note phase-meta `kind`/`prerequisites` and the reviewer denylist under "Build leverage primitives" | 1 | Outside the managed markers. |
| 1.20 | Build command: step 6a git strategy — learn the repo's pattern (git state, prior walkthroughs' Git strategy lines, CLAUDE.md), suggest base/branch/granularity/message/push policy, `AskUserQuestion` accept or edit, switch branch, pass a `Git strategy:` block to builders, add it to the build log | 3 | `commands/specmanager-build.md` (G8). Never create/switch/commit before the answer; never touch the base branch. |
| 1.21 | Builder: commit only on the checked-out branch per the `Git strategy:` block; never switch branches or push | 1 | `agents/builder.md` (G8). |
| 1.22 | Walkthrough-writer + command: `## Lessons learned` opens with `### Git strategy` (proposed, user changes, why) from the build log; manual runs derive the branch from commits | 1 | `agents/walkthrough-writer.md`, `commands/specmanager-walkthrough.md` (G8, G4). |
| 1.23 | `selftest-prompts`: git-strategy invariants (build asks before first dispatch + user can change; builder never pushes/switches; walkthrough records Git strategy) | 2 | `server/src/selftest-prompts.ts` (G7, G8; proposed INV-51…INV-52, INV-50 extended). |
| 1.24 | `core/claude-md.ts`: `renderBlock` adds `### Git strategy` inside the markers from the newest walkthrough's `### Git strategy` section (reuse `core/spec-slice.ts` heading slicer); omitted when none | 2 | (G8 Sync to CLAUDE.md). Line-anchored merge unchanged. Build command's sync step needs no new tool — `sync_claude_md` renders it. |
| 1.25 | `selftest` assertions: Git strategy rendered from a walkthrough, newer walkthrough replaces it, none ⇒ omitted | 1 | `server/src/selftest.ts` (G8). |
| 1.26 | Release prep: bump `plugin.json` 1.1.0 → 1.2.0, `npm ci` + rebuild `server/dist` and `ui/dist`, `selftest-directory`, `claude plugin validate` | 2 | CLAUDE.md "Releasing" steps 1–4; commit any `dist/` change. No packaging-surface test (only `version` changes in `plugin.json`). |

## Human prerequisites

None. The R-1 check (1.13) uses the owner's existing local `claude` CLI login.

## Risk & sequencing notes

- **Core first (1.1–1.5).** The prompts' placeholder and prerequisite paths read `list_phases` fields that only exist after 1.1–1.3; 1.2's default parameter keeps every caller compiling between tasks.
- **Planner before plan command (1.6–1.8)**; build command (1.9–1.10) before builder (1.11) and reviewer (1.12), since 1.10 defines the hand-off both consume. 1.13 depends on 1.12.
- **`selftest-prompts` must stay green after every task** (one commit per task). INV-44 and INV-22 re-wordings ride with their prompt edits (1.6, 1.12) to honour G7's "same commit"; new invariants (1.17, 1.18) land after the text they guard exists.
- **R-1 is the one real rollback risk:** if plugin agents ignore `disallowedTools`, the reviewer inherits write tools. 1.13 verifies and falls back to an explicit `tools:` allowlist (Read, Glob, Grep, Bash + browser MCP wildcards); INV-22's re-worded `what` must then match whichever form ships.
- **Fill mode reverts an approved plan to `draft`** (Q3), which marks the spike walkthrough stale via `propagateStale` — accepted side effect.
- Selftests run from `server/dist`, so every server-touching task runs `npm run build` before its selftest; 1.26 is the final committed rebuild.

## Test strategy

Hand-rolled `selftest-*` scripts in `server/dist/` (no test runner), run via `npm run <name>` from `server/` after `npm run build`:

- 1.4 / 1.5 extend `selftest-phases` and `selftest-build` (core-phase-rollup Tests); `selftest` (core flow) re-run to confirm legacy behaviour.
- `selftest-prompts` covers prompt rules: re-worded INV-22/INV-44 (1.6, 1.12), new INV-45…INV-50 (1.17, 1.18); INV-1, INV-10, INV-13/29, INV-15a/b, INV-25, INV-31, INV-42 kept green; snippet parity with `docs/agent-snippets/`.
- 1.13 is a headless behavioural check of the reviewer's tool surface, recorded in a results file.
- 1.23 adds the G8 git-strategy invariants.
- 1.25 asserts the CLAUDE.md Git strategy render.
- 1.26 runs `selftest-directory` and `claude plugin validate`. Verification of the stakeholder-facing outcome is the reviewer's and walkthrough's job, not a task (G1d).

## Out of scope

- UI work: a placeholder renders as an ordinary empty phase (`ui/src/App.tsx` already handles `empty`); `ui/dist` is rebuilt only per the release checklist.
- Fibonacci sizing / ≤3 cap, `core/tiers.ts`, Stop-gate N=3, R=2 retry, per-task dispatch, `--bulk` semantics.
- The `final` walkthrough's roll-up role (only a short feature-level guide is added, Q4).
- A tool to drop a placeholder when a spike finds no build is needed (Q-B).
- A new history store for retries/blockers (Q8); any new MCP tool; any model or network call from the plugin.
- Edits to `docs/agent-snippets/*` fragments.
- A packaging-surface test (no `.mcp.json` / `hooks/` / non-version `plugin.json` change).

## Open questions

- **Phase split (loop mode decision).** Applied: single phase — no spike, no human setup, 52 points ≪ ≈100. Alternative not taken: two phases, `core` (1.1–1.5, rollup + selftests, demoable via `list_phases`) then `prompts` (1.6–1.26). Rejected because the core change alone ships no user-visible behaviour and none of the G1 triggers applies; 26 tasks exceeds the usual 3–10 per phase, but splitting for size below the threshold would contradict the new rule this feature introduces.
- **INV id assignment.** INV-45…INV-50 are the Architecture's proposed ids; 1.17/1.18 may regroup them (six rules over two tasks) as long as each rule has its own entry.
- **R-1 outcome** decides the reviewer frontmatter form (denylist vs allowlist fallback); recorded by 1.13.
- **Resolved (end questions, 2026-10-20):** single phase confirmed; Q3 fill mode reverts the plan to `draft`; Q5 reviewer denylist + R-1 fallback; Q4 `final` gets a short feature-level guide; Q7 ≈200+ points also offers three phases; Q-A only `kind: "placeholder"` meta-only phases are listed; **Q-B** stays deferred (confirmed).
- **Scope addition (2026-10-20):** G8 git strategy — rows 1.20–1.23; CLAUDE.md sync of the git strategy — rows 1.24–1.25; release prep moved to 1.26. Record ids: 1.20 reuses `task-020` and 1.24 reuses `task-024` (retitled), 1.21–1.23 are `task-021`…`task-023`, 1.25–1.26 are `task-025`…`task-026`.
- **Spike findings location (resolved):** recorded in the spike phase's walkthrough under `## Spike findings` (1.14); fill mode requires that walkthrough `approved` and reads it (1.7, 1.8). No `docs/spikes/` file.
- No path drift: every Architecture-named path exists; `rollupPhases` callers today are `phases.ts` (`listPhases`), `manifest.ts`, `dependencies.ts`; `plugin.json` is at 1.1.0.

## Notes on estimates

Points are relative complexity, not hours; recalibrate after the first phase if prompt rewrites run larger than core edits. Every task is ≤3 because the work is naturally granular (one file or one rule group each), so no subtotal changed. Selftest additions, the R-1 check and release prep are their own tasks so "installable & testable" stays a real gate.
