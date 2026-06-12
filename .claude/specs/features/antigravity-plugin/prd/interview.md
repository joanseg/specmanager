---
id: prd-antigravity-plugin-011
featureId: feat-antigravity-plugin
stage: prd
status: draft
stale: false
title: Antigravity plugin interview
dependsOn: []
basedOn: {}
generatedBy: agent
version: 1
kind: interview
createdAt: '2026-06-11T15:14:41.645Z'
updatedAt: '2026-06-11T15:14:41.645Z'
---
*Mode: started in startup interrogation, switched to builder mode after the strategic call (forcing-question method from gstack office-hours — https://github.com/garrytan/gstack/tree/main/office-hours).*

## Extracted

- SpecManager is Claude-Code-only today; the goal is full SpecManager support inside **Antigravity IDE** (Google's agentic IDE).
- Trigger: a specific, real potential user — a **semi-technical product manager** who refuses the Claude Code terminal (too much friction) and prefers Antigravity.
- Scope decision (made in-session): **100% feature coverage**, not a PM-friendly subset — and not for this PM alone but for **any Antigravity user**. Stated as a strategic platform decision.
- Success criteria: the PM **installs it himself** and **runs a full feature lifecycle** (PRD → architecture → design → plan → build → walkthroughs) without Joan's help.
- Technical layering acknowledged: MCP server + board are portable in principle; slash-command prompts, subagents, and hooks are Claude Code plugin machinery with no confirmed Antigravity equivalent.

## Critique

- **The entire feasibility is unverified.** Nobody has checked whether Antigravity can connect to a local MCP server or offers anything like custom commands/subagents/hooks. The strategic decision is placed on a platform whose integration surface is, in the user's words, "I have no idea, I hope so."
- **"100% coverage" began as an inference, not an observation.** When pressed, the justification shifted from "he needs it" to "strategic decision" — legitimate, but the observed evidence remains one PM's stated preference. No one has watched him attempt even one stage.
- **The PM-runs-build claim is untested.** A semi-technical PM executing build phases (agents committing code, gates, selftests) is the strongest claim in the room and rests on zero observation.
- **Solution-first smell on scope:** "assume everything can be supported" defers the hard trade-off precisely where ports usually die — if Antigravity's surface is weaker, this becomes a partial rebuild and "100%" becomes a roadmap.

## Recommended wedge

Interviewer's recommendation (the user deferred the wedge decision): **first verify the two load-bearing primitives (local MCP connection + any custom prompt surface) in a day-long spike, then ship board + document lifecycle in Antigravity with drafting done by Antigravity's native agent** — and only then commit to porting the command/subagent layer. Explicitly cut from v1 under this wedge: hooks parity and build-phase orchestration. (The user's stated position remains: decide later, assume full support.)

## Unresolved

- Does Antigravity support local MCP servers? Custom slash commands / workflows? Anything like subagents or session hooks? (→ architect, before anything else)
- What replaces the seven command prompts and six subagents on Antigravity's side — and who maintains two prompt stacks?
- Install story: what does "installs it himself" mean in Antigravity terms (marketplace? manual config?) and is there parity with the Claude Code plugin install?
- Will the PM actually run build phases? Unobserved; needs one supervised session.
- Narrowest wedge if full parity is infeasible — explicitly deferred by the user.
- Maintenance cost of dual-platform support on a single-maintainer project.
