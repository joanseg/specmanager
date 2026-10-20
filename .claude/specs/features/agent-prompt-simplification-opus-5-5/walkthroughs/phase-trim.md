---
id: wt-agent-prompt-simplification-opus-5-5-026
featureId: feat-agent-prompt-simplification-opus-5-5
stage: walkthrough
status: draft
stale: false
title: Agent prompt simplification (Opus 5.5) — Phase trim walkthrough
dependsOn:
  - plan-agent-prompt-simplification-opus-5-5-023
basedOn:
  plan-agent-prompt-simplification-opus-5-5-023: 2
generatedBy: agent
version: 1
phase: trim
createdAt: '2026-10-20T15:24:00.639Z'
updatedAt: '2026-10-20T15:24:00.639Z'
---
## Stakeholder test guide

This phase made SpecManager's instructions to Claude shorter, without removing any rule. Nothing looks different on screen. What you are checking is that Claude still does everything it did before, and that the bookkeeping proving this is sound.

**Happy path: read the two proof files**

1. Open `docs/verification/prompt-simplification-ledger.md` in the repo. Near the top there is a "Totals" table. You should see that the instructions went from **16,248 words to 14,775** (about 9% shorter), and the number of "Don't…" / "Never…" lines went from **71 to 56**. The last column should say **49 / 49 = 100%**: every rule that was cut still lives somewhere else, and the row names where.
2. Scroll to any file section under "Removals per file" and pick a row. The "Surviving carrier" column should name a real place (another file and section, or a piece of program code). Open that place and check the rule is really there.
3. Open `docs/verification/prompt-simplification-dogfood.md`. This is the before/after test: the same small made-up project was run through SpecManager once with the old instructions and once with the new ones. In the "Checklist" table, items 1–8 should say **Met** in both the "Before" and "After" columns. **Please review this file yourself.** The builder filled in both columns, so your read is the independent check.
4. Item 9 in that table is a cost signal, not a pass/fail item: the main session read about **5.6% fewer** input tokens after the change. Treat it as a direction only, because the "after" run happened to plan 4 tasks instead of 3.
5. Open the board (`/specmanager:specmanager-board`) and start any small feature as you normally would. Claude should go through the same steps as before: write the PRD, ask for approval, and so on.

**Edge cases**

- **A builder using a skill.** What to try: during a build, watch for the builder using a skill (for example a design skill on a UI task). What should happen: it can now do this. Before this phase it could not, because skills were missing from its allowed tools.
- **One review note to confirm.** What to try: open `plugins/specmanager/commands/specmanager-walkthrough.md`, step 5. A sentence telling Claude how to work out the git strategy when there is no build log was removed there. Then open `plugins/specmanager/agents/walkthrough-writer.md` around line 44. What should happen: the same instruction is there ("Manual run (no build log): derive the branch from the phase commits…"). The reviewer passed this but asked the maintainer to confirm the cut is acceptable.
- **A manual walkthrough.** What to try: run `/specmanager:specmanager-walkthrough` on a finished phase. What should happen: the document still opens with a "Stakeholder test guide" and ends with "Lessons learned" starting with "Git strategy".
- **Old wording.** What to try: search the command files for "the `Task` tool". What should happen: nothing is found. Every place that starts a helper now says "`Agent`".

If something looks different, tell the team what you saw.

---

# Agent prompt simplification (Opus 5.5) — Phase trim walkthrough

Phase `trim` (kind `build`, the only phase, 22 tasks, 36 points) trims redundant prose from the 19 prompt files scoped by the PRD (7 agents, 10 commands, 2 snippets) using the C1–C5 taxonomy and Keep-list from the Architecture. Each cut is logged in a removal ledger with its surviving carrier. `selftest-prompts` `max` values went down where counts dropped. Two small fact fixes landed (Q-B "task notes" wording, the stitch-spec link), and so did one frontmatter change (`Skill` added to the builder allowlist, Q-A). A before/after headless dogfood run is the behavioural gate. Source plan: `plan-agent-prompt-simplification-opus-5-5-023` v2.

> **Exit test:** from `plugins/specmanager/server`, `npm run build && npm run selftest-prompts && npm run selftest-directory && npm run selftest && npm run smoke-mcp` passes. The remaining self-tests and `claude plugin validate plugins/specmanager` (repo root) pass and are recorded in `docs/verification/prompt-simplification-ledger.md`. `docs/verification/prompt-simplification-dogfood.md` shows the *after* run meeting every G4 checklist item that the *before* run met. *(`selftest-shutdown` / `selftest-autoport` can time out on a loaded machine; re-run before calling it a regression.)*

