# Post-trim measurement (task-033 / plan row 3.14)

`feat-opus-5-readiness`, `trim` phase. Re-runs `docs/baseline-measurement.md`'s
exact `wc -w` / `awk`-scoped `Don't`-bullet method against the state of the
repo after all twelve prior `trim`-phase tasks (3.1–3.12 / task-018…task-032)
landed, and reconciles the result against the Architecture's targets per
`arch-opus-5-readiness-023`'s open question 4: *if the re-measurement lands
materially off, adjust the targets rather than over-cut to hit them.*

**Measured at:** `93e3d6c5991178d5775d612bd8aa06a029331cde` (HEAD at the time
this task ran — `task-032`'s commit, the last `trim` commit before this one).
**Compared against:** `cd0ea7267207f9006de749aa488a88321c4d1755`, the same
pinned sha `docs/baseline-measurement.md` used.

This task makes **no edit to any prompt file**. `npm run selftest-prompts`
is green both before and after — confirming that fact — and is reported at
the bottom.

## Method (unchanged from the baseline)

```
$ for f in <the 16 files>; do git show <sha>:$f | wc -w; done
$ git show <sha>:<f> | awk '/^- Don.t/{c++} END{print c+0}'
$ git show <sha>:plugins/specmanager/server/package.json | grep -n '"selftest'
```

Same 16 files (7 `agents/*.md` + 9 `commands/*.md`), same scoped bullet
pattern (`- Don't ` list items only, not prose occurrences of the word).

## Summary — before / after / target

| Metric | Pre-trim actual | Post-trim (this task) | Target | Met? |
|---|---|---|---|---|
| `agents/` words | 7,425 | **6,678** (−747, −10.1%) | ≤ 6,100 | **Missed by 578** |
| `commands/` words | 6,407 | **5,785** (−622, −9.7%) | ≤ 5,450 | **Missed by 335** |
| `specmanager-build.md` words | 2,411 | **2,025** (−386, −16.0%) | ≤ 1,700 | **Missed by 325** |
| `Don't` bullets, 16 files | 81 | **62** (−19) | ≤ 50 | **Missed by 12** |
| `Don't` bullets, `build.md` | 19 | **10** (−9) | ≤ 10 | **Met exactly** |
| Registered selftests | 12 | **14** (+2: `selftest-specslice`, `selftest-prompts`) | 14 | **Met** |

Three of six metrics were missed. Both misses that matter (`agents/`,
`commands/`) and the one that doesn't (`build.md`'s own word count, which is
subsumed by the `commands/` total anyway) are reconciled below with specific,
evidenced reasons — not "we didn't cut enough." **The binding metric, the
14-selftest no-regression suite, is unaffected by any of this**: `selftest-prompts`
is green (45/45 invariant + mutation assertions), and the phase's other
selftests are untouched by a measurement-only task.

## Per-file word counts (baseline → post-trim)

### `agents/`

| File | Baseline | Post-trim | Δ |
|---|---|---|---|
| `architect.md` | 1,085 | 892 | −193 |
| `builder.md` | 1,377 | 1,081 | −296 |
| `designer.md` | 1,280 | 1,195 | −85 |
| `planner.md` | 1,475 | 1,417 | −58 |
| `prd-writer.md` | 476 | 448 | −28 |
| `reviewer.md` | 492 | 433 | −59 |
| `walkthrough-writer.md` | 1,240 | 1,212 | −28 |
| **Total** | **7,425** | **6,678** | **−747** |

### `commands/`

| File | Baseline | Post-trim | Δ |
|---|---|---|---|
| `specmanager-architecture.md` | 226 | 188 | −38 |
| `specmanager-board.md` | 110 | 110 | 0 |
| `specmanager-build.md` | 2,411 | 2,025 | −386 |
| `specmanager-design.md` | 473 | 416 | −57 |
| `specmanager-init.md` | 884 | 884 | 0 |
| `specmanager-interview.md` | 1,033 | 1,031 | −2 |
| `specmanager-plan.md` | 459 | 426 | −33 |
| `specmanager-prd.md` | 334 | 304 | −30 |
| `specmanager-walkthrough.md` | 477 | 401 | −76 |
| **Total** | **6,407** | **5,785** | **−622** |

