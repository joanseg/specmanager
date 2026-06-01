---
id: arch-plan-and-walkthrough-optimisations-006
featureId: feat-plan-and-walkthrough-optimisations
stage: architecture
status: approved
stale: false
title: Plan and walkthrough optimisations architecture
dependsOn:
  - prd-plan-and-walkthrough-optimisations-007
basedOn:
  prd-plan-and-walkthrough-optimisations-007: 3
generatedBy: agent
version: 1
createdAt: '2026-06-01T12:18:20.142Z'
updatedAt: '2026-06-01T12:43:40.340Z'
---
# Plan and walkthrough optimisations — Architecture

Grounded in the approved PRD (`prd-plan-and-walkthrough-optimisations-007` v3) and the current plugin source under `plugins/specmanager/`.

## 1. Guiding finding

All four requirements are satisfiable **without changing the `core` data model**. The phase model (`core/phases.ts`, `core/tasks.ts`) already treats a single phase as a first-class case, and the walkthrough gate (`core/dependencies.ts`) already works per-phase and for the `final` roll-up. The changes are concentrated in three layers:

- **Agent prompts** (`agents/planner.md`, `agents/walkthrough-writer.md`) — R1, R3.
- **Command orchestration** (`commands/specmanager-build.md`) — R2.
- **Board UI** (`ui/src/App.tsx`) — R4.

This keeps the work small and respects the load-bearing pillar that logic lives in `core`: we are not adding business rules to prompts or servers, we are changing *defaults, presentation, and one orchestration hand-off*.

## 2. Current state (grounded)

- **Planner mandates phases.** `agents/planner.md` §"The phase rule": *"A flat task list is not acceptable output — even a small feature has at least one phase."* It also fixes the plan-doc conventions: a `## Phase <name> — <theme>` heading per phase, a `| Phase | Theme | Points |` summary table with a **Total** row, and dotted `<phase>.<index>` task numbering.
- **Phase rollup defaults cleanly.** `core/phases.ts#rollupPhases` groups tasks by `t.phase || DEFAULT_PHASE`, first-seen order. A single phase yields a one-entry rollup. `core/tasks.ts#createTask` defaults `phase` to `DEFAULT_PHASE` (`"default"`).
- **Walkthrough gate is per-phase.** `core/dependencies.ts#checkGate` opens the per-phase walkthrough when every task in that phase is `done`; the `final` sentinel opens only when every phase has an `approved` walkthrough.
- **Auto-sync precedent is server-side and LLM-free.** `mcp.ts#startClaudeMdAutoSync` / `startDesignMdAutoSync` subscribe to `core` events and call pure functions (`syncClaudeMd`, `syncDesignMd`). `core/events.ts` has no `phase.completed`; `feature.shipped` fires from `core/status.ts` only when a `final` walkthrough is approved. **Nothing in the server can invoke a subagent** — agent invocation only happens inside a Claude turn driven by a slash command.
- **Build command suggests, never fires, the walkthrough.** `commands/specmanager-build.md` step 8: *"If the phase is now fully done, suggest `/specmanager-walkthrough …` (do NOT invoke it — user reviews first)."*
- **UI always renders the roll-up card.** `ui/src/App.tsx#WalkthroughCell` (line ~315) maps every phase to a `PhaseWalkthroughCard` and then **always** appends `<FinalWalkthroughCard>`. `row.phases` is built live by `core/manifest.ts` from `rollupPhases` on every task mutation, so the board re-renders whenever the phase set changes.

## 3. Design by requirement

### R1 — Plan in one phase by default

**Decision: relax the planner prompt; keep the parsing contract; reserve `default` for legacy.**

- Rewrite `agents/planner.md` so **one phase is the norm**. Replace the "flat task list is not acceptable / even a small feature has at least one phase" mandate with: produce a **single phase** unless the feature is a genuinely large project with a real mid-build test boundary (R1.2/R1.3). The single phase still uses the `## Phase <name> — <theme>` heading — the parser contract is unchanged.
- **Single-phase naming.** The single phase gets a **real, meaningful name** (e.g. the feature theme), *not* `"default"`. `"default"` stays reserved for legacy pre-phase features read off old `tasks.json`. This keeps the walkthrough filename (`phase-<name>.md`) and gate semantics meaningful.
- **Doc-convention adaptation (resolves Q1).** A single-phase plan keeps all conventions but reads cleanly:
  - One `## Phase <name> — <theme>` section, dotted numbering `1.1, 1.2, …`.
  - The phase summary table still renders with one phase row + the bold **Total** row (the **Total** row is retained — it's a small, harmless echo and downstream parsers already tolerate it; removing it would be a special-case the parser doesn't need).
  - `Scale` legend and `Notes on estimates` sections stay (phrased phase-agnostically, as the prompt already requires).
  - No behavioural special-casing is introduced; the planner simply stops manufacturing extra phases.
