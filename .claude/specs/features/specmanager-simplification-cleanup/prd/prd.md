---
id: prd-specmanager-simplification-cleanup-039
featureId: feat-specmanager-simplification-cleanup
stage: prd
status: approved
stale: false
title: SpecManager simplification cleanup — PRD
dependsOn: []
basedOn: {}
generatedBy: agent
version: 2
createdAt: '2026-08-31T14:13:29.847Z'
updatedAt: '2026-08-31T14:32:53.609Z'
---
_Status: approved · Feature: `feat-specmanager-simplification-cleanup` · v2 reconciles the operator's answers to Q3 and Q4_

## Problem

SpecManager works, but it has accumulated machinery that no longer pays for itself. Three forces drove the accretion:

1. **Model-tier hedging.** The build pipeline routes each task to a model tier. It was designed when cheap tiers were attractive; today the default table is `cheap→sonnet`, `standard→sonnet`, `strong→opus`, and the operator runs Opus 5 almost exclusively. The routing now costs an `AskUserQuestion` on **every build** and buys nothing.
2. **Prose duplication + a guard for it.** Rules are physically copy-pasted across 4–5 prompt files (`docs/agent-snippets/` names the carriers), and a 699-line self-test (`selftest-prompts.ts`, 45 invariants with `min`/`max` occurrence ratchets, a mutation pass, and a carrier-sensitivity report) exists to stop the copies drifting. The guard is sound engineering for the design it guards — but the design itself is the problem.
3. **Abandoned scaffolding.** The `opus-5-readiness` feature was stopped mid-flight. Its measurement and invariant-derivation artifacts (~17,200 words) still sit in `docs/`, alongside a pre-SpecManager archive at `docs/temp/original-specs/`. 24 features sit permanently in `PRD` stage, listed in the managed CLAUDE.md block that is injected into every session.

The net effect: every prompt edit is a two-file edit, every build asks a question with one sensible answer, and every session loads context describing work that will never ship.

## Goals

- **G1.** Remove machinery that no runtime code uses.
- **G2.** Make a prompt edit a one-file edit again.
- **G3.** Stop paying per-build and per-session friction for decisions that have one answer.
- **G4.** Lose no load-bearing behaviour. Every gate, transition, and validation that `core` enforces today must still be enforced after the cleanup.

## Non-goals

- **NG1.** No new features. This is subtraction only.
- **NG2.** No change to the lifecycle stages, the gate semantics, or the board UI.
- **NG3.** No rewrite of `core/`. The modules that carry real logic (`documents`, `status`, `tasks`, `spec-slice`, `repos`, `design-md`) are untouched.
- **NG4.** Not re-opening the `opus-5-readiness` feature. Its artifacts are removed, not resumed.
- **NG5.** `docs/temp/redesign/` is **not** touched. Despite living under `temp/`, the redesign feature's Plan names it as the live visual source-of-truth (`board.png`, `panel.png`, the "Obsidian Flux" DESIGN.md). It is 1.9 MB of the 2.2 MB `docs/temp/` tree.

## Evidence

Measured on `main` at the time of writing:

| Claim | Evidence |
|---|---|
| Tier dispatch is unused at runtime | `grep -rn "tiers" server/src --include="*.ts"` matches only `core/index.ts` (the re-export), `selftest-tiers.ts`, and one `selftest-prompts.ts` description string. No MCP tool, no board-server call. |
| The tier table is a no-op for this operator | `DEFAULT_TIER_TO_ALIAS` = `{cheap: sonnet, standard: sonnet, strong: opus}`; two of three rows downgrade from the session default. |
| The prompt guard is the largest single source file | `selftest-prompts.ts` = 699 lines, vs `mcp.ts` = 658, `core/design-md.ts` = 613. 45 invariants, 3 of them negative (`max: 0`). |
| Abandoned docs are unreferenced by runtime | `docs/prompt-invariants-derived.md` (10,176 w), `prompt-invariants-reconciled.md` (3,701 w), `post-trim-measurement.md` (2,487 w), `baseline-measurement.md` (823 w). Referenced only from one source comment and from `opus-5-readiness`'s own walkthroughs. |
| The archive is small and recoverable | `docs/temp/original-specs/` = 236 KB / 19 files, **all git-tracked** (`git ls-files`). Two live references point at it: `README.md:210`, `CLAUDE.md:64`. |
| Session context carries dead weight | Managed CLAUDE.md block = 372 words listing 24 `PRD`-stage features; 32 feature directories, 2.3 MB under `.claude/specs`. |

