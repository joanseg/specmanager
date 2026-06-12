---
id: arch-codex-plugin-013
featureId: feat-codex-plugin
stage: architecture
status: approved
stale: false
title: Codex plugin architecture
dependsOn:
  - prd-codex-plugin-016
basedOn:
  prd-codex-plugin-016: 1
generatedBy: agent
version: 1
createdAt: '2026-06-11T19:42:39.735Z'
updatedAt: '2026-06-11T19:44:34.126Z'
---
## Summary

We port SpecManager's **delivery surface** — not its core — to **OpenAI's Codex CLI**, as the third client port after Antigravity (`arch-antigravity-plugin-010`, approved) and Cursor (`arch-cursor-plugin-012`, draft). The MCP server, board server, gate logic, staleness graph, and storage under `.claude/specs/` stay exactly as they are in `plugins/specmanager/server/src/core/`; Codex gets a mostly **generated** front end built from the same prompt sources as the Claude Code plugin: an MCP registration in the user's **global `~/.codex/config.toml`** (`[mcp_servers.specmanager]` — stdio `command`/`args`/`env`, registered once per machine via `codex mcp add` or a TOML snippet), one **Codex custom prompt** per slash command (`~/.codex/prompts/specmanager-*.md`, invoked as `/specmanager-*` with `$ARGUMENTS`/positional support — a near-1:1 match for `plugins/specmanager/commands/*.md`), and the always-on behavioural contract **embedded in each generated prompt** (Codex has no rules-file surface; its always-on surface is AGENTS.md, which we reserve for the managed lifecycle block).

Codex is the closest structural cousin of Claude Code (terminal-native, first-class MCP, prompt files, AGENTS.md), so this port is the stress test the PRD asks for: the shared adaptation layer — `portgen.ts`, per-call `projectRoot(explicit?)`, `mergeManagedBlock`/`syncAgentsMd`, the optional `projectDir` tool param — is consumed as-is, and Codex adds only a thin emitter, a global installer, and a selftest. The two genuinely Codex-shaped consequences:

