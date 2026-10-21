---
id: prd-researcher-mode-046
featureId: feat-researcher-mode
stage: prd
status: approved
stale: false
title: Researcher mode PRD
dependsOn: []
basedOn: {}
generatedBy: agent
version: 3
createdAt: '2026-10-21T12:50:25.843Z'
updatedAt: '2026-10-21T13:16:39.386Z'
---
## Problem

SpecManager starts at the PRD. It assumes the owner already knows what to build. Before that point, founders and PMs do discovery: market research, concept mockups to test, a user-research plan, interviews, a draft marketing plan. Then they combine all of it into a decision about what to build and in what order. Today all of that happens outside the tool, by hand. The owner just did it for an "oposiciones" exam-prep app in Spain. Because the research lives outside the repo:

- None of it is git-tracked next to the specs, and none of it reaches the agents that draft PRDs.
- Every research doc gets restructured from scratch. Nothing guarantees the method is consistent (scoring sheets, decision rules, pricing questions).
- Interview results get pasted into the user-research doc by hand. Nothing turns them into scores, quotes and a competitor scorecard.
- Turning "what to build" into Builder features is a manual re-typing step, so research context gets lost.

Researcher mode adds a discovery workspace in front of the existing lifecycle and ends in a handoff into it.

## Users & jobs-to-be-done

| User | Job |
|------|-----|
| Solo founder / indie hacker | Go from a product idea to an evidence-backed, ordered build list and a launch plan before writing any PRD. |
| Product manager | Run several discovery studies at once (per product idea or market) with a consistent method, and hand the winning items to engineering with context attached. |
| Owner running interviews | Drop transcripts or notes in and get scoring sheets, quotes and a competitor scorecard filled, without data entry. |
| Builder-mode user (today's user) | Keep the current board unchanged, and get new features pre-seeded with research context when they come from a study. |

## Goals

1. **Two modes, one board.** A toggle in the board's top bar switches between **Builder** (today's board: features and PRD→Walkthrough docs, unchanged) and **Researcher** (a new view of research studies).
2. **Many studies per project.** A project holds several research studies (also called tracks), for example one per product idea or market. Each study has its own set of docs and its own strategy.
3. **Four drafted research docs per study**, each drafted by Claude in the session:
   - **Market research.** TL;DR · market size (table with sources) · competitor landscape (direct, AI newcomers, generic substitutes, indirect) · gaps & opportunity · what to build (positioning, MVP, V2, moat, risks) · revenue model & forecast (base/conservative/upside by year, unit economics) · next steps · sources (links).
   - **Concept designs.** One canvas of concept screens to show interviewees for scoring. The reference has 6 phone screens labelled A–F, including a pricing screen.
   - **User research plan.**
     - Research questions.
     - Method: screener survey, interviews + concept test, expert interviews, fake-door smoke test, concierge test, timeline, recruit mix, where to recruit.
     - Screener survey.
     - Interview guide: context, competitor teardown, concept test with Utility/Confidence/Intent scores (1–5), forced ranking, 100 € split, pricing with Van Westendorp.
     - Expert interviews.
     - Scoring sheets: per-participant concept scores, competitor scorecard.
     - V1 decision rules, agreed upfront.
     - Synthesis output.
   - **Marketing plan (draft, revisited after research).** Positioning · launch segments · channels table with KPIs · launch plan · calendar hooks · budget · funnel KPIs · to-revisit-after-research list.
4. **Interview findings captured.** The user drops transcripts or notes into a folder, or pastes them in a session. A command then has Claude fill the user research doc's scoring sheets, quotes and competitor scorecard.
5. **Strategy summary.** Once findings are in, Claude updates the research docs and produces one **strategy** doc per study. It summarises the learnings and gives an **ordered "what to build" list** aligned with the marketing plan, judged against the decision rules agreed upfront.
6. **Handoff to Builder.** Items from the strategy's ordered list can create Builder features, triggered from the board or a command. Each new feature's PRD drafting reads the strategy plus the relevant research, so no context is re-typed.
7. **Full flow in v1.** All of the above ships in v1. A phased plan is expected (Architecture/Plan decide the phase cut).

## Non-goals

- **Changing Builder mode.** The existing lifecycle, gates, staleness, columns and commands keep their current behaviour.
- **A board form for interview data in v1.** Findings come in only by pasting or dropping notes.
- **Running research from the plugin.** The plugin server makes no web, model or API calls (CLAUDE.md conventions). Web research is Claude's job in the session.
- **Recruiting, scheduling or running interviews,** survey hosting, fake-door hosting or analytics collection. The plan describes these. The user does them.
- **Replacing Marketing phase** (`prd-marketing-phase-035`). That puts a per-feature Market & demand section and keyword data into Builder PRDs. Researcher mode's marketing plan is study-level and pre-feature. Their relationship is an open question (Q6).
- **Treating the oposiciones example as scope.** It defines the shape of each doc, not product content.
- **Designing the solution here:** storage layout, doc schema, new stages or kinds, command names and UI layout belong to Architecture/Design.

## Success metrics

- **End-to-end on a real study:** the owner re-runs the oposiciones study inside SpecManager. They get all four research docs, findings filled from pasted notes, a strategy doc, and at least one Builder feature created from the strategy, with no hand-copying between tools.
- **Doc shape parity:** each drafted research doc contains every section listed in Goal 3 (checkable by section headings).
- **Findings fill:** for a set of pasted transcripts, every participant appears in the scoring sheet with Utility/Confidence/Intent scores, or is marked missing, and quotes and the competitor scorecard are filled. Scores are never invented when the notes lack them.
- **Handoff fidelity:** a PRD drafted for a handed-off feature cites the strategy and the relevant research docs by id.
- **No Builder regression:** existing self-tests stay green, and a Builder-only user sees no change except the toggle.
- **Multi-study:** two studies in one project stay independent (docs, findings, strategy).

