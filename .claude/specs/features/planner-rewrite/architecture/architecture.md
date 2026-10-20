---
id: arch-planner-rewrite-028
featureId: feat-planner-rewrite
stage: architecture
status: approved
stale: false
title: Planner rewrite architecture
dependsOn:
  - prd-planner-rewrite-043
basedOn:
  prd-planner-rewrite-043: 4
generatedBy: agent
version: 4
createdAt: '2026-10-20T10:42:10.084Z'
updatedAt: '2026-10-20T11:21:54.846Z'
---
## Summary

Implements `prd-planner-rewrite-043` (G1–G7) as **prompt rewrites plus one small core change**. The prompts (`agents/planner.md`, `agents/reviewer.md`, `agents/walkthrough-writer.md`, `commands/specmanager-plan.md`, `commands/specmanager-build.md`, `commands/specmanager-walkthrough.md`, `commands/specmanager-loop.md`) gain the new phase-split rules, the spike fill path, the up-front human-setup ask, reviewer UI checks, and the two-part walkthrough. The core change makes per-phase metadata (`tasks.json` → `meta.phases`) carry a phase `kind` and its human `prerequisites`, and makes the phase rollup include **meta-only phases** (a placeholder with zero tasks). No new MCP tool, no new file, no UI work. Every phase count (`isSinglePhase`, `isFeatureShipped`, the `final` gate, the manifest) then sees the placeholder automatically, because all of them already go through `rollupPhases`. **G8 (added 2026-10-20)** adds a git-strategy step to the build command and one render addition to `core/claude-md.ts` that mirrors the latest walkthrough's git strategy into the managed `CLAUDE.md` block (see G8).

No design doc exists for this feature (not UI-facing); none consulted.

## Affected components

| Path | Change |
|---|---|
| `plugins/specmanager/server/src/core/types.ts` | `PhaseMetaSchema` gains `kind` and `prerequisites` (zod defaults, zero migration). New `PrerequisiteSchema`. |
| `plugins/specmanager/server/src/core/phases.ts` | `rollupPhases(tasks, metaPhases = {})` appends meta-only phases as `status: "empty"`; `PhaseDescriptor` gains `kind` + `prerequisites`; `listPhases` reads meta. |
| `plugins/specmanager/server/src/core/tasks.ts` | `setPhaseMeta` accepts and stores `kind` + `prerequisites`. |
| `plugins/specmanager/server/src/core/manifest.ts` | `buildManifest` passes `meta.phases` to `rollupPhases`. |
| `plugins/specmanager/server/src/core/dependencies.ts` | The `final` walkthrough gate passes `meta.phases` to `rollupPhases`. |
| `plugins/specmanager/server/src/mcp.ts` | `set_phase_meta` input schema + description gain optional `kind` / `prerequisites`. `list_phases` returns the new descriptor fields unchanged-in-shape otherwise. |
| `plugins/specmanager/server/src/selftest-phases.ts`, `selftest-build.ts` | New assertions (see core-phase-rollup). |
| `plugins/specmanager/server/src/selftest-prompts.ts` | New and re-worded invariants (see G7). |
| `plugins/specmanager/agents/planner.md` | Rewritten phase rule (G1), fill mode (G1a), prerequisites (G1b), no human-check tasks (G1d), single loop-mode carve-out (G6). |
| `plugins/specmanager/commands/specmanager-plan.md` | Duplicate check becomes "fill mode or refuse" (G1a). |
| `plugins/specmanager/commands/specmanager-build.md` | New step 6c (prerequisites ask, G2), placeholder-aware step 4, prerequisite check between dispatches, reviewer access + build log hand-off (G3/G4). |
| `plugins/specmanager/agents/reviewer.md` | Frontmatter `tools:` allowlist replaced by a `disallowedTools:` denylist; UI-check step (G3). |
| `plugins/specmanager/agents/builder.md` | One line: stop with a `NEEDS_HUMAN: <prerequisite id>` report instead of failing a task for a missing credential (Q9). |
| `plugins/specmanager/agents/walkthrough-writer.md` | Per-phase structure becomes Part 1 stakeholder guide + Part 2 technical doc + Lessons learned (G4). |
| `plugins/specmanager/commands/specmanager-walkthrough.md` | Passes the build log (if known) and points at Lessons learned sources. |
| `plugins/specmanager/commands/specmanager-loop.md` | Step 9 loop-mode line covers all planner questions; step 10 checks for human-check tasks (G6, M2). |
| `plugins/specmanager/.claude-plugin/plugin.json` | Minor version bump (1.1.0 → 1.2.0) at release. |
| `plugins/specmanager/server/src/core/claude-md.ts` | `renderBlock` adds a `### Git strategy` subsection inside the markers, mirrored from the newest walkthrough's `### Git strategy` section (G8). |
| `CLAUDE.md` (repo) | Note `kind`/`prerequisites` in phase meta and the reviewer's denylist under "Build leverage primitives". |