1. **Registration is global and per-user, with no per-project env.** Unlike Cursor (whose installer writes a literal `SPECMANAGER_PROJECT_DIR` into the project's `.cursor/mcp.json`), one Codex registration must serve every repo on the machine. The registration **must not** pin a project dir; project-root resolution rides entirely on the shared per-call chain — explicit `projectDir` param (instructed by the embedded contract) → env → **cwd fallback** — which makes the cwd fallback load-bearing for the first time (spike item 1: what cwd does Codex spawn MCP servers with?). Today's `server/src/core/paths.ts` still *throws* without env; the shared `projectRoot(explicit?)` change is a hard prerequisite for this port.
2. **AGENTS.md is Codex's native instructions file, not a side-channel.** Antigravity/Cursor treat `AGENTS.md` sync as "write the managed block only if the file exists". For a Codex-driven project there may be no `CLAUDE.md` and no `AGENTS.md` at all on day one — so the generated `specmanager-init` prompt instructs the agent to create `AGENTS.md` (markers included) before calling `specmanager_init`; the shared `syncAgentsMd` maintains it from then on. No core behaviour change beyond the shared layer.

## Codex integration surface (grounding)

Graded the way the PRD grades its assumptions; Codex is open source, so "verify" means reading the implementation, not guessing.

| Surface | Mechanism | Status |
|---|---|---|
| **Local stdio MCP** | Global `~/.codex/config.toml`: `[mcp_servers.specmanager]` with `command`, `args`, `env`; also `codex mcp add specmanager -- node <abs>/mcp.js`. `startup_timeout_sec` is configurable — relevant because `mcp.ts` boots the board in-process. | Documented (PRD A1); spike verifies spawn cwd, env handling, startup timeout with the board boot, and board-port lifetime across sessions. |
| **Custom slash prompts** | `~/.codex/prompts/*.md`, invoked as `/<filename>` with autocomplete; arguments via `$1…$9` / `$ARGUMENTS`. **Global, per-user** — no documented repo-scoped prompt dir. | Documented (PRD A2); spike verifies argument fidelity, any size limit, multi-step adherence, and whether a repo-scoped location exists. |
| **Always-on instructions** | `AGENTS.md`, merged global (`~/.codex/AGENTS.md`) → repo root → cwd. No `.mdc`/rules-file analogue. | Documented; this is where the managed lifecycle block lands (PRD Q5). |
| **Hooks** | None comparable to `SessionStart`/`FileChanged`. The `notify` hook fires an external program on events — not a fit; **not used**. Responsibilities move to the install step + prompt guidance, same ruling as both sibling ports (PRD A3, Q3). | Designed around, not with. |
| **Subagents** | No declarative subagent primitive. Delegation in `agents/*.md` flattens into single-agent prompts — the established `portgen` transformation. The interview command already runs in the main session, so it ports with the least transformation. | Assumed absent (PRD A3). |
| **Sandbox / approvals** | Codex runs *agent-executed commands* in a sandbox (read-only / workspace-write / full); MCP servers are spawned by the CLI itself and are expected to sit **outside** the command sandbox. | Documented (PRD A4); spike verifies the server/board run unsandboxed and that a build phase survives `workspace-write` without flow-breaking approval friction. |
| **Models** | GPT-family by default. Same prompt-drift posture as the other ports: fix drift in `commands/*.md`/`agents/*.md`, never in generated output. | — |

## Sequencing across the three ports (PRD Q7)

The shared-layer pieces are specified in the Antigravity architecture and generalised in the Cursor architecture (`server/src/portgen.ts` + the four core changes); **none are implemented yet** — `server/src/` today contains no port machinery, and `core/paths.ts` still throws without env. The established mechanism carries over unchanged:

- The shared tasks — (a) `core/paths.ts` `projectRoot(explicit?)` + `agentsMdPath()`; (b) `core/claude-md.ts` `mergeManagedBlock(...)` extraction + `syncAgentsMd(root)`; (c) `mcp.ts` optional `projectDir` on every tool via one shared zod base; (d) `server/src/portgen.ts` — appear in this feature's plan with **skip-if-already-landed** notes, exactly as the Cursor plan will carry them. Whichever port builds first builds them once, client-agnostically.
- Codex extends `portgen`'s `ClientProfile` union with `"codex"` — a one-line type change plus an emitter. If Codex builds first, the other two plans consume the layer; if it builds last, this plan shrinks to the emitter + installer + selftest.
- Per the PRD, **phase 1 must produce a working, testable plugin in Codex regardless of the other ports' build status** — hence skip-if-landed notes, not hard cross-feature dependencies.

**Phases** (each ends with the plugin installable and testable in a real Codex CLI):

- **Phase 1 — spike hardened into the doc lifecycle.** Spike (answers PRD Q1–Q4 by reading the Codex source + one hands-on session) → shared layer (skip-if-landed) → `gen-codex` emitter → installer → generated prompts for `init`, `interview`, `prd`, `architecture`, `design`, `plan`, `board`. Exit test: draft and approve a PRD→plan entirely from Codex; the same repo still works from Claude Code.
- **Phase 2 — execution.** `build` + `walkthrough` prompts; pidfile/port behaviour verified with Claude Code and Codex sessions live on the same repo, and with two Codex sessions in *different* repos (global registration makes this the new contention case); one supervised build session under `workspace-write`. Exit test: full lifecycle PRD→final walkthrough from Codex; `feature.shipped` fires; `docs/DESIGN.md` syncs.
- **Phase 3 — parity polish + scorecard sign-off.** Coverage scorecard (every command, gate, sync, board feature: supported / degraded / unsupported — the board's in-UI chat ships as the pre-accepted **unsupported** entry); dogfood lifecycle on this repo from Codex (PRD Q9); optional npm packaging (pre-approved by Joan in the Antigravity architecture's Q5).

## Affected components

**New — `plugins/specmanager/codex/`** (generated + static, committed like `dist/`):

- `prompts/specmanager-*.md` — one generated Codex prompt per file in `plugins/specmanager/commands/` (9 today: init, interview, prd, architecture, design, plan, build, walkthrough, board). Body = command body with Task-tool delegation replaced by the inlined agent protocol from `plugins/specmanager/agents/*.md`, plus the embedded behavioural contract (see below). Never hand-edited.
- `protocols/*.md` — trampoline targets for oversized command+agent pairs (measured today: plan = 2,830 + 10,850 chars, build = 7,542 + 5,261, walkthrough = 2,597 + 8,469, interview = 10,817 standalone). Codex prompts have no documented hard cap, but the generator keeps the conservative 12k cap until the spike measures reality; trampolined prompts instruct the agent to read `~/.codex/specmanager/protocols/<name>.md`.
- `config.snippet.toml` — documented `[mcp_servers.specmanager]` template (literal absolute paths; **no project-dir env** — see Failure & edge cases).
- `INSTALL.md` — the self-serve story: clone/update the repo to a stable location, `npm install` in `server/`, run `codex-install.js`; recommends `workspace-write` for lifecycle work (PRD Q8). Equally paste-able into a Codex session as a bootstrap prompt.

**Embedded behavioural contract** (Codex's replacement for the Antigravity/Cursor rules file, since prompts are the only per-command surface we own): always pass `projectDir` = the absolute repo root you are working in to every SpecManager tool; never approve documents; on `baseVersion` rejection re-read then re-apply; re-read any spec under `.claude/specs/**` the board has changed before acting on it (this line replaces the `FileChanged` hook in `plugins/specmanager/hooks/hooks.json`). ~6 lines, appended to every generated prompt by the codex emitter profile — self-contained and versioned with the prompts, without touching the user's global `~/.codex/AGENTS.md`.

**New — server sources** (compiled to `server/dist/` like everything else):

- `server/src/gen-codex.ts` — npm script `gen-codex`: runs the shared `portgen` with the Codex profile (output dir `plugins/specmanager/codex/`, plain `.md` prompt files with no frontmatter requirement, contract block appended, trampoline target path `~/.codex/specmanager/protocols/`). Hard-fails on cap overflow without a trampoline.
- `server/src/codex-install.ts` — **global** installer (per-machine, not per-project — the structural difference from `cursor-install.ts`): `node server/dist/codex-install.js [--codex-home <dir>]`. Copies `codex/prompts/` → `~/.codex/prompts/` and `codex/protocols/` → `~/.codex/specmanager/protocols/`; registers the MCP server by shelling out to `codex mcp add specmanager -- node <abs>/server/dist/mcp.js` when `codex` is on PATH (avoids taking a TOML-parser dependency), otherwise prints the `config.snippet.toml` block with paths filled in; sets `startup_timeout_sec` if the spike shows the in-process board boot needs headroom; prints the verification checklist. Idempotent — re-run after updating the SpecManager checkout to refresh prompts.
- `server/src/selftest-codex.ts` — selftest in the house style (`npm run selftest-codex`): generator output exists for every command, cap respected, trampoline targets present, contract block present in each prompt; installer round-trip into a tmp `--codex-home` copies prompts and produces a valid snippet without clobbering a pre-existing foreign `[mcp_servers.*]` entry; `projectRoot()` fallback order incl. cwd.

**Modified (shared layer — built once across the three ports, skip-if-landed):**

- `server/src/core/paths.ts` — `projectRoot(explicit?)`: explicit ?? `SPECMANAGER_PROJECT_DIR` ?? `CLAUDE_PROJECT_DIR` ?? `process.cwd()`, keeping a descriptive error when the result has no `.claude/specs` and nothing explicit was given (replaces today's unconditional throw on missing env). New `agentsMdPath()` beside `claudeMdPath()`. **For Codex this is not a nicety — without it the globally-registered server cannot resolve any project.**
- `server/src/core/claude-md.ts` — extract the line-anchored marker logic (`lineMarkerRe` + splice in `syncClaudeMd`) into `mergeManagedBlock(existing, block, start, end)`; add `syncAgentsMd(root)` writing the **same managed block** between the existing `<!-- specmanager:start/end -->` markers into `AGENTS.md`, only when the file exists (the Codex init prompt guarantees existence for Codex-driven projects).
- `server/src/mcp.ts` — every tool schema gains the optional `projectDir` param via one shared zod base; `sync_claude_md` / `startClaudeMdAutoSync` also refresh `AGENTS.md` when present.
- `plugins/specmanager/server/package.json` — scripts `gen-codex`, `selftest-codex`. No new runtime deps (`gray-matter` + node fs suffice; TOML handling avoided by design).

**Unchanged (load-bearing claim):** all `server/src/core/` semantics (gates, staleness, versions, manifest, tasks, phases), `server/src/board-server.ts`, all of `ui/`, the `.claude/specs/**` artifact format, and the Claude Code plugin surface (`commands/`, `agents/`, `hooks/hooks.json`, `.mcp.json`).

## Data model changes

**None to spec artifacts** — frontmatter, `manifest.json`, `tasks.json`, ids, and gates are untouched; that is the artifact-parity guarantee (PRD success metric 2).

- `AGENTS.md` managed block: same contract as `CLAUDE.md` — SpecManager owns only the region between the markers; everything outside is the user's. One implementation shared with the other ports (PRD Q5 answered once, for all clients). For Codex-driven projects the generated init prompt creates the file with the markers; `syncAgentsMd` maintains it.
- `.claude/specs/` **stays** for Codex-only projects (PRD Q6) — same ruling as both sibling architectures, same reasons: inert data to Codex, dual-client repos need one canonical path, a configurable path threads a knob through every function in `core/paths.ts` for zero value.
- New machine-global files, all under `~/.codex/` (`prompts/specmanager-*.md`, `specmanager/protocols/*.md`, one `config.toml` entry). **Nothing port-specific lands in the project repo** — the inverse of Cursor's `.cursor/` story; per-project state is exactly the artifacts plus `AGENTS.md`.

## Interfaces

Sketches in the repo's style (`"type": "module"`, TS strict, zod at tool boundaries):

```ts
// core/paths.ts — per-call root resolution (shared layer)
export function projectRoot(explicit?: string): string;
export function agentsMdPath(root?: string): string;

// core/claude-md.ts — extraction, not rewrite (shared layer)
export function mergeManagedBlock(existing: string, block: string, start: string, end: string): string;
export function syncAgentsMd(root?: string): Promise<void>; // same block, AGENTS.md, only if file exists

// mcp.ts — shared optional param merged into each tool's zod shape (shared layer)
const withRoot = { projectDir: z.string().optional() };

// server/src/portgen.ts — shared transformer (Cursor arch's shape, union extended)
export interface ClientProfile {
  name: "antigravity" | "cursor" | "codex";
  outDir: string;            // plugins/specmanager/codex
  maxChars: number;          // 12_000 until the spike measures Codex's tolerance
  trampolinePath: string;    // "~/.codex/specmanager/protocols" (global, unlike the others)
  contractBlock?: string;    // codex-only: appended to every emitted prompt
  emitCommand(name: string, body: string): GeneratedFile;
  emitRules?(body: string): GeneratedFile;  // unused by codex — contract is embedded
}

// server/src/gen-codex.ts     → npm run gen-codex
// server/src/codex-install.ts → node server/dist/codex-install.js [--codex-home <dir>]
```

Generated `~/.codex/config.toml` entry (written via `codex mcp add` or pasted from the snippet — note the deliberate absence of any project-dir env):

```toml
[mcp_servers.specmanager]
command = "node"
args = ["/abs/path/to/specmanager/plugins/specmanager/server/dist/mcp.js"]
env = { SPECMANAGER_BOARD_PORT = "4317" }
# no SPECMANAGER_PROJECT_DIR: one global registration serves every repo;
# the root comes from the per-call projectDir param, falling back to spawn cwd.
```

No new MCP tools. No REST changes. The board is untouched.

## Sequence / flow

**Install (self-serve, once per machine — PRD metric 1):** user follows `codex/INSTALL.md` (or pastes it into Codex as a bootstrap prompt) — clone/update the SpecManager repo to a stable location, `npm install` in `plugins/specmanager/server/`, run `codex-install.js` → prompts land in `~/.codex/prompts/`, protocols in `~/.codex/specmanager/protocols/`, MCP entry registered → restart/relaunch `codex` in any repo → SpecManager tools listed, board reachable at `127.0.0.1:4317`. Because everything is global, install happens once; per-project behaviour comes from root resolution.

**Init a project:** user runs `/specmanager-init` → the generated prompt has the agent create `AGENTS.md` (with the SpecManager markers) if missing, then call `specmanager_init` with `projectDir` → `.claude/specs/` scaffolded, lifecycle block synced into both `CLAUDE.md` (created by init as today) and `AGENTS.md` — Codex's agent now sees lifecycle state natively on every turn.

**Draft a stage:** user types `/specmanager-prd Checkout corridor` → Codex injects `~/.codex/prompts/specmanager-prd.md` (generated: inlined `agents/prd-writer.md` protocol + contract block) → the agent calls `list_features` / `create_feature` / `create_document` over stdio MCP, passing `projectDir` per the contract → `core` validates, writes frontmatter, bumps the manifest, emits events → `board-server.ts`'s chokidar/WS push updates the open board → human reviews and approves in the board, exactly as today. Gates (`checkGate`) and staleness are server-side; the client is irrelevant.

**Build a phase:** `/specmanager-build` trampolines to `~/.codex/specmanager/protocols/builder.md` → agent calls `get_next_phase`, works tasks in `dependsOn` order via `update_task`, runs commands inside Codex's `workspace-write` sandbox, stops at the phase boundary because `core`'s phase tooling won't hand it the next phase — stop-discipline enforced by data, not prompt obedience.

**Dual-client repo (PRD metric 2):** Claude Code and Codex each spawn their own `mcp.js`; the second in-process board start hits the first instance's port and the existing pidfile/takeover logic (`core/pidfile.ts`, exercised by `selftest-pidfile` / `selftest-shutdown`) governs. The Codex-specific variant — two Codex sessions in *different* repos, both spawned from the same global registration — is the same port-contention path and is explicitly verified in phase 2. Alternating clients mid-feature is the artifact-parity exit test.

## Failure & edge cases

- **Wrong project root** (the port's defining risk: global registration, no installed env): explicit `projectDir` from the embedded contract is primary; spawn-cwd is the fallback (spike item 1 establishes whether Codex spawns MCP servers with cwd = the launch directory); if neither yields a `.claude/specs`, tools fail with the descriptive `paths.ts` error rather than writing into the wrong repo. The contract block makes `projectDir` non-optional in practice for Codex.
- **Stale global prompts after updating the SpecManager checkout:** prompts are copies, not symlinks (global dir, one version across all projects — PRD Q2). `codex-install.js` is idempotent; `INSTALL.md` documents "re-run the installer after updating". The selftest pins generated-output drift; a version line in each generated prompt makes skew diagnosable.
- **`config.toml` corruption risk:** avoided by not parsing TOML at all — registration goes through Codex's own `codex mcp add`, or the user pastes the snippet. The installer never rewrites `config.toml` itself.
- **Startup timeout with the in-process board boot:** if Codex's default MCP startup window is tight, the registration sets `startup_timeout_sec`; spike measures the cold-boot time (board + watchers) before choosing a value.
- **Sandbox friction during build (PRD A4/Q8):** the MCP server and board run outside the command sandbox (CLI-spawned — spike-verified); agent shell commands run under the user's sandbox/approval mode. `INSTALL.md` recommends `workspace-write` for lifecycle work; the phase-2 supervised build session calibrates whether default approval prompts break the build flow.
- **Prompt size / argument fidelity unknown:** conservative 12k cap + trampolines until the spike measures Codex's real tolerance (4 of 9 commands trampoline at the conservative cap, same set as the sibling ports).
- **Concurrent edits:** unchanged — `write_document` + `baseVersion` rejects stale writes whether the author is Claude in Claude Code, GPT in Codex, or the human in Milkdown; the contract block tells the agent the recovery move.
- **Gate bypass by a different model:** impossible by construction — `checkGate` lives in `core`; a GPT agent ignoring its prompt still cannot create an architecture doc before the PRD is approved.
- **Board in-UI chat (`server/src/agent-chat.ts`): not supported on Codex** — decision carried from Antigravity (2026-06-11), pre-accepted in PRD success metric 3 and the non-goals. The chat panel's existing `available: false` state renders; no port work targets it.
- **Prompt drift under GPT-family models:** fixed in `commands/*.md` / `agents/*.md` (the single source) so all four clients benefit; generated output is never hand-edited.

## Conventions used

- One shared `core/`; no validation or state-transition logic duplicated into prompts, installer, or generator (PRD goal 3).
- `commands/*.md` + `agents/*.md` remain the single prompt source; `plugins/specmanager/codex/` is generated, committed build output — same convention as shipping `server/dist/` and `ui/dist/`; regenerate before committing prompt changes.
- TypeScript strict, `"type": "module"`, Node ≥20, zod schemas at tool boundaries, current `@modelcontextprotocol/sdk`.
- Hand-rolled `selftest-*.ts` scripts run by name (`npm run selftest-codex`), not a test-runner framework.
- Line-anchored marker merge for every managed file region (`CLAUDE.md`, `docs/DESIGN.md`, `AGENTS.md`).
- Project root resolved per-call from explicit param → env → cwd, never assumed from process state alone.
- Frontmatter authoritative; `manifest.json` a rebuildable cache — untouched by this feature.

## Open questions / risks

**Spike checklist (phase 1, task 1 — blocks the rest of phase 1; answers PRD Q1–Q4 with evidence from the open-source Codex implementation plus one hands-on session):**

1. What cwd does Codex spawn stdio MCP servers with — the directory `codex` was launched in (cwd fallback resolves the root) or something else (the `projectDir` param carries everything)? Also: env handling, `startup_timeout_sec` semantics, and what happens to the in-process board when the Codex session exits.
2. Custom-prompt fidelity: `$ARGUMENTS`/positional passing into `~/.codex/prompts/specmanager-*.md`, any size limit (sets the real `maxChars`), multi-step orchestration adherence under a GPT-family model, and whether any repo-scoped prompt location exists (would soften the global-version constraint).
3. Confirm MCP servers run outside the command sandbox, and run one build-phase segment under `workspace-write` to gauge approval friction (PRD Q8 — sets `INSTALL.md`'s recommended configuration).
4. Confirm Codex merges repo-root `AGENTS.md` into context as documented (decides nothing structural — the sync lands either way for dual-client parity — but verifies the lifecycle block actually reaches the agent).

**Planner-facing decisions:**

5. **Distribution endpoint:** v1 is "clone + `codex-install.js`". A public npm package (`specmanager-codex`, wrapping `server/dist` + generated `codex/` assets, runnable as `npx specmanager-codex install` — or even as the registered `command` itself, eliminating the absolute checkout path) was pre-approved by Joan in the Antigravity architecture (its Q5). Recommend phase 3.
6. **Build-order across the three ports (PRD Q7):** the shared-layer tasks appear in this plan with skip-if-landed notes; whichever feature builds first implements `portgen.ts` + the core changes client-agnostically, and the other plans get a one-line reconciliation.
7. **Behavioural-contract placement:** embedded-in-prompts is the v1 decision (self-contained, versioned, non-invasive). If the spike shows prompt-size pressure or weak adherence, the fallback is a managed block in the user's global `~/.codex/AGENTS.md` — flagged here so the planner sees it as a contingency, not scope.
8. **Validation session (PRD Q9, metric 1):** dogfood first — Joan drives one full lifecycle on this repo from Codex; recruit one external Codex user only after the dogfood passes. The coverage scorecard (every command/gate/sync/board feature: supported / degraded / unsupported, chat pre-accepted as unsupported) is the phase-3 sign-off artifact.
9. **Maintenance ceiling (PRD metric 5):** the shared generator makes prompt duplication ~0 by construction; the accepted residual delta is the static `codex/` install assets (~2 files), one thin emitter, one installer, and one selftest — record the measured delta in the scorecard.
