---
id: plan-antigravity-plugin-010
featureId: feat-antigravity-plugin
stage: plan
status: approved
stale: false
title: Antigravity plugin plan
dependsOn:
  - arch-antigravity-plugin-010
  - design-antigravity-plugin-004
basedOn:
  arch-antigravity-plugin-010: 4
  design-antigravity-plugin-004: 1
generatedBy: agent
version: 1
createdAt: '2026-06-11T16:34:30.863Z'
updatedAt: '2026-06-11T16:38:41.018Z'
---
## Overview

This plan executes the approved Antigravity architecture: port SpecManager's **delivery surface** (not its core) to Google's Antigravity IDE via a generated workflow layer, a global MCP registration, an `AGENTS.md` managed-block sync, and per-call project-root resolution. The three-phase split is fixed by the approved architecture — each phase ends with a working, installable plugin testable on a real Antigravity instance: **Phase A** hardens the feasibility spike into the full document lifecycle (init → interview → PRD → architecture → design → plan → board), **Phase B** adds execution (build + walkthroughs, dual-client verification, the supervised PM build session), and **Phase C** closes parity with the coverage scorecard, the Screen 4 unsupported-chat disclosure card, the npm distribution package, and the trigger-user sign-off test. Throughout, `commands/*.md` + `agents/*.md` stay the single prompt source; everything under `plugins/specmanager/antigravity/` is generated, committed output — regenerated (and `server/dist` / `ui/dist` rebuilt) before every commit.

**Scale:** `1` trivial · `2` small · `3` moderate · `5` substantial · `8` large · `13`/`21` epic.

*Every task below is decomposed to **≤3 points**. The two naturally large items — the prompt generator and the installer — were split along their seams (generator core vs. trampoline mode vs. committed outputs; installer vs. install collateral) rather than persisted at 5; phase subtotals are unchanged by that split.*

| Phase | Theme | Points |
|-------|-------|--------|
| A | doc lifecycle | 31 |
| B | execution | 9 |
| C | parity & sign-off | 12 |
| **Total** | | **52** |

---

## Phase A — doc lifecycle

**Exit test:** Draft and approve a feature from PRD through plan **entirely from Antigravity** (workflows under Gemini, approvals on the board), with the install matching Screen 1's format contract; then drive the same repo from Claude Code and confirm nothing diverges (gates, staleness, CLAUDE.md/AGENTS.md sync).

*(The four spike tasks A.1–A.4 answer PRD spike-blocking Q1–3 and architecture unverified items 1, 4, 5 — they block every other Phase A task.)*

| # | Task | Pts | Notes |
|---|------|-----|-------|
| A.1 | Spike: register `mcp.js` in `~/.gemini/config/mcp_config.json`; determine per-window vs shared MCP process and its cwd | 2 | Decides which `projectRoot()` fallback fires; literal absolute paths only, no `${}` |
| A.2 | Spike: one full workflow→MCP draft loop end-to-end under Gemini | 2 | Hand-written workflow; verify tool autocomplete, approval prompts, `// turbo` |
| A.3 | Spike: hand-rolled bootstrap-prompt install watched once with a non-maintainer driving | 2 | Dry run of the PM test; capture real MCP-store toggle location/label for INSTALL.md copy (design open question) |
| A.4 | Spike: board, WS live updates, CodeMirror/Milkdown editors in Antigravity's browser flow | 1 | Screen 3's dual-surface assumption |
| A.5 | `core/paths.ts`: `projectRoot(explicit?)` per-call resolution + `agentsMdPath()` | 2 | explicit ?? `SPECMANAGER_PROJECT_DIR` ?? `CLAUDE_PROJECT_DIR` ?? cwd; keep the descriptive error when nothing yields a `.claude/specs` |
| A.6 | `core/claude-md.ts`: extract `mergeManagedBlock(existing, block, start, end)` + add `syncAgentsMd(root)` | 2 | Same markers, same block; **writes only when `AGENTS.md` exists**; adopt the Screen 5 "Workflows:" label variant only if the helper parameterises content trivially, else byte-identical block |
| A.7 | `mcp.ts`: shared optional `projectDir` zod base merged into every tool schema | 2 | One shared base, not 20 hand edits; threads into `projectRoot(explicit)` |
| A.8 | `mcp.ts`: `sync_claude_md` tool + `startClaudeMdAutoSync` also write `AGENTS.md` when present | 1 | Pure Claude Code projects must not grow an unwanted file |
| A.9 | `server/src/gen-antigravity.ts`: generator core — read `commands/*.md` + `agents/*.md`, inline delegated protocols, strip Claude-Code-specific steps, rewrite frontmatter to `description:`-only, **hard-fail >12,000 chars** | 3 | npm script `gen-antigravity`; uses `gray-matter` + node fs, no new deps |
| A.10 | Generator trampoline mode: oversized pairs emit a ≤12k workflow that reads `antigravity/prompts/<agent>.md` | 2 | Today's overflows: plan (13.7k), build (12.8k); decide interview (10.8k) headroom per architecture open question 9 |
| A.11 | Generate + commit `antigravity/workflows/` for init, interview, prd, architecture, design, plan, board + `rules/specmanager.md` | 2 | Rules: always pass `projectDir`, never approve, re-read on `baseVersion` conflict, re-read specs the board changed |
| A.12 | `server/src/antigravity-install.ts`: merge SpecManager entry into `mcp_config.json` (create-if-missing, preserve other servers, literal absolute paths), copy `workflows/` + `prompts/` + `rules/` into the project's `.agent/`, print verification checklist | 3 | The checklist is Screen 1's step-by-step format contract |
| A.13 | `mcp_config.snippet.json` + `INSTALL.md` bootstrap prompt (happy path + failure/recovery copy) | 2 | Screens 1 & 2: per-step evidence lines, root-cause + proposed recovery on failure, never a raw log dump; MCP-store wording from A.3 |
| A.14 | `server/src/selftest-antigravity.ts` + package.json scripts | 2 | House style (run by name): output exists per command, frontmatter valid, ≤12k, trampoline targets present, `projectRoot()` fallback order, AGENTS.md marker-merge round-trip |
| A.15 | Phase A exit run: full PRD→plan from Antigravity under Gemini; fix prompt drift in `commands/*.md`/`agents/*.md` and regenerate; verify dual-client from Claude Code; rebuild `server/dist` | 3 | Check the **shape** of agent output (evidence lines present), not exact rendering — per the design doc; never hand-edit generated files |