**This phase is terminal:** the feature is single-phase, so approving this walkthrough ships it (`isFeatureShipped`). No `final` roll-up exists.

Before you start you need a checkout of `feat/agent-prompt-simplification` at `e21fce3` or later, Node 20+, and the `claude` CLI logged in.

## 0. Prerequisites

- macOS or Linux, Node 20+, npm, git; `claude` CLI (verification ran on CLI 2.1.285).
- Repo: `feat/agent-prompt-simplification`, stacked on `feat/planner-rewrite` (plugin 1.2.0). Phase commits `9cf228a..e21fce3`, with the spec-only commit `181a9b1` before them. Baseline sha for every before-number: `ad11cd8`.
- For the dogfood harness and headless checks: a logged-in `claude` CLI (prerequisite **pre-1**, granted via `CLI: claude`), and a scratch directory outside the repo.
- No seed data. The harness builds its own scratch project.

## 1. Build

```bash
cd plugins/specmanager && npm ci
cd server && npm ci && npm run build
npm run selftest-prompts
npm run selftest-directory
npm run selftest
npm run smoke-mcp
```

Expected final lines:

- `selftest-prompts` → `All prompt invariant assertions passed (77 invariants checked: match + mutation).`
- `selftest-directory` → `All directory-conformance assertions passed.`
- `selftest` → `All Phase 1 assertions passed.`
- `smoke-mcp` → `ok — all 18 tools registered`
- `git status --short plugins/specmanager/server/dist` → empty (the rebuild leaves no diff under `dist/`).

New behaviour in the suite this phase: three `max` ceilings in `server/src/selftest-prompts.ts` (and `dist/selftest-prompts.js`) were lowered. `min` floors never moved.

| INV | Pattern scope | max before → after | Lowered by |
|---|---|---|---|
| INV-1 | single-phase / no `final` restatements | 8 → 7 → 6 → 5 | task-007, task-013, task-019 |
| INV-19 | "next phase / two phases back-to-back" | 5 → 4 | task-017 |
| INV-23 | reviewer slice-as-contract / whole Architecture doc | 4 → 3 | task-019 |

If any of these fail, stop here.

## 2. Install / run

The plugin under change is a Claude Code plugin, so a reinstall is needed to load the trimmed prompts into a normal session. This phase also does not touch `main`, so install from the branch:

1. Point your marketplace at the branch (see `docs/install-from-branch.md`), then `/plugin marketplace update specmanager` → `/plugin install specmanager@specmanager` → `/reload-plugins`, then reconnect via `/mcp`.
2. Alternatively, load the worktree copy headless: `claude --plugin-dir <repo>/plugins/specmanager --settings '{"enabledPlugins":{"specmanager@specmanager":false}}' …`.

**Reload troubleshooting:** if the commands still show old wording (e.g. "Use the `Task` tool"), the installed copy is stale. Re-run the update and install, then `/reload-plugins`. If `/mcp` reconnect fails, fully restart Claude. In Cursor, newly added commands may not show until Cursor restarts.

## 3. Phase trim exit checks

### 3.1 Exit-test command passes

```bash
cd plugins/specmanager/server
npm run build && npm run selftest-prompts && npm run selftest-directory && npm run selftest && npm run smoke-mcp; echo "exit=$?"
```

Expected: the four final lines from §1, then `exit=0`. This was re-run by the parent at `1e85c75` after task-022 and passed (ledger § Ledger close).

### 3.2 Remaining self-tests and plugin validate are recorded and still pass

```bash
cd plugins/specmanager/server
export CLAUDE_PLUGIN_DATA=$(mktemp -d)   # never reap the session's own board
for t in selftest-board selftest-phases selftest-build selftest-tiers selftest-stopgate selftest-roundtrip selftest-pidfile selftest-shutdown selftest-autoport selftest-repos selftest-specslice; do npm run -s $t | tail -1; done
cd ../../.. && claude plugin validate plugins/specmanager
```

Expected last lines, one per test (as recorded in ledger § Verification results, task-021 at `f3ba60b`):

```
Phase B reap/rebind assertions passed.
All Phase 7.A assertions passed.
All Phase 7.B assertions passed.
All R2 tier assertions passed.
All R1 Stop-gate assertions passed.
PASS — selftest-roundtrip
All Phase A pidfile assertions passed.
All Phase C shutdown assertions passed.
All autoport assertions passed.
All multi-repo declare/seed/render/reconcile + containment assertions passed.
All R6 spec-slice assertions passed.
✔ Validation passed
```

`claude plugin validate` should print no warning. Then confirm the record exists:

