---
description: Run a SpecManager feature from a one-line intent to an approved Plan in one go — asks a few questions, drafts each stage via its subagent, approves each stage's document automatically, reviews across the docs, then stops before Build.
argument-hint: "<intent description, or existing featureId/slug>"
---

Run the spec loop for: **$ARGUMENTS**.

Runs **in the main session** — refinement, the cross-doc review and the end
questions are conversation, which a single-shot subagent cannot hold. Drafting
is still delegated: each stage goes to its own subagent, exactly as the stage
commands do. Unlike those commands, this loop **approves each stage's document
automatically**; invoking it is the opt-in.

## Steps

1. **Parse the intent.** No argument → ask the user for a one-line intent and
   stop. Otherwise hold `$ARGUMENTS` verbatim as the **Original intent**: it is
   pasted unchanged into every subagent prompt and is the drift reference for
   the review.
2. **Opening turn — before any write.** One short message: what the loop will
   do (refine → PRD → Architecture → Design if UI-facing → Plan → review → end
   questions → report, stopping before Build) and, stated plainly, that it
   **approves each stage's document automatically** — approvals are made by
   this command, not by the user in the board. Nothing is created or written
   before this message.
3. **Resolve the feature.** `list_features`.
   - **Existing feature** — the first whitespace-separated token matches an
     `id`/`slug`: use it; the rest of the argument is extra context. Existing
     docs are handled stage by stage in the stage chain.
   - **New feature** — derive a short title (≤6 words) from the intent. If it
     near-matches an existing title or slug (case-insensitive substring or a
     shared significant word — judge it, there is no server matcher), ask one
     `AskUserQuestion`: use `<existing>` / create new *(recommended)* — choose
     the recommendation by how close the match is. Otherwise the title is
     proposed as the first question of refinement round 1 (step 4), so it
     costs no extra interruption. `create_feature({ title })` runs right after
     that round, before any doc work; report the new id, slug and folder.
4. **Refine the intent (main session, no subagent).**
   - **Interview first.** `list_documents({ featureId, stage: "prd" })`; a
     `kind: "interview"` doc → `read_document` it and ask only about what it
     leaves open. If it covers problem, users, scope and UI-facing, skip
     refinement and say so. (A new feature has none — skip the lookup.)
   - **At most 2 rounds**, each one `AskUserQuestion` with up to 4 questions,
     recommended option first, labelled *(recommended)*. Round 1 covers the
     PRD-critical gaps — problem, users, scope / narrowest wedge, constraints —
     plus the title proposal (accept / edit) for a new feature. Round 2 only if
     round 1 left a PRD-critical gap.
   - **UI-facing is always asked** (or inferred from the interview): the
     Design decision depends on it.
   - **Every question offers "skip / decide for me".** Choosing it ends
     refinement; remaining gaps become **Assumptions**.
   - Assemble the **refined-intent block**, passed verbatim to every stage
     subagent:

     ```
     Refined intent:
     - Original intent: <verbatim $ARGUMENTS>
     - Q/A: <question> → <answer>   (one line each)
     - UI-facing: yes | no — <one-line reason>
     - Assumptions: <gaps carried, or "none">
     ```
5. **Run each stage the same way.** For each stage in steps 6–9:
   1. **Existing doc (R10).** `list_documents({ featureId, stage })`, ignoring
      `kind: "interview"` docs. `approved` → skip the stage, reuse the doc as
      upstream input, note "reused". `draft` → one `AskUserQuestion`: approve
      as-is and continue *(recommended)* / stop (edit in the board, rerun).
      Never overwrite a human draft; approving one still goes through the gate.
   2. **Gate.** `check_gate({ featureId, stage })`; `ok: false` → stop with
      `reason` verbatim (step 10). Never draft around a closed gate.
   3. **Dispatch** the stage subagent with the same inputs as its stage command,
      plus the refined-intent block verbatim and this line:
      `Loop mode: running under /specmanager-loop — do not ask the user anything; infer and record assumptions/open questions in the doc.`
   4. **Verify** the doc landed: `list_documents({ featureId, stage })` shows a
      new doc. Missing → stop (step 10).
   5. **Approve** in the main session: `set_status({ id, status: "approved" })`.
      Only the loop approves; the subagents never do.
   6. **Progress line**, e.g. `PRD approved — <id>`.

   **Transient retry (R=2).** On a `529` / `Overloaded` error — the Task never
   returned a usable result — first `list_documents({ featureId, stage })`: if
   the doc already landed, do not re-dispatch; continue at sub-step 4.
   Otherwise re-dispatch the same Task immediately, up to **2** retries (3
   attempts). Genuine failures are not retried.
6. **PRD.** `Task({ subagent_type: "prd-writer", prompt })` with the feature id
   + title and the extra context from the argument.
7. **Architecture.** `Task({ subagent_type: "architect", prompt })` with the
   feature id/title/slug and the approved PRD id (passed explicitly).
8. **Design — only if UI-facing (R5).** Decide once, after the PRD is
   approved, from the refined intent's UI-facing answer and the PRD (screens,
   board/UI requirements, flows that render); keep a one-line reason for the
   report. An existing approved Design doc counts as UI-facing.
   - **UI-facing** → after Architecture is approved,
     `Task({ subagent_type: "designer", prompt })` with the feature
     id/title/slug, PRD id + version, Architecture id + version, the extra
     context, and `No attachments; proceed without a design reference.` The
     designer writes via `create_design_brief`. Approve before Plan.
   - **Not UI-facing** → create nothing; the plan gate is satisfied by absence.
9. **Plan.** `Task({ subagent_type: "planner", prompt })` with the feature
   id/title/slug, the Architecture id, the PRD id, the Design id + version (or
   `null`), and the loop-mode split rule: `Loop mode: do not call AskUserQuestion for the phase split — apply your recommended split (or single phase) and record the decision and the alternative under Open questions.`
   Before approving, also check `plan.md` (`read_document`) has a `## Phase`
   heading and `list_tasks({ featureId })` is non-empty; a flat plan or no
   tasks → stop (step 10). The loop does not send it back.
10. **Failure stop (R9).** Stop immediately on a closed gate, a subagent error
    after retries, a subagent that returned without its doc, or any tool
    `ok: false`. Report: last approved stage, failed stage, reason verbatim,
    and the command to resume with (`/specmanager:specmanager-<stage> <slug>`).
    Approved docs stay approved; a drafted but unapproved doc stays `draft` —
    never approve after a failure.
