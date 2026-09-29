---
id: arch-specmanager-simplification-cleanup-024
featureId: feat-specmanager-simplification-cleanup
stage: architecture
status: approved
stale: false
title: SpecManager simplification cleanup — Architecture
dependsOn:
  - prd-specmanager-simplification-cleanup-039
basedOn:
  prd-specmanager-simplification-cleanup-039: 2
generatedBy: agent
version: 2
createdAt: '2026-08-31T14:15:15.264Z'
updatedAt: '2026-08-31T14:33:57.494Z'
---
_Status: approved · Implements `prd-specmanager-simplification-cleanup-039` v2 · v2 folds the operator's Q3/Q4 answers into R2 and R5_

## Approach

Subtraction, in dependency order. Every cut is sequenced so the thing that verifies a cut still exists when the cut lands. The one ordering constraint that matters: **R3 (reduce the prompt suite) lands before R4 (de-duplicate prompts)**, because the reduced suite is what proves R4 didn't take a load-bearing rule with it.

Two findings from grounding this against the repo changed the shape of the work versus the PRD:

- **F1 — R4 is much smaller than the PRD assumed.** The PRD's premise was that prompts widely restate rules `core` enforces. Reading `selftest-prompts.ts`'s own reconciliation notes, the opposite is true: most invariants are annotated as prose-only precisely *because* nothing in `core` enforces them. `INV-16` records that `checkGate` "is never consulted on a write path, so the call in each gated command IS the enforcement". `INV-18` records that `updateTask` "accepts a direct todo→done jump, so the board's live signal is prompt-only". `INV-32` records that "nothing in core checks a Plan doc exists". Verified independently below.
- **F2 — the tier cut is bigger and cleaner than the PRD assumed.** It deletes not just the module and its self-test but three whole prompt invariants (`INV-6`, `INV-7`, `INV-21`), which is a meaningful slice of R3's target reduction.

## Core-enforcement audit

R4's governing rule needs a fact table, not a judgement call. Verified by reading `core/`:

| Rule | Enforced in `core`? | Evidence | Consequence |
|---|---|---|---|
| A `done` transition records artifacts | **Yes** | `core/tasks.ts:207` throws `missingArtifact` | De-duplicable — collapse to the builder, the only actor that receives the rejection |
| Optimistic concurrency on writes | **Yes** | `core/documents.ts:239-243` throws `version conflict` | De-duplicable |
| Fibonacci complexity ≤3 | **Yes** | `create_task` rejects ≥5 | De-duplicable — collapse to the planner |
| Staleness propagation | **Yes**, *given* `dependsOn` | `propagateStale`, `core/status.ts` | **Not** de-duplicable — `INV-11`'s rule is that agents must *emit* `dependsOn`; the propagation is worthless without it and nothing rejects its absence |
| Gate prerequisites | **No** | `checkGate` has no write-path caller; `board-server.ts:229` exposes it read-only | **Not** de-duplicable |
| `in_progress` before work | **No** | `updateTask` permits `todo`→`done` | **Not** de-duplicable |
| Plan-approved compound check | **No** | `checkGate(stage:"plan")` verifies the Architecture only | **Not** de-duplicable |
| Single-phase ⇒ no `final` walkthrough | **No** | prose only, 4 carriers | **Not** de-duplicable |
| `clear_active_build` terminal-paths-only | **No** | prose only | **Not** de-duplicable |
| Reviewer gets a slice, not the whole doc | **No** | prose only | **Not** de-duplicable |

**Design consequence:** R4 shrinks to the three de-duplicable rows (staleness qualifies on the enforcement axis but fails on the actionable one). It is a real cut but a modest one, and it must not be allowed to grow by feel during execution.

## R1 — Remove tier dispatch

**Deleted outright**

- `server/src/core/tiers.ts` (59 lines)
- the `export * from "./tiers.js"` line in `server/src/core/index.ts:16`
- `server/src/selftest-tiers.ts` (58 lines)
- the `"selftest-tiers"` entry in `server/package.json` scripts
- `commands/specmanager-build.md` step **6b** in full (the per-build `AskUserQuestion`)
- `agents/builder.md`'s "Model is parent-supplied (R2)" blockquote

**Rewritten, not deleted**

`commands/specmanager-build.md` step **7** keeps the per-task dispatch loop and `--bulk`; only the alias resolution comes out. The dispatch becomes `Agent({ subagent_type: "builder", prompt: ... })` with no `model:` key. The rationale sentence changes from *"per-task is the default because it isolates a 529 to a single card"* — which stays true and is now the **only** reason the loop exists.

Step **7b**'s fail branch loses its ladder. New behaviour: on `fail`, re-dispatch the fix to the builder with the reviewer's `reasons` attached, still counting against the same N=3 Stop-gate budget; persistent `fail` still surfaces the phase as `blocked` via `clear_active_build()` + stop. The retry semantics (R=2 transport retry, non-nesting with N=3) are untouched.