- **Multi-phase confirmation (R1.4).** When the planner judges a split is warranted, it calls `AskUserQuestion` presenting the proposed phase boundaries + rationale **before** any `create_task`. The planner is an agent with tool access, so it can call `AskUserQuestion` directly.
- **Decline behaviour (resolves Q4).** If the user declines the proposed split, the planner **falls back to a single phase** (the default), unless the user's answer specifies preferred boundaries — `AskUserQuestion` offers the proposed split, a single-phase option, and lets the user describe alternative boundaries via the free-text "Other".

No `core`, server, or UI change for R1 — it is entirely a `planner.md` rewrite. `commands/specmanager-plan.md`'s "Don't accept a flat plan with no phases" rule is reconciled: a single named phase is *not* a flat plan, so the rule already holds; we add a note that single-phase is the expected common output.

### R2 — Auto-fire the walkthrough when a phase is built

**Decision: orchestrate the auto-fire from `/specmanager-build` (agent layer), not from a `core` event (resolves Q2).**

The server cannot invoke the walkthrough-writer subagent (§2). The only place that *can* is a Claude turn already running a slash command. `/specmanager-build` is exactly that turn, and it runs at the moment a phase finishes — the gate it would check has just opened. So:

- Change `commands/specmanager-build.md` step 8: after the builder returns and the phase is fully `done`, the build command **invokes the walkthrough-writer in per-phase mode automatically** (`Task({ subagent_type: "walkthrough-writer", … })`), producing a `draft` walkthrough (R2.1, R2.2).
- **Idempotency (R2.3).** Before invoking, the command runs the same guard the walkthrough command uses: `list_documents({ featureId, stage: "walkthrough" })` filtered to `frontmatter.phase === <phase>`. If a doc already exists, skip the auto-fire and just report.
- **Gate re-check.** The command calls `check_gate({ featureId, stage: "walkthrough", phase })` before firing — defends against the builder stopping mid-phase (partial done) where step 8 shouldn't fire.
- **Manual path preserved (R2.4).** `/specmanager-walkthrough` is unchanged and remains the fallback for: phases completed *outside* a build turn (e.g. the user marks the last task `done` directly on the board — no agent turn exists to auto-fire), re-runs, and `final` mode.
- **Known boundary (documented, not solved here).** Auto-fire covers the build-command path only. For board-driven completions, the existing `PhaseWalkthroughCard` "ready → copy `/specmanager-walkthrough …`" affordance already signals the user. A `core` `phase.completed` event feeding a board badge is **out of scope** (deferred) — it adds machinery without enabling true auto-creation (still no LLM in the server).

