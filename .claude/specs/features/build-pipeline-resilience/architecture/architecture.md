---
id: arch-build-pipeline-resilience-019
featureId: feat-build-pipeline-resilience
stage: architecture
status: approved
stale: false
title: Build pipeline resilience architecture
dependsOn:
  - prd-build-pipeline-resilience-027
basedOn:
  prd-build-pipeline-resilience-027: 2
generatedBy: agent
version: 1
createdAt: '2026-06-18T10:18:40.372Z'
updatedAt: '2026-06-18T11:06:47.165Z'
---
Based on PRD `prd-build-pipeline-resilience-027` v2.

## Summary

Three resilience fixes to the build pipeline, all converging on one principle: **post-phase automation must be driven by persisted task state, not by the builder Task's exit path.** P1 decouples the post-phase pipeline (walkthrough + doc-sync) from a clean builder return by re-resolving phase completion after the builder returns *or* errors. P2 makes per-task tier dispatch the enforced default (N=1) so a 529 is isolated to one task, with a bounded R=2 retry on transient overload, and demotes the whole-phase single-Task path to an explicit `--bulk` opt-in. P3 stops single-phase features from ever attempting a `final` walkthrough. The change surface is **mostly prompt-only** (`commands/specmanager-build.md`, `commands/specmanager-walkthrough.md`, `agents/builder.md`, `agents/walkthrough-writer.md`); P1 adds **one small read-only core helper + MCP tool** (`get_phase_completion`) so the agent's "phase complete?" branch is deterministic, not reasoned. The helper composes existing core only — no changes to gate semantics, the tier table (`core/tiers.ts`), or the shipped/marker logic (`core/shipped.ts`, `core/active-build.ts`, `core/active-card.ts`), all of which are non-goals.

## Affected components

| Path | Type | Change |
|---|---|---|
| `plugins/specmanager/server/src/core/phase-completion.ts` | **new** | `getPhaseCompletion(featureId, phase)` — deterministic "phase done + needs walkthrough?" predicate. R1/OQ3. |
| `plugins/specmanager/server/src/core/index.ts` | edit | `export * from "./phase-completion.js";` (alongside existing `phases`/`shipped`/`active-card` exports at lines 12–16). |
| `plugins/specmanager/server/src/mcp.ts` | edit | Register `get_phase_completion` tool (same shape as `get_next_phase`, mcp.ts:377–385). |
| `plugins/specmanager/server/src/selftest-build.ts` | edit | Add cases for the new helper (errored-but-complete, incomplete, already-walkthroughed, single-phase). |
| `plugins/specmanager/server/dist/**` | rebuild | `npm run build` — committed `dist/` is what ships. |
| `plugins/specmanager/commands/specmanager-build.md` | edit | P1 (re-resolve after return *or* error), P2 (N=1 default + R=2 retry + `--bulk`), P3 (single-phase suppression). Primary file. |
| `plugins/specmanager/commands/specmanager-walkthrough.md` | edit | P3 — refuse/skip `final` for single-phase. |
| `plugins/specmanager/agents/builder.md` | edit | P3 — drop the "suggest `/specmanager-walkthrough`" on-success line's path to final; clarify single-phase terminality. |
| `plugins/specmanager/agents/walkthrough-writer.md` | edit | P3 — document `phase: "final"` as multi-phase only. |

Unchanged (referenced, not redone — PRD non-goals): `core/tiers.ts`, `core/active-build.ts`, `core/active-card.ts`, `core/shipped.ts`, the Stop-gate hook `hooks/stop-gate.sh`, the reviewer `agents/reviewer.md`.

## Data model changes

None. No new schema, frontmatter, or `tasks.json` field. `get_phase_completion` is a pure read over existing `tasks.json` (via `listTasks`/`rollupPhases`) and walkthrough docs (via `listDocuments`). The active-build marker (`.cache/active-build.json`) is unchanged.

