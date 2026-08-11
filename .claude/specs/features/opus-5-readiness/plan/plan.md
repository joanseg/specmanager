---
id: plan-opus-5-readiness-017
featureId: feat-opus-5-readiness
stage: plan
status: draft
stale: false
title: Opus 5 readiness plan
dependsOn:
  - arch-opus-5-readiness-023
basedOn:
  arch-opus-5-readiness-023: 5
generatedBy: agent
version: 1
createdAt: '2026-08-11T14:41:19.757Z'
updatedAt: '2026-08-11T14:41:19.757Z'
---
## Overview

Trim SpecManager's own prompt surface (7 agents, 9 commands) onto the current Claude Code contract, per `arch-opus-5-readiness-023`. Two code changes ship — a new `core/spec-slice.ts` + `get_spec_slice` MCP tool (R6) and a re-mapped `core/tiers.ts` table (Q1) — plus one bash deletion in `hooks/stop-gate.sh` (Q5); everything else is prose deletion in `plugins/specmanager/agents/*.md` and `plugins/specmanager/commands/*.md`, gated by two new selftests. **One phase**, because there is no point mid-build where a partial result is worth stopping to verify: the invariant net (`selftest-prompts`) is only meaningful once the trim it guards has landed, and the trim's step-7b rewrite cannot land before `get_spec_slice` exists. The sequencing that matters is *within* the phase and is enforced by `dependsOn`, not by a phase boundary — the phase is ordered in four bands: **inventory → code → trim → close-out**.

**Scale:** `1` trivial · `2` small · `3` moderate · `5` substantial · `8` large · `13`/`21` epic.

*Every task below is decomposed to ≤3 points. Several items that would have scored 5+ as written in the Architecture — the invariant inventory, `getSpecSlice`, the `specmanager-build.md` rewrite — are split into consecutive rows purely for granularity; the phase subtotal is unchanged by the splitting.*

| Phase | Theme | Points |
|---|---|---|
| readiness | Opus 5 prompt-surface trim, spec-slice extraction, tier re-map | 72 |
| **Total** | | **72** |

---

## Phase readiness — Opus 5 prompt-surface trim, spec-slice extraction, tier re-map

**Exit test:** `cd plugins/specmanager/server && npm run build && npm run selftest && npm run selftest-board && npm run selftest-phases && npm run selftest-build && npm run selftest-tiers && npm run selftest-stopgate && npm run selftest-roundtrip && npm run selftest-pidfile && npm run selftest-shutdown && npm run selftest-autoport && npm run selftest-repos && npm run smoke-mcp && npm run selftest-specslice && npm run selftest-prompts && cd ../../.. && claude plugin validate plugins/specmanager`

*All **14** selftests green (12 registered today + `selftest-specslice` + `selftest-prompts`) and the plugin manifest still valid. The 14-count is the binding no-regression metric; the PRD's list of 11 is stale — it predates `selftest-repos` and omits `selftest-autoport`.*

### Band A — invariant inventory & snippet parity (1.1–1.10)

Nothing in Band C may start before 1.10 is green. `selftest-prompts` must pass against **unmodified** prompts first: an invariant that cannot be expressed as a pattern matching today's files is one nobody actually understands, and the point is to surface that before editing, not after.

### Band B — code changes (1.11–1.19)

`core/`, `mcp.ts`, `hooks/stop-gate.sh`. Independent of Band A; must precede 1.29 (build.md step 7b calls the new tool).

### Band C — prose trim (1.20–1.30)

Each removal traced to a `core` enforcement point or a surviving single statement, never bulk deletion.

### Band D — close-out (1.31–1.34)

