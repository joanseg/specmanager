---
id: wt-build-leverage-primitives-014
featureId: feat-build-leverage-primitives
stage: walkthrough
status: approved
stale: false
title: Build leverage primitives — feature walkthrough
dependsOn:
  - plan-build-leverage-primitives-012
  - wt-build-leverage-primitives-013
  - wt-build-leverage-primitives-012
basedOn:
  plan-build-leverage-primitives-012: 1
generatedBy: agent
version: 1
phase: final
createdAt: '2026-06-15T13:16:51.064Z'
updatedAt: '2026-06-15T13:20:48.080Z'
---
# Build leverage primitives — feature walkthrough

Feature-level roll-up for `feat-build-leverage-primitives` (PRD `prd-build-leverage-primitives-024` v9, Architecture `arch-build-leverage-primitives-016` v5, Plan `plan-build-leverage-primitives-012` v1). This is the shipped-summary index — the per-phase walkthroughs own the code tour and the runnable checks; this doc links them, composes the phases into the user-visible flow, and verifies the PRD's success metrics. Both phases are complete (`core`: 15 tasks done; `wiring`: 5 tasks done) on branch `feat/build-leverage-primitives`, dogfooded into the SpecManager plugin's own source under `plugins/specmanager/`.

## 1. What shipped overall

The PRD's problem: **SpecManager produced high-quality specs but did not _enforce_ them at build time** — the spec was advisory (a card could go "done" with red tests or a diverged diff), model cost was flat (the per-task Fibonacci `complexity` was computed but never used as a cost lever), the designer reinvented taste each session instead of deferring to the installed `frontend-design` skill, adjacent installed skills (Superpowers) went unused, and the architect drafted against possibly-stale training data with no way to pull current library docs.

This feature shipped the **top-left quadrant** (high value / low complexity) of the ideas backlog as six interlocking build-leverage primitives, each turning an existing SpecManager primitive (or an installed-skill seam) into execution leverage with minimal new machinery:

| # | Primitive | What it turns into leverage |
| --- | --- | --- |
| R1 | Stop-hook exit gate | git-tracked spec + `tasks.json` acceptance criteria → an **enforced** contract; pure-bash, zero model calls; N=3 cap surfaces impossible work as `blocked` |
| R2 | Fibonacci→tier model routing | per-task `complexity` (1/2/3) → cheap/standard/strong tier → Claude Code **alias** (`haiku`/`sonnet`/`opus`, never dated ids); per-session table via `AskUserQuestion`; default `inherit` |
| R3 | Spec-compliance reviewer agent | the card's spec slice + a read-only `opus` subagent → semantic pass/fail before advance; escalate-on-fail one tier, bounded by R1's cap |
| R4 | Superpowers TDD/review wiring | existing builder instructions → detect-then-defer to installed Superpowers execution-discipline skills |
| R5 | `frontend-design` wiring + new-project robustness | existing designer + `docs/DESIGN.md` tokens → 3-tier degradation, grounding ladder, synthesized tokens bootstrapped back into `docs/DESIGN.md` |
| R6 | Context7 architect doc-lookup | architect subagent + on-demand Context7 (MCP → curl → suggest) → current, version-specific library docs; never blocks the draft |

**Cross-cutting design themes worth remembering:**

