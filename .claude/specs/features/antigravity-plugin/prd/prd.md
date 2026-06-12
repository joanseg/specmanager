---
id: prd-antigravity-plugin-012
featureId: feat-antigravity-plugin
stage: prd
status: approved
stale: false
title: Antigravity plugin PRD
dependsOn: []
basedOn: {}
generatedBy: human
version: 3
createdAt: '2026-06-11T15:19:07.730Z'
updatedAt: '2026-06-11T16:23:42.208Z'
---
## Problem

SpecManager only runs inside Claude Code. Its entire delivery surface — slash commands, subagents, hooks, the MCP server, the board — is wired to Claude Code plugin machinery. Anyone who won't (or can't) work in the Claude Code terminal is locked out of the whole lifecycle.

This is not hypothetical. A real, semi-technical product manager wants to drive feature lifecycles with SpecManager but refuses the Claude Code terminal outright — too much friction — and works in **Antigravity IDE** (Google's agentic IDE) instead. Today he cannot use SpecManager at all.

Beyond that one user, the decision was made in the pre-PRD interview to treat this as a **strategic platform bet**: SpecManager should not be a Claude-Code-only tool. Antigravity is the first second platform.

> **Honesty note (carried from the interview):** the observed evidence is one PM's stated preference. The "any Antigravity user" framing is a strategic decision, not a validated demand signal. The feasibility of the port is entirely unverified as of this writing.

## Users & jobs-to-be-done

**Primary persona — the semi-technical PM (real, named trigger user).**

- Wants to run a full feature lifecycle (PRD → architecture → design → plan → build → walkthroughs) on his own projects.

- Comfortable in an IDE with an agent panel; not comfortable in a raw terminal.

- JTBD: "Take my feature idea through structured stages, with an AI drafting each artifact and me reviewing/approving on the board, without ever touching a terminal."

- Untested sub-claim: that he will personally run **build** phases (agents writing and committing code). This is the strongest claim in scope and rests on zero observation.

**Secondary persona — any Antigravity user (strategic scope).**

- Developers or PMs already living in Antigravity who want spec-driven lifecycle management with a local kanban board.

- JTBD: same as today's Claude Code users — drive features through gated stages, with git-tracked markdown artifacts and human approval at each gate.

**Tertiary persona — Joan (maintainer).**

- JTBD: support a second platform without forking the product. Anything that duplicates core logic or doubles the prompt-maintenance burden is a cost this single-maintainer project must explicitly accept.

## Goals / non-goals

### Goals

1. **Full SpecManager support inside Antigravity** — the user's stated scope is **100% feature coverage**, not a PM-friendly subset. Working assumption (user's, explicit): "everything can be supported."
1. **Self-serve install** — an Antigravity user installs SpecManager without Joan's help, via whatever distribution mechanism Antigravity offers (marketplace, config file, manual — TBD).
1. **One shared core** — the MCP server, board server, gate logic, and staleness graph remain the single `core/` implementation. The port adapts the _delivery surface_ (commands, agents, hooks), never duplicates validation or state transitions.
1. **Identical artifacts** — a project driven from Antigravity produces the same `.claude/specs/**` markdown, frontmatter, and manifest as one driven from Claude Code. A repo must be drivable from either client interchangeably.
1. **De-risk before committing** — the first deliverable is a feasibility spike answering the load-bearing unknowns (local MCP connectivity + custom prompt surface) before any porting work is planned.

### Non-goals

- Not a rewrite of SpecManager's core, board, or storage model.

- Not a redesign of the lifecycle (stages, gates, and staleness semantics are unchanged).

- Not support for other IDEs (Cursor, Windsurf, VS Code + Copilot, etc.) — Antigravity only, though the adaptation layer should not actively prevent future ports.

- Not a "PM mode" or simplified subset UI — explicitly rejected in the interview in favour of full coverage.

- Not dropping or degrading the Claude Code plugin — it remains the reference implementation.

- **Not porting the board's in-UI chat** — it requires Anthropic credentials (`@anthropic-ai/claude-agent-sdk`) and is **unsupported on Antigravity by user decision (2026-06-11)**; see success metric 3.

### Scope tension to resolve (carried honestly from the interview)

The interviewer's recommended wedge was: (1) day-long spike verifying local MCP + custom prompt surface, (2) ship **board + document lifecycle** in Antigravity with drafting done by Antigravity's native agent, (3) only then commit to porting the command/subagent layer — with hooks parity and build-phase orchestration explicitly cut from v1. **The user deferred this decision** and held the position "assume full support, decide later." This PRD records both positions; the architecture stage must force the decision once the spike returns facts. If Antigravity's surface is weaker than hoped, "100% coverage" becomes a phased roadmap, not a v1 promise.

## Success metrics

