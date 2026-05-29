---
id: prd-rename-execute-command-to-build-002
featureId: feat-rename-execute-command-to-build
stage: prd
status: approved
stale: false
title: Rename execute command to build PRD
dependsOn: []
basedOn: {}
generatedBy: agent
version: 1
createdAt: '2026-05-28T19:43:29.399Z'
updatedAt: '2026-05-28T19:46:05.611Z'
---
## Problem

SpecManager's own vocabulary is internally inconsistent. The lifecycle it manages is **PRD → Architecture → Plan → Build → Walkthroughs**, the board's third column is labelled **BUILD**, and the subagent that does the work is already named **`builder`**. But the user-facing command that triggers that work is **`/specmanager-execute`**. "Execute" is a synonym that appears nowhere else in the lifecycle, so the one verb a user types most often during the build loop is the one that doesn't match the column, the agent, or the docs.

This is a small cut, but a load-bearing one for a dogfooding tool: SpecManager is supposed to teach its own lifecycle through consistent naming. Every time the board says "BUILD" and the helper string says "execute," it costs a beat of cognitive friction and undermines the product's claim to a clean, single vocabulary.

The fix is a mechanical rename: **`/specmanager-execute` → `/specmanager-build`**, with every surrounding "execute" reference moved to "build" — and **no behaviour change**. The command must still drive exactly one phase of a feature's plan via the `builder` subagent and stop at the phase boundary.

## Users & jobs-to-be-done

- **The SpecManager user (single developer, dogfooding the plugin).** Job: run the build loop one phase at a time. They want the command they type to match the column they're looking at and the mental model the rest of the tool teaches. Today they type `/specmanager-execute` while staring at a BUILD column and a `builder` agent.
- **The board UI as an instructional surface.** The Build cell and Build panel emit copy-to-clipboard slash strings. Job: hand the user the exact command to paste. That string must stay correct, so it has to flip to `/specmanager-build` in lockstep.
- **Future readers of the repo / docs.** Job: learn the lifecycle from `README.md` and the phase walkthroughs. They should see one consistent verb.

## Goals

- Rename the command `/specmanager-execute` to `/specmanager-build` so the trigger matches the BUILD column and the `builder` agent.
- Update every concrete reference to the old command/skill name so the product reads as one vocabulary.
- Keep behaviour **byte-for-byte identical**: same arguments (`<feature> <phaseName | "next"> [--force]`), same gate checks, same builder invocation, same phase-boundary stop, same reporting.

## Non-goals

- **No behaviour or logic change.** No change to argument parsing, gate semantics, the plan-approved check, the order check, idempotency, or builder invocation flow.
- **No change to `@specmanager/core`** — gate enforcement, staleness, and state transitions stay exactly as they are.
- **No change to MCP tool names.** `get_next_phase`, `list_phases`, `list_tasks`, `update_task` etc. do not carry the "execute" name and are out of scope (their behaviour is untouched). Only a human-readable *description string* in `mcp.ts` mentions `/specmanager-execute`; that is copy, not a name.
- **No change to the `builder` agent name.** The subagent is already `builder` (`agents/builder.md`); its `name`, `description`, and `tools` contain no "execute" string, so it needs no rename. Called out explicitly so a reviewer doesn't expect an agent change.
- **No new feature, no new flags, no UX redesign of the Build panel.**

## Success metrics

- A repo-wide `grep -rIn "specmanager-execute"` (excluding `node_modules` and `.claude/specs/`) returns **zero** unintended hits — only deliberate alias/historical hits, per the decisions taken on the open questions below.
- `/specmanager-build` appears as an available command in a Claude session and, when run, drives exactly one phase via `builder` and stops at the phase boundary — observably identical to the old command.
- The board emits `/specmanager-build ...` from both the Build cell and the Build panel.
- The plugin still validates (`claude plugin validate`) and installs.

## Constraints & assumptions

- **The command is discovered by filename, not registered in `plugin.json`.** Verified: `commands/` is a flat directory of `specmanager-*.md` files and `.claude-plugin/plugin.json` lists no commands. So the skill name `specmanager:specmanager-execute` derives from the filename `specmanager-execute.md`. **Renaming the file is what renames the command and skill** — there is no manifest command entry to edit. (Assumption: command discovery is purely filename-based; the architect should confirm against current Claude Code plugin behaviour.)
- **`CLAUDE.md`'s managed command list is auto-generated** from `server/src/core/claude-md.ts` (line 86 hard-codes the bullet list). The string in `claude-md.ts` is the source of truth; the rendered `CLAUDE.md` (line 15) regenerates on the next `sync_claude_md`. So `CLAUDE.md` itself should not be hand-edited — fix the generator string and let it regenerate.
- This feature touches SpecManager's *own* repo (it dogfoods itself), not a downstream target project.
- **Assumption:** the rename can ship in a single phase — it is a coordinated string/file change with no data migration. No `@specmanager/core` or persisted-data changes are involved.

## Concrete change surface (repo-grounded)

Enumerated from `grep` across the repo (excluding `node_modules` and `.claude/specs/`). Two buckets: the renames that change behaviour-adjacent identifiers/strings, and the documentation references.

### A. Code & plugin surfaces (must change for the rename to be real)

