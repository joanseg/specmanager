---
id: wt-build-leverage-primitives-013
featureId: feat-build-leverage-primitives
stage: walkthrough
status: approved
stale: false
title: Build leverage primitives — Phase core walkthrough
dependsOn:
  - plan-build-leverage-primitives-012
basedOn:
  plan-build-leverage-primitives-012: 1
generatedBy: agent
version: 1
phase: core
createdAt: '2026-06-15T13:06:53.559Z'
updatedAt: '2026-06-15T13:10:50.392Z'
---
# Build leverage primitives — Phase core walkthrough

Phase **core** ships the *enforcement machinery* for the build-time leverage primitives: the deterministic R1 Stop-gate that blocks a stop while tests are red or phase tasks are open, R2 complexity→tier→alias model routing, the read-only R3 spec-compliance reviewer plus the parent slice-assembly that drives it, and the R5-core design-token bootstrap write path. It is the deterministic spine the prompt-only `wiring` phase (R4, R5-prompt, R6) depends on. This is a **dogfood** feature — every artifact below lives inside the SpecManager plugin's *own* source under `plugins/specmanager/`.

> **Exit test:** `npm run build` clean in `plugins/specmanager/server`; new selftests for the stop-gate and tiers plus existing `selftest-phases` / `selftest-build` green; `claude plugin validate plugins/specmanager` passes.

You should already have: the SpecManager repo checked out on `main` with this phase's 15 commits (`5353b4d` … `dd3b133`) present, Node 20+, and `npm` on PATH. No board needs to be running for the automated checks; the manual checks in §4 boot it.

## 0. Prerequisites

- **Runtime:** Node 20+ (`node --version` ≥ v20). The server and UI are both ESM (`"type": "module"`).
- **Repo / branch:** this repo at the `main` tip, with the `core` phase landed. Verify with `git log --oneline | grep -E '5353b4d|dd3b133'` — both `task-001` (`5353b4d`) and `task-015` (`dd3b133`) should appear.
- **Server deps installed:** `cd plugins/specmanager/server && npm install` (once). The committed `dist/` is what ships, so a rebuild is part of the exit test.
- **Seed data:** none required — every selftest scaffolds its own throwaway project under `$TMPDIR`.
- **`bash`** (the Stop-gate hook is pure bash) and **`claude`** CLI on PATH (for `claude plugin validate`).

## 1. Build

All commands run from `plugins/specmanager/server` unless noted.

```bash
cd plugins/specmanager/server
npm install        # first time only
npm run build      # tsc -p tsconfig.json → dist/
```

Expected: `tsc` exits 0, no diagnostics printed. This regenerates the committed `dist/` — every `core/`/`mcp.ts` source change in this phase (`types.ts`, `active-card.ts`, `tiers.ts`, `design-md.ts`, `mcp.ts`, the two `resolve-active-card.ts`/`set-phase-blocked.ts` CLIs) only ships once `dist/` is rebuilt.

Then run this phase's two **new** selftests plus the two existing ones the phase had to keep green:

```bash
npm run selftest-stopgate   # NEW — R1 Stop-gate end-to-end (task-007)
npm run selftest-tiers      # NEW — R2 complexity→tier→alias (task-008)
npm run selftest-phases     # existing — must stay green after the meta + blocked rollup changes
npm run selftest-build      # existing — per-phase build gates
```

New assertions this phase adds — expect these exact lines:

- `selftest-stopgate` ends with `All R1 Stop-gate assertions passed.` and prints, in order: `no-op pass when nothing is in flight`, `exit 2 when phase has open tasks`, `stderr names the open task`, `exit 0 when command passes and all tasks done`, `none-marker still fails on open tasks (criteria only)`, `none-marker never reports a test failure`, `none-marker passes once criteria met (no run)`, `cap attempt 1 → exit 2`, `cap attempt 2 → exit 2`, `cap attempt 3 → exit 0 (blocked, no infinite loop)`, `cap attempt 3 stderr announces BLOCKED`, `blocked note recorded for the phase`, `counter reset after cap → next fail is exit 2 again`.
- `selftest-tiers` ends with `All R2 tier assertions passed.` and asserts `complexity 1 → cheap`, `2 → standard`, `3 → strong`, `5 (>3) → strong`, `null/undefined → strong`, `cheap → haiku`, `standard → sonnet`, `strong → opus`, `default aliases carry no dated ids`, session-override remap, one-hop `complexity → alias`, and `unknown tier → inherit`.
- `selftest-phases` ends with `All Phase 7.A assertions passed.` (must survive the `meta.phases` schema extension and the `blocked` rollup added this phase).
- `selftest-build` ends with `All Phase 7.B assertions passed.`

