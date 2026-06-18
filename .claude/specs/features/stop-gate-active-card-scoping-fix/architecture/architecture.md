---
id: arch-stop-gate-active-card-scoping-fix-017
featureId: feat-stop-gate-active-card-scoping-fix
stage: architecture
status: approved
stale: false
title: Stop-gate active-card scoping fix architecture
dependsOn:
  - prd-stop-gate-active-card-scoping-fix-026
basedOn:
  prd-stop-gate-active-card-scoping-fix-026: 2
generatedBy: agent
version: 1
createdAt: '2026-06-15T15:14:24.532Z'
updatedAt: '2026-06-15T15:21:05.691Z'
---
## Summary

The Stop-gate is disabled because `resolveActiveCard` (`core/active-card.ts:50`) scans **every** feature and returns the first with non-done tasks — no session linkage — so any session stop locks onto an unrelated planned feature and demands a build (PRD §Problem). We add an **explicit active-build marker** the `/specmanager-build` command writes via a new MCP tool when a build starts and clears on phase completion. `resolveActiveCard` reads that marker first: no marker ⇒ `null` ⇒ no-op gate. The marker carries the `featureId`/`phase` so resolution is pinned to exactly that phase — an unrelated feature with open tasks can never trigger the gate. Marker state lives in `core/` (TS), not bash. Crash-stale markers are made harmless by a guard: if the marker's own phase has no open tasks, treat as not-in-flight. The hook re-enables only as the final gated step (restore `hooks.json` Stop entry + drop the `exit 0`), after the regression selftest is green. Compiled `server/dist/` must be rebuilt before commit (PRD Constraints).

## Decision — marker mechanism (Option B, scoped variant)

PRD §"Active-card resolution options" lists A–D; preferred A or B. Evaluated against the repo:

| Option | Repo fit | Verdict |
|---|---|---|
| **A. `in_progress` phase status** | `PhaseStatus` (`phases.ts:5`) already has `in_progress`, but it is **derived from task counts** (`statusOf`, `phases.ts:17-25`): a phase is `in_progress` whenever it has any done/in_progress task. That is exactly the project-wide signal that broke today — `feat-antigravity-plugin` phase A would read `todo`/`in_progress` with zero session linkage. There is **no** writable, session-scoped phase-status field, and adding one duplicates the derived rollup. Rejected. (Answers PRD Open-Q2: `in_progress` exists in the schema but is a *computed* rollup, not a settable session signal — unusable as-is.) |
| **B. Session/build marker file** | Aligns with the repo's existing transient-state convention: Stop-gate counters already live under `.claude/specs/.cache/stop-gate/`, and `.cache/` is gitignored (`features.ts:15-21`). Explicit, unambiguous, written by the one entry point that starts a build (PRD Assumption). | **Selected.** |
| **C. Git branch correlation** | Requires a `build/<featureId>/<phase>` branch convention SpecManager does not enforce; brittle and external (PRD table). Rejected. |
| **D. Commit tag** | Most complex; depends on git log state; PRD calls it complex. Rejected. |

**Chosen: B — a single active-build marker JSON written under the existing `.cache/` surface, read by a marker-first `resolveActiveCard`.** It needs no new schema field, reuses the gitignored cache the gate already uses, and pins resolution to one explicit `{featureId, phase}` so the project-wide scan is removed entirely.

### Why not also key on session id

The Stop hook payload includes a `session_id`, and the marker will record it for diagnostics, but resolution does **not** require a session-id match. Rationale: single-user/single-machine (PRD Constraints) means at most one build is ever in flight; matching on session id would add a failure mode (a resumed session gets a fresh id and would wrongly miss its own in-flight build) with no benefit. The `{featureId, phase}` pin plus the open-task staleness guard (below) is sufficient and strictly safer. Session id is stored for observability and future multi-session work (explicitly out of scope per PRD).

## R1 — Scoped active-card resolution (`core/active-card.ts`)

Replace the project-wide loop (`active-card.ts:50-88`) with a **marker-first** resolver. New module `core/active-build.ts` owns the marker; `resolveActiveCard` consults it.

**Marker shape** (new type in `core/active-build.ts`):

```ts
interface ActiveBuildMarker {
  featureId: string;
  phase: string;      // exact phase name, matches plan.md ## Phase <name>
  sessionId: string | null;  // diagnostic only — not used for matching
  startedAt: string;  // ISO; for stale-age reporting only
}
```

**Marker location:** `.claude/specs/.cache/active-build.json` (single file — single-user means at most one in-flight build). Path helper added next to the cache convention. Gitignored already via `features.ts:15-21`.