1. **The trigger-user test (primary, from the interview):** the PM installs SpecManager in Antigravity **himself** and completes **one full feature lifecycle** (PRD through final walkthrough approval) **without Joan's help**. Pass/fail, observed in one session.
1. **Artifact parity:** a feature driven entirely from Antigravity yields specs that the Claude Code plugin (and the board) read without errors or divergence — gates, staleness badges, and CLAUDE.md sync all behave identically.
1. **Coverage scorecard:** every capability in the Claude Code plugin (each command, gate, sync behaviour, board feature) is marked _supported / degraded / unsupported_ on Antigravity at ship time. Target per the user's scope decision: 100% supported. Any "degraded/unsupported" entry requires an explicit, written acceptance. **Pre-accepted exception (user decision, 2026-06-11): the board's in-UI chat is marked _unsupported_ on Antigravity** — it requires Anthropic credentials and is outside the port's scope; no port work targets it. The 100%-supported target applies to everything else; drafting and editing flows do not depend on the chat.
1. **Spike answered:** the two load-bearing unknowns (local MCP server connection; custom command/workflow surface) have verified yes/no answers with evidence, before plan approval.
1. **Maintenance ceiling (guardrail):** the port adds no second copy of core logic; prompt-stack duplication (if any) is measured and accepted explicitly.

## Constraints & assumptions

### Constraints

- **Gate enforcement, staleness, and frontmatter authority stay in** **`core`** — whatever Antigravity's agent surface looks like, it must go through the same MCP tools / REST API; prompts may not become the enforcement layer.

- **Local-only posture is preserved:** board bound to `127.0.0.1`, no auth, single user, plain markdown in the target repo's git.

- **Single maintainer.** Two prompt stacks (Claude Code commands/agents + Antigravity equivalents) is a real ongoing cost; the design must minimise drift, e.g. shared prompt sources.

- **Optimistic concurrency (`baseVersion`) must survive the port** — Antigravity's agent writes must be rejected on version mismatch exactly like Claude's.

### Assumptions (all flagged; the first three are unverified and load-bearing)

- **A1 (unverified):** Antigravity can connect to a locally-spawned stdio or HTTP MCP server. _If false, the integration model changes fundamentally._

- **A2 (unverified):** Antigravity offers some custom prompt surface (commands, workflows, or rules files) capable of carrying the orchestration currently in `commands/*.md`. _If false, orchestration must move server-side or into docs the user pastes._

- **A3 (unverified):** Antigravity has nothing equivalent to subagents or session hooks; the working assumption is that subagent delegation flattens into single-agent prompting and hook behaviour (dep install, re-read nudges) moves into the server or install step.

- **A4 (user's working assumption, stated):** everything can be supported — 100% coverage is achievable. The interview critique flags this as solution-first; the spike either confirms it or converts the scope to phases.

- **A5 (unobserved):** the PM will actually run build phases. Needs one supervised session before build-phase UX is finalised.

## High-level user flows

_Sketches only; the architecture stage owns the actual integration design._

1. **Install (self-serve):** Antigravity user discovers SpecManager → follows Antigravity-native install steps → MCP server registered and board reachable → opens board in browser. No terminal-only steps the trigger PM can't perform.
1. **Init a project:** user asks Antigravity's agent to initialise SpecManager → agent calls `specmanager_init` over MCP → `.claude/specs/` scaffolded, managed CLAUDE.md block written.
1. **Draft a stage:** user invokes the Antigravity equivalent of `/specmanager-prd` (exact mechanism TBD per spike) → Antigravity's agent reads the previous approved doc + codebase, drafts via `create_document` → doc appears live on the board.
1. **Review & approve:** unchanged — the human edits and approves in the board UI; gates open server-side. (This flow is platform-independent today and should require zero port work.)
1. **Build a phase:** user triggers a phase build → Antigravity's agent works tasks in `dependsOn` order via the task MCP tools, stops at the phase boundary. _Highest-risk flow: depends on A2/A3 and on the unobserved A5._
1. **Walkthroughs & ship:** per-phase walkthroughs drafted by the agent, approved on the board; final approval fires `feature.shipped` and DESIGN.md sync — all core-side, unchanged.

## Open questions

Carried from the interview's "Unresolved" list, plus PRD-stage additions; the first block must be answered by the spike **before architecture is approved**.

**Spike-blocking (feasibility):**

1. Does Antigravity support local MCP servers (stdio and/or HTTP)? With what config/registration story?\
   Answere: ask Architect to check
1. Does Antigravity offer custom slash commands / workflows / rules files? What can they carry?\
   Answer: ask architect to confirm
1. Is there anything like subagents or session hooks? If not, what absorbs each responsibility?

   Answer: ask architect to cechk

**Scope (forced after the spike):**

4\. The wedge decision the user deferred: if full parity isn't cheaply achievable, what ships first? (Interviewer's recommendation on record: board + doc lifecycle first; hooks parity and build orchestration cut from v1.)

Answer: if very costly architect can suggest phases, from first phase there has to be a working plugin testable on antigravity

5\. What does "installs it himself" concretely mean in Antigravity — marketplace listing, extension, manual MCP config? Is there install parity with `/plugin install`?\
Answer: architect to check

**Validation:**

6\. Will the PM actually run build phases? Schedule one supervised session; let the observation, not the assumption, set the build-flow bar.

Answer: yes

7\. Who maintains two prompt stacks, and can the Antigravity prompts be generated from the Claude Code `commands/*.md` to prevent drift?\
Answer: Architect to check

**Naming/placement (minor):**

8\. Artifacts live under `.claude/specs/` — fine for dual-client repos, but does an Antigravity-only project tolerate a `.claude/` directory, or does the path need to become configurable?

Answer: architect to check
