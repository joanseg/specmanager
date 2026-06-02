---
id: wt-plan-and-walkthrough-optimisations-007
featureId: feat-plan-and-walkthrough-optimisations
stage: walkthrough
status: approved
stale: false
title: Plan and walkthrough optimisations — Phase core walkthrough
dependsOn:
  - plan-plan-and-walkthrough-optimisations-006
basedOn:
  plan-plan-and-walkthrough-optimisations-006: 1
generatedBy: agent
version: 1
phase: core
createdAt: '2026-06-01T13:10:45.452Z'
updatedAt: '2026-06-01T13:30:33.357Z'
---
# Plan and walkthrough optimisations — Phase core walkthrough

This phase reshapes how SpecManager plans and documents work: plans now default to a single phase, phase walkthroughs auto-fire when a build finishes, walkthroughs follow a proven runnable structure, and the feature roll-up card only appears when a feature truly has more than one phase. It is a single installable increment — four prompt/command edits plus one UI line, no `core` changes.

> **Exit test (from `plan.md`):** With the plugin rebuilt and reinstalled, (a) `/specmanager-plan` on a small feature emits a single named `## Phase` with no multi-phase prompt; (b) finishing a phase via `/specmanager-build` auto-creates a `draft` phase walkthrough without a manual command, and re-running build does not duplicate it; (c) a generated phase walkthrough carries the nine-section exemplar skeleton (verbatim exit-criterion blockquote, Prerequisites, Build, install/reload, numbered runnable exit checks, pass-criteria checklist, deferred, troubleshooting, next-phase preview); (d) a one-phase feature shows no "Feature roll-up" card on the board, and adding a second phase makes it appear.

Assumes SpecManager Phases 1–7 already pass and this phase's changes are on disk.

## 0. Prerequisites

- macOS or Linux, Node ≥ 20.
- The plugin repo with this phase's changes (this commit) checked out.
- A scratch target repo (or this repo) where you can run `/specmanager-*` commands end-to-end.
- The changes here are **prompt/command/UI only** — no `core` schema or server-logic change — so no new env vars or migrations.

## 1. Build (contributors only)

```bash
cd plugins/specmanager/server
npm install
npm run build            # tsc — must be clean
npm run selftest         # Phase 1 core flow
npm run selftest-phases  # Phase 7.A phased-plan assertions
npm run selftest-board   # REST + WS + tasks
npm run selftest-build   # Phase 7.B build/artifact assertions
npm run smoke-mcp        # MCP handshake + tools list

cd ../ui
npm install
npm run build            # vite — must be clean
```

**Expected:** every selftest prints its "All … assertions passed." line and `smoke-mcp` reports the tool count (21). Because this phase changed **no** `core`/server TypeScript, there are **no new selftest assertions** — the suite passing unchanged is itself the regression check. If any selftest fails, stop here: something outside this phase's scope regressed.

## 2. Install + reload the plugin in your test repo

These changes live in the working tree; the running MCP server uses the installed cache build until you reinstall. Standard dance:

```
/plugin marketplace update specmanager
/plugin uninstall specmanager
/plugin install specmanager@specmanager
/reload-plugins
```

If `/reload-plugins` reports "1 error during load":

```bash
pkill -f '^claude$'
claude daemon stop
ps aux | grep specmanager | grep -v grep   # kill any stale child mcp.js (kill -9 <PID>)
lsof -nP -iTCP:4317 -sTCP:LISTEN
cd /path/to/your/test/repo
claude
```

Confirm the right MCP build is up:

```bash
ps aux | grep specmanager/server/dist/mcp.js | grep -v grep
# the path's <commit> segment should match this phase's commit, not an older cache build
```

## 3. Phase core exit checks

### 3.1 Single-phase plan, no split prompt (R1)

In a test repo, drive a *small* feature to an approved Architecture, then:

```
/specmanager-plan <small-feature>
```

Expected:
- The planner does **not** call `AskUserQuestion` (no split confirmation for a small feature).
- `plan.md` has **exactly one** `## Phase <name> — <theme>` heading, and `<name>` is a real word (e.g. `core`), **not** `default`.

```bash
grep -c '^## Phase ' .claude/specs/features/<slug>/plan/plan.md   # → 1
```

Then confirm the single phase still satisfies the parsers:

```
list_phases featureId=<id>     # → exactly one entry, status "todo"
```

The plan still carries the `| Phase | Theme | Points |` summary table with a **Total** row and dotted `1.1, 1.2, …` task numbering — single-phase is not a flat list.

### 3.2 Big-feature split asks first (R1)

Plan a deliberately large feature (one with a genuine mid-build test boundary). Expected: the planner calls **`AskUserQuestion`** presenting the proposed phase boundaries *before* any `create_task`, offering at least the multi-phase split and a single-phase alternative. Declining the split falls back to a single phase (or your stated boundaries).

### 3.3 Build auto-fires the phase walkthrough (R2)

With an approved plan, build a phase to completion:

```
/specmanager-build <feature> next
```