---

## Phase B — execution

**Exit test:** Run one feature's **full lifecycle PRD → final walkthrough** from Antigravity: build phases execute via `get_next_phase`/`update_task` and stop at phase boundaries, the final walkthrough approval fires `feature.shipped`, and `docs/DESIGN.md` syncs.

| # | Task | Pts | Notes |
|---|------|-----|-------|
| B.1 | Generate + commit `build` and `walkthrough` workflows in trampoline mode | 2 | builder (12.8k) and walkthrough-writer (11.1k combined) protocols land in `antigravity/prompts/`; extend `selftest-antigravity` coverage |
| B.2 | Dual-client pidfile/port verification with Claude Code and Antigravity both live | 2 | Second board start hits the first instance's port; `core/pidfile.ts` takeover logic governs — verify, don't change |
| B.3 | Supervised PM build session (architecture A5): observe a real build phase, set final `// turbo` aggressiveness and build-workflow tone | 3 | Human-only validation; fixes go into `commands/*.md`/`agents/*.md` source, then regenerate; also observe Screen 4 Dismiss nagging (defer localStorage persistence unless observed) |
| B.4 | Phase B exit run: full lifecycle from Antigravity; confirm `feature.shipped` fires and DESIGN.md sync writes | 2 | Re-verify artifact parity from Claude Code afterwards |

---

## Phase C — parity & sign-off

**Exit test:** Coverage scorecard published with the in-UI chat as the **only** unsupported entry (pre-accepted, user decision 2026-06-11); the trigger PM self-installs via the published npm package and completes one full lifecycle unassisted.

| # | Task | Pts | Notes |
|---|------|-----|-------|
| C.1 | ChatPanel unavailable-state upgrade per Screen 4: disclosure card stating chat is not part of the Antigravity port, **Dismiss only** (session-collapse to one-liner), no "add a key" CTA; rebuild `ui/dist` | 2 | The one real board change in this feature; existing tokens only |
| C.2 | Evaluate native Antigravity subagents/hooks: adopt **only if declaratively configurable** (architecture unverified items 2–3); otherwise record the flattened design as permanent | 2 | Outcome feeds the scorecard either way |
| C.3 | CLI smoke check: run one doc-lifecycle workflow from the Antigravity CLI against the same repo | 1 | Confirms the supported-by-design flavour claim; one check, not per-phase exit tests |
| C.4 | Publish `specmanager-antigravity` npm package wrapping the installer; update INSTALL.md to the one-`npx` path | 3 | User pre-approved publishing (architecture open question 5); `@specmanager/server` stays private — the package wraps install, it doesn't fork core |
| C.5 | Publish the coverage scorecard: every command, gate, sync, and board feature marked supported / degraded / unsupported; record the accepted maintenance delta (~3 static install assets + 1 selftest) | 2 | Chat = unsupported (pre-accepted); flattened subagents = supported-capability with isolation note; hooks = supported (different mechanism) |
| C.6 | Trigger-user test: the PM installs SpecManager in Antigravity himself and completes one full lifecycle without help; record pass/fail | 2 | PRD success metric 1 — human-only validation, observed in one session |

