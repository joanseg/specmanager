# Prompt simplification — removal ledger

Feature `feat-agent-prompt-simplification-opus-5-5`. Every rule-bearing cut (C2, C3, C5) gets a row naming its surviving carrier; C1/C4 spans are logged as one row per file with a word count. Taxonomy and Keep-list: `arch-agent-prompt-simplification-opus-5-5-029`.

## Header

- **Baseline sha:** `ad11cd8` (the 19 files and `selftest-prompts.ts` are identical at `181a9b1`, a spec-only commit).
- **Word count:** `wc -w` per file over the 19 files below, summed.
- **Don't/Never count (the pinned rule, resolves Arch Q-C):** per file `grep -cE '^\s*-\s*(\*\*)?(Don.t|Never)' <file>`, summed over the 19 files.
- **Reproduce at baseline:** `for f in <19 files>; do git show ad11cd8:$f | wc -w; git show ad11cd8:$f | grep -cE '^\s*-\s*(\*\*)?(Don.t|Never)'; done`

| Totals | Words | Don't/Never lines | C2/C3/C5 rows with a carrier |
|---|---|---|---|
| Before (`ad11cd8`) | 16,248 | 71 | — |
| After | _filled by task-022_ | _filled by task-022_ | _must be 100%_ |

### Per-file baseline

| File | Words before | Don't/Never before | Words after | Don't/Never after |
|---|---|---|---|---|
| `agents/architect.md` | 892 | 4 | | |
| `agents/builder.md` | 1173 | 5 | | |
| `agents/designer.md` | 1195 | 6 | | |
| `agents/planner.md` | 1905 | 5 | | |
| `agents/prd-writer.md` | 448 | 4 | 421 | 4 |
| `agents/reviewer.md` | 552 | 0 | | |
| `agents/walkthrough-writer.md` | 1508 | 7 | | |
| `commands/specmanager-architecture.md` | 188 | 1 | | |
| `commands/specmanager-board.md` | 110 | 1 | | |
| `commands/specmanager-build.md` | 2683 | 13 | | |
| `commands/specmanager-design.md` | 416 | 2 | | |
| `commands/specmanager-init.md` | 884 | 4 | | |
| `commands/specmanager-interview.md` | 1031 | 5 | | |
| `commands/specmanager-loop.md` | 1501 | 5 | | |
| `commands/specmanager-plan.md` | 633 | 4 | | |
| `commands/specmanager-prd.md` | 304 | 3 | | |
| `commands/specmanager-walkthrough.md` | 459 | 2 | | |
| `docs/agent-snippets/design-grounding.md` | 173 | 0 | | |
| `docs/agent-snippets/lossless-carryover.md` | 193 | 0 | | |
| **Total** | **16,248** | **71** | | |

### INV snapshot at baseline

52 ids, 77 rows (`npm run selftest-prompts` at `ad11cd8`: "All prompt invariant assertions passed (77 invariants checked: match + mutation)"). `min` never moves; `max` is lowered to the post-trim count by the task that touches the row.