**If any of these fail, stop here** — the phase boundary is not met.

## 2. Install / run (for the manual checks)

The Stop-gate hook only fires inside a live Claude Code session running the plugin. To exercise it (and the board's `blocked` surface) end-to-end, reinstall the rebuilt plugin:

```
/plugin marketplace update specmanager
/plugin install specmanager@specmanager
/reload-plugins
```

then reconnect the MCP server via `/mcp`.

**Reload troubleshooting:** if `/mcp` shows the server disconnected or the new `resolve_active_card` / `bootstrap_design_tokens` tools are missing after `/reload-plugins`, a full `claude` restart is the reliable fix (see README Troubleshooting). The `SessionStart` hook reinstalls `node_modules` into `${CLAUDE_PLUGIN_DATA}` and symlinks them back — give it a beat on first start.

The board (for §3.6) boots in-process with the MCP server; open it with the `open_board` tool or `/specmanager-board`.

## 3. Phase core exit checks

Each check is independently runnable. The §1 selftests are the automated proof; the checks below ground each exit-criterion claim in the actual shipped files.

### 3.1 `npm run build` is clean (exit-test claim 1)

```bash
cd plugins/specmanager/server && npm run build && echo "BUILD_RC=$?"
```

Expected: no `tsc` errors; final line `BUILD_RC=0`.

### 3.2 The two new selftests are green (exit-test claim 2)

```bash
npm run selftest-stopgate && npm run selftest-tiers
```

Expected: `All R1 Stop-gate assertions passed.` then `All R2 tier assertions passed.`, both exiting 0.

### 3.3 The existing phase/build selftests still pass (exit-test claim 2, regression guard)

```bash
npm run selftest-phases && npm run selftest-build
```

Expected: `All Phase 7.A assertions passed.` and `All Phase 7.B assertions passed.`. These guard that the `meta.phases.{testCommand,architectureRefs}` schema extension (`task-001`) and the first-class `blocked` rollup (`task-009`) didn't break the existing phase rollup or per-phase gate.

### 3.4 `claude plugin validate` passes after the `hooks.json` Stop entry (exit-test claim 3)

```bash
cd /Users/joan/Documents/projects/specmanager && claude plugin validate plugins/specmanager
```

Expected: `✔ Validation passed with warnings` (the lone warning is the pre-existing `No version specified` — unrelated to this phase). Confirm the `Stop` hook is wired:

```bash
node -e 'const h=require("./plugins/specmanager/hooks/hooks.json");console.log(JSON.stringify(h.hooks.Stop,null,2))'
```

Expected: a single entry whose command is `bash "${CLAUDE_PLUGIN_ROOT}/hooks/stop-gate.sh"`, alongside the pre-existing `SessionStart`/`FileChanged` (`task-007`, `hooks/hooks.json`).

### 3.5 R1 — the Stop-gate is deterministic, capped, and never invents a failure

The hook (`hooks/stop-gate.sh`, `task-005`/`task-006`) is pure bash, zero model calls. `selftest-stopgate` (§3.2) drives the full contract; the behaviours it proves, mapped to the source:

- **No-op when nothing is in flight** — `resolve-active-card.js` returns `null` ⇒ the hook `exit 0`s (lines 33–36). Never fabricates a failure.
- **Open tasks ⇒ exit 2 with actionable stderr** — `phase '<name>' has tasks not done: <ids>` (lines 124–125, R1/AC1). Exit 2 is the only channel back to Claude (forces continue).
- **`testCommand: "none"` ⇒ skip the run, verify criteria only** — `SKIP_RUN=1` (lines 92–94); the gate never reports a test failure for a test-less phase, but open tasks still fail the criteria. This is the marker the `wiring` phase's `meta.testCommand` carries.
- **Absent `testCommand` ⇒ fallback ladder** — the plan's `**Exit test:**` line if it looks runnable (`npm`/`uv`/`cargo`), else a convention probe (`npm test` / `uv run pytest` / `cargo test`), else unresolved ⇒ `exit 0` (lines 97–105, 75–87).
- **Iteration cap N=3** — a per-feature-phase counter under `.claude/specs/.cache/stop-gate/<slug>__<phase>` (lines 62–66). The Nth consecutive fail calls `set-phase-blocked.js`, writes a `blocked: <reason>` note into `tasks.json` `meta.blocked[<phase>]`, clears the counter, and `exit 0`s with a `BLOCKED` stderr banner (lines 139–154) — breaking the loop instead of spinning (R1/AC2). A pass clears the counter (lines 128–132).

Spot-check the active-card resolver in isolation against any in-flight project:

```bash
cd plugins/specmanager/server && SPECMANAGER_PROJECT_DIR=/path/to/a/project node dist/resolve-active-card.js | python3 -m json.tool
```

Expected: either `null` (nothing in flight) or a JSON object `{ featureId, slug, phase, testCommand, exitTest, architectureRefs, openTaskIds }` (shape from `core/active-card.ts`, `task-003`).

### 3.6 R1/R3 — `blocked` is a first-class task status, not just a meta note

> **Deviation-for-the-better.** The architecture hedged on surfacing the cap as a *meta-note marker only*. The builder instead implemented `blocked` as a **first-class task status** (`task-009`): added to the `TASK_STATUS` enum (`core/types.ts:12`), threaded through the phase rollup (`core/phases.ts`), the manifest cache (`core/manifest.ts` — `tasks.{todo,in_progress,done,blocked,total}`), the managed CLAUDE.md block (`core/claude-md.ts` — `🚫 blocked: <phases>`), and the board UI (`ui/src/BuildPanel.tsx` column + badge, `ui/src/App.tsx` card chip, `ui/src/styles.css`). The cap path still also writes the `meta.blocked[<phase>]` note (the data source); the status is the surfaced state. Net effect: a blocked phase is a visible board state with a clear remediation (re-enter the phase to reset the counter), not a buried string.

Verify the enum and rollup:

```bash
cd plugins/specmanager/server
grep -n 'TASK_STATUS = z.enum' src/core/types.ts          # → ["todo","in_progress","done","blocked"]
grep -n 'blocked' src/core/manifest.ts                    # counts include blocked
```

Board check (after §2 reinstall, board open): the `selftest-stopgate` cap scenario produces a phase with a `blocked` note; in a real build, a capped phase renders a `🚫 N blocked` badge on the phase group and feature card, and the phase group gets the `phase-group--blocked` class. Expected layout: blocked tasks sort after `done` in the column order (`STATUS_ORDER = ["todo","in_progress","done","blocked"]`, `BuildPanel.tsx:19`).

### 3.7 R2 — complexity routes to a tier to an alias (never a dated id)

`selftest-tiers` (§3.2) is the proof. The table lives in `core/tiers.ts` (`task-004`):

| complexity | tier | default alias |
|---|---|---|
| 1 | cheap | `haiku` |
| 2 | standard | `sonnet` |
| 3 | strong | `opus` |
| >3 / null / unknown | strong | `opus` |

Aliases only, never pinned dated ids (the selftest asserts `default aliases carry no dated ids`). A per-session override table wins over defaults; an unknown tier degrades to `inherit` (R2/AC4 — never errors). Confirm the dispatch is wired into the build command (`task-012`, `commands/specmanager-build.md`):

```bash
grep -n 'AskUserQuestion\|complexity → tier → alias\|model: <alias>\|inherit' plugins/specmanager/commands/specmanager-build.md
```

Expected: step **6b** confirms/remaps the session tier→alias table once per build (defaults pre-filled); step **7** dispatches `Task({ subagent_type: "builder", model: <alias> })` **per task**, omitting `model:` (⇒ `inherit`) when the alias is unknown/unavailable. `agents/builder.md` (`task-013`) keeps `model: inherit` and documents that the per-task alias is parent-supplied.

### 3.8 R3 — read-only reviewer + parent slice-assembly

The reviewer (`agents/reviewer.md`, `task-014`) is a separate parent-invoked step after the Stop-gate exits 0, **not** inside the hook loop. Verify its read-only contract:

```bash
grep -n '^model:\|^tools:' plugins/specmanager/agents/reviewer.md
```

Expected: `model: opus` (pinned strong, R3/AC6 — the judge must be capable) and `tools: Read, Glob, Grep, Bash` — **no** `Write`/`Edit`/`update_task`, no Architecture-doc read tools. It returns `{ verdict: "pass" | "fail", reasons: [...] }` and never writes; the parent decides advancement.

Verify the parent assembles the slice and invokes it (`task-015`, `commands/specmanager-build.md` step **7b**):

```bash
grep -n 'Assemble the spec slice\|architectureRefs\|one R2 tier higher\|N=3' plugins/specmanager/commands/specmanager-build.md
```

Expected: the parent assembles slice = phase's `plan.md` section + task titles/notes + the Architecture section(s) named in `meta.architectureRefs` (name/id-match fallback when absent); invokes the reviewer at `opus`; on `fail` re-dispatches the fix **one R2 tier higher** (capped strong), counting against the **same** N=3 Stop-gate budget — persistent fail ⇒ `blocked`, no second independent loop (R3/AC5). The `meta.architectureRefs` field that anchors this is emitted by the planner via `set_phase_meta` (`task-002`, registered in `mcp.ts`).

### 3.9 R5-core — placeholder-only design-token bootstrap

`mergeSynthesizedTokens` (`core/design-md.ts`, `task-010`) is a fill-placeholder, marker-anchored merge: it parses the YAML inside `<!-- specmanager:design:start -->` / `<!-- specmanager:design:end -->` and overlays synthesized values **only** where the existing value is a `# TODO`/sentinel placeholder or absent — it never clobbers harvested real CSS-var values (the `isPlaceholderLine` guard + `PLACEHOLDER_SENTINELS`, lines 459–516). It reuses the exact `START`/`END` slice logic from `syncDesignMd`. The MCP tool `bootstrap_design_tokens({ tokens })` (`task-011`, `mcp.ts`) is the **only** AC8 write path — it calls `mergeSynthesizedTokens` and emits `design.synced` (the designer never raw-`Write`s `docs/DESIGN.md`). The `wiring` phase's designer prompt is what *calls* this tool; here only the deterministic write path ships.

Confirm registration:

```bash
grep -n 'bootstrap_design_tokens\|mergeSynthesizedTokens' plugins/specmanager/server/src/mcp.ts
```

Expected: the tool is registered and calls `mergeSynthesizedTokens`.

### 3.10 The cache dir is git-ignored

The Stop-gate counter lives under `.claude/specs/.cache/`. `core/features.ts` (`task-006`) writes `.cache/` into `.claude/specs/.gitignore` on init, so counter files never get committed.

```bash
grep -n "'.cache/'" plugins/specmanager/server/src/core/features.ts   # writes .cache/ to .claude/specs/.gitignore
```

Expected: the `ignorePath` write of `.cache/\n` is present.

## 4. Pass criteria

All required; each independently verifiable above.

- [ ] `npm run build` exits 0 with no `tsc` diagnostics (§3.1).
- [ ] `npm run selftest-stopgate` prints `All R1 Stop-gate assertions passed.` (§3.2).
- [ ] `npm run selftest-tiers` prints `All R2 tier assertions passed.` (§3.2).
- [ ] `npm run selftest-phases` prints `All Phase 7.A assertions passed.` (§3.3).
- [ ] `npm run selftest-build` prints `All Phase 7.B assertions passed.` (§3.3).
- [ ] `claude plugin validate plugins/specmanager` reports `Validation passed` (version warning only) (§3.4).
- [ ] `hooks.json` has a `Stop` entry invoking `stop-gate.sh` (§3.4).
- [ ] `resolve-active-card.js` returns the documented JSON shape or `null` (§3.5).
- [ ] `TASK_STATUS` includes `blocked`; it threads through manifest, claude-md, and the board UI (§3.6).
- [ ] `core/tiers.ts` maps 1→cheap/`haiku`, 2→standard/`sonnet`, 3→strong/`opus`, >3/null→strong, unknown→`inherit`, no dated ids (§3.7).
- [ ] `agents/reviewer.md` is `model: opus`, read-only (`Read, Glob, Grep, Bash`), and the build command assembles the slice + escalates on fail within the N=3 budget (§3.8).
- [ ] `bootstrap_design_tokens` is registered and calls the placeholder-only `mergeSynthesizedTokens` (§3.9).
- [ ] `.cache/` is git-ignored via `.claude/specs/.gitignore` (§3.10).

## 5. Deferred / Out of scope (expected, not a bug)

These are intentionally **not** in the `core` phase — they land in the `wiring` phase or are PRD non-goals:

- **No prompt wiring of Superpowers (R4), `frontend-design` (R5-prompt), or Context7 (R6).** `builder.md`/`designer.md`/`architect.md` don't yet detect-then-defer to those skills — that's the `wiring` phase. The `core` phase only ships what those prompts will *call* (the reviewer, the tier dispatch, `bootstrap_design_tokens`).
- **No Architecture anchor-scheme convention in `architect.md` yet** (R3/AC2a) — `wiring` task. The slice-assembly already resolves `meta.architectureRefs` with a name/id-match fallback, so it works before the convention is formalized.
- **PRD non-goals stay out entirely:** per-card worktree isolation, GitHub issue/PR sync, headless board-drain, preference-learning, Cerebras, wiring Superpowers' brainstorming/planning skills, vendoring any skill code, a `design-brief.md` artifact, and any `.mcp.json` change for Context7.

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `npm run build` errors on `tiers.ts`/`active-card.ts` imports | stale `core/index.ts` re-exports | `task-003`/`task-004` add the exports; ensure you're on `main` tip and re-run `npm install` then `npm run build`. |
| Stop-gate seems to do nothing in a session | `node` or `${CLAUDE_PLUGIN_ROOT}` unresolved, or `dist/resolve-active-card.js` missing | hook `exit 0`s on purpose (never invents a failure); confirm `dist/` is built and the plugin reloaded (§2). |
| New tools (`resolve_active_card`, `bootstrap_design_tokens`) missing after reload | `/mcp` didn't reconnect | restart `claude` fully (README Troubleshooting). |
| A phase is stuck `blocked` | Stop-gate cap (N=3) tripped on failing tests / open tasks | read the `meta.blocked[<phase>]` reason; fix the cause, then **re-enter and rebuild the phase** — re-entry resets the counter (`SAFE_KEY` reset). |
| `selftest-roundtrip` fails | **known prior issue** — fails on `main` independent of this phase; not a `core` regression | out of scope for this phase; track separately. |

## 7. What ships next (preview)

The **`wiring`** phase (R4, R5-prompt, R6, R3/AC2a) is pure detect-then-defer prompt edits with no compiled-code surface — it *consumes* this phase's spine: `builder.md` defers to Superpowers and composes with the R3 reviewer; `designer.md`/`builder.md` defer to `frontend-design` on top of `docs/DESIGN.md` and call this phase's `bootstrap_design_tokens` on synthesize; `architect.md` gets the Context7 doc-lookup ladder and the Architecture anchor convention that `meta.architectureRefs` resolves against. Its exit test is `claude plugin validate` plus two manual dry-runs (a thin-`DESIGN.md` design; a version-sensitive architecture draft) — which is why its `meta.testCommand` is the explicit `"none"` marker this phase's Stop-gate already honors.
