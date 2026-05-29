---
id: arch-rename-execute-command-to-build-002
featureId: feat-rename-execute-command-to-build
stage: architecture
status: draft
stale: false
title: Rename execute command to build architecture
dependsOn:
  - prd-rename-execute-command-to-build-002
basedOn:
  prd-rename-execute-command-to-build-002: 1
generatedBy: agent
version: 1
createdAt: '2026-05-28T19:55:20.787Z'
updatedAt: '2026-05-28T19:55:20.787Z'
---
## Summary

A pure naming refactor inside SpecManager's own repo: rename the user-facing command `/specmanager-execute` → `/specmanager-build` and flip every surrounding "execute" reference (UI copy strings, the managed-`CLAUDE.md` generator string, one MCP description, the internal self-test, and docs) to "build". **No behaviour changes.** The command still drives exactly one phase of a feature's plan via the `builder` subagent (`Task({ subagent_type: "builder" })`) and stops at the phase boundary. Because Claude Code discovers plugin commands by **filename** (verified: `.claude-plugin/plugin.json` carries no `commands` entry), the rename is realised by renaming the file `commands/specmanager-execute.md` → `commands/specmanager-build.md`, which simultaneously renames the `specmanager:specmanager-execute` skill. Nothing in `@specmanager/core`, the MCP tool names, the gate semantics, or the `builder` agent is touched.

## Affected components

All paths are under `/Users/joan/Documents/projects/specmanager/`.

**Renamed file (the rename itself):**
- `plugins/specmanager/commands/specmanager-execute.md` → `plugins/specmanager/commands/specmanager-build.md` — renaming the file renames both the command and the derived skill name. Body/frontmatter strings updated in place.

**Edited in place (UI — user-facing, must flip in lockstep):**
- `plugins/specmanager/ui/src/App.tsx` — lines 139 (comment), 144 (emitted slash string), 178 (copy tooltip).
- `plugins/specmanager/ui/src/BuildPanel.tsx` — lines 206 (emitted slash string), 230 (copy tooltip).

**Edited in place (server — copy strings, not behaviour):**
- `plugins/specmanager/server/src/core/claude-md.ts` — line 86 hard-codes the managed command-list string. Source of truth for the rendered `CLAUDE.md`.
- `plugins/specmanager/server/src/mcp.ts` — line 362, the `get_next_phase` human-readable `description` mentions "Used by /specmanager-execute." Copy only; the MCP tool name `get_next_phase` is unchanged.

**Edited / renamed (internal self-test — see decision Q4):**
- `plugins/specmanager/server/src/selftest-execute.ts` — line 38 temp-dir prefix `"specmanager-execute-"`, plus header-comment prose. Recommend renaming the file → `selftest-build.ts`.
- `plugins/specmanager/server/package.json` — line 14 script `"selftest-execute": "node dist/selftest-execute.js"`. If the file is renamed, update both script name and the `dist/*.js` path.

**Auto-generated, do NOT hand-edit:**
- `CLAUDE.md` line 15 (project root) — inside the `<!-- specmanager:start -->`/`<!-- specmanager:end -->` managed region. It regenerates from `claude-md.ts` on the next `sync_claude_md`. Editing it by hand violates the "frontmatter/generator is authoritative" pillar.

**Documentation references (text only — see decision Q2):**
- `README.md` — lines 42, 61 (command in the lifecycle listing), line 116 (`npm run selftest-execute`).
- `docs/phase-7-execute-and-phased-plans.md` — lines 15, 62, 75, 78, 107, plus the **filename** contains "execute".
- `docs/phase-7-A-test-walkthrough.md` (line 249), `docs/phase-7-B-test-walkthrough.md` (lines 3, 6, 24, 29, 58, 61, 124, 172, 182), `docs/phase-7-C-test-walkthrough.md` (lines 6, 23, 31, 72, 77), `docs/phase-design-C-test-walkthrough.md` (line 212), `docs/phase-design-D-test-walkthrough.md` (line 138).

**Explicitly NOT touched (verified by reading):**
- `plugins/specmanager/agents/builder.md` — `name`, `description`, `tools` carry no `/specmanager-execute` string. The words "Executes/Execution" are descriptive prose, not the command name; per PRD non-goals this file is unchanged.
- `plugins/specmanager/server/src/core/**` — no gate, staleness, or state-transition logic changes.
- MCP tool names in `mcp.ts` (`get_next_phase`, `list_phases`, `list_tasks`, `update_task`, …).

## Data model changes

**None.** No schema, frontmatter field, `manifest.json`, `tasks.json`, or persisted-document change. No migration. The command argument contract is unchanged: `<feature> <phaseName | "next"> [--force]`.

## Interfaces

No new public functions, endpoints, events, or MCP tools. The only interface that changes is the **command surface the user types**:

- Removed: `/specmanager-execute <feature> <phaseName | "next"> [--force]`
- Added: `/specmanager-build <feature> <phaseName | "next"> [--force]`

