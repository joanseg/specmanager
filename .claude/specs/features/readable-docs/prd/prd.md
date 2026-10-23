---
id: prd-readable-docs-048
featureId: feat-readable-docs
stage: prd
status: approved
stale: false
title: Readable docs PRD
dependsOn: []
basedOn: {}
generatedBy: agent
version: 2
createdAt: '2026-10-23T20:11:37.179Z'
updatedAt: '2026-10-23T20:38:25.425Z'
---
## At a glance

- **What:** rewrite the doc-writing agent prompts so every SpecManager doc is short, decision-first and easy to follow, with no detail lost. Detail moves to an appendix; it is never dropped.
- **Who it covers:** prd-writer, architect, planner, walkthrough-writer, researcher (including HTML Docs), designer, and the loop's end-question rule. It also fixes the hyphen bug in the phase-heading parser.
- **Decided:** hard caps on the part people read; overflow goes to a details section; the loops check the caps. Existing docs are not rewritten.
- **For you to decide:** nothing open; decisions are at the end.
- **Top risk:** pinned `selftest-prompts` invariants. Each must be kept or deliberately re-pinned.

## Problem

The owner finds SpecManager's research docs and Builder docs "very verbose, too much detail, very hard to follow for humans". HTML doc copy has the same problem, and the designs look generic.

A read-only review of the Sprint-cowork board (`/Users/joan/Documents/SPRINT-PROJECTS/Sprint-cowork/.claude/specs/`) measured the problem [1]:

| Doc | Measured size |
|---|---|
| Research: market-research.md (pesso) | 100 KB / ~14,000 words, ≈12× the owner's ~8 KB hand-made reference. TL;DR ~920 words; `## Revenue model & forecast` 4,446 words |
| Research: 7 docs in one study | ≈50k words |
| Architecture | 368–412 lines (45–55 KB) |
| Plan | 208–233 lines; single lines up to 1,099 chars |
| Walkthrough | 334–474 lines |
| PRD | 148–231 lines |
| Mockup notes | 216–928 words per screen note; ~190 `<code>` tags per file |

### Causes, ranked [1]

1. **The lossless rule reads as "copy everything".** Density sentence 2 ("Every fact … must survive into your output") sits in prd-writer:24, architect:49, planner:67, walkthrough-writer:88 and researcher:14. It is pinned by INV-13/29, with its canonical text in `docs/agent-snippets/lossless-carryover.md`. So docs grow down the chain and keep their history ("What changed from v3", "revision 4", strikethrough, dated `## Review` sections).
2. **No summary first.** TL;DRs open with caveats and provenance. Architectures open with 5 paragraphs of amendments ("A1–A15 override this document").
3. **No length budgets** for Architecture, Plan or TL;DR. The PRD's "≤250 lines" is too loose. The researcher's only brevity rule ("Keep it tight") loses to the lossless rule.
4. **Process noise inline:** "per the brief", "(review fix)", "loop mode", ids in most sentences, `n/a (unsourced)` ×50 in one doc, M/B source superscripts on most sentences in HTML docs.
5. **Wide tables with paragraphs in cells:** plan Notes, architecture Affected-components rows of 60–120 words, market-size cells.
6. **Duplication:** the brief is restated in every research doc, the plan restates the architecture, the walkthrough quotes exit tests ~3×, and off-ramp Gates/defaults repeat PRD/architecture open questions.
7. **The market merge narrates conflicts** instead of resolving them (researcher.md:83 "Keep the section jobs' sections and figures as returned").
8. **Mockup notes are build specs** (designer.md:69): API routes, token names, ids. The designer's method checklist gets pasted into the doc, and open questions grow into a log (designer.md:76).
9. **Weak design in research Docs.** The one-pager uses the generic template designer.md warns against: system font, default purple #5b3fd6, 11px uppercase labels, no chart. designer.md:28 only says "if installed, defer to" frontend-design and never calls `Skill`. There is no render-and-critique step, and off-ramp 3-up rows overflow at 1200px. researcher.md:113–120 has no visual or copy rules. Doc titles are machine-made ("Pesso venture case and GTM lanzadera-update", researcher.md:91).
10. **Walkthrough and plan rules breed lab notebooks.** walkthrough-writer.md:32 says "quote the phase's exit criterion verbatim", :36 says "Cover every claim", :37 says "mirroring the exit checks". Planner :57 has table columns with no cell limit, and planner :19 piles decisions into Open questions. specmanager-loop.md:131–133 ("removed from, or marked resolved in") keeps resolved items.

## Users