| # | Task | Pts | Notes |
|---|---|---|---|
| 1.1 | Re-derive the invariant inventory independently from `agents/`, `commands/`, and `core/` | 3 | Read all 16 prompt files and the `core/` enforcement points **without** consulting the Architecture's table. Output: a candidate list of load-bearing rules with file:line sites. Open question 3 — this enumeration, not the script, is the real deliverable. |
| 1.2 | Reconcile the re-derived inventory against the Architecture's INV-1…INV-15 table | 2 | Record additions, removals, and corrected site counts. Anything the Architecture lists that the re-derivation missed, and vice versa, gets an explicit verdict. Do not silently adopt the table. |
| 1.3 | Record the pre-trim baseline measurement | 1 | Verified today: agents **7,402** w · commands **6,407** w · `specmanager-build.md` **2,411** w · **81** `Don't` bullets across 16 files (19 in build.md) · **12** registered selftests. Re-run `wc -w` and the `awk`-scoped bullet count and commit the numbers. |
| 1.4 | Correct `docs/agent-snippets/design-grounding.md:7` to the `Read`-on-`filePath` form | 1 | R8. The canonical fragment currently enshrines the stale `read_document` method — the exact method `planner.md` and `builder.md` warn against ("JSON-escapes the whole body"). |
| 1.5 | Propagate the corrected fragment into `agents/architect.md:16` | 2 | Keep the architect's stage-specific framing: visual spec, approved-vs-`draft` handling, contradictions into **Open questions**, design-is-optional. **Do not touch `planner.md:29` or `builder.md:23`** — they are already correct; reconciling *toward* the canonical text would spread the defect. |
| 1.6 | Give R3's surviving lossless-carryover clause a canonical `docs/agent-snippets/` home | 2 | R8 sequencing constraint: R3 leaves a one-sentence clause replicated across 4 agent files (no include mechanism exists) — a second drift surface. A canonical home puts it under INV-15 at no extra cost. Must exist before 1.22. |
| 1.7 | Write the `selftest-prompts.ts` harness | 2 | `PromptInvariant { id, what, pattern, files, min, max }`; count matches across `files`; fail on `< min` (over-trim) or `> max` (de-dup not done). Repo style: hand-rolled, `assert(cond, msg)`, `console.log("ok — …")`. Both directions are the point — a one-sided check passes by deleting nothing. |
| 1.8 | Encode the reconciled invariant table with `max` at today's measured counts | 3 | ~15 entries. `min: 1` throughout; `max` = the count measured in 1.3/1.2, not the Architecture's estimate. INV-6, INV-7, INV-10, INV-11, INV-13 have `min == max` — already stated once per legitimate site; the trim must not change their count. |
| 1.9 | Add the INV-15 snippet-parity pattern pair | 2 | Positive: `Read`-on-`filePath` with `min` = carrier count (3). Negative: `read_document` inside the design-grounding paragraph, `max: 0`. Parity is asserted on the fragment's **method**, not byte equality — each agent legitimately adapts its framing sentence. |
| 1.10 | Register `selftest-prompts` in `server/package.json`, rebuild, verify green against unmodified prompts | 2 | **Gate for Band C.** `npm run build && npm run selftest-prompts` must pass with zero prompt trimming done. |
| 1.11 | Create `core/spec-slice.ts`; move `matchPhaseHeading` out of `active-card.ts` and import it back | 3 | **Own task, by Architecture open question 7** — the single edit in this feature that can break the Stop-gate. `active-card.ts:33` owns `/^##\s+Phase\s+([^\s—-]+)/i`; export it as `matchPhaseHeading(line): string \| null` and have `exitTestForPhase` import it. Do **not** combine with 1.12–1.14. `selftest-stopgate` must stay green. |
| 1.12 | Implement `getSpecSlice` anchor resolution | 3 | Index `/^(#{2,6})\s+(.+)$/m`; two keys per heading — **id-token** (first token, trailing `—`/`-`/`:`/`.` stripped) and **kebab-slug** (lowercase, non-alnum runs → `-`, trimmed). Match case-insensitively, id-token first. First match wins, silently. Slice heading → next heading of level **≤** matched, exclusive, or EOF. Unmatched → `unresolvedRefs`. Never throw. |
| 1.13 | Implement plan-section slicing, task assembly, and the unknown-phase `null` | 2 | `planSection`: from the matched `## Phase <name>` line to the next `^##\s` **or** a line that is exactly `---`, whichever first; phase compared case-insensitively, tolerating the `— <theme>` suffix. `tasks[]` = id/title/notes/complexity. Unknown phase ⇒ `null`, mirroring `getPhaseCompletion` so the build command reuses its phase-not-found branch. |
| 1.14 | Implement the fallback path | 2 | Triggered when `meta.phases[phase].architectureRefs` is empty/absent **or** every ref is unresolved. Match headings whose id-token or kebab-slug equals the phase name, then whose slug contains it as a whole segment. `fallbackUsed: true`. Zero matches ⇒ `architecture: []` — degraded but valid, never an error. Missing Architecture doc ⇒ `architecture: []`, all refs unresolved, no throw. |
| 1.15 | Export from `core/index.ts`, register `get_spec_slice` in `mcp.ts`, add it to `smoke-mcp`'s `expected` | 2 | `export * from "./spec-slice.js";` after `phases.js`. Registration follows `get_phase_completion` (`mcp.ts` L389–396) exactly: zod input schema, `ok(...)` envelope, root from `PROJECT_DIR`. `smoke-mcp`'s check is a **subset** test — omitting the name would silently leave the tool uncovered. |
| 1.16 | Write `selftest-specslice.ts` (11 cases) and register `npm run selftest-specslice` | 3 | id-token ref · kebab-slug ref · `##` section swallowing its `###` children · case-insensitive on both key kinds · unknown ref lands in `unresolvedRefs` while others resolve · empty refs ⇒ fallback hit · empty refs, no name match ⇒ `[]` + `fallbackUsed` · missing Architecture doc · unknown phase ⇒ `null` · `planSection` slicing at `---` and at the next `## Phase` · legacy plan with no `meta.phases`. Style: tmp dir, like `selftest-stopgate.ts`. |
| 1.17 | Re-map `DEFAULT_TIER_TO_ALIAS.cheap → "sonnet"` and update `selftest-tiers` | 2 | Q1 option (b). Final table: `cheap: "sonnet"`, `standard: "sonnet"`, `strong: "opus"`. Update the `cheap → haiku` assertions at `selftest-tiers.ts` L31/L45. **`core/tiers.ts` and `selftest-tiers` are kept and updated, never deleted** — the PRD's "tier machinery removed" metric row was scoped to option (c), which was rejected. **Preserve `aliasForTier`'s `sessionTable` parameter wiring** — under (b) it is a live code path, not a dormant seam, because build step 6b still returns a table. |
| 1.18 | Delete `probe_test_command` + call site; add the two absent-`testCommand` `selftest-stopgate` cases | 3 | Q5. Remove `hooks/stop-gate.sh` L75–87 and L103; **keep** the rung-2 `**Exit test:**` fallback (L100–102) — 12 of 16 plans have no `meta.phases`, so that path is live, and 12/12 of them carry `**Exit test:**` lines. New cases: (a) no `meta.phases`, exit test contains `npm ` ⇒ rung 2 runs it; (b) prose-only exit test ⇒ no command runs, open-tasks leg still gates, all-done exits 0. Rung 3 has zero existing coverage. |
| 1.19 | Rebuild `server/dist` and commit compiled output with the source | 1 | The plugin ships compiled `dist/`; a source-only commit ships nothing. `cd plugins/specmanager/server && npm run build`. |
| 1.20 | R1: delete the `sync_claude_md` step from six commands and renumber | 2 | Verified sites: `-prd.md:32` · `-architecture.md:19` · `-design.md:23` · `-plan.md:22` · `-walkthrough.md:27` · `-interview.md:44`. `startClaudeMdAutoSync` (`mcp.ts:554`) already fires on the subagent's own `create_document`. **Do not touch `specmanager-build.md` L50–64** (user-facing three-option sync `AskUserQuestion`) or `-init.md:102` (marker prose). |
| 1.21 | R2: delete build.md's reviewer `model: "opus"` dispatch override and its justifying sentence | 1 | `specmanager-build.md` L38. Keep `agents/reviewer.md`'s frontmatter `model: opus` — it is the agent's own default and survives any parent. Under Q1 the strong tier is already `opus`, so behaviour is unchanged. |
| 1.22 | R3: reduce the density contract to the one-sentence lossless clause in four agents | 2 | ~90 w verbatim → ~25 w at `architect.md:65`, `planner.md:56`, `prd-writer.md:24`, `walkthrough-writer.md:77`. "No throat-clearing / no transitions / prefer tables" is default Opus 5 behaviour and goes. The surviving sentence — *"Every fact, number, constraint, decision, and open question from your inputs must survive into your output — merging duplicates is condensing; dropping information is a defect"* — sources from 1.6's canonical snippet. Stays at 4 sites (INV-13, `min == max == 4`). |
| 1.23 | R4: delete `core`-enforced restatements in builder/planner; collapse `reviewer.md`'s four Don'ts | 3 | `builder.md` L67 + L71 go (server rejects with `missingArtifact`); **L32's "record real artifacts" stays** — actionable guidance, not a gate restatement. `builder.md` L67's `splitRequired` note and `planner.md` L24/L105's `complexity ≥ 5` duplicate go (one survives). `reviewer.md` L40–43's four write-forbidding bullets → one line that is *not* about writes: **"You return a verdict; the parent alone advances the card."** Read-only is enforced by `tools:` frontmatter. |
| 1.24 | Q2: compress `builder.md`'s Superpowers + `frontend-design` blocks | 2 | L34–52 (~19 lines) → 2 lines of detect-then-defer for TDD / systematic-debugging / two-stage review; L54–58 (5 lines) → 1 line folded into the same paragraph. **INV-3 must survive as one sentence, not zero:** Superpowers' two-stage review is in-build discipline; the R3 reviewer is a separate pre-advance gate after the Stop-gate passes. |
| 1.25 | Q2: compress `designer.md`'s `frontend-design` 3-tier block | 2 | L26–41 (16 lines) → 1 line **plus** the distilled built-in fallback kept as a compact bullet list: 4–6 named colors traced to DESIGN.md, 2+ type roles, one layout concept, one signature element, genericness critique. That fallback is the designer's only design method when `frontend-design` is absent — deleting it is a capability regression, not a trim (INV-14). |
| 1.26 | Q2: compress `architect.md`'s Context7 ladder to one line | 2 | L25–41 (17 lines) → one sentence: unfamiliar/version-sensitive library ⇒ look up real docs (Context7 MCP if present, else WebFetch); a failed/empty/rate-limited lookup is not a blocker — proceed from training knowledge and note the library + version consulted. Drop raw `curl` endpoints, `libraryId` path syntax, Bearer-token instructions, 429 handling. **Keep the "do not add Context7 to `.mcp.json`" constraint (L39)** — repo policy, not lookup mechanics. |
| 1.27 | Q3: compress steps 1–3 of the five drafting commands and trim their `Don't` lists | 3 | Option (a) — keep 5 commands, shrink each. Steps 1–3 → one line apiece (`Resolve the feature → check_gate → refuse on an existing draft`). Target ~40% off `-design` (473 w) and `-walkthrough` (477 w), less off `-architecture` (already 226 w). **Three branchy steps stay verbatim:** `-prd.md` **step 2** (existing non-interview PRD question + the `kind: "interview"` exclusion), `-design.md` **step 5** (attachment-path harvesting + thin-DESIGN.md invitation), `-walkthrough.md` **step 3** (single-phase `final` short-circuit *before* the gate). |
| 1.28 | R5: de-duplicate build.md's six rule families; delete the Retry-budget-boundary paragraph | 3 | `clear_active_build` pairing 6 sites → 1 (step 4c) + 1 Don't · "don't infer phase-done from the builder returning" 2 → 1 (step 8) · single-phase never gets `final` 3 → 1 (step 8.3) · per-task vs `--bulk` 5 → 1 (step 7 header) + argument-hint · R=2/N=3 3 → 1 · aliases-not-dated-ids 4 → folded into step 7. L32's whole "Retry-budget boundary" paragraph goes; keep a parenthetical: *"R=2 is a pre-completion transport retry; the Stop-gate's N=3 is a post-stop cap. They do not nest."* |
| 1.29 | R5/R6/Q1: rewrite build.md steps 6b/7/7b; rename its four `Task(` to `Agent(` | 3 | **Step 7b → one tool call:** *call `get_spec_slice({ featureId, phase })`, pass the returned slice plus the phase's changed files/commit shas to the reviewer* — replacing seven prose-derived steps. **Step 6b stays** (user decision 2026-08-11, overruling an earlier draft that deleted it): only its pre-filled defaults move to `cheap → sonnet`, `standard → sonnet`, `strong → opus`; its cadence already means once per phase. Step 7's alias prose shrinks. `Task` → `Agent` here only (v2.1.63 rename, still aliased); the other 6 files stay for a separate cosmetic pass so this trim's diff stays auditable. **Do not break step 8's `get_phase_completion` branch or INV-12's verbatim Wait-branch sync block.** |
| 1.30 | R5: cut build.md's `Don't` list from 19 to ≤10 | 2 | Keep only rules with no other statement site: plan-approved check, no two phases back-to-back, no approvals, builder owns task state, never leave a half-synced state, reviewer read-only, one `clear_active_build` rule, no `final` for single-phase. |
| 1.31 | Lower each `selftest-prompts` `max` to its post-trim count; verify green | 2 | Each Band-C edit lowers a `max`; **nothing lowers a `min`.** A dropped invariant fails on `min`, an untrimmed duplicate on `max`. If a `min` fails, restore the statement — do not lower the `min`. |
| 1.32 | R9: correct `CLAUDE.md:77` and update its selftest block | 1 | Delete the "or write to an approved doc" clause — `stale: true` is assigned only at `core/status.ts:70` inside `propagateStale`, whose sole caller (`status.ts:49`) is guarded by `prev === "approved" && next === "draft"`; `writeDocument` (`documents.ts:233`) spreads `...current.frontmatter` and never touches `status`/`stale`. **Documentation fix only — no behaviour change** (PRD non-goal). Also add the four selftests the block omits (`selftest-autoport`, `selftest-repos`, `selftest-specslice`, `selftest-prompts`) → 14. |
| 1.33 | Re-measure against targets and reconcile | 2 | Targets: ≤6,100 agents (−17.6%) · ≤5,450 commands (−15%) · ≤1,700 build.md (−29%) · ≤50 `Don't` bullets, ≤10 in build.md. These are **derived by summing per-finding estimates, not measured** (R1 ≈ −100; R3 ≈ −270; Q2 ≈ −825; R4 ≈ −150; R5+R6+Q1 in build.md ≈ −750). If the result lands materially off, **adjust the target and record why — do not over-cut to hit a number.** The 14-selftest gate is the binding metric. |
| 1.34 | Rebuild `dist/`, run the full no-regression suite + `claude plugin validate` | 1 | 1.31 edits `selftest-prompts.ts`, so `dist/` needs a final rebuild. Then the phase exit test verbatim. |