**New resolver flow** (rewrite of `resolveActiveCard`, signature unchanged — still `(root) => Promise<ActiveCard | null>`, so `resolve-active-card.ts` shim and the `resolve_active_card` MCP tool at `mcp.ts:407-414` are untouched):

1. Read the marker. **Absent / unreadable ⇒ return `null`** (the no-build no-op — this is the bug fix).
2. Resolve the marker's `featureId` via `findFeatureById`. Gone ⇒ clear the marker, return `null`.
3. Load that feature's tasks (`listTasks`). Filter to the marker's `phase`. Compute `openTaskIds = phaseTasks.filter(status !== "done")`.
4. **False-in-flight guard (PRD Open-Q1):** if the phase has **zero open tasks** (all done, or phase empty), the build is finished or the marker is crash-stale ⇒ clear the marker and return `null`. The gate never fires for a completed/stale phase.
5. Otherwise build and return the `ActiveCard` exactly as today — same fields (`featureId`, `slug`, `phase`, `testCommand`, `exitTest`, `architectureRefs`, `openTaskIds`) sourced the same way: `readTasksMeta` → `phaseMeta.testCommand`/`architectureRefs`, `exitTestForPhase(planBody, phase)` (`active-card.ts:29-44`, kept verbatim). The active phase is **the marker's phase**, not `getNextPhase` — so the gate evaluates the phase the build is actually on.

This removes `listFeatures` + the per-feature `getNextPhase` scan from the resolution path entirely. The **only** feature/phase the gate can ever target is the one the build command pinned. Invariant satisfied: no open phase in an unrelated feature can trigger the gate, because resolution never enumerates features.

`getNextPhase` (`phases.ts:70`) remains the build **command's** way to pick a target phase; it is no longer part of gate resolution.

## core-active-build — marker module + lifecycle

New file `core/active-build.ts`, exported from `core/index.ts` (alongside `active-card.js` at `index.ts:13`). Pure fs, matches the `tasks.ts` read/write style (try/catch read → typed default).

| Function | Purpose | Writer |
|---|---|---|
| `setActiveBuild({ featureId, phase, sessionId }, root)` | Write/overwrite the marker JSON. Emits a `build.started` event for parity with other core mutations. | build command (start of a phase) |
| `clearActiveBuild(root)` | Delete the marker (idempotent — missing file is a no-op). | build command (phase done) + resolver guard (stale/finished) |
| `readActiveBuild(root)` | Parse the marker; missing/invalid ⇒ `null`. | `resolveActiveCard` |

**Who writes / clears (PRD high-level flows):**

- **Build start:** `/specmanager-build` calls a new MCP tool `set_active_build({ featureId, phase })` immediately after step 4 (target phase resolved) and before dispatching builders (step 7). `sessionId` is filled server-side from the env if present, else `null`.
- **Build done / phase complete:** the command calls a new MCP tool `clear_active_build()` on the walkthrough-gate-open path (step 8, "phase now fully done") and on the blocked-cap path. So a finished phase leaves no marker ⇒ next stop is a no-op.
- **Crash / mid-session abandonment:** no clear call runs. The next session's gate reads a stale marker; the **false-in-flight guard (R1 step 4)** neutralises it — if the pinned phase's tasks are still open, it is genuinely in-flight and the gate correctly resumes; if they were completed, it returns `null` and clears. The marker can never make the gate fire on a *different* feature, only on its own pinned phase, so a stale marker is at worst a correct resume, never a false block on an unrelated card.

### MCP wiring (`mcp.ts`)

Two new tools mirroring `resolve_active_card` (`mcp.ts:407-414`):

```
set_active_build  { featureId: string, phase: string } → calls setActiveBuild(...)
clear_active_build { }                                  → calls clearActiveBuild()
```

`resolve_active_card` itself is unchanged — it transparently picks up the new resolver since `resolveActiveCard` keeps its signature. These are the only entry points the build command (a prompt) can use to write state, since commands delegate to MCP tools, never the fs directly.

## R2 — `/specmanager-build` marker maintenance (`commands/specmanager-build.md`)

The build command is the sole build entry point (PRD Assumption). Edits, scoped and additive:

- **After step 4 (target phase resolved), new step 4c:** `set_active_build({ featureId, phase: <resolvedPhaseName> })`. Use the concrete phase name, never `"next"` (the command already resolves `next` → a real name at step 4).
- **Step 8 open-gate path (phase fully done):** add `clear_active_build()` before/at the walkthrough auto-fire. Mid-phase stop (gate closed) **must not** clear — the build is still in flight and a re-entered session should resume it.
- **Blocked-cap path:** the hook itself records the block (`set-phase-blocked.js`); the command should `clear_active_build()` when it reports a persistent-fail blocked phase (step 9), so the blocked phase doesn't keep re-arming the gate.
- **Don't list:** add "Don't leave an active-build marker after a phase completes or is blocked — always pair `set_active_build` with a `clear_active_build` on the terminal paths."

