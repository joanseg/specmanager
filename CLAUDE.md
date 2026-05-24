# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status

This repo currently contains **only design documents** — no code, no `package.json`, no plugin scaffold yet. The implementation has not started. The two documents under `docs/` are the source of truth and should be read before any work:

- `docs/architecture-and-spec.md` — full architecture & specification for the SpecManager plugin.
- `docs/phase-tasks.md` — six-phase implementation plan with per-task complexity points (every task ≤3 pts).

When implementation begins, follow the **phased plan**: each of Phases 1–6 must end with an installable, testable plugin (`claude plugin install ./specmanager --scope local`). Do not skip phase exit tests.

## What SpecManager is

A Claude Code **plugin** that turns the project lifecycle (PRD → Architecture → Plan+tasks → Build → Walkthroughs) into a localhost kanban board. Single-user, fully local. Markdown files under `.claude/specs/` in the *target* project are the source of truth; git handles history.

### Architectural pillars (load-bearing — don't drift)

- **One shared `@specmanager/core` library** is imported by both the MCP server (Claude's interface) and the board server (the UI's interface). Every mutation — agent or human — flows through `core`, so validation, state transitions, and events are identical. Do not duplicate logic in either server.
- **Gate enforcement lives in `core`, not in prompts.** Skills call `check_gate` and refuse if the prior stage isn't approved. The model cannot bypass it by being told otherwise.
- **Staleness is computed in `core`** by walking the `dependsOn` graph on any `approved→draft` transition or write to an approved doc — non-blocking badge, cleared on reconciliation.
- **Frontmatter is authoritative; `manifest.json` is a rebuildable cache.** Deleting the manifest must not lose data.
- **The plugin writes into the *project's* `CLAUDE.md`**, never its own — plugin-shipped `CLAUDE.md` is not loaded as project context. The managed region is strictly between `<!-- specmanager:start -->` / `<!-- specmanager:end -->` markers; never edit outside them programmatically.
- **Resolve the project root from `${CLAUDE_PROJECT_DIR}`**, never from cwd.
- **Bind the board server to `127.0.0.1` only.** No auth in single-user local mode.
- **Optimistic concurrency on AI writes:** every `write_document` carries the base `version` it read; mismatched versions are rejected so manual edits aren't clobbered.
- **One MCP process boots the board server** so a single `claude` session brings up everything.

### Lifecycle gate quirks worth memorising

- Stages 1–3 (PRD, Architecture, Plan) gate on the *previous stage being `approved`*.
- **Plan emits both `plan.md` and the task records (`tasks.json` + rollup) in one step.** There is no separate "tasks" stage.
- **Build has no document** — it is execution. It is "complete" when every task in `tasks.json` is `done`.
- **Walkthroughs gate on tasks `done`, not on an approved doc** — the one stage whose gate is completion, not approval.

## Conventions

- **Latest APIs** — pin to current versions of `@modelcontextprotocol/sdk`, `@anthropic-ai/claude-agent-sdk`, React 18+, Vite, Fastify, `chokidar`, `gray-matter`, `zod`.
- **Tech stack** (per spec §12): Node 20+, TypeScript, MCP stdio transport, Fastify + `ws`, React 18 + Vite, CodeMirror 6 or TipTap.
- **Plugin layout** (per spec §5): plugin manifest lives in `.claude-plugin/plugin.json`; everything else (skills, agents, hooks, server, ui) lives at the plugin root.
- **Persistent deps via `${CLAUDE_PLUGIN_DATA}`** — the `SessionStart` hook installs `node_modules` there once so it survives plugin updates.

## Build / test commands

Not applicable yet — no build system in place. When Phase 1 lands, the expected commands (from the spec) will be `npm install`, a TypeScript build (`tsc` or `esbuild`), and `claude plugin validate` plus `claude plugin install ./specmanager --scope local` for end-to-end validation. Update this section when those are real.
