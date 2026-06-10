---
id: prd-interview-command-010
featureId: feat-interview-command
stage: prd
status: approved
stale: false
title: Interview command PRD
dependsOn: []
basedOn: {}
generatedBy: human
version: 2
createdAt: '2026-06-10T11:27:47.292Z'
updatedAt: '2026-06-10T11:56:50.815Z'
---
## Problem

When an orchestrator (the SpecManager user) kicks off a feature, the richest context lives in their head: the motivating pain, the users they're picturing, constraints they take for granted, half-formed scope decisions. Today the lifecycle starts at `/specmanager-prd`, where the prd-writer subagent drafts from a one-shot prompt. Whatever the user didn't think to type gets invented or omitted by the agent, and the user pays for it later in review churn — editing the PRD on the board to inject context they always had.

There is also no structured moment where the idea itself is challenged. The prd-writer is a scribe, not a critic. Weak premises (no real demand, solution-first thinking, scope too wide) survive into the PRD and only surface — expensively — at Architecture or Build.

We want a new optional command, `/specmanager:specmanager-interview`, that runs a conversational, adaptive interview in the Claude Code session before the PRD stage: it extracts context from the user's head, constructively critiques the idea (YC office-hours style), and optionally persists the result as a markdown artifact that shows up alongside PRDs on the board.

## Users

- **The orchestrator** — the single local user driving the lifecycle from the terminal and the board. Job-to-be-done: "get everything I know about this feature out of my head and stress-tested, so the PRD draft starts from a strong, honest brief instead of a thin prompt."

- **The prd-writer subagent** (indirect consumer) — when an interview artifact exists for a feature, the PRD draft should be grounded in it. Job: produce a first draft that needs fewer human corrections.

- **Future-stage readers** (architect, planner, the human reviewing later) — benefit from a durable record of the original intent and the critiques that shaped scope.

## Goals / Non-goals

### Goals

1. Ship a new slash command `/specmanager:specmanager-interview` in `plugins/specmanager/commands/`, with a corresponding subagent in `plugins/specmanager/agents/` (consistent with how every other stage command delegates).
1. The interview is a **chat in the Claude Code session** — turn-by-turn conversation in the terminal, not a board UI flow.
1. The interview **extracts context**: problem, users, demand evidence, constraints, scope instincts, success criteria — whatever the user knows.
1. The interview **critiques constructively**, using the office-hours skill's interrogation model: six forcing questions covering demand reality, status quo, desperate specificity, narrowest wedge, observation, and future-fit. Critique is woven into the conversation, not appended at the end. (Open question below on whether to invoke the skill or embed its method — see Open questions.)
1. The interview **adapts**: as new details emerge, the agent revises what it still needs to ask, and **every time the interview plan changes it shows the user the updated plan** (a short visible outline of remaining areas, not a wall of text).
1. The interview **always tells the user how to exit**: at the start and at reasonable intervals, it states that saying **"finish interview now"** ends the interview immediately.
1. On finish, it **asks the user whether to store the interview** as a markdown file. If yes, the artifact is persisted under the feature's spec directory (`.claude/specs/features/<slug>/`) via the MCP layer and **appears in the same kanban column as PRDs** on the board.
1. The interview is **optional** in the lifecycle: it sits before PRD, and the PRD gate does not depend on it. `/specmanager-prd` works exactly as today when no interview exists; when one exists, the prd-writer should read it as input.
1. The artifact, when stored, follows SpecManager's existing storage invariants: frontmatter-authoritative markdown, manifest as rebuildable cache, all writes through `core`.

### Non-goals

- **No new lifecycle gate.** Nothing gates on the interview; the interview gates on nothing (beyond the feature existing — see Open questions on feature creation).

- **No board-side interview UX.** The board only displays (and lets the human read/edit/manage) the stored artifact like other docs; the conversation itself never happens in the UI.

- **No approval semantics required for the artifact.** It is input material, not a stage deliverable; it never blocks or unblocks other stages. (Whether it participates in staleness tracking is an open question.)

- **No multi-session resume of an in-progress interview.** If the session ends mid-interview, the user starts over (or pastes what they remember). V1 keeps it simple.

- **Not a replacement for the PRD.** The interview output is raw extracted context + critique; the prd-writer still produces the structured PRD.

## Success metrics

Single-user local tool, so metrics are qualitative/dogfooding-based:

1. **PRD churn drops**: PRDs drafted after an interview need fewer human edit passes before approval than PRDs drafted cold (observable in this repo's own dogfooding history).
1. **Critique catches something real**: in dogfooding, at least some interviews materially change scope (narrower wedge, dropped requirement, sharpened problem) before the PRD is written.
1. **The exit affordance works**: the user can always end the interview with "finish interview now" and is never trapped in question loops.
1. **Plan visibility works**: the user can tell at any point what the interview still intends to cover, and notices when that changes.
1. **Artifact placement works**: a stored interview is visible on the board in the PRD column for its feature, opens in the markdown viewer, and survives a manifest rebuild.

## Constraints & assumptions

- **Repo structure**: command prompt in `plugins/specmanager/commands/specmanager-interview.md`; subagent in `plugins/specmanager/agents/` (e.g. `interviewer.md`), matching the existing prd-writer/architect/planner pattern.

- **office-hours skill availability**: the office-hours skill (six forcing questions + builder/design-thinking mode) is a gstack skill installed in the user's environment, not part of this plugin. Assumption: we cannot hard-depend on it being installed for every SpecManager user. The interview must degrade gracefully — the forcing-question method can be embedded in the interviewer's prompt as a fallback. Marked as an open question which integration shape we want.

- **Storage invariants**: frontmatter is authoritative; `manifest.json` is a rebuildable cache; all writes go through `core` (MCP tool), never direct file writes from the agent. The interview artifact must follow this.

- **Board column grouping**: the board groups documents into columns by stage. For the artifact to appear in the PRD column, the simplest-fitting shapes are (a) a doc of stage `prd` with a distinguishing kind/filename (e.g. `interview.md`), or (b) a new doc kind surfaced into the prd column by the UI. This PRD requires the _outcome_ (same column as PRDs, visibly distinct from the PRD itself) and leaves the mechanism to Architecture.

- **Gate logic untouched for v1**: `checkGate` in `core` must not gain an interview dependency.

- **Conversation medium**: Claude Code session chat. The interviewer must work within subagent constraints — if subagents can't hold a multi-turn conversation with the user, the interview may need to run in the main session with the command prompt as orchestration (the other commands delegate to subagents, but they are single-shot drafters). This is a real design constraint to resolve at Architecture; flagged in Open questions.

- **Plugin sync**: a stored interview shows in the managed CLAUDE.md feature table only if we decide it affects stage display — assumption for v1: it does not change `currentStage` or the table.

## High-level user flows

### Flow 1 — Interview, store, then PRD

- User runs `/specmanager:specmanager-interview` for a new or existing feature (passing title/id like other commands).

- Agent opens: states the goal, shows its initial interview plan (the areas it intends to cover), and tells the user they can end at any time by saying "finish interview now".

- Conversational loop: agent asks one focused question at a time; user answers; agent probes, challenges weak claims (demand reality, status quo, narrowest wedge, etc.), and acknowledges strong ones.

- User mentions something unexpected (e.g. a constraint or a second user type) → agent revises its plan and shows the updated plan: "Plan update: adding X, dropping Y (already covered)."

- User says "finish interview now" (or the agent reaches the natural end of its plan).

- Agent presents a brief synthesis: extracted context, key critiques, recommended wedge/scope, unresolved risks.

- Agent asks: "Store this interview as a markdown file for this feature?" → user says yes → artifact persisted under `.claude/specs/features/<slug>/`, visible on the board in the PRD column.

- Later, user runs `/specmanager-prd`; the prd-writer finds the interview artifact and grounds the PRD in it.

### Flow 2 — Interview, discard

- Same as Flow 1, but at the storage prompt the user declines → nothing is written; the conversation remains in the session scrollback only.

### Flow 3 — Skip entirely (status quo preserved)

- User runs `/specmanager-prd` directly with no interview. Everything behaves exactly as today.

### Flow 4 — Early exit

- Two questions in, the user says "finish interview now". Agent immediately stops questioning, synthesizes whatever was gathered (however thin), and offers storage. No nagging, no "are you sure".

## Open questions

1. **Artifact shape**: new doc _kind_ within stage `prd` (e.g. `interview.md` alongside `prd.md`) vs. a new stage that the UI maps into the PRD column? Stage-set changes ripple through `core`, gates, and sync — the within-prd-stage option looks lighter, but Architecture should decide.\
   Answer: this looks better from a product perspective, architect to review within-prd-stage option 
1. **Feature creation**: should `/specmanager-interview` create the feature record if it doesn't exist (as `/specmanager-prd` does), or require an existing feature? Leaning: mirror `/specmanager-prd` and create it, since the interview is the new natural first touch.\
   Answer: `/specmanager-interview` create the feature record if it doesn't exist yes
1. **office-hours integration shape**: invoke the installed skill when present and fall back to an embedded forcing-question method when absent? Or always embed the method (no runtime dependency) and merely credit the technique? Also: the skill has two modes (startup interrogation vs. builder/design-thinking) — should the interviewer pick a mode based on the feature, ask the user, or blend?\
   Answer: always embed the method (no runtime dependency) and merely credit the technique. startup interrogation vs. builder/design-thinking) — should the interviewer pick a mode based on the feature, and based on how evolves the interview it can change the mode in the middle of the interview.
1. **Conversation mechanics**: can the interview run inside a subagent (subagents are typically single-shot), or must the command run the interview in the main session? This decides where the interviewer prompt lives and how it differs from the other agents.\
   Answer: should be similar to PRD and Architect
1. **Staleness & lifecycle wiring**: should an approved-PRD feature whose interview is later edited mark anything stale? Default instinct: no — the interview is upstream raw material, outside the `dependsOn` graph — but confirm at Architecture.
1. **Approval status of the artifact**: stored docs carry draft/approved status today. Does the interview artifact get a status at all, or is it status-less reference material? If the board's PRD column assumes status badges, this affects display.\
   Answer: do whatever is easier to implement.
1. **prd-writer contract**: when an interview artifact exists, is the prd-writer _required_ to read it, or just encouraged? Recommendation: required-if-present, stated in the prd-writer agent prompt.\
   Answer: agree
1. **Repeat interviews**: if an interview already exists for a feature, does a new run overwrite, version, or append? Simplest v1: offer overwrite vs. abort.\
   Answer: it updates with new inputs.