No change to tier dispatch, the reviewer, or the iteration cap (PRD Out-of-scope).

## R3 — False-block guard

The cap path in `stop-gate.sh:145-160` calls `set-phase-blocked.js` for `$FEATURE_ID $PHASE`. With R1, `FEATURE_ID`/`PHASE` come from the marker-pinned card, so `set-phase-blocked` can only ever target the session's actual in-flight phase. The guard is therefore **enforced by construction at the resolver** — there is no separate bash check to add. The PRD metric "False-block on unrelated phases = 0" holds because:

1. No marker ⇒ resolver returns `null` ⇒ hook exits 0 at `stop-gate.sh:40-42` ⇒ `set-phase-blocked` never runs.
2. Marker present but pinned phase has no open tasks ⇒ resolver returns `null` (R1 step 4) ⇒ same no-op.
3. Marker present + phase genuinely open ⇒ the only case the cap can fire, and it fires on the correct phase.

No edit to `set-phase-blocked.js` or the bash cap logic is required.

## R4 — `selftest-stopgate` regression case

Extend `selftest-stopgate.ts` (exists — answers PRD Open-Q3). Today the test relies on the project-wide scan (`selftest-stopgate.ts:99` comment: "resolveActiveCard now targets the cap feature"). That assumption inverts under R1, so the selftest must be **updated, not only appended**:

