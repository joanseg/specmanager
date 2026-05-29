# Phase 7.A — Test walkthrough

End-to-end test of **phased plans**: the planner now organises tasks into named phases, every task carries a Fibonacci `complexity` score (≤3 enforced), and `core` exposes `list_phases` / `get_next_phase` for the upcoming `execute` command in 7.B.

> Exit criterion (from `docs/phase-7-execute-and-phased-plans.md`, Phase 7.A):
> Run `/specmanager-plan <feature>` against an approved architecture; the resulting `plan.md` contains a `## Phase <name> — <theme>` section per phase with an explicit `**Exit test:**`; every emitted task has `phase` + `complexity` set; no task has `complexity ≥ 5`; `list_phases({ featureId })` returns the phases in order. Legacy Phase 1–6 features keep working under a synthetic `"default"` phase.

Assumes Phases 1–6 already pass.

## 0. Prerequisites

- A repo where SpecManager Phase 1–6 already works (the existing selftests will tell you).
- No new env vars or external services needed — Phase 7.A is data-model + agent-prompt only.

## 1. Build (contributors only)

```bash
cd plugins/specmanager/server
npm install
npm run build
npm run selftest          # Phase 1 core flow (still green)
npm run selftest-phases   # Phase 7.A — 16 new assertions
npm run selftest-board    # Phase 2–5 REST + WS + tasks (still green)
npm run smoke-mcp         # confirms list_phases + get_next_phase registered
```

Expected: every selftest reports "All … assertions passed." If `selftest-phases` fails on `complexity 5 is rejected`, the schema/validation didn't land — check `core/tasks.ts` for `SplitRequiredError`.

## 2. Install + reload the plugin in your test repo

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
ps aux | grep specmanager | grep -v grep   # kill any leftovers (kill -9 <PID> if needed)
lsof -nP -iTCP:4317 -sTCP:LISTEN
cd /path/to/your/test/repo
claude
```

## 3. Phase 7.A exit checks

### 3.1 New MCP tools are registered

In the Claude session:

```
/mcp
```
If ❌failed, then slecte `reconnect` and click enter.

Expected: the `specmanager` server lists **`list_phases`** and **`get_next_phase`** alongside the existing tools.

Alternative: hit the headless smoke test directly.

```bash
cd plugins/specmanager/server
npm run smoke-mcp 2>&1 | grep -E "list_phases|get_next_phase"
```

Both names should appear.

### 3.2 Schema accepts `phase` + `complexity`; rejects ≥5

In the Claude session, use the MCP tools directly.

```
create_feature title="Sample 7A feature"
```

Note the returned `id` (e.g. `feat-sample-7a-feature`). Then:

```
create_task featureId=<id> title="A1" phase="A" complexity=2
create_task featureId=<id> title="A2" phase="A" complexity=3
create_task featureId=<id> title="B1" phase="B" complexity=1
```

Each returns `ok: true` with the task record echoing the `phase` and `complexity` you passed.

Now try a too-large task:

```
create_task featureId=<id> title="too big" phase="A" complexity=5
```

Expected: `ok: false` with an error message containing `splitRequired` and `exceeds max 3`. The task is **not** written to `tasks.json`.

Verify on disk:

```bash
cat .claude/specs/features/sample-7a-feature/plan/tasks.json
```

Expected: exactly three tasks (A1, A2, B1); each row has `"phase"` and `"complexity"` fields; no "too big" task is present.

### 3.3 Phase rollup in first-seen order

```
list_phases featureId=<id>
```

Expected payload:

```json
{
  "ok": true,
  "data": [
    { "name": "A", "order": 0, "taskCount": 2, "doneCount": 0, "inProgressCount": 0, "status": "todo" },
    { "name": "B", "order": 1, "taskCount": 1, "doneCount": 0, "inProgressCount": 0, "status": "todo" }
  ]
}
```

`order: 0` is **Phase A** because A's first task (`A1`) appears earlier in `tasks.json` than B's first task — first-seen order, not alphabetical.

### 3.4 `get_next_phase` advances as tasks complete

```
get_next_phase featureId=<id>
```

Returns `{ "name": "A", … }`. Now complete Phase A:

```
update_task id=<A1 id> feat-sample-7a-feature status="done"
update_task id=<A2 id> feat-sample-7a-feature status="done"
```

Re-check:

```
get_next_phase eat-sample-7a-feature
```

Expected: `{ "name": "B", … }`.

Complete Phase B:

```
update_task task-003 feat-sample-7a-feature status="done"
get_next_phase featureId=<id>
```

Expected: `{ "ok": true, "data": null }`. No next phase — every phase is `done`.

### 3.5 Manifest cache includes the rollup

```bash
cat .claude/specs/manifest.json | head -60
```

Expected: the feature's entry has a `"phases"` array alongside the existing `"tasks"` counts:

```json
{
  "id": "feat-sample-7a-feature",
  "...": "...",
  "tasks": { "todo": 0, "in_progress": 0, "done": 3, "total": 3 },
  "phases": [
    { "name": "A", "order": 0, "taskCount": 2, "doneCount": 2, "status": "done" },
    { "name": "B", "order": 1, "taskCount": 1, "doneCount": 1, "status": "done" }
  ]
}
```

If the rollup is missing, the manifest wasn't refreshed — the MCP `create_task`/`update_task` handlers should call `writeManifest` after each mutation.

### 3.6 Legacy back-compat

In a repo that already has a Phase 1–6 feature whose `tasks.json` predates this work, do **not** modify the file. Just read it:

```
list_tasks featureId=<legacy id>
list_phases featureId=<legacy id>
```

Expected on `list_tasks`: every task carries `"phase": "default"` and `"complexity": null`.
Expected on `list_phases`: a single entry `{ "name": "default", "order": 0, ... }`.

The on-disk file is **not** rewritten — the defaults are applied on read.

```bash
diff <(cat .claude/specs/features/<legacy-slug>/plan/tasks.json) <(git show HEAD:.claude/specs/features/<legacy-slug>/plan/tasks.json)
```

Expected: no diff.

### 3.7 Planner agent emits phased plans

In a repo where a feature has an **approved Architecture**:

```
/specmanager-plan <featureId or slug>
```

Open the resulting `plan.md` on the board (or `cat .claude/specs/features/<slug>/plan/plan.md`).

Expected structure:

- One `## Phase <name> — <theme>` heading per phase (exact shape — the upcoming builder agent in 7.B parses this).
- Each phase section starts with a line like `**Exit test:** …`.
- A per-phase task table with columns `# | Task | Pts | Notes`.
- Every `Pts` value in the table is `1`, `2`, or `3` — no `5` / `8` / `13`.