**Invariant fallout:** `INV-6`, `INV-7`, `INV-21` lose their subject and are deleted from `selftest-prompts.ts` as part of this step, not deferred to R3 — leaving them would red the suite for a whole phase.

**Risk:** `core/index.ts` is a barrel; removing an export can break an unrelated importer. Mitigated by the audit above — the only non-barrel references are the self-test and one description string.

## R2 — Delete abandoned scaffolding

Two deletions, one requirement. Both are documents nothing runtime reads; both are git-tracked and therefore recoverable.

**1. The opus-5-readiness measurement artifacts.** Four files removed from `docs/`: `prompt-invariants-derived.md`, `prompt-invariants-reconciled.md`, `baseline-measurement.md`, `post-trim-measurement.md`.

One dangling reference to repair: `selftest-prompts.ts`'s header comment cites `docs/prompt-invariants-reconciled.md` as the table's source. Since R3 rewrites that header anyway, the repair rides with R3's header task, not this one.

**2. The pre-SpecManager archive** (`docs/temp/original-specs/`, 236 KB / 19 files — operator's Q4 answer). Removed in full. Two **live** references must be repaired in the same commit, or the deletion ships a broken pointer in the two files a newcomer reads first:

| File | Line | Current text | Repair |
|---|---|---|---|
| `README.md` | 210 | "…the original full spec is archived at `docs/temp/original-specs/architecture-and-spec.md`" | drop the parenthetical entirely |
| `CLAUDE.md` | 64 | "…the original full spec and phased plan are archived under `docs/temp/original-specs/` (historical snapshots — don't edit)" | reduce the bullet to `docs/DESIGN.md` + `docs/agent-snippets/` |

`CLAUDE.md:64` sits **outside** the `specmanager:start`/`specmanager:end` markers, so it is a hand-edit; `sync_claude_md` (R5) rewrites only the managed region and will neither perform nor clobber this repair. The line-anchored marker merge is what makes the two edits independent.

**Deliberately not repaired:** the citations inside `.claude/specs/**/walkthroughs/`. Those are dated records of what was true when the phase shipped; rewriting them would falsify history. `rename-execute-command-to-build/walkthroughs/phase-rename.md` already establishes this precedent for the same directory.

**Out of scope:** `docs/temp/redesign/` (1.9 MB) stays. The redesign feature's Plan names it as the live visual source-of-truth. It is the reason the `docs/temp/` tree measures 2.2 MB while this deletion reclaims 236 KB.

Untouched: `docs/notes.md`, `docs/install-from-branch.md`, `docs/DESIGN.md`, `docs/agent-snippets/`, `docs/references/`.

## R3 — Reduce the prompt suite

**Retention rule.** An invariant survives iff **(a)** it guards a fragment physically duplicated across carriers (snippet parity), **or** **(b)** it is a negative check (`max: 0`), **or** **(c)** the core-enforcement audit marks its rule "not de-duplicable" *and* it has more than one carrier. Everything else goes.

Applying it to the current 45 rows:

- **Deleted by R1:** `INV-6`, `INV-7`, `INV-21` (3).
- **Survive under (a) — snippet parity:** `INV-13` (lossless carryover, 4 carriers, `min == max`), `INV-29` (density/reference-by-id, 4 carriers, `min == max`), `INV-15a` (design grounding, 3 carriers).
- **Survive under (b) — negative:** `INV-15b` and the two other `max: 0` rows.
- **Survive under (c) — multi-carrier, prose-only:** `INV-1` (4 actors), `INV-2` (3 statements), `INV-25` (`min: 8` — the never-approve rule across five agents plus the commands), `INV-11` (4 persisting agents), `INV-30`/`INV-31` (opposite-polarity write boundaries — the pair must survive together or a de-dup inverts one).
- **Everything else is dropped**, including the `INV-14a…e` designer-fallback quintet (single-carrier, taste guidance), `INV-27a…c`, `INV-36a/b`, and the single-sited rows the reconciliation itself flags as already safe (`INV-33`: "already single-sited, the trim must not touch it" — a single-sited rule needs no occurrence gate).

Target: **~14 rows**, from 45.

**Mechanics changes**

- Positive entries drop `max` entirely. The field becomes optional in `PromptInvariant`; `passes()` treats an absent `max` as unbounded. This is the change that ends two-file edits: rewording a rule can no longer trip a ceiling. The `min` floor stays — it is the half that catches an over-trim.
- The **mutation pass stays**, unchanged in mechanism. It is what distinguishes a pattern that guards its statement from one that merely matches neighbouring prose, and it is cheap.
- The **carrier-sensitivity pass is deleted**. It never asserted — it printed advisories for a reconciliation process that no longer exists.
- The header comment is rewritten to state the retention rule above, replacing the citation of the reconciliation doc R2 deletes.

Expected result: **under 250 lines** (PRD AC4), from 699.

## R4 — De-duplicate the safe rules

Scope is exactly the three "de-duplicable" rows of the audit. For each, the rule is stated once at the actor that receives the rejection and removed from the others:

| Rule | Survives at | Removed from |
|---|---|---|
| Artifact-on-`done` | `agents/builder.md` (execution loop step 4) | the `missingArtifact` restatements elsewhere |
| Version conflict / `baseVersion` | the drafting agents' write step | duplicated warnings |
| Complexity ≤3 split | `agents/planner.md` | echoes in the plan command |

Staleness was the fourth candidate and **does not qualify**: `core` propagates it, but only once an agent emits `dependsOn`, and nothing rejects its absence. Recording that a deletion is unnecessary is part of the deliverable.

`docs/agent-snippets/` **stays**. The fragments it names (`design-grounding`, `lossless-carryover`) are in the "not de-duplicable" class — they are genuinely needed at 3–4 carriers each, and the surviving `INV-13`/`INV-15a`/`INV-29` are precisely their guard. Removing the directory would delete the source of truth while leaving the copies. (This resolves PRD **Q2** in the negative; unchallenged by the operator.)

## R5 — Prune specs

Two steps, and the deletion list is now **fixed** by the operator's Q3 answer:

1. **Delete exactly two feature directories** under `.claude/specs/features/`: `opus-5-readiness` and `dummy-feature`. The task carries no discretion to widen this. The 22 remaining `PRD`-stage drafts are intentionally retained — the operator reviewed the full list and kept them.
2. **Re-sync**: call `sync_claude_md` so the managed block reflects the surviving set. `manifest.json` is a rebuildable cache, so a directory delete needs no manifest surgery — but the sync must run or the block advertises features that no longer exist.

Ordering: **last**. Deleting `opus-5-readiness` removes the walkthroughs that document why R1–R3 look the way they do; that context is worth keeping until the work is done.

Note the interaction with R2: deleting `opus-5-readiness` also removes its walkthroughs' citations of the four measurement docs, which is why R2 leaves them unrepaired.

## Verification strategy

The suite is the gate. After every step: `npm run build` then the 13 surviving self-tests. Per-step additions:

- **R1** — `grep` for tier symbols returns nothing outside `dist/` (AC1); `selftest-build` and `selftest-stopgate` still pass (they cover the dispatch paths that remain).
- **R2** — `grep -rn "docs/temp/original-specs\|prompt-invariants-\|baseline-measurement\|post-trim-measurement"` outside `.claude/specs/` and `dist/` returns nothing (AC5); `docs/temp/redesign/` still present (AC9).
- **R3** — the mutation pass must pass for every surviving row (AC4). A row that survives the cut but fails mutation was already broken and is a finding, not a regression.
- **R4** — `selftest-prompts` is the acceptance test. Its `min` floors are what catch a rule removed from one carrier too many.
- **R5** — `sync_claude_md` output inspected; `claude plugin validate` (AC8).

`dist/` is committed, so **every** step ends with `npm run build` in both `server/` and `ui/` before commit (AC8). `ui/` is untouched by this feature but the rebuild keeps the shipped artifacts consistent.

## Rejected alternatives

- **Keep the tier ladder "in case a Haiku 5 lands."** Rejected: `core/tiers.ts`'s own comment argues the ladder is kept so a future model is "a one-line table edit". Re-adding a 59-line pure module later is also a small edit, and the module costs an `AskUserQuestion` on every build in the meantime. Deleting is cheaper than carrying.
- **Delete `selftest-prompts` outright.** Rejected: snippet drift is a *demonstrated* defect class in this repo — `design-grounding.md` once told the architect to `read_document` a design doc while `planner.md`/`builder.md` warned against exactly that. The guard's problem is its `max` ratchets and its size, not its existence.
- **Do R4 before R3.** Rejected: de-duplicating prompts against a 45-row suite tuned to exact occurrence counts means fighting the ceilings on every edit. Reduce the suite first, then cut prose against the floors.
- **Fold R5 into R1.** Rejected on the original grounds (R5 needed an operator answer, R1 did not). Now that Q3 is answered the coupling would be legal, but R5 stays last for the context reason above.
- **Give R2's archive deletion its own requirement (R6) and task.** Rejected: it is the same "delete unread documents" work, and `update_task` cannot retro-fit `dependsOn`, so a task created after the plan was written would sort *behind* the final verification task. Widening R2 and task-005 keeps the verification genuinely last.
- **Delete all of `docs/temp/`.** Rejected: `docs/temp/redesign/` is live source-of-truth for a shipped feature despite its path.

## Open questions

- **Q1** — `--bulk` retained. Flagged, unchallenged, closed unless the operator reopens.
- **Q2** — `docs/agent-snippets/` retained (see R4). Closed.
- **Q3** — **Answered:** `opus-5-readiness` + `dummy-feature` only. Folded into R5. Closed.
- **Q4** — **Answered:** remove `docs/temp/original-specs/`. Folded into R2, with the scope correction (236 KB, not 2.2 MB) and the two reference repairs. Closed.
- **Q5** — the reviewer stage's continued value. Open, out of scope, no task.
- **Q6** — `INV-14a…e` dropped from the gate under R3's retention rule. Open with a stated default (accept). Does not block execution.
