---
id: wt-opus-5-readiness-020
featureId: feat-opus-5-readiness
stage: walkthrough
status: approved
stale: false
title: Opus 5 readiness — Phase core walkthrough
dependsOn:
  - plan-opus-5-readiness-017
basedOn:
  plan-opus-5-readiness-017: 2
generatedBy: agent
version: 1
phase: core
createdAt: '2026-08-12T13:32:08.927Z'
updatedAt: '2026-08-12T14:45:35.778Z'
---
# Opus 5 readiness — Phase core walkthrough

Phase `core` ships the three code changes of this feature: a new `core/spec-slice.ts` + `get_spec_slice` MCP tool (R6), the `DEFAULT_TIER_TO_ALIAS.cheap → "sonnet"` re-map (Q1), and the deletion of the Stop-gate's rung-3 probe ladder (Q5). No prompt file is trimmed here — that is `trim`. The point of stopping at this boundary is diagnostic: `matchPhaseHeading` moving out of `active-card.ts` is the single edit in this feature that can break the Stop-gate, and it is verified before sixteen prompt files start changing underneath it.

> **Exit test:** `cd plugins/specmanager/server && npm run build && npm run selftest && npm run selftest-phases && npm run selftest-build && npm run selftest-specslice && npm run selftest-stopgate && npm run selftest-tiers && npm run smoke-mcp`

**What you should already have:** phase `inventory` landed (`selftest-prompts` registered and green, `docs/agent-snippets/` corrected) and its walkthrough approved. Commits `a875c14..47f122a` on `main`.

---

## 0. Prerequisites

| | |
|---|---|
| OS | macOS (verified on 26.2); nothing here is platform-specific except `lsof` in §6 |
| Runtime | Node ≥20 (`package.json` `engines`); verified on **v25.6.1** / npm **11.9.0** |
| Repo | `/Users/joan/Documents/projects/specmanager`, branch `main`, at or after `47f122a` |
| Deps | `plugins/specmanager/server/node_modules` present (`npm install` in that dir if not) |
| Seed data | None. Every check runs against either a tmp dir the selftest creates, or this repo's own `.claude/specs/` |

Nothing in this phase writes to `.claude/specs/`. `get_spec_slice` is a pure read and emits no `core` event, so neither `startClaudeMdAutoSync` nor `startDesignMdAutoSync` fires.

---

## 1. Build

```bash
cd plugins/specmanager/server
npm run build
npm run selftest && npm run selftest-phases && npm run selftest-build \
  && npm run selftest-specslice && npm run selftest-stopgate \
  && npm run selftest-tiers && npm run smoke-mcp
```

`npm run build` is `tsc -p tsconfig.json` and prints nothing on success. The seven suites are hand-rolled scripts, not a test runner — each prints one `ok — …` line per assertion and a summary. `selftest` emits several `specmanager: skipping unparseable doc …/design/rogue.html` blocks with a zod error dump; **that is a deliberate fixture** proving `buildManifest` survives a frontmatter-less file, not a failure.

New assertions this phase adds — grep for these specific lines:

| Suite | New expected lines | Total |
|---|---|---|
| `selftest-specslice` | whole suite is new — `ok — id-token ref R6 resolves to one section`, `ok — all-refs-unresolved triggers the fallback (spec: \`### Fallback behaviour\`)`, `ok — notes is null until core/types.ts Task grows a notes field`, … ending `All R6 spec-slice assertions passed.` | **58** assertions |
| `selftest-stopgate` | `ok — absent testCommand + runnable exit test → rung 2 runs it and its failure gates` · `ok — no command is inferred from a project-root package.json (probe ladder deleted)` · `ok — absent testCommand + prose exit test + all tasks done → exit 0` (+4 more) | **25** (7 new) |
| `selftest-tiers` | `ok — cheap → sonnet (Q1: Haiku 4.5's 200K context cap)` replaces the old `cheap → haiku` | 17 |
| `smoke-mcp` | `ok — tools/list returned 28 tools` then `ok — all 18 tools registered` (`expected` grew by `get_spec_slice`) | 3 |

**If any of these fail, stop here.** Everything below assumes a green chain.

---

## 2. Install / run

The code is live in the committed `dist/`, but **a `claude` session started before this build is running the old MCP process**. To exercise `get_spec_slice` interactively:

```bash
claude plugin validate plugins/specmanager      # optional; not in this phase's exit test
```

Then, inside Claude Code:

```
/plugin marketplace update specmanager
/plugin install specmanager@specmanager
/reload-plugins
/mcp                                            # reconnect the specmanager server
```

