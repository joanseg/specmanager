---
id: plan-build-leverage-primitives-012
featureId: feat-build-leverage-primitives
stage: plan
status: approved
stale: false
title: Build leverage primitives plan
dependsOn:
  - arch-build-leverage-primitives-016
basedOn:
  arch-build-leverage-primitives-016: 5
generatedBy: agent
version: 1
createdAt: '2026-06-15T12:16:57.458Z'
updatedAt: '2026-06-15T12:21:36.932Z'
---
# Build leverage primitives plan

## Overview

Six build-time leverage primitives (R1–R6 of `prd-build-leverage-primitives-024`, designed in `arch-build-leverage-primitives-016`) split into two phases. **Phase 1 (core)** lands all the enforcement machinery that must exist before any prompt can lean on it — the `meta.phases.{testCommand,architectureRefs}` schema, the deterministic `resolve_active_card` / `core/tiers.ts` helpers, the `stop-gate.sh` Stop hook, the `mergeSynthesizedTokens` + `bootstrap_design_tokens` design-token write path, the per-task tier dispatch, the reviewer agent + parent slice-assembly, and the planner emitting both `meta.*` fields. **Phase 2 (wiring)** is pure detect-then-defer prompt edits (`builder.md` Superpowers, `designer.md`/`builder.md` `frontend-design` consuming the Phase-1 R5 core, `architect.md` Context7 ladder + anchor convention) with no compiled-code surface. The split exists because Phase 1 ships installable, self-testable enforcement (build + selftests + plugin-validate green) that the Phase-2 prompt wiring strictly depends on — Phase 2's verification is manual dry-run, so pausing after Phase 1 lets the user confirm the deterministic spine before the prompt-only layer goes on.

**Scale:** `1` trivial · `2` small · `3` moderate · `5` substantial · `8` large · `13`/`21` epic.

*Every task below is decomposed to **≤3 points**. Where a primitive was larger (the Phase-1 R1 gate, the R5 design-token path, the R3 reviewer) it was split into granularity-only sub-tasks; phase subtotals are unchanged.*

| Phase | Theme | Points |
| --- | --- | --- |
| core | enforcement machinery (server/core + deterministic gate) | 27 |
| wiring | pure prompt detect-then-defer | 9 |
| **Total** | | **36** |

---

## Phase core — enforcement machinery (server/core + deterministic gate)

Covers **R1, R2, R3, R5-core**. All compiled server/core code, the `stop-gate.sh` hook, the reviewer agent + parent slice-assembly, the per-task tier dispatch, and the planner emitting both `meta.*` fields. Server source changes ship only after `npm run build` regenerates `dist/`.

**Exit test:** `npm run build` clean in `plugins/specmanager/server`; new selftests for the stop-gate and tiers plus existing `selftest-phases` / `selftest-build` green; `claude plugin validate plugins/specmanager` passes.