Expected, **without running any walkthrough command**:
- After the builder returns and the phase is fully `done`, the build flow re-checks `check_gate({ stage: "walkthrough", phase })`, finds no existing walkthrough, and auto-creates a **`draft`** phase walkthrough.

```bash
ls .claude/specs/features/<slug>/walkthroughs/<slug>/phase-<name>.md   # exists
```

```
list_documents featureId=<id> stage="walkthrough"
# → one draft doc with frontmatter.phase === "<name>"
```

**Idempotency:** run `/specmanager-build <feature> <name>` again (or re-trigger step 8). Expected: it detects the existing walkthrough and does **not** create a second one — `list_documents` still shows exactly one. (This very document was produced by that auto-fire path.)

### 3.4 Walkthrough has the nine-section structure (R3)

Open the auto-created walkthrough. Expected sections, in order: title + **verbatim exit-criterion blockquote**, `## 0. Prerequisites`, `## 1. Build`, an install/reload section, numbered `## 3. … exit checks` with `### 3.x` runnable steps that each show **expected output**, `## 4. Pass criteria` checklist, a Deferred/Out-of-scope section, Troubleshooting, and a "what ships next" preview.

```bash
grep -E '^## (0\.|1\.|[0-9]+\. .*exit checks|[0-9]+\. Pass criteria)|^> ' \
  .claude/specs/features/<slug>/walkthroughs/<slug>/phase-<name>.md | head
```

For a non-plugin project the Build/install sections adapt to that project's real commands; the section skeleton is constant.

### 3.5 Roll-up card is phase-count-conditional (R4)

Open the board (`/specmanager-board`). For a **single-phase** feature, the Walkthroughs column shows the one `Phase <name>` card and **no** `★ Feature roll-up` card.

```bash
curl -s http://127.0.0.1:4317/api/board \
  | jq '.features[] | select(.id=="<id>") | (.phases | length)'   # → 1
```

Now add a second phase to that feature (e.g. `create_task featureId=<id> title="X" phase="followup" complexity=1`) and refresh the board. The `★ Feature roll-up` card now **appears** — keyed purely on `phases.length > 1`, reactive off the live manifest rollup with no other action.

## 4. Pass criteria (all required)

- [ ] §1: server `tsc`, all five selftests, `smoke-mcp`, and UI `vite build` all pass unchanged.
- [ ] §3.1: a small feature plans as exactly one `## Phase` with a real (non-`default`) name and no `AskUserQuestion`; `list_phases` returns one entry.
- [ ] §3.2: a large feature triggers `AskUserQuestion` to confirm the split before any task is persisted.
- [ ] §3.3: completing a phase via `/specmanager-build` auto-creates a `draft` phase walkthrough with no manual command; re-running does not duplicate it.
- [ ] §3.4: the generated walkthrough carries all nine sections incl. the verbatim exit-criterion blockquote and a pass-criteria checklist.
- [ ] §3.5: a one-phase feature shows no roll-up card; adding a second phase makes it appear (`/api/board` `phases.length` flips 1 → 2).

## 5. Deferred / out of scope (not regressions)

- **No `core`/server change** — no `phase.completed` event and no server-side phase-completion badge. Auto-fire is orchestrated by `/specmanager-build` (the agent turn), because the server cannot invoke an LLM subagent.
- **Board-driven phase completion does not auto-fire.** If you mark the last task `done` directly on the board (no build turn), the walkthrough is not auto-created — the existing "ready → copy `/specmanager-walkthrough …`" affordance covers it.
- **No project-type detection code.** R3's generalisation is a prompt instruction, not a code path.
- **`final` roll-up mode unchanged** beyond confirming it still links per-phase walkthroughs.

## 6. Troubleshooting

- **Plan still comes back multi-phase for a small feature** — the running MCP/agent is an older cache build; reinstall + `/reload-plugins` so the new `agents/planner.md` is loaded (agent prompts come from the installed plugin, not the working tree).
- **Build finishes but no walkthrough appears** — confirm the phase gate actually opened (`check_gate stage="walkthrough" phase=<name>` → `ok: true`); the builder may have stopped mid-phase with a task not `done`. Also confirm you're on the rebuilt `specmanager-build.md` (old step 8 only *suggests* the command).
- **Two walkthroughs created for one phase** — the idempotency guard (`list_documents` filtered by phase) isn't running; verify the reinstalled `specmanager-build.md` step 8 includes the existing-draft check.
- **Roll-up card shows for a single named phase** — the card is keyed on the wrong signal; it must use `phases.length > 1`, not the `multiPhase` name heuristic in `App.tsx`. Rebuild the UI (`npm run build`) and hard-refresh the board.

## 7. What ships next

This is the feature's only phase, so there is no next phase to preview. Because the feature has a single phase, the board intentionally shows **no `★ Feature roll-up` card** for it (R4) — review and approve *this* walkthrough to complete the Walkthroughs stage. If a follow-up later adds a second phase, the roll-up card will appear and a `final` walkthrough becomes available.
