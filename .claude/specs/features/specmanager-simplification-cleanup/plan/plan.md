---
id: plan-specmanager-simplification-cleanup-018
featureId: feat-specmanager-simplification-cleanup
stage: plan
status: draft
stale: false
title: SpecManager simplification cleanup — Plan
dependsOn:
  - arch-specmanager-simplification-cleanup-024
basedOn:
  arch-specmanager-simplification-cleanup-024: 2
generatedBy: agent
version: 2
createdAt: '2026-08-31T14:16:01.850Z'
updatedAt: '2026-08-31T14:34:34.968Z'
---
_Status: draft · Implements `arch-specmanager-simplification-cleanup-024` v2 · v2 folds Q3/Q4 into tasks 5 and 10_

One phase. The whole cleanup is a single testable increment: the suite is green, the plugin validates, and nothing that mattered was lost. Splitting subtraction across phases would ship half-removed machinery at a phase boundary.

## Phase cleanup

**Goal.** Remove tier dispatch, the abandoned scaffolding, and the prompt-suite over-build; de-duplicate the three rules `core` actually enforces; prune the two dead spec dirs. Land it with all 13 self-tests green and `dist/` rebuilt.

**Exit test.** `cd plugins/specmanager/server && npm run build && npm run selftest && npm run selftest-board && npm run selftest-phases && npm run selftest-build && npm run selftest-stopgate && npm run selftest-roundtrip && npm run selftest-pidfile && npm run selftest-shutdown && npm run selftest-autoport && npm run selftest-repos && npm run selftest-specslice && npm run selftest-prompts && npm run smoke-mcp && cd /Users/joan/Documents/projects/specmanager && claude plugin validate plugins/specmanager`

**Architecture refs.** `R1`, `R2`, `R3`, `R4`, `R5`, `core-enforcement-audit`, `verification-strategy`

### Task table

| # | Task | Pts | Depends on | Implements |
|---|---|---|---|---|
| 1 | Delete `core/tiers.ts`, its barrel export, `selftest-tiers.ts`, the package script | 2 | — | R1 |
| 2 | Strip tier prose from `commands/specmanager-build.md` (step 6b, step 7 alias resolution, step 7b ladder) | 2 | 1 | R1 |
| 3 | Strip the "Model is parent-supplied" blockquote from `agents/builder.md` | 1 | 1 | R1 |
| 4 | Delete `INV-6`, `INV-7`, `INV-21` from `selftest-prompts.ts` | 1 | 2, 3 | R1 |
| 5 | `git rm` the four abandoned `docs/` files **and** `docs/temp/original-specs/`; repair `README.md:210` + `CLAUDE.md:64` | 2 | — | R2 |
| 6 | Make `max` optional in `PromptInvariant`; delete the carrier-sensitivity pass | 2 | 4 | R3 |
| 7 | Apply the retention rule — cut the invariant table to ~14 rows | 3 | 6 | R3 |
| 8 | Rewrite the `selftest-prompts.ts` header comment | 1 | 5, 7 | R2, R3 |
| 9 | De-duplicate the three core-enforced rules across the prompts | 3 | 8 | R4, core-enforcement-audit |
| 10 | Delete `opus-5-readiness` + `dummy-feature` spec dirs, then `sync_claude_md` | 2 | 9 | R5 |
| 11 | Rebuild `server/dist` + `ui/dist`, run the full exit test, `claude plugin validate` | 2 | 10 | verification-strategy |

Total: **21 points across 11 tasks**, none above 3.

### Sequencing notes

- **1 → 2, 3** rather than the reverse: delete the module first so a stale prompt reference is a grep hit, not a silent inconsistency.
- **4 after 2 and 3**, not before: removing the invariants while the prose still names tiers would leave the suite green over prose the next task deletes.
- **5 is independent** of the R1 chain and can land at any point before 8; it is placed early because it is close to a pure `git rm`.
- **7 after 6**: the schema change (`max` optional) must exist before rows are rewritten to omit it, or the table doesn't typecheck mid-edit.
- **9 after 8**: the reduced suite is the acceptance test for the de-duplication. Running it against the old 45-row table would fight the `max` ceilings — the exact failure mode the Architecture sequenced around.
- **10 last-but-one**: `opus-5-readiness`'s walkthroughs explain why R1–R3 look as they do; keep them until the work is done.
- **11 is a real task, not a formality.** `dist/` is what ships; an unbuilt commit ships stale behaviour.

### Task 5's boundary (Q4)

Two deletions and two repairs, one commit:

- **Delete:** `docs/prompt-invariants-derived.md`, `docs/prompt-invariants-reconciled.md`, `docs/baseline-measurement.md`, `docs/post-trim-measurement.md`, and the whole `docs/temp/original-specs/` tree (19 files, 236 KB, all git-tracked).
- **Repair:** `README.md:210` — drop the "…archived at `docs/temp/original-specs/architecture-and-spec.md`" parenthetical. `CLAUDE.md:64` — reduce the `docs/` layout bullet to `docs/DESIGN.md` + `docs/agent-snippets/`. This line is **outside** the `specmanager:start/end` markers, so it is a hand-edit and task 10's `sync_claude_md` will neither perform nor clobber it.
- **Do not touch** `docs/temp/redesign/` — live visual source-of-truth for the redesign feature despite its path (Architecture NG5/R2).
- **Do not repair** citations inside `.claude/specs/**/walkthroughs/`. They are dated records; rewriting them falsifies history, and task 10 deletes the `opus-5-readiness` ones anyway.

The `selftest-prompts.ts` header comment also cites a deleted doc, but that repair belongs to **task 8**, which rewrites the header wholesale.

### Task 9's boundary

Exactly three rules move: artifact-on-`done` → `agents/builder.md`; version-conflict/`baseVersion` → the drafting agents' write step; complexity-≤3 split → `agents/planner.md`. The Architecture's audit marks everything else "not de-duplicable" — staleness included, since `core` propagates it only once an agent emits `dependsOn` and nothing rejects its absence. If a fourth candidate appears during execution, that is a finding to surface — not scope to absorb.

### Task 10's boundary (Q3)

Exactly two directories: `opus-5-readiness`, `dummy-feature`. **No discretion to widen.** The operator reviewed the full 24-feature `PRD`-stage list on 2026-08-31 and retained the other 22. Then `sync_claude_md`, and confirm the managed block no longer advertises the deleted pair.

## Open questions

- **Q1** (`--bulk` retained) and **Q2** (`docs/agent-snippets/` retained) — closed by the Architecture, unchallenged.
- **Q3** and **Q4** — **answered by the operator** and folded into tasks 10 and 5 respectively. No longer blocking.
- **Q5** (is the reviewer stage still wanted?) — open, out of scope, no task. The next-largest removal candidate if the operator wants to keep cutting.
- **Q6** (`INV-14a…e` dropped from the gate) — open with a stated default of *accept*. Task 7 proceeds on that default; reversing it later is a three-line re-add.
