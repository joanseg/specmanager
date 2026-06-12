---
id: prd-token-usage-optimisation-017
featureId: feat-token-usage-optimisation
stage: prd
status: draft
stale: false
title: Token usage optimisation interview
dependsOn: []
basedOn: {}
generatedBy: agent
version: 1
kind: interview
createdAt: '2026-06-12T08:33:34.822Z'
updatedAt: '2026-06-12T08:33:34.822Z'
---
**Mode:** builder / design-thinking throughout (demand established by the user's own dogfooding; shape was the open question). Probing via the office-hours forcing-question method (gstack).

## Extracted

- **The incident:** on the Claude Pro plan with Opus, a feature lifecycle exhausts the 5-hour usage window during the *spec* stages — somewhere between interview and design/plan, before build starts. With Sonnet, a large feature just barely builds.
- **The target:** a full feature lifecycle (interview → walkthrough) on Opus fits inside one 5-hour Pro window; on Sonnet, every phase output stays at a very high standard.
- **Nobody has measured where the tokens go.** The burn location is unknown; "the drafting agents are expensive" is unverified.
- **Division of labour:** the user brings no best-practices checklist — this feature's architecture stage must research current Claude Code guidance and audit SpecManager against it.
- **Decisions made in session:**
  - Wedge is **(b) audit-and-trim**; per-phase token instrumentation is explicitly cut from v1.
  - Acceptance test is end-to-end: run a real feature on Opus and not hit the limit in the window.
  - **Per-phase model assignment is in scope** — recommended (lighter) model per stage as default, user override to force a higher model.
  - **Artifacts may be condensed, losslessly** — denser docs are fine, dropped information is not.
  - **Full audit surface:** command prompts, agent prompts, doc flow between stages, MCP tool output sizes, the managed CLAUDE.md block, and the main-session interview itself.
  - **Sequencing:** this lands before the Cursor/Codex/Antigravity ports so they inherit the optimised prompts.

## Critique

- **Blind trim is a gamble the user chose knowingly.** With instrumentation cut, the architect optimises on theory; if the real burn is somewhere unexpected (e.g. MCP payloads, not prompts), v1 may trim the wrong thing and the only way to find out costs a full 5h-window experiment.
- **"Condense without losing fidelity" is unfalsifiable as stated.** No fidelity metric exists; in practice the board approval step is the fidelity check, which means fidelity loss surfaces only when the human notices.
- **The acceptance test is slow and confounded.** Feature size varies wildly; "fit in the window" on one feature doesn't prove it for another. No baseline measurement exists to compare against.
- **"Very high standard" on Sonnet is undefined** — there is no rubric for judging phase-output quality on a smaller model.

## Recommended wedge

The architecture stage researches current Claude Code token best practices, audits SpecManager's full surface (commands, agents, doc flow, MCP outputs, CLAUDE.md block, interview), and ships: trimmed prompts, lossless artifact-condensing instructions, and a recommended-model-per-stage default with an upward user override. **Cut from v1:** per-phase token instrumentation/reporting, and any quality rubric for Sonnet outputs.

## Unresolved

- Where the tokens actually go per phase — unmeasured; the architect inherits this as an open question.
- Whether prompt/doc trimming alone is enough to fit Opus in the window, or model tiering is doing the real work.
- Mechanism for the model override (plugin config? command argument?) — deferred to the architect.
- How "no fidelity loss" is judged beyond human approval on the board.
- What "very high standard" means for Sonnet-produced phases — no rubric.