1. **New no-op regression (the exact bug, PRD §In-scope #4):** init project, create an **unrelated** feature with an approved plan and an **open** task (mirrors `feat-antigravity-plugin`), set **no** active-build marker (via the new `setActiveBuild`/`clearActiveBuild` core fns imported in the selftest). Assert `runHook(root).code === 0` and stderr is empty — the gate is a no-op despite an open-task feature existing. This is the assertion that would have caught the shipped bug.
2. **Rework the in-flight cases (current steps 2–5):** before each case that expects the gate to fire (exit 2 / cap), call `setActiveBuild({ featureId, phase: "core" })` to pin the gate to that feature's phase. The cap test (steps 5, `selftest-stopgate.ts:91-115`) sets the marker to the cap feature. Remove the "fully done → targets next feature" coupling at line 99; instead pin explicitly.
3. **Stale-marker guard case:** set a marker for a feature whose phase tasks are all `done`; assert `runHook` exits 0 (false-in-flight guard) and that the marker is cleared afterward (`readActiveBuild(root) === null`).
4. **Clear-on-done case:** with an in-flight marker + open task → exit 2; mark the task done + `clearActiveBuild`; assert next `runHook` exits 0.

Run via `npm run selftest-stopgate` (the existing script entry).

## R5 — Re-enable the hook (FINAL gated step)

Only after R1–R4 land and `selftest-stopgate` is green:

1. **`hooks/stop-gate.sh`:** remove the `exit 0` + its TEMP-DISABLE comment block (`stop-gate.sh:17-21`). Nothing else in the script changes — it already resolves via the shim and reads `null` as no-op.
2. **`hooks/hooks.json`:** restore the `Stop` entry (currently absent — file has only `SessionStart` + `FileChanged`). It must invoke `stop-gate.sh` with `CLAUDE_PLUGIN_ROOT`/`SPECMANAGER_PROJECT_DIR` available, matching how `selftest-stopgate.ts:36-41` spawns it. Shape:

```json
"Stop": [
  { "hooks": [ { "type": "command", "command": "bash \"${CLAUDE_PLUGIN_ROOT}/hooks/stop-gate.sh\"" } ] }
]
```

(Confirm the exact original entry from git history — the hotfix commit 448610c / merge 12bd895 removed it; restore that form verbatim, including any matcher/env it carried.)

## Data model changes

- **No schema migration.** No change to `tasks.json`, `TaskSchema`, `PhaseMeta`, or frontmatter. Phase status stays a derived rollup (`phases.ts`).
- **New transient state surface:** `.claude/specs/.cache/active-build.json` — a single JSON object (`ActiveBuildMarker`), gitignored via the existing `.cache/` rule (`features.ts:20`). Sibling to the existing `.cache/stop-gate/` counters. Not a manifest input, not part of the `dependsOn` graph.

## Interfaces

New (`core/active-build.ts`, exported from `core/index.ts`):

```ts
interface ActiveBuildMarker { featureId: string; phase: string; sessionId: string | null; startedAt: string; }
function setActiveBuild(input: { featureId: string; phase: string; sessionId?: string | null }, root?: string): Promise<void>;
function clearActiveBuild(root?: string): Promise<void>;
function readActiveBuild(root?: string): Promise<ActiveBuildMarker | null>;
function activeBuildPath(root?: string): string;  // .cache/active-build.json
```

Changed (`core/active-card.ts`): `resolveActiveCard(root?)` body rewritten; **signature and `ActiveCard` interface unchanged**.

New MCP tools (`mcp.ts`): `set_active_build({ featureId, phase })`, `clear_active_build({})`. `resolve_active_card` unchanged.

## Sequence / flow

**Non-build stop (no-op — the fix):** Stop hook → `stop-gate.sh` → `resolve-active-card.js` → `resolveActiveCard` → `readActiveBuild` = `null` → resolver returns `null` → hook `exit 0` (`stop-gate.sh:40-42`). No iteration counter, no `set-phase-blocked`.

**Build stop (gates correctly):** `/specmanager-build` → `set_active_build({featureId, phase})` → builders run → session stops mid-phase → Stop hook → `resolveActiveCard` reads marker → pinned phase has open tasks → returns the `ActiveCard` → hook runs test command + checks open tasks → fail ⇒ exit 2 with stderr (continue) or, at N=3, `set-phase-blocked` on the **pinned** phase + exit 0. Phase completes → command `clear_active_build()` → next stop reads no marker → no-op.

**Crash mid-build:** marker survives. Next session's first stop → resolver reads marker → if pinned phase still has open tasks ⇒ correct resume gate; if all done ⇒ guard clears marker + returns `null`. Never targets another feature.

## Failure & edge cases

| Case | Handling |
|---|---|
| No build in flight (the bug) | No marker ⇒ `null` ⇒ no-op. |
| Unrelated feature has open tasks | Irrelevant — resolver never enumerates features; only the pinned one. |
| Crash-stale marker, phase finished | False-in-flight guard (R1 step 4): zero open tasks ⇒ clear + `null`. |
| Crash-stale marker, phase still open | Treated as genuine in-flight ⇒ correct resume gate on the right phase. |
| Marker feature deleted | `findFeatureById` miss ⇒ clear marker + `null`. |
| Marker JSON corrupt/unreadable | `readActiveBuild` ⇒ `null` ⇒ no-op (never crash the gate; mirrors `resolve-active-card.ts:14-19`). |
| `set-phase-blocked` misfire | Impossible by construction — only reachable with a pinned, genuinely-open phase. |
| Marker written but `next` passed as phase | Command resolves `next` to a real phase name before `set_active_build` (build.md step 4). |

## Conventions used

- Core logic in `core/`, bash stays a thin shim (PRD Constraint; `stop-gate.sh` header).
- Resolver returns `null` rather than inventing failures (`active-card.ts:5-6`).
- Transient state under gitignored `.claude/specs/.cache/` (`features.ts:15-21`).
- fs read with typed-default fallback in try/catch (`tasks.ts:56-64`).
- Core mutations emit `events` (`tasks.ts`); add `build.started`/`build.cleared` for parity.
- `"type": "module"`, Node 20+, TS strict; resolve root from `SPECMANAGER_PROJECT_DIR ?? CLAUDE_PROJECT_DIR ?? cwd` (`paths.ts:3-11`, `resolve-active-card.ts:8-9`).
- New MCP tools mirror existing `ok()/fail()` shape (`mcp.ts:407-414`).
- Ships-compiled-dist: **rebuild `server/dist` (`npm run build`) before commit** (PRD Constraint; CLAUDE.md build section). Re-enable hook only after rebuild + green selftest, then reinstall/reload per CLAUDE.md.

## Open questions / risks

1. **Exact original `Stop` entry shape.** Recover the precise `hooks.json` Stop block (matcher/env) from commit 448610c / merge 12bd895 before restoring (R5) rather than reconstructing — the sketch above is the expected form, not the verified original.
2. **`session_id` availability in the Stop hook env.** The marker records `sessionId` for diagnostics only; resolution does not depend on it, so an absent id is harmless. Confirm whether the Stop hook command has access to a session id env var (Claude Code passes `session_id` in the hook stdin JSON, which `stop-gate.sh:15` currently drains). If wanted, the shim could parse it from stdin and pass to `set_active_build` — but this is optional and not load-bearing.
3. **Event-name addition.** `build.started`/`build.cleared` are new event types; confirm the `events` union doesn't need a typed extension (check `core/events.ts`) or emit under an existing generic type to avoid touching the event schema. Low risk; planner to confirm.
4. **No Context7 lookup needed** — all APIs touched are first-party (`core/`, `mcp.ts`, bash, Node fs). Noted for traceability per the architect doc-lookup policy.