Internal wiring is unchanged. The command file still ends in `Task({ subagent_type: "builder", prompt: ... })`. No code references the qualified skill id `specmanager:specmanager-execute` (verified by grep), so there is no caller to update — the skill name is only ever surfaced to the user by command discovery.

### Change inventory (path → current → new)

**1. Command file rename**

| Path | Current | New |
|---|---|---|
| `plugins/specmanager/commands/specmanager-execute.md` (file) | filename `specmanager-execute.md` | `specmanager-build.md` (renames command + skill) |
| ↳ frontmatter `description:` | "Execute one phase of a SpecManager feature's plan via the builder subagent. Stops at the phase boundary; never advances." | "Build one phase of a SpecManager feature's plan via the builder subagent. Stops at the phase boundary; never advances." |
| ↳ body title (line 6) | "Execute one phase of the plan for **$ARGUMENTS**." | "Build one phase of the plan for **$ARGUMENTS**." |
| ↳ in-prompt copy (e.g. line 19 "nothing to execute"; step verbs) | "...nothing to execute" / "execute it first" / "execute a phase out of order" | "...nothing to build" / "build it first" / "build a phase out of order" |

Note: `argument-hint`, the 8 numbered Steps, gate checks, order check, idempotency rule, and the `Task({ subagent_type: "builder" })` invocation stay **byte-identical** apart from the verb in prose.

**2. UI strings**

| Path:line | Current | New |
|---|---|---|
| `ui/src/App.tsx:139` (comment) | `// ...suggest /specmanager-execute.` | `// ...suggest /specmanager-build.` |
| `ui/src/App.tsx:144` | `` `/specmanager-execute ${row.id} next` `` | `` `/specmanager-build ${row.id} next` `` |
| `ui/src/App.tsx:178` | `title="copy /specmanager-execute next slash command"` | `title="copy /specmanager-build next slash command"` |
| `ui/src/BuildPanel.tsx:206` | `` `/specmanager-execute ${featureId} ${g.name}` `` | `` `/specmanager-build ${featureId} ${g.name}` `` |
| `ui/src/BuildPanel.tsx:230` | `title="copy /specmanager-execute slash command"` | `title="copy /specmanager-build slash command"` |

**3. Generator string**

| Path:line | Current | New |
|---|---|---|
| `server/src/core/claude-md.ts:86` | `...· \`/specmanager-plan\` · \`/specmanager-execute\` · \`/specmanager-walkthrough\` ...` | `...· \`/specmanager-plan\` · \`/specmanager-build\` · \`/specmanager-walkthrough\` ...` |

Rendered `CLAUDE.md:15` regenerates on the next `sync_claude_md` — not hand-edited.

**4. MCP description (copy, not a tool name)**

| Path:line | Current | New |
|---|---|---|
| `server/src/mcp.ts:362` | `"...or null if every phase is complete. Used by /specmanager-execute."` | `"...or null if every phase is complete. Used by /specmanager-build."` |

**5. Internal self-test (decision Q4 — recommend rename for grep-clean)**

| Path:line | Current | New (recommended) |
|---|---|---|
| `server/src/selftest-execute.ts` (file) | `selftest-execute.ts` | `selftest-build.ts` |
| `server/src/selftest-execute.ts:38` | `os.tmpdir(), "specmanager-execute-"` | `os.tmpdir(), "specmanager-build-"` |
| `server/src/selftest-execute.ts:1-9` (header prose) | "execute phase A" / `node dist/selftest-execute.js` | "build phase A" / `node dist/selftest-build.js` |
| `server/package.json:14` | `"selftest-execute": "node dist/selftest-execute.js"` | `"selftest-build": "node dist/selftest-build.js"` |

**6. Documentation references (decision Q2 — recommend rewrite live docs, leave dated walkthroughs)**

| Path | Current | New (recommended) |
|---|---|---|
| `README.md:42,61,116` | `/specmanager-execute`, `npm run selftest-execute` | `/specmanager-build`, `npm run selftest-build` |
| `docs/phase-7-*-test-walkthrough.md`, `docs/phase-design-*-test-walkthrough.md`, `docs/phase-7-execute-and-phased-plans.md` | `/specmanager-execute` (historical records) | leave as historical record OR rewrite — see Open questions |

## Sequence / flow (unchanged — for reference)

1. Board renders the Build cell (`App.tsx`) / Build panel header (`BuildPanel.tsx`), emitting `▶ /specmanager-build <feature> next` (was `…-execute`).
2. User copies and pastes the string into a Claude session.
3. Claude Code resolves the typed command to the skill derived from the filename `specmanager-build.md` (was `specmanager-execute.md`).
4. The command runs its 8 steps **unchanged**: parse args → resolve feature → `check_gate({stage:"plan"})` + plan-approved check → resolve target phase (`get_next_phase` for `next`) → order check (unless `--force`) → idempotency → `Task({ subagent_type: "builder", ... })` → report and suggest `/specmanager-walkthrough`.
5. `builder` works the phase's tasks via the same MCP tools and stops at the phase boundary.

The only altered hop is step 3 (which filename the typed command resolves to). Steps 4–5 are identical.

