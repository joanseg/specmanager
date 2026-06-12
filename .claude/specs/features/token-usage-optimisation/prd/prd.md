---
id: prd-token-usage-optimisation-018
featureId: feat-token-usage-optimisation
stage: prd
status: approved
stale: false
title: Token usage optimisation PRD
dependsOn: []
basedOn: {}
generatedBy: agent
version: 2
createdAt: '2026-06-12T08:34:58.588Z'
updatedAt: '2026-06-12T12:46:18.286Z'
---
## Problem

SpecManager's own lifecycle is too expensive in tokens to complete on the plans its users actually have. On the Claude Pro plan with Opus, a single feature's lifecycle exhausts the 5-hour usage window during the *spec* stages — somewhere between interview and design/plan — before build even starts. With Sonnet, a large feature only just builds. The plugin's core promise (drive a whole feature, interview through walkthrough, from one board) is broken for Pro-plan users on the best model.

Nobody has measured where the tokens actually go. The burn could be in command prompts, the drafting agents' prompts, the documents shuttled between stages, MCP tool output sizes, the managed CLAUDE.md block, or the main-session interview — "the drafting agents are expensive" is an unverified hypothesis. v1 deliberately proceeds without instrumentation (see Non-goals), so the architecture stage must audit on researched best practices rather than measurement.

This feature must land **before** the Cursor, Codex, and Antigravity plugin ports, so those ports inherit the optimised prompts instead of forking the wasteful ones.

## Users & jobs-to-be-done

- **Pro-plan SpecManager user on Opus (primary — the dogfooding author is one).** Job: take a feature from interview to final walkthrough in a single working session without hitting the 5-hour usage cap mid-lifecycle.
- **Pro-plan user on Sonnet.** Job: run large features with headroom, with every stage's output quality remaining very high — not degraded by either the lighter model or the trimmed prompts.
- **Future plugin-port maintainers (Cursor / Codex / Antigravity features).** Job: port from a prompt surface that is already lean, so optimisation work isn't duplicated per platform.

## Goals / non-goals

### Goals

1. A full feature lifecycle (interview → PRD → architecture → optional design → plan → build → walkthroughs) on **Opus fits inside one 5-hour Pro usage window**.
2. On **Sonnet**, phase outputs stay at a very high standard (assessed via board approval; no rubric exists in v1 — see Open questions).
3. The architecture stage **researches current Claude Code token best practices** and **audits SpecManager's full surface** against them:
   - command prompts (`commands/*.md`),
   - agent prompts (`agents/*.md`),
   - doc flow between stages (what each stage reads from the previous one),
   - MCP tool output sizes,
   - the managed CLAUDE.md block,
   - the main-session interview command.
4. **Trimmed prompts** ship as the audit's output: leaner commands and agents with no behavioural regressions.
5. **Lossless artifact condensing**: drafting instructions that make PRDs, architecture docs, plans, and walkthroughs denser without dropping information. Denser is fine; dropped information is not.

### Non-goals

- **Per-stage model assignment / tiering** — dropped (2026-06-12, scope decision). Recommended-model defaults would hardcode model names into the plugin; every new model generation with new names would force a plugin update to stay current. Model selection stays entirely with the user via the session model (`/model`); subagents inherit it. No per-stage defaults, no override mechanism.
- **Per-phase token instrumentation or reporting** — explicitly cut from v1. This is the decided wedge: audit-and-trim, not measure-and-trim. (Consequence accepted knowingly: if the real burn is somewhere unexpected, v1 may trim the wrong thing.)
- **A quality rubric for Sonnet outputs** — cut from v1; board approval remains the only fidelity check.
- Lossy summarisation of artifacts. Information dropped from a doc is a defect, not an optimisation.
- Changing lifecycle semantics: gates, staleness, stage order, the optional design stage, and the build/walkthrough contract are untouched.
- Optimising the Cursor/Codex/Antigravity surfaces directly — they inherit the result.

## Success metrics

