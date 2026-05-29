# SpecManager — Phase Task Breakdown

Companion to *SpecManager — Architecture & Specification*. Tasks are grouped by the six implementation phases; each phase ends with an **installable, testable plugin**. Complexity is scored on a Fibonacci scale.

**Scale:** `1` trivial · `2` small · `3` moderate · `5` substantial · `8` large · `13`/`21` epic.
*Every task below is decomposed to **≤3 points** — the earlier `5`s and `8`s were split into independently committable pieces. Phase subtotals are unchanged.*

| Phase | Theme | Points |
|-------|-------|--------|
| 1 | Headless core (no UI) | 54 |
| 2 | Read-only board | 40 |
| 3 | Edit, approve & stale in UI | 23 |
| 4 | Agent stage generators (incl. plan+tasks) | 35 |
| 5 | Build execution & walkthroughs | 22 |
| 6 | In-UI AI chat | 39 |
| **Total** | | **213** |

---

## Phase 1 — Headless core (no UI)
**Exit test:** install into a scratch repo → `/specmanager:init` → create a feature + PRD → approve → reopen and see a dependent flagged `stale`. All from the Claude Code session.

| # | Task | Pts | Notes |
|---|------|-----|-------|
| 1.1 | Repo scaffold: `package.json`, `tsconfig`, build (tsc/esbuild), dir layout | 2 | |
| 1.2 | `.claude-plugin/plugin.json` manifest | 1 | |
| 1.3 | `.mcp.json` wiring (`${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PROJECT_DIR}`, `${CLAUDE_PLUGIN_DATA}`) + `userConfig.board_port` | 2 | |
| 1.4 | `SessionStart` hook: install deps into `CLAUDE_PLUGIN_DATA` | 2 | survives plugin updates |
| 1.5 | core: zod schemas for feature / document / task | 3 | |
| 1.6 | core: `gray-matter` frontmatter read/write helpers | 2 | |
| 1.7 | core: feature CRUD + slug generation + `feature.json` | 3 | |
| 1.8 | core: document create/read/write + `version` bump | 3 | |
| 1.9 | core: manifest cache build/rebuild (scan specs) | 2 | |
| 1.10 | core: `draft⇄approved` state machine + reopen | 3 | |
| 1.11 | core: `dependsOn`/`basedOn` graph model | 2 | |
| 1.12 | core: staleness propagation (transitive flag on reopen/write) | 3 | |
| 1.13 | core: typed event emitter | 2 | reused by board/WS later |
| 1.14 | MCP server bootstrap (`@modelcontextprotocol/sdk`, stdio) | 3 | |
| 1.15 | MCP: `init` + feature tools (`list`/`create_feature`) | 2 | |
| 1.16 | MCP: document tools (`list`/`read`/`create`/`write_document`) | 3 | |
| 1.17 | MCP: `set_status` + `check_gate` + `list_stale` + `link_documents` | 3 | |
| 1.18 | MCP task tools (`list`/`create`/`update_task`) | 3 | |
| 1.19 | CLAUDE.md managed-block writer (markers, idempotent) | 3 | |
| 1.20 | `/specmanager:init` skill | 3 | scaffolds specs dir + block |
| 1.21 | `/specmanager:feature` skill | 2 | |
| 1.22 | Manual test pass + `claude plugin validate` + README install steps | 2 | |

---

## Phase 2 — Read-only board
**Exit test:** `/specmanager:board` opens localhost; Phase-1 features/docs render in the right stages; editing a file on disk updates the board live.

| # | Task | Pts | Notes |
|---|------|-----|-------|
| 2.1 | Board server bootstrap (Fastify + `ws`) co-hosted in MCP process; `127.0.0.1` bind; port from config | 3 | |
| 2.2 | REST: `/api/board` + `/api/features` (+ `/:id`) | 3 | |
| 2.3 | REST: `/api/documents/:id` + `/api/stale` + `/api/tasks` | 2 | |
| 2.4 | `chokidar` watcher setup on `.claude/specs/**` | 2 | |
| 2.5 | Debounce + map file changes → core events | 3 | |
| 2.6 | WS server + server→client event protocol | 3 | |
| 2.7 | Vite + React scaffold; build pipeline; served from `ui/dist` | 3 | |
| 2.8 | Grid scaffold: feature rows × 5 stage columns | 3 | |
| 2.9 | Card placement left-to-right + locked/empty cell affordance | 2 | |
| 2.10 | Doc card component (title, status, stale, generatedBy badges) | 3 | |
| 2.11 | Build cell progress-bar component | 2 | |
| 2.12 | WS client + live refresh (zustand/React Query) | 3 | |
| 2.13 | `/specmanager:board` skill + `board_url` tool (ensure server up, open browser) | 3 | |
| 2.14 | `frontend-design` pass (tokens, layout) | 3 | |
| 2.15 | Manual test + install docs | 2 | |

---

## Phase 3 — Edit, approve & stale in UI
**Exit test:** edit a PRD in the UI and save; approve; reopen and watch the Architecture card gain a stale badge; Generate stays disabled until the gate is met.