## R1 — Deterministic phase-completion helper (P1 / OQ3 / OQ4)

**Decision (OQ3): a core helper, not pure prompt logic.** P1's failure was structural — the post-phase steps lived only on the builder Task's normal-return branch, so an error-recovery path silently skipped them. The fix must make "is this phase complete and does it still need a walkthrough?" a **single deterministic call** the agent makes on *every* exit path, so it can't be reasoned away or skipped under the cognitive load of error recovery. `list_tasks` + prompt reasoning (the PRD's "no new core API strictly required" assumption) would work but reintroduces the hallucination/skip risk that caused the incident. The helper is ~15 lines, reuses existing core, and the determinism is the whole point — it directly serves the 100% post-recovery-fire success metric.

**Signature** (`core/phase-completion.ts`):

```
export interface PhaseCompletion {
  phase: string;
  taskCount: number;
  doneCount: number;
  complete: boolean;          // every phase task status === "done"
  hasWalkthrough: boolean;    // a walkthrough doc (draft|approved) exists for this phase
  needsWalkthrough: boolean;  // complete && !hasWalkthrough
  isSinglePhase: boolean;     // feature has exactly one phase (drives P3)
}

export async function getPhaseCompletion(
  featureId: string,
  phase: string,
  root = projectRoot()
): Promise<PhaseCompletion | null>;   // null when the phase name is unknown
```

**Reuses existing core only:**
- `listPhases` / `rollupPhases` (`core/phases.ts`) for `taskCount`/`doneCount`/`complete` and `isSinglePhase` (`phases.length === 1`).
- `listDocuments({ featureId, stage: "walkthrough" })` (`core/documents.ts`) filtered to `phase === <phase>` for `hasWalkthrough` — counts both `draft` and `approved`, mirroring the build command's existing dedupe at step 8 (so a re-entered session never double-creates).
- It does **not** call `isFeatureShipped` (that answers "shipped?", keyed on *approved* walkthroughs). The build command still calls `isFeatureShipped`/the shipped event indirectly via approval, untouched. `needsWalkthrough` is the narrower "produce the draft" predicate the build command needs.

**MCP tool** `get_phase_completion`, registered in `mcp.ts` with the same shape as `get_next_phase` (mcp.ts:377–385):

```
inputSchema: z.object({ featureId: z.string(), phase: z.string() })
async ({ featureId, phase }) => ok(await getPhaseCompletion(featureId, phase, PROJECT_DIR))
```

**OQ4 — detecting "builder errored but work landed."** Resolved by **trusting the persisted task records**, queried *after* the builder returns or errors. The builder marks each task `done` with artifacts as it goes (`builder.md` step 4; `update_task` rejects done-without-artifacts), and that write lands in `tasks.json` *before* any subsequent task's 529 — exactly the incident's 18/21 case. So a post-error `get_phase_completion` call reads the true landed state. No new mechanism, no diffing, no re-inspection of the builder's transcript: `complete` is `doneCount === taskCount` over the persisted records. This is the same source `resolveActiveCard` (active-card.ts:66–73) and the Stop-gate already trust, so P1's branch condition agrees with the gate by construction.

**Selftest implications** (`selftest-build.ts`): add cases — (a) all-done phase with no walkthrough ⇒ `complete && needsWalkthrough`; (b) 18/21 done ⇒ `!complete && !needsWalkthrough` (the errored-but-incomplete case); (c) all-done with an existing draft walkthrough ⇒ `complete && !needsWalkthrough` (dedupe); (d) single-phase all-done ⇒ `isSinglePhase` true. **Server change ⇒ rebuild `dist` + run `npm run selftest-build`.**

## R2 — Error-resilient post-phase pipeline in the build command (P1)

Rework `specmanager-build.md` step 8's entry condition. Today step 8 is reached only on the builder's normal return (step 7). New rule:

1. After the per-task dispatch loop (step 7) finishes — **whether the last builder Task returned normally or errored** — the build command calls `get_phase_completion({ featureId, phase })`. This is the single source of truth for the branch, replacing today's implicit "builder returned ⇒ phase done" assumption.
2. `complete === true` ⇒ enter the post-phase pipeline exactly as step 8 does today: reviewer (step 7b, if not already run), `clear_active_build()`, dedupe via `hasWalkthrough`, auto-invoke walkthrough-writer if `needsWalkthrough`, then the 3-option doc-sync `AskUserQuestion`, then `sync_design_md`. **Identical regardless of how the phase reached done** — this is the P1 fix.
3. `complete === false` ⇒ partial completion (mid-phase stop or builder crash with tasks remaining): **do not** auto-fire walkthrough, **do not** `clear_active_build()` (the build is still in flight; a re-entered session must resume — preserves active-card.ts:67–76 semantics), report the partial state + the failing task id + the error verbatim.

This makes the post-phase pipeline a function of `get_phase_completion`, not of control flow — a 529 that crashes the builder *after* the 21st task lands now still fires the walkthrough + doc-sync. Prompt-only beyond the helper itself.

## R3 — Per-task tier dispatch as enforced default + bounded 529 retry (P2)

**Decision (OQ1): N=1 — always per-task dispatch.** The whole-phase single-Task path is the exact mechanism that amplified the incident's blast radius (PRD P2: one 529 nearly invalidated 27 min / 21 tasks). The PRD's higher candidates (N=5, N=10) keep that amplification for the most common real phases. Per-task is also where the tier savings live — only individual dispatch can route a complexity-1 task to `haiku`. The per-task round-trip overhead is real but cheap relative to a lost 27-minute phase. So the default is unconditional per-task; the "you may instead dispatch one builder for the whole phase" escape hatch in today's step 7 (specmanager-build.md:23, the parenthetical) is **removed as the default**.

**Decision (OQ5): keep the whole-phase path as an explicit `--bulk` opt-in, not removed.** A power user on a tiny, tightly-coupled phase may legitimately want one builder context. Add `--bulk` to the command's `argument-hint` and step 1 parse. When `--bulk` is passed, dispatch all phase tasks in one builder Task at the **max tier** of its tasks (today's parenthetical behaviour), then fall through to R2's `get_phase_completion` re-resolve. Default (no flag) = per-task. This is lighter than removal (no lost capability) and the flag makes the amplification opt-in and visible.