---

## Risk & sequencing notes

**This feature edits the prompts and commands that drive SpecManager itself.** Three ordering consequences:

1. **`selftest-prompts` must be green against unmodified prompts before any trim (1.10 gates 1.20+).** Its value is entirely in being written *first*: written after the trim, it would encode whatever survived rather than whatever should have. Its scope limit is real — it is a regression gate on a known list, not a proof of semantic equivalence, and it cannot catch an invariant 1.1 failed to enumerate. That is why 1.1 is an independent re-derivation rather than a transcription of the Architecture's table.

2. **R8 lands before R3 (1.4–1.6 gate 1.22).** R3 leaves the density clause replicated across four agent files with no include mechanism — a second shared fragment and therefore a second drift surface of exactly the kind that produced the R8 defect. 1.6 gives it a canonical home so INV-15's parity check covers it; without that, the drift surface doubles with nothing watching it.

3. **`specmanager-build.md` is rewritten at 1.28–1.30, near the end of the phase.** `/specmanager-build` reads the command once per invocation, so the rewrite does not retroactively change the run in progress — but step 8's finalize path (`get_phase_completion` → `clear_active_build` → auto-walkthrough → the three-option sync `AskUserQuestion`) is the code that closes *this* phase, and a botched edit there strands the build. 1.29's Don'ts are explicit about not breaking it. Deferring the build.md work to the phase's tail also means no earlier task is orchestrated by a half-trimmed command.

