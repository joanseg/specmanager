# Pre-trim baseline measurement (task-003 / plan row 1.3)

`feat-opus-5-readiness`, `inventory` phase. Re-runs the Architecture's
(`arch-opus-5-readiness-023`, "Baseline correction" section) `wc -w` +
`awk`-scoped `Don't`-bullet method, pinned to a single git commit so the
numbers are reproducible and immune to the other builders committing
concurrently in this phase (`task-001`, `task-009`, `task-010`).

**Measured at:** `cd0ea7267207f9006de749aa488a88321c4d1755`

All commands read blobs at that pinned sha via `git show <sha>:<path>` /
`git ls-tree -r --name-only <sha> -- <dir>` rather than the live working
tree, specifically because other builders were landing commits under
`agents/`/`docs/agent-snippets/` while this task ran.

## File set (16 prompt files: 7 agents + 9 commands)

```
$ git ls-tree -r --name-only <sha> -- plugins/specmanager/agents plugins/specmanager/commands | sort
```

7 files under `plugins/specmanager/agents/*.md`, 9 under
`plugins/specmanager/commands/*.md` — matches the Architecture's "16 files".

## Word counts

```
$ for f in <the 16 files>; do git show <sha>:$f | wc -w; done   # per file
```

| Metric | Command | Architecture's actual | Re-measured | Delta |
|---|---|---|---|---|
| `agents/` total words | `git show <sha>:<f> \| wc -w` summed over the 7 agent files | 7,402 | **7,425** | **+23** |
| `commands/` total words | same, summed over the 9 command files | 6,407 | **6,407** | 0 |
| `specmanager-build.md` words | `git show <sha>:plugins/specmanager/commands/specmanager-build.md \| wc -w` | 2,411 | **2,411** | 0 |

Per-file agent word counts at the pinned sha (for the `agents/` total):

| File | Words |
|---|---|
| `architect.md` | 1,085 |
| `builder.md` | 1,377 |
| `designer.md` | 1,280 |
| `planner.md` | 1,475 |
| `prd-writer.md` | 476 |
| `reviewer.md` | 492 |
| `walkthrough-writer.md` | 1,240 |
| **Total** | **7,425** |

### The +23 discrepancy is explained, not a fresh finding

`commands/` and `specmanager-build.md` match the Architecture's stated
actuals exactly. Only `agents/` is off, by +23 words, and the cause is
identifiable: task-009 (plan row 1.5, "propagate the corrected
design-grounding fragment into `agents/architect.md`") landed in commit
`c9c21f4` — a 1-line diff in `architect.md`'s design-grounding paragraph —
**before** this measurement's pinned sha but **after** the Architecture's
own baseline was taken. That single-line edit's word-count delta accounts
for the +23. This is in-scope, planned inventory-phase work (task-004 →
task-009), not drift the trim phase needs to reconcile — recorded here per
the "report the discrepancy rather than silently adopting either figure"
instruction, with the concrete cause attached rather than left as an
unexplained gap.

## `Don't`-bullet count (awk-scoped: list-item bullets only, not incidental prose uses of "don't")

```
$ git show <sha>:<f> | awk '/^- Don.t/{c++} END{print c+0}'
```

Scoped to lines that are markdown bullets starting `- Don't ` (i.e. an
actual `## Don't` list item), not every occurrence of the word — e.g.
`specmanager-build.md`'s "the active-build marker stays set so a re-entered
session resumes the phase. Don't retry." is prose inside a numbered step,
not a `Don't`-list bullet, and is correctly excluded.

| File | `Don't` bullets |
|---|---|
| `agents/architect.md` | 4 |
| `agents/builder.md` | 6 |
| `agents/designer.md` | 6 |
| `agents/planner.md` | 6 |
| `agents/prd-writer.md` | 4 |
| `agents/reviewer.md` | 4 |
| `agents/walkthrough-writer.md` | 7 |
| `commands/specmanager-architecture.md` | 2 |
| `commands/specmanager-board.md` | 1 |
| `commands/specmanager-build.md` | **19** |
| `commands/specmanager-design.md` | 3 |
| `commands/specmanager-init.md` | 4 |
| `commands/specmanager-interview.md` | 5 |
| `commands/specmanager-plan.md` | 3 |
| `commands/specmanager-prd.md` | 3 |
| `commands/specmanager-walkthrough.md` | 4 |
| **Total (16 files)** | **81** |

Matches the Architecture's stated actuals exactly: **81** total, **19** in
`specmanager-build.md`. These are the `max` values 1.8 encodes for the
`Don't`-bullet invariant(s).

## Registered selftest count

```
$ git show <sha>:plugins/specmanager/server/package.json | grep -n '"selftest'
```

11 scripts named `selftest-*` in `scripts`: `selftest`, `selftest-autoport`,
`selftest-board`, `selftest-phases`, `selftest-build`, `selftest-tiers`,
`selftest-stopgate`, `selftest-roundtrip`, `selftest-pidfile`,
`selftest-shutdown`, `selftest-repos`. Plus `smoke-mcp`, which the plan and
Architecture both count alongside the `selftest-*` scripts when they say
"12 registered" (e.g. the `trim` exit test's "14 = 12 registered today +
`selftest-specslice` + `selftest-prompts`"). 11 + `smoke-mcp` = **12**,
matching the Architecture's stated actual exactly.

## Summary vs. Architecture's stated actuals

| Metric | Architecture's actual | Re-measured (this task) | Match? |
|---|---|---|---|
| `agents/` words | 7,402 | 7,425 | Off by +23 — explained above (task-009 landed in between) |
| `commands/` words | 6,407 | 6,407 | Exact |
| `specmanager-build.md` words | 2,411 | 2,411 | Exact |
| `Don't` bullets, 16 files | 81 | 81 | Exact |
| `Don't` bullets, `build.md` | 19 | 19 | Exact |
| Registered selftests | 12 | 12 | Exact |

No target adjustment is warranted: four of five metrics reproduce exactly,
and the fifth reproduces the Architecture's own **method** exactly while
disagreeing with its **snapshot** by an amount fully attributable to a
since-landed, in-scope commit. These re-measured numbers (not the
Architecture's) are what 1.8 should encode as `max`, since they are current
as of this task's pinned sha.
