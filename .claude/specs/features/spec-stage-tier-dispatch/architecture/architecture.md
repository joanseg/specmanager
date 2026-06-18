---
id: arch-spec-stage-tier-dispatch-018
featureId: feat-spec-stage-tier-dispatch
stage: architecture
status: draft
stale: false
title: Spec-stage tier dispatch architecture
dependsOn:
  - prd-spec-stage-tier-dispatch-025
basedOn:
  prd-spec-stage-tier-dispatch-025: 2
generatedBy: agent
version: 1
createdAt: '2026-06-15T15:40:46.367Z'
updatedAt: '2026-06-15T15:40:46.367Z'
---
Based on PRD `prd-spec-stage-tier-dispatch-025` v2. No design doc exists for this feature (design optional; none present).

## Summary

Route the five spec/drafting subagents (prd-writer, planner, walkthrough-writer, designer, architect) to per-stage model tiers, reusing the exact `tier → alias` machinery the shipped "Build leverage primitives" feature put in `server/src/core/tiers.ts` and the `Task({ subagent_type, model, prompt })` dispatch pattern the build command already uses per task. No new concepts, primitives, or config surfaces. The only code addition is a pure stage→tier lookup (alongside the existing complexity→tier lookup); the behavioural change lives entirely in the five `commands/specmanager-*.md` orchestration prompts, which today dispatch their subagent with **no** `model:` field and therefore inherit the session model (typically Opus). Spec stages are single-call (one `Task` per invocation), so we key on **stage**, not Fibonacci complexity. Architect stays `strong` (Opus) — no cost change there — while the others drop to cheap/standard, cutting the largest remaining burn bucket (~2.3M of ~3.1M lifecycle tokens were subagents).

## Affected components