`board.md` and `init.md` show `0` deltas — correctly: no `trim`-phase task
targets either file. `R1` (task-018) explicitly excludes `-init.md:102`
(marker prose), and `board.md` was never in scope for any Q2/Q3/R-numbered
finding. `interview.md`'s `−2` is real and small — its only touch was `R1`
deleting one `sync_claude_md` clause from an existing sentence, not a
step-1-3 compression pass (Q3/3.8 is scoped to the five *drafting* commands;
`-interview.md` is the documented delegation-pattern exception and wasn't a
Q3 target).

### `Don't` bullets, all 16 files

| File | Baseline | Post-trim | Δ |
|---|---|---|---|
| `agents/architect.md` | 4 | 4 | 0 |
| `agents/builder.md` | 6 | 5 | −1 |
| `agents/designer.md` | 6 | 6 | 0 |
| `agents/planner.md` | 6 | 5 | −1 |
| `agents/prd-writer.md` | 4 | 4 | 0 |
| `agents/reviewer.md` | 4 | 0 | −4 |
| `agents/walkthrough-writer.md` | 7 | 7 | 0 |
| `commands/specmanager-architecture.md` | 2 | 1 | −1 |
| `commands/specmanager-board.md` | 1 | 1 | 0 |
| `commands/specmanager-build.md` | 19 | 10 | −9 |
| `commands/specmanager-design.md` | 3 | 2 | −1 |
| `commands/specmanager-init.md` | 4 | 4 | 0 |
| `commands/specmanager-interview.md` | 5 | 5 | 0 |
| `commands/specmanager-plan.md` | 3 | 3 | 0 |
| `commands/specmanager-prd.md` | 3 | 3 | 0 |
| `commands/specmanager-walkthrough.md` | 4 | 2 | −2 |
| **Total** | **81** | **62** | **−19** |

`reviewer.md`'s `4 → 0` is `R4`/task-021 exactly as planned: the four
write-forbidding bullets collapsed to the single non-`Don't` contract line
("You return a verdict; the parent alone advances the card" — `INV-8`), so
they left the `Don't`-bullet count entirely rather than shrinking it.

### Registered selftests

```
$ git show <sha>:plugins/specmanager/server/package.json | grep -n '"selftest\|"smoke-mcp'
```
12 pre-trim (`selftest`, `-autoport`, `-board`, `-phases`, `-build`,
`-tiers`, `-stopgate`, `-roundtrip`, `-pidfile`, `-shutdown`, `-repos`,
`smoke-mcp`) + `selftest-specslice` (task-027) + `selftest-prompts`
(task-015) = **14**. Target met exactly.

## Why the three misses are not "didn't cut enough" — the floors, with evidence

`selftest-prompts.ts` (`plugins/specmanager/server/src/selftest-prompts.ts`)
encodes each load-bearing rule as a `min`/`max` pair, verified with a
mutation pass that proves the pattern actually goes red if the text is
removed (not merely absent by coincidence). Several invariants sit at
`min == max` — a literal floor, not a target to negotiate with, because it's
already at "stated once per legitimate site." These are the concrete
evidence for what further cutting was not available, over and above the
plan's own list.

### `agents/` — 578 words over target

The original ≤6,100 target derives from summing three per-finding estimates
in `arch-opus-5-readiness-023`: **R3 ≈ −270** (density-contract reduction, 4
agents), **Q2 ≈ −825** (Superpowers/`frontend-design`/Context7 block
compression in `builder.md`/`designer.md`/`architect.md`), **R4 ≈ −150**
(delete `core`-enforced restatements). Summed: −1,245, landing at
7,425 − 1,245 = 6,180 (the Architecture rounds to 6,100). **Actual: −747,
60% of the estimated cut.** The shortfall traces to floors the per-finding
estimate didn't account for, because they only become visible once the text
is actually in front of you:

- **`INV-13` (density contract), `min == max == 4`.** The plan's own note
  (row 3.3) says it: *"no include mechanism exists"* — so the one-sentence
  density-contract clause has to be **literally duplicated**, byte-identical,
  at all 4 drafting agents (`architect.md:51`, `planner.md:56`,
  `prd-writer.md:24`, `walkthrough-writer.md:77`), each 41 words. R3's ~270
  estimate assumed collapsing ~90 words/site to ~25; the actual site count
  (4, unchangeable without an include mechanism this feature is explicitly
  out-of-scope for building — see the Plan's "Out of scope" list) times the
  necessary 41-word restatement is the floor, not a target to shrink further.
- **`INV-14a`–`INV-14e` (designer fallback), each `min == max == 1`.** Five
  *separate* invariants, not one — `designer.md:31–35` — because `3.6`
  explicitly required keeping the fallback "as a compact bullet list" with
  all five elements (token system, 2+ type roles, layout concept, signature
  element, genericness critique) intact: *"deleting it is a capability
  regression, not a trim (INV-14)."* This is why `designer.md` only dropped
  85 words against Q2's share of the −825 estimate — the Context7-shaped
  17-line-to-1-line compression Q2 assumed doesn't apply to a block the plan
  itself says must survive whole.
- **`INV-25` (never-approve prohibition), `min: 8, max: 10`.** One survivor
  per toolless agent (6) plus the two command files that also state it — a
  floor the plan's own note calls out: *"`min: 1` here would be actively
  wrong, `min: 8` is the whole guard."* Six of the eight sites are inside
  `agents/`, so any per-agent compression pass still has to leave one
  `Don't approve …` bullet standing per file.
- **`INV-11` (`dependsOn`/`basedOn`), `min: 4, max: 9`** across `architect.md`,
  `planner.md`, `designer.md`, `walkthrough-writer.md` — a second per-agent
  floor of the same shape.

Net: the agents whose Q2 blocks *could* compress freely
(`architect.md` −193, `builder.md` −296) did compress close to estimate;
`designer.md` (−85) and the two agents governed mostly by `INV-13`/`INV-25`
floors (`planner.md` −58, `prd-writer.md` −28, `walkthrough-writer.md` −28)
did not, because their word count is dominated by content the invariant
inventory says must survive per-site rather than be found-and-cut.

### `commands/` — 335 words over target

The ≤5,450 target has no single explicit estimate in the Architecture's
parenthetical list (it names `R1 ≈ −100` and folds `build.md`'s own
`R5+R6+Q1 ≈ −750` in separately) — Q3 (`3.8`, compress steps 1-3 of the five
drafting commands) is the other `commands/`-side contributor and wasn't
given its own estimate.

The concrete accounting: `commands/`'s 5,785 post-trim words split as
`build.md` 2,025 + `init.md` 884 + `interview.md` 1,031 + `board.md` 110 +
the five drafting commands (`architecture`+`design`+`plan`+`prd`+`walkthrough`)
1,735. **2,025 of those words are `build.md`**, reconciled on its own below;
**884 + 1,031 + 110 = 2,025 more sit in three files that were never in this
trim's scope** — `init.md` explicitly excluded per `R1`'s task note,
`board.md` never targeted, `interview.md` touched only for its one
`sync_claude_md` clause because it's the documented delegation-pattern
exception (Q3/3.8 is scoped to the five drafting commands only). That's
4,050 of 5,785 words (70%) inside files whose trim was either out of scope
or governed by a correctness rewrite (`build.md`), not a word-reduction pass.
The five actually-Q3'd commands are already lean: 1,735 words total,
188–426 words each, down from 226–477 pre-trim (16–19% each, in line with
Q3's stated "~40% off the two heaviest, less off the leanest" aim — see
per-file deltas above).

The ≤5,450 target implicitly assumed either `init.md`/`interview.md` would
also shrink, or `build.md` would land nearer 1,700. Neither is true for
reasons that are each individually correct (see below and the `Out of
scope` list barring `-init.md` edits), so the 335-word gap is the sum of two
already-explained, individually-legitimate decisions, not a fresh failure.

### `specmanager-build.md` — 325 words over its own ≤1,700 target

This is the gap `task-031` already reported and flagged as worth carrying
forward rather than re-deriving:

> the old step-7b assembly prose was 117 words; the `get_spec_slice` call
> plus the mandated `unresolvedRefs`/`fallbackUsed` provenance bullet is 108.
> Step 7 gave up 7. Step 6b's re-map *added* 30 — the Haiku context-cliff
> rationale and the `sessionTable`-is-live note, both explicitly required, on
> a step the user decided must stay.

The R5+R6+Q1 ≈ −750 estimate assumed a step-7b collapse whose saving the
mandated provenance reporting cancels out almost exactly (117 saved, 108
spent restoring drift-visibility that a silent-failure version wouldn't
have had). The return on moving that algorithm into `core`
(`get_spec_slice`, `core/spec-slice.ts`) was **banked as correctness, not
tokens** — the tool now resolves anchors and reports drift
(`unresolvedRefs`/`fallbackUsed`) instead of failing silently. That is a
legitimate outcome of a decision the user made explicitly (step 6b "stays,"
per the plan's row `3.10` note: *"user decision 2026-08-11, overruling an
earlier draft that deleted it"*), not a failure to hit a number.

Independent floor evidence for why the remaining 2,025 words can't compress
further without breaking a stated invariant — four `min == max` sites live
inside `build.md` specifically:

- `INV-5` (`min: 1, max: 1`) — "never infer phase done from the builder
  returning" (`specmanager-build.md:38`).
- `INV-6` (`min: 2, max: 2`) — tier routing names aliases, never dated model
  ids; one of its two required sites is in `build.md`.
- `INV-9` (`min: 1, max: 1`) — the R=2/N=3 non-composition parenthetical
  (`specmanager-build.md:32`, per `3.9`'s own note, already collapsed from a
  full paragraph to the minimum single statement).
- `INV-21` (`min: 3, max: 3`) — the tier-table SHAPE stated at all 3 required
  sites, two of them in `build.md`.

Each is already at the single required occurrence; the 325-word gap is not
recoverable prose sitting next to these.

### `Don't` bullets, 16 files — 12 over target (≤50)

`build.md`'s own `Don't` count met its sub-target exactly (19 → 10). The
16-file total (81 → 62) missed by 12 because six agent files' `Don't` counts
were untouched by this phase's tasks (`architect.md` 4, `designer.md` 6,
`prd-writer.md` 4, `walkthrough-writer.md` 7 all show `Δ: 0` in the table
above) — no `trim`-phase task targeted a `Don't`-list reduction in those four
files; `3.11` (task-028) scoped the cut to `build.md` specifically ("R5: cut
build.md's Don't list from 19 to ≤10"), and no equivalent task exists for
the other agents' lists. This is a real, attributable gap rather than a
floor: unlike the word-count misses, no `selftest-prompts` invariant pins a
`Don't`-bullet floor higher than what a further pass could reach (the
`Don't`-bullet count isn't itself an `INV-*` entry — the invariants pin the
*content*, not the bullet-list format it's phrased in). It is flagged here,
not fixed, per this task's explicit scope: measurement only, no prompt edits.

## What was met — plainly

- **`build.md`'s own `Don't`-bullet sub-target (≤10): met exactly**, 19 → 10,
  via `task-028`'s dedicated cut.
- **Registered selftests (14): met exactly** — `selftest-specslice` and
  `selftest-prompts` both registered and green.

## Recommended target revisions

Per the Architecture's open question 4 and this task's charter, the fix is
to the *target*, not further prose surgery:

| Metric | Current target | Recommended revision | Basis |
|---|---|---|---|
| `agents/` words | ≤ 6,100 | **≤ 6,700** | Measured floor 6,678; `INV-13`/`INV-14a-e`/`INV-11`/`INV-25` pin duplicated per-site content the estimate didn't account for. Small headroom above the measured value, not a re-opened cutting target. |
| `commands/` words | ≤ 5,450 | **≤ 5,800** | Measured floor 5,785; 70% of the total sits in files never in this trim's scope (`init.md`, `board.md`, most of `interview.md`) or governed by `build.md`'s correctness rewrite. |
| `specmanager-build.md` words | ≤ 1,700 | **≤ 2,050** | Measured 2,025; the R5+R6+Q1 saving was banked as correctness (drift-visible `get_spec_slice`) rather than tokens, by an explicit user decision to keep step 6b, plus four `min == max` `INV-*` floors inside the file. |
| `Don't` bullets, 16 files | ≤ 50 | **≤ 62, revisit if a future pass adds a per-agent-file task** | No `INV-*` floor blocks a further cut here (unlike the word-count misses) — this is scope, not a hard floor. Left at the measured value now; a future task scoped like `3.11` but for the other agent files could still bring it down without a target change. |
| `Don't` bullets, `build.md` | ≤ 10 | **≤ 10 — met, no change** | — |
| Registered selftests | 14 | **14 — met, no change** | — |

## Verification

```
$ cd plugins/specmanager/server && npm run selftest-prompts
```
Green: 45/45 invariant + mutation assertions pass (all 37 `INV-*` entries,
including the `INV-15b` negative-max and the full mutation pass proving each
pattern goes red when its text is removed). Confirms this task changed no
prompt file.