No `core` or server change for R2 — it is a `commands/specmanager-build.md` rewrite (step 8 + the "do NOT invoke it" Don't).

### R3 — Walkthroughs follow the proven structure

**Decision: rewrite `agents/walkthrough-writer.md` per-phase mode to enforce the 9-section exemplar skeleton.**

- Replace the loose 5-section "What a good per-phase walkthrough contains" list with the concrete skeleton from PRD R3.1 (verbatim exit-criterion blockquote → `## 0. Prerequisites` → `## 1. Build` with the new assertions → install/reload → numbered `## n. <Phase> exit checks` with `### n.1…` each carrying **expected output** → `## n. Pass criteria` checklist → Deferred/Out-of-scope → Troubleshooting → next-phase preview).
- **Evidence discipline retained.** The existing "read the real files/commits from this phase's task artifacts" rule stays — the exit checks must be runnable and grounded, not invented (R3.2).
- **Generalisation (resolves Q3).** The prompt instructs the agent to **adapt the Build/install sections to the project**: detect build/test commands from `package.json` scripts / repo conventions / project `CLAUDE.md`, and include the *"reinstall the plugin"* dance **only when the feature under build is itself a Claude Code plugin** (as SpecManager is). For a non-plugin project, those sections become project-appropriate build + run/verify steps. SpecManager self-development — the dominant current use — keeps the full plugin reinstall flow. This is a prompt instruction, not project-type detection code.
- **`final` mode untouched (R3.4)** beyond a light pass to ensure it still links per-phase walkthroughs.

No `core`/server/UI change for R3 — it is an `agents/walkthrough-writer.md` rewrite.

### R4 — Feature roll-up card is phase-count-conditional

**Decision: gate `FinalWalkthroughCard` on `phases.length > 1` in the UI; no server/API change (resolves Q5).**

- In `ui/src/App.tsx#WalkthroughCell`, render `<FinalWalkthroughCard>` **only when `phases.length > 1`** (R4.1). A single-phase feature shows just its one `PhaseWalkthroughCard` (R4.2).
- **Reactivity is free (R4.3).** `row.phases` is rebuilt by `core/manifest.ts#rollupPhases` on every task mutation (the manifest is refreshed via the events pipeline). When a one-phase feature gains a second phase — e.g. an after-build `create_task` with a new `phase` name, or a plan edit — `phases.length` becomes `2` and the roll-up card appears on the next board refresh with no other action.
- **Definition guard.** The condition keys strictly on **phase count** (`phases.length > 1`), *not* on the existing `multiPhase` heuristic in `App.tsx` (line ~150), which conflates count with "phase name ≠ default" and would wrongly show the roll-up for a single *named* phase. R4 introduces/uses a plain `phases.length > 1` check in `WalkthroughCell`; the `multiPhase` heuristic used for the Build-count display is left as-is.
- **Q5 resolution.** Pure client-side off the existing `phases` rollup. No new API field or manifest "show roll-up" flag — the data needed (`phases.length`) is already on `FeatureRow`. Simpler, single source of truth, matches the "be simple" project rule. The `final` walkthrough *gate* in `core/dependencies.ts` is unchanged; R4 governs card *visibility* only (R4.4).

## 4. Contracts touched / preserved

- **Unchanged contracts:** `core/events.ts`, `core/phases.ts`, `core/tasks.ts`, `core/dependencies.ts#checkGate`, `core/manifest.ts`, the `/api/board` shape, `FeatureRow`/`PhaseRollup` types. No migration, no version bump to the data model.
- **Parser contracts preserved:** `## Phase <name> — <theme>` headings, `**Exit test:**` lines, `# | Task | Pts | Notes` tables, the `| Phase | Theme | Points |` summary table. Single-phase plans still satisfy all of them (R1.5).

## 5. Files to change

| File | Requirement | Change |
|------|-------------|--------|
| `agents/planner.md` | R1 | Single-phase default; multi-phase only for big projects with `AskUserQuestion` confirmation; single-phase naming + doc-convention notes. |
| `commands/specmanager-plan.md` | R1 | Reconcile the "no flat plan" rule with single-phase-as-norm; note that single phase is the common output. |
| `commands/specmanager-build.md` | R2 | Step 8: auto-invoke walkthrough-writer (per-phase) when the phase is done + gate open + no existing draft; flip the "do NOT invoke it" Don't. |
| `agents/walkthrough-writer.md` | R3 | Per-phase mode: enforce the 9-section exemplar skeleton; project-adaptive Build/install sections. |
| `ui/src/App.tsx` | R4 | `WalkthroughCell`: render `FinalWalkthroughCard` only when `phases.length > 1`. |

No changes under `server/src/core/`, `server/src/mcp.ts`, or `server/src/board-server.ts`.

## 6. Test strategy

- **R1 / R3 (prompt changes):** exercised via the existing self-development flow — run `/specmanager-plan` and `/specmanager-walkthrough` against a real feature and diff the output against the exemplars / the single-phase expectation. No new selftest assertions needed for prompt behaviour (it's non-deterministic agent output); rely on the walkthrough's own pass-criteria checklist.
- **R2:** add a manual exit-check to the phase walkthrough: build a single-phase feature, confirm a `draft` walkthrough appears without a manual command, and that re-running build does not duplicate it (`list_documents` shows one).
- **R4:** UI assertion — a feature with one phase shows no roll-up card; after adding a second phase (`create_task` with a new phase), the roll-up card renders. Verify against `/api/board` `phases.length` and the rendered DOM. Add to the board selftest if a DOM-level harness exists; otherwise cover via the walkthrough's manual exit checks.

## 7. Risks

- **Single-phase plans that *should* split.** Mitigated by R1.2's "real testable increment" criterion + the `AskUserQuestion` confirmation when the planner does propose a split. The failure mode (one big phase that should have been two) is recoverable: the user adds a phase post-plan, which R4 already handles reactively.
- **Auto-fire surprises the user.** The walkthrough lands in `draft`, never approved (R2.2), so the user still reviews. The build command reports that it auto-created the draft.
- **Board-driven phase completion has no auto-fire.** Documented boundary (§3 R2); the manual command + the existing "ready" affordance cover it.

## 8. Out of scope

- A `core` `phase.completed` event and any server-side phase-completion badge.
- Project-type *detection code* (R3 generalisation is a prompt instruction, not a code path).
- Any change to the `final` walkthrough gate or the data model.
- Removing the `| Phase | Theme | Points |` **Total** row for single-phase plans (kept for parser simplicity).

## 9. Resolved open questions

- **Q1** → §3 R1: single phase keeps the full convention set with a real phase name; no parser special-casing.
- **Q2** → §3 R2: auto-fire is build-command-orchestrated (agent layer), not a `core` event.
- **Q3** → §3 R3: prompt adapts Build/install to the project; plugin reinstall dance only when the feature is itself a plugin.
- **Q4** → §3 R1: declined split falls back to single phase (or user-specified boundaries via `AskUserQuestion`).
- **Q5** → §3 R4: pure client-side `phases.length > 1`; no new API/manifest field.