## Failure & edge cases

- **Board emits a command that doesn't exist yet (transition window).** If the UI strings ship before the command file is renamed, the board hands the user `/specmanager-build` while only `specmanager-execute.md` exists. Mitigation: sequence the command-file rename **first** within the single phase; treat the whole rename as one atomic change set landed together. (PRD Open question 3 confirmed this risk.)
- **Stale `CLAUDE.md`.** If `claude-md.ts:86` is edited but `sync_claude_md` is not run, the rendered `CLAUDE.md:15` still advertises the old command. Verification step below requires a sync. Do not hand-edit `CLAUDE.md`.
- **Stale build artifact.** `ui/dist/assets/index-*.js` contains the old string (a compiled bundle). It is rebuilt by the UI build; the grep verification must exclude `ui/dist/` (and `node_modules`, `.claude/specs/`) or it will report a false positive. A fresh UI build should be produced so the served board emits the new string.
- **Self-test script rename breaks `npm run selftest-execute`.** If Q4 is resolved toward rename, anyone (or any doc) invoking the old script name fails. Update `README.md:116` and the `docs/phase-7-*` references in the same change set.
- **No alias = old muscle memory 404s.** A user typing `/specmanager-execute` after the rename gets "no such command". Acceptable for a single-user dogfooding tool (see decision below).

## Conventions used (matched to this repo)

- **Filename-based command discovery** (verified: `.claude-plugin/plugin.json` has no `commands` block) — rename the file, do not register anything.
- **Generator string is authoritative; rendered `CLAUDE.md` is a rebuildable cache** — edit `claude-md.ts`, run `sync_claude_md`, never hand-edit the managed region between the `specmanager:start`/`end` markers.
- **`@specmanager/core` is the single source of mutation/validation logic** — this change deliberately stays out of `core` (naming-only, no logic).
- **MCP tool names stay clean; only human-readable descriptions carry command copy** — consistent with treating `mcp.ts:362` as copy.
- **TypeScript + latest-APIs stack**, UI in React 18 + Vite — edits are string-literal swaps; no API surface touched.
- **Incremental, minimal-diff, no defensive over-engineering** (per repo CLAUDE.md) — no compat shims unless the alias decision asks for one.

## Open questions / risks (architecture decisions — recommendations included)

These map to the PRD's four flagged open questions, which the PRD left undecided ("do not decide here"). Recommendations for the planner/user to confirm:

1. **Deprecated alias vs hard removal.** Because commands are filename-discovered, an "alias" means keeping a second `commands/specmanager-execute.md` whose body forwards to / documents the new name (it cannot transparently delegate — it would be its own skill). That permanently re-pollutes the grep and contradicts the one-vocabulary goal. **Recommendation: hard removal** (rename the file, keep no alias). Single-user dogfooding tool, no external installs, git preserves history. This makes the success-metric grep target **zero** hits.
2. **Historical walkthrough docs (`docs/phase-7-*`, `docs/phase-design-*`).** These are dated records of what shipped at the time. **Recommendation: leave them as historical record** and instead scope the success-metric grep to exclude `docs/phase-*-walkthrough.md` (and the `docs/phase-7-execute-and-phased-plans.md` plan-record), OR add a one-line note at the top of each that the command was later renamed. Rewriting dated records falsifies history for a cosmetic grep win. Live, forward-looking docs (`README.md`) **should** be rewritten. If the user prefers a fully clean grep, rewrite all docs and rename `docs/phase-7-execute-and-phased-plans.md` → `…-build-and-phased-plans.md` (risk: breaks any inbound links).
3. **Board copy-slash strings.** Confirmed user-facing; flip in lockstep (App.tsx + BuildPanel.tsx). The only residual risk is the transition-window ordering (see Failure cases) — land the command-file rename in the same change set. No decision needed beyond confirming "yes, change them," which the PRD already did.
4. **Internal self-test naming.** Low stakes. **Recommendation: rename** `selftest-execute.ts` → `selftest-build.ts`, the npm script, and the temp-dir prefix, so a strict repo-wide grep is clean. If the user prefers minimal churn, leaving it is acceptable provided the grep success-metric explicitly whitelists `selftest-execute*`.

**Verification checklist (for the plan's exit test):**
- `grep -rIn "specmanager-execute" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist . | grep -v "/.claude/specs/"` returns only the hits intentionally retained per decisions 1/2/4 (zero if all resolved toward removal/rewrite).
- `claude plugin validate` passes and the plugin installs.
- The board (after a fresh UI build) emits `/specmanager-build …` from both the Build cell and the Build panel.
- After `sync_claude_md`, `CLAUDE.md:15` shows `/specmanager-build`.
- `/specmanager-build <feature> next` drives one phase via `builder` and stops at the phase boundary — observably identical to the old command.

### Non-goals (scope guard)
No `@specmanager/core` logic, no MCP tool-name, no gate/staleness/state-transition, and no `builder`-agent changes. New flags, features, or Build-panel UX redesign are out of scope.