- **Owner / stakeholder reading a doc** wants to grasp the decision and what they must decide in under a minute, then drill down only if needed.
- **Approver in the board or loop** needs to spot what changed and what is still open without reading history.
- **Downstream agents** (architect, planner, builder, reviewer) still need every fact, id and anchor. They read the details section and upstream docs by id.
- **Investor or partner reading a research HTML doc** needs a deck or one-pager that looks deliberate and lands one message per section.

## Goals

1. **Keep every fact, but make it reachable rather than repeated.** The density sentence stays byte-identical. One added line says a fact already upstream survives by its id; each fact lives once, in the doc that owns it; detail a reader doesn't need to decide goes to a details/appendix section at the end, never out of the doc.
2. **One shared readability rule for every doc-writing agent**, as a new snippet (e.g. `docs/agent-snippets/readable-doc.md`) with a snippet-parity entry:
   - open with `## At a glance` (≤12 lines, plain words: what it is, decisions made, what you need to decide, top risks);
   - tables ≤4–5 columns with short cells, ids in the last column;
   - ≤2 ids per sentence;
   - one idea per paragraph, ≤3 sentences, bullets one level deep;
   - cite as [n] with one Sources list;
   - never "this doc", "per the brief", versions or loop mode;
   - a rewrite states what is true now: fold answers in, delete resolved questions, no changelog sections (git holds history).
3. **Hard caps on the human-facing part; details are uncapped.**

   | Doc | Cap |
   |---|---|
   | Research brief | 600 words |
   | Market / marketing | 1,500 words each |
   | User research | 2,000 words |
   | Strategy | 800 words |
   | PRD | ≤120 lines (files, tests and endpoints belong to Architecture) |
   | Architecture | ≤150 human lines plus agent detail; one mermaid sequence diagram; amendments merged into the body |
   | Plan | Overview ≤5 lines; exit test ≤3 lines; Notes ≤25 words (longer goes to `### Task details` inside the phase section; the reviewer slice takes the whole phase section) |
   | Walkthrough | ≤200 lines; exit criterion quoted once; one line per pass criterion; samples ≤6 lines; troubleshooting ≤6 rows |

4. **Research docs lead with the decision.**
   - The TL;DR is the decision in one sentence plus 3–5 bullets, each with one number.
   - Each section opens with a "So what:" line.
   - The market merge picks one figure for the body and moves the other to the appendix.
   - The brief is referenced by id, never pasted.
   - Market, marketing and user research get an optional `## Appendix` after their pinned heading lists.
5. **Outstanding HTML designs and copy** (designer and the research Docs job):
   - **Design pass:** a mandatory `Skill` call to `frontend-design:frontend-design`, with the fallback method kept. Pick a deliberate aesthetic direction, use a type scale with a display size ≥32px and a grid, add a chart where numbers compare, and avoid the system-font/purple/uppercase-label template.
   - **Self-critique:** render at 1200px and 720px, then fix overflow, filler, notes that outweigh the screens, and a generic look.
   - **Mockup notes:** `<h2>` ≤8 words plus ≤60 words on what and why; builder detail goes in `<details><summary>Build notes</summary>`. Open questions list unresolved items only, ≤6. The method is never printed in the file. Each state appears once; a light/dark twin only when it differs in more than colour. Rows use flex-wrap.
   - **Research Docs copy:** headline ≤8 words, one message per slide or section, ≤40 words of body, no ids or process text, sources in a footer. Decks run 8–12 slides (title, problem, solution, proof, market, model, ask) with takeaway headlines. Titles read like a person wrote them ("Pesso — Lanzadera update").
6. **Loop end questions:** once a question is answered, the loop removes it and folds the answer into the body instead of marking it resolved.
7. **The loops' review checks the caps** (Builder loop and research loop).
8. **Fix the phase-name hyphen bug.** `core/spec-slice.ts:23` `matchPhaseHeading` uses `/^##\s+Phase\s+([^\s—-]+)/`, which stops at a hyphen (`loop-docs` becomes `loop`). The fix comes with a `selftest-specslice` case.

### Keep (do not regress) [1]

- Sourcing honesty: never invent, mark gaps `n/a`.
- Decision tables (D1–D9), and R-ids and anchors (traceability and deterministic slicing).
- [V]/[A]/[D] evidence tags, with the legend moving to the details section.
- Realistic mock data that adds up, full state coverage in mockups, short in-app microcopy.
- Kill signals and V1 decision rules.
- The exit check → command → expected rigour.
- The owner's rewritten Lanzadera doc (`research/pesso-venture-case-and-gtm/docs/lanzadera-update.html` + `lanzadera-copy.md`: short headlines, one idea per section, bar chart, single ask). It is the template for one-pagers and decks.