**The one edit that can break the Stop-gate is 1.11.** `matchPhaseHeading` moving out of `active-card.ts` is isolated as its own task, ahead of and separate from `getSpecSlice`, precisely so a `selftest-stopgate` failure has one candidate cause. Do not merge it into 1.12.

**Rollback asymmetry.** Band B is cleanly revertible (new module, one const, one bash function). Band C is 16 files of deletion — reverting a single over-trim means locating it, which is the job `selftest-prompts`' `min` side does. Trim tasks should land as one commit per row so a `min` failure at 1.31 bisects to a row.

**`dist/` is committed and shipped.** Any Band B or 1.31 change without a rebuild ships nothing: `smoke-mcp` fails to find `get_spec_slice` and `selftest-specslice` fails on the missing module. Both are in the exit test, so the failure is loud — but 1.19 and 1.34 make the rebuild explicit rather than assumed.

**Blocking edges.** 1.1 → 1.2 → 1.8 → 1.10 → all of Band C. 1.4 → 1.5, 1.6 → 1.9 → 1.10. 1.11 → 1.12 → 1.13 → 1.14 → 1.15 → 1.16. 1.12–1.15 → 1.29. Band C → 1.31 → 1.34. 1.17 and 1.18 are independent of everything except the final rebuild.

**Known drift from the Architecture, flagged rather than assumed.** `CLAUDE.md`'s build/test block lists only 10 runnable scripts (`selftest-autoport` and `selftest-repos` are missing, though `selftest-repos` is named in the `core/repos.ts` bullet at L72) — so 1.32 adds four entries, not two. `smoke-mcp.ts`'s `expected` array holds 17 names and already omits several registered tools; the check is a subset test, so this is by design, and 1.15 only adds `get_spec_slice`.

