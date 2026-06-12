---
id: arch-antigravity-plugin-010
featureId: feat-antigravity-plugin
stage: architecture
status: approved
stale: false
title: Antigravity plugin architecture
dependsOn:
  - prd-antigravity-plugin-012
basedOn:
  prd-antigravity-plugin-012: 2
generatedBy: human
version: 4
createdAt: '2026-06-11T15:38:46.300Z'
updatedAt: '2026-06-11T16:25:21.584Z'
---
## Summary

We port SpecManager's **delivery surface** — not its core — to Google's Antigravity IDE. The MCP server, board server, gate logic, staleness graph, and storage under `.claude/specs/` stay exactly as they are in `plugins/specmanager/server/src/core/`; Antigravity gets a new, mostly **generated** front end: an MCP registration in `~/.gemini/config/mcp_config.json`, one Antigravity **workflow** per slash command (workflows are markdown files invoked as `/workflow-name` — a near-1:1 match for `commands/*.md`), and a rules file that carries the always-on behavioural contract. Web research (cited below) confirms the two load-bearing primitives the PRD gated on: **local stdio MCP servers work in Antigravity today**, and **a custom slash-command prompt surface exists**. Antigravity 2.0 (I/O 2026) even added hooks and subagents, though their configurability is still unverified. The wedge decision the PRD deferred is forced in this document: **target 100% capability coverage, delivered in three phases, each independently testable on Antigravity**, with subagent delegation _flattened_ into single-agent workflows (safe because gates live in `core`, not in prompts). **Flavour scope** (see "Antigravity flavour scope" below): the **Antigravity IDE** is the verified target; the **Antigravity CLI** inherits compatibility through the shared config surfaces and gets one Phase C smoke check; **Antigravity 2.0 is a version, not a flavour** — Phases A/B depend only on pre-2.0 primitives, so 1.x and 2.0 are both supported.

Two genuine core changes fall out of the research: (1) Antigravity's MCP config is **global per-user**, so the `${CLAUDE_PROJECT_DIR}` env injection in `plugins/specmanager/.mcp.json` has no equivalent — project-root resolution in `server/src/core/paths.ts` must gain per-call fallbacks; (2) Antigravity reads `AGENTS.md`, not `CLAUDE.md`, so the managed lifecycle block must also sync there, reusing the line-anchored marker merge from `core/claude-md.ts`.

## Platform research findings

### Verified (current public docs + hands-on reports, as of June 2026)