| INV | min | max | got | Per-file counts |
|---|---|---|---|---|
| INV-1 | 4 | 8 | 8 | agents/builder.md:1, agents/walkthrough-writer.md:3, commands/specmanager-build.md:2, commands/specmanager-walkthrough.md:2 |
| INV-2 | 2 | 4 | 4 | commands/specmanager-build.md:4 |
| INV-3 | 1 | 1 | 1 | agents/builder.md:1 |
| INV-4 | 2 | 7 | 7 | commands/specmanager-build.md:7 |
| INV-5 | 1 | 1 | 1 | commands/specmanager-build.md:1 |
| INV-6 | 2 | 2 | 2 | agents/builder.md:1, commands/specmanager-build.md:1 |
| INV-7 | 2 | 3 | 3 | commands/specmanager-build.md:2, agents/builder.md:1 |
| INV-8 | 2 | 3 | 3 | agents/reviewer.md:2, commands/specmanager-build.md:1 |
| INV-9 | 1 | 1 | 1 | commands/specmanager-build.md:1 |
| INV-10 | 1 | 2 | 2 | agents/planner.md:2 |
| INV-11 | 4 | 9 | 9 | agents/architect.md:3, agents/planner.md:2, agents/designer.md:3, agents/walkthrough-writer.md:1 |
| INV-12 | 1 | 1 | 1 | commands/specmanager-build.md:1 |
| INV-13 | 4 | 4 | 4 | agents/architect.md:1, agents/planner.md:1, agents/prd-writer.md:1, agents/walkthrough-writer.md:1 |
| INV-14a | 1 | 1 | 1 | agents/designer.md:1 |
| INV-14b | 1 | 1 | 1 | agents/designer.md:1 |
| INV-14c | 1 | 1 | 1 | agents/designer.md:1 |
| INV-14d | 1 | 1 | 1 | agents/designer.md:1 |
| INV-14e | 1 | 1 | 1 | agents/designer.md:1 |
| INV-15a | 3 | 3 | 3 | agents/architect.md:1, agents/planner.md:1, agents/builder.md:1 |
| INV-15b | 0 | 0 | 0 | ../../docs/agent-snippets/design-grounding.md:0, agents/architect.md:0, agents/planner.md:0, agents/builder.md:0 |
| INV-16 | 4 | 5 | 5 | commands/specmanager-architecture.md:1, commands/specmanager-design.md:1, commands/specmanager-plan.md:1, commands/specmanager-build.md:1, commands/specmanager-walkthrough.md:1 |
| INV-17 | 1 | 1 | 1 | agents/builder.md:1 |
| INV-18 | 1 | 1 | 1 | agents/builder.md:1 |
| INV-19 | 2 | 5 | 5 | agents/builder.md:4, commands/specmanager-build.md:1 |
| INV-20 | 1 | 1 | 1 | agents/builder.md:1 |
| INV-21 | 3 | 3 | 3 | agents/builder.md:1, commands/specmanager-build.md:2 |
| INV-22 | 1 | 1 | 1 | agents/reviewer.md:1 |
| INV-23 | 2 | 4 | 4 | agents/reviewer.md:2, commands/specmanager-build.md:2 |
| INV-24 | 1 | 1 | 1 | agents/reviewer.md:1 |
| INV-25 | 8 | 10 | 10 | agents/prd-writer.md:1, agents/architect.md:1, agents/designer.md:1, agents/planner.md:1, agents/builder.md:1, agents/walkthrough-writer.md:1, commands/specmanager-build.md:1, commands/specmanager-walkthrough.md:1, commands/specmanager-prd.md:2 |
| INV-26 | 1 | 1 | 1 | agents/builder.md:1 |
| INV-27a | 1 | 1 | 1 | agents/architect.md:1 |
| INV-27b | 1 | 1 | 1 | agents/architect.md:1 |
| INV-27c | 1 | 1 | 1 | agents/architect.md:1 |
| INV-28 | 1 | 1 | 1 | agents/architect.md:1 |
| INV-29 | 4 | 4 | 4 | agents/architect.md:1, agents/planner.md:1, agents/prd-writer.md:1, agents/walkthrough-writer.md:1 |
| INV-30 | 2 | 2 | 2 | agents/prd-writer.md:1, agents/architect.md:1 |
| INV-31 | 1 | 1 | 1 | agents/builder.md:1 |
| INV-32 | 1 | 2 | 2 | commands/specmanager-build.md:2 |
| INV-33 | 1 | 1 | 1 | commands/specmanager-build.md:1 |
| INV-34 | 1 | 1 | 1 | commands/specmanager-build.md:1 |
| INV-35 | 1 | 1 | 1 | agents/architect.md:1 |
| INV-36a | 2 | 2 | 2 | agents/builder.md:1, agents/designer.md:1 |
| INV-36b | 2 | 2 | 2 | agents/builder.md:2, agents/designer.md:0 |
| INV-37 | 2 | 4 | 4 | agents/designer.md:3, agents/builder.md:1 |
| INV-38 | 1 | 1 | 1 | commands/specmanager-loop.md:1 |
| INV-39 | 4 | 4 | 4 | commands/specmanager-loop.md:4 |
| INV-40 | 1 | 1 | 1 | commands/specmanager-loop.md:1 |
| INV-41 | 1 | 4 | 4 | commands/specmanager-loop.md:4 |
| INV-42 | 0 | 0 | 0 | commands/specmanager-loop.md:0 |
| INV-43 | 1 | 2 | 2 | commands/specmanager-loop.md:2 |
| INV-44 | 1 | 1 | 1 | agents/planner.md:1 |
| INV-45a | 1 | 1 | 1 | agents/planner.md:1 |
| INV-45b | 1 | 1 | 1 | agents/planner.md:1 |
| INV-45c | 1 | 1 | 1 | agents/planner.md:1 |
| INV-46a | 2 | 2 | 2 | agents/planner.md:2 |
| INV-46b | 1 | 1 | 1 | commands/specmanager-loop.md:1 |
| INV-47a | 1 | 1 | 1 | commands/specmanager-build.md:1 |
| INV-47b | 1 | 1 | 1 | commands/specmanager-build.md:1 |
| INV-48a | 1 | 1 | 1 | commands/specmanager-build.md:1 |
| INV-48b | 1 | 1 | 1 | commands/specmanager-build.md:1 |
| INV-48c | 2 | 2 | 2 | agents/planner.md:2 |
| INV-49a | 1 | 1 | 1 | agents/reviewer.md:1 |
| INV-49b | 1 | 1 | 1 | agents/reviewer.md:1 |
| INV-50a | 1 | 1 | 1 | agents/walkthrough-writer.md:1 |
| INV-50b | 1 | 1 | 1 | agents/walkthrough-writer.md:1 |
| INV-50c | 1 | 1 | 1 | agents/walkthrough-writer.md:1 |
| INV-50d | 1 | 1 | 1 | agents/walkthrough-writer.md:1 |
| INV-50e | 1 | 1 | 1 | agents/walkthrough-writer.md:1 |
| INV-51a | 1 | 1 | 1 | commands/specmanager-build.md:1 |
| INV-51b | 1 | 1 | 1 | commands/specmanager-build.md:1 |
| INV-51c | 1 | 1 | 1 | commands/specmanager-build.md:1 |
| INV-51d | 1 | 1 | 1 | commands/specmanager-build.md:1 |
| INV-51e | 1 | 1 | 1 | commands/specmanager-build.md:1 |
| INV-51f | 1 | 1 | 1 | commands/specmanager-build.md:1 |
| INV-52a | 1 | 1 | 1 | agents/builder.md:1 |
| INV-52b | 1 | 1 | 1 | agents/builder.md:1 |

