---
id: prd-post-phase-design-conformance-check-004
featureId: feat-post-phase-design-conformance-check
stage: prd
status: draft
stale: false
title: Post-phase design conformance check PRD
dependsOn: []
basedOn: {}
generatedBy: agent
version: 2
createdAt: '2026-05-29T10:04:27.441Z'
updatedAt: '2026-05-31T14:46:36.666Z'
---
## Problem

SpecManager already lets a user produce approved design mockups (`mockups.html`) before a feature is built. But once the **builder** finishes a phase, nothing checks whether what shipped actually matches that approved design. Front-end polish gaps — wrong spacing rhythm, off-token colors, missing empty/loading/error states, drifted type hierarchy — slip through silently. The user only discovers them later by manually eyeballing the running app against the mockups, screen by screen.

This is wasteful in exactly the moment it's cheapest to fix: right after a phase commits, with full context fresh. The mechanism to compare is already present — the board server serves `mockups.html` on `127.0.0.1`, and the Claude-in-Chrome MCP tools can navigate, screenshot, and read computed styles. What's missing is an automated, advisory step that renders the delivery, compares it against the approved design, and asks the user which gaps to close now.

A partial delivery is often *intentional*. A multi-phase plan may deliberately ship a rough version of a screen now and refine it in a later phase. A naive conformance check would flag those deferred refinements as defects, drowning real gaps in noise. Understanding the *whole plan* and suppressing gaps that a later phase will close is valuable — but it is **not required for a useful first version**, and it is deferred to a named enhancement (see Scope).

## Scope (MVP-first)

This feature ships in two cuts. The MVP is deliberately dead-simple; everything that adds judgment or schema lives in a later enhancement.

