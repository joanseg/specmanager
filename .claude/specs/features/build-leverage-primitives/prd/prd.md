---
id: prd-build-leverage-primitives-024
featureId: feat-build-leverage-primitives
stage: prd
status: approved
stale: false
title: Build leverage primitives PRD
dependsOn: []
basedOn: {}
generatedBy: agent
version: 9
createdAt: '2026-06-15T09:33:20.232Z'
updatedAt: '2026-06-15T11:39:45.895Z'
---
## Problem

SpecManager produces high-quality specs but does not yet _enforce_ them at build time. Four gaps, all closeable with primitives the system already owns:

1. **The spec is advisory.** The builder can mark a card "done" while tests are red or while the diff diverged from the card's spec section. Nothing deterministic blocks the board transition.
1. **Model cost is flat.** Every per-task build runs on the same model regardless of the task's Fibonacci `complexity` — already computed, never used as a cost lever.
1. **The designer reimplements design taste from scratch.** SpecManager already holds design intent durably: project-level design tokens live in git-tracked `docs/DESIGN.md` (`colors`, `typography`, `rounded`, `spacing`, `components`, auto-synced on `feature.shipped`), and per-feature screens live in `design/mockups.html` (the `designer` subagent reads `docs/DESIGN.md`, uses its exact token values, and produces stacked high-fi screens + notes via the `create_design_brief` MCP tool, explicitly fighting "AI slop"). The narrower gap: the designer subagent reinvents design taste/composition each time instead of deferring to the official Anthropic `frontend-design` skill — grounded in the same `docs/DESIGN.md` tokens — when that skill is installed.
1. **Adjacent installed skills are unused.** When Superpowers (TDD / systematic-debugging / two-stage review) or the Anthropic `frontend-design` skill are installed, the build flow doesn't defer to them.

A fifth gap sits at the architecture stage: today the `architect` drafts against its own training-data knowledge of libraries, which can be stale for version-sensitive or unfamiliar APIs, with no mechanism to pull current docs — at odds with the repo's "latest APIs" value.

This feature bundles the **top-left quadrant** (high value / low complexity) of the ideas backlog: small primitives, each turning an existing SpecManager primitive (or an installed-skill seam) into execution leverage with minimal new machinery. These are what to build _first_.

## Users & jobs-to-be-done

SpecManager is single-user, fully local. Affected user:

- **The solo builder driving** **`/specmanager-build`** **(and** **`/specmanager-architecture`****)** — wants a card to reach "done" only when its own spec says it's done, wants to not overpay for trivial tasks, wants UI work that looks intentional across sessions, wants architecture decisions grounded in current library docs rather than stale training data, and wants the build flow to use whatever execution-discipline skills they already have installed — without configuring any of it by hand.

## Goals / non-goals

**Goals** — independently shippable primitives, each a distinct epic with its own acceptance criteria:

| #  | Primitive                                          | Leverage from existing primitive                                                |
| -- | -------------------------------------------------- | ------------------------------------------------------------------------------- |
| R1 | Stop-hook exit gate                                | git-tracked spec + tasks.json acceptance criteria → enforced contract           |
| R2 | Route model by Fibonacci score                     | per-task `complexity` score → model selection                                   |
| R3 | Spec-compliance reviewer agent                     | card's spec slice + subagent model → semantic verification                      |
| R4 | Superpowers TDD / review wiring                    | existing command/agent instructions → defer to installed skills                 |
| R5 | Wire `frontend-design` skill into design + UI flow | existing designer subagent + `docs/DESIGN.md` tokens → defer to installed skill |
| R6 | Architect Context7 doc-lookup                      | architect subagent + on-demand Context7 → current, version-specific library docs |

**Non-goals** (explicitly deferred — lower in the same backlog):

- Per-card agent orchestration / worktree isolation

- GitHub issue / PR sync

- Headless overnight board-drain

- Preference-learning / decision corpus

- Cerebras integration

- Wiring Superpowers' _brainstorming / planning_ skills into build (SpecManager owns the "what")

- Vendoring Superpowers code (detection + instruction-level wiring only)

- A `design-brief.md` artifact or a `/specmanager-design-brief` command — both duplicate the existing `docs/DESIGN.md` token system, `design/mockups.html`, and `create_design_brief` tool (see R5)

