---
id: wt-rename-execute-command-to-build-006
featureId: feat-rename-execute-command-to-build
stage: walkthrough
status: approved
stale: false
title: Rename execute command to build — Phase Rename walkthrough
dependsOn:
  - plan-rename-execute-command-to-build-003
basedOn:
  plan-rename-execute-command-to-build-003: 2
generatedBy: agent
version: 1
phase: Rename
createdAt: '2026-05-29T11:54:02.671Z'
updatedAt: '2026-05-29T12:20:49.187Z'
---
# Rename execute command to build — Phase Rename walkthrough

_Phase: **Rename** (the feature's only phase). Source of truth: `plan.md` (v2, approved). Every claim below is grounded in the files the seven tasks actually committed._

## 1. What shipped in this phase

The user-facing command that drives the build loop is no longer `/specmanager-execute` — it is now **`/specmanager-build`**. This is a pure naming refactor with **no behaviour change**: the command still takes `<feature> <phaseName | "next"> [--force]`, still checks the plan is approved, still drives exactly one phase via the `builder` subagent (`Task({ subagent_type: "builder" })`), and still stops at the phase boundary. Every surrounding "execute" reference — the command file itself, both board-UI surfaces, the managed-`CLAUDE.md` generator string, one MCP description, the internal self-test, and the live README — was flipped to "build" so the verb the user types most often during the build loop finally matches the **BUILD** column and the `builder` agent.

The phase's exit test (below) is the contract: `/specmanager-build` discoverable and behaviourally identical to the old command, the repo grep clean of unintended `specmanager-execute` hits, and `claude plugin validate` passing.

## 2. How it works

Claude Code discovers plugin commands **by filename** — `.claude-plugin/plugin.json` carries no `commands` entry. So the entire rename hinges on one fact: renaming `commands/specmanager-execute.md` → `commands/specmanager-build.md` *is* what renames both the command and its derived `specmanager:specmanager-*` skill. There is no manifest entry to edit and no qualified skill id referenced anywhere in code.

Because the command file is the single source of resolution, the work was sequenced as one atomic change set with the **command-file rename landing first** (task-001), closing the "board emits a command that doesn't resolve" transition-window risk. Everything downstream is string edits in lockstep: the two React surfaces that emit copy-to-clipboard slash strings, the generator that renders the managed `CLAUDE.md` command list, the `get_next_phase` MCP description copy, the renamed self-test, and the README. Nothing in `@specmanager/core` logic, the MCP tool *names*, gate semantics, or the `builder` agent was touched.

## 3. Code tour (by task)

**task-001 — command file rename + in-file copy flip** (`47e0fee`)
`plugins/specmanager/commands/specmanager-build.md`. The `git mv` renamed the command and skill; the body was flipped in place. Frontmatter `description` now reads "Build one phase…"; the body title is "Build one phase of the plan for **$ARGUMENTS**." The in-prompt verbs were flipped — `--force` "lets you build a phase out of order" (line 11), step 4 reports "All phases done — nothing to build" (line 19), step 5 refuses with "build it first, or pass `--force`" (line 21). The 8 steps, the gate/order/idempotency checks, and the `Task({ subagent_type: "builder" })` invocation (step 7) are byte-identical apart from the verb — confirming the no-behaviour-change contract.

**task-002 — board UI slash strings + tooltips** (`7bd01ea`)
`plugins/specmanager/ui/src/App.tsx` and `plugins/specmanager/ui/src/BuildPanel.tsx`. In `App.tsx` the main-board Build glance emits `` `/specmanager-build ${row.id} next` `` (line 144) with tooltip `title="copy /specmanager-build next slash command"` (line 178), and the explanatory comment on line 139 reads "suggest /specmanager-build". In `BuildPanel.tsx` each phase-group header emits `` `/specmanager-build ${featureId} ${g.name}` `` (line 206) with tooltip `title="copy /specmanager-build slash command"` (line 230). Both surfaces flipped together so no UI ever emits the old command.

**task-003 — managed-`CLAUDE.md` generator string** (`527f5a2`)
`plugins/specmanager/server/src/core/claude-md.ts`, line 86. The hard-coded command bullet list now renders `…· \`/specmanager-plan\` · \`/specmanager-build\` · \`/specmanager-walkthrough\` …`. This is the source of truth for the managed region; the rendered file only updates when `sync_claude_md` runs (task-006). The rendered `CLAUDE.md` was deliberately not hand-edited.

**task-004 — `get_next_phase` description copy** (`ea81f4e`)
`plugins/specmanager/server/src/mcp.ts`, line 362. The human-readable `description` now ends "Used by /specmanager-build." The MCP tool name `get_next_phase` is unchanged — this was copy only.

**task-005 — self-test rename to `selftest-build`** (`ec31f9f`)
`plugins/specmanager/server/src/selftest-build.ts` (was `selftest-execute.ts`, via `git mv`) and `plugins/specmanager/server/package.json`. The temp-dir prefix is now `mkdtemp(path.join(os.tmpdir(), "specmanager-build-"))` (line 38) and the header prose/usage line reads `node dist/selftest-build.js`. The package.json script is now `"selftest-build": "node dist/selftest-build.js"` (line 14). The test still exercises `@specmanager/core` directly (no subagent spawn) to prove the phased build loop is unchanged. No `selftest-execute` references remain anywhere in `server/src` or `package.json`.

**task-006 — live docs rewrite + `CLAUDE.md` regenerate** (`aaffc44`)
`README.md` and `CLAUDE.md`. README now documents `/specmanager-build <feature> next` (line 44), the prose "`/specmanager-build` builds one phase and stops at its boundary" (line 63), and the dev command `npm run selftest-build` (line 118). The dated `docs/phase-7-*` / `docs/phase-design-*` walkthroughs were intentionally **not** rewritten — per the architecture's recommendation (confirmed in the plan's open questions), they remain a historical record of what shipped under the old name.