## Requirements

### R1 — Remove per-task tier dispatch

The build pipeline dispatches builders at the session default model. Deleted: `core/tiers.ts`, its `core/index.ts` re-export, `selftest-tiers.ts`, the `selftest-tiers` package script, the `AskUserQuestion` tier-confirmation step in `commands/specmanager-build.md`, the per-task alias-resolution prose in the same command, and the model paragraph in `agents/builder.md`.

**Preserved:** the per-task dispatch loop itself (it isolates a 529 to one card), `--bulk`, and the bounded transient-error retry (R=2). These are resilience mechanisms and are independent of tiering.

**Changed:** the reviewer-fail path no longer escalates a tier. On `fail`, the parent re-dispatches the fix to the builder at the session default with the reviewer's `reasons` attached; persistent failure still surfaces the phase as `blocked` under the same N=3 Stop-gate budget.

### R2 — Delete abandoned scaffolding

Two sets, one requirement — both are documents nothing runtime reads:

1. **opus-5-readiness measurement artifacts.** Remove `docs/prompt-invariants-derived.md`, `docs/prompt-invariants-reconciled.md`, `docs/baseline-measurement.md`, `docs/post-trim-measurement.md`. Update the one source comment in `selftest-prompts.ts` that cites them so no reference dangles.
2. **The pre-SpecManager archive** (operator's answer to Q4). Remove `docs/temp/original-specs/` in full, and repair its two live references: `README.md:210` (the "original full spec is archived at…" pointer) and `CLAUDE.md:64` (the `docs/` layout bullet). Both must lose the pointer rather than point at a deleted path. `CLAUDE.md:64` sits **outside** the `specmanager:start/end` markers, so it is a hand-edit and `sync_claude_md` will not touch it.

`docs/notes.md`, `docs/install-from-branch.md`, `docs/DESIGN.md`, `docs/agent-snippets/`, `docs/references/`, and `docs/temp/redesign/` are untouched (see NG5).

### R3 — Reduce selftest-prompts to its load-bearing core

The suite keeps exactly the checks that guard a defect class nothing else catches:

- **snippet parity** — the copy-pasted fragments in `docs/agent-snippets/` still agree across their named carriers;
- **negative checks** (`max: 0`) — forbidden wording has not crept back.

Dropped: the `max` occurrence ratchets on positive entries (they were tuned to exact post-trim counts and go red on any rewording), the carrier-sensitivity report, and invariants whose rule `core` already enforces at runtime.

Retained mechanics: the mutation pass over the surviving entries. A pattern that stays green when its statement is deleted is still a real finding.

### R4 — Stop restating rules that core enforces

Prompt prose that repeats a constraint the server rejects anyway is removed from all but one carrier. Governing rule: **a rule enforced in `core` is stated once, at the actor that must act on the rejection; a rule enforced only by prose keeps every carrier it needs.**

The Architecture's core-enforcement audit found this class is small: three rules qualify (artifact-required-on-`done`, optimistic-concurrency version checks, Fibonacci ≤3 split). Rules that look similar but are **prose-only and must be preserved**: gate prerequisites, `in_progress`-before-work, the compound plan-approved check, "single-phase features never produce a `final` walkthrough", "don't `clear_active_build()` on a mid-phase stop", "hand the reviewer the slice, never the whole Architecture doc".

R4 is sequenced **after** R3 so the reduced suite is the thing that verifies it.

### R5 — Prune dead specs and shrink the session block

Remove `opus-5-readiness` and `dummy-feature` from `.claude/specs/features/` — the operator's answer to Q3 — then `sync_claude_md` so the managed block reflects reality. **No other feature directory is deleted.** The 22 remaining `PRD`-stage drafts are intentionally retained.

## Acceptance criteria

- **AC1.** `grep -rn "tiers\|aliasForTier\|tierForComplexity" plugins/specmanager --include="*.ts" --include="*.md"` returns no hits outside compiled `dist/`.
- **AC2.** A `/specmanager-build` run completes end-to-end with **no** model-selection question, and its builder dispatches carry no `model:` override.
- **AC3.** All remaining self-tests pass: `selftest`, `selftest-board`, `selftest-phases`, `selftest-build`, `selftest-stopgate`, `selftest-roundtrip`, `selftest-pidfile`, `selftest-shutdown`, `selftest-autoport`, `selftest-repos`, `selftest-specslice`, `selftest-prompts`, `smoke-mcp` (13 — `selftest-tiers` is gone).
- **AC4.** `selftest-prompts.ts` is under 250 lines and every surviving invariant passes its mutation check.
- **AC5.** No file under `docs/`, no source comment, and neither `README.md` nor `CLAUDE.md` references a deleted document or the deleted `docs/temp/original-specs/` path.
- **AC6.** The reviewer-fail path is still exercised: a `fail` verdict re-dispatches a fix and a persistent `fail` still marks the phase `blocked`.
- **AC7.** Each preserved-rule statement named in R4 is still present at its designated carrier, asserted by the reduced `selftest-prompts`.
- **AC8.** `claude plugin validate plugins/specmanager` passes, and `server/dist` + `ui/dist` are rebuilt and committed.
- **AC9.** `docs/temp/redesign/` is present and unmodified after the cleanup.

## Risks

- **RK1 — Over-trimming prose.** Cutting a rule that only prose enforces silently degrades agent behaviour, and no test catches it because the test was cut in the same change. *Mitigation:* R3 lands before R4, and R4's governing rule requires an explicit "is this enforced in `core`?" check per deletion.
- **RK2 — Losing the escalation ladder.** With tiers gone, a reviewer `fail` retries at the same model. *Mitigation:* accepted. The operator already runs the top model; escalation had nowhere to go.
- **RK3 — Deleting a spec the operator still wants.** *Mitigation:* resolved. Q3 is answered and the deletion list is fixed at two directories; the task carries no discretion to widen it.
- **RK4 — Deleting an archive that is still cited.** `docs/temp/original-specs/` is cited from `README.md`, `CLAUDE.md`, and several historical walkthroughs. *Mitigation:* the two live references are repaired in the same task; walkthrough citations are dated records and are deliberately left as-is. All files are git-tracked, so the archive is recoverable from history.

## Open questions

- **Q1 — does `--bulk` survive?** *Resolved by the Architecture in the affirmative, unchallenged.* It is orthogonal to tiering and costs ~3 lines once the alias-resolution prose is gone.
- **Q2 — does `docs/agent-snippets/` survive?** *Resolved by the Architecture in the affirmative, unchallenged.* Both fragments fall in the "not de-duplicable" class; the surviving `INV-13`/`INV-15a`/`INV-29` are their guard. Deleting the directory would remove the source of truth while leaving the copies.
- **Q3 — which feature directories are safe to delete?** **Answered (operator, 2026-08-31): `opus-5-readiness` and `dummy-feature` only.** Folded into R5; the other 22 drafts are retained.
- **Q4 — does `docs/temp/original-specs/` go?** **Answered (operator, 2026-08-31): remove it.** Folded into R2. Scope correction recorded at the same time: the directory is 236 KB, not the 2.2 MB originally quoted — that figure was the whole `docs/temp/` tree, 1.9 MB of which is `docs/temp/redesign/`, retained under NG5.
- **Q5 — is the reviewer stage still wanted?** Open, and explicitly out of scope for this feature. It is a per-phase model call whose value drops as the build model gets stronger — the next-largest candidate for removal.
- **Q6 — the `INV-14a…e` designer-fallback quintet.** Open. R3's retention rule drops them as single-carrier taste guidance. Dropping the gate does not delete the prose, but it means a future trim could remove it unnoticed. Default: accept the drop.
