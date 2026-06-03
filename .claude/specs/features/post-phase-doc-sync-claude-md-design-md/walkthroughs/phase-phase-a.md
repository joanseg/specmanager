---
id: wt-post-phase-doc-sync-claude-md-design-md-009
featureId: feat-post-phase-doc-sync-claude-md-design-md
stage: walkthrough
status: approved
stale: false
title: Post-phase doc sync (CLAUDE.md + DESIGN.md) — Phase A walkthrough
dependsOn:
  - plan-post-phase-doc-sync-claude-md-design-md-008
basedOn:
  plan-post-phase-doc-sync-claude-md-design-md-008: 2
generatedBy: agent
version: 1
phase: Phase A
createdAt: '2026-06-02T20:03:54.715Z'
updatedAt: '2026-06-03T08:34:18.559Z'
---
# Post-phase doc sync (CLAUDE.md + DESIGN.md) — Phase A walkthrough

Phase A is the whole feature. It stops the project's docs from drifting after a build phase lands by editing **two slash-command prompt files** — and nothing else. There is no TypeScript, no new MCP tool, no `core` change. `commands/specmanager-build.md` step 8 now offers a three-option doc-sync prompt (Full sync now / Managed blocks only / Wait) **only when a phase is fully done**, replacing the old unconditional `sync_claude_md` call; `commands/specmanager-init.md` now runs native `/init` after `specmanager_init` so codebase docs are generated as part of init.

> **Exit test** (from `plan.md`, Phase A): Read both command files end-to-end and confirm — *specmanager-build.md*: (1) step 8, only on an open walkthrough gate, presents an `AskUserQuestion` with exactly three options — *Full sync now* (recommended, listed first/default), *Managed blocks only*, *Wait* — and the old unconditional `sync_claude_md` line is gone; (2) Full sync runs `/init` → `sync_claude_md` → `sync_design_md({ mode: "refresh" })` in that order, Managed blocks only runs `sync_claude_md` → `sync_design_md({ mode: "refresh" })` with no `/init`, and Wait runs nothing and prints the verbatim manual re-sync block; (3) the mid-phase-stop branch presents no prompt; (4) step 9 reports the chosen sync path. *specmanager-init.md*: the Steps section runs `specmanager_init` first, then native `/init`, and the report mentions both the managed blocks/DESIGN.md and that codebase docs were (re)generated. Then do a live dogfood run of both commands. Optionally `claude plugin validate`.

Because this phase is pure prompt text, the verification is a **close read of the two files plus `claude plugin validate`** — there is no automated test for command `.md` content. This walkthrough is the runnable version of that read. **This is the entire feature; there are no prior phases to assume.**

> **Honesty caveat — read before you sign off.** The plan's exit test also calls for a **live dogfood run** (interactively invoking `/specmanager-build` and `/specmanager-init` to actually observe the `AskUserQuestion` and `/init` behaviour). That run was **NOT performed** — it needs an interactive session. Everything below was verified by close read + `claude plugin validate`. The live dogfood (section 4) is the recommended remaining manual check before this feature is considered fully proven.

## 0. Prerequisites

- The SpecManager repo at the commit that includes Phase A's five commits (`1ccef04`, `bfe62c2`, `db089c8`, `14de2ce`, `6dfa71a`), currently on `main`.
- Claude Code CLI with the `claude plugin validate` subcommand (used for the parse check).
- For the optional live dogfood (section 4): an interactive Claude session with the SpecManager plugin installed, and a feature in this repo that has at least one **fully completed phase** (every task `done`, so the walkthrough gate is open).
- Two files under test:
  - `plugins/specmanager/commands/specmanager-build.md`
  - `plugins/specmanager/commands/specmanager-init.md`

## 1. Build

This phase ships prompt text only — there is no compile step for `.md` command files. The one mechanical check the project offers is plugin-manifest validation, which also confirms the command files still parse and register:

```
claude plugin validate plugins/specmanager
```

Expected output (verbatim modulo path):

