# Phase 7 — Phased plans, `execute`, and per-phase walkthroughs

Companion to *SpecManager — Architecture & Specification* and `docs/phase-tasks.md`. This document plans an enhancement on top of the Phase 1–6 baseline already shipped.

## Why this exists

Today a plan is a flat task list. Build is "all tasks done → walkthrough". That collapses two distinct ideas:

1. **A phase is a testable, working software increment.** Multiple tasks ladder up to one of these.
2. **A task is a single committable unit.** Sized small (Fibonacci ≤3) so it never blocks a review.

The fix:

- The **planner** must group tasks into **phases**. Each phase ends with a working increment and gets its own walkthrough.
- A new **`/specmanager-execute`** command spawns a **builder subagent** that drives the next non-done phase.
- Walkthroughs split: **one per phase** (replacing the single per-feature walkthrough), plus a **final feature-level walkthrough** once every phase is shipped.

**Scale:** `1` trivial · `2` small · `3` moderate · `5` substantial · `8` large · `13`/`21` epic.
**Sizing rule (now enforced by the planner):** every task ≤3 points. The planner must split anything ≥5 before persisting tasks.

| Phase | Theme | Points |
|-------|-------|--------|
| 7.A | Phased plans: schema + planner enforces phases & Fibonacci | 30 |
| 7.B | Execute + per-phase walkthroughs (full headless loop) | 35 |
| 7.C | Board UI + final feature walkthrough | 26 |
| **Total** | | **91** |

Each phase ends with an installable, testable plugin (`claude plugin install ./specmanager --scope local`) and its own walkthrough.

---

## Phase 7.A — Phased plans: schema + planner

**Goal:** the planner produces plans organised into phases, with Fibonacci-scored tasks ≤3. No execution or UI changes yet — the artifact this phase ships is *better plans*.

**Exit test:** run `/specmanager-plan <feature>` against an approved architecture; the resulting `plan.md` contains a `## Phase <name> — <theme>` section per phase with an explicit `**Exit test:**`; every emitted task has `phase` + `complexity` set; no task has `complexity ≥ 5` (planner re-split before persisting); `list_phases({ featureId })` returns the phases in order. Legacy Phase 1–6 features (no `phase` field on their tasks) keep working — they surface under a synthetic `"default"` phase.

| # | Task | Pts | Notes |
|---|------|-----|-------|
| 7.A.1 | Add `phase` (string) and `complexity` (1\|2\|3\|5\|8\|13) to `TaskSchema` in `core/types.ts`; both optional for back-compat | 2 | |
| 7.A.2 | Reject `complexity ≥ 5` at write time with a `splitRequired` error code | 1 | enforced by `create_task` / `update_task` |
| 7.A.3 | Legacy fallback: when reading `tasks.json`, default missing `phase` to `"default"` and missing `complexity` to `null`. Non-destructive; no on-disk rewrite | 2 | |
| 7.A.4 | `core/phases.ts`: `listPhases(featureId)` returns ordered descriptors `{ name, order, taskCount, doneCount, status }` derived from tasks | 3 | order is first-seen order in `tasks.json` |
| 7.A.5 | `core/phases.ts`: `getNextPhase(featureId)` returns the first phase whose tasks aren't all done; `null` if all complete | 2 | used by execute (Phase 7.B) |
| 7.A.6 | MCP tools: `list_phases` + `get_next_phase` | 2 | mirrors existing tool style |
| 7.A.7 | Extend `create_task` to accept `phase` and `complexity` | 2 | planner uses this |
| 7.A.8 | Manifest cache: include per-feature phase rollup so board doesn't recompute on every request; invalidate on `task.updated` | 2 | future-proof for 7.C UI |
| 7.A.9 | Unit tests: phase rollup, legacy fallback, complexity validation | 2 | |
| 7.A.10 | Rewrite `agents/planner.md` prompt: require phases, explicit exit test per phase, Fibonacci complexity per task, auto-split ≥5 | 3 | the load-bearing change |
| 7.A.11 | Planner self-check: before `create_task`, planner re-reads its own draft and refuses to persist items with `complexity ≥ 5` — re-splits and retries | 3 | belt-and-braces with the schema gate from 7.A.2 |
| 7.A.12 | `plan.md` template section: standard heading shape (`## Phase <name> — <theme>`, `**Exit test:** …`) so 7.B's builder can parse phase names back out reliably | 2 | |
| 7.A.13 | Update `commands/specmanager-plan.md` to reflect the new contract | 1 | |
| 7.A.14 | Update `docs/architecture-and-spec.md` lifecycle section to describe phases | 2 | |
| 7.A.15 | Brownfield re-plan against this repo as a smoke test; install + manual test pass | 1 | exit gate |

---

## Phase 7.B — Execute + per-phase walkthroughs (full headless loop)

**Goal:** the entire phased build loop works end-to-end via slash commands, with no UI changes. By the end of 7.B you can take an approved phased plan → execute one phase → write its walkthrough → repeat — all from a Claude session.

**Exit test:** with a feature whose Plan (phased) is approved, `/specmanager-execute <feature> next` spawns the builder; builder reads `get_next_phase`, works that phase's tasks in `dependsOn` order, marks each `in_progress` → `done` with real commit/file artifacts, stops at the phase boundary and reports "Phase X complete — ready for walkthrough"; it does **not** start Phase X+1. Then `/specmanager-walkthrough <feature> X` opens (gate passes because Phase X is done), writes `walkthroughs/<slug>/phase-x.md` scoped to Phase X's artifacts, and refuses if any Phase X task isn't `done`. Phase Y's walkthrough gate stays closed.