## Test strategy

Hand-rolled selftests in the repo's existing style — `node dist/selftest-*.js`, one `assert(cond, msg)` helper, `console.log("ok — …")` per assertion, registered as `npm run selftest-*`. No test runner is introduced.

| When | What |
|---|---|
| Before any trim (1.7–1.10) | `selftest-prompts.ts` written and green against unmodified prompts. `min: 1`, `max` = today's measured counts. |
| Alongside the code (1.16) | `selftest-specslice.ts`, 11 required cases, tmp-dir style copied from `selftest-stopgate.ts`. |
| Alongside the code (1.17) | `selftest-tiers` assertions updated `cheap → haiku` ⇒ `cheap → sonnet`; `sessionTable` override coverage kept. |
| Alongside the code (1.18) | Two new `selftest-stopgate` cases covering the absent-`testCommand` path that rung 3 previously shadowed and that had zero coverage. |
| Continuously | `selftest-stopgate` after 1.11 — the single edit that can break the Stop-gate. |
| After the trim (1.31) | `selftest-prompts` re-run with lowered `max` values; `min` failures mean a restore, never a lowered `min`. |
| Phase exit (1.34) | All 14 selftests plus `claude plugin validate plugins/specmanager`, which catches a prompt edit that breaks a command's YAML frontmatter. |