```bash
grep -c '| pass |' docs/verification/prompt-simplification-ledger.md
```

Expected: `17` (the build, 15 self-tests and plugin validate).

### 3.3 Ledger totals reproduce with the pinned counting rule

```bash
FILES="plugins/specmanager/agents/{architect,builder,designer,planner,prd-writer,reviewer,walkthrough-writer}.md plugins/specmanager/commands/specmanager-{architecture,board,build,design,init,interview,loop,plan,prd,walkthrough}.md docs/agent-snippets/{design-grounding,lossless-carryover}.md"
eval "cat $FILES" | wc -w
eval "for f in $FILES; do grep -cE '^\s*-\s*(\*\*)?(Don.t|Never)' \$f; done" | paste -sd+ - | bc
```

Expected: `14775` and `56`. At baseline, `git show ad11cd8:<file>` per file gives `16248` and `71`. Per-file before/after numbers are in the ledger § Per-file baseline. The largest cuts were `specmanager-init.md` 884→643, `specmanager-walkthrough.md` 459→329, `specmanager-design.md` 416→279, `planner.md` 1905→1743, `specmanager-build.md` 2683→2528, and `lossless-carryover.md` 193→82.

### 3.4 Every rule-bearing cut names a carrier

Open `docs/verification/prompt-simplification-ledger.md` § Ledger close. Expected: "49 of 49 rows whose Cat names C2, C3 or C5 … name a surviving carrier or `core` enforcement; none says "None". Share **100%**." Spot check: architect row 2 (C5) names `core/spec-slice.ts:resolveArchitectureRefs`, and walkthrough-cmd row 3 (C5) names `server/src/core/dependencies.ts:checkGate`.

### 3.5 Dogfood G4: after meets every item before met

Open `docs/verification/prompt-simplification-dogfood.md` § Checklist. Expected: items 1–8 are **Met** in both columns (before at `ad11cd8`, after at `1e85c75`), and § Verdict says no item failed on either side, so the non-determinism rule was not triggered and no cut was restored. To re-run (costs about $3.6–3.8 per side; loop 29/30 turns, build 33/31 turns):

```bash
docs/verification/dogfood-harness.sh after <head-sha> <scratch-dir>
```

Expected outputs under `<scratch-dir>/after/out/`: `loop.jsonl`, `build.jsonl`, `specs-tree.txt`, `specs/`, `git-log.txt`, `summary.txt`, `tool-calls.txt`. The specs tree has the same 9 files as before, with only `walkthroughs/phase-core.md` and no `feature.md`. Item 9 (directional): main-session input tokens were 2,615,128 before and 2,469,247 after (−145,881, −5.6%), while total run cost went from $3.57 to $3.76. The after plan had 4 tasks against the before plan's 3 (the CLI-process tests became their own 2-point row), so the numbers can't be compared like-for-like.

### 3.6 Builder can invoke skills (Q-A)

```bash
grep -n '^tools:' plugins/specmanager/agents/builder.md
```

Expected: the list contains `…, Glob, Grep, Skill, mcp__plugin_specmanager_specmanager__list_features, …`. Evidence is in ledger § Q-A probe (task-020). Before the change the builder reported its tools as Read, Edit, Write, Bash plus 7 SpecManager MCP tools, and answered `NO_SKILL_TOOL`. After it, the builder called `Skill {"skill":"probe-skill"}` and `probe-marker.txt` contains `SKILL_RAN`. The probe cost $0.33 before and $0.41 after. The other G2 decisions are unchanged: no `effort` field, the reviewer keeps `model: opus`, and the other five agents keep `model: inherit` with no `tools`.

### 3.7 Dispatch renamed `Task` → `Agent` (Arch Q4)

```bash
grep -nE 'the `Task` tool|Task\(\{' plugins/specmanager/commands/*.md | wc -l
grep -c 'subagent_type' plugins/specmanager/commands/specmanager-loop.md
```

Expected: `0`, then a count that still satisfies INV-39 (4 `Agent({ subagent_type: … })` dispatches in the loop; `selftest-prompts` enforces it).

### 3.8 Fact fixes

- Q-B: `grep -n 'notes live in the plan table' plugins/specmanager/agents/reviewer.md` should give at least one hit (description and §1 item 2). `core/spec-slice.ts` emits `notes: null`, and `specmanager-build.md` 7b wording was fixed to match (task-018).
- Stitch link: `grep -n 'docs/references' plugins/specmanager/commands/specmanager-init.md` should give no hits. The broken `../docs/references/stitch-design-md.md` link became the plain spec name ("the Google Stitch DESIGN.md format"), logged in the ledger as a fix.