- **One shared tier ladder (R2) is reused by R3's escalation.** `core/tiers.ts` is the single source for complexity→tier→alias; R3's escalate-on-fail walks the same cheap→standard→strong ladder rather than defining its own.
- **One detect-then-defer / graceful-degradation pattern across R4/R5/R6.** Each optional dependency (Superpowers, `frontend-design`, Context7) sits behind the same three tiers: real skill/tool if present → distilled built-in fallback → suggest install. Absence is the designed behaviour, never an error.
- **The planner now emits two `meta.phases.*` fields** — `meta.testCommand` (R1, makes the gate deterministic instead of convention-probing) and `meta.architectureRefs` (R3, makes the reviewer's spec slice precise) — written via the `set_phase_meta` MCP tool.
- **A first-class `blocked` task status** was added as a deviation-for-the-better: the architecture hedged on surfacing the R1/AC2 + R3/AC5 cap as a meta-note marker only; the builder instead threaded `blocked` through the `TASK_STATUS` enum, phase rollup, manifest cache, managed CLAUDE.md block, and the board UI — a visible board state with clear remediation (re-enter the phase to reset the counter), not a buried string.

## 2. Phase journey

The work split into two phases — a compiled **deterministic spine** first, then the **prompt-only wiring** that leans on it. The split exists so the spine ships installable and self-testable (build + selftests + plugin-validate green) before the prompt layer — whose only verification is manual dry-run — goes on top.

### Phase `core` — enforcement machinery (15 tasks, 27 pts)
→ `walkthroughs/build-leverage-primitives/phase-core.md` (`wt-build-leverage-primitives-013`, approved)

All compiled `server/core` + `mcp.ts` code and the pure-bash gate: the `meta.phases.{testCommand,architectureRefs}` schema (`core/types.ts`), the `resolve_active_card` resolver + `core/tiers.ts` table, the `hooks/stop-gate.sh` Stop hook with its N=3 iteration cap, the first-class `blocked` status, the read-only `agents/reviewer.md` (pinned `model: opus`) + parent slice-assembly in `commands/specmanager-build.md`, the per-task tier dispatch (`AskUserQuestion` + per-task `model:<alias>`), and the R5-core `mergeSynthesizedTokens` + `bootstrap_design_tokens` placeholder-only write path. Covers **R1, R2, R3, R5-core**.

### Phase `wiring` — pure prompt detect-then-defer (5 tasks, 9 pts)
→ `walkthroughs/build-leverage-primitives/phase-wiring.md` (`wt-build-leverage-primitives-012`, approved)

Instruction-level edits only, no compiled surface — consuming the `core` spine. Superpowers TDD/debug/two-stage-review + the shared de-dup line into `agents/builder.md` (R4); the `frontend-design` 3-tier method + grounding ladder + `bootstrap_design_tokens` bootstrap-back into `agents/designer.md` and `commands/specmanager-design.md`, plus the same detect-then-defer for UI build tasks in `agents/builder.md` (R5-prompt); the Context7 MCP→REST→suggest ladder into `agents/architect.md` (R6); and the Architecture section-anchor convention (requirement-id / kebab-slug) that `meta.architectureRefs` resolves against (R3/AC2a). Covers **R4, R5-prompt, R6, R3/AC2a**.

## 3. End-to-end flow

How the phases compose into the user-visible feature (from the PRD's high-level flows):

- **Build with gate (R1+R2+R3+R4).** Builder picks the next task → **R2** reads its `complexity` and dispatches `Task(builder, model:<alias>)` from the per-session tier table (confirmed once via `AskUserQuestion` at build start) → builds, **R4**-deferring to Superpowers' TDD/debug/review when installed, else the plain loop → tries to stop → **R1** `stop-gate.sh` runs the phase's `meta.testCommand` and checks all phase tasks are `done`; fail ⇒ exit 2 with actionable stderr, builder fixes, re-gate until green or the N=3 cap writes `blocked` and exits 0 → on pass, the parent assembles the **R3** spec slice (phase `plan.md` section + task titles/notes + Architecture section(s) named in `meta.architectureRefs`) and invokes the read-only `opus` reviewer → `pass` advances the card; `fail` re-dispatches the fix one R2 tier higher (capped strong) against the **same** N=3 budget → persistent fail ⇒ `blocked` on the board (no second loop).
- **UI design + build (R5).** `/specmanager-design` → designer grounds in `docs/DESIGN.md` tokens → if `frontend-design` is installed, applies it on top for taste/composition, else the distilled built-in method → on thin/placeholder tokens, invites an optional reference, synthesizes a starter system, and calls `bootstrap_design_tokens` to fill placeholders back into `docs/DESIGN.md` → mockups persist via `create_design_brief`. UI build tasks do the same detect-then-defer, colors/type still tracing to `docs/DESIGN.md`.
- **Architecture draft with doc-lookup (R6).** `/specmanager-architecture` → architect drafts against PRD + repo → on an unfamiliar/version-sensitive library, walks the Context7 ladder (in-session MCP tools → keyless REST curl → suggest install) → on success grounds the decision and notes the library/version consulted; on failure/429/unconfigured, proceeds from training data — the draft always completes.

## 4. PRD success metrics revisited

| Metric (PRD §Success metrics) | Status | Evidence |
| --- | --- | --- |
| **R1** — zero cards reach "done" with red tests or unmet criteria; impossible tasks surface as `blocked` within the cap (no infinite loops) | **Met** | `selftest-stopgate` drives the full contract (no-op when idle, exit-2 on open tasks/failing command, `"none"`-marker criteria-only, N=3 cap → `blocked` + exit 0, counter reset). phase-core §3.2, §3.5, §3.6. |
| **R2** — measurable per-build cost reduction on 1–2 pt tasks vs. flat-Opus; correct tier per documented mapping | **Met (mapping verified)** | `selftest-tiers` asserts 1→cheap/`haiku`, 2→standard/`sonnet`, 3→strong/`opus`, >3/null→strong, unknown→`inherit`, no dated ids; build command dispatches per-task `model:<alias>`. Cost-reduction follows mechanically from routing 1–2 pt tasks off Opus onto haiku/sonnet. phase-core §3.2, §3.7. |
| **R3** — every completed card carries a structured pass/fail compliance verdict before advancement | **Met** | `agents/reviewer.md` returns `{verdict, reasons}` at pinned `opus`, read-only (`Read, Glob, Grep, Bash`); parent slice-assembly invokes it after the gate passes and before advance, escalating on fail within the N=3 budget. phase-core §3.8. |
| **R4** — with Superpowers installed, build defers to its skills; without it, plain flow runs with no error | **Met** | `agents/builder.md` Skill-leverage section: shared de-dup line + three execution-discipline skills (TDD, systematic-debugging, two-stage review), graceful degradation when absent. Verified by read-through + manual dry-run. phase-wiring §3.1. |
| **R5** — with `frontend-design` installed, designer + UI tasks defer to it (on top of DESIGN.md); without it, current behaviour runs with no error, no new artifact/command/chip | **Met** | `agents/designer.md` 3-tier method + grounding ladder + invite-on-thin + `bootstrap_design_tokens` bootstrap-back; `agents/builder.md` same for UI tasks; no new surface. Dry-run #1 (thin DESIGN.md) confirms synthesize → bootstrap → complete with/without the skill. phase-wiring §3.2, §3.3, §3.5. |
| **R6** — architect consults current docs on version-sensitive libs and notes lib/version; unavailable/unconfigured ⇒ drafts with no error/delay (graceful no-op) | **Met** | `agents/architect.md` on-demand ladder (MCP → keyless REST → suggest), `429`/empty/unconfigured all treated as "not configured", notes library+version when consulted, no `.mcp.json` change. Dry-run #2 confirms both branches. phase-wiring §3.4, §3.6. |

**Verification status:** phase `core` exit test fully green — `npm run build` clean, `selftest-stopgate` / `selftest-tiers` / `selftest-phases` / `selftest-build` pass, `claude plugin validate plugins/specmanager` passes (lone pre-existing "No version specified" warning). Phase `wiring` validates clean (prompt-only; `meta.testCommand: "none"`, no `dist/` rebuild). The rebuilt plugin is loaded — the new MCP tools `resolve_active_card`, `set_phase_meta`, and `bootstrap_design_tokens` are registered.

**Known non-regression:** `selftest-roundtrip` fails on this branch **and on `main`** independently of this feature — a pre-existing unrelated failure, tracked separately, not introduced by either phase (phase-core §6).

## 5. Known limitations & future work

Deferred across both phases — carried from the PRD non-goals (explicitly out of scope, lower in the same backlog):

- Per-card agent orchestration / worktree isolation
- GitHub issue / PR sync
- Headless overnight board-drain
- Preference-learning / decision corpus
- Cerebras integration
- Wiring Superpowers' **brainstorming / planning** skills into build (SpecManager owns the "what"; only execution-discipline skills were wired)
- Vendoring Superpowers or `frontend-design` code (detection + instruction-level wiring only — license + drift)
- A `design-brief.md` artifact or a `/specmanager-design-brief` command (duplicate the existing `docs/DESIGN.md` + `create_design_brief` primitives)
- Any `.mcp.json` change for R6 (no bundled Context7 server, no forced API-key step)

**Open items settled during build (for traceability):** the iteration-cap temp file is scoped **per feature-phase** (`.claude/specs/.cache/stop-gate/<slug>__<phase>`, git-ignored), cap **N=3**; the R3 reviewer runs as a **separate parent-invoked step after the gate exits 0**, not inside the Stop-hook loop; synthesized tokens merge **fill-placeholder-only** (never clobbering harvested real CSS-var values) via the marker-anchored `mergeSynthesizedTokens`.

**Behavioural notes (not bugs):** detection of Superpowers / `frontend-design` / Context7 happens at **agent runtime**, not install time — with none installed every path degrades to the plain built-in flow. R2's cost reduction depends on the user keeping (not remapping) the default tier table for a session.
