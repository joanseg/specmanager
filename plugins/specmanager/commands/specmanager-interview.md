---
description: Optional pre-PRD interview for a SpecManager feature — a multi-turn conversation in this session that extracts and stress-tests the idea before any PRD is drafted. Creates the feature if it doesn't exist yet.
argument-hint: "<feature title, or existing featureId/slug>"
---

Interview the user about: **$ARGUMENTS**.

Runs **in the main session** — no subagent (subagents are single-shot and
cannot hold a conversation). You are the interviewer: pull the context out of
the user's head and stress-test it as you go, so `/specmanager-prd` later
starts from extracted, challenged material.

## Steps

1. **Resolve or create the feature.** `list_features`; match the argument
   against an `id`/`slug`, else treat it as a new title:
   `create_feature({ title })`, reporting id/slug/folder in the opening turn.
   No argument → ask for one short title and stop.
2. **Detect prior material.** `list_documents({ featureId, stage: "prd" })`.
   A `kind: "interview"` doc → **re-interview**: `read_document` it, open by
   summarising what's captured, extend/revise rather than repeat; keep its
   `id` and `version` for storage. A PRD exists → note it in one sentence
   ("this can feed a rewrite") and proceed anyway.
3. **Interview** per the protocol below.
4. **Synthesise** in the four-section format when the user exits or the plan
   is exhausted.
5. **Storage.** Ask:
   > Store this interview as a markdown file for this feature? It will appear
   > in the PRD column on the board. (yes / no)

   Stored body = one-line *mode* note (mode(s) ran + method credit), then the
   four sections — chat and artifact match. Then:
   - **No** → stop; nothing is written.
   - **Yes, none exists:**
     `create_document({ featureId, stage: "prd", kind: "interview", title: "<Feature title> interview", body, generatedBy: "agent", dependsOn: [], basedOn: {} })`.
     `dependsOn: []` / `basedOn: {}` is a hard contract — the interview sits
     outside the staleness graph; never link it. Filename defaults to
     `prd/interview.md`.
   - **Yes, re-interview:**
     `write_document({ id: <existing interview id>, body, baseVersion: <version from step 2> })`.
     On `version conflict`, `read_document` again, merge, retry with the
     fresh version.

   On success: `sync_claude_md`, then report the document id and file path.

## Interview protocol

**Opening turn** — one message, three parts in order: (1) the goal in a
sentence or two, with a parenthetical if the feature was just created or
prior material was found; (2) the plan — 5–8 numbered one-line areas derived
from the feature's nature (problem & who hits it, demand evidence, status
quo, assumed constraints, narrowest wedge, success criteria — adapt, don't
recite); (3) the exit phrase — **"finish interview now"** or any obvious
version ends it at any time. Then ask the first question.

**The loop**
- **One focused question per turn** — never bundled or multi-part; pick the
  question that most reduces your uncertainty right now.
- Concrete over abstract: what actually happened, recently and specifically.
- Challenge in the moment ("Hold on — …") when an answer hides an assumption,
  a new user type, a contradiction, or a solution-first smell.
- Adapt the plan when an answer materially changes what's worth covering.
- Restate the exit phrase roughly every five turns, one short line.

**Plan revisions print as diffs** — never re-dump the whole plan; print
nothing if nothing material changed; each `+`/`−` line names the change and
reason in a trailing parenthetical:

```
Plan update
+ multi-user / sharing reality check (you mentioned a teammate)
− demand evidence (covered: the post-build blindness is concrete)
```

**Exit** — matched conversationally, not literally ("let's stop", "wrap it
up", "I'm done"…). Exit is **instant and unconditional**: straight to
synthesis — no "are you sure?", no "one more question", however thin the
material. If coverage was thin, say so in the synthesis header ("ending
immediately — 2 of 6 areas covered") and let **Unresolved** carry the gaps.
Plan exhausted → say so and synthesise.

**Synthesis** — exactly four sections, in this order (chat and stored
artifact identical), each tight — bullets, not prose:
- **Extracted** — problem, who hits it, constraints, decisions agreed.
  Facts, not opinions.
- **Critique** — the strongest surviving challenges: thin evidence,
  solution-first smells, contradictions, acknowledged risks. Honest, not
  polite.
- **Recommended wedge** — the narrowest version worth building first, with
  what was explicitly cut.
- **Unresolved** — open questions and unverified claims the PRD must carry.

## Forcing-question method

The **office-hours** method from gstack —
<https://github.com/garrytan/gstack/tree/main/office-hours> — embedded and
credited; no skill installation needed. Deploy the right question when an
answer makes it bite, in the conversation's own terms — never recite as a
checklist:

1. **Demand reality** — who is desperate for this *today*? Claimed pain with
   no instance attached is a hypothesis, not a fact.
2. **Status quo** — what do people do *right now*? A cheap, tolerated
   workaround kills the new thing by friction.
3. **Desperate specificity** — name one person or one recent incident;
   "users want…" is banned until one concrete case is examined.
4. **Narrowest wedge** — the smallest version with real value; push until
   something the user cares about has actually been cut.
5. **Observation** — *observed* vs *imagined*; separate explicitly, imagined
   items go to Unresolved.
6. **Future-fit** — why now, or is it last year's problem?

**Modes** — pick one from the feature's nature, name it in the opening turn:
- **Startup interrogation** — risk is *demand* (product ideas, implied
  audiences); leans on demand reality, status quo, specificity.
- **Builder / design-thinking** — demand established (often dogfooding), risk
  is *shape*; leans on wedge, observation, future-fit; probes constraints,
  interfaces, failure modes.

Switch when the frame proves wrong ("demand evidence" is the user's own
workflow → builder; an "internal tool" sprouts a second user type → startup):
announce in one line and print a plan diff. Switching is cheap; the wrong
mode wastes turns.

## Don't

- Don't write anything before the user says yes at the storage prompt;
  persistence only via `create_document` / `write_document` — never write
  files directly.
- Don't give the interview `dependsOn`/`basedOn` links or approve it — no
  lifecycle; it stays a `draft` reference doc forever.
- Don't delegate to a subagent; don't draft a PRD (that's `/specmanager-prd`).
- Don't ask more than one question per turn; don't re-print the full plan
  when a diff will do.
- Don't second-guess an exit request — synthesis follows immediately.
