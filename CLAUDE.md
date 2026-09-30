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
| Marketing phase | PRD (approved) | Plan ⚠️ stale |
| Fly.io deployment | PRD (approved) | — |
| SpecManager simplification cleanup | PRD (approved) | — |
| Company-brain grounding | PRD | — |

_10 features shipped — full history on the board._

**Rules:** don't start a feature's tasks until its Plan is approved; treat ⚠️ stale docs as needing reconciliation.

**Commands:**
`/specmanager-prd` · `/specmanager-architecture` · `/specmanager-design` (optional) · `/specmanager-plan` · `/specmanager-build` · `/specmanager-walkthrough` · `/specmanager-board` · `/specmanager-interview` (optional, pre-PRD)

_Last synced: 2026-09-30T12:44:06.082Z_
<!-- specmanager:end -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

This repo **is** the SpecManager plugin (implemented, not a spec): a Claude Code **plugin** that turns a project's lifecycle (PRD → Architecture → optional Design → Plan + tasks → Build → Walkthroughs) into a localhost kanban board backed by plain markdown in the *target* project's repo. Single-user, fully local, bound to `127.0.0.1`, no auth. Claude drafts each stage from the previous approved one plus the codebase; the human edits and approves in the board; git tracks every artifact.

The repo dogfoods itself: its own features live under `.claude/specs/features/` and are driven with the same `/specmanager:specmanager-*` commands.

## Layout

- **`.claude-plugin/marketplace.json`** — marketplace manifest, at the repo root.
- **`plugins/specmanager/`** — the plugin itself:
  - `.claude-plugin/plugin.json` — manifest: `version`, and the `board_port` user config (default 4317, a *preferred* port — the board falls forward to the next free one, so concurrent sessions each get a board).
  - `package.json` + `package-lock.json` — **runtime** dependencies only (no `scripts`, no `devDependencies`). Claude Code installs them natively at plugin install; `server/dist` resolves them by normal Node lookup.
  - `README.md` — the README the Anthropic directory lists: what the plugin does on the user's machine, requirements, troubleshooting.
  - `.mcp.json` — runs `node ${CLAUDE_PLUGIN_ROOT}/server/dist/mcp.js` with one env entry, `SPECMANAGER_BOARD_PORT=${user_config.board_port}`. The project root comes from `CLAUDE_PROJECT_DIR`, which Claude Code exports.
  - `commands/*.md` — the slash commands (orchestration prompts). `specmanager-interview.md` is the one that does not delegate: a multi-turn conversation can't live in a single-shot subagent, so it runs in the main session.
  - `agents/*.md` — the subagents: prd-writer, architect, designer, planner, builder, walkthrough-writer, and `reviewer` (read-only spec-compliance review after a phase builds).
  - `hooks/hooks.json` — one hook: `Stop` runs `hooks/stop-gate.sh` (see Build leverage primitives).
  - `server/` — `@specmanager/server`, TypeScript, ships compiled `dist/` without source maps. Its `package.json` holds scripts and dev dependencies only.
  - `ui/` — `@specmanager/ui`, React 18 + Vite, ships compiled `dist/`, built unminified with one chunk per npm package so every non-font file stays under 256 KiB.
- **`docs/`** — `DESIGN.md` is the managed design-system spec; `directory-submission.md` is the owner's checklist for submitting and releasing to the Anthropic plugin directory; `temp/original-specs/` holds historical snapshots (don't edit).
- **`docs/agent-snippets/`** — canonical text for prompt fragments used by **more than one** agent. There is no preprocessor: each fragment is copy-pasted into its carriers, and the snippet file names them. **Change the fragment here and update every carrier in the same commit** — a diverged copy is a real defect, and `selftest-prompts` fails on it.

## Architecture (the big picture)

Two server entry points share **one `core/` module** (`server/src/core/`, re-exported from `core/index.ts`). Every mutation — agent or human — flows through `core`, so validation, state transitions and events are identical; do not duplicate that logic in either entry point.