```
Validating plugin manifest: .../plugins/specmanager/.claude-plugin/plugin.json

⚠ Found 1 warning:

  ❯ version: No version specified. Consider adding a version following semver (e.g., "1.0.0")

✔ Validation passed with warnings
```

The single warning is **pre-existing and unrelated** to this phase (the plugin manifest has never carried a `version`). The load-bearing line is `✔ Validation passed with warnings`. **If validation fails — or fails with any error other than the known version warning — stop here.**

## 2. Run / inspect

There is nothing to "start up" — the deliverable is the prompt text the two slash commands feed to the agent. To run the exit checks you read the two files directly. Open them:

```
plugins/specmanager/commands/specmanager-build.md
plugins/specmanager/commands/specmanager-init.md
```

Every check in section 3 is a `grep`/read against these two files. No server, no reinstall, no `/reload-plugins` dance is required for the read-based checks (this feature is not changing any installed runtime — only the command prompts). The reload dance only matters for the optional live dogfood in section 4.

## 3. Phase A exit checks

Each sub-section is one concrete check with a command and its expected result. Run them top to bottom.

### 3.1 The old unconditional `sync_claude_md` call is gone from build step 8

```
grep -n "sync_claude_md" plugins/specmanager/commands/specmanager-build.md
```

Expected: every hit is **inside a conditional branch** (Full sync / Managed blocks only) or in the report/Don't sections — **never** an unconditional "always call `sync_claude_md`" instruction. Confirm there is no standalone "after the builder returns, call `sync_claude_md`" line outside the `AskUserQuestion` branches. The matches you should see live in the per-branch action table (lines ~42–43), the Full/Managed bullet text (lines ~33–34), and step 9's report wording (lines ~57–58).

### 3.2 Step 8 presents exactly three options, Full sync first and labelled (recommended)

```
grep -n "Full sync now\|Managed blocks only\|Wait until I've verified\|recommended" plugins/specmanager/commands/specmanager-build.md
```

Expected: **Full sync now** appears first and carries *(recommended)* (it is the default, conveyed by ordering it first and labelling it — matching the `AskUserQuestion` style in `specmanager-plan.md`); **Managed blocks only** second; **Wait until I've verified the phase** third. Exactly three options. The prose at line 32 states "present an `AskUserQuestion` with exactly **three** options" and "List **\"Full sync now\"** first and label it *(recommended)*".

### 3.3 The prompt fires ONLY on the open-gate path (phase fully done)

```
grep -n "open-gate\|gate is \*\*open\*\*\|gate is \*\*closed\*\*\|mid-phase" plugins/specmanager/commands/specmanager-build.md
```

Expected: step 8's question bullet (line 32) begins "**Then offer a post-phase doc sync (only on this open-gate path).**" and the closed-gate branch (line 29) reads "If the gate is **closed** (the builder stopped mid-phase), skip auto-fire — go to step 9 and report the stop." The mid-phase stop path is reached *before* the question is ever presented, so it stays prompt-free.

### 3.4 Per-branch action sequences are in the exact tool order

```
grep -n "/init\` → \`sync_claude_md\|sync_claude_md\` → \`sync_design_md\|mode: \"refresh\"\|no \`/init\`" plugins/specmanager/commands/specmanager-build.md
```

Expected — the action table (lines ~40–45) reads exactly:

| Answer | Actions, in order |
|---|---|
| **Full sync now** *(recommended, default)* | `/init` → `sync_claude_md` → `sync_design_md({ mode: "refresh" })` |
| **Managed blocks only** | `sync_claude_md` → `sync_design_md({ mode: "refresh" })` (no `/init`) |
| **Wait until I've verified the phase** | no sync; print the manual re-sync block below |
| *(cancel / decline)* | same as **Wait** |

Confirm `sync_design_md` always carries `{ mode: "refresh" }`, Full sync leads with `/init`, and Managed blocks only explicitly says **no `/init`**.

### 3.5 The Wait branch prints the verbatim manual re-sync block (and cancel/decline maps to Wait)

```
grep -n -A2 "Docs not synced" plugins/specmanager/commands/specmanager-build.md
```

