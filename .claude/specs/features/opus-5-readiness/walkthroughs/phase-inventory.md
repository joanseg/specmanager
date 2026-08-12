---
id: wt-opus-5-readiness-019
featureId: feat-opus-5-readiness
stage: walkthrough
status: draft
stale: false
title: Opus 5 readiness — Phase inventory walkthrough
dependsOn:
  - plan-opus-5-readiness-017
basedOn:
  plan-opus-5-readiness-017: 2
generatedBy: agent
version: 1
phase: inventory
createdAt: '2026-08-12T09:47:18.015Z'
updatedAt: '2026-08-12T09:47:18.015Z'
---
# Opus 5 readiness — Phase inventory walkthrough

This phase ships **no user-visible behaviour**. It buys the ability to delete prompt prose in the `trim` phase without silently losing a rule that nothing else enforces. It delivers three things: an independently re-derived inventory of the load-bearing invariants in SpecManager's 16 prompt files (`docs/prompt-invariants-derived.md` → `docs/prompt-invariants-reconciled.md`), a pinned pre-trim baseline (`docs/baseline-measurement.md`), and `selftest-prompts` — a regression gate that encodes 37 reconciled invariants as 45 pattern rows and, on every run, **mutates each one to prove it goes red when its statement is removed**. One prompt file changed: `agents/architect.md`, to correct the R8 design-grounding defect.

> **Exit test:** `cd plugins/specmanager/server && npm run build && npm run selftest-prompts && cd ../../.. && claude plugin validate plugins/specmanager`
>
> *`selftest-prompts` must go green against **unmodified** prompts — and its own mutation pass (1.11) must prove that removing each invariant's statement turns it red. A gate that passes because its patterns assert nothing is the exact failure this phase exists to prevent, and "green on untouched files" alone cannot distinguish the two. The `claude plugin validate` leg covers the one prompt file this phase edits (`agents/architect.md`).*

You should already have: the SpecManager repo on `main` at or after `fb6626c`, Node 20+, and the plugin installed if you want to exercise the reload path in §2. Nothing else in the repo's behaviour changes, so no board, no MCP session, and no seed data are needed for the exit checks.

## 0. Prerequisites