### 3.9 Snippet parity unchanged

```bash
sed -n '/^---$/,$p' docs/agent-snippets/lossless-carryover.md
```

Expected: the fragment is byte-identical to before (only the header above `---` was reduced to one line naming the four carriers). INV-13 and INV-29 stay at 4/4. `design-grounding.md` is untouched (173 words).

## 4. Pass criteria

- [ ] §3.1 exit-test command exits 0 with the four expected final lines.
- [ ] §3.2 all 11 remaining self-tests and `claude plugin validate` pass; the ledger records 17 `pass` rows.
- [ ] §3.3 pinned counts give 14,775 words and 56 Don't/Never lines (16,248 / 71 at `ad11cd8`).
- [ ] §3.4 the ledger close reports 49/49 C2/C3/C5 rows with a carrier; spot-checked carriers exist.
- [ ] §3.5 dogfood checklist items 1–8 are Met before and after; the maintainer has reviewed the file.
- [ ] §3.6 `Skill` is in the builder `tools:` allowlist, with probe evidence in the ledger.
- [ ] §3.7 no `Task` dispatch wording left in `commands/`.
- [ ] §3.8 Q-B wording and stitch-link fixes present.
- [ ] §3.9 the `lossless-carryover.md` fragment is unchanged.
- [ ] The maintainer confirms the reviewer's non-blocking note (§7).

## 5. Deferred / Out of scope

These are expected, not bugs:

- **Owned by `feat-specmanager-simplification-cleanup`:** removing tier dispatch (`core/tiers.ts`, build 6b, step 7 tier prose, the 7b ladder, the builder R2 blockquote, INV-6/7/21), the `selftest-prompts` redesign (row cut, optional `max`, carrier-sensitivity pass, header comment), the single-carrier de-dup of artifact-on-done / version conflict / complexity ≤3, and the `docs/` and spec-dir deletions. Cleanup will need to rebase over this phase's `max` changes (INV-1 8→5, INV-19 5→4, INV-23 4→3).
- No version bump and no release to `main` (Q8: fold into the next stacked release, or patch 1.2.0 → 1.2.1 if shipped alone; never `main` while 1.0.3 is under directory review).
- No `effort` field (Q2) and no change to the reviewer's `opus` pin (Q3). Agent descriptions and the shape of generated docs are unchanged, and no command or agent file was merged, removed or renamed.
- No change to gates, lifecycle, staleness, phases, walkthrough semantics, loop approval rights or the Stop-gate.
- No `feat-opus-5-readiness` work (R1–R9, Q2, Q3).
- Word target was directional (≈ −1,450 / ≈ 14,800). Actual: −1,473 words and −15 Don't/Never lines (the target was −10 to −14).

**Side findings not acted on** (recorded, pre-existing or out of scope):

