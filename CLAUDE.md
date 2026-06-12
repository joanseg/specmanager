<!-- specmanager:start -->
## Project lifecycle (managed by SpecManager — do not edit by hand)

Specs live in `.claude/specs/features/`. Read the approved doc for a feature's stage before implementing it.

| Feature | Current stage | Notes |
|---------|---------------|-------|
| Redesign | PRD (approved) | — |
| Dummy feature | PRD | — |
| Rename execute command to build | PRD (approved) | Walkthroughs ⚠️ stale |
| Planner output matches phase-tasks.md style | PRD (approved) | — |
| Post-phase design conformance check | PRD (draft) | — |
| Markdown viewer | PRD (approved) | — |
| Reinstall refactor | PRD (approved) | — |
| Plan and walkthrough optimisations | PRD (approved) | — |
| HTML viewer scroll fix | PRD (approved) | — |
| Post-phase doc sync (CLAUDE.md + DESIGN.md) | PRD (approved) | — |
| Interview command | PRD (approved) | — |
| Antigravity plugin | PRD (approved) | — |
| Share docs on public URL | PRD (approved) | — |
| Cursor plugin | PRD (approved) | — |
| Codex plugin | PRD (approved) | — |
| User adoption acceleration | PRD (draft) | — |
| Token usage optimisation | PRD (approved) | — |
| Viral loop feature | PRD (draft) | — |

**Rules:** don't start a feature's tasks until its Plan is approved; treat ⚠️ stale docs as needing reconciliation.

**Commands:**
`/specmanager-prd` · `/specmanager-architecture` · `/specmanager-design` (optional) · `/specmanager-plan` · `/specmanager-build` · `/specmanager-walkthrough` · `/specmanager-board` · `/specmanager-interview` (optional, pre-PRD)

_Last synced: 2026-06-12T13:39:18.958Z_
<!-- specmanager:end -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

This repo **is** the SpecManager plugin (implemented, not a spec). SpecManager is a Claude Code **plugin** that turns a project's lifecycle (PRD → Architecture → optional Design → Plan + tasks → Build → Walkthroughs) into a localhost kanban board backed by plain markdown in the *target* project's repo. Single-user, fully local, bound to `127.0.0.1`, no auth. Claude drafts each stage from the previous approved one plus the existing codebase; the human edits and approves in the board; git tracks every artifact.

The repo also dogfoods itself: its own features live under `.claude/specs/features/` and are driven with the same `/specmanager-*` commands.

## Layout

- **`.claude-plugin/marketplace.json`** — marketplace manifest, at the repo root.
- **`plugins/specmanager/`** — the plugin itself:
  - `.claude-plugin/plugin.json` — plugin manifest (`board_port` user config, default 4317).
  - `.mcp.json` — wires the MCP server: `node server/dist/mcp.js`, with `SPECMANAGER_PROJECT_DIR=${CLAUDE_PROJECT_DIR}`, `SPECMANAGER_BOARD_PORT=${user_config.board_port}`, `NODE_PATH=${CLAUDE_PLUGIN_DATA}/node_modules`.
  - `commands/*.md` — the user-facing slash commands (orchestration prompts). `specmanager-interview.md` is the exception to the delegation pattern: a multi-turn conversation can't live in a single-shot subagent, so its full interview protocol runs in the main session.
  - `agents/*.md` — the subagents the drafting/build commands delegate to (prd-writer, architect, designer, planner, builder, walkthrough-writer).
  - `hooks/hooks.json` — `SessionStart` installs runtime deps into `${CLAUDE_PLUGIN_DATA}` once and symlinks them back into `server/node_modules`; `FileChanged` on `.claude/specs/**` nudges a re-read.
  - `server/` — `@specmanager/server`, TypeScript, ships compiled `dist/`.
  - `ui/` — `@specmanager/ui`, React 18 + Vite, ships compiled `dist/`.