1. **Primary (end-to-end acceptance test):** run a real feature's full lifecycle on Opus on a Pro plan and complete it without hitting the usage limit within one 5-hour window. This is the agreed acceptance criterion despite its known weaknesses (no baseline exists; feature size confounds the result — see Open questions).
2. **Sonnet quality holds:** a feature run with Sonnet as the session model produces stage docs the user approves on the board without quality-driven rework loops.
3. **Audit coverage:** the architecture doc demonstrably covers all six audit surfaces listed in Goals, each with a researched-best-practice citation or an explicit "already lean" verdict.
4. **No fidelity regressions:** condensed artifacts pass human board review with no information found missing relative to what the stage's inputs contained.

## Constraints & assumptions

### Constraints

- **No baseline exists.** Per-phase token burn is unmeasured and v1 will not measure it; the architect optimises from researched best practices plus inspection of the actual prompt/doc/tool surface.
- **Lossless only.** Any artifact-condensing change must preserve all information; density is the only permitted lever.
- **No hardcoded model names.** The plugin must not embed model identifiers (in agent frontmatter, command arguments, or config) that go stale as new models ship; model choice is the user's session-level decision.
- **Sequencing:** lands before feat-cursor-plugin, feat-codex-plugin, and feat-antigravity-plugin so the ports start from optimised prompts.
- **Verification is expensive.** The acceptance test costs a full 5-hour-window experiment per attempt; the plan should not assume cheap iteration on the end-to-end metric.
- Core invariants are out of bounds: gate enforcement, staleness computation, frontmatter authority, optimistic concurrency, and the marker-anchored CLAUDE.md merge must all survive any trimming of the managed block's *content*.

### Assumptions (inferred, flagged)

- The interview command's main-session protocol can be tightened without breaking its multi-turn nature (it cannot be delegated to a subagent by design).
- MCP tool outputs can be slimmed (e.g. omitting bodies or verbose fields where callers don't need them) without breaking the board UI or existing commands — to be verified by the architect.

## High-level user flows

- **Default lifecycle on a Pro plan (happy path):** user runs `/specmanager-interview` → `/specmanager-prd` → `/specmanager-architecture` → `/specmanager-plan` → `/specmanager-build` per phase → `/specmanager-walkthrough`. Every stage runs on the session model the user chose with `/model`; subagents inherit it. The whole run completes inside one 5-hour window on Opus-tier limits; the user notices nothing except that they no longer hit the cap.
- **Choosing the model:** the user picks the model for the work with `/model` (e.g. Sonnet for routine features, Opus for gnarly ones); there is no per-stage machinery to learn, configure, or keep current.
- **Reading condensed artifacts:** user opens a PRD or architecture doc on the board; it is noticeably denser than today's docs but contains everything it used to — approval workflow unchanged.
- **Port inheritance (downstream):** the Cursor/Codex/Antigravity feature work begins by copying the already-trimmed command/agent prompts; no re-optimisation pass is scheduled there.

## Open questions

Carried from the interview's Unresolved list; the architect inherits all of these.

1. **Where do the tokens actually go per phase?** Unmeasured. The audit proceeds on theory; if the dominant burn is somewhere unexpected (e.g. MCP payloads rather than prompts), v1 may trim the wrong surface, and discovering that costs a full 5-hour-window experiment.
2. **Fidelity judgement:** how is "no information lost" verified beyond a human approving the doc on the board? Today fidelity loss surfaces only when the human notices.
3. **"Very high standard" on Sonnet:** no rubric exists for judging phase-output quality on the smaller model; quality assessment is entirely the board-approval gate.
4. **Acceptance-test confounding:** feature size varies wildly and no baseline measurement exists; one feature fitting the window does not prove the next one will. Is a reference feature (size-pinned) worth defining for the test?
5. **Is trimming alone enough?** With model tiering dropped, prompt/doc/payload trims carry the entire goal; if they don't fit Opus in the window, the user's remaining lever is running spec stages on a lighter session model by hand.
