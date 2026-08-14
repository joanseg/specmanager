---
id: wt-opus-5-readiness-021
featureId: feat-opus-5-readiness
stage: walkthrough
status: approved
stale: false
title: Opus 5 readiness — Phase trim walkthrough
dependsOn:
  - plan-opus-5-readiness-017
basedOn:
  plan-opus-5-readiness-017: 2
generatedBy: agent
version: 1
phase: trim
createdAt: '2026-08-12T16:22:58.607Z'
updatedAt: '2026-08-14T07:11:15.906Z'
---
# Opus 5 readiness — Phase trim walkthrough

Phase `trim` is the deletion phase: 15 tasks that removed ~1,369 words of prose from the 16 prompt files that drive SpecManager itself (7 `agents/*.md` + 9 `commands/*.md`), rewrote `commands/specmanager-build.md`'s dispatch/review steps onto the `get_spec_slice` tool that phase `core` shipped, and corrected the repo's own `CLAUDE.md`. No lifecycle behaviour changes. The only new capability the reader will notice is that step 7b of `/specmanager-build` now assembles the reviewer's spec slice with **one tool call** instead of seven prose-derived steps — and reports anchor drift instead of silently thinning the slice.

The phase's exit criterion, verbatim from `plan.md`:

> **Exit test:** `cd plugins/specmanager/server && npm run build && npm run selftest && npm run selftest-board && npm run selftest-phases && npm run selftest-build && npm run selftest-tiers && npm run selftest-stopgate && npm run selftest-roundtrip && npm run selftest-pidfile && npm run selftest-shutdown && npm run selftest-autoport && npm run selftest-repos && npm run smoke-mcp && npm run selftest-specslice && npm run selftest-prompts && cd ../../.. && claude plugin validate plugins/specmanager`