`docs/agent-snippets/*` fragments are untouched; their carriers (`planner.md`, `walkthrough-writer.md`) must keep the design-grounding and density-contract blocks byte-identical while being rewritten.

## Data model changes

All in `core/types.ts`, inside the existing `tasks.json` `meta.phases` record (keyed by phase name). Zod defaults mean every existing `tasks.json` parses unchanged — no migration.

```
PrerequisiteSchema = z.object({
  id: z.string(),                       // "pre-1", unique within the feature
  title: z.string(),                    // "Supabase project + service-role key"
  kind: z.enum(["account", "credential", "access", "test-account", "other"]),
  neededBy: z.array(z.string()).default([]), // task ids; [] ⇒ needed from the first task
  grantVia: z.string().optional(),      // suggested route for Claude to self-serve: "MCP: supabase", "CLI: `gh auth login`", "env: STRIPE_TEST_KEY"
})

PhaseMetaSchema = z.object({
  testCommand: z.string(),
  architectureRefs: z.array(z.string()).default([]),
  kind: z.enum(["build", "spike", "placeholder"]).default("build"),   // NEW
  prerequisites: z.array(PrerequisiteSchema).default([]),             // NEW
})
```

- **Never a secret.** A prerequisite records *what* is needed and *how to grant it*, never a value. Credentials live in the user's environment, CLI logins or MCP servers (Q6).
- **Placeholder lifecycle.** The planner writes a placeholder's meta with `kind: "placeholder"`, `testCommand: "none"`, and zero tasks. Filling it re-calls `set_phase_meta` with `kind: "build"` and the real `testCommand` / `architectureRefs` / `prerequisites`. The spike keeps `kind: "spike"`.
- `PhaseDescriptor` (`core/phases.ts`) gains `kind` and `prerequisites`, copied from meta (defaults `"build"` / `[]` when the phase has no meta entry).

## Interfaces

- `rollupPhases(tasks: Task[], metaPhases: Record<string, PhaseMeta> = {}): PhaseDescriptor[]` — the default keeps every current caller and selftest source-compatible.
- `setPhaseMeta(featureId, phase, meta: { testCommand: string; architectureRefs?: string[]; kind?: PhaseKind; prerequisites?: Prerequisite[] }, root?)` — still replaces the phase's whole entry (idempotent per phase), so callers pass every field each time.
- MCP `set_phase_meta` — input adds optional `kind` and `prerequisites` (same zod shapes). Description states: placeholder phases are declared here with zero tasks; prerequisites hold descriptions, never secret values.
- MCP `list_phases` — unchanged signature; each descriptor now also carries `kind` and `prerequisites`. This is the build command's read path for prerequisites (no new tool).
- Builder report signal (prompt contract, no core): a builder that hits a missing human prerequisite stops before marking the task `done` and reports `NEEDS_HUMAN: <prerequisite id or short description>`.

## core-phase-rollup

