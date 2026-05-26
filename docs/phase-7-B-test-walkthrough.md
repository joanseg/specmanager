# Phase 7.B — Test walkthrough

End-to-end test of the **phased build loop**: `/specmanager-execute` drives one phase via the `builder` subagent (records artifacts, stops at the phase boundary), and `/specmanager-walkthrough <feature> <phase>` writes a per-phase walkthrough that gates on **that phase's** tasks being done.

> Exit criterion (from `docs/phase-7-execute-and-phased-plans.md`, Phase 7.B):
> With an approved phased Plan, `/specmanager-execute <feature> next` spawns the builder; builder reads `get_next_phase`, works that phase's tasks in `dependsOn` order, marks each `in_progress` → `done` with real commit/file artifacts, stops at the phase boundary; `/specmanager-walkthrough <feature> X` opens because Phase X is done, writes `walkthroughs/<slug>/phase-x.md` scoped to Phase X's artifacts. Phase Y's walkthrough gate stays closed.

Assumes Phases 1–7.A already pass.

## 0. Prerequisites

- A repo where SpecManager Phase 7.A already works.
- No new env vars or external services needed.
- Phase 7.B does NOT include any UI work — phase grouping in the board ships in Phase 7.C.

## 1. Build (contributors only)

```bash
cd plugins/specmanager/server
npm install
npm run build
npm run selftest          # Phase 1 core flow (still green)
npm run selftest-phases   # Phase 7.A — phased schema + Fibonacci (still green)
npm run selftest-execute  # Phase 7.B — 24 new assertions
npm run selftest-board    # Phase 2–5 REST + WS + tasks (still green)
npm run smoke-mcp         # MCP wire protocol
```

Every selftest should report "All … assertions passed." If `selftest-execute` fails on `missingArtifact code`, the `update_task` artifact discipline didn't land — check `core/tasks.ts` for `MissingArtifactError`.

## 2. Install + reload the plugin in your test repo

```
/plugin marketplace update specmanager
/plugin uninstall specmanager
/plugin install specmanager@specmanager
/reload-plugins
```

## 3. Phase 7.B exit checks

### 3.1 New command is registered

```
/specmanager-execute
```

Expected: Claude lists `/specmanager-execute` as an available command. Calling it without arguments should ask for `<feature> <phaseName | "next">`.

### 3.2 The builder subagent exists

```
ls plugins/specmanager/agents/
```

Expected: `architect.md  builder.md  planner.md  prd-writer.md  walkthrough-writer.md`.

### 3.3 Per-phase walkthrough gate

In the Claude session, against a feature with two phases A, B and approved Plan:

```
check_gate featureId=<id> stage="walkthrough" phase="A"
```

Expected: `ok: false` while Phase A has open tasks.

After completing Phase A's tasks (with real artifacts):

```
check_gate featureId=<id> stage="walkthrough" phase="A"
```

Expected: `ok: true`.

```
check_gate featureId=<id> stage="walkthrough" phase="B"
```

Expected: `ok: false` until Phase B is also done.

```
check_gate featureId=<id> stage="walkthrough" phase="final"
```

Expected: `ok: false, reason: "final walkthrough is reserved for Phase 7.C and not yet available"`.

### 3.4 Artifact discipline at `update_task`

Try to mark a task `done` with no artifacts:

```
update_task id=<task> featureId=<id> status="done"
```

Expected: `ok: false` with an error message containing `missingArtifact` and `at least one commit or file ref`. The task is **not** transitioned.

With artifacts:

```
update_task id=<task> featureId=<id> status="done" artifacts='{"commits":["abc1234"],"files":["src/foo.ts"]}'
```

Expected: `ok: true` with `status: "done"`.

### 3.5 Execute drives one phase, stops at the boundary

With a two-phase plan approved:

```
/specmanager-execute <feature> next
```

Expected:
- Builder subagent runs.
- Every task in Phase A gets marked `in_progress` → `done` with real commits/files.
- After the last task of Phase A, the builder reports `Phase A complete — ready for walkthrough` and **stops**. It does NOT touch Phase B.
- The report ends with the suggestion `/specmanager-walkthrough <feature> A`.

Verify:

```
list_tasks featureId=<id>
```

Phase A tasks are `done`, Phase B tasks are still `todo`.

### 3.6 Per-phase walkthrough lands at `phase-<name>.md`

```
/specmanager-walkthrough <feature> A
```

Expected:
- Gate opens, walkthrough-writer subagent runs.
- New doc lands at `.claude/specs/features/<slug>/walkthroughs/phase-a.md`.
- Frontmatter has `phase: A`.
- Body references only Phase A's task artifacts (commits, files) — not Phase B's.

```bash
ls .claude/specs/features/<slug>/walkthroughs/
```

Expected: `phase-a.md` (and nothing else yet — `feature.md` is reserved for 7.C).

### 3.7 Phase B's walkthrough gate stays closed

```
/specmanager-walkthrough <feature> B
```

Expected: command refuses with the gate reason — Phase B has open tasks. No file is written.

### 3.8 Refuse out-of-order execute

With Phase A still incomplete, try:

```
/specmanager-execute <feature> B
```

Expected: refusal — "Phase A has open tasks — execute it first, or pass `--force`." The builder is not spawned.

### 3.9 Repeat for Phase B

After approving Phase A's walkthrough:

```
/specmanager-execute <feature> next
```

Expected: builder picks Phase B, drives its tasks to `done`, stops. Then:

```
/specmanager-walkthrough <feature> B
```

Writes `walkthroughs/<slug>/phase-b.md` scoped to B's artifacts.

```
get_next_phase featureId=<id>
```

Expected: `null` — every phase is done.

### 3.10 Manifest links walkthroughs to phases

```bash
cat .claude/specs/manifest.json | jq '.features[] | {id, phases}'
```

Expected: each `phases[]` entry now has `walkthroughId`, `walkthroughStatus` ("draft" or "approved"), `walkthroughStale` (boolean or null) populated for the phases whose walkthrough exists.

### 3.11 Legacy per-feature walkthrough migration

In a repo that already has a Phase 1–6 feature whose walkthrough was written as `<slug>-walkthrough.md` (the old layout):

```
/specmanager-init
```

Expected: the legacy file is **renamed** to `walkthroughs/<slug>/phase-default.md`, and its frontmatter gets `phase: default` stamped in. The body and metadata are preserved.

```bash
diff <(grep -v "^updatedAt" .claude/specs/features/<slug>/walkthroughs/phase-default.md) \
     <(git show HEAD:.claude/specs/features/<slug>/walkthroughs/<old-name>.md | grep -v "^updatedAt")
```

Expected: the body is identical. Only `updatedAt` and the new `phase` field differ.

Re-running `/specmanager-init` is a no-op (migration is idempotent).

### 3.12 REST gate accepts the phase query

```bash
curl -s "http://127.0.0.1:4317/api/features/<id>/gate?stage=walkthrough&phase=A"
```

Expected: `{ "ok": true | false, "reason"?: "..." }` scoped to Phase A.

## 4. Out of scope for 7.B

These ship in **Phase 7.C** and should NOT work yet:

- Board UI showing phases as collapsible headers in the Build column.
- One walkthrough card per phase in the Walkthrough column.
- A "final" feature-level walkthrough (`/specmanager-walkthrough <feature> final` is reserved and refuses today).
- An "Execute next phase" button on the board.

If any of those *do* work, scope crept across the phase boundary — file it.

## 5. Cleanup

```bash
rm -rf .claude/specs/features/<scratch-slug>
```

(Or keep the feature around to seed Phase 7.C manual testing.)
