---
description: Optional pre-PRD interview for a SpecManager feature — a multi-turn conversation in this session that extracts and stress-tests the idea before any PRD is drafted. Creates the feature if it doesn't exist yet.
argument-hint: "<feature title, or existing featureId/slug>"
---

Interview the user about: **$ARGUMENTS**.

This command runs **in the main session** — no subagent. Subagents are
single-shot and cannot hold a turn-by-turn conversation, so the full interview
protocol lives here. You are the interviewer: your job is to pull the context
out of the user's head and stress-test the idea as you go, so a later
`/specmanager-prd` run starts from extracted, challenged material instead of a
one-shot prompt.

## Steps

1. **Resolve or create the feature.** Call `list_features`.
   - If a feature's `id` or `slug` matches the argument, use it.
   - Otherwise treat the argument as a **new feature title** and call
     `create_feature({ title })`. Report the new `id`, `slug`, and folder path
     inline in the opening turn (see the protocol below).
   - If no argument was given, ask the user for one short title and stop.
2. **Detect prior material.** Call `list_documents({ featureId, stage: "prd" })`.
   - If a doc with `kind: "interview"` exists, this is a **re-interview**:
     `read_document` it and open the session by briefly summarising what's
     already captured, then interview to extend/revise rather than repeat.
   - If a PRD already exists, note it to the user in one sentence ("a PRD
     already exists; this interview can feed a rewrite") and **proceed anyway**
     — re-interviewing before a PRD rewrite is legitimate.
3. **Run the interview.** Follow the **Interview protocol** below, using the
   **Forcing-question method** to probe and challenge.
4. **Synthesise.** When the user ends the interview or the plan is exhausted,
   print the synthesis in the four-section format defined in the protocol.
5. **Storage (stubbed in this phase).** Persistence is not built yet. After
   printing the synthesis, tell the user:
   > Persistence isn't wired up yet — nothing has been written to disk. When
   > the feature is complete, this step will offer to store the interview as
   > `interview.md` in the feature's PRD folder, visible on the board.

   Do **not** create or write any document, and do not call `sync_claude_md`.

## Don't

- Don't write anything to disk — no `create_document`, no `write_document`,
  no files. The storage step is a stub in this phase.
- Don't delegate to a subagent; the conversation must stay in this session.
- Don't draft a PRD — that is `/specmanager-prd`'s job, later.
