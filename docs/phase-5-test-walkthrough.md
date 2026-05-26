# Phase 5 — Test walkthrough

End-to-end test of **build execution + walkthroughs**: interact with tasks in the UI, mark them `in_progress`/`done` with commit/file links, watch the Build progress bar move, and once everything is `done` generate a walkthrough grounded in the linked code.

> Exit criterion (from `docs/phase-tasks.md`):
> Take an approved Plan's tasks; mark `in_progress`/`done` with commit/file links and watch Build progress; once all `done`, generate a walkthrough grounded in the linked code.

Assumes Phases 1–4 already pass.

## 0. Prerequisites

A repo where Phase 4 has produced an approved Plan with several tasks (i.e. the planner subagent ran and emitted `tasks.json`). If you only have one task you can still test the flow but the progress bar is less interesting.

## 1. Build (contributors only)

```bash
cd plugins/specmanager/server
npm install
npm run build
npm run selftest-board    # now covers task POST/PATCH + walkthrough-gate flip

cd ../ui
npm install
npm run build
```

The board selftest output should include:

```
ok — POST /api/features/:id/tasks → 200
ok — new task starts todo
ok — PATCH tasks → 200
ok — task status updated
ok — task commit recorded
ok — task file recorded
ok — walkthrough gate opens when all tasks done
ok — PATCH unknown task → 404
```

## 2. Install + reload the plugin in your test repo

Phase 5 adds new server REST endpoints and a new UI bundle, so consumers need a fresh install.