## Non-goals

- Rewriting existing docs in any project. Only future drafts change.
- Board UI changes. This feature touches only agent and command prompts, prompt self-tests and one core parser.
- New gates or stages, and any change to staleness or approval rules.
- Dropping information to hit a cap. Overflow always moves to the details section.

## Success metrics

Re-run one research loop and one Builder loop on a sample and compare against the baseline above [1]:

- The human-facing part of every doc is within its cap.
- A market-research doc's body is near the owner's ~8 KB reference, not 100 KB.
- No changelog or revision sections, and no resolved questions left in docs.
- Every upstream fact is reachable, either by id or in the details section. A spot-check finds no dropped facts.
- The research one-pager and deck pass the 1200px and 720px render checks (no overflow, a chart where numbers compare, no generic template).
- `selftest-prompts` (including the new snippet parity) and `selftest-specslice` (including the hyphen case) pass.

## Constraints & assumptions

- **Pinned invariants in `server/src/selftest-prompts.ts` must be kept or deliberately re-pinned in the same change** [1]:
  - INV-13/29: the density sentence, byte-identical in all 5 carriers.
  - INV-14a–e: the designer fallback phrases, exactly once each.
  - INV-36a "No vendoring" (max 2) and INV-36b "graceful degradation" (max 2); the builder already holds both.
  - INV-37 "source of truth" (max 4).
  - INV-56a–f: the research heading lists. INV-56b's wireframes lines stay adjacent and unchanged.
  - INV-57a "never invent" (3..3) and INV-57b "`n/a (unsourced)`" (6..6), across the agent and the research command. New text avoids these phrases or re-pins them.
  - INV-25 "Don't approve", INV-30 "outside `.claude/specs/`", INV-11 basedOn.
  - INV-45/46/48: the planner phrases.
  - Walkthrough pinned strings: "Emit in this order…", "**Part 1 — `## Stakeholder test guide`** (first)", "**Last — `## Lessons learned`.**", "It opens with **`### Git strategy`**".
  - The planner Scale line and `## Phase` headings, which core parses.
- **Snippet rule:** a fragment changes in `docs/agent-snippets/` and in every carrier in one commit (repo CLAUDE.md).
- **Existing drift:** the planner's design-grounding text no longer matches `docs/agent-snippets/design-grounding.md` (parity entry near `selftest-prompts` line 266). Assumption: this feature reconciles it while editing the planner.
- **New invariants are needed** for the optional `## Appendix` heading, and the research loop's heading check must allow it.
- **No model or API calls from the plugin.** The `Skill` call runs inside the agent, so the plugin itself still makes none.
- **Assumption:** `frontend-design` may not be installed. The fallback design method stays and must still produce the deliberate look.
- **Release:** prompt and `server/dist` changes ship as a release (version bump, rebuild, `selftest-directory`, `claude plugin validate`).

## High-level user flows

- **Builder doc:** the owner runs a stage or the loop. The doc opens with At a glance, the body stays within its cap, and detail sits in the details section. The loop review flags any doc over its cap before approval.
- **Re-draft after feedback:** the doc says what is true now. Answered questions disappear into the body, and there is no "what changed" section.
- **Research study:** each doc opens with a one-sentence decision plus numbered bullets. Sections start with "So what:", conflicting figures resolve to one, and the brief is linked by id.
- **Research HTML Doc:** the researcher runs a design pass, renders at two widths, fixes problems and saves a deck or one-pager with takeaway headlines and a human title.
- **Mockups:** each screen has a short why-note, and builder detail is collapsed under Build notes.

## Decisions (owner, 2026-10-23)

- **Over cap:** the agents respect the caps; when a doc still runs over, the loop moves clear-cut overflow into the details/appendix section, otherwise it asks. HTML Docs that run long become an end question.
- **Caps:** kept as in Goal 3 (research 600 / 1,500 / 1,500 / 2,000 / 800 words; PRD ≤120 lines; Architecture ≤150 lines before `## Details for agents`; Plan Notes ≤25 words; walkthrough ≤200 lines).
- **Measures, TL;DR, reviewer, drift:** as resolved in `arch-readable-docs-033` (D3–D7).
- **Proof:** the walkthrough re-runs the research loop on the Pesso study and a Builder loop on a small feature, and compares sizes and readability with the baseline above.

## Sources

[1] Readable docs review, 2026-10-23 (`/private/tmp/claude-501/-Users-joan-Documents-projects-specmanager/69c980ca-b33b-4be9-bd7b-8e970417308f/scratchpad/readable-docs-review.md`; screenshots `scratchpad/review-*.png`). Facts are carried above because the scratchpad is temporary.
