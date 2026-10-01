---
id: prd-loop-command-specmanager-loop-042
featureId: feat-loop-command-specmanager-loop
stage: prd
status: approved
stale: false
title: Loop command (/specmanager-loop) PRD
dependsOn: []
basedOn: {}
generatedBy: agent
version: 1
createdAt: '2026-10-01T11:02:31.489Z'
updatedAt: '2026-10-01T11:08:47.805Z'
---
## Problem

The owner's observed day-to-day workflow (dogfooding, no interview doc exists) is a hand-driven chain: give SpecManager an intent prompt → ask it to refine the intent with `AskUserQuestion` → run PRD / Architecture / Design / Plan, approving each so the next gate opens → review once across all docs → answer the remaining questions at the end. Every step is typed and steered by hand, so the sequence varies between runs, approvals are given one by one through a separate surface, and the end-of-spec review and question round depend on the owner remembering to ask.

Make that workflow an official command: `/specmanager-loop [intent description]`, which runs intent → approved Plan + tasks in one session and stops before Build.

## Users & jobs-to-be-done

- **Primary — the solo owner/developer (dogfooding):** "I know roughly what I want; get me from one intent sentence to an approved, internally consistent spec set I can build, asking me only what matters."
- **Secondary — any SpecManager user** who trusts the drafters enough to accept auto-approval for a feature, and still wants the stage-by-stage commands for features where they want to review each doc before the next is drafted.

## Goals

- G1. One command runs intent → refined intent → PRD → Architecture → (Design if UI-facing) → Plan + tasks, all approved, with no manual approval steps.
- G2. Up-front intent refinement and end-of-loop questions are the only points where the user is interrupted (beyond failures).
- G3. The spec set is checked across documents once (contradictions, gaps, drift from intent) before the user is asked anything at the end.
- G4. Reuse the existing stage subagents and core gates unchanged; the loop is orchestration only.

## Non-goals

- Building, walkthroughs or shipping — the loop stops before Build (`/specmanager-build` stays separate).
- Changing the "user approves" rule of the existing stage commands (`/specmanager-prd`, `-architecture`, `-design`, `-plan`).
- Bypassing, weakening or moving gate logic out of `core` (`check_gate` / `checkGate`).
- Replacing `/specmanager-interview` (the deeper, optional pre-PRD stress-test).
- Resuming an interrupted loop automatically (resume is via the normal stage commands, R9).
- New board UI.

## Requirements

**R1 — Command entry & intent argument.** A new command file `commands/specmanager-loop.md` accepts `[intent description]` as free text.
- AC: With no argument, the loop asks for a one-line intent and stops (same pattern as `/specmanager-prd`).
- AC: The intent text is carried verbatim into the refinement step and the review step (R6) as the reference for "drift from intent".

**R2 — Feature resolution.** The loop resolves or creates the feature from the intent.
- AC: If the argument's first token matches an existing feature `id`/`slug`, the loop runs on that feature instead of creating one (see R10 for what it does with existing docs).
- AC: Otherwise it derives a short title from the intent, calls `create_feature`, and reports id / slug / folder.
- AC: Fuzzy title matches against existing features are surfaced to the user (one `AskUserQuestion`: use existing / create new) rather than silently creating a near-duplicate.

**R3 — Intent refinement in the main session.** Before any doc is drafted, the loop refines the intent with `AskUserQuestion`, running in the main session (no subagent — the `specmanager-interview.md` precedent: subagents are single-shot and cannot hold a conversation).
- AC: Questions target only what the PRD needs and the intent leaves open: problem, users, scope/wedge, constraints, and whether the feature is UI-facing.
- AC: The refined intent (original intent + answers) is passed as context to every stage subagent.
- AC: Bounded: a small number of question rounds (exact cap: Q2); the user can end refinement at any time and the loop proceeds, carrying gaps as assumptions.