- The builder `tools:` lists `Glob` and `Grep`, which CLI 2.1.285 doesn't expose, even in the main session. The builder searches with Bash instead. Harmless.
- Seen in both dogfood runs, not caused by this feature: the managed CLAUDE.md table shows "PRD (approved)" after the Plan is approved; `sync_design_md(refresh)` creates `docs/DESIGN.md` in a no-UI project; build step text names a `walkthroughs/<slug>/` path that storage does not use (it writes `walkthroughs/phase-<name>.md`).
- Also seen in both runs: the loop's main session edits PRD, Architecture and Plan after approving them (version bump only) and re-links `dependsOn`, and the build main session runs `/init` before `sync_claude_md`. The scratch seed project's `hello.js` entry guard prints nothing when run through a symlink. That is a seed-project defect, recorded as an open question in the run.
- `fly-io-deployment` `architecture.md` has unparseable frontmatter.

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `selftest-prompts` FAIL: count above `max` | A prompt edit added a line matching a pinned pattern (INV-1, INV-19, INV-23 now have less headroom) | Remove the restatement, or raise `max` with a ledger justification. Never lower a `min` |
| `selftest-prompts` FAIL: count below `min` | A rule's carrier was cut | Restore the span from the ledger's quoted "Removed" column |
| `selftest-shutdown` / `selftest-autoport` time out | 3-second MCP handshake window on a loaded machine | Re-run before calling it a regression |
| Board for the session disappears during a self-test | `CLAUDE_PLUGIN_DATA` not scratch, so the pidfile reaped the session's board | `export CLAUDE_PLUGIN_DATA=$(mktemp -d)` |
| Harness child fails with "Invalid API key" | An inherited `ANTHROPIC_API_KEY` overrides the CLI login | The harness uses `env -i`; don't wrap it in a shell that re-exports the key |
| Harness loads two specmanager plugins | The installed plugin is still enabled | Pass `--settings '{"enabledPlugins":{"specmanager@specmanager":false}}'`; the init event should show one `specmanager@inline` |
| Builder answers it has no `Skill` tool | Stale installed plugin (pre-`f3ba60b`) | Reinstall from the branch (§2) |
| Ledger per-file Don't count disagrees with your grep | Not using the pinned `grep -cE '^\s*-\s*(\*\*)?(Don.t\|Never)'` | Use the Header's rule exactly (task-013's first count used a different grep) |

## 7. Reviewer verdict

`pass`, with one non-blocking note. The C3 cut in `commands/specmanager-walkthrough.md` step 5 removed the manual-run sentence on `### Git strategy` derivation (ledger walkthrough-cmd row 5). The surviving carrier is `agents/walkthrough-writer.md` line 44 ("Manual run (no build log): derive the branch from the phase commits (`git branch --contains <sha>`) and the commit-message pattern, and say the proposal is unknown."). The command still tells the agent that a manual run has no build log. **Maintainer: please confirm this cut is acceptable.**

## 8. What ships next (preview)

This is the last (and only) phase. Approving this walkthrough ships the feature (`isFeatureShipped`); there is no `final` roll-up. Next on the stack, `feat-specmanager-simplification-cleanup` (Plan still `draft`, `plan-specmanager-simplification-cleanup-018` v2; its "42 rows" figure needs re-pinning) builds on top of this branch and rebases over the `max` changes above. Releasing is the owner's call per Q8.

## Lessons learned

### Git strategy

- **Proposed (build step 6a):** base `feat/planner-rewrite`, because `main` is under directory review and 1.2.0 lives on the stack. Branch `feat/agent-prompt-simplification`. Spec docs went first as a spec-only commit (`181a9b1`), then one commit per task, staging only that task's files. Message style: `Prompt simplification: <summary> (task-0NN, plan 1.N)` plus the `Co-Authored-By` trailer. Never push. Leave unrelated uncommitted work untouched (marketing-phase, cowork-support, `manifest.json`, `CLAUDE.md`, the planner-rewrite walkthrough, `docs/install-from-branch.md`).
- **User change:** none. The owner accepted it unchanged.
- **Result:** 22 task commits `9cf228a..e21fce3`, one per task, none pushed.

### Other lessons

- **Build order changed at build time.** At the end-questions stage the owner had chosen for `feat-specmanager-simplification-cleanup` to build first (Q1). At build time cleanup's Plan was still `draft`, so the owner chose to build this feature first. Cleanup must now rebase over the `selftest-prompts` `max` changes (INV-1 8→5, INV-19 5→4, INV-23 4→3).
- **Tiers:** the owner chose all-`opus` builders instead of the default sonnet/sonnet/opus table (6b).
- **Prerequisite pre-1** (claude CLI logged in) was provided up front. There were no `NEEDS_HUMAN` pauses, no R=2 transient retries and no reviewer fails.
- **Stop-gate known gap hit.** Builders ran in the background, so every turn end counted as a gate attempt (attempt 1/3 was used after the first dispatch). The owner chose to disarm the gate (`clear_active_build` right after task-001) and have the parent run the exit test itself before review. The parent ran it after task-022 and it passed. This is the gap documented in CLAUDE.md "Known gap"; on a long background-builder phase, expect to disarm.
- **Headless harness hygiene (task-002).** Headless `claude -p` children need a clean env (`env -i`): the parent's inherited `ANTHROPIC_API_KEY` overrode the CLI login and failed with "Invalid API key". Disable the installed plugin via `--settings enabledPlugins` so only the worktree copy loads, and use a scratch `CLAUDE_PLUGIN_DATA` (the board fell forward to 4318, leaving the session's 4317 untouched).
- **Ledger bookkeeping drift.** task-013 mis-counted its Don't lines because it didn't use the pinned grep ("5→3"); task-021 re-measured (459/2 → 329/1) and fixed it. task-020 split the frontmatter table and task-021 repaired it. The builder after-count was corrected from 1071 to 1072 for the added `Skill` word. Lesson: always count with the Header's pinned commands.
- **Q-A was a real defect, not a formality.** `builder.md` had a "Skill leverage" section but no `Skill` in `tools:`, so its Superpowers and `frontend-design` defer paths could never fire. A headless probe proved it before the change was made.
- **Cleanup:** the `plugin-before` and `plugin-after` worktrees were removed with `--force` (untracked `node_modules`), and `git worktree prune` also cleared a stale `wt-1.0.3` entry.