| # | Task | Pts | Notes |
|---|------|-----|-------|
| 7.B.1 | Storage layout: `walkthroughs/<slug>/phase-<name>.md` (per-phase) + reserved `walkthroughs/<slug>/feature.md` slot for 7.C's final | 2 | one-time, non-destructive migration of existing per-feature walkthrough → `phase-default.md` |
| 7.B.2 | Doc frontmatter: add optional `phase?: string` to walkthrough docs; schema migration handles missing field | 2 | |
| 7.B.3 | `checkGate` walkthrough rule: accept optional `phase` arg, gate on that phase's tasks being done. Back-compat: no `phase` → gate on all tasks of the synthetic `"default"` phase | 3 | replaces the current "all tasks done" rule |
| 7.B.4 | `walkthrough-writer.md` agent: accept `phase` input, scope code tour to that phase's task artifacts only, refuse if any of that phase's tasks aren't done | 3 | |
| 7.B.5 | Update `commands/specmanager-walkthrough.md` to take `<feature> <phaseName>` arg | 2 | `final` sentinel reserved for 7.C |
| 7.B.6 | Manifest: phase walkthroughs roll up under a feature so the board (Phase 7.C) can render one card per phase | 2 | |
| 7.B.7 | New `agents/builder.md` subagent: reads `get_next_phase`, lists that phase's tasks in `dependsOn` order, executes each, records artifacts via `update_task` | 3 | tools allow-list: Read/Edit/Write/Bash + SpecManager MCP |
| 7.B.8 | Builder stop conditions: stops at phase boundary OR at first task failure (status stays `in_progress`, surfaces error); never silently advances | 3 | |
| 7.B.9 | Builder artifact discipline: every `done` transition must include at least one commit or file ref | 2 | enforced in agent prompt + verified at `update_task` time |
| 7.B.10 | `commands/specmanager-execute.md`: resolves feature, accepts `<phaseName \| "next">`, checks the Plan is approved, picks the target phase, invokes builder | 3 | argument-hint: `<featureId or slug> <phaseName \| "next">` |
| 7.B.11 | Refuse to execute a phase out of order (Phase B can't run while Phase A has open tasks) unless caller passes `--force` | 2 | |
| 7.B.12 | After builder returns, suggest `/specmanager-walkthrough <feature> <phaseName>` in the report (don't invoke; user reviews first) | 1 | |
| 7.B.13 | Register `/specmanager-execute` in the plugin manifest + CLAUDE.md managed-block listing | 1 | |
| 7.B.14 | End-to-end test on a scratch repo: plan (phased) → execute next phase → walkthrough that phase → repeat for a second phase | 3 | exit gate |
| 7.B.15 | Manual test pass + README install steps update | 2 | |

---

## Phase 7.C — Board UI + final feature walkthrough

**Goal:** the visible layer on top of 7.A/7.B, plus the feature-level roll-up walkthrough that ties phases together.

**Exit test:** open the board; the Build column for a feature shows tasks grouped under collapsible phase headers with per-phase progress bars; the Walkthrough column shows one card per phase (states: locked / ready / drafted / approved) plus a final-walkthrough card that stays locked until every phase walkthrough is `approved`; an "Execute next phase" affordance triggers `/specmanager-execute <feature> next` (slash-command copy pattern, like other Generate buttons); once every phase walkthrough is approved, `/specmanager-walkthrough <feature> final` writes `walkthroughs/<slug>/feature.md` that links each phase walkthrough.

| # | Task | Pts | Notes |
|---|------|-----|-------|
| 7.C.1 | REST: extend `/api/board` payload to include per-feature `phases[]` with rollup counts | 3 | reuses 7.A.8 cache |
| 7.C.2 | Build cell: group tasks under phase headers; collapse/expand; per-phase progress bar | 3 | |
| 7.C.3 | Walkthrough column: render N phase walkthrough cards instead of one | 3 | states identical to other doc cards |
| 7.C.4 | "Execute next phase" affordance on each feature row | 2 | slash-command copy pattern |
| 7.C.5 | Live WS: phase rollup updates on `task.updated`; walkthrough cards on `document.changed` | 2 | extend existing handlers |
| 7.C.6 | `frontend-design` polish pass for phase headers + walkthrough sub-cards | 2 | |
| 7.C.7 | `checkGate` final-walkthrough rule: `phase: "final"` opens only when every phase has an `approved` walkthrough | 2 | |
| 7.C.8 | `walkthrough-writer` agent: `phase: "final"` mode — read every phase walkthrough + plan + PRD, write a narrative roll-up that links each phase. No new code tour; references existing phase walkthroughs | 3 | |
| 7.C.9 | Final-walkthrough card on the board; locked tooltip explains which phases still need approval | 2 | |
| 7.C.10 | Manual test on a multi-phase feature + screenshots + README install steps | 2 | exit gate |

---

## Out of scope

- Multi-feature batch execution. `/specmanager-execute` runs one feature at a time.
- Auto-approval of walkthroughs. Builder stops; user reviews; user approves. Same gate discipline as today.
- Parallel phase execution. Phases are sequential by design — they're the testable boundary.
- Cross-feature phase dependencies. Each feature's phases are local to that feature.

## Notes on estimates

- Points are relative complexity, not hours.
- 7.A's planner rewrite (7.A.10, 7.A.11) is the load-bearing change. Everything downstream depends on the planner reliably emitting phases + Fibonacci-scored tasks.
- 7.B is intentionally large (35 pts) because it bundles the full headless loop into one exit test — execute and per-phase walkthroughs are interlocking. Splitting them would create an unobservable midpoint (per-phase walkthroughs you can't trigger without execute, or execute that has nowhere to hand off to).
- 7.C is the visible layer; everything it shows works headlessly before 7.C starts.