| Path | Change | Notes |
|---|---|---|
| `plugins/specmanager/server/src/core/tiers.ts` | **Edit** — add `Stage` type, `DEFAULT_STAGE_TO_TIER` map, `tierForStage()` helper | Mirrors existing `DEFAULT_COMPLEXITY_TO_TIER` / `tierForComplexity`. Pure, no persistence. Reuses existing `aliasForTier` + `INHERIT` — no change to existing exports (PRD non-goal: don't change tier logic/alias mapping). |
| `plugins/specmanager/server/src/core/index.ts` | **Verify/Edit** — ensure new exports are re-exported | `core/index.ts` is the single re-export barrel both entry points import; new symbols must surface there. |
| `plugins/specmanager/commands/specmanager-prd.md` | **Edit** — resolve stage tier `cheap`→alias, pass `model:` in the `Task` dispatch (step 3), accept optional `--tier` override | Currently dispatches `Task({ subagent_type: "prd-writer", … })` with no `model:`. |
| `plugins/specmanager/commands/specmanager-plan.md` | **Edit** — stage tier `standard` → see Open Q3 | Currently step 5 dispatch. |
| `plugins/specmanager/commands/specmanager-walkthrough.md` | **Edit** — stage tier `cheap` | Step 5 dispatch. |
| `plugins/specmanager/commands/specmanager-design.md` | **Edit** — stage tier `standard` | Step 6 dispatch. |
| `plugins/specmanager/commands/specmanager-architecture.md` | **Edit** — stage tier `strong` (= current inherited Opus behaviour, now explicit) | Step 4 dispatch. |
| `plugins/specmanager/server/src/selftest-tiers.ts` | **Edit** — add assertions for `tierForStage` + stage→alias round-trip | `selftest-tiers` script already registered in `package.json`; extend it, don't add a new script. |
| `plugins/specmanager/agents/{prd-writer,planner,walkthrough-writer,designer,architect}.md` | **No change** | Keep `model: inherit` in frontmatter. The per-invocation `Task({ model })` overrides frontmatter; leaving `inherit` is exactly the graceful-degradation path when the command omits `model:`. Hardcoding here would make the override surface impossible. (`reviewer.md`'s `model: opus` is a different case — it has no command-level dispatch to carry an override.) |

**Out of scope (PRD non-goals, restated so the planner doesn't touch them):** `commands/specmanager-build.md` (already routes per-task; untouched), `commands/specmanager-interview.md` (runs in main session, not a subagent — not tierable), `agents/reviewer.md`, `agents/builder.md`, and the alias mapping / complexity logic in `tiers.ts`.

## Data model changes

None. No schema, no frontmatter field, no `manifest.json` change, no `tasks.json` change, no settings.json (PRD: "No new user-facing config surfaces"). The stage→tier table is a compile-time constant in `tiers.ts`, identical in spirit to the existing `DEFAULT_COMPLEXITY_TO_TIER`. Tier selection remains per-session and non-persisted, exactly as the build command's complexity routing is.

## R1 — Stage→tier defaults in `core/tiers.ts`

Add, alongside the existing complexity machinery, a stage-keyed lookup. The five tierable stages and their PRD defaults:

| Stage / Subagent | Default tier | Alias (via `DEFAULT_TIER_TO_ALIAS`) |
|---|---|---|
| `prd` (prd-writer) | `cheap` | haiku |
| `plan` (planner) | `standard` | sonnet — **see Open Q3** |
| `walkthrough` (walkthrough-writer) | `cheap` | haiku |
| `design` (designer) | `standard` | sonnet |
| `architecture` (architect) | `strong` | opus |

Proposed additions (signatures in the repo's existing style — `export type` + `const Record` + pure function, matching `tierForComplexity`):

```ts
export type SpecStage = "prd" | "architecture" | "design" | "plan" | "walkthrough";

/** Default spec-stage → tier (R1). Spec stages are single-call, keyed by stage not complexity. */
export const DEFAULT_STAGE_TO_TIER: Record<SpecStage, Tier> = {
  prd: "cheap",
  walkthrough: "cheap",
  plan: "standard",
  design: "standard",
  architecture: "strong",
};

/** Map a spec stage to its default tier. Unknown stage ⇒ strong (safe default, mirrors complexity path). */
export function tierForStage(stage: string): Tier { /* DEFAULT_STAGE_TO_TIER[stage] ?? "strong" */ }
```

Reuse `aliasForTier(tier, sessionTable?)` unchanged for tier→alias resolution, so an unknown/unmapped tier still degrades to `INHERIT` (`"inherit"`) — the same AC4 safety the build path relies on. `SpecStage` deliberately reuses the same string literals as the existing `Document["stage"]` union so callers can pass the stage they already hold.

## R2 — Command-prompt dispatch wiring

Each of the five command files gains one resolution step before its existing `Task(...)` dispatch and threads the resolved alias into it. The pattern, lifted from `commands/specmanager-build.md` step 7:

1. Resolve the stage's default tier → alias (concretely: `cheap`→`haiku`, `standard`→`sonnet`, `strong`→`opus`).
2. If a per-invocation override was given (R4), use the overridden tier.
3. Dispatch `Task({ subagent_type: "<agent>", model: <alias>, prompt: … })`.
4. **If the resolved alias is unknown/unavailable, omit `model:`** so the subagent runs at the session default (`inherit`) — never error or block (matches build AC4 and the agents' `model: inherit` frontmatter).

This is purely a prompt edit — no server code runs at dispatch time; the command (the orchestrating model) reads the defaults and writes the `model:` field, exactly as it does for the per-task build loop. The `tiers.ts` additions exist so the values are stated in one authoritative place (and unit-tested), and so the command prompts can reference "the stage defaults in `core/tiers.ts`" rather than re-list magic strings — keeping the prompt and code from drifting, the same discipline build step 6b uses ("Pre-fill the defaults from `core/tiers.ts`").

## R3 — Multi-dispatch assumption (per-call routing)

PRD assumption: each spec command dispatches exactly one subagent `Task` per invocation — confirmed by reading all five command files (prd step 3, architecture step 4, design step 6, plan step 5, walkthrough step 5 each issue a single `Task`). The wiring is written per-dispatch, not per-command, so if any command ever spawns multiple agents the same resolve-then-pass rule applies to each call individually (the build command already proves this shape with its per-task loop). No fan-out exists today; this is forward-safety, not current behaviour.

## R4 — Per-invocation upward override

Provide a `--tier <cheap|standard|strong>` flag, parsed by the command prompt from `$ARGUMENTS`, parity with the build command's existing `[--force]` flag (a prompt-parsed token, no settings surface — satisfies "no new user-facing config surfaces"). The flag overrides the stage default for that one invocation only; resolution then runs `aliasForTier(<overriddenTier>)`. PRD frames it as "upward override" (e.g. architect-quality on a PRD), but the mechanism is symmetric — any of the three tiers is selectable; an unknown flag value degrades to the stage default (no error). Add `[--tier <cheap|standard|strong>]` to each command's `argument-hint` frontmatter. **This resolves Open Question 1** (the override surface): a command-prompt flag, chosen for exact parity with `--force`.

## Sequence / flow

Normal `/specmanager-prd feat-foo` (no override):

1. Command resolves feature (existing step 1), checks gate/draft (existing steps).
2. **New:** resolve `prd` → `cheap` → `haiku` (stage defaults from `core/tiers.ts`).
3. Dispatch `Task({ subagent_type: "prd-writer", model: "haiku", prompt: … })`.
4. prd-writer (frontmatter `model: inherit`, overridden to haiku) drafts + persists via `create_document`.
5. Command runs `sync_claude_md`, reports doc id + path (existing steps unchanged).

Override `/specmanager-architecture feat-foo --tier standard`:

1. Parse `--tier standard` from `$ARGUMENTS`.
2. Resolve `standard` → `sonnet` (instead of the `strong`→`opus` default).
3. Dispatch with `model: "sonnet"`; rest unchanged.

Degradation: if a resolved alias is unknown/unavailable at dispatch, the command **omits** `model:` entirely → the subagent's `model: inherit` frontmatter takes over → runs at session default. No throw, no block.

## Failure & edge cases

| Case | Handling |
|---|---|
| Alias unknown / model unavailable | Omit `model:`; subagent inherits session model (AC4 parity with build). Never error. |
| Unknown `--tier` value | Ignore the flag, fall back to the stage default. Don't fail the invocation. |
| Unknown stage passed to `tierForStage` | Returns `strong` (safe default, mirrors `tierForComplexity`'s null/>3 → strong). |
| Command spawns >1 subagent (future) | Apply resolve-then-pass per `Task` call (R3). |
| "Token usage optimisation" already edited these files | It is **shipped** (PRD Open Q4 answer: "already shiped"). Edits layer on top of the current file contents — read the files as they are now (this doc cites their current step numbers); no merge sequencing needed. Verified: no existing `model:` field in any of the five dispatches today. |
| Quality regression at cheap/standard | Out of scope to *prevent* (no rubric — PRD non-goal); board approval is the fidelity gate. Detection is the `--tier` upgrade path + the manual success-metric tracking in the PRD. See Open Q2. |

## Conventions used

- **TypeScript strict, `"type": "module"`, Node 20+** — additions to `tiers.ts` follow the file's existing `export type` + `const Record` + pure-function style; no classes, no defensive try/catch (CLAUDE.md: "don't program defensively").
- **Aliases never dated ids** — reuse `DEFAULT_TIER_TO_ALIAS` (`haiku`/`sonnet`/`opus`); a model version bump in a tier is automatic (PRD non-goal: no pinned ids).
- **Graceful degradation, never block** — unknown tier/alias ⇒ `INHERIT` / omit `model:` (build AC4).
- **Single source of truth** — stage defaults live in `core/tiers.ts`, re-exported via `core/index.ts`; command prompts reference it rather than restating magic strings.
- **Self-test discipline** — extend the hand-rolled `selftest-tiers.ts` (assertion-style, not a test runner), run via the existing `npm run selftest-tiers`; rebuild `dist/` before commit (CLAUDE.md build note).
- **Prompt-level orchestration** — dispatch routing lives in the command `.md` prompts, matching how build routes per task; no new server endpoint or MCP tool.
- **Override = prompt flag** — parity with build's `[--force]`; no settings.json (PRD: no new config surfaces).

## Open questions / risks

| # | Item | Disposition |
|---|---|---|
| 1 | Override surface (PRD Open Q1) | **Resolved here:** `--tier <cheap\|standard\|strong>` flag in `$ARGUMENTS`, parity with build's `--force`. Planner: confirm this over a board UI toggle (toggle would violate "no new config surfaces"). |
| 2 | No cheap/standard quality rubric (PRD Open Q2) | **Out of scope** (PRD non-goal). Optional follow-up: revision-count metadata on docs for post-ship regression tracking — flag to planner as a *separate* feature, not built here. Board approval remains the fidelity check. |
| 3 | planner at `standard` vs `strong` (PRD Open Q3) | PRD answer = "yes, default planner to strong if quality suffers." **Recommendation:** ship planner at `standard` per the Defaults table (the board gate catches bad plans; tunable post-ship by editing one line in `DEFAULT_STAGE_TO_TIER`). Planner stage and complexity-3 build tasks both already mean "strong elsewhere," so the `--tier strong` upgrade path is one flag away. Decide before build: `standard` (cheaper, recommended) vs `strong` (safer). |
| 4 | Merge-ordering with "Token usage optimisation" (PRD Open Q4) | **Resolved:** that feature is shipped; no parallel-edit risk. Verify at build time that no `model:` field was added to the five dispatches by it (none present at this writing). |
| 5 | Library doc lookup | Not applicable — change is purely internal (prompt orchestration + a pure helper in `tiers.ts`). No external/version-sensitive library involved; Context7 not consulted. |