- **`server/src/mcp.ts`** — the MCP stdio server (Claude's interface). Registers all the tools (`specmanager_init`, `list/create_feature`, `*_document`, `set_status`, `check_gate`, `list_stale`, `*_task`, `list_phases`, `get_next_phase`, `get_phase_completion`, `get_spec_slice`, `sync_claude_md`, `sync_design_md`, `open_board`, …). **It also boots the board server in-process** (`startBoardServer`), so one `claude` session brings up everything. Its `startClaudeMdAutoSync` / `startDesignMdAutoSync` listeners refresh the managed CLAUDE.md block on doc/status events and `docs/DESIGN.md` on `feature.shipped`.
- **`server/src/board-server.ts`** — Fastify + `ws` + `chokidar`. Serves `ui/dist`, exposes the REST API the UI calls, pushes live updates over websockets, and watches `.claude/specs/**`. Its REST writes emit the same `core` events as the MCP tools, so the two views never drift.
  - **Auto-port bind:** `bindWithFallback` tries the preferred port → sequential scan (`N=20`) → ephemeral `{port:0}`, and surfaces the *actual* bound port on `BoardServer.url`/`.port` and through `board_url`/`open_board` (which return `available:false`/null rather than a made-up URL when the board is down).
  - **Per-project pidfiles** (`core/pidfile.ts`: `board-<sha1(root).slice(0,8)>.pid`): starting a board SIGTERMs the pid recorded for the *same* project, never a peer project's. Sessions in different projects run concurrent boards; same-project sessions share one pidfile, so the newer takes over. When booting a test board against this repo, point `CLAUDE_PLUGIN_DATA` at a scratch directory or it will reap the session's own board.
- **`server/src/core/repos.ts`** — **multi-repo nested docs.** `specmanager_init` accepts optional `repoPaths: string[]`; the caller-supplied sibling paths *are* the read grant. `declareRepos` validates each (must exist and be a directory; missing `.git` is a warning), reads *only* that sibling's `CLAUDE.md`/`DESIGN.md` (no tree walk), and seeds a mirror at `repos/<name>/{CLAUDE.md,DESIGN.md,.specmanager-repo.json}` under the meta root (write-if-absent, so re-runs never clobber annotated mirrors; a placeholder `DESIGN.md` when the repo has no UI). `renderBlock` (`core/claude-md.ts`) adds a links-only "Declared repos" subsection inside the markers. **Read may leave the meta root; write structurally cannot** — every write goes through `assertInsideRoot`, and the sidecar's `sourcePath` is stored relative to the meta root's parent. The `repos/` tree is authoritative (nothing in `manifest.json`). Self-test: `selftest-repos`.

Load-bearing invariants (don't drift):

- **Gate enforcement lives in `core`, not in prompts** (`checkGate`). The model cannot bypass a closed gate by being told to.
- **Staleness is computed in `core`** by walking the `dependsOn` graph on any `approved→draft` transition (`propagateStale`, `core/status.ts`) — a non-blocking badge cleared on reconciliation. A write to an already-`approved` doc only bumps `version`; it does **not** cascade staleness.
- **Frontmatter is authoritative; `manifest.json` is a rebuildable cache.** Deleting the manifest must not lose data.
- **The plugin writes into the *project's* `CLAUDE.md`**, never its own. The managed region is strictly between `<!-- specmanager:start -->` / `<!-- specmanager:end -->`; the marker-merge in `core/claude-md.ts` is **line-anchored**, so `/init` content outside the markers and the managed block never clobber each other. `docs/DESIGN.md` works the same way with `<!-- specmanager:design:start/end -->`.
- **Resolve the project root from the env** (`SPECMANAGER_PROJECT_DIR` ?? `CLAUDE_PROJECT_DIR` ?? cwd), never assume cwd.
- **Optimistic concurrency on AI writes:** every `write_document` carries the base `version` it read; a mismatch is rejected so manual edits aren't clobbered.

### Lifecycle gate quirks worth memorising

- **The interview is optional and pre-PRD.** Nothing gates on it and it gates nothing. It is stored as a `kind: "interview"` doc in the prd stage (`interview.md`, `dependsOn: []`, status frozen at `draft`); `checkGate`, `currentStageLabel` and the UI's `findDoc` all exclude that kind, so it can never open a gate, shadow the PRD's stage label, or become the PRD column's primary card. Re-interviews update the doc in place.
- PRD / Architecture / Plan gate on the *previous stage being `approved`*; Plan also requires an approved Design doc *if one exists*.
- **Plan emits `plan.md` and the task records (`tasks.json` + rollup) in one step**; there is no separate "tasks" stage. Plans are organised into **phases**; tasks carry a Fibonacci `complexity`, and anything over 3 must be split.
- **Task records have no notes field**, and a task cannot move to `done` without at least one commit or file artifact — a verification-only task needs a results file to point at.
- **Build has no document** — it is execution, complete when every task is `done`. `/specmanager:specmanager-build` builds one phase and stops at its boundary.
- **Walkthroughs gate on tasks `done`, not on an approved doc.** Approving the `phase: "final"` walkthrough fires `feature.shipped`, which refreshes `docs/DESIGN.md`. **Single-phase features never have a `final` walkthrough**: the per-phase one is terminal and ships the feature (`isFeatureShipped`, `core/shipped.ts`).

### Build leverage primitives

- **Per-task tier dispatch** (`core/tiers.ts`) — a task's `complexity` maps to a tier and a Claude model *alias*: 1 → cheap → `sonnet`, 2 → standard → `sonnet`, 3 (and >3 / null) → strong → `opus`. `cheap` is `sonnet`, not `haiku`, because Haiku 4.5's 200K context is a correctness cliff on a large repo. The three-tier ladder is kept so the reviewer-fail escalation has somewhere to go. The build command passes the alias as the builder `Task`'s `model`; it routes on **aliases, never dated model ids**, and an unknown alias means omit `model:` (inherit the session default), never error.
- **Deterministic spec slicing** (`core/spec-slice.ts`, `get_spec_slice`) — the reviewer's slice (phase plan section + task records + the Architecture sections named in `meta.architectureRefs`) is a pure function. Anchors resolve by leading id-token (`R6`, `Q1`) or kebab-slug (single hyphens: `failure-edge-cases`), sliced to the next heading of level ≤ their own. **An unresolved anchor is loud**: it lands in `unresolvedRefs` instead of silently thinning the slice. Name-matching fallback fires only when refs are absent or all unresolved, flagged by `fallbackUsed`. `matchPhaseHeading` lives here and is imported by `core/active-card.ts`, so there is one phase-heading parser.
- **Stop-gate hook** (`hooks/stop-gate.sh`, pure bash, no model calls) — on `Stop`, if a build phase is in flight it runs that phase's test command and checks all its tasks are `done`, exiting 2 (keep working) until they pass; after N=3 failures it marks the phase `blocked` and allows the stop. Resolution is **marker-first**: `core/active-build.ts` writes `.claude/specs/.cache/active-build.json` (`set_active_build` / `clear_active_build`, called by the build command), and `resolveActiveCard` returns `null` without a marker, so the gate is a no-op outside an in-flight build. The marker is **session-scoped** (`CLAUDE_CODE_SESSION_ID` against the hook's stdin `session_id`): a stop from another session neither nags nor spends the retry budget.
- **Reviewer** (`agents/reviewer.md`) — read-only; given the spec slice and the phase diff, returns a pass/fail verdict. Never writes.
- **Resilient post-phase finalize** (`core/phase-completion.ts`, `get_phase_completion`) — after the builder loop returns *or errors*, the build command calls it (`{ complete, hasWalkthrough, needsWalkthrough, isSinglePhase }`) and runs the walkthrough + doc-sync whenever the phase's tasks are all `done`, so a builder that 529s after its work landed still finalizes. Per-task dispatch is the default (`--bulk` opts into one whole-phase Task); a builder Task retries at most twice on transient `529`/Overloaded.

## Build / test commands

The plugin ships compiled `server/dist` and `ui/dist`, so end users install with no build step. **Rebuild before committing source changes** — the committed `dist/` is what ships.

```bash
# Runtime deps (installed natively for end users; an in-place checkout needs them by hand)
cd plugins/specmanager && npm ci

# Server (@specmanager/server)
cd server && npm ci
npm run build              # tsc → dist/
npm run selftest-directory # one self-test by name (equivalently: node dist/selftest-directory.js)

# UI (@specmanager/ui)
cd ../ui && npm ci
npm run dev                # vite dev server
npm run build              # tsc + vite build → ui/dist (served by the board server)
```

Self-tests are hand-rolled scripts in `server/dist/`, not a test runner; run one by name with `npm run <name>` from `server/`. There are 15:

- `selftest-directory` — Anthropic directory conformance of the shipped plugin folder (the pre-release check).
- `selftest` (core flow against a tmp dir), `selftest-board` (REST + WS + file watcher), `selftest-phases`, `selftest-build` (per-phase gates + walkthrough storage), `selftest-tiers`, `selftest-stopgate`, `selftest-roundtrip`, `selftest-pidfile`, `selftest-shutdown`, `selftest-autoport`, `selftest-repos`, `selftest-specslice`.
- `selftest-prompts` — prompt-invariant regression net over `agents/` + `commands/`, including snippet parity.
- `smoke-mcp` — MCP wire protocol + tools registered.

`selftest-shutdown` and `selftest-autoport` allow 3 seconds for the MCP handshake and can time out on a heavily loaded machine; re-run before treating that as a regression.

To reinstall after rebuilding: `/plugin marketplace update specmanager` → `/plugin install specmanager@specmanager` → `/reload-plugins`, then reconnect via `/mcp` (a full Claude restart is the reliable fix if reconnect fails — see README Troubleshooting).

## Releasing

A **release** is any push to `main` that changes files under `plugins/specmanager/`. The Anthropic directory scans every commit on `main`, and marketplace users get an update only when `version` changes. Docs-only and spec-only pushes are not releases. `docs/directory-submission.md` (sections 2 and 3) has the detail and wins if this summary drifts from it.

**Before pushing a release, do all four yourself, in order, and stop at the first failure:**

1. **Bump `version`** in `plugins/specmanager/.claude-plugin/plugin.json` (semver: patch for fixes, minor for features).
2. **Rebuild** — `npm ci` at the plugin root, then `npm ci && npm run build` in `server/` and in `ui/`. Commit any change under either `dist/`.
3. **`npm run selftest-directory`** in `server/` — must end with `All directory-conformance assertions passed.` A `FAIL:` line names the file or field to fix.
4. **`claude plugin validate plugins/specmanager`** from the repo root — must print `✔ Validation passed` with no warning.

**Surface tests are also required when the release changes packaging** — `plugin.json`, `.mcp.json`, `hooks/`, the plugin-root `package.json` / `package-lock.json`, `ui/vite.config.ts` or `server/tsconfig.json`. Only the owner can run them, so say they are due and do not push until the owner reports the result:

- a `claude --plugin-dir plugins/specmanager` session: the `specmanager` MCP server connects, the board opens, a document can be edited and saved;
- a Cowork upload of the zipped plugin folder (`git archive --format=zip -o <file> HEAD:plugins/specmanager`), recording the four observations in the checklist.

**After every release lands on `main`**, remind the owner of the marketplace check: `claude plugin marketplace update specmanager`, then `claude plugin update specmanager@specmanager`, and the server connects with no manual `npm` step.

If a surface test fails, do not add an install hook or any other workaround to make it pass; that reintroduces findings the directory blocks. Report it and let the owner decide.

## Conventions

- **Latest APIs** — current versions of `@modelcontextprotocol/sdk`, React 18+, Vite, Fastify, `chokidar`, `gray-matter`, `zod`. Server and UI are both `"type": "module"`, Node 20+.
- **Editors:** the UI edits markdown docs with Milkdown; HTML design briefs are not edited in the board — they render verbatim in a sandboxed `<iframe>`. `ui/package.json` still lists CodeMirror packages, but nothing in `ui/src` imports them.
- **Runtime deps are installed natively** — declare a runtime dependency in `plugins/specmanager/package.json` and regenerate its lockfile (`npm install --package-lock-only --ignore-scripts`), never in `server/package.json`. There is no install hook; `${CLAUDE_PLUGIN_DATA}` holds only the board pidfile.
- **No model or API calls from the plugin** — the server and board talk only to the local filesystem and `127.0.0.1`. The plugin README and the directory's data-handling answers state this, so a feature that changes it must update both in the same release.
