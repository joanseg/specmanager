---
id: arch-cursor-plugin-012
featureId: feat-cursor-plugin
stage: architecture
status: approved
stale: false
title: Cursor plugin architecture
dependsOn:
  - prd-cursor-plugin-015
basedOn:
  prd-cursor-plugin-015: 1
generatedBy: human
version: 2
createdAt: '2026-06-11T19:31:22.794Z'
updatedAt: '2026-06-11T19:40:48.427Z'
---
## Summary

We port SpecManager's **delivery surface** — not its core — to the Cursor editor, as the second client port after Antigravity (`arch-antigravity-plugin-010`, approved). The MCP server, board server, gate logic, staleness graph, and storage under `.claude/specs/` stay exactly as they are in `plugins/specmanager/server/src/core/`; Cursor gets a mostly **generated** front end built from the same prompt sources as the Claude Code plugin: an MCP registration in the project's **`.cursor/mcp.json`** (stdio `command`/`args`/`env` — project-level, unlike Antigravity's global config), one **Cursor command** per slash command (`.cursor/commands/specmanager-*.md` — plain markdown invoked as `/specmanager-*`, a near-1:1 match for `plugins/specmanager/commands/*.md`), and one **rules file** (`.cursor/rules/specmanager.mdc`, `alwaysApply: true`) carrying the always-on behavioural contract. Cursor's hooks are **beta and are not relied on**: both Claude Code hooks' responsibilities move elsewhere (install step + rules line), same as the Antigravity decision.

The structural decision this document makes explicit: **the Antigravity architecture's adaptation layer is the shared layer, and Cursor consumes it.** The prompt transformer (strip Task-tool delegation, inline agent protocols, trampoline oversized ones), the per-call `projectRoot(explicit?)` resolution, the generalised marker merge, and `AGENTS.md` sync are designed in the Antigravity doc but **not yet implemented** (no `gen-antigravity.ts` / `antigravity-install.ts` exists in `server/src/` today). Whichever feature builds first builds the shared pieces once, client-agnostically (see Sequencing below); Cursor adds only a thin emitter + installer on top.

## Cursor integration surface (grounding)

What this design relies on, graded the way the PRD grades its assumptions:

| Surface                   | Mechanism                                                                                                                                                                                                                     | Status                                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Local stdio MCP**       | Project-level `.cursor/mcp.json`: `{"mcpServers": {"specmanager": {"command", "args", "env"}}}`. Cursor also supports a one-click install deeplink (`cursor://anysphere.cursor-deeplink/mcp/install?name=…&config=<base64>`). | Documented; spike verifies env handling, spawn cwd, and process lifecycle (PRD Q1).                             |
| **Custom slash commands** | `.cursor/commands/*.md` — plain markdown prompt files, invoked as `/<filename>` from the agent input with autocomplete; trailing text after the command reaches the agent as arguments.                                       | Documented; spike verifies argument passing, any length limit, and multi-step orchestration adherence (PRD Q2). |
| **Rules**                 | `.cursor/rules/*.mdc` with frontmatter (`description`, `globs`, `alwaysApply`). `alwaysApply: true` injects on every agent turn in the workspace. Cursor also reads repo-root `AGENTS.md`.                                    | Documented; `AGENTS.md` pickup verified in spike (PRD Q7).                                                      |
| **Hooks**                 | Beta. **Not assumed** to cover `SessionStart` / `FileChanged`. Designed around, not with.                                                                                                                                     | Out of the design's load-bearing path (PRD Q3 answered by construction).                                        |
| **Subagents**             | No declarative subagent primitive equivalent to `agents/*.md` + Task tool.                                                                                                                                                    | Assumed absent (PRD A3); delegation is flattened, as in Antigravity.                                            |
| **Models**                | Cursor users run GPT/Claude/Gemini interchangeably; prompts will often run under non-Claude models.                                                                                                                           | Same prompt-drift posture as Antigravity: fix drift in the shared sources, never in generated output.           |

Two genuine advantages over the Antigravity port, both consequences of `.cursor/mcp.json` being **project-level**:

1. **Project-root resolution is solvable at install time.** The installer writes a literal `SPECMANAGER_PROJECT_DIR=<absolute workspace path>` into the project's own `.cursor/mcp.json` — the per-project config carries its own root, which Antigravity's global config cannot. The shared `projectRoot(explicit?)` fallback chain (explicit tool param → env → cwd) remains the safety net for moved/cloned repos.
1. **The config travels with the repo** (minus the absolute path, which is the one non-portable line — see Failure & edge cases).

## Sequencing with the Antigravity feature (PRD Q6)

The Antigravity architecture and plan are approved; its tasks (phases A–C) are **not yet built** — `server/src/` contains none of the planned port machinery. Decision:

- The four **shared-layer pieces** are specified once, client-agnostically, and land in whichever feature's build runs first: (a) `core/paths.ts` `projectRoot(explicit?)` per-call resolution + `agentsMdPath()`; (b) `core/claude-md.ts` `mergeManagedBlock(...)` extraction + `syncAgentsMd(root)`; (c) `mcp.ts` optional `projectDir` param via one shared zod base; (d) the prompt transformer, extracted as **`server/src/portgen.ts`** (read `commands/*.md` + `agents/*.md`, strip Claude-Code-specific steps, inline delegated protocols, enforce a per-client size cap with trampoline fallback).

- If Antigravity builds first, Cursor's plan marks those tasks done-by-dependency. If Cursor builds first, the Antigravity plan consumes them (its `gen-antigravity.ts` becomes a thin emitter over `portgen.ts` — flag that plan for reconciliation at that point).

- Per the PRD's instruction, **Cursor's phase 1 must produce a working, testable plugin in Cursor regardless of Antigravity's build status** — so Cursor's plan includes the shared tasks with a "skip if already landed" note rather than a hard cross-feature dependency.

## Affected components

**New —** **`plugins/specmanager/cursor/`** (generated + static, committed like `dist/`):

- `commands/specmanager-*.md` — one generated Cursor command per file in `plugins/specmanager/commands/` (9 today: init, interview, prd, architecture, design, plan, build, walkthrough, board). Generated by the emitter below; never hand-edited.

- `prompts/*.md` — trampoline targets for oversized command+agent pairs. Measured today: plan = 2,830 + 10,850 chars, build = 7,542 + 5,261, interview = 10,817 standalone, walkthrough = 2,597 + 8,469 — the same pairs Antigravity trampolines. Until the spike establishes Cursor's actual command-size tolerance, the generator applies the conservative 12k cap.

- `rules/specmanager.mdc` — generated rules file (`alwaysApply: true`): always pass `projectDir` (the workspace root) to SpecManager tools; never approve documents; on `baseVersion` rejection re-read then re-apply; re-read any spec under `.claude/specs/**` the board has changed before acting on it (this line replaces the `FileChanged` hook in `plugins/specmanager/hooks/hooks.json`).

- `INSTALL.md` — the self-serve story (see Sequence / flow).

**New — server sources** (compiled to `server/dist/` like everything else):

- `server/src/portgen.ts` — the **shared** prompt transformer described under Sequencing. Single source of truth for stripping/inlining/trampolining; per-client emitters stay thin.

- `server/src/gen-cursor.ts` — npm script `gen-cursor`: runs `portgen` with the Cursor profile (output dir `plugins/specmanager/cursor/`, `.md` command files with no required frontmatter, `.mdc` rules emission, trampoline target path `.cursor/specmanager/prompts/`). Hard-fails the build on cap overflow without a trampoline.

- `server/src/cursor-install.ts` — installer: `node server/dist/cursor-install.js --project <absDir>`. Merges the SpecManager entry into the project's `.cursor/mcp.json` (create-if-missing, preserve other servers, write **literal absolute paths** for `args` and `SPECMANAGER_PROJECT_DIR`), copies `commands/` → `.cursor/commands/`, `rules/specmanager.mdc` → `.cursor/rules/`, `prompts/` → `.cursor/specmanager/prompts/`, prints the verification checklist (reload Cursor → MCP tools listed → board reachable).

- `server/src/selftest-cursor.ts` — selftest in the house style (`npm run selftest-cursor`): generator output exists for every command, cap respected, trampoline targets present, `.mdc` frontmatter valid; installer round-trip into a tmp dir merges `.cursor/mcp.json` without clobbering a pre-existing foreign server entry; `projectRoot()` fallback order.

**Modified (shared with Antigravity — built once, see Sequencing):**

- `server/src/core/paths.ts` — `projectRoot(explicit?)` (explicit ?? `SPECMANAGER_PROJECT_DIR` ?? `CLAUDE_PROJECT_DIR` ?? `process.cwd()`, keeping today's descriptive error when nothing yields a `.claude/specs`); new `agentsMdPath()` beside `claudeMdPath()`.

- `server/src/core/claude-md.ts` — extract the line-anchored marker merge (`lineMarkerRe` + replacement) into `mergeManagedBlock(existing, block, start, end)`; add `syncAgentsMd(root)` writing the **same managed block** between the existing `<!-- specmanager:start/end -->` markers into `AGENTS.md`, only when the file exists. Cursor reads `AGENTS.md`, so this single mechanism serves both ports (PRD Q7: no new per-client sync target; `sync_claude_md` grows the `AGENTS.md` side-write, once).

- `server/src/mcp.ts` — every tool schema gains the optional `projectDir` param via one shared zod base; `sync_claude_md` / `startClaudeMdAutoSync` also refresh `AGENTS.md` when present.

- `plugins/specmanager/server/package.json` — scripts `gen-cursor`, `selftest-cursor`. No new runtime deps (`gray-matter` + node fs suffice for the generator).

**Unchanged (load-bearing claim):** all `server/src/core/` semantics (gates, staleness, versions, manifest, tasks, phases), `server/src/board-server.ts`, all of `ui/`, the `.claude/specs/**` artifact format, and the Claude Code plugin surface (`commands/`, `agents/`, `hooks/hooks.json`, `.mcp.json`).

## Data model changes

**None to spec artifacts** — frontmatter, `manifest.json`, `tasks.json`, ids, and gates are untouched; that is the artifact-parity guarantee (PRD success metric 2).

- `AGENTS.md` managed block: same contract as `CLAUDE.md` — SpecManager owns only the region between the markers; everything outside is the user's. (Shared with Antigravity; one implementation.)

- `.claude/specs/` **stays** for Cursor-only projects (PRD Q5) — same ruling as Antigravity's architecture and for the same reasons: inert data to Cursor, dual-client repos need one canonical path, and a configurable path threads a knob through every function in `core/paths.ts` for zero value. Answered once, for all clients, as the PRD asked.

- New per-project files, all in `.cursor/` (gitignorable or committable at the user's choice — committable is the recommended default so teammates inherit the commands; the only machine-specific value is the absolute path inside `.cursor/mcp.json`).

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

// server/src/portgen.ts — shared transformer
export interface ClientProfile {
  name: "cursor" | "antigravity";
  outDir: string;            // e.g. plugins/specmanager/cursor
  maxChars: number;          // 12_000 until the spike says otherwise
  trampolinePath: string;    // project-relative, e.g. ".cursor/specmanager/prompts"
  emitCommand(name: string, body: string): GeneratedFile;
  emitRules(body: string): GeneratedFile;
}
export function generate(profile: ClientProfile): Promise<GeneratedFile[]>;

// server/src/gen-cursor.ts    → npm run gen-cursor
// server/src/cursor-install.ts → node server/dist/cursor-install.js --project <absDir>
```

Generated `.cursor/mcp.json` entry (literal paths, written by the installer — the project-level analogue of `plugins/specmanager/.mcp.json`):

```json
{
  "mcpServers": {
    "specmanager": {
      "command": "node",
      "args": ["/abs/path/to/specmanager/plugins/specmanager/server/dist/mcp.js"],
      "env": {
        "SPECMANAGER_PROJECT_DIR": "/abs/path/to/this/project",
        "SPECMANAGER_BOARD_PORT": "4317"
      }
    }
  }
}
```

No new MCP tools. No REST changes. The board is untouched.

## Sequence / flow

**Install (self-serve, PRD metric 1):** user follows `cursor/INSTALL.md` — clone/update the SpecManager repo to a stable location (or, planner option, `npx specmanager-cursor` once the public npm package exists; Joan pre-approved publishing in the Antigravity feature), `npm install` in `server/`, run `cursor-install.js --project <workspace>` → installer merges `.cursor/mcp.json` and copies `.cursor/commands|rules` + trampoline prompts → user reloads Cursor and enables the server in MCP settings → SpecManager tools listed, board reachable at `127.0.0.1:4317`. The whole flow can equally be pasted into Cursor's own agent as a bootstrap prompt, mirroring the Antigravity install story.

**Draft a stage:** user types `/specmanager-prd Checkout corridor` in Cursor's agent input → Cursor loads `.cursor/commands/specmanager-prd.md` (generated: command body with Task-tool delegation replaced by the inlined `agents/prd-writer.md` protocol) → the agent calls `list_features` / `create_feature` / `create_document` over stdio MCP, passing `projectDir` per the rules file → `core` validates, writes frontmatter, bumps the manifest, emits events → `board-server.ts`'s chokidar/WS push updates the open board → human reviews and approves in the board, exactly as today. Gates (`checkGate`) and staleness are server-side; the client is irrelevant.

**Build a phase:** `/specmanager-build` command trampolines to `.cursor/specmanager/prompts/builder.md` → agent calls `get_next_phase`, works tasks in `dependsOn` order via `update_task`, stops at the phase boundary because `core`'s phase tooling won't hand it the next phase — the same stop-discipline the Claude Code builder relies on, enforced by data, not prompt obedience.

**Dual-client repo (PRD metric 2):** Claude Code and Cursor each spawn their own `mcp.js`; the second in-process board start hits the first instance's port and the existing pidfile/takeover logic (`core/pidfile.ts`, exercised by `selftest-pidfile` / `selftest-shutdown`) governs. Verified with both clients live during phase 2. Alternating clients mid-feature is the artifact-parity exit test.

**Interview:** `specmanager-interview.md` already runs in the main session by design (no subagent), so it ports with the least transformation — but at 10.8k chars it trampolines for headroom, and its multi-turn protocol must be exercised under a non-Claude model in the spike.

## Failure & edge cases

- **Wrong project root** (moved repo, multi-root workspace, Cursor spawning with unexpected cwd): the installed literal `SPECMANAGER_PROJECT_DIR` is primary; explicit `projectDir` from the rules file is the per-call override; cwd is best-effort; if nothing yields a `.claude/specs`, tools fail with the existing descriptive `paths.ts` error rather than writing into the wrong repo.

- **Absolute paths in** **`.cursor/mcp.json`** **go stale** (repo cloned by a teammate, SpecManager checkout moved): re-running `cursor-install.js` is the documented fix; the installer is idempotent (merge, not overwrite). `INSTALL.md` states that `.cursor/mcp.json` is the one machine-specific file.

- **MCP process lifecycle under Cursor** (when servers are spawned/killed, what happens to the in-process board on window close/reload): spike item 1. The board's pidfile/shutdown handling already tolerates abrupt parent death; the spike confirms no zombie ports.

- **Command-size limits / argument fidelity unknown:** generator enforces the conservative 12k cap with trampolines until the spike measures Cursor's real tolerance; trampolining is the pressure valve either way (4 of 9 commands need it at the conservative cap).

- **Cursor's tool-count limits:** Cursor has historically warned/truncated beyond \~40 enabled MCP tools per chat. SpecManager registers \~20 — under the line, but the spike records the number and the scorecard notes the headroom.

- **Concurrent edits:** unchanged — `write_document` + `baseVersion` rejects stale writes whether the author is Claude in Claude Code, GPT in Cursor, or the human in Milkdown; the rules file tells the agent the recovery move.

- **Gate bypass by a weaker/different model:** impossible by construction — `checkGate` lives in `core`; an agent ignoring its prompt still cannot create an architecture doc before the PRD is approved.

- **Board in-UI chat (`server/src/agent-chat.ts`): not supported on Cursor** — decision carried from Antigravity (2026-06-11), pre-accepted in PRD success metric 3. The chat panel's existing `available: false` state renders with plain copy; no port work targets it.

- **Prompt drift under non-Claude models:** fixed in `commands/*.md` / `agents/*.md` (the single source) so all three clients benefit; generated output is never hand-edited.

- **Hooks beta churn:** zero exposure by design — nothing in the port depends on Cursor hooks. If they stabilise, adopting them is an optional phase-3 nicety, evaluated the way Antigravity's Phase C treats its 2.0 surfaces.

## Conventions used

- One shared `core/`; no validation or state-transition logic duplicated into prompts, installer, or generator (PRD goal 3).

- `commands/*.md` + `agents/*.md` remain the single prompt source; `plugins/specmanager/cursor/` is generated, committed build output — same convention as shipping `server/dist/` and `ui/dist/`; regenerate before committing prompt changes.

- TypeScript strict, `"type": "module"`, Node ≥20, zod schemas at tool boundaries, current `@modelcontextprotocol/sdk`.

- Hand-rolled `selftest-*.ts` scripts run by name (`npm run selftest-cursor`), not a test-runner framework.

- Line-anchored marker merge for every managed file region (`CLAUDE.md`, `docs/DESIGN.md`, `AGENTS.md`).

- Project root resolved per-call from explicit param → env → cwd, never assumed from process state alone.

- Frontmatter authoritative; `manifest.json` a rebuildable cache — untouched by this feature.

## Open questions / risks

**Spike checklist (phase 1, task 1 — blocks the rest of phase 1; answers PRD Q1–Q4):**

1. Does Cursor spawn the stdio MCP process per workspace with cwd = workspace root? Does it interpolate anything (e.g. `${workspaceFolder}`) in `.cursor/mcp.json`, or are literal paths the only safe form? What happens to the in-process board server on window reload/close?
1. Run one full command→MCP draft loop end-to-end under a non-Claude default model: argument passing into `.cursor/commands/*.md`, any size limit, multi-step orchestration adherence, and the interview command's multi-turn protocol.
1. Confirm Cursor picks up repo-root `AGENTS.md` (decides whether the lifecycle context block reaches the agent without a rules duplicate).
1. Confirm the one-click MCP deeplink is viable for the install story or whether the installer script remains the v1 path.

**Planner-facing decisions:**

5. **Distribution endpoint:** v1 is "clone + `cursor-install.js`". A public npm package (`specmanager-cursor`, wrapping `server/dist` + the generated `cursor/` assets, runnable as `npx specmanager-cursor install` — or even as the `command` in `.cursor/mcp.json` itself, eliminating the absolute repo path) was pre-approved by Joan in the Antigravity architecture (its Q5). Recommend phase 3.
5. **Build-order with Antigravity:** the shared-layer tasks (portgen, `projectRoot(explicit?)`, `mergeManagedBlock`/`syncAgentsMd`, `withRoot`) appear in this feature's plan with skip-if-landed notes; if Cursor builds them first, the Antigravity plan needs a one-line reconciliation (its `gen-antigravity.ts` becomes a `portgen.ts` profile).
5. **Validation session (PRD Q8, metric 1):** dogfood first — Joan drives one full lifecycle on this repo from Cursor; recruit one external Cursor user only after the dogfood passes. The coverage scorecard (every command/gate/sync/board feature: supported / degraded / unsupported, chat pre-accepted as unsupported) is the phase-3 sign-off artifact.
5. **Maintenance ceiling (PRD metric 5):** the shared generator makes prompt duplication \~0 by construction; the accepted residual delta is the static `cursor/` install assets (\~2 files), one emitter (\~thin), and one selftest — record the measured delta in the scorecard.