## Removals per file

Columns as below. C1/C4 spans: one row per file with a word count.

### `agents/architect.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|

### `agents/builder.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|

### `agents/designer.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|

### `agents/planner.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|

### `agents/prd-writer.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|
| 1 | "Your job is to produce a high-signal PRD draft and persist it." | C2 | `agents/prd-writer.md` § How to write it, step 5 (persist with `create_document`) | — | — |
| 2 | C1 explanation tails: "— the frontmatter carries it." (step 4), "— that's the architect's job." and "— the user owns approval." (Don't); 16 words by `wc -w` | C1 | None: each instruction stays verbatim; the tails only explain it | INV-25 (count unchanged, 1) | 10→10 |

Kept (Keep-list / plan 1.3): "Keep it tight. Target ≤250 lines" (has a number), "Report the new document id" (the command relies on it), the interview `dependsOn` exclusion and its reason (no `core` guard rejects an interview in `dependsOn`; `core/dependencies.ts` only filters it from the graph, so the prompt stays the carrier), the density contract (INV-13/29), "outside `.claude/specs/`" (INV-30). Words 448→421 (−27); Don't/Never 4→4. INV-13, -25, -29, -30 counts unchanged, so no `max` moves.

### `agents/reviewer.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|

### `agents/walkthrough-writer.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|

### `commands/specmanager-architecture.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|

### `commands/specmanager-board.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|

### `commands/specmanager-build.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|

### `commands/specmanager-design.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|

### `commands/specmanager-init.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|

### `commands/specmanager-interview.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|

### `commands/specmanager-loop.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|

### `commands/specmanager-plan.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|

### `commands/specmanager-prd.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|

### `commands/specmanager-walkthrough.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|

### `docs/agent-snippets/design-grounding.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|

### `docs/agent-snippets/lossless-carryover.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|

## Frontmatter decisions (G2)

| Agent | Today | Decision | Evidence |
|---|---|---|---|
| prd-writer, architect, designer, planner, walkthrough-writer | `model: inherit`, no `tools` (inherit all) | No change | Arch G2: restricting tools risks breaking MCP access |
| builder | `model: inherit`, explicit `tools:` allowlist with no `Skill` | Conditional on the Q-A probe | _filled by task-020_ |
| reviewer | `model: opus`, `disallowedTools` denylist | Keep the `opus` pin (PRD Q3) | `commands/specmanager-build.md` 7b; `docs/verification/reviewer-disallowedtools.md` |
| all | no `effort` | Leave unset (PRD Q2) | Revisit only if the G4 dogfood shows a defect `effort` addresses |

## Verification results

_Filled by task-021._