1. **`plugins/specmanager/commands/specmanager-execute.md`** — rename the **file** to `specmanager-build.md` (this renames the command and the `specmanager:specmanager-execute` skill). Update its `description` frontmatter ("Execute one phase…"), its body title ("Execute one phase of the plan…"), and every in-prompt reference to the command name. Keep the steps, gate checks, and builder invocation identical.
2. **`plugins/specmanager/ui/src/App.tsx`** — line 144 emits `` `/specmanager-execute ${row.id} next` ``; line 178 `title="copy /specmanager-execute next slash command"`; line 139 comment. Flip the emitted string and the tooltip to `build`.
3. **`plugins/specmanager/ui/src/BuildPanel.tsx`** — line 206 emits `` `/specmanager-execute ${featureId} ${g.name}` ``; line 230 `title="copy /specmanager-execute slash command"`. Flip to `build`.
4. **`plugins/specmanager/server/src/core/claude-md.ts`** — line 86 hard-codes `/specmanager-execute` in the managed command-list string. Change to `/specmanager-build`; rendered `CLAUDE.md` regenerates on next sync.
5. **`plugins/specmanager/server/src/mcp.ts`** — line 362 `get_next_phase` description mentions "Used by /specmanager-execute." Update the copy. (No tool-name change.)
6. **`plugins/specmanager/server/src/selftest-execute.ts`** + **`plugins/specmanager/server/package.json`** (script `selftest-execute`, line 14) — the file name and the temp-dir prefix string `specmanager-execute-` (line 38) carry "execute." Decide whether to rename the self-test file/script to `selftest-build` for consistency, or leave as an internal test name. (See Open question 4.)

### B. Documentation references (text, no behaviour)

- `README.md` — lines 42, 61 hard-code `/specmanager-execute`.
- `docs/phase-7-execute-and-phased-plans.md` — multiple references (lines 15, 62, 75, 78, 107) and the **filename itself** contains "execute."
- `docs/phase-7-B-test-walkthrough.md`, `docs/phase-7-C-test-walkthrough.md`, `docs/phase-7-A-test-walkthrough.md`, `docs/phase-design-C-test-walkthrough.md`, `docs/phase-design-D-test-walkthrough.md` — all mention `/specmanager-execute` in historical phase records.
- `CLAUDE.md` line 15 — auto-generated (see constraint above); do not hand-edit.

## High-level user flows

These are unchanged in behaviour; only the typed/emitted command differs.

- **Run the next phase from the board.** User opens the board, sees the Build cell's `▶ /specmanager-build <feature> next` helper, clicks to copy, pastes into Claude. `/specmanager-build` resolves the feature, checks the Plan is approved, picks the next non-done phase, invokes `builder`, stops at the phase boundary, suggests `/specmanager-walkthrough`.
- **Run a specific phase from the Build panel.** User expands a phase group, copies `/specmanager-build <feature> <phase>`, runs it (optionally with `--force`). Same flow as today.
- **Discover the command.** User types `/specmanager-` in a session; `/specmanager-build` now appears where `/specmanager-execute` used to.

## Open questions (flag — do not decide here)

1. **Deprecated alias vs hard removal.** Should `/specmanager-execute` be kept as a deprecated alias (e.g. a thin `specmanager-execute.md` that forwards to build, or a documented redirect) for back-compat, or removed outright? Since this is a single-user dogfooding tool with no external installs, hard removal may be acceptable — but call it out for the user to decide. This decision directly changes the success-metric grep expectation.
2. **Historical walkthrough docs.** Do the `docs/phase-7-*` and `docs/phase-design-*` walkthroughs (which record what shipped at the time) get rewritten to `/specmanager-build`, or left as historical record? Rewriting keeps grep clean; leaving them preserves an accurate history. Note the file `docs/phase-7-execute-and-phased-plans.md` has "execute" in its name too.
3. **Board copy-slash strings.** Confirmed user-facing, so these should change in lockstep with the rename (App.tsx + BuildPanel.tsx). Flagged here only to confirm the intent: yes, change them — but the user should confirm there's no transition period where the board emits the new command before the command file exists.
4. **Internal self-test naming.** Should `selftest-execute.ts` / the `selftest-execute` npm script / its temp-dir prefix be renamed to `build` for consistency, or left as an internal name not exposed to users? Low stakes; flag for the user's preference on how strict the grep-clean bar is.

## Acceptance criteria (measurable)

- `/specmanager-build` appears as an available command in a Claude session and, when invoked with `<feature> next`, runs the `builder` subagent for exactly one phase and stops at the phase boundary (no behaviour difference from the prior `/specmanager-execute`).
- The command still enforces: Plan-approved gate, phase resolution (`next` / named), order check (unless `--force`), and done-phase idempotency.
- A repo-wide `grep -rIn "specmanager-execute"` (excluding `node_modules`, `.claude/specs/`) returns only the hits intentionally retained per the decisions on Open questions 1, 2, and 4 (zero hits if all are resolved toward full removal/rewrite).
- The board emits `/specmanager-build ...` from both the Build cell (App.tsx) and the Build panel phase header (BuildPanel.tsx); no UI surface emits the old command.
- The managed `CLAUDE.md` command list shows `/specmanager-build` after a `sync_claude_md`.
- The `builder` agent is unchanged (name, description, tools).
- `claude plugin validate` passes and the plugin installs.