**Decision (OQ2): R=2 retries (3 attempts total) on transient overload; fixed informal pause, no real backoff.** Per individual task dispatch, on a transient error (529 / `Overloaded`):
- Re-dispatch the **same** task's builder Task. Retry up to **2** times (3 attempts total) before marking the task surfaced-as-blocked and stopping the phase.
- **Backoff is not meaningfully expressible in a prompt** — the agent has no `sleep` primitive between Task dispatches and shouldn't burn a Bash `sleep` call for it. So: a **fixed, immediate re-dispatch** (no exponential backoff), justified because 529s are transient server-side and a fresh dispatch a few seconds later (the natural inter-tool latency) usually succeeds. The PRD bars infinite/exponential policies; fixed R=2 is the simplest bounded policy that meets the "retries at least once before surfacing as blocked" metric with margin.
- Retry is scoped to **transient overload only** (529/Overloaded). A genuine task failure (test won't pass, missing dependency) is the builder's own stop condition (`builder.md` stop case 2) and is **not** retried — re-running it would just re-fail.
- **Relationship to the Stop-gate N=3 and reviewer budget:** the R=2 dispatch retry is a *pre-completion transport retry* (the builder Task never returned a usable result), distinct from the Stop-gate's N=3 *post-stop* iteration cap and the reviewer's shared fix budget (specmanager-build.md:32,69). They don't compose into a larger loop: R=2 absorbs "couldn't even run the task"; N=3 absorbs "ran but didn't pass". Document this boundary in step 7 so the two caps stay legible.

**Step 7 rewrite (specmanager-build.md):** the per-task loop already exists (lines 23, dispatching one task at a time with the resolved alias). Changes: (a) drop the whole-phase parenthetical as the default; (b) gate whole-phase behind `--bulk`; (c) wrap each task's `Task(...)` dispatch in the R=2 transient-retry; (d) on exhausted retries, mark the task blocked and stop the phase (do not `clear_active_build` — same in-flight rule as a mid-phase stop). The complexity→tier→alias mapping and the session table (step 6b) are untouched — non-goal.

## R4 — Single-phase final-walkthrough suppression (P3)

The core already ships single-phase features on the per-phase walkthrough's approval (`isFeatureShipped`, shipped.ts:18–25: `phases.length === 1` ⇒ approved single-phase walkthrough is terminal). The gap is purely prompt behaviour — the agent self-initiated a `final` the gate then refused. Fix in four files using `isSinglePhase` (already surfaced by `get_phase_completion`, or `list_phases().length === 1`):

| File | Change |
|---|---|
| `commands/specmanager-build.md` step 8 | After auto-firing the per-phase walkthrough, **if `isSinglePhase`**: report the phase walkthrough as the **terminal** artifact; never suggest/attempt `final`. The per-phase walkthrough approval ships the feature. |
| `commands/specmanager-walkthrough.md` step 3 | Before the `final` gate check: if `list_phases({ featureId }).length === 1`, refuse `final` early — "single-phase feature: the per-phase walkthrough is terminal; no `final` roll-up." Don't burn a gate round-trip / Task. `final` stays valid only for multi-phase. |
| `agents/builder.md` "On success" (line 82) | The "suggest `/specmanager-walkthrough <feature> <phaseName>`" line stands; add that for a single-phase feature this per-phase walkthrough is the terminal artifact — never suggest a `final`. |
| `agents/walkthrough-writer.md` (lines 11, 40–46, 83) | Document `phase: "final"` mode as **multi-phase only**; in single-phase features the per-phase (or `"default"`) walkthrough is terminal and no `final` is written. Reinforces the existing "Don't write `phase: \"final\"` unless every phase walkthrough is approved" Don't. |

No core change — `isFeatureShipped` already encodes the terminality; these edits stop the agent from contradicting it. Prompt-only, no rebuild.

## Sequence / flow

```
/specmanager-build <feature> <phase> [--force] [--bulk]
  1–6b  parse (+ --bulk), resolve feature/phase, gates, set_active_build, tier table
  7     dispatch:
          --bulk  → 1 builder Task @ max tier  ┐
          default → per task:                  │
                      complexity→tier→alias     │
                      Task(builder, model)      │── on 529/Overloaded: retry ≤2 (R2),
                      builder marks task done   │   else mark task blocked + stop phase
                      next task                 ┘   (no clear_active_build — in flight)
  ── builder loop returns OR errors (any type, incl. 529) ──
  R2  get_phase_completion(featureId, phase)        ← single deterministic branch
        complete=false → partial: report, NO walkthrough, NO clear_active_build (resume later)
        complete=true  → 7b reviewer (pass) → clear_active_build
                         → needsWalkthrough? auto-invoke walkthrough-writer (per-phase, draft)
                         → doc-sync AskUserQuestion (3 opts) → sync_design_md
                         → isSinglePhase? report terminal, NEVER final
  9   report
```

## Failure & edge cases

| Case | Handling |
|---|---|
| Builder 529s after task K of M lands (incident: 18/21) | Persisted records show K done; `get_phase_completion` ⇒ `complete=false` if K<M (partial: no walkthrough, no clear); the in-flight task's R=2 retry already fired before the loop exited. |
| Builder 529s after the **last** task lands | `get_phase_completion` ⇒ `complete=true` ⇒ full post-phase pipeline fires despite the error exit. The P1 fix. |
| All R=2 retries exhausted on one task | Mark task blocked, stop phase, do **not** `clear_active_build` (in flight); report failing task id + error verbatim. Re-entering the phase resets the retry budget. |
| `--bulk` on a phase where one task 529s | The single Task carries all tasks; retry the whole bulk Task ≤2, else surface blocked. Bulk re-accepts the amplification by explicit user choice. |
| Single-phase feature reaches done | Per-phase walkthrough is terminal; no `final` attempted (P3). Approval fires `feature.shipped` via `isFeatureShipped`. |
| Walkthrough already exists for the phase (re-entry) | `hasWalkthrough=true` ⇒ `needsWalkthrough=false` ⇒ no duplicate; matches today's step-8 dedupe. |
| Unknown phase name passed to helper | `get_phase_completion` returns `null` ⇒ command reports phase-not-found, same as `list_phases` miss today. |
| Genuine (non-transient) task failure | Not retried — builder's own stop condition; surfaced verbatim. R=2 is transient-only. |

## Conventions used

- **Latest APIs**, `"type": "module"`, Node 20+, `zod` input schemas for MCP tools (mcp.ts pattern). No version-sensitive library introduced ⇒ no Context7 lookup needed for this feature.
- **Every mutation flows through `core`**; the new helper is a pure read composing `listPhases`/`listDocuments` — no logic duplicated in mcp.ts or board-server.ts. Both entry points get the tool identically.
- **Tier dispatch routes on aliases, never dated ids** (`core/tiers.ts`) — untouched; the build command keeps passing the resolved alias and omitting `model:` on unknown aliases (AC4).
- **Marker-first in-flight semantics preserved** — `clear_active_build` only on terminal paths (complete, or blocked); never on a partial/mid-phase stop (active-card.ts:55–76, specmanager-build.md:71).
- **Committed `dist/` is what ships** — the one server change requires `npm run build` + selftests before commit.
- **Bounded, simple retry** — fixed R=2, no backoff infra (matches the global "don't over-engineer / don't program defensively" guidance and the PRD's bounded-only constraint).

## Open questions / risks — resolved

| OQ | Resolution |
|---|---|
| OQ1 — threshold N | **N=1, always per-task.** Per-task is the unconditional default; max 529 isolation + tier savings. The whole-phase path is opt-in only. |
| OQ2 — retry R + backoff | **R=2 (3 attempts), fixed immediate re-dispatch, no backoff** (not expressible in a prompt; 529s are transient). Transient-only (529/Overloaded). |
| OQ3 — helper vs prompt | **Helper.** New read-only `get_phase_completion` core fn + MCP tool; determinism is the P1 fix, ~15 lines reusing `listPhases`/`listDocuments`. |
| OQ4 — errored-but-complete detection | **Trust persisted task records**, re-queried post-return-or-error via `get_phase_completion`; builder writes `done`+artifacts before any later 529. Same source the Stop-gate trusts. |
| OQ5 — whole-phase fallback | **Kept as explicit `--bulk` opt-in**, not removed — preserves the power-user single-context workflow while making amplification visible/opt-in. |

**Prompt-only (no rebuild):** P3 across all four files; P1/P2 step rewrites in `specmanager-build.md` (entry condition, `--bulk`, R=2 retry). **Server (rebuild `dist` + selftests):** the `get_phase_completion` helper + its `core/index.ts` export + `mcp.ts` registration + `selftest-build.ts` cases.

**Residual risks:**
- The agent must call `get_phase_completion` on the error path even mid-recovery; the prompt must make this an unconditional post-loop step (not nested under "if builder returned"). Mitigated by the helper being a single named call. Planner: phrase step 8's entry as "always call `get_phase_completion`, then branch."
- `--bulk` re-accepts blast radius by design — acceptable since it's explicit and off by default.
- R=2 fixed re-dispatch could, in a sustained outage, exhaust on every task; that surfaces as blocked (correct) rather than looping — but the user sees several failed phases. Acceptable under the bounded-only constraint; a session-wide overload is outside this feature's scope.
