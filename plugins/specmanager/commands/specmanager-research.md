---
description: Run one step of a SpecManager research study (brief, market research, Docs, user-research plan, marketing plan, findings, strategy, handoff) via the researcher subagent. Starts a new study if it doesn't exist yet.
argument-hint: "<study> [new|brief|market|docs|concepts|plan|marketing|findings|strategy|handoff]"
---

Run a research step for: **$ARGUMENTS**.

The first token is the study (its `id`, `slug` or title); the optional second token is the step. Anything after that is extra context to forward to the subagent. `plan` is the user-research plan (kind `user-research`). `concepts` is an alias of `docs`.

## Steps

1. **Resolve the study.** Call `list_studies`. If a study's `id` or `slug` matches the first token, use it. If none matches, or the step is `new`, offer to start one: ask for a short title and the idea or market in one line, then call `create_study({ title, idea })` and report its `id`, `slug` and folder. After `new`, stop. With no argument, list the studies and ask which one.
2. **Pick the step.** With no step given, use the study's `nextStep` from `list_studies`. If `nextStep` is `null`, report that the study is complete and stop.
3. **Check the gate.** Find the step in the study's `steps[]` (`plan` → `user-research`, `concepts` → `docs`). The brief is not a rail step and is always open. If it is `locked`, report its reason and the missing step to run first, then stop. There is no separate gate tool: `create_research_doc` and `handoff_study_items` enforce the gate in core anyway.
4. **Run the step.**
   - **market:** dispatch three `Agent({ subagent_type: "researcher", ... })` section jobs **in parallel**, in one message: `market-size`, `market-competitors`, `market-revenue`. Each returns its sections as text and writes nothing. Then dispatch **one** `market-merge` job with the study id and the three texts; it writes the single `market` doc.
   - **brief:** see Brief.
   - **docs** (alias `concepts`): see Docs.
   - **plan, marketing, strategy:** dispatch one `researcher` job with the study id, the job name (`user-research`, `marketing`, `strategy`) and the ids of the upstream docs from `list_studies`.
   - **findings:** first save any notes the user pasted in the conversation, then dispatch one `findings` job (see Notes intake).
   - **handoff:** see Handoff.
5. **Report.** Each doc's id, version and file path, plus the study's new `nextStep` from `list_studies`. Suggest opening it in the board (`/specmanager-board`, Researcher mode). After `user-research`, remind the user that findings needs real interviews: drop transcripts or notes in `notes/`, or paste them, then run `/specmanager-research <slug> findings`.

## Brief

1. Ask the five questions in this session with `AskUserQuestion` (at most four per call, so two calls): idea, market, audience, goals, constraints. Offer the study's `idea` as the recommended idea answer and a "decide for me" option on each question.
2. Build the opening Q/A block: `Original idea` (the study's `idea`), each question with its answer, and `Assumptions` (every "decide for me" answer, stated as the decision taken).
3. Dispatch one `researcher` `brief` job with the study id and the block. If `brief-<slug>` already exists, the job rewrites it in place.

## Docs

Runs any time after market research. Relevance is a recommendation, not a gate: the user confirms what to draft. No Doc is drafted without the user confirming.

1. **Read the study.** `list_studies`: which of `brief-<slug>`, `market-<slug>`, `mktg-<slug>`, `strategy-<slug>` exist, whether user-research has findings yet, and the existing Docs with their `docType` (a legacy `concepts-<slug>` is a wireframes Doc).
2. **Filter by relevance.** Offer only the types whose "Offered when" condition holds now. This table is the single home of the relevance rule; `/specmanager-research-loop` reads it from here.

   | docType | Offered when (recommended) | dependsOn (only ids that exist) |
   |---|---|---|
   | `wireframes` | market exists and user-research has no findings yet (pre-interview) | brief, market |
   | `client-presentation` | market exists | brief, market, strategy |
   | `partner-presentation` | market exists | brief, market, marketing, strategy |
   | `investor-deck` | strategy exists (before it, offered only as "after strategy is better") | brief, market, marketing, strategy |
   | `one-pager` | any time after market | brief, market, strategy |
   | custom (free text) | always, via "Other" | brief, market, plus any other existing doc the agent judges relevant |

3. **Confirm.** Ask one `AskUserQuestion` with `multiSelect: true`. Options: an "update existing <doc>" option for each existing Doc (a legacy `concepts-<slug>` first), then the relevant new types. When a wireframes Doc exists, recommend updating it over adding a second one. The built-in "Other" answer is a custom docType, kept as typed. If the user picks nothing, stop.
4. **Draft.** Dispatch one `researcher` `docs` job per confirmed Doc, with the study id and either its `docType` or the id of the existing Doc to update. Docs of different types go **in parallel**, in one message; Docs of the same type run **sequentially**, so each sees the one before it.
5. **Report** each Doc's id, version and file path.

## Notes intake (findings)

- **Pasted notes:** save each participant's pasted text with `Write` as `.claude/specs/research/<slug>/notes/<yyyy-mm-dd>-<participant-code>.md` (today's date, codes `P1`, `P2`, … continuing the study's existing codes). Save it **already masked**: the participant code instead of the name, and `[redacted]` for emails, phones, addresses and other identifying details. Never write a name or contact detail to disk.
- **Dropped files:** `.md`, `.txt` and `.pdf` in `notes/` are read; the findings job masks them in place before ingesting. Any other format (audio, video, images) is skipped: report each skipped file by name and ask for a transcript instead.
- **Nothing new:** if `newNotes` is empty after saving, report that there are no notes to ingest and stop.
- The findings job never invents scores: a score a participant's notes lack is `missing`, and a figure without a source stays `n/a (unsourced)`.

## Handoff

1. Show the study's `buildList` from `list_studies`, ranked, one line per item: `S<n>`, title, rationale. Mark items already in `handedOff` with their feature slug.
2. Ask which items to hand off, by `S<n>` id.
3. Call `handoff_study_items({ studyId, itemIds })` with the chosen ids.
4. Report `created` (feature id and slug) and `skipped` (already handed off, with the existing feature id). Suggest `/specmanager-prd <first created slug>` as the next command.

## Don't
- Don't approve anything — research docs have no approval, and features start in `draft`.
- Don't draft research docs inline — always go through the `researcher` subagent. The only direct file write is saving pasted notes, already masked.
- Don't invent numbers, scores or quotes.
- Don't dispatch the builder or start a build; handed-off features go through `/specmanager-prd` like any other feature.
- Don't loop here: with no step, this command runs one step and stops. To draft brief → market → Docs → user-research plan → marketing plan in one run, use `/specmanager-research-loop`; it stops before findings, which needs real interviews.