- **`docs/`** — `docs/DESIGN.md` is the managed design-system spec; the original full spec and phased plan are archived under `docs/temp/original-specs/` (historical snapshots — don't edit).

## Architecture (the big picture)

Two server entry points, **one shared `core/` module** under `server/src/core/` (re-exported from `core/index.ts`) imported by both. Every mutation — agent or human — flows through `core`, so validation, state transitions, and events are identical; do not duplicate that logic in either entry point.

- **`server/src/mcp.ts`** — the MCP stdio server (Claude's interface). Registers all the tools (`specmanager_init`, `list/create_feature`, `*_document`, `set_status`, `check_gate`, `list_stale`, `*_task`, `list_phases`, `get_next_phase`, `sync_claude_md`, `sync_design_md`, `open_board`, …). **It also boots the board server in-process** (`startBoardServer`), so one `claude` session brings up everything. It runs `startClaudeMdAutoSync` / `startDesignMdAutoSync` listeners that refresh the managed CLAUDE.md block on doc/status events and `docs/DESIGN.md` on `feature.shipped`.
- **`server/src/board-server.ts`** — Fastify + `ws` + `chokidar`. Serves `ui/dist`, exposes the REST API the UI calls, pushes live updates over websockets, and watches `.claude/specs/**`. Its REST writes emit the same `core` events as the MCP tools, so the two views never drift.

Load-bearing invariants (don't drift):

- **Gate enforcement lives in `core`, not in prompts** (`checkGate`). The model cannot bypass a closed gate by being told to.
- **Staleness is computed in `core`** by walking the `dependsOn` graph on any `approved→draft` transition or write to an approved doc — a non-blocking badge cleared on reconciliation.
- **Frontmatter is authoritative; `manifest.json` is a rebuildable cache.** Deleting the manifest must not lose data.
- **The plugin writes into the *project's* `CLAUDE.md`**, never its own. The managed region is strictly between `<!-- specmanager:start -->` / `<!-- specmanager:end -->`. The marker-merge in `core/claude-md.ts` is **line-anchored**, so native `/init` content (which lives *outside* the markers) and the managed block never clobber each other. `docs/DESIGN.md` works the same way with `<!-- specmanager:design:start/end -->`.
- **Resolve the project root from the env** (`SPECMANAGER_PROJECT_DIR` ?? `CLAUDE_PROJECT_DIR` ?? cwd), never assume cwd.
- **Optimistic concurrency on AI writes:** every `write_document` carries the base `version` it read; mismatched versions are rejected so manual edits aren't clobbered.

### Lifecycle gate quirks worth memorising

- **The interview is optional and pre-PRD** — `/specmanager-interview` runs an adaptive idea-extraction chat (office-hours forcing questions) in the main session; nothing gates on it and it gates nothing. It stores as a `kind: "interview"` doc inside the prd stage (`interview.md`, `dependsOn: []`, status frozen at `draft`); `checkGate`, `currentStageLabel`, and the UI's `findDoc` all exclude `kind === "interview"` so it can never open a gate, shadow the PRD's stage label, or become the PRD column's primary card. Re-interviews update the doc in place (`write_document` + `baseVersion`).
- Stages PRD / Architecture / Plan gate on the *previous stage being `approved`* (Plan also requires an approved Design doc *if one exists*).
- **Plan emits both `plan.md` and the task records (`tasks.json` + rollup) in one step.** There is no separate "tasks" stage. Plans are organised into **phases**; tasks carry a Fibonacci `complexity` and anything over 3 must be split.
- **Build has no document** — it is execution, "complete" when every task in `tasks.json` is `done`. `/specmanager-build` builds one phase and stops at its boundary.
- **Walkthroughs gate on tasks `done`, not on an approved doc** — the one stage whose gate is completion, not approval. Approving the `phase: "final"` walkthrough fires `feature.shipped`, which refreshes `docs/DESIGN.md`.

## Build / test commands

The plugin ships compiled `server/dist` and `ui/dist`, so end users install with no build step. **Rebuild before committing source changes** — the committed `dist/` is what ships.

```bash
# Server (@specmanager/server)
cd plugins/specmanager/server
npm install
npm run build            # tsc -p tsconfig.json → dist/

# Self-tests (hand-rolled scripts in dist/, not a test runner — run one by name)
npm run selftest          # core flow against a tmp dir
npm run selftest-board    # boots board: REST + WS + file watcher
npm run selftest-phases   # phase rollup + Fibonacci ≤3 validation
npm run selftest-build    # per-phase gates + walkthrough storage
npm run selftest-roundtrip
npm run selftest-pidfile
npm run selftest-shutdown
npm run smoke-mcp         # MCP wire protocol + tools registered
# (equivalently: node dist/<name>.js)

# UI (@specmanager/ui)
cd ../ui
npm install
npm run dev              # vite dev server
npm run build            # tsc + vite build → ui/dist (served by the board server)
```

Validate the plugin manifest/commands with `claude plugin validate plugins/specmanager`. To reinstall after rebuilding: `/plugin marketplace update specmanager` → `/plugin install specmanager@specmanager` → `/reload-plugins`, then reconnect via `/mcp` (a full Claude restart is the reliable fix if reconnect fails — see README Troubleshooting).

## Conventions

- **Latest APIs** — current versions of `@modelcontextprotocol/sdk`, `@anthropic-ai/claude-agent-sdk`, React 18+, Vite, Fastify, `chokidar`, `gray-matter`, `zod`. Server and UI are both `"type": "module"`, Node 20+.
- **Editors:** the UI uses CodeMirror 6 (HTML design briefs, live sandboxed `<iframe>` preview) and Milkdown (markdown docs).
- **Persistent deps via `${CLAUDE_PLUGIN_DATA}`** — the `SessionStart` hook installs `node_modules` there once so they survive plugin updates.
