---
id: plan-agent-prompt-simplification-opus-5-5-023
featureId: feat-agent-prompt-simplification-opus-5-5
stage: plan
status: approved
stale: false
title: Agent prompt simplification (Opus 5.5) plan
dependsOn:
  - arch-agent-prompt-simplification-opus-5-5-029
basedOn:
  arch-agent-prompt-simplification-opus-5-5-029: 2
generatedBy: agent
version: 2
createdAt: '2026-10-20T13:56:25.476Z'
updatedAt: '2026-10-20T14:02:49.208Z'
---
## Overview

A prompt-only trim of the 19 files scoped by `prd-agent-prompt-simplification-opus-5-5-044`, done the way `arch-agent-prompt-simplification-opus-5-5-029` lays out. Each file is critiqued against the C1–C5 taxonomy and the Keep-list, every rule-bearing cut is logged in the removal ledger, the file is edited, the touched INV `max` values are lowered in `selftest-prompts.ts`, and the change is committed alone with `selftest-prompts` green. Around the edits sit a baseline pin, a *before* dogfood run, the builder `Skill` probe (Q-A), full verification, and an *after* dogfood run. It is **one phase** with no split trigger: there is no spike, because Q-A only decides whether one task adds `Skill` to an allowlist, which does not change what tasks exist; and at 36 points it is far below the ≈100 size threshold. File order runs from low risk to high: small agents, then commands, then `builder.md` / `specmanager-build.md` last, because those two collide with `feat-specmanager-simplification-cleanup` (Q1).

**Scale:** `1` trivial · `2` small · `3` moderate · `5` substantial · `8` large · `13`/`21` epic.

*Every task below is decomposed to **≤3 points**. `specmanager-build.md` was split into two tasks because of its size; the rest of the work was small to begin with. The phase subtotal is unchanged by the split.*

| Phase | Theme | Points |
|---|---|---|
| trim | Trim redundant prompt prose, keep every rule | 36 |
| **Total** | | **36** |

---

## Phase trim — Trim redundant prompt prose, keep every rule

**Exit test:** from `plugins/specmanager/server`, `npm run build && npm run selftest-prompts && npm run selftest-directory && npm run selftest && npm run smoke-mcp` passes. The remaining self-tests and `claude plugin validate plugins/specmanager` (repo root) pass and are recorded in `docs/verification/prompt-simplification-ledger.md`. `docs/verification/prompt-simplification-dogfood.md` shows the *after* run meeting every G4 checklist item that the *before* run met. *(`selftest-shutdown` / `selftest-autoport` can time out on a loaded machine; re-run before calling it a regression.)*