| Capability                         | Finding                                                                                                                                                                                                                                                                                                                                                      | Evidence                                                                                                                                                                                                                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local **stdio MCP** servers        | Supported: `command` / `args` / `env` entries in `~/.gemini/config/mcp_config.json` (shared by Antigravity IDE and CLI). Managed via the agent panel's MCP store → "View raw config".                                                                                                                                                                        | [Official MCP docs](https://antigravity.google/docs/mcp); [Dazbo, Google Cloud Community, May 2026](https://medium.com/google-cloud/configuring-mcp-servers-and-skills-for-antigravity-cli-and-ide-a938c7eebb78) — demonstrates several local stdio servers working in both IDE and CLI |
| Remote **HTTP MCP**                | Supported via `serverUrl` (+ `headers`, `authProviderType`). Not needed for us (local-only posture).                                                                                                                                                                                                                                                         | same sources                                                                                                                                                                                                                                                                            |
| **Custom slash commands**          | "Workflows": markdown files in `<workspace>/.agent/workflows/` (global: `~/.gemini/antigravity/global_workflows/`), invoked as `/workflow-name` with autocomplete. YAML frontmatter requires `description` (≤250 chars); **body ≤12,000 chars**. Can instruct the agent to run terminal commands; `// turbo` / `// turbo-all` annotations auto-approve them. | [Official rules/workflows docs](https://antigravity.google/docs/rules-workflows); [Atamel, Nov 2025](https://atamel.dev/posts/2025/11-25_customize_antigravity_rules_workflows/); [Agentpedia workflows guide](https://agentpedia.codes/blog/workflows)                                 |
| **Rules** (always-on instructions) | `<workspace>/.agent/rules/*.md` (≤12,000 chars each); global `~/.gemini/GEMINI.md`. Plus `AGENTS.md` at repo root is prepended to every prompt in that directory.                                                                                                                                                                                            | same sources                                                                                                                                                                                                                                                                            |
| **Hooks**                          | Added in Antigravity 2.0 (I/O 2026): JSON-configured shell-script hooks at lifecycle moments — session start, before/after tool call, before/after model call, loop stop.                                                                                                                                                                                    | [Antigravity I/O 2026 feature deep-dive](https://antigravity.google/blog/google-io-2026-feature-deep-dive)                                                                                                                                                                              |
| **Subagents**                      | Added in 2.0: spawned programmatically by the main agent, parallel, workspace-isolated.                                                                                                                                                                                                                                                                      | same; [apidog on Antigravity 2.0](https://apidog.com/blog/google-antigravity-2/)                                                                                                                                                                                                        |
| **Models**                         | Gemini 3.5 Flash default; Claude Sonnet and GPT-OSS selectable. Our prompts will usually run under **Gemini**, not Claude.                                                                                                                                                                                                                                   | [apidog](https://apidog.com/blog/google-antigravity-2/)                                                                                                                                                                                                                                 |
| **Skills**                         | `~/.gemini/skills/`, installed via `npx skills add <repo-url>`, auto-activated contextually. A possible distribution channel, but activation is implicit — wrong fit for gated lifecycle commands.                                                                                                                                                           | [Dazbo, May 2026](https://medium.com/google-cloud/configuring-mcp-servers-and-skills-for-antigravity-cli-and-ide-a938c7eebb78)                                                                                                                                                          |

### Unverified — the spike must confirm (Phase A task 1)

1. **Per-project context for a global MCP server.** `mcp_config.json` is per-user, with no documented `${workspace}` substitution; one report says env-var expansion in it is unreliable. Does Antigravity spawn the stdio process **per window with cwd = workspace root**, or one shared process? This decides which `projectRoot()` fallback actually fires (design handles both — see Interfaces).
1. **Hook config schema** (2.0 is new; public docs are thin). Only needed for Phase C parity; nothing user-facing depends on it.
1. **Declarative custom subagents** — can users define named subagents with their own system prompts (à la `agents/*.md`), or are subagents purely runtime-spawned? Phase C concern only.
1. **Workflow→MCP-tool calling in practice** — workflows clearly drive the agent, and the agent calls MCP tools; no doc states a restriction, but the spike must run one end-to-end draft.
1. **Install without a terminal** — the trigger PM refuses terminals; the install path below has Antigravity's own agent run the commands. The spike must watch this work once.

## Antigravity flavour scope

Antigravity ships in more than one form; this architecture's support claims are explicit per flavour:

| Flavour | Support claim | Basis |
|---------|---------------|-------|
| **Antigravity IDE** | **Verified target.** All Phase A/B exit tests run here; the trigger-PM success metric (self-install, full lifecycle) is an IDE scenario; the agent-panel install flow and board interplay are designed for it. | Primary design surface throughout this doc |
| **Antigravity CLI** | **Supported by design, verified once.** Both hard dependencies are shared with the IDE: the same `~/.gemini/config/mcp_config.json` MCP registration and the same workflow surfaces (workspace `.agent/workflows/`, global `~/.gemini/antigravity/global_workflows/`). No CLI-specific code exists to write. Not a goal of this feature (the trigger PM rejects terminals), so it gets exactly one Phase C smoke check rather than per-phase exit tests. | Shared-config evidence in the research table ([Dazbo, May 2026] demonstrates local stdio servers in both IDE and CLI) |
| **Antigravity 2.0** | **A version, not a flavour.** Phases A/B depend only on primitives that predate 2.0 (stdio MCP, workflows, rules), so both 1.x and 2.0 installs are supported. The 2.0-only surfaces (hooks, subagents) are quarantined in Phase C as *optional* adoption, gated on unverified items 2–3. | Research table: hooks/subagents marked "Added in 2.0" |

Anything Antigravity ships next (new flavours, new surfaces) is out of scope until the scorecard says otherwise.

## The forced wedge decision

**Decision: commit to 100% capability coverage as the target, shipped in three phases, each leaving a working, testable plugin on Antigravity. Mechanism parity is explicitly** _**not**_ **required — capability parity is.** Concretely:

- **Subagent delegation is flattened in v1.** The Claude Code commands delegate to `agents/*.md` via the Task tool purely for context hygiene; every invariant that matters (gates, staleness, versioning, task state) is enforced in `core`. A single Antigravity agent following the merged command+agent protocol produces the same artifacts through the same MCP tools. The coverage scorecard marks this **supported** (capability), with a note that isolation is weaker. Phase C revisits Antigravity-native subagents if unverified item 3 lands.

- **Hooks parity is dropped, not deferred.** Both Claude Code hooks exist for plugin-machinery reasons that don't transfer: the `SessionStart` dep-install in `hooks/hooks.json` works around plugin-dir replacement on update (Antigravity install runs `npm install` once into a stable user-chosen location, so it's unnecessary); the `FileChanged` nudge becomes one line in the generated rules file ("re-read affected specs after the board edits them"). Scorecard: **supported (different mechanism)**.

- **Build-phase orchestration ships in Phase B, not cut.** The interview recommended cutting it; the PRD's user answered Q6 with a flat "yes, the PM will run builds" and Q4 with "phases are fine if each is testable". Research found no blocker: workflows can carry the builder protocol and `// turbo` smooths the command-approval friction. One supervised PM build session (A5) is scheduled inside Phase B before sign-off.

- **The board's in-UI chat is *not supported* on Antigravity** (user decision, 2026-06-11; written acceptance recorded in PRD success metric 3). See Failure & edge cases for the mechanics.

**Phases** (each ends with the plugin installable and testable on a real Antigravity instance):

- **Phase A — spike hardened into the doc lifecycle.** Installer + MCP registration + generated workflows for `init`, `interview`, `prd`, `architecture`, `design`, `plan`, `board` + rules file + `AGENTS.md` sync + `paths.ts` root resolution. Exit test: draft and approve a PRD→plan entirely from Antigravity; same repo still works from Claude Code.

- **Phase B — execution.** `build` and `walkthrough` workflows; pidfile/port behaviour verified with both clients open; the supervised PM build session. Exit test: a full lifecycle PRD→final walkthrough from Antigravity, `feature.shipped` fires, `docs/DESIGN.md` syncs.

- **Phase C — parity polish + scorecard sign-off.** Coverage scorecard published (every command, gate, sync, board feature: supported/degraded/unsupported — the in-UI chat ships as the pre-accepted **unsupported** entry); optional native subagents/hooks if the 2.0 surfaces prove configurable; **one CLI smoke check** (run a doc-lifecycle workflow from the Antigravity CLI against the same repo — confirms the supported-by-design claim above); the trigger-user test (PM installs and runs a lifecycle unassisted).

## Affected components

**New —** **`plugins/specmanager/antigravity/`** (generated + static, committed like `dist/`):

- `workflows/specmanager-*.md` — one generated Antigravity workflow per command in `plugins/specmanager/commands/` (9 today).

- `rules/specmanager.md` — generated rules file: always pass the project root to SpecManager tools, never approve docs, respect `baseVersion` conflicts by re-reading, re-read specs the board changed.

- `mcp_config.snippet.json` — documented template entry for `~/.gemini/config/mcp_config.json` (literal absolute paths; **no** **`${}`** **expansions**, since expansion there is unreliable).

- `INSTALL.md` — the self-serve story: a single paste-able bootstrap prompt for Antigravity's agent panel that clones/updates the repo, runs `npm install` + the installer, and verifies the board comes up. No step the PM performs in a raw terminal.

**New — server sources** (compiled to `server/dist/` like everything else):

- `server/src/gen-antigravity.ts` — the prompt generator (npm script `gen-antigravity`). Reads `commands/*.md` + `agents/*.md`, strips Claude-Code-specific steps (Task-tool delegation, `${CLAUDE_PLUGIN_ROOT}` mentions), inlines the delegated agent's protocol into the command, rewrites frontmatter to Antigravity's `description:`-only form, and **fails the build if any output exceeds 12,000 chars** — for oversized pairs (today: plan = 2,830+10,850, build = 7,542+5,261; measured) it falls back to _trampoline mode_: the workflow stays under the cap and instructs the agent to `Read` the full protocol from `antigravity/prompts/<agent>.md`, which the installer also copies into the project.

- `server/src/antigravity-install.ts` — installer: merges the SpecManager entry into `~/.gemini/config/mcp_config.json` (create-if-missing, preserve other servers), copies `workflows/` + `prompts/` + `rules/` into the target project's `.agent/`, prints the verification checklist.

- `server/src/selftest-antigravity.ts` — selftest in the house style (`npm run selftest-antigravity`): generator output exists for every command, frontmatter valid, ≤12k, trampoline targets present; `projectRoot()` fallback order; AGENTS.md marker merge round-trip.

**Modified:**

- `server/src/core/paths.ts` — `projectRoot()` gains per-call resolution (see Interfaces). New `agentsMdPath()` beside `claudeMdPath()`.

- `server/src/core/claude-md.ts` — extract the line-anchored marker merge into a reusable helper parameterised by file path + marker pair; add `syncAgentsMd(root)` using the **same managed block** between `<!-- specmanager:start -->` / `<!-- specmanager:end -->` in `AGENTS.md`.

- `server/src/mcp.ts` — `sync_claude_md` tool and `startClaudeMdAutoSync` also write `AGENTS.md` **when the file exists** (Antigravity projects have one; pure Claude Code projects don't grow an unwanted file). MCP tools accept the optional `projectDir` param (one shared zod base, not 20 hand edits).

- `plugins/specmanager/server/package.json` — new scripts; no new runtime deps expected (generator uses `gray-matter` + node fs, both present).

**Unchanged (load-bearing claim):** `server/src/core/` semantics (gates, staleness, versions, manifest, tasks, phases), `server/src/board-server.ts`, all of `ui/`, the `.claude/specs/**` artifact format, and the Claude Code plugin surface (`commands/`, `agents/`, `hooks/hooks.json`, `.mcp.json`).

## Data model changes

**None to spec artifacts.** Frontmatter, `manifest.json`, `tasks.json`, ids, and gates are untouched — that is the artifact-parity guarantee (PRD success metric 2).

- New managed file: `AGENTS.md` at the project root, managed block only between the existing SpecManager markers; everything outside the markers is the user's (identical contract to `CLAUDE.md`).

- `.claude/specs/` **stays** for Antigravity-only projects (PRD Q8): it's inert data to Antigravity, dual-client repos require one canonical path, and making it configurable would thread a knob through every function in `core/paths.ts` for zero Phase-A value. Recorded as an accepted constraint; revisit only if a real Antigravity user objects.

## Interfaces

Sketches in the repo's style (`type: module`, TS strict, zod):

```ts
// core/paths.ts — per-call root resolution, in priority order
export function projectRoot(explicit?: string): string;
// explicit (tool param) ?? SPECMANAGER_PROJECT_DIR ?? CLAUDE_PROJECT_DIR ?? process.cwd()
// cwd replaces today's throw; the error remains if cwd has no .claude/specs and no explicit root was given.

// core/claude-md.ts — generalised marker merge (extraction, not rewrite)
export function mergeManagedBlock(existing: string, block: string, start: string, end: string): string;
export function syncClaudeMd(root?: string): Promise<void>;   // unchanged behaviour
export function syncAgentsMd(root?: string): Promise<void>;   // same block, AGENTS.md, only if file exists

// mcp.ts — shared optional param on every tool schema
const withRoot = { projectDir: z.string().optional() };       // merged into each tool's zod shape
// generated rules file instructs the Antigravity agent to always pass the workspace root.

// server/src/gen-antigravity.ts
//   npm run gen-antigravity  → writes plugins/specmanager/antigravity/{workflows,prompts,rules}
// server/src/antigravity-install.ts
//   node server/dist/antigravity-install.js --project <absDir> [--config <mcp_config.json path>]
```

Generated workflow shape (per command):

```markdown
---
description: <command description, ≤250 chars>
---
<command body with Task-tool steps replaced by the inlined agent protocol,
 or a trampoline: "Read <project>/.agent/prompts/specmanager-planner.md and follow it">
```

No new MCP tools. No REST changes. The board is untouched.

## Sequence / flow

**Install (self-serve, terminal-free for the PM):** user pastes the bootstrap prompt from `INSTALL.md` into Antigravity's agent panel → the agent clones/updates the SpecManager repo to a stable location, runs `npm install` in `server/`, runs `antigravity-install.js --project <workspace>` → installer merges `mcp_config.json` (literal paths) and copies `.agent/workflows|prompts|rules` → user enables the server in the MCP store → board reachable at `127.0.0.1:4317`.

**Draft a stage:** user types `/specmanager-prd Checkout corridor` in the agent panel → Antigravity loads the generated workflow → the agent (Gemini by default) calls `list_features` / `create_feature` / `create_document` over stdio MCP, passing `projectDir` per the rules file → `core` validates, writes frontmatter, bumps manifest, emits events → `board-server.ts`'s chokidar/WS push updates the open board → user reviews and approves in the board, exactly as today. Gate checks (`check_gate`) and staleness happen server-side; nothing about the client matters.

**Build a phase:** `/specmanager-build` workflow carries the builder protocol (trampoline) → agent calls `get_next_phase`, works tasks in `dependsOn` order via `update_task`, runs commands under `// turbo`, stops at the phase boundary because `core`'s phase tooling won't hand it the next phase — the same stop-discipline the Claude Code builder relies on.

**Dual-client repo:** both IDEs spawn `mcp.js`; the second board start hits the first instance's port — the existing pidfile/takeover logic (`core/pidfile.ts`, exercised by `selftest-pidfile` / `selftest-shutdown`) governs; Phase B verifies it with both clients live.

## Failure & edge cases

- **Wrong project root** (shared MCP process, multi-root workspace, cwd ≠ repo): explicit `projectDir` from the rules file is the primary mechanism; cwd is best-effort; if neither yields a `.claude/specs`, tools fail with the existing descriptive `paths.ts` error rather than writing into the wrong repo.

- **`mcp_config.json`** **env expansion unreliable** (reported in the wild): installer writes only literal absolute paths; no `${}` anywhere in the generated entry.

- **12k workflow cap:** generator hard-fails on overflow; trampoline mode is the pressure valve. Today's measurements show 2 of 9 commands need it.

- **Concurrent edits:** unchanged — `write_document` + `baseVersion` rejects stale writes whether the author is Claude, Gemini, or the human in Milkdown; the rules file tells the Antigravity agent the recovery move (re-read, re-apply).

- **Gate bypass attempts by a weaker/different model:** impossible by construction — `checkGate` lives in `core`; a Gemini agent ignoring its prompt still cannot create an architecture doc before the PRD is approved.

- **Board in-UI chat (`server/src/agent-chat.ts`) is *not supported* on Antigravity** (user decision, 2026-06-11; written acceptance in PRD success metric 3). It requires Anthropic credentials via `@anthropic-ai/claude-agent-sdk` and is outside the port's scope: the scorecard entry is **unsupported**, no port work targets it, and the chat panel's existing `available: false` state simply renders — with copy that says it plainly (see the design doc's Screen 4) and **no "add a key" call-to-action**. Not a port blocker; drafting and editing flows don't use it.

- **Prompt drift under Gemini:** the prompts were tuned on Claude. Phase A/B exit tests run every workflow under Antigravity's default model; deviations are fixed in `commands/*.md`/`agents/*.md` (the single source) so both stacks benefit, never by hand-editing generated output.

- **Antigravity surface churn** (2.0 is a month old): the only hard dependencies are stdio MCP + workflow files — the two most stable, documented primitives. Hooks/subagents are isolated in Phase C precisely because they're the youngest.

## Conventions used

- One shared `core/`; **no validation or state-transition logic duplicated** into prompts, installer, or generator (PRD goal 3).

- `commands/*.md` + `agents/*.md` remain the **single prompt source**; Antigravity artifacts are generated, committed build outputs — same convention as shipping `server/dist/` and `ui/dist/`; regenerate before committing prompt changes.

- TypeScript strict, `"type": "module"`, Node ≥20, zod schemas at tool boundaries, current `@modelcontextprotocol/sdk`.

- Hand-rolled `selftest-*.ts` scripts run by name, not a test-runner framework.

- Line-anchored marker merge for every managed file region (`CLAUDE.md`, `docs/DESIGN.md`, now `AGENTS.md`).

- Project root from env per-call, never assumed from process state alone.

- Frontmatter authoritative; `manifest.json` a rebuildable cache — untouched by this feature.

## Open questions / risks

**Spike checklist (Phase A task 1 — blocks the rest of Phase A, answers PRD spike-blocking Q1–3):**

1. Does Antigravity spawn one stdio MCP process per window with cwd = workspace root, or one shared process? (Decides whether cwd fallback ever fires or `projectDir` carries everything.)
1. Run one full workflow→MCP draft loop end-to-end under Gemini; confirm tool autocomplete, approval prompts, and `// turbo` behaviour.
1. Watch the bootstrap-prompt install succeed once with a non-maintainer driving (dry-run of the PM test).
1. Confirm the board, WS live-updates, and CodeMirror/Milkdown editors behave in Antigravity's bundled browser-or-external-browser flow.

**Planner-facing decisions:**

5\. **Distribution endpoint:** v1 is "agent clones the repo + runs installer". Publishing a public npm package (e.g. `specmanager-antigravity`) would shrink install to one `npx`, but `@specmanager/server` is `"private": true` today — Joan's call, Phase C at the earliest.

```
Answer:public npm package (e.g. specmanager-antigravity this is ok
```

6\. **Native subagents/hooks (Phase C):** adopt only if declaratively configurable (unverified items 2–3); otherwise the flattened design stands permanently — it is not a stopgap.

7\. **PM build session (A5):** scheduled inside Phase B; its observations set the final `// turbo` aggressiveness and the build workflow's tone.

8\. **Maintenance ceiling measurement (PRD metric 5):** the generator makes prompt duplication \~0 by construction; the residual dual cost is the `antigravity/` install assets (\~3 static files) and one extra selftest — record this in the scorecard as the accepted maintenance delta.

9\. **Interview command depth:** `specmanager-interview.md` (10.8k chars) fits the 12k cap today but is multi-turn and Claude-tuned; verify the conversational protocol survives Gemini in Phase A, or trampoline it for headroom.