`rollupPhases` builds phases from tasks exactly as today, then **appends every `metaPhases` entry with `kind: "placeholder"` that has no tasks**, in the record's insertion order, as `{ taskCount: 0, …, status: "empty" }`. Meta-only entries of any other kind (stale keys from a renamed phase) are ignored exactly as today, so they can never hold the `final` gate. Consequences, all with no further code change:

- `listPhases` (now `rollupPhases(tasks, (await readTasksMeta()).phases)`) lists the placeholder; so do `buildManifest` (board shows it as an ordinary empty phase — `ui/src/App.tsx` already handles `"empty"`) and the `final` gate in `dependencies.ts` (a placeholder with no approved walkthrough keeps `final` closed).
- `getPhaseCompletion.isSinglePhase` (`phases.length === 1`) is `false` for spike + placeholder, so the spike's walkthrough is **not** terminal.
- `isFeatureShipped` (`core/shipped.ts`) receives two phases from `status.ts` (via `listPhases`) and `claude-md.ts` (via the manifest), so approving the spike walkthrough does not ship the feature.
- `getNextPhase` already skips `"empty"`, so after the spike it returns `null`; the build command disambiguates (see G2 flow).
- `getSpecSlice` and `resolveActiveCard` are unaffected (a placeholder is never built while empty).
- **Ordering rule** this relies on: a placeholder is always the **last** phase (the planner only ever emits spike → placeholder), so appending meta-only phases is the correct order. Filled tasks are created after the spike's, so first-appearance ordering keeps the filled phase second.

Tests: `selftest-phases` — meta-only phase listed as `empty` with `kind: "placeholder"`, appended last, `getNextPhase` skips it; defaults when meta absent. `selftest-build` — spike + placeholder ⇒ `isSinglePhase === false`; approving the spike walkthrough does not satisfy `isFeatureShipped`; `final` gate reports the placeholder as missing; legacy `tasks.json` without the new fields parses.

## G1 — Phase-split rules (planner)

`agents/planner.md` replaces "The phase rule" with a trigger list. **One phase is the default**; each split must name its trigger in the Overview (M1).

- **G1a Spike** — when the Architecture's Open questions / risks leave core unknowns that change *what* tasks exist. Emit `## Phase spike — <theme>` (spike tasks keep ordinary commit/prototype artifacts; the findings are recorded in the spike phase's walkthrough under `## Spike findings`, see G4 — no separate findings file) and `## Phase <name> — <theme> (placeholder)` with `**Exit test:** to be defined after the spike`, an empty task table, and `0` in the summary table. `set_phase_meta` for both: `kind: "spike"` and `kind: "placeholder"` (`testCommand: "none"`). A spike plan has exactly these two phases.
- **G1b Human setup** — list each item as a `prerequisite` on the phase that needs it (`neededBy` = task ids, known because `set_phase_meta` runs after `create_task`), with a `grantVia` suggesting MCP/CLI/token routes. Also list them in a new plan section `## Human prerequisites` (id, what, needed by row `n.m`, how to grant). **No split** for setup (Q1 resolved as the PRD assumes). Test-account needs for the reviewer are a `kind: "test-account"` prerequisite (G3).
- **G1c Size** — after decomposition to ≤3 (Q7: the totals are identical before and after, so "total points" is unambiguous), a total of **≈100 points** (A1, soft) ⇒ `AskUserQuestion` before persisting tasks, options: the recommended two-phase split with stated boundaries (what ships at each), and a single phase. Around 200+ points also offer a three-phase option (Q7 recommendation). Declined ⇒ single phase.
- **G1d No human-check tasks** — never persist a task whose work is a person verifying, testing, approving or eyeballing something; verification is the reviewer's (G3) and the walkthrough's (G4). A test-writing task is fine. Self-check step added.
- **G1e Kept** — Fibonacci ≤3, every parsed shape, `set_phase_meta` for every phase (now also for the placeholder), `dependsOn`/`basedOn`. The old "real, testable increment partway through" split is dropped as a trigger in favour of G1a–G1c.
- **UI check line** — for phases that change a UI, the phase section adds `**UI check:** <platform> — <how to launch>` under `**Exit test:**` (plain text; nothing parses it; it reaches the reviewer inside `planSection` of the slice).

