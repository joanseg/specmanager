---
id: prd-codex-plugin-016
featureId: feat-codex-plugin
stage: prd
status: approved
stale: false
title: Codex plugin PRD
dependsOn: []
basedOn: {}
generatedBy: agent
version: 1
createdAt: '2026-06-11T19:28:24.305Z'
updatedAt: '2026-06-11T19:38:33.702Z'
---
## Problem

SpecManager only runs inside Claude Code. Its entire delivery surface — slash commands, subagents, hooks, the MCP server, the board — is wired to Claude Code plugin machinery. Anyone working in another agentic tool is locked out of the whole lifecycle.

The **Antigravity plugin** feature (approved PRD, 2026-06-11) established the strategic position: SpecManager is not a Claude-Code-only tool, and ports adapt the *delivery surface* while the `core/` implementation stays single. The **Cursor plugin** feature is the second port. This feature is the third, targeting **OpenAI's Codex CLI**. The user's framing is explicit: *"Same than Antigravity feature but for Codex."*

Codex matters for yet another reason than the first two ports. Antigravity was triggered by one named PM; Cursor is the largest agentic-IDE population. Codex is the closest *structural* cousin of Claude Code itself — a terminal-native agent with first-class MCP client support, custom prompt files, and an instructions-file convention (AGENTS.md). If the adaptation layer generalises anywhere cheaply, it should be here; if even Codex needs bespoke work, that is important news about the layer's design.