Expected — the fenced block (lines ~49–52) reads **exactly** (do not paraphrase):

```
Docs not synced. After you've verified this phase, re-sync manually:
  /init   (then)   sync_claude_md   +   sync_design_md(refresh)
```

Also confirm line 36: "If the user **cancels or declines** the question, treat it as **Wait**" and the table's `(cancel / decline)` row maps to Wait. Line 35 must state the Wait branch refreshes **nothing** ("don't refresh the managed block — all three steps defer together") so there is no half-synced state.

### 3.6 Step 9 reports which sync path ran

```
grep -n "Codebase docs regenerated\|Both managed blocks refreshed\|intentionally not synced\|State which post-phase" plugins/specmanager/commands/specmanager-build.md
```

Expected — step 9 (lines ~56–61) has three report phrasings:
- **Full sync now** → "Codebase docs regenerated via `/init` + both managed blocks refreshed (CLAUDE.md and DESIGN.md)."
- **Managed blocks only** → "Both managed blocks refreshed (CLAUDE.md and DESIGN.md); codebase-doc region left as-is."
- **Wait / cancel / decline** → "Docs intentionally not synced — manual re-sync command printed above."

And line 61: a mid-phase stop "report the stop only — there was no sync prompt, so say nothing about syncing." A sync tool that errors mid-sequence is surfaced verbatim with no auto-retry (line 60).

### 3.7 `specmanager-init.md` runs `specmanager_init` first, then native `/init`

```
grep -n "specmanager_init\|/init" plugins/specmanager/commands/specmanager-init.md
```

Expected — Steps section: step 1 (line 26) "Call the **`specmanager_init`** MCP tool first"; step 2 (line 30) "After it returns, run the native **`/init`** slash command in-session to populate CLAUDE.md's general codebase-doc region." Line 32 clarifies `/init` "writes **only outside** the SpecManager markers, so it never clobbers the managed block (the marker-merge in `core/claude-md.ts` is line-anchored …)."

### 3.8 `specmanager-init.md` report and Don't cover both regions

```
grep -n "both\|codebase docs\|never clobbers\|outside" plugins/specmanager/commands/specmanager-init.md
```

Expected — step 3 (lines 37–42) reports across **both** regions: from `specmanager_init` (dirs created, managed CLAUDE.md block, `./docs/DESIGN.md`) and from `/init` (general codebase docs outside the markers "so the user need not run `/init` separately"). The Don't section (lines 55–60) states native `/init` writes **only outside** the markers and never clobbers the managed block.

### 3.9 Non-clobber invariant is real (the prompts depend on it)

The prompts assert three writers touch **three disjoint regions**, so sequential runs are safe with no code change. Confirm the merge is line-anchored:

```
grep -n "lineMarkerRe\|const START\|const END\|slice(0, startMatch\|endMatch.index" plugins/specmanager/server/src/core/claude-md.ts
```

Expected: `START`/`END` constants for the `<!-- specmanager:start/end -->` markers, a `lineMarkerRe` that "matches a marker only when it stands alone on its own line", and a merge that rebuilds the file as `before` + new block + `after` (slicing around `startMatch.index` and `endMatch.index`). This proves anything `/init` writes **outside** the markers (`before`/`after`) survives a `sync_claude_md`, and vice versa — the prompts' ordering is for clarity, not correctness.

## 4. Pass criteria

All required:

- [ ] `claude plugin validate plugins/specmanager` ends with `✔ Validation passed with warnings`, the only warning being the pre-existing missing `version` (3.1 build check).
- [ ] No unconditional `sync_claude_md` call remains in `specmanager-build.md`; every call is inside a sync branch or the report/Don't text (3.1).
- [ ] Step 8 presents exactly three options, **Full sync now** first and labelled *(recommended)* (3.2).
- [ ] The doc-sync prompt fires **only** on the open walkthrough-gate path; the closed-gate / mid-phase path skips it (3.3).
- [ ] Per-branch tool orders are exact: Full = `/init` → `sync_claude_md` → `sync_design_md({ mode: "refresh" })`; Managed = `sync_claude_md` → `sync_design_md({ mode: "refresh" })`, no `/init`; Wait = nothing (3.4).
- [ ] The Wait branch (and cancel/decline) prints the verbatim two-line manual re-sync block and refreshes nothing (3.5).
- [ ] Step 9 reports the chosen sync path with the three branch-specific phrasings; mid-phase stop says nothing about syncing (3.6).
- [ ] `specmanager-init.md` runs `specmanager_init` first, then native `/init`, and reports both regions (3.7, 3.8).
- [ ] The line-anchored marker merge in `core/claude-md.ts` confirms the three write regions are disjoint (3.9).

## 5. Deferred / Out of scope

These are intentional — **expected, not a bug**:

- **The live dogfood run is not yet done.** Observing the actual `AskUserQuestion` UI, picking each branch, and confirming CLAUDE.md ends with both a populated codebase-doc region (outside markers) and an intact managed block plus DESIGN.md — requires an interactive session. See section 4-LIVE below; this is the recommended remaining check.
- **No `core` / server / route / MCP-tool change.** This feature reuses the three already-registered tools (`sync_claude_md`, `sync_design_md`, `specmanager_init`). The autosync listeners (`startClaudeMdAutoSync` / `startDesignMdAutoSync`) and the marker scheme are untouched.
- **`/init` stays agent/interactive-only.** It is never invoked by the server — only from inside these two command prompts.
- **The removed `/specmanager-prd` DESIGN.md touchpoint** and the **`feature.shipped` DESIGN.md autosync backstop** are out of scope (dropped/left-as-is per the PRD).

### 4-LIVE. Recommended remaining manual check (live dogfood)

In an interactive session with the plugin installed (reinstall + `/reload-plugins` if you changed the command files since last install):

1. `/specmanager-build <feature> <a fully-completed phase>` → confirm the three-option `AskUserQuestion` appears with **Full sync now** first/recommended. Pick **Full sync now**; confirm `/init` runs, then `sync_claude_md`, then `sync_design_md(refresh)`, and step 9 reports "Codebase docs regenerated via `/init` …".
2. Re-run and pick **Wait** → confirm no sync runs and the verbatim two-line block prints.
3. Run `/specmanager-build <feature> <phase>` that stops **mid-phase** → confirm no sync prompt appears at all.
4. `/specmanager-init` → confirm CLAUDE.md ends with both a populated codebase-doc region (outside the markers) **and** an intact managed block between the markers, plus `./docs/DESIGN.md` — neither region clobbering the other.

## 6. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `claude plugin validate` fails with a JSON/parse error | A command `.md` frontmatter block was malformed by an edit | Check the `---` frontmatter at the top of the edited file; only `description`/`argument-hint` keys are expected. |
| Validation warns about more than the `version` line | An unrelated manifest regression slipped in | Diff `.claude-plugin/plugin.json` against the Phase A commits; the version warning is the only expected one. |
| In a live run the sync prompt fires after a **mid-phase** stop | The build command isn't gating the question on the open-gate path | Re-read step 8 line 32 / step 9 line 61 — the question must sit on the `gate is **open**` branch only. |
| `/init` appears to wipe the managed CLAUDE.md block | A non-line-anchored or hand-rolled merge is in play | Confirm `lineMarkerRe` in `core/claude-md.ts` (check 3.9); `/init` must write only outside the markers. |
| The Wait block prints reworded text | Someone paraphrased the verbatim block | Restore the exact two lines from check 3.5 — the prompt says print it "exactly as written". |

## 7. What ships next

Phase A is the **entire feature** — there is no Phase B. The remaining work before this feature is considered fully proven is the **live dogfood run** (section 4-LIVE), which needs an interactive session. Once every phase walkthrough (just this one) is approved, the feature-level roll-up walkthrough (`walkthroughs/post-phase-doc-sync-claude-md-design-md/feature.md`) can be generated via `/specmanager-walkthrough <feature> final`.