- **MVP (this feature's first cut):** screenshot each approved mockup screen and the matching built screen, have the model eyeball a structural diff, write the resulting polish checklist to disk, and ask the user — via a bounded question — which gaps to fix now. No later-phase awareness, no `docs/DESIGN.md` token cross-checks, no `tasks.json` schema change. Covered by FR1–FR5, FR7 (checklist), FR8, FR9.
- **Enhancement 1 — later-phase awareness (FR6):** load the full plan and suppress/annotate gaps a later phase will close. This is the first enhancement, **not** in the MVP.
- **Enhancement 2 — token-level conformance:** cross-check observed computed styles against `docs/DESIGN.md` tokens (the optional second bullet of FR5).

Where the check runs is fixed for both cuts: **in the `/specmanager-build` skill (the orchestrator, main session), invoking a dedicated checker subagent, after the builder returns.** The builder subagent itself stays pure — no Chrome tools, stops at the phase boundary. See FR1/FR2.

## Users

Single user: the local developer driving SpecManager on their own machine. They run `/specmanager-build <feature> <phase>` to build a phase and own all approvals. There is no team, no remote, no auth (board binds to `127.0.0.1` only).

### Jobs to be done
- "After I build a UI phase, tell me where the result drifts from the design I approved — without me opening two windows and squinting."
- "Don't nag me about things a later phase is already going to fix." (enhancement)
- "Let me decide which gaps to fix now; don't surprise-edit my code."
- "Never let this check break or block my build — it's a nicety, not a gate."

## Goals

- After the builder reports "phase complete," automatically run a design-conformance check **when warranted** (see Trigger gate).
- Render each approved mockup screen and the corresponding built screen, compare them on concrete front-end dimensions, and produce a **polish checklist** of gaps.
- Present gaps to the user via a **bounded confirmation question** and fix only the gaps they confirm.
- Be fully **advisory and non-blocking**: the phase is already done and committed before this runs; the check never gates the pipeline and degrades gracefully on any failure.
- Be **re-runnable on demand** as a standalone command (`/specmanager-design-check`), independent of a fresh build.
- *(Enhancement)* Be **later-phase-aware**: suppress, but still surface annotated, gaps that a later phase of the same feature is scheduled to close.

## Non-goals

- **Not a general QA / bug-finding tool.** It checks front-end design conformance against approved mockups, not functional correctness, accessibility audits, or cross-browser matrices.
- **Not a gate.** It never blocks phase completion, advancement, or any stage transition. The phase is complete before it runs.
- **Not a replacement for human design approval.** The user still approves `mockups.html` upstream; this checks delivery *against* that already-approved artifact.
- **Not pixel-perfect diffing.** No exact-pixel image comparison; the comparison is structural/token-level LLM judgment, deliberately tolerant.
- **Not an auto-fixer.** Nothing is changed without explicit user confirmation.
- **Not part of the builder.** The builder stays pure (no Chrome tools, stops at the phase boundary). This is a separate concern.

## Target architecture context (grounding, not design)

This PRD assumes — and must not contradict — current SpecManager mechanics:

- The **builder** subagent executes exactly one phase (todo→in_progress→done, commits, records artifacts), stops at the phase boundary, and has a tight tool list with **no Chrome tools**.
- `/specmanager-build <feature> <phase>` orchestrates the builder via `Task`, after checking the plan is approved. It is the natural place to invoke a post-build check once the builder returns.
- The **designer** subagent emits one self-contained `mockups.html` at `.claude/specs/features/<slug>/design/mockups.html`: stacked `<section class="sm-screen">` mockups with `<section class="sm-note">` notes between them, grounded in `./docs/DESIGN.md` tokens. Design is optional, but if a design draft exists, Plan refuses until it's approved.
- The **board server** serves `mockups.html` and binds to `127.0.0.1`.
- Task records (`tasks.json`) carry: id, featureId, title, status, phase, complexity, dependsOn, artifacts {commits, files, pr}. There is **no "this is a UI task" flag** today.
- `./docs/DESIGN.md` holds canonical design tokens in YAML frontmatter.
- Claude-in-Chrome MCP tools (`mcp__claude-in-chrome__*`) provide navigate / screenshot / read page text / read console — the browser automation used to compare delivery vs mockup.

## Functional requirements

### FR1 — Dedicated checker subagent *(MVP)*
The conformance check runs in a **new dedicated subagent** (e.g. `design-checker`), not bolted onto the builder. A subagent is chosen deliberately: the comparison is screenshot- and page-read-heavy, and isolating it keeps that context out of the main session — the subagent returns only the checklist. The builder remains pure. The checker has the tools it needs (Read/Glob/Grep, the Chrome MCP tools, SpecManager read tools, and whatever it needs to launch/reach the running app), kept as tight as the job allows.

### FR2 — Orchestration and standalone invocation *(MVP)*
- The **`/specmanager-build` skill** invokes the checker via `Task` **after** the builder returns "phase complete" and after the phase's commits exist. The check lives in the orchestrator skill, never inside the pure builder subagent.
- The same check is exposed as a **standalone, re-runnable command, `/specmanager-design-check <feature> <phase>`**, so the user can run conformance against any built phase without rebuilding.

### FR3 — Trigger gate (all conditions required; otherwise skip) *(MVP)*
The check runs only if **all** hold:
1. An **approved design doc** exists for the feature (`mockups.html` approved).
2. The phase **actually touched UI** (detection mechanism is a provisional decision — see Provisional decisions).
3. The app is **renderable** — the dev server can be launched / the relevant route is reachable.

If any condition fails, the check **skips gracefully** with a clear, single-line message stating why (e.g. "No approved design — skipping conformance check"). A skip is never an error.

### FR4 — Graceful degradation *(MVP)*
Any failure in the check (Chrome unavailable, app won't launch, route unreachable, screenshot fails) results in a **clean skip with an explanatory message**, never an error that disrupts or appears to fail the build. The build's success is independent of this check.

### FR5 — Render + compare loop *(MVP; token cross-check is Enhancement 2)*
For each design screen:
- Render the mockup screen (served by the board server) and screenshot it = **expected**.
- Launch/reach the built app, navigate to the **matching route**, screenshot at the **matching viewport** = **actual**.
- Compare on concrete dimensions:
  - layout / structure
  - spacing rhythm
  - type hierarchy
  - color / token fidelity
  - component styling
  - presence of empty / loading / error states
- *(Enhancement 2)* Cross-check observed computed styles against `./docs/DESIGN.md` tokens where feasible.

(Screen→route mapping is a provisional decision — see Provisional decisions.)

### FR6 — Later-phase awareness *(Enhancement 1 — not in MVP)*
Before flagging any gap, the checker loads the **entire plan and all phases' tasks**. For each candidate gap it classifies:
- If a **later** task/phase plausibly closes the gap → **suppress and annotate** it as deferred, naming the covering phase/task (e.g. "deferred — covered by Phase D / task-031").
- Otherwise → **flag it now**.

Because this is LLM judgment, the checker must **always show its reasoning** so the user can override a suppression. Until this enhancement lands, the MVP flags every observed gap and relies on the user to decline deferred ones at the confirmation step.

### FR7 — Polish checklist output *(MVP)*
The check produces a structured checklist, **written to disk as the durable artifact** (the AskUserQuestion surface is bounded — see FR8 — so the full list must live somewhere the user can read in whole). Each item carries:
- `screen`
- `dimension` (layout / spacing / type / color / component / state)
- `expected` vs `observed`
- `severity`
- `deferred?` + which phase covers it (Enhancement 1 only)
- `suggestedFix`

### FR8 — Interaction model *(MVP)*
`AskUserQuestion` caps each question at **4 options, including in `multiSelect` mode** — so it cannot list an arbitrary-length checklist directly. The interaction is therefore built around the written checklist (FR7), not around stuffing every gap into one prompt:
1. The full checklist is written to disk and its path surfaced to the user.
2. A first bounded question asks how to proceed: **fix all flagged gaps** / **let me pick** / **skip / fix none**.
3. If "let me pick," gaps are presented **severity-ranked in batches of ≤4** via successive `multiSelect` questions (highest-severity batch first); the user can stop after any batch.
4. *(Enhancement 1)* A separate batch offers deferred-but-overridable items so the user can promote a deferred gap to "fix now."

Confirmed gaps get fixed; declined/unreviewed gaps do not.

### FR9 — Fix application and bookkeeping *(MVP)*
- Only **user-confirmed** gaps are fixed.
- Fixes must be **board-honest** and preserve SpecManager's artifact/commit invariant (the exact bookkeeping shape is a provisional decision — see Provisional decisions).

## User flows

### Flow A — Automatic, after building a UI phase
1. User runs `/specmanager-build <feature> <phase>`.
2. Builder executes the phase, commits, records artifacts, reports "phase complete."
3. The `/specmanager-build` skill invokes the `design-checker` subagent.
4. Checker evaluates the trigger gate. If it fails → prints skip reason, done.
5. Checker renders mockups (board server) and the built app (Chrome), compares screen by screen.
6. Checker writes the polish checklist to disk. *(Enhancement 1: classifies each gap as flag-now or deferred, with reasoning.)*
7. Checker surfaces the checklist path and asks the bounded proceed question (fix all / pick / skip); on "pick," presents severity-ranked batches of ≤4.
8. User selects which to fix; checker fixes only those and records them board-honestly.
9. The skill's normal "phase done" report proceeds, unaffected.

### Flow B — Standalone re-run
1. User runs `/specmanager-design-check <feature> <phase>` against an already-built phase.
2. Same as Flow A from step 4 onward. No rebuild occurs. (This is the path most likely to meet a cold board server — see FR3.3 / assumptions; it skips gracefully if the board isn't launchable.)

### Flow C — Graceful skip
1. Trigger gate fails (no approved design / phase didn't touch UI / app not renderable), or a tool fails mid-run.
2. Checker prints a single clear message and exits cleanly. Build status is unchanged.

## Success criteria

- When run on a UI phase with an approved design, the checker produces a screen-by-screen polish checklist (written to disk) with concrete expected-vs-observed gaps on the named dimensions.
- The user is asked via a **bounded** interaction — a proceed question plus, if they opt in, severity-ranked batches of ≤4 — never a single prompt that tries to list every gap. Only confirmed gaps are changed.
- No run of the check ever fails or blocks the build: every non-applicable or failure path ends in a clean skip with a clear message.
- The builder remains unchanged (still no Chrome tools, still stops at the phase boundary); the check lives in the `/specmanager-build` skill and in the standalone `/specmanager-design-check` command.
- The check is runnable both automatically post-build and standalone on demand.
- *(Enhancement 1)* Gaps that a later phase is scheduled to close are **not** presented as fix-now items by default — they appear as deferred with the covering phase named and reasoning shown.

## Constraints & assumptions

- Single-user, fully local; board server binds to `127.0.0.1`. (Assumption: the running app under test is also reachable locally.)
- Resolve project root from `${CLAUDE_PROJECT_DIR}`, not cwd.
- Comparison relies on Claude-in-Chrome MCP tools being available; their absence is a graceful-skip condition, not a hard dependency.
- The check operates on a phase that is already complete and committed — it never runs before the builder finishes.
- (Assumption) The board server is already running or launchable to serve `mockups.html` for the "expected" screenshots; if not, that is a skip condition. The standalone re-run (Flow B) is the most likely to hit a cold board.
- Severity scale and the exact dimension rubric are left to architecture/plan to formalize.

## Provisional decisions

These were debated in brainstorm. Each has a recommended answer carried into architecture; they are settle-able now but left provisional so architecture can confirm against the codebase.

1. **Detecting "the phase touched UI" (FR3.2).** Two options: (a) an explicit planner-stamped `touchesUi` flag on tasks — clean but a `tasks.json` schema change; (b) a file-glob heuristic over the phase's completed-task artifact `files` — no schema change but fuzzier. **Decision: heuristic for the MVP** (no schema change).
2. **Screen→route mapping (FR5).** How does the checker know which app route corresponds to which `sm-screen` mockup? **Decision: add an optional `Route:` line to the designer's per-screen `sm-note` convention.**
3. **Fix bookkeeping (FR9).** Confirmed polish items become either (a) new small tasks in the current phase ("Polish: <gap>") — board-honest, preserves the artifact/commit invariant, visible on the board; or (b) amendment commits with no task record — lighter, invisible on the board. **Decision: new tasks.**