Expected: the `specmanager` server reconnects and its tool list now contains `get_spec_slice` alongside `get_phase_completion`. Until it does, an interactive call returns *tool not found* — see §6.

Checks §3.1–§3.7 below need none of this; they run straight off `dist/`.

---

## 3. Phase `core` exit checks

### 3.1 The exit test runs green, verbatim

```bash
cd plugins/specmanager/server && npm run build && npm run selftest && npm run selftest-phases \
  && npm run selftest-build && npm run selftest-specslice && npm run selftest-stopgate \
  && npm run selftest-tiers && npm run smoke-mcp
```

Expected tail:

```
ok — initialize handshake
ok — tools/list returned 28 tools
ok — all 18 tools registered
```

with `All Phase 1 assertions passed.` / `All Phase 7.A assertions passed.` / `All Phase 7.B assertions passed.` / `All R6 spec-slice assertions passed.` / `All R1 Stop-gate assertions passed.` / `All R2 tier assertions passed.` appearing above it, and exit status 0.

### 3.2 `get_spec_slice` is in the *shipped* `dist/`, not just the source

```bash
grep -c get_spec_slice plugins/specmanager/server/dist/mcp.js   # → 1
git status --porcelain plugins/specmanager/server/dist          # → (empty)
```

`smoke-mcp`'s `expected` array is a **subset** check (18 names against 28 registered), so this is what proves the tool actually ships: a source-only commit would leave `dist/mcp.js` without it and `smoke-mcp` would print `missing tools: get_spec_slice`. Registration lives at `mcp.ts:400–407`, modelled on `get_phase_completion`: zod `{ featureId, phase }`, `ok(...)` envelope, root from `PROJECT_DIR`.

### 3.3 R6 demonstrated, not asserted — the phase assembles its own review slice

This is the check worth running by hand. `getSpecSlice` was built to replace the prose-derived slice assembly in `commands/specmanager-build.md` step 7b; the slice that reviewed *this phase* was produced by the function this phase built.

```bash
cd /Users/joan/Documents/projects/specmanager
SPECMANAGER_PROJECT_DIR=$PWD node --input-type=module -e "
import { getSpecSlice } from './plugins/specmanager/server/dist/core/spec-slice.js';
const s = await getSpecSlice('feat-opus-5-readiness','core', process.env.SPECMANAGER_PROJECT_DIR);
console.log(JSON.stringify({
  planSectionFirstLine: s.planSection.split('\n')[0],
  taskCount: s.tasks.length,
  notesAllNull: s.tasks.every(t => t.notes === null),
  archRefs: s.architecture.map(a => a.ref),
  unresolvedRefs: s.unresolvedRefs,
  fallbackUsed: s.fallbackUsed
}, null, 2));"
```

Expected, exactly:

```json
{
  "planSectionFirstLine": "## Phase core — `get_spec_slice` extraction, tier re-map, Stop-gate rung-3 deletion",
  "taskCount": 9,
  "notesAllNull": true,
  "archRefs": ["core-spec-slice","R6","R7","Q1","Q5","interfaces","sequence-flow","failure-edge-cases"],
  "unresolvedRefs": [],
  "fallbackUsed": false
}
```

**8/8 refs resolved, nothing unresolved, no fallback.** `core-spec-slice`, `interfaces`, `sequence-flow` and `failure-edge-cases` resolve by kebab-slug; `R6`, `R7`, `Q1`, `Q5` by id-token. The 9 tasks are `task-006/007/008/012/014/016/017/027/030`.

Note the boundary: `specmanager-build.md` step 7b still describes the assembly in prose — rewriting it to *call* this tool is `task-031` in `trim`.

### 3.4 The fallback conforms to the Architecture's `### Fallback behaviour`

`task-016` (`94c904b`) deliberately implemented only half the spec'd trigger — fallback on *empty* refs, but not when every named ref failed to resolve — and pinned the deviation in a header comment plus `DEVIATION`-named assertions. The reviewer failed the phase on it. Fix `47f122a` conformed the code.

```bash
cd plugins/specmanager/server
npm run selftest-specslice 2>&1 | grep -iE "fallback|unresolved"
```

Expected (abridged, all present):