| # | Task | Pts | Notes |
| --- | --- | --- | --- |
| 1.1 | Extend `TasksFileSchema` with `meta.phases[<phase>]: { testCommand, architectureRefs[] }` | 2 | `core/types.ts`: `meta: z.object({ phases: z.record(z.object({ testCommand: z.string(), architectureRefs: z.array(z.string()).default([]) })).default({}) }).optional()`. Zod defaults ⇒ zero migration; confirm phase keys match `phases.ts`/`get_next_phase` naming. Foundation for R1/AC5 + R3/AC2b. |
| 1.2 | Update `planner.md` to emit `meta.phases[<phase>].testCommand` + `architectureRefs` for every phase | 3 | `agents/planner.md` (+ `commands/specmanager-plan.md` if relevant). One change touching BOTH R1 (testCommand: runnable command, or literal `\"none\"` for prompt-wiring/manual phases — never absent) and R3 (architectureRefs: Architecture anchor ids/slugs). Bounded to those two fields; no other planner behaviour changes. |
| 1.3 | Add `core/active-card.ts` `resolveActiveCard(root?)` + MCP tool `resolve_active_card` | 3 | New `core/active-card.ts`: wraps `getNextPhase` (`core/phases.ts`) over the feature with open tasks; returns `{featureId,slug,phase,testCommand,exitTest,openTaskIds}` or `null`. `testCommand` = active phase's `meta.testCommand` (primary). Register `resolve_active_card({})` in `mcp.ts`. Resolve root from `SPECMANAGER_PROJECT_DIR ?? CLAUDE_PROJECT_DIR` (`paths.ts`), never cwd. |
| 1.4 | Add `core/tiers.ts` (complexity→tier→alias table + helpers) | 2 | New `core/tiers.ts`: `DEFAULT_COMPLEXITY_TO_TIER` (1→cheap,2→standard,3→strong,>3/null→strong), `DEFAULT_TIER_TO_ALIAS` (cheap→haiku,standard→sonnet,strong→opus — aliases, never dated ids), `tierForComplexity(c)`, `aliasForTier(tier, sessionTable)`. Pure, no persistence (R2/AC1,AC2). |
| 1.5 | Write `hooks/stop-gate.sh` discovery + test-run + criteria-check core | 3 | New pure-bash `Stop` hook (zero model calls, R1/AC3). Resolve active card via `resolve_active_card` (one-shot `node dist/...`). testCommand: runnable ⇒ run, exit code is result; `\"none\"` ⇒ skip run, verify criteria only; absent ⇒ fall back to `**Exit test:**` line / convention probe (`npm test`/`uv run pytest`/`cargo test`); unresolved ⇒ exit 0 (never invent a failure). Criteria = command exits 0 + all phase tasks `done` with artifacts. Fail ⇒ exit 2 with actionable stderr (`tests failing: <last N>` / `phase <name> tasks not done: <ids>`). |
| 1.6 | Add iteration-cap counter + blocked-marker to `stop-gate.sh` | 2 | Counter file keyed `${slug}__${phase}` under `.claude/specs/.cache/stop-gate/`; cap N=3 (PRD-confirmed). Reset on phase-key change or exit-0 pass. Nth fail ⇒ write `blocked: <reason>` note into phase `tasks.json` meta + build-command marker, then exit 0 (no infinite loop). Ensure the cache dir is git-ignored (planner `.gitignore` guidance / init ignore). |
| 1.7 | Wire `Stop` entry into `hooks.json` + add `selftest-stopgate` | 2 | Edit `hooks/hooks.json`: add `Stop` invoking `bash \"${CLAUDE_PLUGIN_ROOT}/hooks/stop-gate.sh\"` alongside `SessionStart`/`FileChanged`. New `server/` `selftest-stopgate` (hand-rolled, matching `selftest-*` style): no-op-when-nothing-in-flight, command-fail ⇒ exit 2, `\"none\"` ⇒ skip+criteria, cap ⇒ blocked+exit 0. Wire `npm run selftest-stopgate`. `claude plugin validate` after the `hooks.json` edit. |
| 1.8 | Add `selftest-tiers` covering the complexity→alias mapping | 1 | New `server/` `selftest-tiers` + `npm run selftest-tiers`: assert default mapping, session-table override, and `>3`/null→strong + unknown→fallback behaviour. |
| 1.9 | Add a real `blocked` task status (board column/badge + rollup) | 3 | Per PRD open-question-1 (\"Yes\"): introduce `blocked` in `TASK_STATUS` (`core/types.ts`), thread through `phases.ts` rollup, board-server read, and the UI column/badge so the R1/AC2 + R3/AC5 cap surfaces a first-class state rather than only a meta note. Remediation: a blocked card is cleared by re-entering its phase (counter resets) and re-building. |
| 1.10 | Add `mergeSynthesizedTokens` to `core/design-md.ts` | 3 | Fill-placeholder, marker-anchored merge: parse YAML inside `<!-- specmanager:design:start/end -->`, overlay synthesized values **only** where existing is a `# TODO`/sentinel placeholder or absent; never clobber harvested CSS-var values. Reuse the exact `START`/`END` slice logic from `syncDesignMd` (R5/AC8, open-question-5 resolution). |
| 1.11 | Add MCP tool `bootstrap_design_tokens` (the only AC8 write path) | 2 | Register `bootstrap_design_tokens({ tokens })` in `mcp.ts` calling `mergeSynthesizedTokens`; emits `design.synced`. Parent/designer-invoked write path (mirrors `create_design_brief` — designer never raw-`Write`s). |
| 1.12 | Wire per-task tier dispatch into `commands/specmanager-build.md` | 2 | At build start `AskUserQuestion` confirms/remaps session tier→alias table (R2/AC3, AC1 defaults pre-filled). Per task: read `complexity`, map via `core/tiers.ts`, dispatch `Task(builder, model:<alias>)` **per-task** (PRD open-question-2: \"per-task\"). Unknown/unavailable alias ⇒ omit override ⇒ `inherit` (AC4). |
| 1.13 | Note builder model is parent-supplied in `agents/builder.md` | 1 | `agents/builder.md` frontmatter stays `model: inherit`; document that the per-task alias is supplied by the parent dispatch (R2/AC4 fallback). Bounded to this note — Superpowers/frontend-design wiring is Phase 2. |
| 1.14 | Add the read-only `agents/reviewer.md` subagent | 2 | New `agents/reviewer.md`: `tools:` limited to `Read, Glob, Grep, Bash` — no `Write`/`Edit`/`update_task`, no Architecture-doc read tools (receives the assembled slice as input). Returns `{ verdict: \"pass\"\|\"fail\", reasons: string[] }`; never writes. Parent always invokes it at strong alias (R3/AC1,AC3,AC6). |
| 1.15 | Add parent slice-assembly + reviewer invocation to `commands/specmanager-build.md` | 3 | After R1 gate exits 0 and before card advance: assemble slice = phase's `plan.md` section + task titles/notes (`tasks.json`) + Architecture section(s) named in `meta.architectureRefs` (name/id-match fallback if absent). Invoke reviewer (strong); `pass` ⇒ advance, `fail` ⇒ re-dispatch fix one tier higher (capped strong), counting against the same N=3 counter; persistent fail ⇒ blocked (R3/AC2,AC5 — no second loop). |

---

## Phase wiring — pure prompt detect-then-defer

Covers **R4, R5-prompt, R6, R3/AC2a**. Instruction-level edits only — no compiled-code surface. Consumes the Phase-1 R5 core (`mergeSynthesizedTokens` / `bootstrap_design_tokens`) and the Phase-1 reviewer.

**Exit test:** `claude plugin validate plugins/specmanager` passes; manual dry-runs (a design with thin `docs/DESIGN.md` tokens; an architecture draft hitting a version-sensitive library).

| # | Task | Pts | Notes |
| --- | --- | --- | --- |
| 2.1 | Wire Superpowers TDD/debug/review into `agents/builder.md` + shared de-dup line | 3 | R4: detect-then-defer to Superpowers TDD (red→green→refactor), systematic-debugging, two-stage review when installed, feeding each the task's spec section; absent ⇒ plain loop unchanged (AC2). One shared de-dup line (\"if Superpowers installed, defer and skip built-in equivalents\", AC3) reused by R5. Execution-discipline only, no vendoring (AC4). Composes with the Phase-1 R3 reviewer (in-build discipline vs. parent pre-advance gate). |
| 2.2 | Wire `frontend-design` 3-tier + grounding ladder into `designer.md` + `commands/specmanager-design.md` | 3 | R5-prompt: `designer.md` detect-then-defer to `frontend-design` on top of `docs/DESIGN.md` tokens (AC2,AC3); 3-tier distilled fallback baked in (AC5, no vendoring); grounding ladder real tokens → optional example/screenshot → synthesize (AC6); optional-reference invite when tokens thin (AC7); on synthesize call the Phase-1 `bootstrap_design_tokens` (AC8). `commands/specmanager-design.md`: note the optional design-reference invitation (reuses screenshot path). No new surface (AC1). |
| 2.3 | Wire `frontend-design` detect-then-defer into UI build tasks in `agents/builder.md` | 1 | R5/AC2: UI-touching build tasks do the same detect-then-defer, colors/type still tracing to `docs/DESIGN.md`; reuses the 2.1 shared de-dup line so Superpowers + `frontend-design` never double-trigger. |
| 2.4 | Wire Context7 doc-lookup ladder into `agents/architect.md` | 2 | R6: on-demand architect-only (AC1); ladder prefer Context7 MCP tools (`resolve-library-id`/`query-docs`) else curl REST v2 — `GET context7.com/api/v2/libs/search?query=` then `GET .../api/v2/context?libraryId=/owner/repo&query=`, optional `@version` pin (AC2); keyless works (60 req/hr anon pool) — treat 429/unconfigured/empty like \"not configured\" ⇒ suggest install + proceed, never block (AC4); note consulted library/version when it informs a decision (AC5). No `.mcp.json` change (AC3). |
| 2.5 | Add the Architecture anchor-scheme convention to `agents/architect.md` | 1 | R3/AC2a: architect writes each requirement/component section under a stable heading whose leading token is the anchor (requirement id `R1`/`R2`… or kebab-slug of the heading), so `meta.architectureRefs` resolves unambiguously. Formalizes structure the architect already produces; bounded to section-anchoring. |

---

## Risk & sequencing notes

- **Phase 1 internal ordering is load-bearing.** 1.1 (schema) gates 1.2 (planner emit), 1.3 (`resolve_active_card` reads `meta.testCommand`), and 1.10 (token merge shape is independent but lives in the same phase). 1.3 + 1.4 must land before their consumers: 1.5–1.7 (`stop-gate.sh` calls `resolve_active_card`), 1.12 (dispatch uses `tiers.ts`), 1.14/1.15 (reviewer + slice-assembly). 1.10 gates 1.11 (`bootstrap_design_tokens` calls `mergeSynthesizedTokens`).
- **Server source ⇒ rebuild.** Every `core/`/`mcp.ts` change (1.1, 1.3, 1.4, 1.9, 1.10, 1.11) needs `npm run build` to regenerate the committed `dist/` before it ships — the exit test's `npm run build` is the gate.
- **`hooks.json` edit ⇒ re-validate.** 1.7 must be followed by `claude plugin validate plugins/specmanager`; a malformed hook entry breaks plugin load.
- **`blocked` status (1.9) touches the enum + rollup + UI** — the widest-blast-radius change; sequence it after the gate machinery so the marker path (1.6) exists as the data source it surfaces. Rollback is a `TASK_STATUS` revert plus board read — keep it isolated in one task.
- **Phase 2 strictly depends on Phase 1.** 2.2/2.3 call the Phase-1 `bootstrap_design_tokens`; 2.1 composes with the Phase-1 reviewer; 2.5 is the convention the Phase-1 `meta.architectureRefs` (1.2) and slice-assembly (1.15) resolve against. Pausing at the boundary lets the user confirm the deterministic spine before prompt-only wiring.

## Test strategy

- **Phase 1 — automated.** New hand-rolled `selftest-stopgate` (1.7) and `selftest-tiers` (1.8) in `server/` matching the existing `selftest-*` convention (node scripts in `dist/`, run by name). Existing `selftest-phases` (schema/rollup — must stay green after the 1.1 `meta` extension and the 1.9 `blocked` rollup change) and `selftest-build` (per-phase gates) are re-run. `claude plugin validate plugins/specmanager` after the 1.7 `hooks.json` edit. `npm run build` gates the whole phase.
- **Phase 2 — manual dry-run.** Pure prompt wiring has no unit surface; verification is `claude plugin validate` plus two manual dry-runs: a `/specmanager-design` on a project with thin/placeholder `docs/DESIGN.md` tokens (confirm the ladder + bootstrap-back fires), and a `/specmanager-architecture` draft hitting a version-sensitive library (confirm the Context7 ladder + graceful no-op). This is why Phase 2's `meta.testCommand` is the explicit `\"none\"` marker (R1/AC5).

## Out of scope

Carried from the PRD non-goals — not tasks here: per-card agent orchestration / worktree isolation; GitHub issue/PR sync; headless overnight board-drain; preference-learning / decision corpus; Cerebras integration; wiring Superpowers' brainstorming/planning skills; vendoring Superpowers or `frontend-design` code (detection + instruction-level wiring only); a `design-brief.md` artifact or `/specmanager-design-brief` command (duplicates `docs/DESIGN.md` + `create_design_brief`); any `.mcp.json` change for R6 (no bundled Context7 server).

## Notes on estimates

Points are relative complexity, not hours; calibrate against the first couple of Phase-1 core tasks once they land. Every task is ≤3 — the larger primitives (the R1 gate, the R5 token path, the R3 reviewer) were split into granularity-only sub-tasks, so phase subtotals are unchanged by the split. Testing is its own per-phase work: the `selftest-stopgate`/`selftest-tiers` scripts (1.7, 1.8) are real tasks, and Phase 2's verification is the manual dry-run named in its exit test — so \"installable & testable\" stays a real gate at each phase boundary rather than an afterthought.
