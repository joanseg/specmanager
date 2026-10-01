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