**What you should already have in place.** Phase `inventory` (`selftest-prompts` + its mutation pass, 37 `INV-*` entries) and phase `core` (`core/spec-slice.ts`, the `get_spec_slice` MCP tool, the `cheap → sonnet` tier re-map, the `probe_test_command` deletion) are both landed and their walkthroughs approved. `selftest-prompts` is the safety net every check below leans on: it fails on `< min` (an invariant was over-trimmed away) and on `> max` (a duplicate wasn't de-duplicated). This phase lowered `max` values only — never a `min`.

---

## 0. Prerequisites

| | |
|---|---|
| OS | macOS (darwin 25.2.0) or Linux |
| Node / npm | v25.6.1 / 11.9.0 (repo requires Node 20+) |
| Claude Code | 2.1.220 or newer (`Agent(` is the current spelling; `Task(` still aliases) |
| Repo | `/Users/joan/Documents/projects/specmanager`, branch `main` |
| HEAD | `d9cc811` — `task-033`'s commit. `task-034` (the final rebuild) produced **no commit**: `dist/` was already current, so there was nothing to commit. A clean `git status` for `dist/` is the expected state, not a missed step. |
| Seed data | None. Every check below is a read of tracked files or a self-contained selftest that builds its own tmp project. |

Two commits landed **immediately before** this phase and are load-bearing for its exit test — without them the 14-suite chain cannot pass in the environment the Stop-gate runs it in:

- `55d8ba8` — *Make the selftest suite self-sufficient under concurrent boards* (`selftest-autoport`, `selftest-roundtrip`, `selftest-shutdown`: scan for a free port, resolve their own root).
- `b97f50c` — *Fix selftest-board reap/rebind: pass root to `pidFilePath()`*.

The Stop-gate invokes the phase exit test from a bare environment with no `SPECMANAGER_*` vars set, and the developer machine typically has live MCP processes holding ports 4317+. Both conditions used to fail four suites for reasons unrelated to any prompt edit.

---

## 1. Build

```bash
cd /Users/joan/Documents/projects/specmanager/plugins/specmanager/server
npm install          # only if node_modules is absent
npm run build        # tsc -p tsconfig.json → dist/
```

Expected: silent success, exit 0. `tsc` prints nothing on a clean build.

This phase adds **no new source module** — `core/spec-slice.ts` and `selftest-specslice.ts` came from phase `core`. What `trim` changed under `server/src/` is exactly one file, `selftest-prompts.ts` (`task-032`), and only its `max` values.

Confirm the rebuild is a no-op against what is committed — the plugin ships compiled `dist/`, so a stale `dist/` ships stale behaviour:

```bash
cd /Users/joan/Documents/projects/specmanager/plugins/specmanager/server
rm -rf dist && npm run build && git status --porcelain dist/
```

Expected: **no output**. A non-empty result means the committed `dist/` drifted from `src/` and must be rebuilt and committed before anything below is meaningful.

Now run the two suites this phase can actually break:

```bash
npm run selftest-prompts
```

Expected last line:

```
All prompt invariant assertions passed (45 invariants checked: match + mutation).
```

The **new** assertions this phase relies on (all pre-existing patterns, re-pointed to post-trim `max` values): every one of the 37 `INV-*` entries still meets its `min` after 1,369 words were deleted, and each entry's mutation twin still goes red when its statement is stripped from an in-memory copy. Informational `!` lines scroll past for entries whose mutation is absorbed by a multi-file `min` (e.g. `! INV-25: losing agents/builder.md (total would be 9) keeps the check green`) — those are diagnostics, not failures.

```bash
npm run selftest-specslice
```

Expected last line before the tmp-dir path: `All R6 spec-slice assertions passed.`

**If either of these fails, stop here.** Every check in section 3 assumes the safety net is green; a red `selftest-prompts` means an invariant was deleted, and the `min` that fired names it.

---

## 2. Run it

This feature *is* the SpecManager plugin, so "running it" means reinstalling the plugin and reconnecting its MCP server.

```bash
cd /Users/joan/Documents/projects/specmanager
claude plugin validate plugins/specmanager
```

Expected:

```
⚠ Found 1 warning:

  ❯ version: No version specified. Consider adding a version following semver (e.g., "1.0.0")

✔ Validation passed with warnings
```

The version warning is pre-existing and unrelated to this phase. This step is what catches a prompt edit that broke a command's YAML frontmatter — a real hazard when 16 prompt files change.

> Run this from the **repo root**. `plugins/specmanager` is a relative path; running it from `server/` yields `File not found: …/server/plugins/specmanager` and a false failure.

Then, inside a `claude` session in this repo:

```
/plugin marketplace update specmanager
/plugin install specmanager@specmanager
/reload-plugins
/mcp
```

`/mcp` should list the `specmanager` server as connected. If reconnect fails, restart `claude` entirely — that is the reliable fix (README Troubleshooting).

**A session started before phase `core`'s build will not have `get_spec_slice`.** Step 7b of the rewritten `specmanager-build.md` now calls it, so a stale session hits "tool not found" mid-build. Reconnect via `/mcp` or restart before running `/specmanager-build`.

---

## 3. Phase `trim` exit checks

All commands run from `/Users/joan/Documents/projects/specmanager` unless noted.

### 3.1 The prose actually came out — and the misses are the designed outcome

```bash
cd plugins/specmanager && wc -w agents/*.md | tail -1 && wc -w commands/*.md | tail -1
```

Expected:

```
    6678 total
    5785 total
```

Against `docs/baseline-measurement.md`: `agents/` 7,425 → **6,678** (−747, −10.1%); `commands/` 6,407 → **5,785** (−622, −9.7%).

> The Plan's row 1.3 quotes `agents/` at 7,402. The pinned baseline is **7,425**, measured at `cd0ea72` — after phase `inventory`'s own edits to `agents/architect.md` (`task-009`'s corrected design-grounding snippet) landed. `docs/post-trim-measurement.md` compares like for like against `cd0ea72`; 7,425 is the number to use.

Both totals **miss** their Architecture-derived targets (≤6,100 and ≤5,450). This is correct behaviour, not an unfinished task. The Plan's row 3.14 mandates *adjusting the target rather than over-cutting to hit a number*, and `task-033` recorded per-metric floor evidence in `docs/post-trim-measurement.md`:

| Metric | Baseline | Post-trim | Original target | Recommended revision |
|---|---|---|---|---|
| `agents/` words | 7,425 | **6,678** | ≤6,100 | ≤6,700 |
| `commands/` words | 6,407 | **5,785** | ≤5,450 | ≤5,800 |
| `specmanager-build.md` words | 2,411 | **2,025** | ≤1,700 | ≤2,050 |
| `Don't` bullets, 16 files | 81 | **62** | ≤50 | ≤62, revisit |
| `Don't` bullets, `build.md` | 19 | **10** | ≤10 | **met exactly** |
| Registered selftests | 12 | **14** | 14 | **met** |

`task-033` draws a distinction the reviewer endorsed and that matters for whoever picks this up: the three word-count misses are blocked by `min == max` invariant floors — the prose is load-bearing and cannot be cut further without a `min` firing. The 16-file `Don't` count (62 vs 50) is **not** floor-blocked; the `Don't`-bullet count isn't itself an `INV-*` entry, and no trim task ever targeted the four agent files whose lists are unchanged (`architect.md` 4, `designer.md` 6, `prd-writer.md` 4, `walkthrough-writer.md` 7). That one is deferrable scope, not an unreachable target.

### 3.2 `Don't` bullets: 81 → 62 overall, 19 → 10 in `build.md`

```bash
cd plugins/specmanager && tot=0
for f in agents/*.md commands/*.md; do tot=$((tot + $(awk '/^- Don.t/{c++} END{print c+0}' "$f"))); done
echo "total=$tot  build=$(awk '/^- Don.t/{c++} END{print c+0}' commands/specmanager-build.md)"
```

Expected: `total=62  build=10`

`agents/reviewer.md` went 4 → **0**, not 4 → 1: `task-021` replaced its four write-forbidding bullets with a single non-`Don't` contract line, so they left the bullet count entirely.

```bash
grep -n 'parent alone advances the card' plugins/specmanager/agents/reviewer.md
```

Expected: `38:**You return a verdict; the parent alone advances the card.**`

Read-only is enforced by the agent's `tools:` frontmatter, so the bullets restated a guarantee the harness already makes. `task-021` cut them only after verifying the surviving statements existed earlier in the file, and watched `INV-23` drop 6 → 4 (floor `min: 2`) and `INV-24` 2 → 1 (floor `min: 1`) without firing.

### 3.3 R1 — the `sync_claude_md` step is gone from the six drafting commands

```bash
cd plugins/specmanager && grep -rln 'sync_claude_md' commands/
```

Expected exactly two files:

```
commands/specmanager-build.md
commands/specmanager-init.md
```

`-prd`, `-architecture`, `-design`, `-plan`, `-walkthrough`, `-interview` no longer mention it. `startClaudeMdAutoSync` (`server/src/mcp.ts`) already fires on the subagent's own `create_document`, so the step was instructing the model to do what `core` does unconditionally. The two survivors are deliberate: `build.md` carries the user-facing three-option sync `AskUserQuestion`, and `init.md` carries marker prose.

### 3.4 R3 — the density contract survives as **two** sentences at four sites

```bash
cd plugins/specmanager && grep -rc 'Reference upstream docs by id' agents/ | grep -v ':0'
```

Expected:

```
agents/prd-writer.md:1
agents/architect.md:1
agents/planner.md:1
agents/walkthrough-writer.md:1
```

**This is the phase's clearest evidence that the safety net worked as designed.** Phase `inventory` *predicted in writing* that this would go red: `docs/prompt-invariants-reconciled.md` adjudication #2 records `INV-29` (`min: 4`) as contingent, because the Plan's row 3.3 survivor was a single sentence that dropped "Reference upstream docs by id — never restate their content" — a token-budget rule with no other statement site in any of the four agents. The reconciliation's recommendation was explicit: widen the Plan's survivor to two sentences, and *"`INV-29`'s `min: 4` will fail loudly at row 3.12 if the Plan isn't amended and the trim proceeds as currently worded — that's the guard doing its job, not a bug."*

`task-020` widened the survivor to two sentences. `INV-29` never fired. The guard was the instruction, not an obstacle.

### 3.5 R8/Q2 — `architect.md`'s Context7 ladder is one paragraph, with both required clauses intact

```bash
cd plugins/specmanager && grep -o 'note the library and version you consulted' agents/architect.md
grep -c 'mcp.json' agents/architect.md
```

Expected: the phrase echoed once, then `1`.

`task-024` took `architect.md` 1,085 → 892 words, dropping raw `curl` endpoints, `libraryId` path syntax, Bearer-token instructions and 429 handling. Two things had to survive and did:

- **`INV-28` (`min: 1`)** — the second contingency `inventory` predicted. The guarded phrasing matters: `INV-28`'s pattern is the literal string `note the library and version you consulted`. The Architecture's suggested wording ("*Cite* the library…") would not have matched, and the check would have gone red on a compression that lost nothing. `task-024` used the phrasing the invariant pins.
- **The "do not add Context7 to `.mcp.json`" constraint** — repo policy, not lookup mechanics.

### 3.6 R5/R6/Q1 — `build.md` step 7b is one tool call

```bash
cd plugins/specmanager && grep -n 'get_spec_slice' commands/specmanager-build.md
```

Expected: one hit at step 7b's first bullet, reading `get_spec_slice({ featureId, phase })` and naming the returned envelope `{ planSection, tasks, architecture: [{ ref, heading, body }], unresolvedRefs, fallbackUsed }`.

```bash
grep -c 'unresolvedRefs' commands/specmanager-build.md
```

Expected: `2` — the envelope shape, plus the provenance bullet that instructs the operator never to swallow the signal (a non-empty `unresolvedRefs` means a drifted anchor; `fallbackUsed: true` means sections were name-matched rather than explicitly named).

**`build.md` grew by 12 words during `task-031`, defensibly.** The step-7b prose collapse saved 9 net (117 words of manual assembly instructions → 108 words of the `get_spec_slice` call plus the provenance bullet), while step 6b's mandated re-map rationale added ~30. The return on moving that assembly algorithm into `core` was banked as **correctness, not tokens**: the tool resolves anchors and reports drift, where the prose version silently handed the reviewer a thinned slice it would pass for lack of anything to check.

Step 6b survived by explicit user decision (2026-08-11), with only its pre-filled defaults re-pointed:

```bash
grep -n 'cheap → `sonnet`' commands/specmanager-build.md
```

Expected: one hit in step 6b, giving the table `cheap → sonnet` (complexity 1), `standard → sonnet` (2), `strong → opus` (3 and anything >3/unscored), with the reason stated inline — Haiku 4.5's 200K context cap is a correctness cliff on a large repo, not a cost preference.

### 3.7 `Task(` → `Agent(` in `build.md` only

```bash
cd plugins/specmanager && echo "build.md Task(: $(grep -c 'Task(' commands/specmanager-build.md)  Agent(: $(grep -c 'Agent(' commands/specmanager-build.md)"
grep -rl 'Task(' commands/ agents/
```

Expected:

```
build.md Task(: 0  Agent(: 4
commands/specmanager-walkthrough.md
agents/builder.md
commands/specmanager-plan.md
```

Three files still carry `Task(`, and three more carry "Use the `Task` tool" prose (`-prd.md`, `-design.md`, `-architecture.md`) — six occurrences, matching the Plan's out-of-scope estimate. `Task(...)` still works as an alias, so this is cosmetic-priority and deliberately queued as a separate one-line-per-file pass; interleaving a rename with a trim would inflate exactly the diffs that most need review.

### 3.8 Only `max` values moved — never a `min`

```bash
git show 93e3d6c -- plugins/specmanager/server/src/selftest-prompts.ts | grep -E '^[-+].*\bmin:'
```

Expected: **no output.** `task-032` re-pointed 11 `max` values post-trim and touched zero `min` lines.

This is the invariant that makes the whole phase reversible-by-diagnosis: a dropped invariant fails on `min` and must be **restored**, never accommodated by lowering the floor; an untrimmed duplicate fails on `max`. Floors stopped over-cutting repeatedly and specifically — `task-026` and `task-031` both reported halting at `min == max`, and `task-028` stopped at exactly 10 `build.md` bullets, **declining two numerically-eligible cuts** because `checkGate` has only one statement site and the drafting agents inherit `set_status`.

### 3.9 R9 — `CLAUDE.md`'s staleness line and selftest block are correct

```bash
grep -n 'does \*\*not\*\* cascade staleness' CLAUDE.md
grep -cE '^npm run (selftest|smoke)' CLAUDE.md
```

Expected: one hit on the staleness bullet — it now reads *"on any `approved→draft` transition (`propagateStale`, `core/status.ts`)"* and states positively that *"a write to an already-`approved` doc does **not** cascade staleness; it only bumps `version` and leaves dependents unflagged"* — followed by `14`.

The deleted clause was simply false: `stale: true` is assigned only in `propagateStale` (`core/status.ts`), whose sole caller is guarded by `prev === "approved" && next === "draft"`; `writeDocument` spreads `...current.frontmatter` and never touches `status`/`stale`. Documentation fix only — no behaviour change (a PRD non-goal).

```bash
cd plugins/specmanager/server && node -e "const s=require('./package.json').scripts;const k=Object.keys(s).filter(n=>/^(selftest|smoke)/.test(n));console.log(k.length)"
```

Expected: `14`

### 3.10 The full no-regression chain

Run the exit test verbatim, from the repo root:

```bash
cd /Users/joan/Documents/projects/specmanager/plugins/specmanager/server && npm run build && npm run selftest && npm run selftest-board && npm run selftest-phases && npm run selftest-build && npm run selftest-tiers && npm run selftest-stopgate && npm run selftest-roundtrip && npm run selftest-pidfile && npm run selftest-shutdown && npm run selftest-autoport && npm run selftest-repos && npm run smoke-mcp && npm run selftest-specslice && npm run selftest-prompts && cd ../../.. && claude plugin validate plugins/specmanager
```

Expected: all 14 suites exit 0, each ending in its own `All … assertions passed` line, followed by `✔ Validation passed with warnings`. `smoke-mcp` passing is what proves `get_spec_slice` is registered in the **shipped** `dist/`, not merely in `src/`.

Verified green in a bare environment (`env -i`) with ~10 live MCP processes holding ports 4317–4323 — the concurrency and no-env-vars conditions that `55d8ba8` and `b97f50c` made survivable.

---

## 4. Pass criteria

All required.

- [ ] `rm -rf dist && npm run build && git status --porcelain dist/` prints nothing — committed `dist/` matches `src/`.
- [ ] `npm run selftest-prompts` ends `All prompt invariant assertions passed (45 invariants checked: match + mutation).`
- [ ] `wc -w` totals are `agents/` **6,678** and `commands/` **5,785**.
- [ ] `specmanager-build.md` is **2,025** words with exactly **10** `- Don't` bullets; the 16-file total is **62**.
- [ ] `grep -rln sync_claude_md commands/` returns exactly `specmanager-build.md` and `specmanager-init.md`.
- [ ] `Reference upstream docs by id` appears exactly once in each of `prd-writer.md`, `architect.md`, `planner.md`, `walkthrough-writer.md` (`INV-29`, `min: 4`).
- [ ] `architect.md` contains `note the library and version you consulted` (`INV-28`) **and** the `.mcp.json` Context7 policy.
- [ ] `reviewer.md` has zero `- Don't` bullets and the line `**You return a verdict; the parent alone advances the card.**`
- [ ] `build.md` step 7b calls `get_spec_slice({ featureId, phase })` and instructs on both `unresolvedRefs` and `fallbackUsed`; step 6b pre-fills `cheap → sonnet`.
- [ ] `build.md` has 0 `Task(` and 4 `Agent(`.
- [ ] `git show 93e3d6c -- …/selftest-prompts.ts | grep -E '^[-+].*\bmin:'` prints nothing — no `min` was lowered.
- [ ] `CLAUDE.md`'s staleness bullet states that a write to an approved doc does **not** cascade; its build block lists 14 `npm run` selftests and `package.json` registers 14.
- [ ] The full 14-suite chain plus `claude plugin validate plugins/specmanager` exits 0.
- [ ] `docs/post-trim-measurement.md` exists and records per-metric floor evidence plus recommended target revisions.

---

## 5. Deferred / out of scope — expected, not bugs

| Item | Status |
|---|---|
| `agents/` 6,678 vs ≤6,100 · `commands/` 5,785 vs ≤5,450 · `build.md` 2,025 vs ≤1,700 | **Missed by design.** Blocked by `min == max` invariant floors. `task-033` recommends revising the targets to ≤6,700 / ≤5,800 / ≤2,050. The binding metric is the 14-suite gate, which is green. |
| 16-file `Don't` count 62 vs ≤50 | **Deferrable scope, not a floor.** No `INV-*` pins bullet-list format. A future task scoped like row 3.11 but for `architect.md` / `designer.md` / `prd-writer.md` / `walkthrough-writer.md` could close it without a target change. |
| `Task(` in `builder.md`, `-plan.md`, `-walkthrough.md`; "`Task` tool" prose in `-prd.md`, `-design.md`, `-architecture.md` | Deliberately deferred to a separate cosmetic pass. `Task(...)` is still aliased — zero behavioural risk. |
| `SpecSliceTask.notes` is always `null` | Step 7b advertises "task titles + notes", but `Task` (`core/types.ts`) has no `notes` field. `core/spec-slice.ts` documents this inline and keeps the field so the envelope shape needn't change when a `notes` field lands upstream. Reviewer-flagged, unowned. |
| Unreachable `catch` in `getSpecSlice` | The Architecture-doc read is already guarded by a `listDocuments` miss, so its `catch` (`core/spec-slice.ts`) is defensive-only. Reviewer-flagged, unowned. |
| Two of `build.md`'s ten `Don't` bullets duplicate in-step statements | Reviewer advisory. The unknown-alias bullet is **required** by `INV-7`'s `min: 2`; the reviewer-slice bullet is not floor-required and could go. |
| Lifecycle behaviour, UI/board, `reviewer.md` `dimension` parameter, `core/tiers.ts` deletion, `/specmanager-draft` collapse | Out of scope per the Plan. `get_spec_slice` is a pure read that emits no event, so the auto-sync listeners are unaffected. |

### One genuine gap found while verifying this walkthrough

`agents/builder.md:15` still documents the tier table as **`cheap→haiku`**, contradicting `core/tiers.ts` (`cheap: "sonnet"`), `build.md` step 6b, and `CLAUDE.md` — all three of which phase `core` and `task-031` re-pointed correctly.

This site was **predicted and named** during phase `inventory`. `docs/prompt-invariants-derived.md` records: *"Three prompt sites carry the literal `haiku` today (`builder.md:15`, `specmanager-build.md:23`, `:26`) and **all three must be updated by `task-031`** to stay consistent with `core/tiers.ts`."* `task-031`'s scope was `build.md` only, so two of three were closed and `builder.md:15` was not.

`INV-21` cannot catch it: adjudication #1 deliberately made that pattern **structural and value-agnostic** (three tiers named, `>3`/unscored ⇒ `strong`), precisely so it wouldn't go red at `task-007`'s re-map and read as a false over-trim. The consistency invariant the derivation recommended — *"the prompts' stated defaults must match `core/tiers.ts`"* — was never added.

Impact is documentation-only: the parent reads step 6b and `core/tiers.ts`, both correct, so dispatch behaviour is right. But a builder agent reading its own prompt is told the wrong default. One-line fix, plus the missing invariant.

---

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `selftest-prompts` fails on **`min`** | An invariant's statement was deleted. The failing `INV-*` id names it. | **Restore the statement.** Never lower the `min` — that converts a caught regression into a silent one. |
| `selftest-prompts` fails on **`max`** | A de-duplication didn't land, or a `max` wasn't re-pointed after a trim. | Either finish the de-dup or lower that entry's `max` to the measured count (`task-032`'s pattern). |
| `claude plugin validate` → `File not found: …/server/plugins/specmanager` | Run from `server/` instead of the repo root; the path is relative. | `cd` to the repo root first. |
| `claude plugin validate` reports a real error after a prompt edit | A trim broke a command's YAML frontmatter. | Check the edited file's `---` block — `description:` and `argument-hint:` are the slash-menu discovery surface. |
| `/specmanager-build` step 7b: "tool not found: `get_spec_slice`" | Session predates phase `core`'s build; MCP tool list is stale. | `/mcp` reconnect, or restart `claude` (the reliable fix). |
| `selftest-board` / `-autoport` / `-roundtrip` / `-shutdown` fail with `EADDRINUSE` or a bad root | Pre-`55d8ba8`/`b97f50c` binaries — those suites assumed a free 4317 and env-supplied root. | Ensure both commits are present and `dist/` is rebuilt. |
| `smoke-mcp` passes but `get_spec_slice` is missing at runtime | `dist/` stale relative to `src/`. | `rm -rf dist && npm run build`, commit the result. |
| The reviewer passes a phase suspiciously fast | `unresolvedRefs` was non-empty and ignored — the slice was thinned to nothing. | Step 7b now surfaces this; fix the anchors with `set_phase_meta`. |

---

## 7. What ships next

`trim` is the **third and last** phase of `feat-opus-5-readiness` (`inventory` → `core` → `trim`), but it is **not** the terminal artifact. This is a multi-phase feature, so a **feature-level roll-up walkthrough (`phase: "final"`) is still due** once all three per-phase walkthroughs are approved. That roll-up — not this document — verifies the PRD's success metrics and ships the feature.

Nothing further is planned inside this feature. The queued follow-ons, none of them blocking:

1. Fix `agents/builder.md:15`'s stale `cheap→haiku` and add the prompts-match-`core/tiers.ts` consistency invariant that `inventory` recommended.
2. The `Task(` → `Agent(` cosmetic pass across the remaining six occurrences.
3. A `Don't`-list reduction task for the four untouched agent files, if the ≤50 target is kept.
4. Give `SpecSliceTask.notes` a real source, or drop the field from step 7b's advertised contract.