```
ok — all-refs-unresolved triggers the fallback (spec: `### Fallback behaviour`)
ok — the mistyped ref is still surfaced when the fallback fires
ok — every named ref unresolved ⇒ fallbackUsed, even with a live Architecture doc
ok — the all-unresolved fallback reaches matchHeadingsByPhaseName and returns its match
ok — the fallback keeps every failed ref in unresolvedRefs
ok — a partially-resolved ref list never falls back
ok — a missing Architecture doc does not set fallbackUsed (nothing to name-match)
```

The load-bearing line in `core/spec-slice.ts` (~L259) is `fallbackUsed = unresolvedRefs.length === refs.length;` — resolve first, then fall back only when *every* ref missed, with `unresolvedRefs` left populated either way. That is why the deviation was wrong rather than merely different: under the spec'd behaviour a drifted anchor **still** lands in `unresolvedRefs` **and** `fallbackUsed: true` marks the sections as name-matched. Both signals survive; the deviation bought conservatism, not visibility, at the price of code, Architecture and test knowingly disagreeing — the drift the repo's staleness rule exists to prevent. The rationale for it came from the orchestrating session's instruction, not the builder's own judgement.

Three behaviours must stay distinguishable — confirm all three appear:

| Case | `architecture[]` | `unresolvedRefs` | `fallbackUsed` |
|---|---|---|---|
| Refs named, all resolve | the named sections | `[]` | `false` |
| Refs named, *some* resolve | the resolved sections | the missed ones | `false` |
| Refs named, *none* resolve | name-matched sections (or `[]`) | **all of them** | `true` |
| No refs named | name-matched sections (or `[]`) | `[]` | `true` |
| Architecture doc missing/unreadable | `[]` | all refs | `false` |

### 3.5 Tier re-map: `cheap → sonnet`

```bash
cd plugins/specmanager/server && npm run selftest-tiers | grep -E "cheap|standard|strong|dated"
```

Expected:

```
ok — complexity 1 → cheap
ok — complexity 2 → standard
ok — complexity 3 → strong
ok — cheap → sonnet (Q1: Haiku 4.5's 200K context cap)
ok — standard → sonnet
ok — strong → opus
ok — default aliases carry no dated ids
ok — session override remaps cheap → sonnet
```

`core/tiers.ts` and `selftest-tiers` are **kept and updated, never deleted** — deletion was Q1 option (c), which was rejected; the PRD's "tier machinery removed" metric row does not apply. `aliasForTier`'s `sessionTable` parameter stays wired because build step 6b still returns a table, so it is a live code path, not a dormant seam. Complexity→tier is unchanged; only the tier→alias value moved.

### 3.6 Stop-gate rung 3 is gone, rung 2 survives

```bash
grep -c probe_test_command plugins/specmanager/hooks/stop-gate.sh   # → 0
sed -n '75,95p' plugins/specmanager/hooks/stop-gate.sh
```

Expected: the `Resolve the command to run` block keeps three branches — `testCommand == "none"` ⇒ skip the run; `testCommand` present ⇒ run it; **absent** ⇒ fall back to the phase's `**Exit test:**` line *only if* it contains `npm `/`uv `/`cargo `. Nothing else is probed.

```bash
cd plugins/specmanager/server && npm run selftest-stopgate | grep -E "rung|inferred|prose"
```

Expected:

```
ok — rung-2 feature has no meta.phases entry (testCommand absent)
ok — absent testCommand + runnable exit test → rung 2 runs it and its failure gates
ok — stderr names the exit-test line rung 2 resolved
ok — absent testCommand + prose exit test → open tasks still gate
ok — no command is inferred from a project-root package.json (probe ladder deleted)
ok — absent testCommand + prose exit test + all tasks done → exit 0
```

Rung 2 stays because 12 of 16 plans have no `meta.phases` and all 12 carry a `**Exit test:**` line. Rung 3 had zero coverage before this phase; the deletion ships with 7 new assertions over the path it used to shadow. Note the deletion landed *while the Stop-gate was armed on this very build* — safe only because phase `core` has an explicit `testCommand`, so rung 3 was never on its path.

### 3.7 One phase-heading parser, one place

```bash
grep -rn 'Phase\\s' plugins/specmanager/server/src/core/*.ts | grep -v spec-slice.ts   # → (empty)
grep -n 'matchPhaseHeading' plugins/specmanager/server/src/core/active-card.ts
```

Expected: the regex `/^##\s+Phase\s+([^\s—-]+)/i` exists **only** in `core/spec-slice.ts:23`; `active-card.ts` imports it (`import { matchPhaseHeading } from "./spec-slice.js";`) and `exitTestForPhase` calls it. Pure refactor — same regex, same returned value (name as written), same case-insensitive comparison at the call site.

Re-run the equivalence check the task did:

```bash
grep -hcE "^##\s+Phase\s+" .claude/specs/features/*/plan/plan.md | paste -sd+ - | bc   # → 33
ls .claude/specs/features/*/plan/plan.md | wc -l                                       # → 17
```

`2bdf05b`'s message records **33 phase headings across 16 `plan.md` files** plus 8 synthetic edge cases, 0 diffs against the old inline regex. Re-measured today the heading count is still 33; the file count is 17 (one plan has been added since). Total plan corpus is 1,614 lines today — the build-time note of "1,631" is stale by the same drift.

### 3.8 The registered test-script count is 14

```bash
node -e "console.log(Object.keys(require('./plugins/specmanager/server/package.json').scripts).filter(k=>k!=='build').join('\n'))" | wc -l   # → 14
```

Expected 14: 13 `selftest-*` plus `smoke-mcp`. `selftest-specslice` is the one this phase adds (13 → 14). `CLAUDE.md`'s build/test block still lists only 10 runnable scripts — it omits `selftest-autoport`, `selftest-repos`, `selftest-prompts` and `selftest-specslice`. Correcting it is `task-029` in `trim`; **it is not a defect of this phase.**

---

## 4. Pass criteria

All required.

- [ ] `npm run build` completes with no TypeScript output, and `git status --porcelain plugins/specmanager/server/dist` is empty (§3.2)
- [ ] The seven-suite exit test runs green end to end, exit 0 (§3.1)
- [ ] `dist/mcp.js` contains `get_spec_slice`; `smoke-mcp` prints `28 tools` / `all 18 tools registered` (§3.2)
- [ ] `getSpecSlice('feat-opus-5-readiness','core')` returns 8 architecture sections, `unresolvedRefs: []`, `fallbackUsed: false`, 9 tasks, and the phase's own plan heading (§3.3)
- [ ] All seven fallback/unresolved assertions in §3.4 print `ok —`, and the trigger in `core/spec-slice.ts` is `unresolvedRefs.length === refs.length` (§3.4)
- [ ] `selftest-tiers` shows `cheap → sonnet`, `standard → sonnet`, `strong → opus`, and `no dated ids`; `core/tiers.ts` and `selftest-tiers` both still exist (§3.5)
- [ ] `grep -c probe_test_command plugins/specmanager/hooks/stop-gate.sh` returns 0 while the rung-2 `**Exit test:**` branch is intact, with all six §3.6 assertions green
- [ ] The phase-heading regex appears exactly once in `core/`, in `spec-slice.ts`, and `active-card.ts` imports it; 33 headings re-measured across the repo's plans (§3.7)
- [ ] `package.json` registers 14 test scripts including `selftest-specslice` (§3.8)

---

## 5. Deferred / out of scope — expected, not a bug

| Observation | Why |
|---|---|
| `specmanager-build.md` step 7b still assembles the slice in prose; nothing calls `get_spec_slice` yet | `task-031`, phase `trim`. The tool ships first so the rewrite has something to call. |
| `CLAUDE.md`'s build/test block lists 10 scripts, not 14 | `task-029`, phase `trim`. |
| No prompt file shrank; `Don't` lists are still at their baseline lengths | The entire trim is phase `trim` (`task-018`…`task-034`). |
| `SpecSliceTask.notes` is always `null` | `Task` in `core/types.ts` has no `notes` field — even though step 7b's prose promises "task titles + notes". The field is kept in the envelope rather than dropped so its shape need not change when `notes` lands upstream. **Neither phase owns closing this**; recorded here so it is not rediscovered as a bug. |
| The `catch` branch in `getSpecSlice` (Architecture doc listed but unreadable) has no selftest | Unreachable from the tmp-dir harness, so a mutation there survives. Recorded gap; neither phase owns it. |
| `selftest-board`'s pidfile leg, `selftest-shutdown`, `selftest-autoport` fail on this machine | Pre-existing and environmental — live `specmanager` MCP processes hold ports **4317–4323** (7 boards). Outside this phase's exit test; the full 14-suite chain is `trim`'s exit test. |
| Reviewer read-only, gates, staleness, walkthrough semantics unchanged | The feature's PRD non-goal: no lifecycle behaviour change. |

---

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `get_spec_slice`: *tool not found* in an interactive session | The running MCP process predates the build; registration lives in the newly committed `dist/mcp.js` | `/mcp` reconnect, or `/plugin marketplace update specmanager` → `/plugin install specmanager@specmanager` → `/reload-plugins`. A full `claude` restart is the reliable fix if reconnect fails. §3.3's `node --input-type=module` check bypasses this entirely. |
| `smoke-mcp` → `missing tools: get_spec_slice` | `dist/` not rebuilt after a source edit | `npm run build`, then commit `dist/` — the plugin ships compiled output |
| `selftest-specslice` → `Cannot find module …/core/spec-slice.js` | Same: source-only state | `npm run build` |
| `selftest-board` / `-shutdown` / `-autoport` fail with `EADDRINUSE` or a port assertion | Live boards from other `claude` sessions hold 4317+ | `lsof -nP -iTCP:4317-4325 -sTCP:LISTEN`; close the other sessions or accept it — not in this phase's exit test |
| `selftest` prints a zod error dump about `design/rogue.html` | Intentional fixture for "manifest survives a frontmatter-less doc" | Ignore; the next line is `ok — buildManifest survives a frontmatter-less doc file` |
| Stop-gate keeps returning exit 2 during an unrelated build | Not this phase — `resolveActiveCard` returns `null` with no marker, so the gate is a strict no-op outside an in-flight build | Check `.claude/specs/.cache/active-build.json` |
| A slice comes back with `fallbackUsed: true` and a full `unresolvedRefs` list | Every `architectureRef` for that phase drifted from the Architecture's headings | Fix the anchors via `set_phase_meta`; this is the signal working, not a bug |

---

## 7. What ships next (preview)

Phase `trim` — prose deletion across 16 prompt files plus the `specmanager-build.md` rewrite (`task-018`…`task-034`, 31 points), guarded by `selftest-prompts`' `min`/`max` pairs from phase `inventory`.

Carry-forward specific to this phase's output:

- **`task-031`** rewrites step 7b into a single `get_spec_slice({ featureId, phase })` call, and re-points step 6b's pre-filled tier defaults at the new table (`cheap → sonnet`, `standard → sonnet`, `strong → opus`). **Step 6b stays** — a user decision on 2026-08-11, overruling an earlier draft that deleted it.
- **`INV-28`/`INV-29` in `selftest-prompts` are expected to go red during `trim`** — those are the `max` values the trim tasks lower. A red there is the guard working; a red on a `min` means an invariant was over-trimmed and must be restored, never a lowered `min`.
- **`task-029`** corrects `CLAUDE.md`'s selftest block to all 14 and drops the "or write to an approved doc" clause from its staleness line.
- The `final` roll-up comes after `trim`'s walkthrough is approved. This feature has three phases, so `phase: "final"` applies; this document is not terminal.

---

## Appendix — what landed

| Task | Commit | Change |
|---|---|---|
| 006 | `2bdf05b` | `core/spec-slice.ts` created; `matchPhaseHeading` moved out of `active-card.ts` and imported back |
| 007 | `a875c14` | Q1 — `DEFAULT_TIER_TO_ALIAS.cheap → "sonnet"`; `selftest-tiers` updated |
| 008 | `663214f` | Q5 — `probe_test_command` + call site deleted; 7 new absent-`testCommand` stopgate assertions |
| 012 | `626700a` | Anchor resolution — `idToken`, `kebabSlug`, `indexHeadings`, `resolveArchitectureRefs` |
| 014 | `7ba21cd` | `planSectionFor`, task assembly, the `SpecSlice` envelope, `getSpecSlice` |
| 016 | `94c904b` | Fallback path — `matchHeadingsByPhaseName`, `fallbackUsed` |
| 017 | `2f66851` | `core/index.ts` export, `get_spec_slice` MCP registration, `smoke-mcp` `expected` |
| 027 | `27af887` | `selftest-specslice.ts` — 53 assertions; script registered (13 → 14) |
| 030 | `3e78c9f` | Rebuilt `dist/` committed |
| *fix* | `47f122a` | Fallback trigger conformed to the Architecture after the reviewer's `fail`; suite 53 → **58** assertions |

**Mutation testing is the house standard for this feature.** `task-027` proved its assertions bite by mutating the compiled module 6 ways (6 reds); the fix met the same bar; the reviewer then ran 5 mutations of its own rather than trusting either report.

*Corrections against the build-time notes, re-measured while writing this: `task-008`'s commit is `663214f` (it was recorded as absent); `selftest-specslice` carries **58** assertions today, not 53 — `47f122a` added 5; `selftest-stopgate` gained **7** assertions, not 2 cases' worth of 2, and now totals 25; the repo's plan corpus is **1,614** lines across **17** `plan.md` files, not 1,631 across 16 — the 33-heading count is unchanged; and the ports held by live boards are **4317–4323**, not 4317–4321.*