### G1a fill mode (re-run `/specmanager-plan`)

`commands/specmanager-plan.md` step 1's "don't duplicate" becomes:

1. No plan doc → normal mode.
2. Plan doc exists and `list_phases` shows a `kind: "placeholder"` phase with `taskCount 0` **and** the `kind: "spike"` phase `status: "done"` **and** the spike phase's walkthrough is `approved` → **fill mode**.
3. Placeholder exists but the spike is not done → refuse: "spike not finished — build it first"; spike done but its walkthrough missing or `draft` → refuse: "approve the spike walkthrough first (it holds the findings)".
4. Otherwise → refuse as today.

Fill mode passes the planner `Mode: fill`, the plan doc id + `version`, the placeholder phase name, the spike walkthrough id, and the spike tasks' artifacts. The planner reads the spike walkthrough's `## Spike findings` (`read_document`) and the spike commits, then: `create_task` for the placeholder phase (≤3 each), `set_phase_meta` with `kind: "build"` + real `testCommand`/`architectureRefs`/`prerequisites`, and rewrites the placeholder's section of `plan.md` (heading loses `(placeholder)`, real Exit test, task table, updated summary + Total) via `write_document({ id, body, baseVersion })`. It does not touch the spike's section.

**Re-approval (Q3 resolution).** Before dispatching fill mode, the plan command calls `set_status({ id: planId, status: "draft" })` so the user re-approves the filled phase; `/specmanager-build` already refuses a non-approved plan (INV-32), so the filled phase cannot be built unreviewed. Known side effect: `propagateStale` marks the spike's walkthrough stale (it `dependsOn` the plan) — accepted and recorded in Open questions. Setting `draft` is not approving; INV-25 holds.

## G2 — Human-setup handling (build command, main session)

New `commands/specmanager-build.md` steps:

- **Step 4 (placeholder-aware).** `get_next_phase` → `null` and `list_phases` has an empty `kind: "placeholder"` → report "Placeholder phase <name> awaits `/specmanager-plan <feature>` (fill after the spike)" and stop, instead of "All phases done". An explicitly named placeholder phase is refused the same way.
- **Step 6c — Prerequisites (once per build session, before step 6b's tier question).** Read the target phase's `prerequisites` from `list_phases`. None → skip silently. Otherwise `AskUserQuestion` listing each item (title, kind, `grantVia`), options: **Provide now** *(recommended)*, **Start now and ask when actually needed**, plus always the suggestion to grant Claude access (connect an MCP server, log in a CLI, export a token env var) so Claude can do the setup itself. Answers are held in session state only (provided / deferred per id) — never written to disk, never into `.claude/specs/` (Q6).
- **Deferred items — asked between dispatches (Q9).** Before dispatching each task in step 7, if any deferred prerequisite lists that task id in `neededBy` (or has `neededBy: []` — needed from the first task), ask for it then. Primary mechanism; no builder interruption needed.
- **Unlisted needs.** If a builder returns `NEEDS_HUMAN: …`, the command turns it into an `AskUserQuestion`, then re-dispatches the same task. It is not a transport error (no R=2 retry spend) and not `blocked`. If the user declines, stop the phase (mid-phase stop path; the marker stays set, INV-2).
- Loop mode never reaches this: `/specmanager-loop` stops before Build (INV-42).

## G3 — Reviewer with real access

- **Frontmatter.** Replace `tools: Read, Glob, Grep, Bash` with `disallowedTools: Write, Edit, NotebookEdit, Agent, mcp__plugin_specmanager_specmanager__*`. The reviewer then inherits the session's browser/device MCP tools (e.g. a Chrome DevTools or Playwright server) and keeps Bash for `xcrun simctl` (iOS simulator) and `adb` (Android), while losing every file-editing tool and every SpecManager tool (no task/doc/status writes). Consulted: Claude Code sub-agents docs (code.claude.com/docs/en/sub-agents, 2026-10-20) — `disallowedTools` is applied before `tools`, accepts `mcp__<server>__*`, and MCP tools are inherited when `tools` is omitted; the page does not say explicitly that plugin agents honour `disallowedTools` (they are not in the ignored-for-plugins list) — see risk R-1. `model: opus` stays.
- **Prompt.** New "How to review" step: when the slice's plan section has a `**UI check:**` line or the diff touches UI files, launch the UI (the plan's launch line), drive the happy path the slice describes using the test account the parent names, and cite each check in `reasons` (M5). No UI tooling available → say so in `reasons` and judge from the diff (never fail for missing tools). The "Don't grade style or taste" line stays the only style/taste line (INV-24); "Never writes." stays once in the description (INV-22); verdict-only output and parent-advances (INV-8) unchanged.
- **Build command hand-off (step 7b).** The reviewer prompt adds: the phase's UI check line (from the slice), and the test-account access route (which env var / logged-in CLI / MCP server holds it — never the secret). The test account itself is a `kind: "test-account"` prerequisite asked in step 6c.