## Constraints & assumptions

- **No model or API calls from the plugin** (CLAUDE.md convention). Market research runs in the Claude session through subagents using web search. The plugin README and data-handling answers stay accurate. If anything here changes that, both are updated in the same release.
- **Plain markdown in the target repo** under `.claude/specs/`, git-tracked, with frontmatter authoritative and `manifest.json` a rebuildable cache, like existing docs. Architecture decides the exact location. *(Assumption.)*
- **Concept designs are self-contained HTML mockups** like the designer's design briefs, rendered verbatim in the board's sandboxed `<iframe>` and not edited in the board. *(Assumption.)*
- **Shared core:** every research mutation, whether from an agent or the board, goes through `core`, so the MCP and REST views cannot drift (architecture invariant).
- **Gate and staleness logic stays in `core`,** never in prompts. Any ordering among research docs (for example, strategy after findings) is enforced there if it is enforced at all. *(Assumption: research docs are drafts the user edits. Whether they carry approve/stale states is Q2.)*
- **Approval:** only `/specmanager-loop` approves docs (INV-25). New research agents and commands keep "Don't approve".
- **Interviews stay outside the staleness graph** for the existing pre-PRD `kind: "interview"` doc. User-research interview notes are a different artifact. Naming them apart avoids confusion (Q4).
- **Local, single-user,** bound to `127.0.0.1`, no auth (unchanged).
- **Handoff assumption:** a handed-off feature is created through the existing feature creation path, so normal gates apply from then on. Research context is something the PRD reads, not a gate input.
- **Prompt invariants:** new agents and commands must pass `selftest-prompts`, including snippet parity in `docs/agent-snippets/`.
- **Release:** this is a minor version bump. If packaging changes, a surface test is required (see the Releasing section of CLAUDE.md).
- **Phased delivery is expected** because v1 is the full flow.

## High-level user flows

1. **Switch mode.** The user opens the board and flips the top-bar toggle to Researcher. They see their studies, or an empty state that offers to start one. Flipping back shows today's Builder board unchanged.
2. **Start a study.** The user gives a study name and a one-line idea or market, from a command or the board. A study is created with empty slots for the four research docs and the strategy.
3. **Market research.** A command dispatches Claude subagents with web search. They draft the market research doc with sourced tables and links. The user edits it in the board.
4. **Concepts.** Claude drafts one HTML canvas of concept screens (A–F style, including pricing), grounded in the market research. It renders in the board for showing to interviewees.
5. **User research plan.** Claude drafts the plan: method, screener, interview guide with scoring and pricing blocks, empty scoring sheets, and V1 decision rules agreed upfront. It references the concepts by letter.
6. **Marketing plan (draft).** Claude drafts positioning, segments, channels with KPIs, launch plan, calendar hooks, budget, funnel KPIs and a to-revisit list.
7. **Capture findings.** The user runs the interviews outside the tool. They drop transcripts or notes into the study's folder, or paste them in a session, then run the findings command. Claude fills scoring sheets, quotes and the competitor scorecard in the user research doc.
8. **Synthesize.** A command has Claude revise the research docs, including the marketing plan's to-revisit items, and write the strategy doc: learnings, decision-rule outcomes, and an ordered what-to-build list tied to the marketing plan.
9. **Hand off.** From the strategy, by board action or command, the user picks one or more items. Each becomes a Builder feature seeded with a link to the strategy and research. `/specmanager-prd` (or `/specmanager-loop`) for that feature reads them while drafting.

## Open questions

1. **Storage location and model.** Is a study a new top-level entity, for example `.claude/specs/research/<study>/`, or a variant of a feature? Do research docs reuse the stage enum or get new kinds? *(Architecture.)*
2. **Lifecycle semantics — resolved (owner): no approval; the PRD command or loop reads the research as it is at that moment.** Do research docs have draft/approved status, gates (for example, strategy only after findings) and staleness (for example, findings marking the strategy stale)? Or are they free-form drafts?
3. **Loop support — resolved (owner): not in v1.** Should `/specmanager-loop` (or a sibling) run a whole study end to end, given that the interviews are a human step in the middle?
4. **Findings intake — resolved (owner): notes tracked in git with personal data masked.** Exact drop folder and accepted formats (txt, md, audio transcripts, PDFs)? Should the raw notes be git-tracked, given that participant PII may be in them? Is redaction needed?
5. **Re-synthesis.** When more interviews arrive after a strategy exists, is the strategy updated in place or versioned? What happens to features already handed off?
6. **Overlap with Marketing phase — resolved (owner): ignored entirely; no link between the two features.** (`prd-marketing-phase-035`). Should the study's marketing plan and keyword demand data feed each other? Does a handed-off feature's Market & demand section inherit from the study?
7. **Handoff link.** How is research provenance recorded on a feature: frontmatter reference, `dependsOn`, or a separate link? Can a strategy change mark handed-off PRDs stale?
8. **Concept canvas format.** Phone-only, or also desktop/web concepts? Is the screen count fixed at 6?
9. **Toggle state.** Is the selected mode remembered per project or per browser? Does the managed CLAUDE.md block list studies?
10. **Web search availability.** What happens when the session has no web search tool? Draft market research marked "unsourced", or refuse? Numbers must never be invented.