And in `tasks.json`:

```bash
jq '.tasks | map({title, phase, complexity}) | .[0:5]' \
  .claude/specs/features/<slug>/plan/tasks.json
```

Every entry has a non-empty `phase` matching a heading in `plan.md`, and a `complexity` of 1, 2, or 3.

If the planner emits a task scored ≥5 and tries to persist it, the MCP server rejects it with `splitRequired` and the agent must re-split before retrying. (The planner prompt also instructs it to self-check first, so the rejection path should be rare.)

### 3.8 REST endpoint accepts the new fields

```bash
curl -s -X POST http://127.0.0.1:4317/api/features/<id>/tasks \
  -H 'content-type: application/json' \
  -d '{"title":"via REST","phase":"A","complexity":2}'
```

Expected: 200 with the task record including the fields you sent.

And a rejection:

```bash
curl -s -X POST http://127.0.0.1:4317/api/features/<id>/tasks \
  -H 'content-type: application/json' \
  -d '{"title":"too big via REST","phase":"A","complexity":8}'
```

Expected: 400 with `{"error": "task complexity 8 exceeds max 3 …"}`.

## 4. Out of scope for 7.A

The following are **planned for Phase 7.B** and should NOT work yet:

- `/specmanager-execute` — the command and `builder` subagent ship in 7.B.
- Per-phase walkthrough gating (`check_gate({ stage: "walkthrough", phase: "A" })`) — still uses the Phase 5 "all tasks done" rule until 7.B.
- Board UI showing phase headers in the Build column — UI work is Phase 7.C.

If any of those *do* work, scope crept across the phase boundary — file it.

## 5. Cleanup

```bash
rm -rf .claude/specs/features/sample-7a-feature
```

(Or keep it around to seed manual testing for Phase 7.B.)