## Out of scope

- **Any lifecycle behaviour change.** Gates, staleness computation, phases, walkthrough semantics (including single-phase features never producing a `final` walkthrough) stay exactly as they are.
- **UI / board changes.** `ui/`, `board-server.ts`, and every REST/websocket surface are untouched; `get_spec_slice` is a pure read that emits no event, so `startClaudeMdAutoSync` and `startDesignMdAutoSync` are unaffected.
- **Making a write to an approved doc demote it or cascade staleness.** R9's in-scope fix is one line of prose. The underlying behaviour question — an approved doc's content can be replaced with no re-approval and no dependent flagged — spans "demote on any agent write", "propagate without demoting", and "leave as-is and rely on `version`", differs in board behaviour rather than just `core`, and needs its own PRD. (A live instance exists in this feature's own paper trail: `arch-opus-5-readiness-023` sat at `basedOn: { prd-…-036: 1 }` while the PRD advanced to v2, `stale: false` throughout, and was re-based by hand.)
- **Refactoring `agents/reviewer.md` to take a `dimension` parameter.** Q4 resolves to option (a) as the *target shape*, recorded in the Architecture as `reviewer-shape-constraint` and binding on `feat-security-review-stage` and `feat-post-phase-design-conformance-check` at *their* Architecture stage. Refactoring a shipped agent for two PRD-stage features would land a `dimension` with exactly one live value.
- **Deleting `core/tiers.ts`, build step 6b, or `selftest-tiers`.** These were Q1 option (c)'s deletion list; (c) was rejected. Removing them would be the regression, not the goal. Likewise the PRD's "tier machinery removed" success-metric row does not apply.
- **Moving the tier table into `plugin.json` `userConfig`** (Q1 option d) — three string fields beside `board_port`, exposing per-tier model pinning as first-class user config; step 6b already provides the per-run override.
- **Effort-tiering via three builder variants** (Q1 option a). `effort` is frontmatter-only; the per-invocation parameter list supports `model`, not `effort`. Revisit if per-invocation `effort` ships.
- **Collapsing the five drafting commands into `/specmanager-draft <stage>`** (Q3 option b) or extracting a `prepare_stage_draft` tool (option d). The shared preamble is ~90–120 w per file (~500 total) and R1 already removes the sync step; (b) costs five `description:`/`argument-hint:` pairs — the whole slash-menu discovery surface — plus the managed CLAUDE.md block that names each command.
- **Redesigning `hooks/stop-gate.sh`.** Only `probe_test_command` is deleted; the zero-model-call deterministic design and the rung-2 `**Exit test:**` fallback stay.
- **The `Task` → `Agent` rename outside `specmanager-build.md`.** ~6 remaining occurrences across `builder.md`, `-plan.md`, `-walkthrough.md`, and "Use the `Task` tool" prose in `-prd.md`/`-architecture.md`/`-design.md`. Zero behavioural risk (still aliased), but interleaving a rename with a trim inflates exactly the diffs that most need careful review. Queue as a separate one-line-per-file pass.
- **`selftest-prompts` policing `CLAUDE.md`.** It asserts against `agents/` and `commands/` only; extending it to narrative prose in the repo's own guide is scope the inventory cannot carry.

## Notes on estimates

Points here are relative complexity, not hours, and they are deliberately uncalibrated until the first few rows land — this phase mixes three kinds of work with different densities (a research pass, a new `core` module, and sixteen files of careful deletion), so a 3 in Band A and a 3 in Band C are not the same shape of afternoon. Recalibrate against 1.1–1.10 before trusting the Band C numbers.

Every row is ≤3. Three items would have scored 5+ as the Architecture states them — the invariant inventory (1.1/1.2/1.7/1.8/1.9), `getSpecSlice` (1.11–1.14), and the `specmanager-build.md` rewrite (1.28–1.30) — and each was split along a seam that produces an independently reviewable diff rather than an arbitrary halving. The splits are granularity only; the 72-point subtotal is what the work costs either way.

The trim rows carry more points than their line counts suggest, because the cost is in the tracing, not the deleting: every removal has to land on a `core` enforcement point or a surviving single statement, which is what makes 1.23 a 3 and 1.21 a 1. Measurement (1.3, 1.33) and the rebuilds (1.19, 1.34) are their own rows rather than assumed steps, so "installable and testable" stays a real gate — a source-only commit ships nothing to end users, and the 14-selftest suite is the binding metric that the word-count targets defer to.
