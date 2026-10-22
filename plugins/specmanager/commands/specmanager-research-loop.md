---
description: Run a SpecManager research study from a one-line idea to a user-research plan in one go — asks every question up front, then drafts the brief, market research, the chosen Docs, the user-research plan and the marketing plan via the researcher subagent, reviews across the docs, and stops before findings.
argument-hint: "<idea, or existing study id/slug>"
---

Run the research loop for: **$ARGUMENTS**.

Runs **in the main session** — the opening questions, the cross-doc review and
the end questions are conversation, which a single-shot subagent cannot hold.
Drafting is still delegated: each doc goes to a `researcher` subagent job,
exactly as `/specmanager-research` does. Research docs have no approval, so
this loop **approves nothing**. Every question is asked up front: once drafting
starts, the run never pauses until the review.

## Steps

1. **Parse the idea.** No argument → ask the user for a one-line idea and
   stop. Otherwise hold `$ARGUMENTS` verbatim as the **Original idea**: it is
   pasted unchanged into every subagent prompt and is the drift reference for
   the review.
2. **Opening turn — before any write.** One short message: the run order
   (brief → market → Docs → user-research plan → marketing plan → one review →
   end questions → report), that it **approves nothing** (research docs have
   no approval), and that it stops before findings, which needs real
   interviews. Nothing is created or written before this message.
3. **Resolve the study.** `list_studies`.
   - **Existing study** — the first whitespace-separated token matches an
     `id`/`slug`: use it; the rest of the argument is extra context. Existing
     docs are **reused as upstream and their step is skipped**. Opening round 1
     adds one question: reuse existing docs *(recommended)* / rewrite them in
     place (the jobs update each existing doc with `write_research_doc`).
   - **New study** — derive a short title (≤6 words) from the idea and propose
     it as a question in opening round 1. `create_study({ title, idea })` runs
     right after that round, before any doc work; report the new id, slug and
     folder.
4. **Opening questions (main session, no subagent).**
   - **At most 2 rounds**, each one `AskUserQuestion` with up to 4 questions,
     recommended option first, labelled *(recommended)*. On an existing study
     with a brief, the brief's answer is the recommended option.
   - **Round 1:** idea (confirm / edit), market, audience, goals, plus the
     title for a new study or the reuse question for an existing one. When
     that makes more than 4, the overflow moves to round 2.
   - **Round 2:** constraints, **which Docs to make**, and any round-1 gap.
     The Docs question is one `multiSelect: true` question filtered by the
     relevance table in `/specmanager-research`'s Docs section (its single
     home — read it there, do not copy it here). Judge "Offered when" as of
     the Docs step: market will exist, there are no findings yet, and strategy
     is absent. So pre-interview it typically offers `wireframes`
     *(recommended)*, `one-pager` and `client-presentation`. On an existing
     study, "update existing <doc>" options for its Docs come first (a legacy
     `concepts-<slug>` is a wireframes Doc). The built-in "Other" answer is a
     custom docType, kept as typed. Picking nothing means no Docs this run.
   - **Every question offers "decide for me".** Its answer is the decision
     taken, recorded as an Assumption.
   - Assemble the **brief block**, passed verbatim to every job:

     ```
     Brief block:
     - Original idea: <verbatim $ARGUMENTS>
     - Q/A: <question> → <answer>   (one line each)
     - Docs: <confirmed docTypes / existing doc ids, or "none">
     - Assumptions: <decide-for-me decisions and gaps, or "none">
     ```
5. **Run each step the same way.** For each step in 6–10:
   1. **Existing doc.** From `list_studies`: the step's doc exists → reuse it
      (skip the step, note "reused") or, if the user chose rewrite, dispatch
      the job naming the existing doc id so it writes in place.
   2. **Gate.** The step's entry in the study's `steps[]` is `locked` → stop
      with its reason verbatim (failure stop). The brief is always open.
   3. **Dispatch** `Agent({ subagent_type: "researcher", prompt })` with the
      study id, the job name, the upstream doc ids from `list_studies`
      (`brief-<slug>` included once it exists), the brief block verbatim and
      this line:
      `Loop mode: running under /specmanager-research-loop — do not ask the user anything; infer and record assumptions/open questions in the doc.`
   4. **Per-step check.** `list_studies` must show the doc (a new id, or a
      bumped version on a rewrite). Missing → failure stop.
   5. **Progress line**, e.g. `market drafted — market-<slug> v1`.

   **Transient retry (R=2).** On a `529` / `Overloaded` error — the Agent call
   never returned a usable result — first `list_studies`: if the doc already
   landed, do not re-dispatch; continue at sub-step 4. Otherwise re-dispatch
   the same Agent call immediately, up to **2** retries (3 attempts). Genuine
   failures are not retried. A text-only section job that hits 529 is simply
   re-dispatched.
6. **Brief.** One `brief` job with the study id and the brief block. On an
   existing study with a brief, the reuse answer applies: skip, or rewrite in
   place.
7. **Market.** As in `/specmanager-research`: three section jobs **in
   parallel**, in one message (`market-size`, `market-competitors`,
   `market-revenue`), each naming `brief-<slug>`; they return text and write
   nothing. Then **one** `market-merge` job with the study id, `brief-<slug>`
   and the three texts; it writes the `market` doc.
8. **Docs.** One `docs` job per Doc confirmed in opening round 2, with the
   study id and its docType, or the existing doc id for an update. Different
   types go **in parallel**, in one message; same-type Docs run
   **sequentially**, so each sees the one before it. No Doc is drafted
   without the user confirming: none confirmed → skip the step and say so.
   Each Doc gets its own per-step check and progress line.
9. **User-research plan.** One `user-research` job, naming `brief-<slug>`,
   `market-<slug>` and every wireframes Doc id.
10. **Marketing plan.** One `marketing` job, naming `brief-<slug>` and
    `market-<slug>`. It runs after the user-research plan, in PRD order.