## G4 — Two-part walkthrough

`agents/walkthrough-writer.md` per-phase "Required structure" becomes:

- **Part 1 — `## Stakeholder test guide`** (first, before section 0). Explain-like-I'm-5 language, no commands or jargon. Numbered steps: what to open, what to click/type, what you should see — **happy path first**, then **2–4 edge cases** (each: what to try, what should happen). Ends with "If something looks different, tell the team what you saw."
- **Part 2 — the technical document**: today's sections 1–9 unchanged (title + verbatim exit blockquote, Prerequisites, Build, Install/run, exit checks, Pass criteria, Deferred, Troubleshooting, What ships next).
- **`## Lessons learned`** (last). Drawn only from what the build recorded (Q8 resolution, no new store): commit messages and their order (`git log` over the phase's task commits), `meta.blocked` notes (`readTasksMeta` via the board/`tasks.json`), and — when the walkthrough is auto-fired by `/specmanager-build` — a **build log** the command passes in its prompt: reviewer verdicts (fail reasons and how they were fixed), R=2 retries, Stop-gate failures, `NEEDS_HUMAN` pauses, deferred prerequisites. Nothing recorded → one line saying so; never invent lessons.
- **Spike findings (spike phases only).** When the phase's meta `kind` is `"spike"`, the walkthrough adds `## Spike findings` after the stakeholder guide: what was learned, decisions taken, unknowns still open, and the recommended build work for the placeholder phase. It is the durable record fill mode reads (end-question answer, 2026-10-20).
- **Final mode (Q4 resolution):** unchanged except it opens with a short feature-level stakeholder guide (end-to-end happy path), linking each phase's guide. Roll-up role otherwise unchanged (PRD non-goal).
- `commands/specmanager-walkthrough.md`: notes that a manually run walkthrough has no build log, so Lessons learned uses commits + blocked notes only.

## G5 — Core/MCP support

Covered by **Data model changes** and **core-phase-rollup**: placeholder exists in `list_phases` (meta-only phase), phase counts include it, and prerequisites/test-account needs are stored in `meta.phases[*].prerequisites` and read via `list_phases`. No other core change. Gates remain in core (`checkGate` unchanged); no model or network calls are added to the plugin.

## G6 — Loop mode

- `agents/planner.md` keeps **one** loop-mode statement (INV-44 counts "loop mode" exactly once), widened to: in loop mode do not call `AskUserQuestion` for any planner question (size split, spike, human setup, test account) — apply the recommended choice and record each decision plus the alternative not taken under Open questions. Prerequisites are still recorded (the build asks later).
- `commands/specmanager-loop.md` step 9: the injected `Loop mode:` line covers all planner questions, not only the split; step 10's cross-doc checks add "no human-verification task" (M2) and "a split names its trigger" (M1); step 11 gathers the planner's loop-mode decisions (plural).

## G7 — Invariants and snippets

`selftest-prompts.ts` changes (same commit as the prompt edits):

- **Re-worded:** INV-22 `what` — the residual is now "a `disallowedTools` denylist removes Write/Edit/NotebookEdit/Agent and all SpecManager tools; Bash can still write"; pattern `Never writes.` unchanged. INV-44 `what` — carve-out covers all planner questions; pattern/min/max unchanged.
- **Added (proposed ids INV-45…INV-50):** planner names the spike / human-setup / ≈100-point triggers (`agents/planner.md`); planner forbids human verification tasks (`agents/planner.md`, plus the loop review line); build command offers "start now and ask when actually needed" and suggests granting access via MCP/CLI (`commands/specmanager-build.md`); credentials/secrets are never written to `.claude/specs/` or committed (`commands/specmanager-build.md`, `agents/planner.md`); reviewer drives the changed UI with the test account (`agents/reviewer.md`); walkthrough starts with the stakeholder guide and contains Lessons learned (`agents/walkthrough-writer.md`). Each gets a min/max like existing entries and, for negatives, a `negativeSample`.
- **Added for G8 (proposed INV-51…INV-52):** build command asks the git-strategy question before the first builder dispatch and lets the user change it (`commands/specmanager-build.md`); builder never pushes and never switches branches (`agents/builder.md`). The walkthrough's Git strategy line joins the Lessons-learned invariant (INV-50).
- **Kept green:** INV-1 (single-phase never `final` — 4 actors), INV-10 (`set_phase_meta` every phase incl. placeholder), INV-13/INV-29 (density contract byte-identical), INV-15a/b (design grounding), INV-25 ("Don't approve" everywhere), INV-31 (builder writes nothing inside `.claude/specs/`), INV-42 (loop never builds).

## G8 — Git strategy (build command, main session)

The walkthrough is the single source of truth; `CLAUDE.md` mirrors it. The only core change is the render addition below.

- **Step 6a (new, after step 6, before 6b's tier question; once per build invocation).** Learn the pattern with read-only git: `git branch --show-current`, default branch (`git symbolic-ref --short refs/remotes/origin/HEAD`, else `main`/`master`), `git branch -a` naming prefixes (`feat/`, `fix/`…), `git log --oneline -20` (message style, one commit per task or not), unmerged branches ahead of the default (stacking), `git status --short` (unrelated uncommitted work). First read the managed `CLAUDE.md` block's `### Git strategy` (the last confirmed strategy), then the most recent walkthroughs' `### Git strategy` lines (`list_documents({ stage: "walkthrough" })`, newest first, a few at most) and any branching rule in the project's `CLAUDE.md`.
- **Suggest.** One proposal: base branch, working branch (`<prefix><slug>`; reuse the current branch when it already is this feature's branch — the re-entry case), commit granularity (default one commit per task staging only that task's files, matching the builder), message style (follow the log), push policy (default: never push until the user says), unrelated uncommitted changes (default: leave untouched, never stash or commit them). Name why, in one line each, from what was observed.
- **Confirm.** `AskUserQuestion`: **Use this strategy** *(recommended)* / **Stay on the current branch** / Other (free text edits). Edits are applied, then shown back once. Never create a branch, switch, or commit before the answer.
- **Apply** in the main session: `git switch -c <branch> <base>` (or `git switch <branch>`); uncommitted work carries over. Never commits, merges, rebases or pushes to the base branch.
- **Hand-off.** Every builder prompt gets a `Git strategy:` block (branch, granularity, message style, push policy). Builder rule (`agents/builder.md`): commit only on the checked-out branch per that block; never switch branches, never push.
- **Record.** The build log (G4) gains the strategy: proposed, what the user changed, and why. The walkthrough's `## Lessons learned` opens with `### Git strategy` from it; a manual walkthrough derives it from the phase commits' branch (`git branch --contains`) and says the proposal is unknown.
- **Sync to CLAUDE.md (core).** `renderBlock` (`core/claude-md.ts`) adds a `### Git strategy` subsection inside `<!-- specmanager:start/end -->`: from all walkthrough docs (any feature, draft or approved), take the newest by `updatedAt` whose body has a `### Git strategy` heading, slice it with the existing heading slicer (`indexHeadings` / `resolveArchitectureRefs` on slug `git-strategy`, `core/spec-slice.ts` — no second parser), and render it under a one-line source note (`_From <feature> — phase <name> walkthrough (<doc id>)._`). None found → the subsection is omitted. The post-phase sync's `sync_claude_md` (both **Full sync now** and **Managed blocks only**) therefore writes it; the existing auto-sync on doc events refreshes it too. **Wait** leaves it unsynced like every other managed content. Line-anchored marker merge unchanged; nothing outside the markers is touched. Test: `selftest` — a walkthrough with a `### Git strategy` section renders it in the block; a newer one replaces it; none ⇒ no subsection.
- `--bulk` asks the same once. Loop mode never reaches this (INV-42).

## Sequence / flow

**Default.** `/specmanager-plan` → planner → one phase, prerequisites recorded (if any) → plan draft → approve → `/specmanager-build f next` → step 6a git strategy (learn → suggest → user edits → switch branch) → step 6c asks prerequisites → 6b tiers → per-task dispatch (deferred items asked before their `neededBy` task) → Stop-gate → reviewer (UI check with test account) → `get_phase_completion` → walkthrough-writer (guide + technical + lessons, build log passed) → sync question.

**Spike.** plan → `spike` (tasks) + placeholder (meta only) → approve → `/specmanager-build f spike` → reviewer → spike walkthrough with `## Spike findings` (not terminal: `isSinglePhase` false) → user approves it → `/specmanager-build f next` reports "placeholder awaits plan fill" → `/specmanager-plan f` → fill mode: `set_status(plan, draft)` → planner creates tasks, `set_phase_meta(kind: build)`, `write_document(baseVersion)` → user re-approves → `/specmanager-build f <name>` → walkthrough → `final` roll-up (gate requires both phases' approved walkthroughs) → shipped.

**Size.** planner totals ≈100 → `AskUserQuestion` (two-phase split recommended | single) → persist per answer; loop mode applies the recommendation and records it.

## Failure & edge cases

- **Stale meta key** (a phase renamed after `set_phase_meta`) — ignored by the rollup unless its `kind` is `"placeholder"`, so it cannot surface as an empty phase or hold the `final` gate (see core-phase-rollup, Q-A).
- **Spike concludes no build is needed** — the placeholder would block `final` forever; no delete tool exists. Out of scope; the user edits `tasks.json`/plan manually. Recorded as Q-B.
- **Fill version conflict** on `write_document` → reject, report, no retry (existing optimistic concurrency).
- **Fill re-run after the placeholder is filled** → no empty placeholder ⇒ refuse as a duplicate.
- **User declines a deferred prerequisite mid-build** → mid-phase stop; active-build marker stays (INV-2); re-entry asks again.
- **Builder fails a task for a credential that was not listed** → it should report `NEEDS_HUMAN`; if it instead fails genuinely, the existing "genuine failure: surface verbatim, stop" path applies.
- **No browser/device tooling in the session** → the reviewer notes it and reviews the diff only; it never fails for missing tools (would otherwise escalate every UI phase to blocked).
- **`disallowedTools` ignored for plugin agents** (R-1) → the reviewer would inherit write tools. Verified in the build by a headless check; fallback is to keep the `tools:` allowlist and add named browser MCP tools.
- **Secrets** — prerequisites carry descriptions only; the build command keeps answers in session state; walkthroughs and build logs mention access routes, never values.
- **Legacy features** — `tasks.json` without `kind`/`prerequisites` parse via defaults; `default` phase behaviour unchanged.
- **Detached HEAD / no git repo** (G8) → report it, skip the branch proposal, and ask whether to continue committing as-is.
- **Proposed branch already exists** (G8) → propose switching to it, not recreating it.

## Conventions used

- TypeScript strict, ESM (`"type": "module"`), `.js` import suffixes; zod schemas in `core/types.ts` with `.default()` for zero-migration fields.
- All mutation goes through `core/` (`setPhaseMeta`); MCP and REST stay thin; one phase parser (`matchPhaseHeading`) untouched.
- Pure functions with optional trailing `root = projectRoot()`; new `rollupPhases` parameter defaulted so callers compile unchanged.
- Gates in core, never prompts; staleness only via `approved→draft` (`propagateStale`).
- Self-tests are hand-rolled `selftest-*.ts` scripts with `assert(cond, msg)`; prompt rules guarded by `selftest-prompts` with min/max counts; snippet fragments copy-pasted verbatim into carriers.
- Optimistic concurrency (`baseVersion`) on AI doc writes; "Don't approve" in every agent and stage command.
- No model or API calls from the plugin; new access is Claude-side only.
- Release: version bump, rebuild `server/dist` + `ui/dist` (UI unchanged but rebuild per checklist), `selftest-directory`, `claude plugin validate`. No packaging-surface test required (no `plugin.json` change beyond version, no `.mcp.json`/`hooks/` change) — but see R-1.

## Open questions / risks

- **R-1 (risk)** — Plugin agents and `disallowedTools`: the docs do not state it explicitly. The build must verify with a headless run that the reviewer cannot `Write`/`Edit` or call `update_task`; if not honoured, fall back to an explicit `tools:` allowlist (Read, Glob, Grep, Bash + common browser MCP wildcards).
- **Q1 (resolved as PRD assumes)** — human setup never forces a split; handled by step 6c.
- **Q2 (resolved)** — spike/placeholder recorded as `meta.phases[*].kind`; placeholder listed via meta-only rollup.
- **Q3 (resolved, confirmed 2026-10-20)** — fill mode reverts the plan to `draft` for re-approval; side effect: the spike walkthrough gets a stale badge. Alternative not taken: keep `approved` and only bump `version` (no re-review enforced).
- **Q4 (resolved, confirmed 2026-10-20)** — `final` gets a short feature-level stakeholder guide; per-phase gets the full two-part structure.
- **Q5 (resolved, confirmed 2026-10-20)** — reviewer uses a denylist and inherits session browser/device MCP tools + Bash (`xcrun simctl`, `adb`); INV-22 residual re-worded.
- **Q6 (resolved)** — credentials live in env vars / CLI logins / MCP servers; only descriptions and access routes are stored or passed.
- **Q7 (resolved, confirmed 2026-10-20)** — total points measured after decomposition (equal either way); ≈200+ also offers three phases.
- **Q8 (resolved)** — no new history store; Lessons learned uses commits, `meta.blocked`, and the build log the command passes when auto-firing. Manual walkthroughs have a thinner lessons section.
- **Q9 (resolved)** — asks happen between per-task dispatches (from `neededBy`); builders may also stop with `NEEDS_HUMAN`. `--bulk` builds ask all deferred items before the single dispatch.
- **Q-A (resolved, confirmed 2026-10-20)** — stale meta keys: `rollupPhases` appends only `kind: "placeholder"` meta-only entries (simplest guard). Alternative not taken: `set_phase_meta` refusing a phase with no tasks unless it is a placeholder.
- **Q-B** — no path to drop a placeholder when the spike shows no build is needed (no delete tool). Deferred (confirmed 2026-10-20).
- **Spike findings location (resolved 2026-10-20)** — recorded in the spike phase's walkthrough (`## Spike findings`, G4); fill mode requires that walkthrough `approved`. No `docs/spikes/` file.