**R4 — Stage chain with auto-approval.** For each stage in order — PRD → Architecture → Design (conditional, R5) → Plan + tasks — the loop: calls `check_gate` for the stage; invokes the existing subagent (`prd-writer`, `architect`, `designer`, `planner`) with the same inputs the matching stage command passes; then approves the new doc via `set_status(…, "approved")` so the next gate opens.
- AC: Gate enforcement stays in `core`; the loop never drafts around a closed gate — a closed gate stops the loop (R9).
- AC: Drafting is always delegated to the subagent, never written inline (same rule as each stage command).
- AC: Plan approval happens only after the planner has emitted `plan.md` and the task records (the Plan step emits both together).
- AC: The subagents' own "Don't approve" rules are unchanged; approval is done by the loop in the main session, not by any agent.

**R5 — Conditional Design stage.** The loop decides from the refined intent and approved PRD whether the feature is UI-facing.
- AC: UI-facing → run Design via the `designer` subagent (via `create_design_brief`, as `/specmanager-design` does) and approve it before Plan.
- AC: Not UI-facing → skip Design entirely (no doc created, so the Plan gate's "approved Design if one exists" leg is satisfied).
- AC: The decision and its one-line reason appear in the final report (R8).

**R6 — One cross-doc review pass.** After Plan + tasks are approved, the loop runs exactly one review over PRD, Architecture, Design (if any) and Plan + tasks, checking for contradictions between docs, gaps (e.g. a PRD requirement with no Plan coverage), and drift from the refined intent.
- AC: Fixes are applied in place via `write_document` with the read `version` (optimistic concurrency); docs stay `approved` (an approved-doc write only bumps `version` and does not cascade staleness).
- AC: Findings the review cannot resolve without the user become questions for R7, not guesses.
- AC: A Plan fix that changes task scope keeps task records consistent with `plan.md` (mechanism: Q4).
- AC: Single pass — the review does not iterate.

**R7 — End-of-loop questions.** After the review, the loop asks the user the remaining open questions and assumptions (gathered from the docs' Open questions sections, unresolved review findings, and refinement gaps) via `AskUserQuestion`.
- AC: Answers are applied in place to the affected docs, which stay `approved` (same write rule as R6).
- AC: Questions the user skips stay recorded as open questions in the relevant doc.
- AC: If there are no open questions, this step is skipped and said so in the report.

**R8 — Report and stop before Build.** The loop ends with a report: feature id, each doc's id / path / final status, the Design decision (R5), review fixes applied, questions answered vs left open, and the suggested next step `/specmanager-build`.
- AC: The loop never calls the builder, `set_active_build`, or any Build step.

**R9 — Failure handling.** If a stage subagent fails, a gate is closed, or any step errors mid-loop, the loop stops immediately and reports where it stopped.
- AC: The report names the last completed stage, the stage that failed, the reason, and which normal stage command to run next (e.g. `/specmanager-architecture <slug>`), so the user can resume by hand.
- AC: Already-approved docs are left as they are; a doc drafted but not yet approved when the failure hit stays `draft` (not auto-approved after a failure).
- AC: A transient `529`/Overloaded subagent failure gets a bounded retry (at most 2), mirroring the build command's builder retry; genuine failures are not retried (Q5, resolved in Architecture).

**R10 — Existing feature with existing docs.** When R2 resolves to an existing feature, the loop does not duplicate docs.
- AC: Stages whose doc is already `approved` are skipped and reused as upstream input.
- AC: A stage whose doc exists in `draft` → one `AskUserQuestion`: approve as-is and continue / stop (user edits in the board, then reruns). The loop does not overwrite a human draft.
- AC: An existing `kind: "interview"` doc is read and used as refinement input (it may shorten or replace R3), never approved or linked.

**R11 — Auto-approval is explicit opt-in.** Auto-approval exists only inside `/specmanager-loop`; invoking the command is the opt-in.
- AC: The command's description and its opening turn state that it approves each stage's doc automatically.
- AC: The four stage commands keep "Don't approve — only the user does that" verbatim.

**R12 — Prompt-invariant coverage.** `selftest-prompts` gains invariants for the new command.
- AC: Asserts the loop calls `check_gate` for each stage it runs, delegates drafting to the named subagents, approves via `set_status`, runs in the main session (no subagent for refinement / end questions), and stops before Build (no builder dispatch).
- AC: Existing invariants still pass: INV-25 ("Don't approve" across the six agents and stage commands) keeps its files and counts — the loop is not added to that list; INV-16's `check_gate` file list either gains the loop with adjusted counts or the loop gets its own invariant (Q6).

**R13 — Docs list the command.** The plugin README command table and the repo `CLAUDE.md` command lists (including the managed block's **Commands:** line rendered by `core/claude-md.ts`) mention `/specmanager-loop`.
- AC: README describes it in one line, including that it auto-approves and stops before Build.
- AC: Shipping it is a release (files under `plugins/specmanager/` change), so the CLAUDE.md release steps apply (version bump, rebuild, `selftest-directory`, `claude plugin validate`).

## Success metrics

- The owner uses `/specmanager-loop` instead of the hand-driven chain for most new features (qualitative, dogfooding).
- A loop run from intent to approved Plan + tasks needs no user input outside R3 and R7 (and R9/R10 prompts when they apply).
- The R6 review applies at least one fix or raises at least one question on a typical run — or else is a candidate to cut (signal of value, observed over the first several runs).
- Zero gate bypasses: every loop-approved doc was reached through an open `check_gate`.
- `selftest-prompts` passes with the new invariants (R12).

## Constraints & assumptions

- Orchestration lives in the main session (command prompt), not a new subagent, because R3 and R7 are multi-turn (`specmanager-interview.md` precedent). R6 also runs inline in the main session (Q3, resolved in Architecture).
- No changes to `core` gate logic are assumed necessary; `set_status` already performs `draft→approved` and the gates read it.
- Writes to approved docs bump `version` only and do not cascade staleness — R6/R7 rely on this.
- The design doc is HTML written via `create_design_brief`; in-place fixes to it in R6/R7 may need a different write path than markdown docs (Q4).
- In loop mode the planner does not call `AskUserQuestion` for a multi-phase split; it applies its own recommendation and the decision is raised in R7 (Q7, resolved in Architecture).
- No model/API calls from the plugin server are introduced — the loop is prompt orchestration in Claude Code.
- Assumption: subagents invoked from the loop behave exactly as when invoked from the stage commands (same inputs).

## High-level user flows

**Happy path (new feature)**
- `/specmanager-loop add CSV export to the board` → feature created, id reported, auto-approve notice.
- 1–N `AskUserQuestion` rounds refine the intent (incl. "is this UI-facing?").
- PRD drafted → approved → Architecture drafted → approved → (Design drafted → approved) → Plan + tasks drafted → approved, with a one-line progress note per stage.
- Cross-doc review → fixes applied in place.
- `AskUserQuestion` with remaining questions → answers applied in place.
- Report; suggest `/specmanager-build`.

**Failure mid-loop**
- Architect subagent errors → loop stops: "PRD approved; Architecture failed: <reason>. Resume with `/specmanager-architecture <slug>`."

**Existing feature**
- `/specmanager-loop <slug>` where PRD is approved and Architecture is a draft → ask: approve draft and continue / stop.

## Open questions

_All eight were decided in `arch-loop-command-specmanager-loop-027` (Summary paragraph); kept here for the record._

- Q1. Feature title derivation: should the loop propose the derived title for confirmation in the first refinement question, or just create it?
- Q2. Refinement cap: how many `AskUserQuestion` rounds before the loop proceeds (e.g. one round of up to 4 questions)?
- Q3. Does the cross-doc review (R6) run inline in the main session, via the existing read-only `reviewer` agent (built for spec-vs-diff, not doc-vs-doc), or a new agent? A new agent adds a `Don't approve` carrier and selftest scope.
- Q4. How are review/answer fixes applied to the HTML design brief and to task records when Plan scope changes (re-run `create_design_brief`? `update_task`/`create_task`)?
- Q5. Should a transient subagent failure (e.g. 529/Overloaded) get a bounded retry like the build command's builder retry, or always stop (R9)?
- Q6. INV-16 extension vs a dedicated loop invariant for `check_gate` coverage (R12).
- Q7. Should the planner's multi-phase split confirmation be deferred to the end-of-loop questions to keep G2, or stay mid-loop?
- Q8. Should the loop's auto-approvals be distinguishable afterwards (e.g. noted in the report only, or recorded in doc frontmatter) so the user can tell loop-approved from hand-approved docs?
