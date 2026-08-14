---
id: wt-opus-5-readiness-022
featureId: feat-opus-5-readiness
stage: walkthrough
status: approved
stale: false
title: Opus 5 readiness — feature walkthrough
dependsOn:
  - plan-opus-5-readiness-017
  - wt-opus-5-readiness-019
  - wt-opus-5-readiness-020
  - wt-opus-5-readiness-021
basedOn:
  plan-opus-5-readiness-017: 2
  wt-opus-5-readiness-019: 1
  wt-opus-5-readiness-020: 1
  wt-opus-5-readiness-021: 1
generatedBy: agent
version: 2
phase: final
createdAt: '2026-08-14T07:18:11.045Z'
updatedAt: '2026-08-14T07:20:26.366Z'
---
# Opus 5 readiness — feature walkthrough

## 1. What shipped overall

`prd-opus-5-readiness-036` opened on a prompt surface calibrated for a weaker, non-reasoning subagent and for Opus 4.x tier economics — 16 files of procedural micro-stepping, one rule stated in up to six places, and a `cheap → haiku` tier route to a model generation behind the rest. This feature deleted **1,369 words** of that prose (`agents/` −747, `commands/` −622), moved the one genuinely deterministic algorithm in it into `core` as `get_spec_slice`, re-mapped `cheap → sonnet`, and deleted the Stop-gate's dead probe ladder — **without weakening a single enforced gate**. The binding evidence is the 14-suite no-regression chain plus `claude plugin validate`, re-run while writing this document: **exit 0, 436 `ok —` assertions**, `rm -rf dist && npm run build` a no-op against the committed `dist/`, and validation passing with only the pre-existing `version` warning.

The load-bearing design decision was sequencing: **the safety net was built and proven to bite before one word was deleted.** That is what separates this from a prose-trimming exercise, and §2 is ordered to show it.

**Scale:** 35 tasks across 3 phases (75 points), 1 reviewer-driven fix, 5 out-of-band defects fixed in 3 commits. `plan-opus-5-readiness-017` reached v2 by re-emission — it was first written as a single `readiness` phase of 34 tasks (`0ea8407`) and re-emitted as three phases (`e3c8c5d`) precisely so a red test would have one candidate cause instead of thirty-four; `task-035` was added during `inventory`.

## 2. Phase journey

### `inventory` — 11 tasks, 23 points → [`phase-inventory.md`](./phase-inventory.md) (`wt-opus-5-readiness-019`)

Bought no shipped behaviour at all. It bought the ability to delete 25 points' worth of prose without silently losing a gate. The prompt surface's load-bearing rules were **re-derived independently** from the 16 prompt files and `core/` (88 candidate `D-nn` ids) *before* the Architecture's table was consulted, then reconciled against it with a per-entry verdict — a transcription would have inherited the table's blind spots. The result is `selftest-prompts`: 37 invariants as 45 pattern rows, each with a `min` floor (over-trim) and a `max` ceiling (de-dup not done). The phase's proof obligation was the **mutation pass** — for every row, strip its matched text from an in-memory copy and assert the check goes red. Green-on-current-prompts only proves the patterns match today; it cannot distinguish a real guard from a pattern that asserts nothing. Also landed here, ahead of the trim that needed them: the R8 design-grounding correction at its canonical source, and a canonical home for R3's surviving lossless-carryover clause.

The phase's most consequential finding is about this repo, not this feature: `checkGate` has **exactly one call site**, inside the `check_gate` handler. Gates are advisory queries the prompts choose to honour — the inverse of the repo's stated "gate enforcement lives in `core`, not in prompts". `INV-16` therefore asserts the *call* in each gated command, because the call is the enforcement.

### `core` — 9 tasks + 1 fix, 21 points → [`phase-core.md`](./phase-core.md) (`wt-opus-5-readiness-020`)

