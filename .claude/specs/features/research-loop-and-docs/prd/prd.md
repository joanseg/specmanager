---
id: prd-research-loop-and-docs-047
featureId: feat-research-loop-and-docs
stage: prd
status: approved
stale: false
title: Research loop and docs PRD
dependsOn: []
basedOn: {}
generatedBy: agent
version: 2
createdAt: '2026-10-22T14:49:10.087Z'
updatedAt: '2026-10-22T17:34:38.011Z'
---
## Problem

Researcher mode (`feat-researcher-mode`, built against `prd-researcher-mode-046` and `arch-researcher-mode-031`) works well. Two gaps remain:

- **Running a study takes one command per step.** The owner runs `/specmanager-research <study> market`, then `concepts`, then `plan`, then `marketing`. Each step starts from a one-line `idea` in `study.json`, so the context behind the idea (market, audience, goals, constraints) never gets stated once and reused. Builder mode already has `/specmanager-loop`: it asks its questions up front, drafts every stage, reviews across the docs once, asks the remaining questions at the end, and applies the answers. Researcher mode has nothing like it. `prd-researcher-mode-046` Q3 and `arch-researcher-mode-031` open question 2 deferred loop support from v1 and asked whether a loop over the steps before findings would be wanted later. This feature says yes.
- **Concepts are one fixed canvas.** Each study has one `concepts.html` (kind `concepts`, one doc per kind, enforced by deterministic ids in `core/research.ts`). Discovery needs several HTML artifacts per study, each for a different audience: wireframes to show interviewees, a presentation for clients, and decks for partners or investors. They are not all useful at the same point in a study. The name "Concepts" also undersells them. These are **Docs**.

## Users & jobs-to-be-done

| User | Job |
|------|-----|
| Solo founder / indie hacker | Go from an idea to a complete set of interview-ready research docs (brief, market research, docs, user-research plan, marketing plan) in one run, answering questions only at the start and the end. |
| Product manager | Produce audience-specific HTML artifacts from one study, such as wireframes for interviews and a deck for clients, partners or investors, without re-briefing Claude for each one. |
| Existing Researcher-mode user | Keep existing studies working. Today's concepts canvas becomes a wireframes doc, and user research still references its screens by letter. |
| Builder-mode user | No change. |

## Goals

1. **`/specmanager-research-loop` command.** In one run it drafts a study's pre-interview steps in this order: **business brief → market research → docs → user-research plan → marketing plan**. Its shape follows `/specmanager-loop`:
   - opening questions before anything is written;
   - each step drafted by its subagent (the `researcher` agent, as `/specmanager-research` does today);
   - one cross-doc review pass;
   - end questions;
   - one last update of the docs from the answers.
   It stops before findings, strategy and handoff, which need real interviews.
2. **Business brief doc.** The loop's opening questions (idea, market, audience, goals, constraints) produce a **brief** doc saved in the study. Every later step reads it.
3. **Concepts become Docs.** The Concepts step and column become **Docs**: many HTML docs per study, each with a doc type.
   - Preset types: **wireframes** (for user research), **client presentation**, **partner presentation**, **investor deck**, **one-pager**.
   - A free-text **custom** type.
   - Every Doc is self-contained HTML.
4. **Relevance-filtered Doc selection.** The loop asks in its opening questions (owner decision, so drafting never pauses), and the docs command at its Docs step; both offer only the Doc types that are relevant at that point in the study. For example, wireframes come before user research, while an investor deck may wait until after the strategy. It asks the user (`AskUserQuestion`) to confirm which Docs to make before drafting.
5. **Docs command.** A docs step in `/specmanager-research` (the successor of the `concepts` step) asks which Docs to make, using the same relevance filter, and drafts them. It runs at any point in a study, not only inside the loop.
6. **Migration.** An existing `concepts.html` becomes a Doc of type `wireframes`. User research keeps referencing wireframe screens by letter (A, B, …). Existing studies keep working: their docs, notes, findings, strategy and handoffs are unaffected.
7. **Board.** The Researcher grid's Concepts column becomes a multi-doc **Docs** column. The study shows its brief doc.

## Non-goals

- **Findings, strategy or handoff in the loop.** They need real interviews. Those steps keep running through `/specmanager-research`.
- **Approval states for research docs.** Research docs still have no approval (`prd-researcher-mode-046` Q2). The research loop approves nothing. This differs from `/specmanager-loop`, which approves each doc. INV-25 ("Don't approve") is unchanged.
- **Non-HTML Doc formats** (.pptx, .pdf, .docx export) and editing Docs in the board. Docs render read-only, as concepts do today.
- **Changing Builder mode,** `/specmanager-loop` or Builder gates.
- **Model or API calls from the plugin.** All drafting, and any web research, runs in the Claude session.
- **Designing the solution:** storage layout, doc-type schema, id scheme, gate changes, command argument shape and UI layout belong to Architecture and Design.

## Success metrics

- **One-run study:** starting from only an idea, `/specmanager-research-loop` produces a brief, market research, at least one Doc (wireframes, when the user picks it), a user-research plan and a marketing plan, with user interaction only at the opening questions (which include the Doc confirmation) and the end questions.
- **Loop shape parity with `/specmanager-loop`:** opening questions come before any write; there is exactly one review pass; end questions are answered and applied in one final update; the run ends with a report of every doc's id, version and path, the review fixes applied, and questions answered vs still open.
- **Brief grounding:** every doc the loop drafts names the brief by id among its upstream sources.
- **Multi-Doc:** one study holds two or more Docs, including two of different preset types plus one custom type, and each renders in the board's sandboxed iframe.
- **Relevance + confirmation:** no Doc is drafted without the user confirming its type in that run.
- **Migration:** an existing study with `concepts.html` shows it as a wireframes Doc. Its user research still resolves screen letters. Findings, strategy and handoff behave as before.
- **No regression:** existing self-tests (including `selftest-research` and `selftest-prompts`) stay green, updated only where the concepts → Docs rename requires it.