| # | Task | Pts | Notes |
|---|---|---|---|
| 1.1 | Create the removal ledger and pin the baseline | 1 | Create `docs/verification/prompt-simplification-ledger.md` with the header: sha `ad11cd8`; counting commands `wc -w` over the 19 files (16,248) and `grep -cE '^\s*-\s*(\*\*)?(Don.t\|Never)'` per file, summed (71 at baseline); INV snapshot (52 ids / ~76 rows); per-file table skeletons; frontmatter-decisions section (G2 table) |
| 1.2 | Write the dogfood harness and capture the *before* run | 3 | Arch G4: worktree at `ad11cd8`, `npm ci`, scratch Node CLI project, scratch `CLAUDE_PLUGIN_DATA`, seeded interview doc, fixed `--version` intent, `-p` loop then build `next`, harness-only "(recommended)" line. Keep the stream-json, `.claude/specs/` tree and `git log`. Create `docs/verification/prompt-simplification-dogfood.md` and fill in the before column of the 9-item checklist from the captured outputs (the maintainer reviews it in the walkthrough) |
| 1.3 | Trim `agents/prd-writer.md` | 1 | ≈ −10 words. Keep "Keep it tight" (≤250 lines) and "Report the new document id". Ledger rows; lower the `max` of any INV row the edit touches |
| 1.4 | Trim `agents/reviewer.md` and fix the "task notes" wording (Q-B) | 1 | C1 "How to review" step 2; C4 "(a future stage-two reviewer…)". Q-B: "task titles (notes live in the plan table)" in the description and §1 item 2 (`core/spec-slice.ts` emits `notes: null`). Frozen: INV-8/22/23/24/49a–b and the verdict JSON |
| 1.5 | Trim `agents/architect.md` | 1 | C1→C2 merge of "Keep it grounded" into the "invent files" Don't. C5 cut of the anchor-slicing explanation only if INV-35 stays green. Frozen: Context7 (INV-27a–c, 28), INV-15a, density contract, persist sketch |
| 1.6 | Trim `agents/designer.md` | 2 | C2: Aesthetic-bar overlap with the fallback (keep INV-14a–e); "external assets/JS" Don't; one of the two persistence statements. C4 `(R5)`, `(AC5)`–`(AC8)`, "Phase 3 stale-propagation". C5 the `create_design_brief` write description. Frozen: `bootstrap_design_tokens`, sandbox/no-JS, INV-37 |
| 1.7 | Trim `agents/walkthrough-writer.md` | 2 | C2: "single-phase ⇒ no `final`" restatements (keep the Inputs line and the Final-mode refusal; lower INV-1 max from 8); the final-mode "new code tour" Don't. C1: compress "Two audiences". Frozen: INV-50a–e, the `### Git strategy` derivation, "Never invent a lesson", INV-13/29 |
| 1.8 | Trim `agents/planner.md` | 3 | C2: self-check items 2–4 and the "flat plan" Don't (keep items 5, 6, 7 for INV-46a/48c/10). C1: "Don't write the code itself". C4 `(R1)`/`(R3)`. C5: the Stop-gate mechanics sentence (keep "never leave the field absent" and its consequence). Frozen: every parsed shape, INV-44, 45a–c, 48c, fill mode, complexity ≤3 |
| 1.9 | Trim the `lossless-carryover.md` snippet header | 1 | Replace the stale "Verified identical…" paragraph with one line naming the four carriers. The fragment and `design-grounding.md` stay unchanged (INV-13/15a–b/29). G3: no carrier changes |
| 1.10 | Trim and rename `Task` dispatch in `specmanager-prd.md`, `-architecture.md`, `-board.md` | 1 | Change the 3 "Use the `Task` tool" lines to "the `Agent` tool" (Q4). Keep `prd.md`'s "Don't approve the new feature" (INV-25 min 8) |
| 1.11 | Trim `commands/specmanager-design.md` | 1 | C3: step 4's restatement of the designer's constraints. `Task` → `Agent` rename |
| 1.12 | Trim `commands/specmanager-plan.md` | 1 | C3: step 3's trailing restatement of the planner's output contract. Keep the "send back a flat plan" Don't. `Task(` → `Agent(` |
| 1.13 | Trim `commands/specmanager-walkthrough.md` | 1 | C3: "fabricate code tours" Don't. `Task(` → `Agent(` |
| 1.14 | Trim `commands/specmanager-interview.md` | 1 | C2: Don't bullets 3–5. Keep "Don't delegate to a subagent" and "Don't … approve it". The behaviour spec is frozen (one question per turn, instant exit, four-section synthesis, `dependsOn: []`) |
| 1.15 | Trim `commands/specmanager-init.md` and fix the stitch-spec link | 2 | C2: "What this does" vs steps 1–3; line-anchored-merge rationale kept once; sibling-repo Don't. C3/C5: compress the Design-stage notes to one line. Replace the broken `../docs/references/stitch-design-md.md` link with the plain spec name (the file is repo-root `docs/references/`); log it in the ledger as a fix |
| 1.16 | Trim `commands/specmanager-loop.md` | 1 | C4: `(R5)`–`(R11)` heading tags. The 4 `Task(` → `Agent(` (INV-39 matches `subagent_type`). Frozen: INV-38–44, 46b |
| 1.17 | Trim `agents/builder.md` | 2 | C1: step 2 "small and focused", step 3 hooks sentence (keep "fix the underlying issue rather than bypassing"). C1/C3: the `list_tasks` order explanation (keep topological order). C2: the next-phase Don't (only if INV-19 ≥ min) and one of the two `in_progress` statements (INV-18 max 1). C4 `(R4)`, `R5/AC2`; keep `R3 reviewer` (INV-3). The R2 blockquote belongs to cleanup |
| 1.18 | Trim `commands/specmanager-build.md` steps (tags, step 9, task-notes wording) | 2 | C4: `(R2 — driven by persisted state…)`, "this is the P1 fix", `(R3)` in the 7b heading (leave `(AC4)`, which is in cleanup's prose). C1: compress the three sync-path sentences in step 9. Q-B wording in 7b. Frozen: 4c, 6a, 6c, 6d, INV-9, INV-5, INV-4, INV-12, cleanup's 6b / step 7 / 7b ladder |
| 1.19 | Trim `commands/specmanager-build.md` Don't bullets | 2 | C2 candidates: `/init` vs managed-blocks Don't, "whole Architecture doc" Don't (INV-23), "reviewer write" Don't (INV-8), single-phase Don't (INV-1). Each is cut only if its `min` holds. Keep the INV-2, 48b, 51e and 33 bullets |
| 1.20 | Probe builder `Skill` access (Q-A) and apply the result | 2 | Headless probe: dispatch the builder with a skill installed and check whether it can invoke it. If it can't, add `Skill` to the builder's `tools:` allowlist. If it can, change nothing. Either way record the evidence in the ledger's frontmatter section. The rest of the G2 decisions stay as recorded (no `effort`, reviewer keeps `opus`) |
| 1.21 | Run the full verification and record results in the ledger | 2 | Every self-test (`selftest`, `-board`, `-phases`, `-build`, `-tiers` if it still exists, `-stopgate`, `-roundtrip`, `-pidfile`, `-shutdown`, `-autoport`, `-repos`, `-specslice`, `-prompts`, `-directory`, `smoke-mcp`) plus `claude plugin validate plugins/specmanager`. Results go in the ledger; any failure is fixed at its root first |
| 1.22 | Capture the *after* dogfood run and close the ledger | 3 | Same harness at the branch head. Fill in the after column and apply the non-determinism rule (one re-run of both sides; a persistent after-only failure means restoring the cut from the ledger and re-running). Close the ledger with after-totals: words, Don't/Never lines, and the share of C2/C3/C5 rows with a carrier (must be 100%) |

---

## Risk & sequencing notes

- **1.1 → 1.2 land first.** The *before* run uses a worktree at `ad11cd8`, so it does not depend on the edits, but capturing it before any edit lands keeps the comparison clean.
- **Every edit task runs in sequence.** They all touch `selftest-prompts.ts` `max` values (and `server/dist/selftest-prompts.js`), so running them one after another avoids conflicts in that file. Each is one commit: the file, its ledger rows, and the selftest source and dist when they changed. A failing `min` means the span is restored, never that the floor is lowered (Arch failure cases). When the mutation pass flags a pattern, re-anchor it; never loosen it.
- **Cleanup collision (Q1).** 1.17–1.19 touch `builder.md` / `build.md`, the files `feat-specmanager-simplification-cleanup` also edits, so they are last. Region exclusion (Keep-list) keeps conflicts textual and fixable by rebase. If cleanup's row cut has already landed, lowering `max` on a removed or optional row is skipped.
- **1.20 after 1.17.** The probe's allowlist change lands on the trimmed `builder.md`.
- **1.21 before 1.22.** The after-run must use a fully green head.
- **Rollback.** Each file is its own commit, so `git revert` of one commit undoes one file's trim. The ledger quotes each removed span, so a single cut can also be restored by hand.
- **Known Stop-gate gap.** Long background builders during the dogfood build can be marked `blocked`. The intent is kept tiny, and a `blocked` that shows up on both sides is not a regression.
- **Branch.** The work stays on a branch stacked on `feat/planner-rewrite`, never `main` (1.0.3 is under directory review). A change under `plugins/specmanager/` plus a rebuilt `server/dist` counts as a release if pushed to `main` (Q8).

## Test strategy

- The regression net is `selftest-prompts` (hand-rolled script in `server/dist`, no runner), run after every edit task with `npm run build && npm run selftest-prompts`. `min` is the floor and never moves; `max` is lowered to the post-trim count; `PromptInvariant` is unchanged.
- 1.21 runs the full self-test list and `claude plugin validate`. `selftest-directory` must end with `All directory-conformance assertions passed.`
- The behavioural gate is G4: the before/after dogfood checklist in `docs/verification/prompt-simplification-dogfood.md` (1.2 and 1.22). That file and the ledger are also the file artifacts the verification tasks need before they can move to `done`.
- No new test code. Frontmatter is not packaging, so no surface test is needed unless 1.20 changes something beyond the `tools:` list.

## Human prerequisites

- **pre-1**: a Claude Code CLI logged in for headless `claude -p` runs (dogfood runs and the `Skill` probe). First needed by row 1.2, and also by 1.20 and 1.22. Grant via `CLI: claude` (already logged in, or `/login`).

## Out of scope

- Anything owned by `feat-specmanager-simplification-cleanup`: tier-dispatch removal (`core/tiers.ts`, build 6b, step 7 tier prose, the 7b ladder, the builder R2 blockquote, INV-6/7/21), the `selftest-prompts` redesign (row cut, optional `max`, carrier-sensitivity pass, header comment), the single-carrier de-dup of artifact-on-done / version conflict / complexity ≤3, and the `docs/` / spec-dir deletions.
- Re-proposing `feat-opus-5-readiness` work (R1–R9, Q2, Q3).
- Changes to gates, lifecycle, staleness, phases, walkthrough semantics, loop approval rights or the Stop-gate.
- Merging, removing or renaming any command or agent file.
- `server/`/`core/`/`ui/` code beyond `selftest-prompts.ts` `max`/pattern updates.
- Changing the shape of any generated doc.
- Setting `effort` (Q2), switching the reviewer off `opus` (Q3), editing agent descriptions.
- Changing either snippet fragment.
- Version bump or release to `main` (Q8, the owner's call).

## Open questions

- **Drift: Don't/Never count.** Running the Architecture's grep per file and summing gives **71** at `ad11cd8`, not 77 (the PRD said 70). 1.1 pins this per-file sum as *the* counting rule and reports before/after with it (resolves Arch Q-C).
- **Drift check passed.** All 19 files exist. The total is 16,248 words. There are 9 `Task` dispatch lines. `docs/verification/` holds only `reviewer-disallowedtools.md`. The stitch spec lives at repo-root `docs/references/stitch-design-md.md`. `builder.md` has a "Skill leverage" section but no `Skill` in `tools:` (Q-A).
- *Loop-mode decisions below accepted by the owner.*
- **Loop-mode decision: single phase.** Taken: one phase (36 pts, no trigger). Not taken: a two-phase split (agents, then commands plus verification). There was no size trigger, and nothing could ship on its own between the two halves.
- **Loop-mode decision: no spike for Q-A.** Taken: the probe is task 1.20 inside the phase. Not taken: a spike phase. The probe's outcome only toggles one allowlist entry and does not change which tasks exist.
- **Loop-mode decision: Q-B applied.** Taken: reword "task notes" in 1.4 / 1.18 as a fact fix. Not taken: leaving the wrong wording and filing it to another feature. Confirmed by the owner.
- **Loop-mode decision: human prerequisite.** Taken: pre-1 is recorded as already satisfied by the current session's login. Not taken: asking up front.
- **Q1 (resolved, owner: cleanup builds first).** The preferred order is that cleanup's Build lands first and this feature rebases. Cleanup's Plan is still `draft` (`plan-specmanager-simplification-cleanup-018` v2), and its "42 rows" figure needs re-pinning on its side.
- **Q8 (resolved, owner: fold into the next stacked release).** Recommended: fold into the next release on the stack, or bump the patch (1.2.0 → 1.2.1) if it ships alone. Never `main` while 1.0.3 is under review.
- **Word target.** About −1,450 words (≈ −9% → ≈ 14,800) and −10 to −14 Don't/Never lines. Both are directional, not binding: a target blocked by a floor is adjusted rather than over-cut.

## Notes on estimates

Points measure how hard it is to keep every rule while cutting, not how many words get cut. `planner.md` and the two dogfood runs get 3 because their judgement or harness setup is the heaviest part. The one-liner command trims get 1. Calibrate after the first phase: if per-file trims keep hitting `min` floors, the critique tasks were under-scored. Verification and the dogfood runs are their own tasks, so "same or better" stays a real gate rather than a footnote on the last trim.