| # | Task | Pts | Notes |
|---|------|-----|-------|
| 3.1 | Integrate markdown editor (CodeMirror 6 / TipTap) | 3 | |
| 3.2 | Rendered preview + split-view layout/toggle | 2 | |
| 3.3 | Save flow: `PUT /api/documents/:id`, optimistic update, errors | 3 | |
| 3.4 | Approve / Reopen controls → `POST .../status`; reflect gate unlock | 3 | |
| 3.5 | Stale badge UI: "what changed" popover + jump-to-reconcile | 3 | |
| 3.6 | Per-stage Generate buttons (gate-disabled; show/copy slash command) | 3 | |
| 3.7 | Read-only lock on approved docs until Reopen | 2 | |
| 3.8 | Live `status.changed` / `stale.flagged` via WS | 2 | |
| 3.9 | Manual test + docs | 2 | |

---

## Phase 4 — Agent stage generators
**Exit test:** in a real repo, `/specmanager:prd <feature>` drafts a PRD → approve → `/specmanager:architecture <feature>` drafts from the PRD **and** existing code; CLAUDE.md block updates.

| # | Task | Pts | Notes |
|---|------|-----|-------|
| 4.1 | `prd-writer` subagent (frontmatter + prompt) | 2 | |
| 4.2 | `architect` subagent | 2 | |
| 4.3 | `planner` subagent — emits `plan.md` + task records | 3 | |
| 4.4 | `walkthrough-writer` subagent | 1 | |
| 4.5 | Skill harness: `featureId` arg + `check_gate` + invoke subagent | 2 | shared pattern |
| 4.6 | Four stage skill files (prd/architecture/plan/walkthrough) wired to subagents | 3 | |
| 4.7 | Brownfield: architect/planner read repo (Read/Grep) and ground the design | 3 | |
| 4.8 | `sync_claude_md` tool + triggers (approve/reopen/stale/feature-create) | 3 | |
| 4.9 | Conventions digest (architect writes into the CLAUDE.md block) | 3 | |
| 4.10 | Hooks: `FileChanged` (.claude/specs/**) + `InstructionsLoaded` (CLAUDE.md) | 3 | |
| 4.11 | `check-claude-md-freshness.js` | 2 | |
| 4.12 | Stale-reconciliation run (regenerate flagged doc, clear on re-approve) | 3 | |
| 4.13 | End-to-end brownfield test (PRD → architecture → plan) | 3 | |
| 4.14 | Docs + install notes | 2 | |

---

## Phase 5 — Build execution & walkthroughs
**Exit test:** take an approved Plan's tasks; mark `in_progress`/`done` with commit/file links and watch Build progress; once all `done`, generate a walkthrough grounded in the linked code.
*(Task records are produced by the planner in Phase 4; this phase makes execution first-class.)*

| # | Task | Pts | Notes |
|---|------|-----|-------|
| 5.1 | `artifacts` (commits/files/PR) schema + `update_task` status/artifacts + commit/file linking helper | 3 | |
| 5.2 | Build column UI: task list rendering | 3 | |
| 5.3 | Progress bar + counts (`todo`/`in_progress`/`done`) | 2 | |
| 5.4 | "Build complete" (all tasks done) → unlock walkthrough gate | 2 | |
| 5.5 | `walkthrough-writer`: read `tasks.json` + linked code | 3 | |
| 5.6 | Produce & write the walkthrough doc | 2 | |
| 5.7 | Task-card interactions in the feature view | 3 | |
| 5.8 | Live `task.updated` WS wiring | 2 | |
| 5.9 | Manual test + docs | 2 | |

---

## Phase 6 — In-UI AI chat
**Exit test:** open a blank PRD → chat interviews you and drafts live; open an existing doc → co-write; make a manual edit mid-stream and confirm the version check prevents clobbering.

| # | Task | Pts | Notes |
|---|------|-----|-------|
| 6.1 | `agent-chat.ts`: spawn `@anthropic-ai/claude-agent-sdk` session per `docId`, project-scoped | 3 | |
| 6.2 | Attach SpecManager MCP server + tool allow-list to the session | 2 | |
| 6.3 | Session registry/keying + reuse across turns | 3 | |
| 6.4 | Subscription auth wiring + Agent SDK credit awareness | 3 | credit separate from 2026-06-15 |
| 6.5 | Stage persona injection (system prompt per stage) | 2 | |
| 6.6 | Adaptive mode (blank→interview, content→co-writer) + `chat.mode` | 3 | |
| 6.7 | Chat WS — client→server (`chat.send`/`cancel`/`mode`) handling | 2 | |
| 6.8 | Chat WS — server→client streaming (`chat.delta`/`tool`/`done`/`error`) | 3 | |
| 6.9 | Chat panel UI: layout + streamed message list | 3 | |
| 6.10 | Tool-status chips + cancel/mode controls | 2 | |
| 6.11 | Route AI edits via `write_document` with `basedOn` version | 3 | |
| 6.12 | Conflict detection + reconcile-on-conflict flow | 2 | |
| 6.13 | AI-written range highlighting + undo | 3 | |
| 6.14 | Session lifecycle: idle teardown + per-doc turn budget | 3 | |
| 6.15 | Manual test + docs | 2 | |

---

## Notes on estimates

- Points are **relative complexity**, not hours. Calibrate to your own velocity after Phase 1.
- Every task is now **≤3 points** — the earlier `5`s and `8`s (core, MCP tools, subagents, the Agent SDK orchestrator, chat WS/UI) were split into per-concern rows, each committable and reviewable in one sitting. Phase subtotals are unchanged, so the split is purely a granularity change.
- Testing/docs tasks are deliberately included per phase so "installable & testable" stays a real exit gate rather than an afterthought.