> **Honesty note (carried from the Antigravity PRD's discipline):** there is no named trigger user for Codex yet. The demand signal is strategic ("OpenAI's official CLI agent, large developer population") rather than observed. Like Cursor — and unlike Antigravity — Codex's extension surface is publicly documented and open source, so feasibility risk is narrower; the genuinely Codex-specific unknowns are listed below.

## Users & jobs-to-be-done

**Primary persona — the Codex-native developer.**

- Lives in the Codex CLI (terminal). Unlike the Antigravity trigger PM, terminal comfort is a given here; what they refuse is *switching agents* — their model subscription, muscle memory, and AGENTS.md setup are on Codex.
- JTBD: "Take my feature idea through structured stages (PRD → architecture → design → plan → build → walkthroughs), with Codex drafting each artifact and me reviewing/approving on the board, without switching to Claude Code."
- Build-phase claim: Codex's population is developer-heavy and Codex is purpose-built for writing code, so "users will run build phases" is the *least* risky of the three ports — but the orchestration fidelity (phase boundaries, task ordering) still needs one observed session.

**Secondary persona — dual-client teams.**

- A repo driven from Claude Code by one person and from Codex by another (or by the same person across tools). JTBD: identical artifacts, gates, and board behaviour regardless of which client wrote them.

**Tertiary persona — Joan (maintainer).**

- JTBD: support a fourth client (after Claude Code, Antigravity, Cursor) without forking the product or multiplying the prompt-maintenance burden. By the third port the shared adaptation layer must be doing the work; anything Codex-specific that can't be generated from the shared prompt sources is a cost to accept explicitly.

## Goals / non-goals

### Goals

1. **Full SpecManager support inside Codex CLI** — mirroring the Antigravity scope decision: 100% feature coverage, not a subset. Same working assumption, same discipline: the spike converts this to a phased roadmap if any surface gap makes full parity expensive.
2. **Self-serve install** — a Codex user installs SpecManager without Joan's help. Codex has no plugin marketplace; the native mechanisms are MCP registration in `~/.codex/config.toml` (or via `codex mcp add specmanager -- node …/mcp.js`) plus custom prompt files in `~/.codex/prompts/`. Both are **global, per-user** — not per-project — which shapes the install story differently from Cursor's `.cursor/` directory. Exact packaging (npm package, installer script, documented `codex mcp add` one-liner) is an architecture decision.
3. **One shared core** — the MCP server, board server, gate logic, and staleness graph remain the single `core/` implementation. The port adapts prompts and install/config mechanics; it never duplicates validation or state transitions.
4. **Identical artifacts** — a project driven from Codex produces the same `.claude/specs/**` markdown, frontmatter, and manifest as one driven from Claude Code, Antigravity, or Cursor. A repo must be drivable from any client interchangeably.
5. **Reuse the shared adaptation layer** — whatever shared-prompt-source / orchestration-placement decisions the Antigravity and Cursor architectures land on, Codex consumes them. If Codex forces a different shape, the conflict goes back to architecture rather than being papered over per-client.
6. **De-risk before committing** — a short spike answers the Codex-specific unknowns (listed under Open questions) before plan approval. Expected cheap: Codex is open source, so answers can be read from the implementation, not just docs.

### Non-goals

- Not a rewrite of SpecManager's core, board, or storage model.
- Not a redesign of the lifecycle (stages, gates, staleness semantics unchanged).
- Not support for Codex's *other* surfaces — the Codex IDE extension, Codex cloud/web tasks, or Codex-as-MCP-server (`codex mcp serve`). CLI only; the adaptation layer should not actively prevent those later.
- Not support for further agents (Gemini CLI, Copilot CLI, etc.) — Codex only in this feature.
- Not a "PM mode" or simplified subset UI — same rejection as Antigravity.
- Not dropping or degrading the Claude Code plugin — it remains the reference implementation.
- **Not porting the board's in-UI chat** — it requires Anthropic credentials (`@anthropic-ai/claude-agent-sdk`). Carrying the Antigravity decision (2026-06-11) forward: the chat is **unsupported** on non-Claude-Code clients; drafting and editing flows do not depend on it.

### Relationship to the Antigravity and Cursor features

The Antigravity PRD's non-goals anticipated future ports without blocking them. Cursor is in flight as the second. Sequencing matters the same way it did there: if the shared adaptation layer exists by the time this feature reaches architecture, Codex builds on it; if the three architecture stages overlap, they must be reconciled so the layer is designed once. The architect owns this call — and Codex, being the most Claude-Code-like client, is a good stress test that the layer isn't accidentally Cursor-shaped.

## Success metrics

1. **Self-serve lifecycle test (primary):** a Codex user installs SpecManager **themselves** and completes **one full feature lifecycle** (PRD through final walkthrough approval) **without Joan's help**. Pass/fail, observed in one session.
2. **Artifact parity:** a feature driven entirely from Codex yields specs that the Claude Code plugin (and the board) read without errors or divergence — gates, staleness badges, `baseVersion` rejection, and CLAUDE.md sync all behave identically. Concretely: alternate clients mid-feature (PRD in Codex, architecture in Claude Code) and nothing breaks.
3. **Coverage scorecard:** every capability in the Claude Code plugin (each command, gate, sync behaviour, board feature) is marked *supported / degraded / unsupported* on Codex at ship time. Target: 100% supported, with the board chat pre-accepted as *unsupported* (decision carried from Antigravity). Any other degraded/unsupported entry requires explicit written acceptance.
4. **Spike answered:** the Codex-specific unknowns (global-config project resolution, prompt-surface fidelity, sandbox/approval interaction, AGENTS.md sync) have verified yes/no answers with evidence before plan approval.
5. **Maintenance ceiling (guardrail):** no second copy of core logic; Codex prompt files are generated from (or demonstrably kept in sync with) the shared prompt sources, and any unavoidable Codex-only prompt text is measured and accepted explicitly.

## Constraints & assumptions

### Constraints

- **Gate enforcement, staleness, and frontmatter authority stay in `core`** — Codex goes through the same MCP tools / REST API; prompt files and AGENTS.md may not become the enforcement layer.
- **Local-only posture is preserved:** board bound to `127.0.0.1`, no auth, single user, plain markdown in the target repo's git.
- **Single maintainer, now four clients.** Prompt-stack drift across Claude Code / Antigravity / Cursor / Codex is the dominant ongoing cost; shared prompt sources (or generation) is mandatory, not optional.
- **Optimistic concurrency (`baseVersion`) must survive the port** — Codex's writes must be rejected on version mismatch exactly like Claude's.
- **Codex config is global, not per-project.** MCP servers (`[mcp_servers.*]` in `~/.codex/config.toml`) and custom prompts (`~/.codex/prompts/`) are registered per-user. There is no `${CLAUDE_PROJECT_DIR}`-style per-project interpolation at registration time, so the server's project-root resolution (`SPECMANAGER_PROJECT_DIR` ?? `CLAUDE_PROJECT_DIR` ?? cwd) becomes load-bearing: the cwd fallback must reliably equal the repo Codex was launched in. One global registration must serve many projects.
- **Codex reads AGENTS.md, not CLAUDE.md.** The managed lifecycle block that gives the agent project context must reach Codex through an AGENTS.md-managed region (same line-anchored marker mechanism), or Codex's agent flies blind on lifecycle state.

### Assumptions

Graded like Cursor's: Codex's surface is documented and open source, so most assumptions are "verify", not "unknown".

- **A1 (documented, verify in spike):** Codex supports local stdio MCP servers via `~/.codex/config.toml` (`command`, `args`, `env`) and the `codex mcp add` CLI. SpecManager's stdio server should register directly. Verify: what cwd Codex spawns MCP servers with (this decides whether the cwd fallback resolves the project root), env handling, startup-timeout behaviour for a server that also boots the board in-process, and the board's port lifetime across Codex sessions.
- **A2 (documented, verify fidelity):** Codex custom prompts (`~/.codex/prompts/*.md`, invoked as `/specmanager-prd` etc., with positional/`$ARGUMENTS` argument support) can carry the orchestration currently in `commands/*.md`. Verify: argument passing, length limits, multi-step adherence — and whether any *repo-scoped* prompt location exists, since global prompts mean every project shares one prompt version.
- **A3 (documented):** Codex has **no subagent primitive and no session hooks** — delegation in `agents/*.md` flattens into single-agent prompting (same flattening as the other ports). The closest hook analogue is the `notify` hook (an external program invoked on events), which is not a `SessionStart` replacement: dependency installation moves into the install step, and the `.claude/specs/**` re-read nudge moves into AGENTS.md guidance or is absorbed by the board's websocket-driven UI. The interview-command exception (multi-turn in main session) is unaffected — Codex's session is already the main session.
- **A4 (documented, verify interaction):** Codex runs agent-executed commands inside a sandbox with approval modes (read-only / workspace-write / full access). MCP servers are spawned by the CLI itself, so SpecManager's server and board are expected to sit outside the command sandbox — verify this, and verify that a lifecycle (especially build phases, which shell out and write code) runs under `workspace-write` without approval friction that breaks the flow.
- **A5 (strategic, unvalidated):** Codex users want this. No named trigger user; the first self-serve lifecycle test (metric 1) doubles as the demand observation.

## High-level user flows

*Sketches only; the architecture stage owns the actual integration design. Flows mirror the Antigravity/Cursor PRDs with Codex-native mechanisms named.*

1. **Install (self-serve, once per machine):** Codex user discovers SpecManager → runs the documented install (registers the MCP server — `codex mcp add specmanager -- node …/mcp.js` or a `config.toml` snippet — and places the `specmanager-*` prompt files in `~/.codex/prompts/`) → Codex lists the SpecManager MCP tools → board reachable in browser. Because registration is global, install happens once; per-project behaviour comes from cwd resolution.
2. **Init a project:** user asks Codex to initialise SpecManager → Codex calls `specmanager_init` over MCP → `.claude/specs/` scaffolded, managed lifecycle block written where Codex will read it (AGENTS.md — see open question 5; `.claude/` path tolerance is open question 6).
3. **Draft a stage:** user invokes `/specmanager-prd` (a `~/.codex/prompts/` custom prompt) → Codex reads the previous approved doc + codebase, drafts via `create_document` → doc appears live on the board.
4. **Review & approve:** unchanged — the human edits and approves in the board UI; gates open server-side. Platform-independent today; zero port work expected.
5. **Build a phase:** user triggers the build prompt → Codex works tasks in `dependsOn` order via the task MCP tools, stops at the phase boundary. Fidelity risks: A2 (orchestration adherence without a builder subagent) and A4 (sandbox/approval friction while writing code and running tests).
6. **Walkthroughs & ship:** per-phase walkthroughs drafted by Codex, approved on the board; final approval fires `feature.shipped` and DESIGN.md sync — all core-side, unchanged.

## Open questions

**Spike-blocking (answer before architecture is approved):**

1. Does SpecManager's stdio MCP server run cleanly under Codex's MCP lifecycle — spawn cwd (does the cwd fallback resolve the project root, or does the registration need a wrapper that injects `SPECMANAGER_PROJECT_DIR`?), env handling, startup timeout with the in-process board boot, and board-port lifetime when Codex exits or several Codex sessions run in different repos? *Answer: architect to check (Codex is open source — read the implementation).*
2. How faithfully do `~/.codex/prompts/*.md` carry the existing orchestration prompts — arguments, length, multi-step adherence — and can they be generated from the shared prompt sources to prevent drift? Is there any repo-scoped prompt mechanism, or are prompts global-only (one version across all projects)? *Answer: architect to check.*
3. With no hooks, which `SessionStart`/`FileChanged` responsibilities need a new home (install step, AGENTS.md guidance, server-side, or the `notify` hook), and is the runtime-deps story (`${CLAUDE_PLUGIN_DATA}` has no Codex equivalent) folded into install? *Answer: architect to check.*
4. What is the install packaging — npm package exposing a `codex mcp add`-able binary, installer script, documented snippet — and does it meet the "installs it themselves" bar given everything is global config? *Answer: architect to check.*

**Scope (forced after the spike):**

5. The managed `CLAUDE.md` block is Claude-Code-read. Codex reads **AGENTS.md** (merged global → repo root → cwd). Does `sync_claude_md` grow an AGENTS.md target with the same line-anchored managed region, and is it written on init for Codex-driven projects? (Cursor's PRD asks the same per-client question — answer once, for all clients.) *Answer: architect to check, jointly with the Cursor feature.*
6. Artifacts live under `.claude/specs/` — acceptable in a Codex-only project, or does the path need to become configurable? (Same as Antigravity #8 / Cursor #5; answer once, for all clients.) *Answer: architect to check, jointly with the other port features.*
7. Sequencing across the three ports: does Codex wait for the Antigravity/Cursor adaptation layer, or do the architecture stages land together? *Answer: architect to propose; if phasing is needed, phase 1 must produce a working plugin testable in Codex.*
8. Sandbox/approval defaults: should the install docs recommend a Codex approval/sandbox configuration for lifecycle work (e.g. `workspace-write`), or must every flow survive the defaults? *Answer: architect to check during the spike's supervised build session.*

**Validation:**

9. No named trigger user. Recruit one real Codex user (or dogfood in Codex on this repo) for the metric-1 session before declaring the port shipped. *Answer: dogfood first; Codex CLI is freely installable.*