---

## Risk & sequencing notes

- **The spike gates everything.** A.1–A.4 must land before any other Phase A task: the process-model answer (A.1) decides how hard the rules file leans on `projectDir`, and a failed workflow→MCP loop (A.2) would invalidate the whole generated-workflow design. Treat a spike surprise as a stop-and-replan event, not something to absorb silently.
- **Core changes land before the generator outputs are exercised** (A.5–A.8 before A.15): generated rules instruct the agent to pass `projectDir`, which only works once the shared zod base exists.
- **Prompt drift under Gemini is fixed at the source.** Any deviation found in A.15 / B.3 / B.4 is repaired in `commands/*.md` / `agents/*.md` and regenerated — never by hand-editing `antigravity/` output. This keeps both stacks improving together and is hard to roll back if violated (hand edits get silently clobbered by the next `gen-antigravity` run).
- **Committed build outputs are part of every change:** rebuild `server/dist` (and `ui/dist` for C.1) and rerun `gen-antigravity` before committing — the committed artifacts are what ships.
- **`mcp_config.json` is shared, global, user-owned state.** The installer (A.12) must be a careful merge (create-if-missing, preserve other servers, literal absolute paths, no `${}`); a destructive write here breaks the user's other MCP servers — the trickiest rollback in the plan.
- **Antigravity surface churn:** Phases A/B depend only on the two most stable primitives (stdio MCP + workflow files). The young 2.0 surfaces (hooks, subagents) are quarantined in C.2 as optional adoption.
- **Design-doc note carried forward:** the docs/DESIGN.md token frontmatter is thin; the mockups ground in `ui/src/tokens.css` — C.1 uses existing token roles only, no new tokens.

## Test strategy

Per the repo's convention (hand-rolled `selftest-*.ts` scripts run by name, no test-runner framework):

- **A.14 ships `selftest-antigravity.ts`** covering the generator (output per command, valid frontmatter, ≤12k, trampoline targets present), `projectRoot()` fallback order, and the AGENTS.md marker-merge round-trip. B.1 extends it for the build/walkthrough trampolines.
- **Existing selftests stay green** after the core touches: `selftest` (A.5/A.6 touch core), `smoke-mcp` (A.7/A.8 touch tool schemas), `selftest-pidfile`/`selftest-shutdown` (B.2 exercises, never modifies).
- **Exit tests are manual, on a real Antigravity instance** — they are first-class tasks (A.15, B.4, C.6), not afterthoughts, because the riskiest behaviours (Gemini prompt fidelity, install UX, dual-client coexistence) cannot be self-tested.
- `claude plugin validate plugins/specmanager` after any plugin-surface change.

## Out of scope

- Porting the board's in-UI chat (`agent-chat.ts`) — **unsupported by user decision 2026-06-11**; the only work that touches it is the Screen 4 disclosure card (C.1).
- Any change to `core/` semantics (gates, staleness, versions, manifest, tasks, phases), `board-server.ts` REST/WS surfaces, or the `.claude/specs/**` artifact format.
- Making the `.claude/specs/` path configurable for Antigravity-only projects (accepted constraint per the architecture; revisit only on a real user objection).
- Other IDEs (Cursor, Windsurf, VS Code + Copilot) and Antigravity skills as a distribution channel.
- Dismiss-state persistence (localStorage) for the Screen 4 card — deferred unless the B.3 session shows it nagging.
- Re-syncing docs/DESIGN.md frontmatter from `tokens.css` (noted in the design doc as outside this feature).

## Notes on estimates

Points are relative complexity, not hours — a 2-point spike observation and a 2-point core refactor are very different hours but similar cognitive load; calibrate to actual velocity after the first phase. Every task is ≤3 points: the generator and installer would each have scored 5 as single rows and were split along natural seams (core vs. trampoline vs. committed outputs; installer vs. collateral), a granularity change that leaves phase subtotals unchanged. Testing and verification are their own tasks per phase — the selftest (A.14), the dual-client check (B.2), and each phase's exit run (A.15, B.4, C.6) — so "installable and testable on a real Antigravity instance" stays a real exit gate rather than an afterthought. Human-only validations (the non-maintainer install watch, the supervised PM session, the trigger-user test) are scored like any other task because they consume real plan time and block sign-off.