In Claude Code (open in the repo you're testing against):

```
/plugin marketplace update specmanager
/plugin uninstall specmanager
/plugin install specmanager@specmanager
/reload-plugins
```

If `/reload-plugins` reports "1 error during load" or task interactions in the UI fail with 404, you almost certainly have a stale MCP server process from a previous session. **Quit Claude and kill the daemon** before retrying:

```bash
pkill -f '^claude$'
claude daemon stop
ps aux | grep specmanager | grep -v grep   # confirm no leftover node mcp.js processes; kill any
lsof -nP -iTCP:4317 -sTCP:LISTEN            # should be empty after kill
cd /path/to/your/test/repo
claude
```

Confirm the right MCP came up:

```bash
ps aux | grep specmanager | grep -v grep
# expect exactly one: node …/cache/specmanager/specmanager/<commit>/server/dist/mcp.js
```

## 3. Open the board

```
/specmanager-board
```
If fails:
```
/reload-plugins
```
Exit claude ctrl+c
Reload Claude
```
/specmanager-board
```


Pick a feature row whose **Build** cell shows tasks (e.g. `0/5 done`).

## 4. Phase 5 exit checks

### 4.1 Open the Build panel

Click the Build cell. A right-side panel opens showing:

- Header with `N/M done` and progress bar.
- One row per task with `<task-id>`, title, and three status pills (Todo / In progress / Done).
- A "▸ artifacts" toggle per row.
- A bottom action bar with an input + "Add task" button.

### 4.2 Move a task to in_progress

Click the **In progress** pill on the first task. Expected:

- Pill turns amber, becomes the active one.
- Progress bar shifts (amber segment grows).
- A `task.updated` WS event is delivered — the panel refreshes itself without you reloading.

Verify on disk:

```bash
cat .claude/specs/features/<slug>/plan/tasks.json | head -20
```

The first task should now have `"status": "in_progress"` and a fresh `updatedAt`.

### 4.3 Attach a commit + file

Expand the artifacts area on the in-progress task. In **Commits**, type a short sha (`abc1234` or full) and press Enter — it appears in the list. In **Files**, type a real source path (e.g. `src/foo.ts`) and press Enter.

Verify the artifacts wrote through:

```bash
cat .claude/specs/features/<slug>/plan/tasks.json
```

The task should now show `artifacts.commits` and `artifacts.files` populated.

### 4.4 Mark a task done

Click **Done** on the task. Pill flips green, title gets a soft strikethrough, progress bar's green segment grows. The Build cell on the board updates live (counts + bar).

### 4.5 Add an ad-hoc task

Sometimes the plan misses something. Type a title in the bottom input ("hotfix: rename column") and click **Add task**. It appears in the list as `task-NNN · Todo`. Tasks emitted ad-hoc are first-class — they count toward the walkthrough gate.

### 4.6 Walkthrough gate (closed)

In your Claude session, run:

```
/specmanager-walkthrough <feat-id-or-slug>
```

While at least one task is not `done`, the slash command must refuse with the gate reason:

```
Gate closed: <n> task(s) not done: task-XXX, task-YYY, …
```

This proves the gate enforcement is in `core` (Phase 1) and not just polite prose.

### 4.7 Close out the Build → walkthrough gate opens

Move every remaining task to **Done** in the panel. Verify in the board:

- Build cell now reads `M/M done`, progress bar is fully green.
- The Walkthrough column's empty cell flips from inactive to a clickable "Generate" affordance with `/specmanager-walkthrough` (Phase 3 affordance).

### 4.8 Generate the walkthrough

```
/specmanager-walkthrough <feat-id-or-slug>
```

Expected:

- `check_gate` now returns `ok: true`.
- The **walkthrough-writer** subagent (Phase 4) is invoked.
- It reads PRD + Architecture + Plan via `read_document`, then `list_tasks({ featureId })` to get every task's artifacts (commits + files + PR).
- For each non-empty `files` artifact, it should `Read` the file so the "code tour" section names real paths and references the actual implementation, not the planned design.
- It calls `create_document` with `stage: "walkthrough"`, `dependsOn: [<planId>]`, `basedOn: { <planId>: <planVersion> }`.

Verify on disk:

```bash
ls .claude/specs/features/<slug>/walkthrough/
cat .claude/specs/features/<slug>/walkthrough/*.md
```

Pass criteria for the walkthrough body:

- [ ] Has sections covering *What shipped*, *How it works*, *Code tour*, *Tests*, *Known limitations / follow-ups*.
- [ ] Names at least one real file path from a task's `artifacts.files`. (Audit: open `tasks.json`, pick one of the files, grep for it in the walkthrough.)
- [ ] If any task has commits, those commit refs appear somewhere in the doc.

### 4.9 Live update sanity

Open the board in two browser tabs side by side. In one tab, open the Build panel and flip a task to `in_progress`. Confirm the other tab's Build cell updates live (progress bar) without a reload — that's the `task.updated` WS event broadcasting.

## 5. Pass criteria (all required)

- [ ] `npm run selftest-board` includes the new task assertions and reports `walkthrough gate opens when all tasks done`.
- [ ] Clicking the Build cell opens a task panel listing all tasks for that feature.
- [ ] Status pills update tasks via PATCH; on-disk `tasks.json` reflects the change.
- [ ] Artifacts (commits, files, PR) round-trip: input in UI → on disk → re-rendered on reload.
- [ ] WS `task.updated` event keeps multiple board tabs in sync without manual reload.
- [ ] `/specmanager-walkthrough` refuses while any task is undone.
- [ ] `/specmanager-walkthrough` succeeds once all tasks are done; the resulting doc names real file paths from task artifacts.
- [ ] `git status` shows changes only inside `.claude/specs/` and `CLAUDE.md`.

## 6. Troubleshooting

- **Build panel shows "no tasks yet" but `tasks.json` exists** — check that the file path is `.claude/specs/features/<slug>/plan/tasks.json` exactly. If `tasks.json` is at a different path (e.g. directly under the feature dir), it was hand-written outside the MCP tools and the loader silently skips it. Move it or recreate via `/specmanager-plan`.
- **Status pill click does nothing** — open devtools Network and look for a `PATCH /api/features/.../tasks/...` request. A 404 means the task id isn't being persisted under the feature you think it is.
- **Walkthrough writer ignores `files` artifacts** — that's a subagent grounding regression. Confirm `agents/walkthrough-writer.md` is installed in the active plugin cache (`ls ~/.claude/plugins/cache/specmanager/specmanager/<commit>/agents`). Reinstall if missing.

## 7. Teardown

Walkthroughs are part of the spec history — commit them.

```bash
git add CLAUDE.md .claude/
git diff --staged --stat
```