- Solution design, schemas, API contracts (architect's job)

## Success metrics

- **R1:** zero cards reach board "done" with red tests or unmet acceptance criteria; impossible tasks surface as `blocked` (not infinite loops) within the iteration cap.

- **R2:** measurable per-build cost reduction on 1–2 pt tasks vs. flat-Opus baseline; correct tier selected per documented mapping.

- **R3:** every completed card carries a structured pass/fail compliance verdict before advancement.

- **R4:** with Superpowers installed, build defers to its skills; without it, the plain/built-in flow runs with no error.

- **R5:** with the `frontend-design` skill installed, the designer subagent and UI build tasks defer to it (applied on top of `docs/DESIGN.md` tokens); without it, the designer's current self-contained behaviour runs with no error and no new artifact/command/board chip is introduced.

- **R6:** when the architect hits an unfamiliar/version-sensitive library, current docs are consulted and the consulted library/version is noted in the Architecture (architect-phase only); when the lookup is unavailable or unconfigured, the Architecture still drafts with no error and no delay (graceful no-op).

## Constraints & assumptions

- Honor SpecManager invariants: **only the parent writes** (subagents read-only, no permission prompts); **deterministic gate logic stays in bash/core, not prompts**; **graceful degradation** whenever an external skill/plugin is optional.

- R1 gate must be **pure bash / zero model calls** for the basic case (tests + acceptance-criteria parsing are deterministic and free).

- R2 mapping is bounded: SpecManager already splits any task >3 pts, so the live range is 1–3 with a documented escalation rule for the rare higher score.

- R1 must fit the existing per-task / per-phase model: the builder executes **one phase and stops at its boundary**; the gate's verification target is the spec/tasks for the _active_ work.

- **In scope for R1 (planner change):** the small `planner.md` change to emit `meta.testCommand` per phase is **in scope** as a dependency of R1's deterministic gate (R1/AC5) — it gives the gate its primary, reliable source for what to run. Scope is limited to emitting that one field (plus the "none / manual-check" marker for test-less phases); no other planner behaviour is in scope.

- **In scope for R3 (two upstream-structure changes):** R3's deterministic spec-slicing depends on two bounded upstream changes, both **in scope** for this feature: (1) `architect.md` writes the Architecture with **stable, named, addressable section anchors** — bounded to section-anchoring; (2) `planner.md` / `/specmanager-plan` emits a per-phase **`meta.architectureRefs`** field — bounded to that one field, exactly like `meta.testCommand`. Do **not** expand architect/planner scope beyond these.

- R6 must not push setup friction onto users who never reach the architect phase: no bundled MCP server in SpecManager's own `.mcp.json`, no forced API-key step; the lookup is opt-in / on-demand only.

- _Assumption:_ the active card's tests are discoverable/runnable from the repo by the hook (deterministic command). Flag in open questions if not.

- _Assumption:_ the Claude Code Stop hook contract holds — reads JSON from stdin, signals via exit code, **exit 2 forces continue and feeds stderr back to Claude** as the steering message.

## Requirements (per-epic acceptance criteria)

### R1 — Stop-hook exit gate (build first; highest ROI)

A Stop hook fires when the builder thinks it finished a task/phase and blocks stopping until the work satisfies the spec. It runs the active card's tests and checks the task's acceptance criteria (tasks.json checkboxes / done-conditions); if either fails it exits 2, loops the builder to fix, and re-gates until green, then exits 0.

- **AC1 — actionable stderr:** on failure, exit 2 with an actionable message (e.g. `tests failing: <last lines>`); stderr is the only channel back to Claude.

- **AC2 — max-iteration cap:** track retry count in a temp file; after N retries (e.g. 3) write `blocked: <reason>` to the card/spec and exit 0, so the card surfaces as **blocked** on the board instead of spinning on an impossible task.

- **AC3 — pure bash, zero model calls** for the basic gate (tests + criteria parsing).

- **AC4 — phase-model fit:** verification target is the spec/tasks for the active phase/task; respects the phase boundary.

- **AC5 — explicit per-phase test command:** the planner (`/specmanager-plan` / `planner.md`) emits an explicit `meta.testCommand` for **every** phase, so the gate's verification is deterministic rather than relying on fragile repo convention-probing. A phase with no automated test (e.g. pure prompt-wiring work) emits an explicit "none / manual-check" marker rather than leaving the field absent — distinguishing *"nothing to run"* (intentional) from *"I don't know what to run"* (a gap). The Stop-hook gate reads `meta.testCommand` as its **primary** source for what to run, falling back to probing repo conventions only if the field is somehow missing.

### R2 — Route model by Fibonacci score

Use each task's `complexity` score to select the model the per-task work runs on, **routed through abstract tiers and a configurable table** rather than pinned model names. Tiers map to Claude Code model **aliases** (`haiku`/`sonnet`/`opus`) — never dated IDs (e.g. not `claude-haiku-4-5-...`) — so a new model version in a tier (or a deprecated one leaving it) is picked up automatically and adding/removing a model is a config edit, not a routing-logic change. Today every SpecManager agent uses `model: inherit`; this is the first place a model is selected.

- **AC1 — per-score default mapping:** complexity 1 → cheap tier, 2 → standard tier, 3 → strong tier (scores >3 don't occur because the planner splits them; if one slips through, treat as strong).

- **AC2 — tier indirection via aliases:** routing selects a _tier_; tiers map to Claude Code aliases (`haiku`/`sonnet`/`opus`), not pinned dated IDs, so new/deprecated models are a config edit, not a logic change.

- **AC3 — per-session configurable via AskUserQuestion:** at the start of `/specmanager-build`, an `AskUserQuestion` lets the user confirm or remap the tier→model table for the session (e.g. pin Fable to the strong tier, or downgrade everything to Haiku for cost), with the AC1 defaults pre-filled. The chosen mapping applies for the session's builds.

- **AC4 — graceful default:** no score / unknown tier / unavailable or deprecated mapped model → fall back to `inherit` (the session's default model); never error, never block a card.

### R3 — Spec-compliance reviewer agent

A read-only subagent checks the produced diff against the card's spec section and returns pass/fail _before_ the card advances. Complements R1 (gate = deterministic tests+criteria; reviewer = semantic "does this match the spec"). Composes with R2's tier ladder (cheap → standard → strong) and R1's max-iteration cap.

- **AC1 — new agent** under `agents/`, **read-only toolset** (no writes; fits the no-permission-prompt subagent model).

- **AC2 — spec-slice as compliance contract:** the reviewer takes the card's **spec slice** as the compliance contract, defined precisely as:

  > **slice = the phase's `plan.md` section + its task titles/notes (from `tasks.json`) + the Architecture section(s) named in the phase's `meta.architectureRefs`**

  The **parent** (the `/specmanager-build` flow) assembles this slice and passes it to the read-only reviewer — the reviewer does **not** read the whole Architecture doc; it stays focused and read-only. If `meta.architectureRefs` is absent, the reviewer falls back to matching by the requirement id/name shared between the plan phase and the Architecture heading. Primary-then-fallback, the same shape as R1's `meta.testCommand` discovery (R1/AC5).

- **AC2a — Architecture must be sliceable (upstream, in scope):** the `architect` subagent (`agents/architect.md`) writes the Architecture with **stable, named, addressable section anchors** — one per requirement (R1, R2, …) or per component — so any section can be referenced by name. Formalizes structure the architect already produces; bounded to section-anchoring only.

- **AC2b — planner records the mapping (upstream, in scope):** the planner (`agents/planner.md` / `/specmanager-plan`) emits a per-phase **`meta.architectureRefs`** — the named Architecture anchor(s) that phase implements — bounded to that one field, exactly like `meta.testCommand` (R1/AC5).

- **AC3 — structured verdict:** returns pass/fail with reasons; **the parent decides advancement.**

- **AC4 — seam for two-stage review:** spec-compliance first, leaving room for a later code-quality stage.

- **AC5 — escalate-on-failure:** on a **fail** verdict, the parent re-dispatches the fix one R2 tier **higher** than the card's current build tier (cheap → standard → strong), capped at strong. A failed compliance review is evidence the Fibonacci-derived difficulty estimate was too low, so escalating beats retrying at the same too-cheap tier. Reuses R2's tiers and is **bounded by R1's max-iteration cap** — repeated failures even at strong surface the card as **blocked** on the board rather than looping (no second independent loop).

- **AC6 — reviewer pinned to strong tier:** the reviewer agent itself always runs on the **strong** tier, independent of the card's build tier — the judge must be capable. Review is cheap relative to build (read-only, single pass) and a wrong verdict is expensive, so the reviewer does not follow the card's score-derived tier.

### R4 — Superpowers TDD / review wiring

Builder/task-execution instructions defer, **when Superpowers is installed**, to its TDD (red→green→refactor), systematic-debugging (root-cause before fix), and two-stage review skills — feeding each the task's spec section as the compliance contract.

- **AC1 — detect-then-defer:** same detection pattern SpecManager uses elsewhere; when present, defer to those skills.

- **AC2 — graceful degradation:** when absent, fall back to a lightweight built-in equivalent (or the plain flow) with no error.

- **AC3 — de-duplication line:** one instruction ("if Superpowers is installed, defer to its skills and skip the built-in equivalents") prevents both skill sets double-triggering.

- **AC4 — scope guard:** wire execution-discipline skills only — **not** brainstorming/planning; do **not** vendor Superpowers code.

### R5 — Wire the `frontend-design` skill into the design + UI flow

The existing `designer` subagent (and UI-touching build tasks) should detect and defer to the official Anthropic `frontend-design` skill when available, grounded in `docs/DESIGN.md` tokens, with graceful fallback to the current behaviour when the skill is absent. This is instruction-level wiring inside the _existing_ `/specmanager-design` stage and builder — NOT a new command, NOT a new artifact, NOT a new board chip. R5 must also hold on a newly-created project where no `frontend-design` skill is installed and `docs/DESIGN.md` carries only the auto-inferred placeholder tokens `/specmanager-init` writes — degrading through a baked-in distilled fallback that bootstraps real tokens back into `docs/DESIGN.md`.

- **AC1 — no new surface:** no new command (`/specmanager-design` already exists), no new doc/artifact (`docs/DESIGN.md` + `design/mockups.html` already hold the design system + per-feature screens), no new board chip.

- **AC2 — detect-then-defer:** when the `frontend-design` skill is present, the designer subagent reads and applies it; UI build tasks do the same. Same detection pattern R4 uses for Superpowers.

- **AC3 — grounded in DESIGN.md:** the skill is applied _on top of_ the project's existing tokens — colors/type/spacing still trace to `docs/DESIGN.md`; the skill informs taste/composition, it does not override the token system.

- **AC4 — graceful degradation:** when the skill is absent, fall back to the designer subagent's current self-contained behaviour with no error.

- **AC5 — always-available distilled fallback (3-tier):** the design behaviour degrades gracefully with NO `frontend-design` skill installed via three tiers — (1) defer to the real skill when installed; (2) an always-present distilled design-discipline method baked into the `designer` subagent (brainstorm a compact token system: 4–6 named colors, 2+ type roles, a layout concept, one signature element; critique for genericness before building); (3) optionally suggest installing the official skill. Do NOT vendor the skill verbatim (license + drift); encode the method only. The designer already has a partial version of this (its "avoid AI slop" / high-fi bar).

- **AC6 — grounding ladder:** the designer grounds the design in this priority order — (1) real `docs/DESIGN.md` tokens when populated; (2) an optional user-provided design example/screenshot; (3) synthesize a token system from scratch when neither exists.

- **AC7 — optional example prompt:** when `docs/DESIGN.md` tokens are thin/placeholder, the designer explicitly INVITES an optional design reference (reusing the existing screenshot-attachment path) to seed tokens — always optional, never required, no error if omitted.

- **AC8 — bootstrap back to DESIGN.md:** when the designer synthesizes a starter token system (optionally seeded by the user's example), it is written back into `docs/DESIGN.md` so the durable source of truth is bootstrapped rather than leaving the result trapped in `design/mockups.html`.

- **Non-goal:** do NOT introduce a `design-brief.md` artifact or a `/specmanager-design-brief` command — both duplicate existing primitives.

### R6 — Architect Context7 doc-lookup (architect phase only; graceful fallback)

The `architect` subagent fetches current, version-specific library documentation when drafting an Architecture touches an unfamiliar or version-sensitive library, so generated architecture stays aligned with current library APIs instead of stale training data (supports the repo's "latest APIs" value). On-demand, architect-phase-only, and degrades gracefully — same detect-then-defer / graceful-degradation pattern as R4/R5.

- **AC1 — on-demand, architect-only:** the lookup fires only when the architect is drafting Architecture and hits an unfamiliar/version-sensitive library; it does NOT run every session and is NOT wired into other stages (PRD, design, plan, build).

- **AC2 — detect-then-use ladder:** prefer the Context7 **MCP tools** if already available in the session (e.g. `resolve-library-id` / `query-docs`); otherwise **curl the Context7 REST API on demand** (lightweight, no persistent MCP context overhead).

- **AC3 — no bundling / no forced friction:** SpecManager does NOT bundle the Context7 MCP server in its own `.mcp.json` — that would push an API-key step onto every user, including those who never reach the architect phase. The lookup is opt-in / on-demand only.

- **AC4 — graceful degradation:** if the lookup fails, returns nothing, or needs an API key the user hasn't configured, the architect **suggests installing Context7 and proceeds WITHOUT it** — it never blocks or delays the Architecture draft.

- **AC5 — grounded use:** when fetched docs inform an architectural decision, the architect notes the library/version it consulted so the choice is traceable.

## High-level user flows

- **Build with gate (R1+R2+R3+R4):** builder picks next task → R2 selects model from `complexity` → builds (R4: defers to Superpowers TDD/debug skills if installed, else plain flow) → tries to stop → R1 Stop hook runs tests + checks acceptance criteria → fail: exit 2 with actionable stderr, builder fixes, re-gate (until green or iteration cap → `blocked`) → pass: exit 0 → R3 read-only reviewer checks diff vs. spec slice, returns pass/fail → parent advances the card.

- **UI design + build (R5):** `/specmanager-design` runs → designer subagent reads `docs/DESIGN.md` tokens → if the `frontend-design` skill is installed, applies it on top of those tokens for taste/composition (else current self-contained behaviour) → produces `design/mockups.html` via `create_design_brief` → UI build tasks do the same detect-then-defer, with colors/type still tracing to `docs/DESIGN.md`.

- **Architecture draft with doc-lookup (R6):** `/specmanager-architecture` runs → architect drafts against the approved PRD + repo → hits an unfamiliar/version-sensitive library → tries Context7 MCP tools, else curls the REST API on demand → on success, grounds the decision and notes the library/version consulted; on failure/unconfigured, suggests installing Context7 and proceeds without it → Architecture draft completes either way.

## Sequencing

Recommended build order (each independently shippable, plannable as separate phases):

1. **R1 Stop-hook gate** — cheapest transformative change.
1. **R2 Fibonacci routing** + **R3 reviewer agent**.
1. **R4 Superpowers wiring** + **R5** **`frontend-design`** **skill wiring** (both are detect-then-defer instruction-level changes sharing one detection pattern).
1. **R6 architect Context7 doc-lookup** — independently shippable, architect-phase (distinct from the build-phase primitives R1–R4 and the design wiring R5); cheap and a quick win, lower urgency than R1's gate.

## Open questions

- How does the R1 hook discover and run the active card's test command deterministically across target projects (convention, config, or per-feature declaration)?\
  Decided: per-phase declaration — the planner **always** emits `meta.testCommand` (with an explicit "none / manual-check" marker for test-less phases), which the gate reads as its primary source; convention-probing is fallback only (R1/AC5).

- Where is the iteration-cap temp file scoped — per card, per phase, per session — and when is it reset?\
  Answer: maybe per project, architect to review

- Exact value of the iteration cap N (default suggested: 3)?\
  Answer: 3 sounds good.&#x20;

- Does R3's reviewer run inside the same Stop-hook loop, or as a separate parent-invoked step after exit 0?\
  Answer: architect to review.

- How is R3's reviewer spec-slice extracted from "the card's spec section"?\
  Decided: slice = the phase's `plan.md` section + its task titles/notes (`tasks.json`) + the Architecture section(s) named in the phase's `meta.architectureRefs`; the **parent** assembles it; name-match fallback (requirement id/name shared between plan phase and Architecture heading) when `meta.architectureRefs` is absent (R3/AC2). Still open: the exact representation of `meta.architectureRefs` (anchor slug vs. heading text vs. requirement id) — architect to settle alongside the `architect.md` anchor scheme (R3/AC2a, AC2b).

- How do synthesized starter tokens (AC8) merge with the existing auto-inferred managed block in `docs/DESIGN.md` produced by `syncDesignMd`/init — overwrite the placeholder block, or fill only empty fields? (Note the managed-marker / line-anchored merge constraint.)\
  Answer: architect to review.
