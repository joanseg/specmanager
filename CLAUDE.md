<!-- specmanager:start -->
## Project lifecycle (managed by SpecManager — do not edit by hand)

Specs live in `.claude/specs/features/`. Read the approved doc for a feature's stage before implementing it.

| Feature | Current stage | Notes |
|---------|---------------|-------|
| Redesign | PRD (approved) | — |
| Dummy feature | PRD | — |
| Post-phase design conformance check | PRD (draft) | — |
| Markdown viewer | PRD (approved) | — |
| Reinstall refactor | PRD (approved) | — |
| Interview command | PRD (approved) | — |
| Antigravity plugin | PRD (approved) | — |
| Share docs on public URL | PRD (approved) | — |
| Cursor plugin | PRD (approved) | — |
| Codex plugin | PRD (approved) | — |
| User adoption acceleration | PRD (draft) | — |
| Token usage optimisation | PRD (approved) | — |
| Viral loop feature | PRD (approved) | — |
| Feature demo recording | PRD | — |
| Spec-stage tier dispatch | PRD (approved) | — |
| GitHub spec sync (issues/PRs) | PRD | — |
| Security review stage | PRD (approved) | — |
| Multi-repo nested docs (CLAUDE.md / DESIGN.md) | PRD (approved) | — |
| Multi-session boards (auto-port) | PRD (approved) | — |
| Website agent readiness | PRD | — |
| Landing page redesign (ethskills style) | PRD (approved) | — |
| Marketing phase | PRD (draft) | — |
| Opus 5 readiness | PRD (approved) | — |
| Fly.io deployment | PRD (approved) | — |

_8 features shipped — full history on the board._

**Rules:** don't start a feature's tasks until its Plan is approved; treat ⚠️ stale docs as needing reconciliation.

**Commands:**
`/specmanager-prd` · `/specmanager-architecture` · `/specmanager-design` (optional) · `/specmanager-plan` · `/specmanager-build` · `/specmanager-walkthrough` · `/specmanager-board` · `/specmanager-interview` (optional, pre-PRD)

_Last synced: 2026-08-11T14:43:54.466Z_
<!-- specmanager:end -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

This repo **is** the SpecManager plugin (implemented, not a spec). SpecManager is a Claude Code **plugin** that turns a project's lifecycle (PRD → Architecture → optional Design → Plan + tasks → Build → Walkthroughs) into a localhost kanban board backed by plain markdown in the *target* project's repo. Single-user, fully local, bound to `127.0.0.1`, no auth. Claude drafts each stage from the previous approved one plus the existing codebase; the human edits and approves in the board; git tracks every artifact.

The repo also dogfoods itself: its own features live under `.claude/specs/features/` and are driven with the same `/specmanager:specmanager-*` commands.

## Layout

