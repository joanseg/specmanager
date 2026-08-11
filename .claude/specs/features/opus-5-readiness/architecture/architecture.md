---
id: arch-opus-5-readiness-023
featureId: feat-opus-5-readiness
stage: architecture
status: draft
stale: false
title: Opus 5 readiness architecture
dependsOn:
  - prd-opus-5-readiness-036
basedOn:
  prd-opus-5-readiness-036: 1
generatedBy: agent
version: 1
createdAt: '2026-08-04T14:54:09.606Z'
updatedAt: '2026-08-04T14:54:09.606Z'
---
## Summary

Trim SpecManager's own prompt surface (7 agents, 9 commands) onto the current Claude Code contract, move one block of deterministic text processing out of prose and into `core/`, and resolve PRD `prd-opus-5-readiness-036`'s five open decisions. Two code changes ship: a new `core/spec-slice.ts` + `get_spec_slice` MCP tool (replacing `commands/specmanager-build.md` step 7b's hand-written slice algorithm), and a re-mapped `core/tiers.ts` table. Everything else is prose deletion in `plugins/specmanager/agents/*.md` and `plugins/specmanager/commands/*.md`, gated by a new selftest (`selftest-prompts`) that asserts each load-bearing invariant survives the trim. No lifecycle behaviour changes; no UI changes.

---

## Affected components

| Path | Change |
|---|---|
| `plugins/specmanager/server/src/core/spec-slice.ts` | **New.** Phase-plan + task + Architecture-anchor slice assembly (R6). |
| `plugins/specmanager/server/src/core/index.ts` | Add `export * from "./spec-slice.js";` (line 12 area, after `phases.js`). |
| `plugins/specmanager/server/src/core/active-card.ts` | `exitTestForPhase`'s `## Phase` matcher (L33) moves to `spec-slice.ts`; imports it back. One parser, one place. |
| `plugins/specmanager/server/src/core/tiers.ts` | Re-map `DEFAULT_TIER_TO_ALIAS.cheap` (Q1). |
| `plugins/specmanager/server/src/mcp.ts` | Register `get_spec_slice` (pattern: `get_phase_completion`, L389–396). |
| `plugins/specmanager/server/src/selftest-tiers.ts` | Update `cheap → haiku` assertions (L31, L45). |
| `plugins/specmanager/server/src/selftest-stopgate.ts` | Add absent-`testCommand` cases (Q5). |
| `plugins/specmanager/server/src/selftest-specslice.ts` | **New.** Anchor resolution + fallback coverage. |
| `plugins/specmanager/server/src/selftest-prompts.ts` | **New.** Invariant-survival gate (see `invariant-inventory`). |
| `plugins/specmanager/server/src/smoke-mcp.ts` | Add `get_spec_slice` to the `expected` list (L69). |
| `plugins/specmanager/server/package.json` | Register `selftest-specslice`, `selftest-prompts` (scripts block, L11–24). |
| `plugins/specmanager/hooks/stop-gate.sh` | Delete `probe_test_command` (L75–87) + its call site (L103) (Q5). |
| `plugins/specmanager/commands/specmanager-build.md` | Largest edit: R5 de-dup, R6 → tool call, step 6b deleted, step 7 alias prose shrunk. |
| `plugins/specmanager/commands/{-prd,-architecture,-design,-plan,-walkthrough,-interview}.md` | Delete the `sync_claude_md` step (R1). |
| `plugins/specmanager/agents/{architect,planner,prd-writer,walkthrough-writer}.md` | Density contract → one clause (R3). |
| `plugins/specmanager/agents/{builder,designer,architect}.md` | Skill-integration blocks → one line each (Q2). |
| `plugins/specmanager/agents/{builder,reviewer,planner}.md` | Delete prompt restatements of `core`-enforced rules (R4). |

Untouched: `ui/`, `board-server.ts`, `core/{claude-md,design-md,documents,status,dependencies,repos,pidfile}.ts`, `.mcp.json`, `hooks/hooks.json`.

---

## Baseline correction (the PRD's metric targets are measured against stale numbers)

Re-measured today with `wc -w` and an `awk`-scoped `Don't`-bullet count:

| Metric | PRD baseline | Actual | Target |
|---|---|---|---|
| `agents/` words | 7,178 | **7,402** | ≤ 6,100 (−17.6%) |
| `commands/` words | 5,838 | **6,407** | ≤ 5,450 (−15%) |
| `specmanager-build.md` words | 2,338 | **2,411** | ≤ 1,550 (−36%) |
| `Don't` bullets, 16 files | 80 | **81** | ≤ 50; build.md 19 → ≤ 10 |
| Selftests | 11 named | **12 registered** (`selftest-repos` shipped after the audit) | 14 (adding `selftest-specslice`, `selftest-prompts`) |

Targets are derived, not aspirational: R1 ≈ −100 (commands); R3 ≈ −270; Q2 ≈ −825; R4 ≈ −150; R5+R6+Q1 in build.md ≈ −900. Plan must re-measure before and after rather than trusting these.

---

## Q1 — Tier dispatch: re-map the table (option b), and delete the per-session prompt

**Decision: (b), not the audit's (c).** Keep tier dispatch. Change `DEFAULT_TIER_TO_ALIAS` to `cheap: "sonnet"`, `standard: "sonnet"`, `strong: "opus"`. Separately delete build step 6b's per-session `AskUserQuestion` (part of (d)'s motivation, none of its config surface).

**The audit's premise is contradicted by the data.** The PRD's Problem section asserts "most tasks already land on opus regardless." Measured across all 207 tasks in `.claude/specs/features/*/plan/tasks.json`:

| Complexity | Tier | Alias | Tasks | Share |
|---|---|---|---|---|
| 1 | cheap | `haiku` | 56 | 27.1% |
| 2 | standard | `sonnet` | 94 | 45.4% |
| 3 / null | strong | `opus` | 57 | 27.5% |

**72.5% of tasks route away from opus.** Tier dispatch is not mostly-inert — it is the single largest cost lever in the build pipeline. Dropping it (option c) moves 72.5% of builder dispatches to the session default, which for a maintainer running Opus 5 is opus. Weighted input cost today ≈ $3.01/MTok against $5.00/MTok all-opus — a ~66% increase on builder input spend, in a feature whose stated goal is removing cost.

**What is actually broken is one rung.** Verified against the current model roster (consulted via the bundled `claude-api` skill, roster cached 2026-06-24): Fable 5 $10/$50 · Opus 5 $5/$25 · Sonnet 5 $3/$15 (intro $2/$10 through 2026-08-31) · **Haiku 4.5 $1/$5 — there is no Haiku 5.** Two defects follow, and both are specific to `cheap → haiku`:

1. **Generation gap.** Haiku 4.5 is a full generation behind Opus 5 / Sonnet 5, and it is the *only* current alias that is.
2. **Context ceiling.** Haiku 4.5 caps at **200K context**; Opus 5, Sonnet 5, and Fable 5 all carry **1M**. A complexity-1 task in a large repo can exhaust context on `haiku` and on nothing else. This is a correctness cliff the audit did not identify, and it is a stronger argument than the generation gap.

Re-mapping `cheap → sonnet` removes both while preserving the 45.4% + 27.1% = 72.5% opus-avoidance. Sonnet 5 is current-generation, 1M context, and 3/5 of Opus 5's price (2/5 at intro pricing).

**Why the "machinery is tier-scaffolding" argument does not hold.** The audit justifies (c) by claiming R=2, N=3, and reviewer-fail escalation exist to absorb cheap-tier failures. Each is independently motivated: R=2 is a **transport** retry on `529`/Overloaded (model-agnostic — `commands/specmanager-build.md` L30 says so explicitly); N=3 is the Stop-gate's own cap and lives in `hooks/stop-gate.sh` L62, which never sees a model; the reviewer is spec compliance against an assembled slice, valuable at any tier. Only the "one R2 tier higher" clause (build L41) is tier-coupled, and under (b) it survives, simplified: `sonnet → opus`, capped at opus.

**Why step 6b goes anyway.** The per-session `AskUserQuestion` (build L23, ~150 words) interrupts **every single build** to confirm a table that only needed confirming because one rung was wrong. Fix the rung in code and the confirmation loses its purpose. `aliasForTier`'s existing `sessionTable` parameter stays in the signature at zero cost as the seam for a future override; nothing calls it. Do **not** move the table into `plugin.json` `userConfig` (option d): it would need three string fields next to `board_port`, exposing per-tier model pinning as first-class user config for a value that should almost never change.

**Consequences.** `core/tiers.ts` keeps three tiers with two distinct aliases — deliberate: it preserves the escalation ladder and makes a future Haiku 5 a one-line table edit. `selftest-tiers` is **updated, not deleted** — the PRD's success-metric row "files/lines deleted if Q1 resolves to (c)" does not apply. `builder.md`'s R2 note (L15) shrinks to one sentence; it does not disappear, because "model is parent-supplied, never self-selected" remains a real contract.

**Revisit trigger.** Option (a) (effort-tiering via three builder variants) becomes correct the moment `effort` is available as a per-invocation `Agent`/`Task` parameter. Today it is frontmatter-only, so (a) costs a triplication of `builder.md` — the most-edited agent file — which is why it is rejected now and not on principle.

---

## Q2 — Skill integration prose: compress to one line each (option a)

**Decision: (a), as recommended.** Three blocks collapse:

| File | Now | After |
|---|---|---|
| `agents/builder.md` L34–52 (Superpowers) | ~19 lines | 2 lines: detect-then-defer for TDD / systematic-debugging / two-stage review + **the de-dup boundary sentence** |
| `agents/builder.md` L54–58 (`frontend-design`) | 5 lines | 1 line, folded into the same paragraph |
| `agents/designer.md` L26–41 (`frontend-design` 3-tier) | 16 lines | 1 line + keep the **distilled built-in fallback** as a compact bullet list |
| `agents/architect.md` L25–41 (Context7 ladder) | 17 lines | 1 line: "when you hit an unfamiliar or version-sensitive library, look up real docs (Context7 MCP if present, else WebFetch); a failed/empty/rate-limited lookup is not a blocker — proceed from training knowledge and note the library+version consulted." |

Two things must **not** be lost, and both are registered in `invariant-inventory`:

- **INV-3, the de-dup boundary** (`builder.md` L38 + L50): Superpowers' two-stage review is in-build discipline; the R3 reviewer is a separate pre-advance gate after the Stop-gate passes. Compressed to one sentence, not zero.
- **The designer's distilled fallback** (`designer.md` L34–38): 4–6 named colors traced to DESIGN.md, 2+ type roles, one layout concept, one signature element, genericness critique. This is the only design method the designer has when `frontend-design` is absent — deleting it is a capability regression, not a trim. Compress the framing, keep the five bullets.

The Context7 block loses the most: raw `curl` REST endpoints, `libraryId` path syntax, Bearer-token instructions, and 429 handling are all reconstructible by the model and are the clearest example of prose written for a weaker subagent. Keep only the graceful-degradation clause (a lookup never blocks the draft) and the grounded-use clause (note library + version), both of which are behavioural contracts rather than mechanics.

**Do not add a Context7 entry to `.mcp.json`** — that constraint (architect.md L39) survives as-is; it is a repo policy, not lookup mechanics.

---

## Q3 — Command shape: keep 5, shrink each (option a)

**Decision: (a), as recommended — and the audit's own sizing overstates the case.**

The claimed "~1,900 words for one shape, five times" is the **total** of all five drafting commands (measured: 1,969 = architecture 226 + plan 459 + prd 334 + design 473 + walkthrough 477), not the duplicated portion. The genuinely shared preamble — resolve feature → `check_gate` → confirm no draft → look up upstream ids → dispatch → sync → report — is ~90–120 words per file, ~500 total, and **R1 already deletes the sync step from all five.** The collapse-to-one-command proposal (b) therefore buys at most ~400 words.

Against that it costs three things:

1. **Five `description:` + `argument-hint:` frontmatter pairs** — the entire slash-menu discovery surface. `/specmanager-draft <stage>` reduces six discoverable entry points to one with a positional argument the menu cannot describe.
2. **The managed CLAUDE.md block** lists all commands by name (`core/claude-md.ts` renders it); README and docs reference them individually.
3. **Three genuinely per-stage, human-in-the-loop steps**, verified by reading them:
   - `specmanager-prd.md` **step 2** (not step 3, as the audit says — drift since the audit) asks the user what to do about an existing non-interview PRD, and carries the `kind: "interview"` exclusion.
   - `specmanager-design.md` **step 5** harvests attachment paths from prior conversation context and carries the thin-DESIGN.md optional-reference invitation.
   - `specmanager-walkthrough.md` **step 3** short-circuits single-phase `final` *before* touching the gate, explicitly to avoid burning a gate round-trip and a subagent Task.

**Option (d) is also rejected.** A `prepare_stage_draft({featureId, stage})` tool can return only the mechanical half (resolved feature, gate result, upstream doc ids); the branchy half above stays in the command. Result: two places to look instead of one, for ~40 words saved per file. Net negative against the repo's "logic lives in core" invariant, which is about *deterministic enforcement* (gates, staleness, slicing), not about relocating conversation.

**What (a) actually does:** compress each command's steps 1–3 to a single line apiece (`Resolve the feature → check_gate → refuse on an existing draft`), delete the `sync_claude_md` step (R1), and trim the `Don't` lists to rules not enforced elsewhere. Target ~40% off `-design` and `-walkthrough`, less off `-architecture` (already 226 words).

---

## Q4 — Reviewer consolidation: record a constraint, do not refactor (option a, deferred)

**Decision: (a) as the target shape, recorded here as a binding constraint on two PRD-stage features — no code change in this feature.**

`agents/reviewer.md` ships today. `feat-security-review-stage` (PRD approved) and `feat-post-phase-design-conformance-check` (PRD draft) are both pre-Architecture. Refactoring a shipped agent to accommodate them would pre-empt the lifecycle this repo enforces on itself (`checkGate`; CLAUDE.md: "don't start a feature's tasks until its Plan is approved") and would land a `dimension` parameter with exactly one live value — speculative generality dressed as consolidation.

**Option (d) is rejected for the PRD's stated reason, which the code confirms:** `/security-review` and `/code-review` review a working diff and return prose. `commands/specmanager-build.md` L39–41 branches on a structured `{ verdict: "pass" | "fail", reasons: string[] }` against a *parent-assembled slice* — a contract the built-in skills do not offer.

### reviewer-shape-constraint

The constraint the two queued features must honour at their own Architecture stage:

- **One agent file, one `dimension` parameter.** New review dimensions extend `agents/reviewer.md` with a `dimension` input (`spec` | `security` | `design-conformance`), not a new agent file.
- **The return contract is fixed:** `{ verdict, reasons }`. A new dimension may add fields; it may not change `verdict`'s type or drop `reasons`.
- **The parent assembles the slice; the reviewer never reads the whole Architecture doc.** For `spec` the slice comes from `get_spec_slice` (see `core-spec-slice`); other dimensions define their own assembler in `core`, not in prose.
- **Read-only is enforced by `tools:` frontmatter, not by prose.** Any dimension that needs to write is not a reviewer.
- **The parent alone advances the card.** The reviewer returns a verdict and nothing else.

This section is the deliverable. It is addressable as `reviewer-shape-constraint` from those features' `meta.architectureRefs`.

---

## Q5 — Stop-gate probe branch: delete rung 3, keep rung 2

**Decision: delete `probe_test_command` (`hooks/stop-gate.sh` L75–87) and its call site (L103). Keep the `**Exit test:**` fallback (L100–102).** This is a partial dissent from the "keep as legacy back-compat" framing — back-compat is genuinely needed, and it is rung 2 that provides it, not rung 3.

**Evidence gathered rather than assumed.** Across the 16 features with a `plan/tasks.json`:

- **12 of 16 have no `meta.phases` at all** — so `readTasksMeta` returns `{}`, `phaseMeta` is `undefined`, and `testCommand` is `null` (`core/active-card.ts` L79–80). The absent-`testCommand` path is live, not dead. R7's "near-dead" is wrong on this point.
- **All 12 of those plans carry `**Exit test:**` lines** (12/12 phases covered; `redesign` 4/5). ~10 of 12 contain `npm `, so rung 2 resolves them to a real, phase-scoped command. Rung 3 is the fallback of a fallback.
- **Rung 3 has zero test coverage.** All five `selftest-stopgate.ts` scenarios (L70, L92, L108, L136) call `setPhaseMeta` with an explicit `testCommand`; the probe branch is never exercised.

**Why deleting rung 3 is safer than keeping it.** It is the only rung that is not phase-scoped: `npm test` / `uv run pytest` / `cargo test` at the project root has no relationship to the active phase. In an end-user project with any pre-existing red test, it converts every Stop into `exit 2`, burns the N=3 budget, and surfaces the phase as `blocked` for reasons the builder cannot fix — an **invented failure**, which the hook's own header forbids three times (L7, L21, L99). In this repo it is already inert (no root `package.json`), so its only reachable behaviour is the harmful one.

**Falling through is not disarming the gate.** With rung 3 gone, an unresolvable phase yields `RUN_CMD=""` → the test leg is skipped, and the open-tasks leg (L124–126) still gates. That is precisely the `testCommand: "none"` semantics the design already blesses (L92–94).

**Lock the decision with tests.** Add two `selftest-stopgate` cases: (a) no `meta.phases`, plan `**Exit test:**` contains `npm ` → rung 2 runs it; (b) no `meta.phases`, prose-only exit test → no command runs, criteria-only, and a phase with all tasks done exits 0. `planner.md` self-check step 5 (L64) and the `set_phase_meta` mandate (L99) are unchanged — they remain the reason new plans never reach the fallback at all.

---

## R1 — Delete the redundant `sync_claude_md` step from six commands

`mcp.ts:554` `startClaudeMdAutoSync` subscribes to `feature.created`, `document.created`, `document.updated`, `status.changed`, `stale.flagged`, `stale.cleared` on a 150 ms debounce, in the same process that serves the MCP tools. Every drafting subagent's own `create_document` already fires `document.created`. Confirmed by grep, the explicit step exists in exactly six files:

`specmanager-prd.md:32` · `-architecture.md:19` · `-design.md:23` · `-plan.md:22` · `-walkthrough.md:27` · `-interview.md:44`

Delete all six; renumber the following steps.

**Do not touch `specmanager-build.md`'s sync question** (L50–64). That `AskUserQuestion` is user-facing contract, not a redundant round-trip: `sync_design_md({mode:"refresh"})` auto-fires only on `feature.shipped` (`startDesignMdAutoSync`), and `/init` is a native slash command with no event at all. The `sync_claude_md` entry inside that table is idempotent and part of a three-option copy block whose **Wait** branch must be printed verbatim (INV-12). Leave it.

---

## R2 — Unpin the reviewer's model at one of its two sites

`agents/reviewer.md` frontmatter carries `model: opus` (L4) **and** `commands/specmanager-build.md` L38 passes `model: "opus"` at dispatch. Keep the frontmatter (it is the agent's own default and survives any parent); delete the dispatch-site override and the sentence justifying it. Under Q1 the strong tier is already `opus`, so the reviewer's model is unchanged in practice.

---

## R3 — Density contract stated once, not four times

The ~90-word blockquote is verbatim in `architect.md:65`, `planner.md:56`, `prd-writer.md:24`, `walkthrough-writer.md:77`. Most of it — "no throat-clearing, no transitions, prefer tables" — is default Opus 5 behaviour and is deleted. The **lossless-carryover clause is load-bearing** and stays, one sentence per file:

> Every fact, number, constraint, decision, and open question from your inputs must survive into your output — merging duplicates is condensing; dropping information is a defect.

Four sites × ~90 words → four sites × ~25 words. It stays replicated across the four agents because there is no shared include mechanism for agent frontmatter files; the reduction is in length, not in site count. Registered as INV-13.

---

## R4 — Delete prompt restatements of rules `core` already enforces

| Site | Restated rule | Enforcement point |
|---|---|---|
| `builder.md` L32 + L67 + Don't-bullet L71 | no `done` without artifacts | server rejects with `missingArtifact` — and L32 already says so |
| `builder.md` L67 | `splitRequired` | server rejects `complexity ≥ 5` |
| `reviewer.md` L40–43 (4 Don'ts) | no writes, no task-state changes | `tools: Read, Glob, Grep, Bash` frontmatter makes it impossible |
| `planner.md` L24 + L105 | `complexity ≥ 5` forbidden | `createTask` rejects with `splitRequired` |

Delete the duplicate statements; keep **one** statement of each where it is actionable guidance rather than a gate restatement (e.g. `builder.md` L32's "you must record real artifacts" stays; L67 and L71 go). `reviewer.md`'s four Don'ts collapse to one line that is *not* about writes: **"You return a verdict; the parent alone advances the card."** That is a contract, not a capability the frontmatter already removed.

This directly serves the repo invariant "gate enforcement lives in `core`, not in prompts."

---

## R5 — `specmanager-build.md`: state each rule once

Measured duplication in the 2,411-word file:

| Rule | Sites today | After |
|---|---|---|
| `clear_active_build` pairing / mid-phase must-not-clear | L20 (4c), L44, L48, L67, L80 (Don't), L91 (Don't) — 6 | 1 statement at step 4c + 1 Don't bullet |
| "don't infer phase-done from the builder returning" | L42, L79 (Don't) | 1 (step 8 — it is the branch itself) |
| single-phase never gets `final` | L49, L68, L81 (Don't) | 1 (step 8.3) |
| per-task default vs `--bulk` | L12, L16, L26, L28, L83 (Don't) | 1 (step 7 header) + argument-hint |
| R=2 vs N=3 non-composition | L30, **L32 (whole "Retry-budget boundary" paragraph)**, L85 (Don't) | 1 clause inside step 7's retry paragraph |
| aliases-not-dated-ids / unknown-alias-omit | L23, L26, L86, L87 | folded into step 7 (1 sentence) |

The "Retry-budget boundary" paragraph (L32) exists solely to stop a weaker model conflating two caps that are already described one paragraph apart. Delete it entirely; keep a parenthetical in step 7: *"R=2 is a pre-completion transport retry; the Stop-gate's N=3 is a post-stop cap. They do not nest."*

`Don't` list: 19 bullets → ≤10, keeping only rules with no other statement site (plan-approved check, no two phases back-to-back, no approvals, builder owns task state, never leave a half-synced state, reviewer read-only, one active-build clear rule, no `final` for single-phase).

---

## R6 — Spec-slice assembly moves to `core`

Build step 7b currently instructs the model to (1) locate `## Phase <name> — …`, (2) slice to the next `## Phase` or `---`, (3) pull task titles/notes from `list_tasks`, (4) read `meta.architectureRefs` via `resolve_active_card` or raw `tasks.json`, (5) resolve each anchor by leading id-token *or* kebab-slug, (6) slice to the next same-level heading, (7) fall back to name matching. Seven deterministic steps re-derived on every build, in a file the model reads once per phase.

This is the same argument as `checkGate` and staleness: deterministic, testable, and wrong-if-improvised. It becomes `get_spec_slice({ featureId, phase })`. Step 7b shrinks to: *call `get_spec_slice`, pass the returned slice plus the phase's changed files/commit shas to the reviewer.*

Full design in `core-spec-slice`.

---

## R7 — Stop-gate probe branch

Resolved in `Q5`. No separate work item.

---

## core-spec-slice

New module `plugins/specmanager/server/src/core/spec-slice.ts`, exported from `core/index.ts`, surfaced as the `get_spec_slice` MCP tool.

### Return shape

```ts
export interface SpecSliceTask {
  id: string;
  title: string;
  notes: string | null;
  complexity: number | null;
}

export interface SpecSliceSection {
  /** The ref as written in meta.architectureRefs (or the matched heading token on fallback). */
  ref: string;
  /** The heading line, verbatim, without the leading #s. */
  heading: string;
  /** Heading through to the next same-or-shallower heading, exclusive. */
  body: string;
}

export interface SpecSlice {
  featureId: string;
  phase: string;
  /** plan.md's `## Phase <name>` section, or null when the plan doc or heading is missing. */
  planSection: string | null;
  tasks: SpecSliceTask[];
  architecture: SpecSliceSection[];
  /** Refs named in meta.architectureRefs that matched no heading. Never throws. */
  unresolvedRefs: string[];
  /** True when architecture[] was assembled by name-matching rather than explicit refs. */
  fallbackUsed: boolean;
}

export async function getSpecSlice(
  featureId: string,
  phase: string,
  root?: string
): Promise<SpecSlice | null>;
```

Returns `null` for an unknown phase — mirroring `getPhaseCompletion`, so the build command's existing "phase-not-found, report and stop" branch is reused unchanged.

### Anchor resolution rules (exact)

1. Read the Architecture doc via `listDocuments({ featureId, stage: "architecture" })[0]`; read its `filePath` from disk. No doc ⇒ `architecture: []`, `unresolvedRefs` = the full ref list, no throw.
2. Index every heading matching `/^(#{2,6})\s+(.+)$/m`, recording level, raw text, byte offset.
3. For each heading compute two keys:
   - **id-token** — the first whitespace-delimited token of the heading text, with trailing punctuation (`—`, `-`, `:`, `.`) stripped. `## R1 — Delete the redundant …` ⇒ `R1`.
   - **kebab-slug** — heading text lowercased, every run of non-alphanumerics replaced by `-`, leading/trailing `-` trimmed. `## Core active-card resolver` ⇒ `core-active-card-resolver`.
4. A ref matches a heading when it equals either key, compared **case-insensitively**. Id-token is tried first, then kebab-slug.
5. **First match wins.** Two headings sharing an anchor is an authoring defect the architect prompt already forbids ("do not reuse an anchor for two sections"); `core` does not arbitrate — it takes the first and does not report the collision.
6. **Slice** from the matched heading line through to the next heading whose level is **≤** the matched level, exclusive; or EOF. A `## R1` section therefore stops at the next `##` or `#`, and swallows its own `###` children.
7. Unmatched refs go to `unresolvedRefs`. Never throw, never guess.

### Fallback behaviour

Triggered when `meta.phases[phase].architectureRefs` is empty/absent, **or** when every listed ref is unresolved. Match headings whose id-token or kebab-slug equals the phase name (case-insensitive), then headings whose kebab-slug contains the phase name as a whole segment. Set `fallbackUsed: true`. Zero matches ⇒ `architecture: []`, `fallbackUsed: true` — the reviewer then works from the plan section + tasks alone, which is a degraded but valid slice. Never an error.

### Shared `## Phase` matcher

`core/active-card.ts` L33 already owns `/^##\s+Phase\s+([^\s—-]+)/i`. Move it to `spec-slice.ts` as an exported `matchPhaseHeading(line: string): string | null` and have `active-card.ts` import it. One parser for the planner's load-bearing heading shape, in one file. `selftest-stopgate` covers `active-card.ts`'s use of it and must stay green.

Plan-section slicing: from the matched `## Phase <name>` line to the next `^##\s` heading **or** a line that is exactly `---`, whichever comes first. Phase name compared case-insensitively, tolerating the `— <theme>` suffix.

### MCP registration

Follow `get_phase_completion` (`mcp.ts` L389–396) exactly:

```ts
server.registerTool(
  "get_spec_slice",
  {
    description:
      "Assemble the spec-compliance reviewer's slice for one phase: the phase's plan.md section, its task titles/notes, and the Architecture sections named in meta.architectureRefs (resolved by leading id-token or kebab-slug; name-matching fallback when refs are absent). Returns { planSection, tasks, architecture, unresolvedRefs, fallbackUsed }, or null for an unknown phase. Called by /specmanager-build before dispatching the reviewer.",
    inputSchema: z.object({ featureId: z.string(), phase: z.string() }),
  },
  async ({ featureId, phase }) => ok(await getSpecSlice(featureId, phase, PROJECT_DIR))
);
```

Add `"get_spec_slice"` to `smoke-mcp.ts`'s `expected` array (L69) — the check at L88 is a subset test, so omission would silently leave the new tool uncovered.

### Selftest

`selftest-specslice.ts`, registered as `npm run selftest-specslice`, against a tmp dir in the style of `selftest-stopgate.ts`. Required cases:

1. Explicit `R1`-style id-token ref resolves; body stops at the next `##`.
2. Kebab-slug ref (`core-active-card-resolver`) resolves.
3. A `##` section containing `###` children returns the children in `body`.
4. Case-insensitive match on both key kinds.
5. Unknown ref → lands in `unresolvedRefs`, other refs still resolve, no throw.
6. Empty `architectureRefs` → `fallbackUsed: true`, name-match hit.
7. Empty refs, no name match → `architecture: []`, `fallbackUsed: true`, no throw.
8. Missing Architecture doc → `architecture: []`, no throw.
9. Unknown phase → `null`.
10. `planSection` slices at `---` and at the next `## Phase`.
11. Legacy plan with no `meta.phases` → `tasks` populated, refs empty, fallback path.

---

## invariant-inventory

The PRD names over-trimming as the primary risk and asks for per-rule verification rather than bulk deletion. The mechanism is a **new selftest** that makes losing an invariant a red test rather than a missed review comment.

### `selftest-prompts.ts`

A hand-rolled script in the repo's existing style (no test runner), registered as `npm run selftest-prompts`. It holds a const table and asserts against the shipped prompt files:

```ts
interface PromptInvariant {
  id: string;                 // "INV-1"
  what: string;               // human-readable statement
  pattern: RegExp;            // matched against file text
  files: string[];            // repo-relative prompt paths
  min: number;                // must survive at least this many times (usually 1)
  max: number;                // de-dup ceiling — exceeded means the trim didn't land
}
```

For each entry it counts matches across `files` and fails when the total is `< min` or `> max`. `min` catches over-trimming; `max` catches the de-dup work not being done. Both directions are the point — a one-sided check would let the trim pass by deleting nothing.

### Sequencing (this is what makes it a safety mechanism, not a test)

1. **Phase 0, before any prompt edit:** write `selftest-prompts.ts` with `min: 1` and `max` set to the *current measured count*. Run it. **It must pass green against unmodified prompts.** An invariant that cannot be expressed as a pattern matching today's files is one the author does not actually understand — surface it before editing, not after.
2. **Trim.** Each edit lowers a `max`; nothing lowers a `min`.
3. **Re-run.** A dropped invariant fails on `min`. An untrimmed duplicate fails on `max`.

### The inventory (measured counts, to be re-verified in Phase 0)

| id | Invariant | Sites now | `max` after |
|---|---|---|---|
| INV-1 | Single-phase features never produce a `final` walkthrough | 9 — `walkthrough-writer.md` desc/L11/L42/L86, `specmanager-build.md` L49/L68/L81, `builder.md` L82, `specmanager-walkthrough.md` L16/L34 | 4 (one per file) |
| INV-2 | `clear_active_build` must **not** fire on a mid-phase stop | 6 in `specmanager-build.md` | 2 |
| INV-3 | Superpowers = in-build discipline; R3 reviewer = pre-advance gate; they do not collide | 2 — `builder.md` L38, L50 | 1 |
| INV-4 | Per-task dispatch is the default; `--bulk` is explicit opt-in | 5 in `specmanager-build.md` | 2 |
| INV-5 | Never infer phase-done from the builder returning — always `get_phase_completion` | 2 | 1 |
| INV-6 | Route on aliases, never dated model ids | 5 across `tiers.ts`, `specmanager-build.md`, `builder.md` | 3 |
| INV-7 | Unknown/unavailable alias ⇒ omit `model:`, never error | 3 | 2 |
| INV-8 | The reviewer returns a verdict; the parent alone advances the card | 5 | 2 |
| INV-9 | R=2 (transport) and N=3 (Stop-gate) never compose | 3 | 1 |
| INV-10 | Every phase gets a non-empty `testCommand` (real command or literal `"none"`) | 2 in `planner.md` | 2 |
| INV-11 | `dependsOn` / `basedOn` are never omitted — staleness depends on them | 4 agents | 4 |
| INV-12 | The **Wait**-branch sync block is printed verbatim, unparaphrased | 2 in `specmanager-build.md` | 2 |
| INV-13 | Lossless carryover: dropping an input fact is a defect (R3 remnant) | 4 agents | 4 |
| INV-14 | The designer's distilled fallback method survives when `frontend-design` is absent | 1 block, `designer.md` L34–38 | 1 |

INV-6, INV-7, INV-10, INV-11, and INV-13 have `min == max`: they are already stated once per legitimate site and the trim must not change their count.

**Scope limit.** `selftest-prompts` is a *regression* gate on a known list, not a proof of semantic equivalence. It cannot catch an invariant nobody enumerated. The Plan should therefore treat Phase 0's enumeration pass as the real deliverable and the script as its encoding.

---

## Naming: `Task` → `Agent`

**Decision: not a standalone scope item — but bundle the four `specmanager-build.md` occurrences into the R5 rewrite.**

`Task` was renamed `Agent` in Claude Code v2.1.63 and remains aliased, so this is cosmetic and carries zero behavioural risk. Measured surface: 7 `Task(` call-sites (`specmanager-build.md` ×4, `builder.md` ×1, `specmanager-plan.md` ×1, `specmanager-walkthrough.md` ×1) plus "Use the `Task` tool" prose in `-prd.md`, `-architecture.md`, `-design.md`.

Rationale for the split: `specmanager-build.md` is being rewritten line-by-line under R5 anyway, so renaming its four occurrences is marginal-cost-zero. The other six files are otherwise receiving small, reviewable edits, and a rename interleaved with a trim makes the trim's diff harder to audit — which is exactly the risk the PRD names. Leave them; queue a separate one-line-per-file cosmetic pass. Saves no tokens either way.

---

## Data model changes

**None persisted.** No frontmatter fields, no `manifest.json` schema change, no `tasks.json` schema change. `PhaseMetaSchema` (`core/types.ts` L103–107: `testCommand: z.string()`, `architectureRefs: z.array(z.string()).default([])`) is read by `get_spec_slice` and unchanged.

New in-memory types only: `SpecSlice`, `SpecSliceTask`, `SpecSliceSection` in `core/spec-slice.ts`.

**Migration: none.** `get_spec_slice` degrades on legacy data by design — the 12 features with no `meta.phases` resolve to `architectureRefs: []` and take the fallback path (covered by selftest case 11). No backfill, no rebuild, and deleting `manifest.json` remains lossless.

**Behavioural change to `core/tiers.ts` defaults** is not a data change (the table is a const, selected per-session, never persisted) but is user-visible: complexity-1 tasks dispatch at `sonnet` instead of `haiku` from the next build onward. No in-flight build is affected — the alias is resolved at dispatch.

---

## Interfaces

New (`core/spec-slice.ts`, `"type": "module"`, Node 20+, TS strict):

```ts
export function matchPhaseHeading(line: string): string | null;
export function kebabSlug(headingText: string): string;
export function idToken(headingText: string): string;
export async function getSpecSlice(featureId: string, phase: string, root?: string): Promise<SpecSlice | null>;
```

Changed (`core/tiers.ts`) — signatures untouched, one const value changes:

```ts
export const DEFAULT_TIER_TO_ALIAS: Record<Tier, Alias> = {
  cheap: "sonnet",     // was "haiku" — no Haiku 5; Haiku 4.5 is 200K ctx, a generation behind
  standard: "sonnet",
  strong: "opus",
};
```

New MCP tool: `get_spec_slice({ featureId: string, phase: string })` → `{ ok: true, data: SpecSlice | null }`.

No REST/board-server endpoint. No websocket event. `get_spec_slice` is a pure read — it emits nothing on the `events` bus, so `startClaudeMdAutoSync` and `startDesignMdAutoSync` are unaffected.

Removed: `probe_test_command()` (bash, `hooks/stop-gate.sh`).

---

## Sequence / flow

`/specmanager-build <feature> next` after the trim:

1. Parse args → resolve feature → `check_gate({stage:"plan"})` → resolve phase → `set_active_build`.
2. Order check; idempotency check. **(step 6b is gone — no `AskUserQuestion`, no session tier table.)**
3. Per task, in `dependsOn` order: `list_tasks` → `aliasForComplexity(complexity)` → `Agent({ subagent_type: "builder", model: <alias>, … })`, wrapped in the R=2 transport retry. Complexity 1 and 2 now both resolve to `sonnet`; 3/null to `opus`.
4. Builder marks `done` with artifacts → Stop hook fires → `resolve-active-card.js` → `resolveActiveCard` (marker-first) → `testCommand` present ⇒ run it; `"none"` ⇒ criteria only; **absent ⇒ `**Exit test:**` line if runnable, else criteria only** (rung 3 deleted).
5. Gate passes (exit 0). Parent calls **`get_spec_slice({ featureId, phase })`** — one tool call replacing seven prose-derived steps.
6. Parent dispatches `Agent({ subagent_type: "reviewer", prompt: <slice + changed files/shas> })`. No `model:` override — `reviewer.md` frontmatter supplies `opus`.
7. `pass` → step 8. `fail` → re-dispatch the fix one tier higher (`sonnet → opus`, capped), sharing the N=3 budget; persistent fail ⇒ `clear_active_build()`, phase `blocked`, stop.
8. `get_phase_completion` (unconditional, return or error) → `complete === true` ⇒ `clear_active_build()` → auto-walkthrough if `needsWalkthrough` (terminal when `isSinglePhase`) → the three-option sync `AskUserQuestion`. `complete === false` ⇒ marker stays set, report partial state.

Unchanged from today: every gate, every marker transition, every walkthrough semantic. The only flow deltas are the removed `AskUserQuestion` at step 2 and the tool call at step 5.

**Build/ship flow for the code change:** edit `core/` + `mcp.ts` → `cd plugins/specmanager/server && npm run build` (tsc → `dist/`) → run the selftest set → **commit `dist/` with the source**. The plugin ships compiled output; a source-only commit ships nothing. Any phase touching `core/` or `mcp.ts` must therefore set `meta.phases[*].testCommand` to a string beginning `cd plugins/specmanager/server && npm run build && …`, matching the shape used by `feat-multi-repo-nested-docs` and `feat-multi-session-boards`.

---

## Failure & edge cases

| Case | Handling |
|---|---|
| Architecture doc absent when `get_spec_slice` is called | `architecture: []`, all refs in `unresolvedRefs`, no throw. Reviewer works from plan + tasks. |
| `architectureRefs` names a heading that was renamed since planning | Ref lands in `unresolvedRefs`; other refs still resolve. Parent surfaces unresolved refs in its report so the drift is visible rather than silent. |
| Two headings share an anchor | First wins, silently. Prevented upstream by `architect.md`'s "do not reuse an anchor" rule; `core` does not arbitrate. |
| Legacy feature, no `meta.phases` | `architectureRefs` empty ⇒ fallback name-match ⇒ possibly `[]`. Degraded slice, never an error. |
| `plan.md` missing or heading renamed | `planSection: null`. Reviewer still gets tasks + architecture. |
| Phase name not in `tasks.json` | `getSpecSlice` returns `null`; build command reuses its existing phase-not-found branch. |
| Stop-gate: no `testCommand`, prose-only exit test | No command runs; open-tasks leg still gates. Matches `"none"` semantics. **Regression risk if someone reads this as "the gate stopped working"** — covered by the new selftest case. |
| Stop-gate: legacy phase whose exit test contains `npm ` but the command no longer exists | Command exits non-zero → exit 2 → N=3 → `blocked`. Same as today; unchanged by this feature. |
| `sonnet` alias unavailable in a session | `aliasForTier` returns the table value; the build command omits `model:` on unknown/unavailable aliases and inherits the session default. Never errors (INV-7). |
| Over-trim drops an invariant | `selftest-prompts` fails on `min`. |
| Trim not actually performed | `selftest-prompts` fails on `max`. |
| `dist/` not rebuilt before commit | `smoke-mcp` fails to find `get_spec_slice`; `selftest-specslice` fails on the missing module. Both are in the phase `testCommand`. |
| Prompt edit breaks a command's YAML frontmatter | `claude plugin validate plugins/specmanager` catches it — include it in the prompt-editing phase's `testCommand`. |

---

## Conventions used

- **Logic in `core`, not prompts** — the load-bearing invariant this feature exists to serve (`get_spec_slice`, R4 deletions).
- **`core/` module + `core/index.ts` re-export**, imported by both `mcp.ts` and `board-server.ts` paths; no logic duplicated in an entry point.
- **Hand-rolled selftests, not a test runner** — `node dist/selftest-*.js`, one `assert(cond, msg)` helper, `console.log("ok — …")` per assertion, registered as an `npm run selftest-*` script.
- **TypeScript strict, `"type": "module"`, `.js` extensions on relative imports**, Node 20+ (`server/package.json`, `tsconfig.json`).
- **Compiled `dist/` is committed** — `npm run build` before commit, always.
- **Root resolved from env** — `SPECMANAGER_PROJECT_DIR ?? CLAUDE_PROJECT_DIR ?? cwd`; `getSpecSlice(…, root = projectRoot())` follows `getPhaseCompletion`.
- **Never invent a failure** (`stop-gate.sh` header) — the stated reason for deleting rung 3.
- **Frontmatter authoritative, `manifest.json` a rebuildable cache** — nothing here writes to the manifest.
- **Route on aliases, never dated model ids** — `sonnet`/`opus`, never `claude-sonnet-5`.
- **Zod input schemas on every MCP tool**, `ok(...)` / `fail(...)` envelopes.
- **Section-anchor convention** — this document's own `## R1 —` / `## core-spec-slice` headings are addressable from `meta.architectureRefs`.

---

## Open questions / risks

1. **Q1 dissent, needs the user's call.** The audit recommended dropping tier dispatch (c); this design keeps it and re-maps the table (b), because measured task complexity shows **72.5% of tasks route away from opus** — contradicting the PRD's "most tasks already land on opus regardless." If the user prefers (c) for maintenance simplicity over cost, the change is mechanical (delete `core/tiers.ts`, `selftest-tiers`, its npm script, build steps 6b/7 alias resolution, `builder.md` L15) but should be an explicit accept-the-cost decision, not an inherited assumption.
2. **Q5 partial dissent.** The PRD framed the choice as delete-vs-keep-for-back-compat. Evidence shows back-compat is real (12/16 plans have no `meta.phases`) but is served by rung 2, not rung 3. Deleting rung 3 is therefore both the clean *and* the compatible option. If the user disagrees, keeping it costs 12 lines of untested bash — but the invented-failure mode (whole-suite `npm test` as a phase gate in a project with a pre-existing red test) is a real user-facing hazard.
3. **`selftest-prompts` is a regression gate, not a proof.** It cannot catch an invariant nobody enumerated in Phase 0. The 14 entries above are the ones evidence supports; the Plan's Phase 0 should re-derive the list independently and reconcile rather than copying this table.
4. **Word-count targets are derived, not measured post-hoc.** ≤6,100 agents / ≤5,450 commands / ≤1,550 build.md come from summing per-finding estimates. If Phase 0's re-measurement lands materially off, adjust the targets rather than over-cutting to hit them — the no-regression selftest set is the binding metric, per the PRD.
5. **`selftest-tiers` is updated, not deleted.** Calling this out explicitly because the PRD's metrics table lists its deletion as a success signal under Q1(c). Under (b) its presence is correct and its absence would be the regression.
6. **The PRD lists 11 selftests; 12 are registered.** `selftest-repos` shipped with `feat-multi-repo-nested-docs` after the audit. The no-regression gate is 12 today and **14** after this feature. Update `CLAUDE.md`'s build/test block accordingly.
7. **Moving `matchPhaseHeading` out of `active-card.ts` touches a load-bearing file.** `selftest-stopgate` covers it, but this is the one edit in this feature that can break the Stop-gate. Sequence it as its own task with `selftest-stopgate` in the phase `testCommand`, and do not combine it with the `get_spec_slice` task.
8. **`Task` → `Agent` is deferred except in `specmanager-build.md`.** If the user wants the full rename now, it is ~10 occurrences across 7 files with zero behavioural risk — but it inflates the diff of the exact files whose trim most needs careful review.
9. **No library-doc lookup was needed for a third-party dependency.** The one version-sensitive question — the current Claude model roster and alias set — was resolved via the bundled `claude-api` skill (roster cached 2026-06-24), not Context7. Recorded here because it is the sole external fact the Q1 decision rests on: **there is no Haiku 5**, Haiku 4.5 is 200K context at $1/$5, Sonnet 5 is 1M context at $3/$15 ($2/$10 intro through 2026-08-31), Opus 5 is 1M at $5/$25, and `fable` is a *more* capable and more expensive tier than opus ($10/$50) — so `fable` is not a candidate for any build tier and is deliberately absent from the re-mapped table.
