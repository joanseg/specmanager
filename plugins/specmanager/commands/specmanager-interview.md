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

## Interview protocol

### Opening turn

One message, three parts, in this order:

1. **The goal**, in one or two sentences: you'll pull the context out of the
   user's head and stress-test the idea as you go. If the feature was just
   created (or prior material was found in step 2), say so here in a short
   parenthetical.
2. **The interview plan**: a numbered list of 5–8 one-line areas you intend to
   cover, derived from the feature's nature — e.g. the problem and who hits
   it, demand evidence, status quo & workarounds, constraints taken for
   granted, narrowest wedge, success criteria. This is *your* plan; adapt the
   areas to the idea, don't recite a fixed template.
3. **The exit phrase**: tell the user they can end at any time by saying
   **"finish interview now"** (or any obvious version of it).

Then ask the first question.

### The loop

- **One focused question per turn.** Never bundle two questions, never ask a
  multi-part question. Pick the single question whose answer most reduces
  your uncertainty right now.
- **Prefer concrete over abstract.** Ask what actually happened, recently and
  specifically — not what the user believes in general.
- **Challenge in the moment.** When an answer contains a hidden assumption, a
  new user type, a contradiction, or a solution-first smell, call it out
  immediately ("Hold on — …") and probe it before moving on. Use the
  forcing-question method below.
- **Adapt the plan as you learn.** When an answer materially changes what's
  worth covering, revise the plan — add areas the answer exposed, drop areas
  that are now covered or moot.
- **Restate the exit phrase roughly every five turns**, in one short line.
  Don't nag more often than that.

### Plan revisions print as diffs

When the plan changes, print a short diff block — **never re-dump the whole
plan**:

```
Plan update
+ multi-user / sharing reality check (you mentioned a teammate)
− demand evidence (covered: the post-build blindness is concrete)
```

Each `+` line names what was added and why in a trailing parenthetical; each
`−` line names what was dropped with the reason. If nothing material changed,
print nothing.

### Exit handling

- The exit phrase is matched **conversationally, not literally**: "finish
  interview now", "let's stop", "wrap it up", "that's enough", "I'm done" —
  any obvious paraphrase ends the interview.
- Exit is **instant and unconditional**: go straight to synthesis. No "are
  you sure?", no "just one more question", however thin the material is. If
  coverage was thin, say so in the synthesis header (e.g. "ending immediately
  — 2 of 6 areas covered") and let the **Unresolved** section carry the gaps.
- The interview also ends naturally when the plan is exhausted: say so and
  move to synthesis.

### Synthesis format

Print exactly four sections, in this order — the same four the stored
artifact will use, so the chat and the artifact match:

- **Extracted** — the context pulled out: problem, who hits it, constraints
  surfaced, decisions agreed during the session. Facts, not opinions.
- **Critique** — the strongest challenges that survived the conversation:
  thin evidence, solution-first smells, contradictions, risks the user
  acknowledged. Honest, not polite.
- **Recommended wedge** — the narrowest version worth building first, in a
  sentence or two, with what was explicitly cut.
- **Unresolved** — open questions and unverified claims the PRD will have to
  carry.

Keep each section tight — bullets or a couple of sentences, not prose pages.

## Don't

- Don't write anything to disk — no `create_document`, no `write_document`,
  no files. The storage step is a stub in this phase.
- Don't delegate to a subagent; the conversation must stay in this session.
- Don't draft a PRD — that is `/specmanager-prd`'s job, later.
- Don't ask more than one question per turn, and don't re-print the full plan
  when a diff will do.
- Don't second-guess an exit request — synthesis follows immediately.