| Requirement | Value |
|---|---|
| OS | macOS (Darwin 25.2) or Linux; the checks are shell + Node only |
| Node | 20+ (`node -v`) |
| Repo | `/Users/joan/Documents/projects/specmanager`, branch `main` |
| Phase HEAD | `fb6626c` (task-035, the last of this phase's 11 commits) |
| Working tree | Clean under `plugins/specmanager/` — several checks below assert on committed file contents |
| `claude` CLI | On `PATH`, for the `plugin validate` leg |
| Seed data | None. `selftest-prompts` reads the repo's own prompt files; it writes nothing and needs no tmp dir |

Confirm the starting point:

```bash
cd /Users/joan/Documents/projects/specmanager
git log --oneline -11 --format="%h %s"
```

Expect exactly these 11 commits, newest first — the phase's full artifact set:

```
fb6626c Extend selftest-prompts with a mutation pass proving each invariant goes red when its statement is removed
71ab078 server/package.json: register selftest-prompts script (task-015)
ed4af8c task-011: encode the reconciled invariant table in selftest-prompts.ts
23b7946 task-002: reconcile re-derived inventory against Architecture's INV-1..15 table
82000b1 task-013: INV-15 snippet-parity pattern pair in selftest-prompts.ts
d95542d task-003: record pre-trim baseline measurement (word counts + Don't-bullet count)
cd0ea72 task-010: canonical docs/agent-snippets/lossless-carryover.md home for R3's lossless-carryover clause
c9c21f4 task-009: R8 — propagate corrected design-grounding fragment into architect.md
63c1c56 task-004: correct design-grounding.md to Read-on-filePath form
5973e77 Re-derive the invariant inventory independently from agents/, commands/, and core/
75561ca Write the selftest-prompts.ts harness (PromptInvariant shape, match loop, min/max assertions)
```

## 1. Build

```bash
cd /Users/joan/Documents/projects/specmanager/plugins/specmanager/server
npm install          # only if node_modules is absent
npm run build        # tsc -p tsconfig.json → dist/
```

Expected: `tsc` prints its banner and exits 0 with no diagnostics.

```
> @specmanager/server@0.2.0 build
> tsc -p tsconfig.json
```

The **new** compiled artefact this phase adds is `dist/selftest-prompts.js` (+ `.js.map`). It is committed alongside the source — the plugin ships compiled `dist/`, so a source-only commit would ship nothing:

```bash
ls -1 dist/selftest-prompts.js dist/selftest-prompts.js.map
git status --porcelain .        # expect: no output
```

No other selftest changes in this phase — `selftest-tiers`, `selftest-stopgate`, `selftest-build` and the rest are untouched here (they move in `core`). If the build fails, stop here; every check below reads `dist/`.

## 2. Install / run

`selftest-prompts` runs straight from `dist/` and needs no plugin install. The reload dance matters only because this phase edited one shipped prompt file (`agents/architect.md`), and prompt files are read from the *installed* plugin, not the repo:

```
/plugin marketplace update specmanager
/plugin install specmanager@specmanager
/reload-plugins
/mcp                 # reconnect the specmanager server
```

Then confirm the installed architect carries the corrected fragment (§3.6 checks the repo copy; this checks what actually ships):

```bash
grep -c 'Read` on the `filePath`' ~/.claude/plugins/*/specmanager/agents/architect.md
```

Expect `1`.

**Reload troubleshooting.** `/reload-plugins` does not always re-read agent frontmatter, and `/mcp` reconnect can leave a stale stdio child. If the installed `architect.md` still shows the old `read_document` wording after a reload, quit `claude` entirely and restart — a full restart is the reliable fix. None of §3's checks depend on the install, so a failed reload does not block the phase.

## 3. Phase `inventory` exit checks

### 3.1 The harness runs green against unmodified prompts

```bash
cd /Users/joan/Documents/projects/specmanager/plugins/specmanager/server
npm run selftest-prompts
```

Expected: two labelled passes and a final tally. The last line is exactly:

```
All prompt invariant assertions passed (45 invariants checked: match + mutation).
```

Every assertion line is prefixed `ok — `, in the repo's hand-rolled selftest style (`assert(cond, msg)`, no test runner). Exit code 0.

### 3.2 The match pass: 45 rows, 37 distinct invariants

The harness encodes `docs/prompt-invariants-reconciled.md`'s 37 entries as 45 array rows. The extra 8 are deliberate letter-splits (`INV-14a…e`, `INV-27a…c`, `INV-36a/b`, `INV-15a/b`) — the reconciliation's rule is *one pattern per independently deletable clause*, because a single whole-block pattern stays green when all but one clause is cut.

```bash
npm run selftest-prompts | sed -n '/— match pass —/,/— mutation pass —/p' | grep -c '^ok — '
grep -cE '^    id: "INV-' src/selftest-prompts.ts
grep -oE 'id: "INV-[0-9]+' src/selftest-prompts.ts | sort -u | wc -l
```

Expected: `45`, `45`, `37`.

Spot-check that the floors are real floors, not `min: 1` placeholders — the reconciliation raised several because a `min: 1` pattern stays green while the rule is lost from every actor that matters:

```bash
grep -A1 'id: "INV-25"' src/selftest-prompts.ts | head -2
grep -E '^    min: [0-9]+,' src/selftest-prompts.ts | sort | uniq -c
```

Expect `INV-25` ("never approve a document") to carry `min: 8` across 9 files, and the `min` histogram to contain values of 2, 3, 4 and 8 — not exclusively 1.

### 3.3 The mutation pass: every invariant goes red when its statement is removed

This is the phase's proof obligation. For each positive row the harness strips every match from an **in-memory** copy of the row's files and asserts the check now fails; for the one negative row (`INV-15b`, `max: 0`) it injects the forbidden text and asserts the same.

```bash
npm run selftest-prompts | sed -n '/— mutation pass —/,$p' | grep -c 'turns the check red'
```

Expected: `45` — one per row, no exceptions, no skips.

Two representative lines you should see verbatim in the output:

```
ok — INV-25 mutation — stripping the matched text turns the check red (want 8..10, got 0 after removal) [agents/prd-writer.md:0, agents/architect.md:0, agents/designer.md:0, agents/planner.md:0, agents/builder.md:0, agents/walkthrough-writer.md:0, commands/specmanager-build.md:0, commands/specmanager-walkthrough.md:0, commands/specmanager-prd.md:0]
ok — INV-15b mutation — injecting the forbidden text into ../../docs/agent-snippets/design-grounding.md turns the check red (want 0..0, got 1 after injection) [../../docs/agent-snippets/design-grounding.md:1, agents/architect.md:0, agents/planner.md:0, agents/builder.md:0]
```

Nothing is written to disk. Confirm:

```bash
git -C /Users/joan/Documents/projects/specmanager status --porcelain
```

Expect no lines under `plugins/specmanager/` or `docs/agent-snippets/`.

### 3.4 The net is not vacuous — a degenerate pattern is rejected

A pattern loose enough to also match neighbouring prose reports green while guarding nothing. The `max` ceiling is what rejects it. Reproduce by temporarily loosening one row — `INV-17`, whose `min == max == 1`:

```bash
cd /Users/joan/Documents/projects/specmanager/plugins/specmanager/server
cp src/selftest-prompts.ts /tmp/sp.bak
perl -0pi -e 's/pattern: "You must record real artifacts\.",/pattern: \/^.*$\/gm,/' src/selftest-prompts.ts
npm run build >/dev/null && npm run selftest-prompts 2>&1 | grep -E "FAIL"
```

Expected — the run aborts on the match pass with a non-zero exit:

```
Error: FAIL: INV-17 — a `done` transition records real artifacts — the actionable survivor, not the collapsible `missingArtifact` restatements around it (want 1..1, got 84) [agents/builder.md:84]
```

`84` is every line of `builder.md`. Restore and rebuild — this check must leave no residue:

```bash
cp /tmp/sp.bak src/selftest-prompts.ts && npm run build >/dev/null
git -C /Users/joan/Documents/projects/specmanager status --porcelain plugins/specmanager/server   # expect: no output
```

### 3.5 Carrier blind spots are surfaced, counted, and deliberately not failed

A summed floor cannot express "one survivor per actor". The harness's `carrierSensitivity` pass removes one file's matches at a time and reports where the total still clears `min` — the rule goes silent at that actor while the gate reads green. These are **reported, never asserted**, because several rows are budgeted that way on purpose.

```bash
npm run selftest-prompts | grep -c '^  ! '
npm run selftest-prompts | grep '^  ! INV-1:'
```

Expected: `30`, and the `INV-1` group showing that **two of its four actors** can go silent while the check holds:

```
  ! INV-1: losing agents/builder.md (total would be 9) keeps the check green
  ! INV-1: losing agents/walkthrough-writer.md (total would be 7) keeps the check green
  ! INV-1: losing commands/specmanager-build.md (total would be 7) keeps the check green
  ! INV-1: losing commands/specmanager-walkthrough.md (total would be 7) keeps the check green
```

`INV-25` is the widest — all 9 of its files appear. The mechanical fix is a per-file floor (`minPerFile`); it was deliberately **not** made in this phase because it would reshape the 45 rows task-011 had just encoded. Read the banner as the standing caveat it is:

```
Carrier blind spots (30) — reported, not failed; the rule can go silent at one actor while the summed floor holds:
```

### 3.6 R8 is corrected at the canonical source and propagated to exactly one agent

The R8 defect: the canonical fragment and `architect.md` both said `read_document` for the design doc — the exact method `planner.md` and `builder.md` warn against ("JSON-escapes the whole body"). Reconciling *toward* the canonical text would have spread the defect, so the correction ran source-first (`63c1c56`) then propagated to the one stale carrier (`c9c21f4`).

```bash
cd /Users/joan/Documents/projects/specmanager
grep -c 'read the HTML file directly with `Read` on the `filePath`' \
  docs/agent-snippets/design-grounding.md \
  plugins/specmanager/agents/architect.md \
  plugins/specmanager/agents/planner.md \
  plugins/specmanager/agents/builder.md
```

Expected — `1` for each of the four files:

```
docs/agent-snippets/design-grounding.md:1
plugins/specmanager/agents/architect.md:1
plugins/specmanager/agents/planner.md:1
plugins/specmanager/agents/builder.md:1
```

And the superseded wording is gone everywhere (`INV-15b`'s negative half, anchored on the design-doc context so `architect.md`'s legitimate `read_document` call for the *PRD* is not a false positive):

```bash
grep -rEc 'design doc exists,\s*`read_document`\s*it' \
  docs/agent-snippets/design-grounding.md plugins/specmanager/agents/ | grep -v ':0' || echo "clean — 0 sites"
```

Expected: `clean — 0 sites`.

`git show --stat c9c21f4` should show a single-file, single-paragraph diff on `architect.md` — the propagation deliberately did not touch `planner.md` or `builder.md`, which were already correct.

### 3.7 The inventory is an independent re-derivation, not a transcription

Plan row 1.1's real deliverable is the enumeration, not the script. It was derived from the 16 prompt files and `core/` **without** consulting the Architecture's INV table, then reconciled against it with an explicit per-entry verdict.

```bash
grep -oE "D-[0-9]{2}" docs/prompt-invariants-derived.md | sort -u | wc -l
grep -n "^## " docs/prompt-invariants-derived.md | wc -l
grep -n "^## " docs/prompt-invariants-reconciled.md
```

Expected: `88` distinct candidate ids (`D-01`…`D-88`) across 17 thematic sections (A–P plus Method), and a reconciliation with this shape:

```
16:## Verification (spot-checked myself, not taken on trust)
34:## Part A — `INV-1`…`INV-15` reconciled against `D-nn`
59:## Part B — `D-nn` must-survive entries with no `INV` coverage
98:## Part C — The six adjudications
149:## Part D — Considered, not added (avoiding the 88-candidate trap)
171:## Findings for the Architecture / Plan (recorded, not applied — I don't edit those docs)
197:## Scope note
```

The Verification table is the load-bearing part — the reconciliation re-ran each claim rather than adopting it. The finding that most changes how you should read this repo:

```bash
grep -rn "checkGate" plugins/specmanager/server/src/core/dependencies.ts plugins/specmanager/server/src/mcp.ts
```

Expected: three hits — a comment and the definition in `core/dependencies.ts`, and **exactly one call**, at `mcp.ts:272`, inside the `check_gate` handler. `createDocument` and `createTask` never call it. So gates are **advisory queries the prompts choose to honour**, the inverse of the repo's stated "gate enforcement lives in `core`, not in prompts". `INV-16` exists for precisely this: it asserts the *call* in each gated command, because the call is the enforcement.

Three sibling APIs look enforcing and are opt-in at the call site — same class of finding, recorded in the Verification table:

| API | Looks like | Actually |
|---|---|---|
| `writeDocument` `baseVersion` | mandatory optimistic-concurrency check | `typeof input.baseVersion === "number" && …` — omit the field, no check runs |
| `createDocument` `phase` | required for walkthroughs | `input.phase ?? DEFAULT_PHASE`, silently, walkthrough stage only |
| `createDocument` `dependsOn`/`basedOn` | required for staleness | `?? []` / `?? {}`, no error path — staleness becomes a silent no-op |

And the `tools:`-frontmatter asymmetry, which is why `INV-25` carries `min: 8` rather than `min: 1`:

```bash
grep -c "^tools:" plugins/specmanager/agents/*.md | grep -v ':0'
```

Expected: only `builder.md` and `reviewer.md`. "Don't approve the doc" is structurally enforced for the builder alone and prompt-only for the other five agents. (Recorded residual, not fixed: `reviewer.md`'s `tools:` grants `Bash`, which is a write path no regex closes — see `INV-22`'s `what` string.)

### 3.8 The baseline is pinned to a sha and reproducible

```bash
sed -n '9p;116,126p' docs/baseline-measurement.md
```

Expected: `**Measured at:** cd0ea7267207f9006de749aa488a88321c4d1755` and a summary table reproducing the Architecture's actuals — `commands/` 6,407 w, `specmanager-build.md` 2,411 w, 81 `Don't` bullets across 16 files (19 in `build.md`), 12 registered selftests — all exact, with `agents/` at **7,425** vs the Architecture's 7,402.

The +23 is explained, not drift: `c9c21f4` (this phase's own R8 propagation) landed *after* the Architecture's baseline and *before* this measurement's pinned sha. Every command in the doc reads blobs via `git show <sha>:<path>` rather than the working tree, specifically because other builders were committing under `agents/` concurrently. Re-run any of them at that sha and the numbers reproduce.

### 3.9 The lossless-carryover clause has a canonical home before `trim` needs it

R3 (a `trim` task) reduces a ~90-word density block to one sentence replicated across four agent files. With no include mechanism for agent prompts, that creates a second drift surface of exactly the kind that produced R8 — so the canonical home landed **here**, ahead of the trim that needs it.

```bash
sed -n '9p' docs/agent-snippets/lossless-carryover.md
grep -c "merging duplicates is condensing; dropping information is a defect" \
  plugins/specmanager/agents/{architect,planner,prd-writer,walkthrough-writer}.md
```

Expected: the canonical sentence, and `1` for each of the four agents — `INV-13`'s `min == max == 4`, the one entry where byte equality is the correct assertion.

### 3.10 No pattern pins a model alias — the net survives `task-007`

`task-007` (next phase) re-maps `cheap → sonnet`. A pattern pinning `haiku` would go red there and read as a false over-trim, so every tier-related row anchors on structure (the *routing claim*, the three tier *names*), never on a value.

```bash
cd plugins/specmanager/server
awk '/^const INVARIANTS/,/^\];/' src/selftest-prompts.ts | grep -ciE 'haiku|"sonnet"|"opus"'
```

Expected: `0`.

The prompt surface itself still carries the literal — 4 lines across 2 files, which `trim`/`core` will update:

```bash
cd /Users/joan/Documents/projects/specmanager
grep -rln "haiku" plugins/specmanager/agents plugins/specmanager/commands
grep -rc "haiku" plugins/specmanager/agents/builder.md plugins/specmanager/commands/specmanager-build.md
```

Expected: `agents/builder.md` (1 line) and `commands/specmanager-build.md` (3 lines — the 6b default table, step 7's per-task mapping, and the "don't pin dated ids" Don't bullet). task-011 verified the forward-compatibility claim empirically, not by inspection: it applied the remap, re-ran `selftest-prompts` green, and reverted. `INV-6` and `INV-21` carry the reasoning inline as code comments.

### 3.11 The script is registered and the manifest still validates

```bash
node -e "console.log(Object.keys(require('/Users/joan/Documents/projects/specmanager/plugins/specmanager/server/package.json').scripts).join('\n'))" | grep -x "selftest-prompts"
cd /Users/joan/Documents/projects/specmanager && claude plugin validate plugins/specmanager
```

Expected: `selftest-prompts` present in `scripts`, and:

```
✔ Validation passed with warnings

  ❯ version: No version specified. Consider adding a version following semver (e.g., "1.0.0")
```

The one warning is **pre-existing** (`plugin.json` has never carried a `version`) and is not a regression from this phase. This leg exists to catch a prompt edit that breaks a command's YAML frontmatter — `agents/architect.md` is the only prompt file this phase touched.

Registered script count is now **13** (12 `selftest-*` + `smoke-mcp`), up one from the 12 the baseline pinned; it becomes 14 when `core` adds `selftest-specslice`.

## 4. Pass criteria

All required.

- [ ] `npm run build` exits 0 with no `tsc` diagnostics; `dist/selftest-prompts.js` exists and the tree is clean (§1)
- [ ] `npm run selftest-prompts` exits 0 and its final line reads `All prompt invariant assertions passed (45 invariants checked: match + mutation).` (§3.1)
- [ ] The match pass emits 45 `ok — ` lines; the source holds 45 rows spanning 37 distinct `INV-` ids (§3.2)
- [ ] `min` values include 2, 3, 4 and 8 — the floors are per-actor counts, not `min: 1` placeholders (§3.2)
- [ ] The mutation pass emits 45 `turns the check red` lines — every row, no skips — and writes nothing to disk (§3.3)
- [ ] Loosening `INV-17` to `/^.*$/gm` aborts the run with `(want 1..1, got 84)`; restoring and rebuilding leaves no residue (§3.4)
- [ ] 30 carrier blind spots are reported under the "reported, not failed" banner, including all 4 `INV-1` actors (§3.5)
- [ ] The corrected `Read`-on-`filePath` fragment appears exactly once in the canonical snippet and in each of `architect.md`, `planner.md`, `builder.md`; the superseded `read_document` wording appears 0 times (§3.6)
- [ ] `docs/prompt-invariants-derived.md` holds 88 distinct `D-nn` ids; `docs/prompt-invariants-reconciled.md` carries Parts A–D plus a Verification table and a Findings section (§3.7)
- [ ] `checkGate` resolves to exactly one call site, `mcp.ts:272`; only `builder.md` and `reviewer.md` declare `tools:` (§3.7)
- [ ] `docs/baseline-measurement.md` pins sha `cd0ea72`, reproduces 4 of 5 Architecture metrics exactly, and attributes the `agents/` +23 to `c9c21f4` (§3.8)
- [ ] `docs/agent-snippets/lossless-carryover.md` exists and its sentence appears once in each of the 4 drafting agents (§3.9)
- [ ] Zero model aliases appear inside the `INVARIANTS` table (§3.10)
- [ ] `selftest-prompts` is registered in `server/package.json`; `claude plugin validate plugins/specmanager` passes with only the pre-existing `version` warning (§3.11)

## 5. Deferred / out of scope

Expected, not bugs:

- **No prose is trimmed yet.** Every `max` still sits at today's pre-trim count. `agents/` is still ~7,425 w, `commands/` 6,407 w, `build.md` 2,411 w, 81 `Don't` bullets. That is the whole point: the net is proven against *unmodified* prompts first.
- **No `core` code changed.** `get_spec_slice`, the `cheap → sonnet` re-map, and the `probe_test_command` deletion are all `core`-phase work. `core/tiers.ts` still maps `cheap → haiku`.
- **Carrier blind spots are not fixed** (§3.5). `minPerFile` is the mechanical fix and was deliberately deferred rather than reshaping 45 just-encoded rows.
- **`selftest-prompts` does not police `CLAUDE.md`.** It asserts against `agents/` and `commands/` only; extending it to the repo's narrative prose is out of scope by the Plan.
- **It is a regression gate on a known list, not a proof of semantic equivalence.** It cannot catch an invariant the derivation failed to enumerate — which is why row 1.1 was an independent re-derivation rather than a transcription of the Architecture's table.
- **`reviewer.md`'s `Bash` write path stays open** (§3.7). Recorded as a residual inside `INV-22`'s description; no regex closes it.
- **`planner.md:99` will become factually wrong** once `core`'s task-008 deletes the convention probe its justification cites. Reconciliation adjudication #6 flags it as a `trim`-phase wording fix — update the sentence, don't delete the rule. `INV-10` is anchored on the never-omit obligation, not that justification clause, so it will not go red.

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Cannot find module '.../dist/selftest-prompts.js'` | `dist/` not built, or built before `75561ca` | `npm run build` in `plugins/specmanager/server` |
| A `min` assertion fails on an untouched tree | Prompt file edited outside this phase, or a merge dropped a statement | `git diff` the named file. **Restore the statement — never lower the `min`.** Lowering a `min` is how a gate is silently lost |
| A `max` assertion fails | A statement was duplicated, or a pattern is too loose | If the count is implausibly large (near a file's line count), the pattern is degenerate — tighten it, don't raise `max` |
| `INV-15a` reads `2` instead of `3` | An agent's design-grounding paragraph drifted from the canonical snippet | Re-copy from `docs/agent-snippets/design-grounding.md`; there is no include mechanism, so drift is manual to fix |
| `INV-28` / `INV-29` fail after a `trim` commit | Expected. The Plan's survivor sentences for rows 3.3/3.7 don't carry these clauses | **The guard working, not a harness bug.** Widen the survivor (adjudications #2 and #3), don't lower the `min` |
| A tier row fails after the `cheap → sonnet` re-map | A pattern pinned an alias value | Should be impossible (§3.10 = 0). If it happens, re-anchor on structure per `INV-6`/`INV-21`'s comments |
| `selftest-board`, `selftest-shutdown`, or `selftest-autoport` fail | **Port collisions with live specmanager MCP processes** — 10 were running during this phase, some 20+ days old | Pre-existing and environmental, unrelated to this phase, and none are in this phase's exit test. `ps -eo pid,etime,command \| grep [m]cp.js` and reap the stale ones. A live instance of what `feat-reinstall-refactor` addresses |
| Installed `architect.md` still shows `read_document` | `/reload-plugins` didn't re-read the agent file | Quit `claude` entirely and restart (§2). Does not affect any §3 check |

## 7. What ships next (preview)

**Phase `core`** (21 pts, 9 tasks) — the first code changes: `core/spec-slice.ts` with `get_spec_slice`, isolating the `matchPhaseHeading` move out of `active-card.ts` as its own task because it is the single edit in this feature that can break the Stop-gate; the Q1 tier re-map `cheap → sonnet`; and deleting `probe_test_command` from `hooks/stop-gate.sh` while keeping the rung-2 `**Exit test:**` fallback. Its exit test adds `selftest-specslice` and `smoke-mcp`, taking the registered count to 14.

**Phase `trim`** (31 pts, 15 tasks) — the prose deletion this phase exists to make safe, across 16 prompt files plus the `specmanager-build.md` rewrite, ending with the full 14-selftest chain. Three carry-forwards from here land there:

- `CLAUDE.md`'s build/test block lists only 10 runnable scripts — it omits `selftest-autoport`, `selftest-repos`, and now `selftest-prompts`. Row 3.13 corrects it to 14.
- The reconciliation doc's `max` *estimates* differ from the encoded values in places. **The encoded numbers in `selftest-prompts.ts` are authoritative**; that prose will read stale once row 3.12 recalculates ceilings.
- Row 3.12's rule is absolute: each trim task lowers a `max`; **nothing lowers a `min`.** A `min` failure means restore the statement.

This is not the last phase, so there is no feature roll-up yet — the `final` walkthrough is written once `core` and `trim` have approved phase walkthroughs of their own.
