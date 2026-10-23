---
id: plan-readable-docs-027
featureId: feat-readable-docs
stage: plan
status: approved
stale: false
title: Readable docs plan
dependsOn:
  - arch-readable-docs-033
basedOn:
  arch-readable-docs-033: 1
generatedBy: agent
version: 2
createdAt: '2026-10-23T20:19:06.935Z'
updatedAt: '2026-10-23T20:20:37.968Z'
---
## Overview

Ships `arch-readable-docs-033`: shorter, decision-first doc prompts for the six writers and both loops, two new snippets, Part I prompt pins, and the `matchPhaseHeading` hyphen fix.
One phase: 37 points, no spike or size trigger. It ends as release 1.6.0.

**Scale:** `1` trivial · `2` small · `3` moderate · `5` substantial · `8` large · `13`/`21` epic.

*Every task below is ≤3 points; the work was small enough that nothing needed splitting.*

| Phase | Theme | Points |
|---|---|---|
| readable | Readable doc prompts, pins and the hyphen fix | 37 |
| **Total** | | **37** |

---

## Phase readable — Readable doc prompts, pins and the hyphen fix

**Exit test:** `cd plugins/specmanager/server && npm run build && npm run selftest-prompts && npm run selftest-specslice && npm run selftest-stopgate && npm run selftest-directory` all pass.
*(Doc-length outcomes are checked by the walkthrough's sample loop re-run, not here.)*

| # | Task | Pts | Notes |
|---|---|---|---|
| 1.1 | Fix `matchPhaseHeading` hyphen cut and add selftest-specslice cases | 2 | Four heading cases plus one hyphenated `getSpecSlice` case; update the doc comment. R8, D9 |
| 1.2 | Add the "Survive means *reachable*" line to lossless-carryover and its 5 carriers | 2 | Density sentence stays byte-identical; one commit for snippet and carriers. R1 |
| 1.3 | Create `readable-doc.md` snippet and carry it verbatim in the 5 markdown writers | 3 | Header names carriers; at-a-glance name per agent per D2. R2 |
| 1.4 | Add the adapted-framing sentence to the design-grounding snippet header | 1 | Header only; no agent text changes. D7 |
| 1.5 | prd-writer: `## At a glance`, ≤120-line cap, optional details marker | 2 | Replaces the "≤250 lines" line 22. R3 |
| 1.6 | architect: new section order, ≤150-line cap, one sequence diagram, merged amendments | 2 | Anchor convention text unchanged; detail after `## Details for agents`. R2, R3 |
| 1.7 | planner: Overview/exit/Notes caps, `### Task details` rule, `## Decisions` list | 3 | No `---` or `##` inside Task details; never cite `details-for-agents`. R3, R6, D8 |
| 1.8 | walkthrough-writer: ≤200-line cap and rewrite lines 32, 36, 37 | 2 | Pinned INV-50a–e strings and emit order untouched. R3 |
| 1.9 | researcher study docs: TL;DR, "So what:", word caps, Appendix lines, one-figure merge | 3 | Avoid "never invent" and backticked `n/a (unsourced)`; tag legend moves to Appendix. R3, R4 |
| 1.10 | Create `design-pass.md` snippet; designer carries it and gets the notes rules | 3 | Keep INV-14a–e and "No vendoring" once; avoid INV-37 and INV-36b phrases. R5 |
| 1.11 | specmanager-loop: cap-check bullet, fold answered questions, gather `## Decisions` | 2 | Rewrite step 11 wording and the line-100 loop-mode rule string. R6, R7 |
| 1.12 | specmanager-research-loop: cap-check bullet, optional `## Appendix`, fold answers | 2 | Step 12 wording spans two lines today; rewrite it whole. R6, R7 |
| 1.13 | researcher Docs job: carry design-pass, copy rules, deck shape, human title | 2 | Title change is safe: slug comes from `docType`. R5 |
| 1.14 | selftest-prompts Part I: INV-66, INV-67a–c, INV-68a/b, INV-69 | 3 | Pinned text copied from the snippets, so rows double as parity. Prompt invariants |
| 1.15 | selftest-prompts Part I: INV-70a/b, INV-71, INV-72, INV-73, header comment | 2 | INV-71 is a 0..0 negative over both loops. Prompt invariants |
| 1.16 | Repo CLAUDE.md: name the two new snippets and their carriers | 1 | Layout's `docs/agent-snippets/` line only. Conventions |
| 1.17 | Release: bump 1.5.0 → 1.6.0, rebuild `server/dist`, directory checks | 2 | `selftest-directory` and `claude plugin validate`; no packaging change, so no surface test. Conventions |

### Task details

- **1.7** — The plan heading parser and `exitTestForPhase` read only the `## Phase` line and the one `**Exit test:**` line; keep both shapes.
- **1.14 / 1.15** — Counts are exact; re-pin deliberately, never loosen. Run `selftest-prompts` after each prompt task (1.2–1.13) so existing pins stay green.

---

## Risk & sequencing notes

- 1.1 lands first: it is independent and unblocks hyphenated phase names in later features.
- 1.2 and 1.3 precede the per-agent edits (1.5–1.9), which build on the carried text. 1.10 precedes 1.13.
- Snippet changes and their carriers go in one commit; a diverged copy fails `selftest-prompts`.
- Pins at their max (INV-37 at 4, INV-36b at 2, INV-57a/b, INV-64g) break on one stray phrase. Each prompt task greps before committing.
- Rollback is a plain revert; only 1.1 touches runtime code.

## Test strategy

- 1.1 adds `selftest-specslice` asserts with the fix.
- Every prompt task runs `npm run build && npm run selftest-prompts` against existing pins.
- 1.14–1.15 add the Part I rows once the pinned text exists.
- 1.17 runs the full exit test plus `claude plugin validate plugins/specmanager`.

## Human prerequisites

None.

## Open questions

- **Decided: one phase.** 37 points, no core unknowns. Alternative not taken: split the core fix from the prompt work.
- **Decided: no spike.** Architecture risks are assumptions, not unknowns. Alternative not taken: a spike on loop cap counting.
- **Decided: no prerequisites or test account.** No UI changes. Alternative not taken: a reviewer login.
- **Decided: Part I rows after the prompts.** Alternative not taken: write each row with its prompt task.
- **Assumption (arch risk):** the loop counts caps with one `awk` over `filePath`, skipping frontmatter.
- **Assumption (arch risk):** no browser tool means a static HTML check, noted in the report, never a failure.
- **Drift:** the research loop's "marked resolved in" wraps across two lines, so INV-71 depends on 1.12 rewriting it.
- **Drift:** the loop-mode rule string (`specmanager-loop.md:100`) and planner line 19 are unpinned; 1.7 and 1.11 change them together.
- **Success metric:** the sample research and Builder loop re-run (`prd-readable-docs-048` Success metrics) is a walkthrough step.
- **Git strategy:** base branch and commit layout are proposed at build step 6a.

## Out of scope

- Rewriting existing docs in any project.
- `agents/reviewer.md`, `agents/builder.md`, `commands/specmanager-research.md`, `commands/specmanager-design.md`, `core/active-card.ts`, all of `ui/`.
- New gates, stages, staleness or approval rules.
- Rebuilding `ui/dist`.

## Notes on estimates

Points are relative complexity, not hours; recalibrate after the first phase. The 3s carry new snippets or many pinned-phrase traps. Pins and release are their own tasks so "tests pass, release validates" stays a real gate.