**task-007 — build, fresh UI bundle, verification** (`347862a`)
`plugins/specmanager/server/dist/*` and `plugins/specmanager/ui/dist/*`. The server was recompiled and a fresh UI bundle produced so the served board no longer carries the old string. Verified directly: `dist/core/claude-md.js` emits `/specmanager-build`. The grep, `selftest-build`, and `claude plugin validate` make up the per-phase verification (see §4).

## 4. How to verify

The phase's **Exit test** from `plan.md`, verbatim:

> After applying this phase, run `npm run build` (server + a fresh UI build), then `sync_claude_md`, then in a Claude session type `/specmanager-` and confirm `/specmanager-build` appears (and `/specmanager-execute` does not). Run `/specmanager-build <feature> next` against a feature with an approved plan and confirm it drives exactly one phase via the `builder` subagent and stops at the phase boundary — observably identical to the old command. Finally, `grep -rIn "specmanager-execute" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist . | grep -v "/.claude/specs/"` returns only the deliberately retained dated-walkthrough hits, and `claude plugin validate` passes.

How to run each part from the repo root:

- **Build:** `npm run build` in `plugins/specmanager/server` (tsc) plus a fresh UI build, so `ui/dist` no longer carries the old string.
- **Self-test:** `npm run selftest-build` (from `plugins/specmanager/server`) — drives plan → build phase A → walkthrough A → build phase B → walkthrough B against a tmp project via core, proving the loop is unchanged.
- **Grep:** the command above. As run, the only non-spec, non-historical hit is `CLAUDE.md:18` (see the caveat in §5); the `docs/temp/original-specs/phase-7-*` and `phase-design-*` hits are the deliberately retained dated walkthroughs. (Note: the `grep -v "/.claude/specs/"` filter only matches paths containing a leading-slash `/.claude/specs/`; because `grep -rIn .` prefixes paths with `./`, other features' spec docs under `.claude/specs/` such as `redesign/` and `post-phase-design-conformance-check/` still surface — those are out of scope for this rename, not regressions.)
- **`claude plugin validate`** — must pass.

## 5. Known limitations / follow-ups

**Interactive + managed-`CLAUDE.md` items require a plugin/MCP-server restart — verify after restart.** Three of the exit-test checks could not be confirmed in-place because the running board/MCP-server process loaded the **pre-rebuild** compiled code:

1. **Live `/specmanager-` discovery** showing `/specmanager-build` (and not `/specmanager-execute`).
2. **A live one-phase `builder` run** via `/specmanager-build <feature> next`.
3. **The managed `CLAUDE.md` region** picking up the new command string.

The source and the committed `dist/` are correct and verified — `claude-md.ts:86` and `dist/core/claude-md.js` both emit `/specmanager-build`. But a `sync_claude_md` fired by the still-running stale server re-rendered the managed region of `CLAUDE.md` (line 18) **back to `/specmanager-execute`**. This is the one remaining non-spec grep hit and it is a stale-process artifact, not a source defect. After restarting the plugin/MCP server (which reloads the rebuilt `dist/`), re-run `sync_claude_md` and confirm `CLAUDE.md:18` shows `/specmanager-build`, then confirm command discovery and a one-phase builder run. Treat these as **"verify after restart"** items rather than confirmed.

**Historical docs intentionally retain the old name.** `docs/temp/original-specs/phase-7-*-test-walkthrough.md`, `docs/phase-7-execute-and-phased-plans.md`, and `docs/phase-design-*-test-walkthrough.md` still mention `/specmanager-execute` by design — they are dated records of what shipped under the old name. No follow-up is needed unless a fully zero grep is later required (which would add a rewrite-all-docs task and risk breaking inbound links to `phase-7-execute-and-phased-plans.md`).

**No back-compat alias.** Per the approved decision (architecture Q1 / plan open questions), there is no `specmanager-execute.md` forwarder. A user typing the old command after restart gets "no such command" — acceptable for a single-user dogfooding tool with no external installs.