The three code changes: `core/spec-slice.ts` + the `get_spec_slice` MCP tool (R6), `DEFAULT_TIER_TO_ALIAS.cheap → "sonnet"` (Q1, option **b** — not (c)'s deletion, so `core/tiers.ts` and `selftest-tiers` are kept and updated), and deletion of the Stop-gate's rung-3 `probe_test_command` ladder while keeping rung 2 (Q5). Stopping at this boundary was diagnostic: moving `matchPhaseHeading` out of `active-card.ts` is the single edit in the feature that can break the Stop-gate, isolated as its own task and verified before sixteen prompt files started changing underneath it. R6 was demonstrated rather than merely asserted — the review slice for this very phase was assembled by the function the phase built (8/8 refs resolved, no fallback).

**The reviewer failed this phase, and was right.** `task-016` implemented only half the Architecture's fallback trigger and pinned the deviation as deliberate. The rationale was false: under the spec'd behaviour a drifted anchor still lands in `unresolvedRefs` *and* `fallbackUsed: true` marks the sections as name-matched, so both signals survive and nothing was being hidden. The deviation bought conservatism, not visibility, at the price of code, Architecture and tests knowingly disagreeing. Fix `47f122a` conformed the code (`fallbackUsed = unresolvedRefs.length === refs.length`) and took the suite 53 → 58 assertions.

### `trim` — 15 tasks, 31 points → [`phase-trim.md`](./phase-trim.md) (`wt-opus-5-readiness-021`)

The deletion the net existed to make safe, across 16 prompt files plus the `specmanager-build.md` rewrite and the repo's own `CLAUDE.md`. R1's dead `sync_claude_md` step left six commands; R3's ~90-word density block became two sentences at four sites; R4's `core`-enforced restatements went; Q2 compressed three aged skill-integration blocks; Q3 shrank five drafting commands while keeping three branchy human-in-the-loop steps verbatim; R5 de-duplicated `build.md`'s six rule families and cut its `Don't` list 19 → 10; R9 corrected `CLAUDE.md`'s false staleness claim.

The rule that made the phase reversible-by-diagnosis: **`task-032` lowered 11 `max` values and touched zero `min` lines** (`git show 93e3d6c … | grep -E '^[-+].*\bmin:'` is empty). A `min` failure means restore the statement, never lower the floor.

## 3. How the three phases compose

Nothing user-facing changed — a PRD non-goal held. The composition is a chain of guarantees, each phase making the next one's failure diagnosable:

```
inventory                      core                        trim
──────────                     ────                        ────
selftest-prompts          →    get_spec_slice ships    →   build.md step 7b calls it
(45 rows, min/max,             (tool exists before          (7 prose steps → 1 call)
 mutation-proven)               the rewrite needs it)
        │                              │                          │
        └── min/max floors ────────────┴──────────────────────────┘
            guard every deletion; a red min names the over-trim
```

The single user-visible consequence is inside `/specmanager-build`: step 7b now assembles the reviewer's spec slice with **one tool call** and surfaces `unresolvedRefs` / `fallbackUsed` instead of silently handing the reviewer a thinned slice it would pass for lack of anything to check.

**The R6 payoff was correctness, not tokens.** `build.md` actually *grew 12 words* during `task-031` — the step-7b collapse saved 9 net, and step 6b's mandated re-map rationale added ~30. Banking a token loss for a correctness gain was the right trade, and it is the clearest illustration that the word-count metrics were never the binding ones.

## 4. PRD success metrics revisited

`prd-opus-5-readiness-036`'s baselines were themselves superseded: it quotes `agents/` 7,178 and `commands/` 5,838, while `task-003` pinned the real pre-trim state at a sha (`cd0ea72`) as **7,425 / 6,407 / 2,411 w / 81 bullets**. Reductions below are measured against the pinned baseline — the like-for-like comparison, per `docs/baseline-measurement.md` and `docs/post-trim-measurement.md`.

| PRD metric | Target | Result | Verdict | Evidence |
|---|---|---|---|---|
| `agents/` word count | ≤6,100 (Arch-derived) | 7,425 → **6,678** (−747, −10.1%) | **Reduction met; target missed** | `phase-trim.md` §3.1 |
| `commands/` word count | ≤5,450 | 6,407 → **5,785** (−622, −9.7%) | **Reduction met; target missed** | `phase-trim.md` §3.1 |
| `specmanager-build.md` | ≤1,700 | 2,411 → **2,025** (−386, −16.0%) | **Reduction met; target missed** | `phase-trim.md` §3.1, §3.6 |
| `Don't` bullets, 16 files | ≤50 | 81 → **62** | **Reduction met; target missed** | `phase-trim.md` §3.2 |
| `Don't` bullets, `build.md` | ≤10 | 19 → **10** | **Met exactly** | `phase-trim.md` §3.2 |
| Duplicated invariants → stated once | R1–R5 | R1 6→0 sites in drafting commands · R2 deleted · R3 4 verbatim blocks → 2 sentences ×4 · R4 collapsed · R5 six rule families de-duplicated | **Met** | `phase-trim.md` §3.2–§3.6 |
| Tier machinery removed | Q1 (c) only | **Not applicable** — Q1 resolved to (b); deleting `core/tiers.ts` would have been the regression | **N/A by decision** | `phase-core.md` §3.5 |
| **No-regression (hard gate)** | All selftests pass | **14 suites green, exit 0, 436 assertions** + `claude plugin validate` ✔ | **Met** | Re-verified while writing this doc |

**The four missed word/bullet targets are the designed outcome, not unfinished work.** The Plan's row 3.14 mandated *adjusting the target rather than over-cutting to hit a number*, and `docs/post-trim-measurement.md` ties each miss to evidence. The three word-count misses are blocked by `min == max` invariant floors — the prose is load-bearing and a further cut fires a `min`. Recommended revisions: ≤6,700 / ≤5,800 / ≤2,050. The **16-file `Don't` count is explicitly *not* floor-blocked** and is the honest one: no `INV-*` pins bullet-list format, and no trim task ever targeted the four agent files whose lists are unchanged. That is deferrable scope, not an unreachable target.

**Floors stopped over-cutting repeatedly and specifically.** `task-026` and `task-031` both halted at `min == max`; `task-028` stopped at exactly 10 `build.md` bullets, declining two numerically-eligible cuts because `checkGate` has only one statement site and the drafting agents inherit `set_status`.

### The net was built first, and it paid off

`inventory` **predicted in writing** that two invariants would go red during `trim` — `INV-29` (density contract, `min: 4`) and `INV-28` (Context7 attribution, `min: 1`) — because the Plan's survivor sentences for rows 3.3 and 3.7 didn't carry those clauses. Neither fired. `task-020` widened the survivor to two sentences; `task-024` used the exact phrasing `INV-28` pins rather than the Architecture's looser suggestion, which would not have matched. **The prediction was the instruction.** A guard that tells you what to widen before you cut is doing more than catching regressions.

**Mutation testing became the house standard.** Every assertion in this feature was proved to go red under mutation: `selftest-prompts`' 45-row mutation pass runs forever rather than being a one-off; `task-027` mutated the compiled spec-slice module 6 ways; `47f122a` met the same bar; and the reviewer, rather than trusting either report, independently probed with a degenerate `/^.*$/gm` pattern and confirmed rejection.

## 5. Known limitations & future work

None of these are owned by any task or phase in this feature.

| # | Item | Why it matters | Where documented |
|---|---|---|---|
| 1 | **The tier-consistency invariant is still missing** — nothing asserts that a prompt's stated defaults match `core/tiers.ts` | `INV-21` was deliberately made value-agnostic so it wouldn't false-fail at `task-007`'s re-map. Its absence is exactly why `builder.md`'s stale `cheap→haiku` survived all three phases. **The defect is now fixed (`6bbfa34`); the missing guard is not.** | `phase-trim.md` §5, `6bbfa34` |
| 2 | `SpecSliceTask.notes` is always `null` (`core/spec-slice.ts:198`) while `build.md` step 7b advertises "titles + notes" | `Task` in `core/types.ts` has no `notes` field. The field is kept in the envelope so its shape needn't change when `notes` lands upstream. Either give it a real source or drop it from the advertised contract. | `phase-core.md` §5, `phase-trim.md` §5 |
| 3 | Unreachable `catch` in `getSpecSlice` (Architecture doc listed but unreadable) | Already guarded by a `listDocuments` miss, so it is defensive-only and a mutation there survives. Reviewer-flagged, unowned. | `phase-core.md` §5 |
| 4 | `Task(` → `Agent(` in the remaining files | Deliberately deferred: interleaving a rename with a trim inflates exactly the diffs that most need review. `Task(...)` is still aliased — zero behavioural risk. | `phase-trim.md` §3.7 |
| 5 | `selftest-board`'s `pickPort` is randomisation, not a free-port check | The same latent issue `55d8ba8` fixed in three sibling suites. Not yet closed in the fourth. | `phase-trim.md` §0 |
| 6 | **28 carrier blind spots** in `selftest-prompts` | A summed `min` cannot express "one survivor per actor" — a rule can go silent at one file while the total still clears the floor. Reported under a standing banner, never failed, because several rows are budgeted that way deliberately. `minPerFile` is the mechanical fix. | `phase-inventory.md` §3.5 |
| 7 | Approved docs can be rewritten with no re-approval and no dependent flagged | R9's in-scope fix was one line of prose. The behaviour question spans three options, differs in board behaviour rather than just `core`, and needs its own PRD. A live instance sits in this feature's own paper trail. | `plan-opus-5-readiness-017`, Out of scope |
| 8 | `reviewer.md`'s `tools:` frontmatter grants `Bash` — a write path no regex closes | Recorded as a residual inside `INV-22`'s description. | `phase-inventory.md` §3.7 |
| 9 | A `Don't`-list reduction pass for the four untouched agent files | The only route to the ≤50 target if it is kept (see §4). | `phase-trim.md` §5 |

Also standing, from `inventory`: `selftest-prompts` is a **regression gate on a known list, not a proof of semantic equivalence** — it cannot catch an invariant the derivation failed to enumerate. That limit is structural, and is why row 1.1 was an independent re-derivation rather than a transcription.

## 6. Corrections to the record

Verified while writing this roll-up; the phase walkthroughs were accurate when written and two items have since moved.

| Claim | Correction |
|---|---|
| `phase-trim.md` §5 records `agents/builder.md:15`'s stale `cheap→haiku` as an open gap | **Closed** by `6bbfa34` (2026-08-14), out of band, after that walkthrough was written. The same one-line commit also switched its `Task(` to `Agent(`. The *missing invariant* remains open (§5 item 1). |
| `Task(` remains in three files; six occurrences total | Now **five sites across five files**: `Task(` in `commands/specmanager-walkthrough.md` and `commands/specmanager-plan.md`; "`Task` tool" prose in `-prd.md`, `-design.md`, `-architecture.md`. `builder.md` was closed by `6bbfa34`. |
| 30 carrier blind spots | **28** post-trim. 30 was the `inventory`-phase figure; the trim changed per-file match counts, so the summed-floor arithmetic moved. Re-run `npm run selftest-prompts` and read the banner. |
| Five out-of-band defect fixes | Five *defects* in **three** commits: `b97f50c` (`selftest-board`'s `pidFilePath` keyed on the wrong root), `55d8ba8` (three suites — `selftest-autoport`, `-roundtrip`, `-shutdown` — made self-sufficient under concurrent boards), `6bbfa34` (`builder.md`'s stale default). Separate from `47f122a`, the reviewer-driven fix. |

The out-of-band fixes were not incidental. The Stop-gate invokes a phase's exit test from a **bare environment** with no `SPECMANAGER_*` vars set, on a machine typically running ~10 live MCP processes holding ports 4317–4323. Four suites used to fail there for reasons unrelated to any prompt edit. `b97f50c` and `55d8ba8` are what made `trim`'s 14-suite chain passable in the environment that actually gates it — the suite now passes in a bare environment under concurrent boards, where it previously required env vars nobody set.

## 7. Verifying the shipped state

```bash
cd /Users/joan/Documents/projects/specmanager/plugins/specmanager/server
rm -rf dist && npm run build && git status --porcelain dist/     # expect: no output
npm run selftest && npm run selftest-board && npm run selftest-phases \
  && npm run selftest-build && npm run selftest-tiers && npm run selftest-stopgate \
  && npm run selftest-roundtrip && npm run selftest-pidfile && npm run selftest-shutdown \
  && npm run selftest-autoport && npm run selftest-repos && npm run smoke-mcp \
  && npm run selftest-specslice && npm run selftest-prompts
cd ../../.. && claude plugin validate plugins/specmanager        # run from the REPO ROOT
```

Expected: 14 suites, exit 0, each ending in its own `assertions passed` line; `✔ Validation passed with warnings` with the single pre-existing `version` warning. Run `claude plugin validate` from the repo root — the path is relative, and running it from `server/` yields a false failure.

Per-phase reproduction steps, expected outputs and troubleshooting live in the three phase walkthroughs; this document does not repeat them.