- **`.claude-plugin/marketplace.json`** — marketplace manifest, at the repo root.
- **`plugins/specmanager/`** — the plugin itself:
  - `.claude-plugin/plugin.json` — plugin manifest (`board_port` user config, default 4317 — a *preferred* port: the board falls forward to the next free port if it's taken, so concurrent sessions each get their own board).
  - `.mcp.json` — wires the MCP server: `node server/dist/mcp.js`, with `SPECMANAGER_PROJECT_DIR=${CLAUDE_PROJECT_DIR}`, `SPECMANAGER_BOARD_PORT=${user_config.board_port}`, `NODE_PATH=${CLAUDE_PLUGIN_DATA}/node_modules`.
  - `commands/*.md` — the user-facing slash commands (orchestration prompts). `specmanager-interview.md` is the exception to the delegation pattern: a multi-turn conversation can't live in a single-shot subagent, so its full interview protocol runs in the main session.
  - `agents/*.md` — the subagents the drafting/build commands delegate to (prd-writer, architect, designer, planner, builder, walkthrough-writer, plus `reviewer` — a read-only spec-compliance reviewer the build command runs after a phase's tasks build).
  - `hooks/hooks.json` — `SessionStart` installs runtime deps into `${CLAUDE_PLUGIN_DATA}` once and symlinks them back into `server/node_modules`; `FileChanged` on `.claude/specs/**` nudges a re-read; `Stop` runs `hooks/stop-gate.sh` (see Build leverage primitives below).
  - `server/` — `@specmanager/server`, TypeScript, ships compiled `dist/`.
  - `ui/` — `@specmanager/ui`, React 18 + Vite, ships compiled `dist/`.
- **`docs/`** — `docs/DESIGN.md` is the managed design-system spec; the original full spec and phased plan are archived under `docs/temp/original-specs/` (historical snapshots — don't edit).

## Architecture (the big picture)

Two server entry points, **one shared `core/` module** under `server/src/core/` (re-exported from `core/index.ts`) imported by both. Every mutation — agent or human — flows through `core`, so validation, state transitions, and events are identical; do not duplicate that logic in either entry point.

- **`server/src/mcp.ts`** — the MCP stdio server (Claude's interface). Registers all the tools (`specmanager_init`, `list/create_feature`, `*_document`, `set_status`, `check_gate`, `list_stale`, `*_task`, `list_phases`, `get_next_phase`, `get_phase_completion`, `sync_claude_md`, `sync_design_md`, `open_board`, …). **It also boots the board server in-process** (`startBoardServer`), so one `claude` session brings up everything. It runs `startClaudeMdAutoSync` / `startDesignMdAutoSync` listeners that refresh the managed CLAUDE.md block on doc/status events and `docs/DESIGN.md` on `feature.shipped`.
- **`server/src/board-server.ts`** — Fastify + `ws` + `chokidar`. Serves `ui/dist`, exposes the REST API the UI calls, pushes live updates over websockets, and watches `.claude/specs/**`. Its REST writes emit the same `core` events as the MCP tools, so the two views never drift. **Auto-port bind:** `bindWithFallback` tries the preferred port → sequential scan (`N=20`) → ephemeral `{port:0}`, then surfaces the *actual* bound port (`app.server.address()`) on `BoardServer.url`/`.port` and through `board_url`/`open_board` (which return `available:false`/null rather than fabricating a URL when the board is down). Paired with **per-project pidfiles** (`core/pidfile.ts`: `board-<sha1(root).slice(0,8)>.pid`) so one session's reap backstop never SIGTERMs a peer *project's* live board — two `claude` sessions in different projects run concurrent boards on distinct ports (same-project sessions still share one pidfile → newer takes over).
- **`server/src/core/repos.ts`** — **multi-repo nested docs.** `specmanager_init` accepts optional `repoPaths: string[]` (`/specmanager:specmanager-init /path/repo-1 /path/repo-2`): the caller-supplied sibling paths *are* the read grant. `declareRepos` validates each (`validateRepoPath` — must exist + be a directory; missing `.git` is a warning, not a gate), reads *only* that sibling's `CLAUDE.md`/`DESIGN.md` (no tree walk), and seeds a mirror under the meta root at `repos/<name>/{CLAUDE.md,DESIGN.md,.specmanager-repo.json}` (seed-if-present / placeholder `DESIGN.md` when the repo has no UI; write-if-absent so re-runs never clobber annotated mirrors). `renderBlock` (`core/claude-md.ts`) adds a links-only "Declared repos" subsection inside the existing markers when `scanDeclaredRepos` is non-empty. **Read may leave the meta root; write structurally cannot** — every write routes through `assertInsideRoot`, and the sidecar's `sourcePath` is stored relative to the meta root's parent (portable, not machine-local). The `repos/` tree is authoritative (nothing in `manifest.json`). Self-test: `selftest-repos`.

Load-bearing invariants (don't drift):

- **Gate enforcement lives in `core`, not in prompts** (`checkGate`). The model cannot bypass a closed gate by being told to.
- **Staleness is computed in `core`** by walking the `dependsOn` graph on any `approved→draft` transition or write to an approved doc — a non-blocking badge cleared on reconciliation.
- **Frontmatter is authoritative; `manifest.json` is a rebuildable cache.** Deleting the manifest must not lose data.
- **The plugin writes into the *project's* `CLAUDE.md`**, never its own. The managed region is strictly between `<!-- specmanager:start -->` / `<!-- specmanager:end -->`. The marker-merge in `core/claude-md.ts` is **line-anchored**, so native `/init` content (which lives *outside* the markers) and the managed block never clobber each other. `docs/DESIGN.md` works the same way with `<!-- specmanager:design:start/end -->`.
- **Resolve the project root from the env** (`SPECMANAGER_PROJECT_DIR` ?? `CLAUDE_PROJECT_DIR` ?? cwd), never assume cwd.
- **Optimistic concurrency on AI writes:** every `write_document` carries the base `version` it read; mismatched versions are rejected so manual edits aren't clobbered.

### Lifecycle gate quirks worth memorising

- **The interview is optional and pre-PRD** — `/specmanager:specmanager-interview` runs an adaptive idea-extraction chat (office-hours forcing questions) in the main session; nothing gates on it and it gates nothing. It stores as a `kind: "interview"` doc inside the prd stage (`interview.md`, `dependsOn: []`, status frozen at `draft`); `checkGate`, `currentStageLabel`, and the UI's `findDoc` all exclude `kind === "interview"` so it can never open a gate, shadow the PRD's stage label, or become the PRD column's primary card. Re-interviews update the doc in place (`write_document` + `baseVersion`).
- Stages PRD / Architecture / Plan gate on the *previous stage being `approved`* (Plan also requires an approved Design doc *if one exists*).
- **Plan emits both `plan.md` and the task records (`tasks.json` + rollup) in one step.** There is no separate "tasks" stage. Plans are organised into **phases**; tasks carry a Fibonacci `complexity` and anything over 3 must be split.
- **Build has no document** — it is execution, "complete" when every task in `tasks.json` is `done`. `/specmanager:specmanager-build` builds one phase and stops at its boundary.
- **Walkthroughs gate on tasks `done`, not on an approved doc** — the one stage whose gate is completion, not approval. Approving the `phase: "final"` walkthrough fires `feature.shipped`, which refreshes `docs/DESIGN.md`.

### Build leverage primitives

The build pipeline carries a few primitives beyond plain task execution:

- **Per-task tier dispatch** (`core/tiers.ts`) — maps a task's Fibonacci `complexity` → tier → Claude model *alias* (1→cheap→haiku, 2→standard→sonnet, 3→strong→opus; >3/null→strong). The build command reads each task's complexity and passes the resolved alias as the builder `Task`'s `model`. It routes on **aliases, never pinned dated model ids**, so new model generations need no plugin update; an unknown/unavailable alias ⇒ omit `model:` (inherit the session default), never error.
- **Stop-gate hook** (`hooks/stop-gate.sh`, pure bash, zero model calls) — on a `Stop` it resolves the **active build** and, if a phase is genuinely in flight, runs that phase's test command + checks all phase tasks are `done`, exiting 2 (keep working) until they pass, with an iteration cap (N=3) that surfaces the phase as `blocked`. Active-build resolution is **marker-first**: `core/active-build.ts` writes `.claude/specs/.cache/active-build.json` (via `set_active_build`/`clear_active_build`, set/cleared by `/specmanager:specmanager-build`); `resolveActiveCard` (`core/active-card.ts`) returns `null` when no marker exists, so the gate is a strict no-op outside an in-flight build and can never fire on an unrelated feature's open tasks.
- **Reviewer** (`agents/reviewer.md`) — read-only; given the assembled spec slice + the phase diff, returns a pass/fail spec-compliance verdict. Never writes.
- **Resilient post-phase finalize** (`core/phase-completion.ts`, `get_phase_completion` tool) — after the builder loop returns *or errors*, `/specmanager:specmanager-build` calls `getPhaseCompletion(featureId, phase)` (`{ complete, hasWalkthrough, needsWalkthrough, isSinglePhase }`) and runs the post-phase walkthrough + doc-sync whenever the phase's tasks are all `done` — so a builder that 529s mid-phase but whose work landed still triggers the auto-walkthrough/sync. Per-task tier dispatch is the enforced default (`--bulk` opts into one whole-phase Task); a single builder Task retries bounded (R=2) on transient `529`/Overloaded. **Single-phase features never produce a `final` walkthrough** — the per-phase walkthrough is terminal and ships the feature (`isFeatureShipped`, `core/shipped.ts`); `phase: "final"` is multi-phase only.

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
npm run selftest-tiers    # complexity → tier → alias mapping
npm run selftest-stopgate # active-build marker resolution + Stop-gate no-op/in-flight cases
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