## Constraints & assumptions

- **Same HTML rules as concepts today:** every Doc is self-contained HTML, goes through the same sanitiser (`sanitizeDesignBriefBody`), is capped at 5 MB (`DESIGN_BRIEF_MAX_BYTES`), and renders verbatim in the sandboxed iframe. Concepts mock the study's product, not this repo's UI (`arch-researcher-mode-031`). *(Assumption: this applies to every Doc type.)*
- **No approval:** the loop approves nothing. Research docs still have no approve or stale states.
- **Gates stay in `core`:** any ordering involving the brief or Docs is enforced in `core`, never in prompts (architecture invariant).
- **Every mutation goes through `core`,** so MCP and REST cannot drift. Frontmatter is authoritative and `manifest.json` stays a rebuildable cache.
- **Loop runs in the main session,** like `/specmanager-loop` and `/specmanager-research`: questions, review and end questions are conversation, while drafting goes to `researcher` subagents. Market research keeps its three parallel section jobs plus one merge.
- **No model or API calls from the plugin.** The plugin README and data-handling answers stay accurate.
- **Unsourced rule unchanged:** numbers and scores are never invented (`n/a (unsourced)` / `missing`). This also covers figures in presentations and decks. *(Assumption.)*
- **Existing studies keep working** through migration. A study with no brief stays usable by the step command. *(Assumption: the brief is not a hard gate for existing studies; see Q2.)*
- **Prompt invariants:** the new command and the changed agent/command must pass `selftest-prompts`, including the Don't-approve row, the no-builder-dispatch row, and snippet parity in `docs/agent-snippets/`.
- **Release:** minor version bump. Because `ui/` changes, the owner opens and saves a doc in the board. A surface test is needed only if packaging changes.
- **Loop scope** is brief → market → docs → user-research plan → marketing plan, and nothing else.

## High-level user flows

1. **Research loop.** The user runs `/specmanager-research-loop <idea or study>`.
   - The opening message says what will run, that nothing gets approved, and that the loop stops before findings.
   - Opening questions cover idea, market, audience, goals, constraints, and which Docs to make (only the relevant ones, typically wireframes, are offered). Each question offers "decide for me", and gaps become assumptions.
   - The study is created if new. The brief is saved.
   - Market research is drafted, reading the brief.
   - The Docs step drafts each Doc confirmed in the opening questions.
   - The user-research plan is drafted, referencing wireframe screens by letter, then the marketing plan.
   - One review pass across all the docs fixes clear-cut issues. The rest become end questions.
   - End questions are asked, the docs get one final update, and a report lists each doc, the fixes made, open questions, and the next step (run interviews, then `/specmanager-research <slug> findings`).
2. **Docs on demand.** Later, for example after the strategy, the user runs the docs step. It offers the Doc types relevant now (for example an investor deck or a partner presentation), the user confirms, and each Doc is drafted from the study's current docs.
3. **Custom Doc.** The user picks "custom" and types a doc type (for example "pilot proposal for a school"). It is drafted as HTML like the presets.
4. **Board.** In Researcher mode, a study row shows its brief and a Docs column listing each Doc by type. Opening a Doc renders it in the sandboxed iframe.
5. **Existing study.** An existing study opens in the board with its old concepts canvas listed as a wireframes Doc. Every other step works unchanged.

## Open questions

1. **Brief for the step command.** Can `/specmanager-research` create or update the brief as a step of its own, or only the loop? Is the loop's brief editable in the board like the markdown research docs?
2. **Brief as a gate.** Does market research require a brief for new studies? Existing studies have none (see the assumption above), so do they get one backfilled from `study.json#idea`, or simply stay brief-less?
3. **Relevance rules.** Which Doc types count as relevant at which point? For example: wireframes before user research; client, partner and investor decks after market research or only after the strategy; one-pager at any time. Is the rule fixed in `core`, or a recommendation the agent makes and the user confirms?
4. **Doc dependencies.** Which upstream docs each Doc type reads and records (brief, market, user research, strategy). Does a deck drafted after the strategy appear as "outdated" when the strategy changes?
5. **Multiple wireframes.** Can a study have more than one wireframes Doc? If so, which one do user-research screen letters refer to, and what does the strategy record as its upstream?
6. **Re-running the loop on an existing study.** Does it skip steps whose docs exist (like `/specmanager-loop` reusing approved docs), ask per doc, or rewrite them in place?
7. **Step name.** Is the old `concepts` step argument kept as an alias for the docs step, for existing users?
8. **Migration timing.** Does `concepts.html` migrate in place on first read or by an explicit one-off action? Are the existing `concepts-<slug>` ids kept?
9. **Loop naming.** Is the command `/specmanager-research-loop`, or a mode of `/specmanager-loop`? The intent names `/specmanager-research-loop`; this PRD assumes it.
10. **Design inputs for decks — resolved (owner): one shared style per study.** Should presentations and decks share one visual style per study (derived from the brief), or be styled independently per Doc?
