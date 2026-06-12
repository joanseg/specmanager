---
id: prd-cursor-plugin-015
featureId: feat-cursor-plugin
stage: prd
status: approved
stale: false
title: Cursor plugin PRD
dependsOn: []
basedOn: {}
generatedBy: agent
version: 1
createdAt: '2026-06-11T19:23:57.695Z'
updatedAt: '2026-06-11T19:27:38.304Z'
---
## Problem

SpecManager only runs inside Claude Code. Its entire delivery surface — slash commands, subagents, hooks, the MCP server, the board — is wired to Claude Code plugin machinery. Anyone working in another editor is locked out of the whole lifecycle.

The **Antigravity plugin** feature (approved PRD, 2026-06-11) established the strategic position: SpecManager is not a Claude-Code-only tool, and ports adapt the *delivery surface* while the `core/` implementation stays single. This feature is the second port of that bet, targeting **Cursor** — the most widely used agentic IDE. The user's framing is explicit: *"Same than Antigravity feature but for Cursor."*

Cursor matters for a different reason than Antigravity did. Antigravity was triggered by one named PM; Cursor is a reach play — it has the largest population of developers already living in an agentic editor with first-class MCP support. If SpecManager's adaptation layer is real, Cursor is the port that proves it generalises.

> **Honesty note (carried from the Antigravity PRD's discipline):** there is no named trigger user for Cursor yet. The demand signal is strategic ("largest agentic-IDE population") rather than observed. Unlike Antigravity, however, Cursor's extension surface is publicly documented, so feasibility risk is materially lower — the unknowns are narrower and listed below.

## Users & jobs-to-be-done

**Primary persona — the Cursor-native developer or semi-technical PM.**

- Lives in Cursor's agent panel; will not switch to the Claude Code terminal to drive a lifecycle.
- JTBD: "Take my feature idea through structured stages (PRD → architecture → design → plan → build → walkthroughs), with the IDE's agent drafting each artifact and me reviewing/approving on the board, without leaving Cursor."
- Sub-claim carried from Antigravity (A5 there): whether non-developer users will actually run **build** phases remains unobserved; for Cursor's developer-heavy population this claim is weaker but still worth one supervised session.

**Secondary persona — dual-client teams.**

- A repo driven from Claude Code by one person and from Cursor by another. JTBD: identical artifacts, gates, and board behaviour regardless of which client wrote them.

**Tertiary persona — Joan (maintainer).**

- JTBD: support a third client (after Claude Code and Antigravity) without forking the product or tripling the prompt-maintenance burden. The Antigravity port's adaptation layer must be reused, not re-invented; anything Cursor-specific that can't be generated from the shared prompt sources is a cost to accept explicitly.

## Goals / non-goals

### Goals

1. **Full SpecManager support inside Cursor** — mirroring the Antigravity scope decision: 100% feature coverage, not a subset. Same working assumption, same discipline: the spike converts this to a phased roadmap if any surface gap makes full parity expensive.
2. **Self-serve install** — a Cursor user installs SpecManager without Joan's help. Cursor has no plugin marketplace equivalent to Claude Code's; the candidate mechanisms are a project-level `.cursor/mcp.json` entry (optionally via Cursor's one-click MCP install deeplink), plus dropping the command/rules files into `.cursor/`. The exact packaging (npm package, installer script, template repo) is an architecture decision.
3. **One shared core** — the MCP server, board server, gate logic, and staleness graph remain the single `core/` implementation. The port adapts commands, rules, and hooks; it never duplicates validation or state transitions.
4. **Identical artifacts** — a project driven from Cursor produces the same `.claude/specs/**` markdown, frontmatter, and manifest as one driven from Claude Code or Antigravity. A repo must be drivable from any client interchangeably.
5. **Reuse the Antigravity adaptation layer** — whatever shared-prompt-source / orchestration-placement decisions the Antigravity architecture lands on, Cursor consumes them. If Cursor's port forces a different shape, that's a signal the adaptation layer is wrong, and the conflict goes back to architecture rather than being papered over per-client.
6. **De-risk before committing** — a short spike answers the Cursor-specific unknowns (listed under Open questions) before plan approval. Expected to be cheaper than Antigravity's spike because Cursor's surface is documented.

### Non-goals

- Not a rewrite of SpecManager's core, board, or storage model.
- Not a redesign of the lifecycle (stages, gates, staleness semantics unchanged).
- Not support for further IDEs (Windsurf, VS Code + Copilot, Zed, etc.) — Cursor only, though each port should keep sharpening the client-agnostic adaptation layer.
- Not a "PM mode" or simplified subset UI — same rejection as Antigravity.
- Not dropping or degrading the Claude Code plugin — it remains the reference implementation.
- **Not porting the board's in-UI chat** — it requires Anthropic credentials (`@anthropic-ai/claude-agent-sdk`). Carrying the Antigravity decision (2026-06-11) forward: the chat is **unsupported** on non-Claude-Code clients; drafting and editing flows do not depend on it.

### Relationship to the Antigravity feature

The Antigravity PRD's non-goals explicitly excluded Cursor ("Antigravity only, though the adaptation layer should not actively prevent future ports"). This feature is that anticipated future port. Sequencing matters: if Antigravity's architecture/spike work has produced the shared adaptation layer, Cursor builds on it; if it hasn't yet, the two features' architecture stages must be reconciled so the layer is designed once. The architect owns this call.

## Success metrics

1. **Self-serve lifecycle test (primary):** a Cursor user installs SpecManager **themselves** and completes **one full feature lifecycle** (PRD through final walkthrough approval) **without Joan's help**. Pass/fail, observed in one session.
2. **Artifact parity:** a feature driven entirely from Cursor yields specs that the Claude Code plugin (and the board) read without errors or divergence — gates, staleness badges, `baseVersion` rejection, and CLAUDE.md sync all behave identically. Concretely: alternate clients mid-feature (PRD in Cursor, architecture in Claude Code) and nothing breaks.
3. **Coverage scorecard:** every capability in the Claude Code plugin (each command, gate, sync behaviour, board feature) is marked *supported / degraded / unsupported* on Cursor at ship time. Target: 100% supported, with the board chat pre-accepted as *unsupported* (decision carried from Antigravity). Any other degraded/unsupported entry requires explicit written acceptance.
4. **Spike answered:** the Cursor-specific unknowns (hooks coverage, command-surface fidelity, install packaging) have verified yes/no answers with evidence before plan approval.
5. **Maintenance ceiling (guardrail):** no second copy of core logic; Cursor prompt files are generated from (or demonstrably kept in sync with) the shared prompt sources, and any unavoidable Cursor-only prompt text is measured and accepted explicitly.

## Constraints & assumptions

### Constraints

- **Gate enforcement, staleness, and frontmatter authority stay in `core`** — Cursor's agent goes through the same MCP tools / REST API; rules and command prompts may not become the enforcement layer.
- **Local-only posture is preserved:** board bound to `127.0.0.1`, no auth, single user, plain markdown in the target repo's git.
- **Single maintainer, now three clients.** Prompt-stack drift across Claude Code / Antigravity / Cursor is the dominant ongoing cost; shared prompt sources (or generation) is effectively mandatory, not optional.
- **Optimistic concurrency (`baseVersion`) must survive the port** — Cursor's agent writes must be rejected on version mismatch exactly like Claude's.
- **Project files land in `.cursor/`:** Cursor reads project MCP config from `.cursor/mcp.json`, custom slash commands from `.cursor/commands/*.md`, and rules from `.cursor/rules/*.mdc`. The port must not require global (`~/.cursor/`) configuration for the project-scoped pieces.

### Assumptions

Unlike Antigravity's PRD (where the load-bearing assumptions were all unverified), Cursor's surface is documented; assumptions are graded accordingly.

- **A1 (documented, verify in spike):** Cursor supports local MCP servers via `.cursor/mcp.json` — stdio (`command` + `args` + `env`) and remote (SSE / streamable HTTP) transports. SpecManager's stdio server with `SPECMANAGER_PROJECT_DIR` / `SPECMANAGER_BOARD_PORT` env should register directly. Verify: env-var interpolation, project-root resolution (the server must resolve the *workspace* root, not Cursor's process cwd), and whether the in-process board boot behaves under Cursor's MCP lifecycle (when servers are spawned/killed).
- **A2 (documented, verify fidelity):** Cursor supports custom slash commands as plain markdown in `.cursor/commands/`. These are prompt files, close cousins of Claude Code's `commands/*.md` — the orchestration content should carry over. Verify: argument passing, length limits, and how reliably Cursor's agent follows multi-step orchestration from a command file.
- **A3 (assumed, verify):** Cursor has **no subagent primitive** — delegation in `agents/*.md` flattens into single-agent prompting (same flattening Antigravity assumed). The interview-command exception (multi-turn in main session) is unaffected since Cursor's agent is already the main session.
- **A4 (partially documented, verify):** Cursor's hooks (beta) do not cover Claude Code's `SessionStart`/`FileChanged` responsibilities one-to-one. Working assumption: dependency installation moves into the install step (no `${CLAUDE_PLUGIN_DATA}` equivalent exists), and the re-read nudge on `.claude/specs/**` changes moves into rules (`.cursor/rules`) or is absorbed by the board's websocket-driven UI. The spike confirms what hooks (if any) are actually needed.
- **A5 (strategic, unvalidated):** Cursor users want this. No named trigger user; the first self-serve lifecycle test (metric 1) doubles as the demand observation.

## High-level user flows

*Sketches only; the architecture stage owns the actual integration design. Flows mirror the Antigravity PRD with Cursor-native mechanisms named.*

1. **Install (self-serve):** Cursor user discovers SpecManager → runs the documented install (adds the MCP server to `.cursor/mcp.json` — possibly via one-click deeplink — and places command/rules files in `.cursor/`) → Cursor lists the SpecManager MCP tools → board reachable in browser. No Claude-Code-only steps.
2. **Init a project:** user asks Cursor's agent to initialise SpecManager → agent calls `specmanager_init` over MCP → `.claude/specs/` scaffolded, managed CLAUDE.md block written (Cursor projects tolerate `.claude/` — see open question 5).
3. **Draft a stage:** user invokes the Cursor command equivalent of `/specmanager-prd` from `.cursor/commands/` → Cursor's agent reads the previous approved doc + codebase, drafts via `create_document` → doc appears live on the board.
4. **Review & approve:** unchanged — the human edits and approves in the board UI; gates open server-side. Platform-independent today; zero port work expected.
5. **Build a phase:** user triggers the build command → Cursor's agent works tasks in `dependsOn` order via the task MCP tools, stops at the phase boundary. Highest-fidelity-risk flow: depends on A2 (orchestration adherence) and A3 (no builder subagent).
6. **Walkthroughs & ship:** per-phase walkthroughs drafted by the agent, approved on the board; final approval fires `feature.shipped` and DESIGN.md sync — all core-side, unchanged.

## Open questions

**Spike-blocking (answer before architecture is approved):**

1. Does SpecManager's stdio MCP server run cleanly under Cursor's MCP lifecycle — env interpolation, workspace-root resolution (what replaces `CLAUDE_PROJECT_DIR`?), and the in-process board server boot (port lifetime when Cursor restarts/kills the MCP process)? *Answer: architect to check.*
2. How faithfully do `.cursor/commands/*.md` carry the existing orchestration prompts — arguments, length, multi-step adherence? Can they be generated from the Claude Code `commands/*.md` to prevent drift? *Answer: architect to check.*
3. What do Cursor hooks (beta) actually cover today, and which `SessionStart`/`FileChanged` responsibilities need a new home (install step, rules file, server-side)? *Answer: architect to check.*
4. What is the install packaging — npm package, installer script, template repo, deeplink — and does it meet the "installs it themselves" bar? *Answer: architect to check.*

**Scope (forced after the spike):**

5. Artifacts live under `.claude/specs/` — acceptable in a Cursor-only project, or does the path need to become configurable? (Same question as Antigravity's #8; answer once, for all clients.) *Answer: architect to check, jointly with the Antigravity feature.*
6. Sequencing with the Antigravity feature: does Cursor wait for Antigravity's adaptation layer, or do the two architecture stages land together? *Answer: architect to propose; if phasing is needed, phase 1 must produce a working, testable plugin in Cursor.*
7. The managed `CLAUDE.md` block is Claude-Code-named and Claude-Code-read. Does Cursor need an equivalent managed block in `.cursor/rules` (or `AGENTS.md`) so its agent gets the same lifecycle context, and does `sync_claude_md` grow a per-client target? *Answer: architect to check.*

**Validation:**

8. No named trigger user. Recruit one real Cursor user (or dogfood in Cursor on this repo) for the metric-1 session before declaring the port shipped. *Answer: dogfood first; Joan can run Cursor.*
