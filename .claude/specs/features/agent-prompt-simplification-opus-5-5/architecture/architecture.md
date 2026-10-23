---
id: arch-agent-prompt-simplification-opus-5-5-029
featureId: feat-agent-prompt-simplification-opus-5-5
stage: architecture
status: approved
stale: false
title: Agent prompt simplification (Opus 5.5) architecture
dependsOn:
  - prd-agent-prompt-simplification-opus-5-5-044
basedOn:
  prd-agent-prompt-simplification-opus-5-5-044: 2
generatedBy: agent
version: 2
createdAt: '2026-10-20T13:52:58.361Z'
updatedAt: '2026-10-20T14:02:49.146Z'
---
## Summary

A prompt-only trim of the 7 agents (`plugins/specmanager/agents/*.md`), the 10 commands (`plugins/specmanager/commands/*.md`) and the 2 snippets (`docs/agent-snippets/*.md`) that `prd-agent-prompt-simplification-opus-5-5-044` scopes. The approach is **one critique per file plus a removal ledger**. Each file is critiqued against a fixed taxonomy of what may be cut (C1–C5) and a fixed keep-list. Each cut is then recorded as a ledger row that names where the rule still lives (a surviving prompt line, or a `core` enforcement point). Each file lands as its own commit, with `selftest-prompts` green. The only code change is in `plugins/specmanager/server/src/selftest-prompts.ts`: lowering `max` to the post-trim counts and re-pointing patterns at moved text. No `min` is lowered and no row is deleted. A before/after headless dogfood run (G4) is the behavioural gate. Gates, lifecycle, file set, the shape of generated docs, and everything owned by `feat-specmanager-simplification-cleanup` stay untouched.

**Baseline re-pinned at `ad11cd8`** (branch `feat/planner-rewrite`, plugin 1.2.0). The word counts match the PRD table exactly (16,248 total). Two PRD baseline facts are corrected here:
- `selftest-prompts.ts` has **52 distinct `INV-*` ids encoded as ~76 rows** (lettered rows such as INV-14a…e and INV-51a…f), not 40.
- `Task` is named as the dispatch tool on **9 lines**, not 6: 6 `Task(` call sites (`commands/specmanager-loop.md` ×4, `commands/specmanager-plan.md`, `commands/specmanager-walkthrough.md`) plus 3 "Use the `Task` tool" lines (`commands/specmanager-prd.md`, `-architecture.md`, `-design.md`). `commands/specmanager-build.md` already uses `Agent(`.

`Don't`/`Never` bullet lines are 77 by `grep -cE '^\s*-\s*(\*\*)?(Don.t|Never)'`. The PRD's 70 used a different counting rule, so the Plan re-pins one counting command and uses it before and after.

## Approach

1. **Critique** the file: tag every candidate span with one category from **Removal taxonomy**, and check it against the **Keep-list**.
2. **Ledger**: one row per removed rule-bearing span (see **Removal ledger**). Spans that carry no rule (C1, C4) are logged per file as one row with a word count.
3. **Edit** the file, then update the `max` of every INV row the edit touches in the same change.
4. **Verify**: `cd plugins/specmanager/server && npm run build && npm run selftest-prompts`. A `min` failure means restore the statement. Never lower the floor (`wt-opus-5-readiness-022` §2).
5. **Commit** the file, its ledger rows, and `selftest-prompts.ts` + `server/dist/selftest-prompts.js` if they changed. One commit per file (one commit per task, per repo memory).

Snippet edits and their carriers go in **one** commit (G3; repo CLAUDE.md "Change the fragment here and update every carrier in the same commit").

## Removal taxonomy

| Cat | What may be cut | Required carrier |
|---|---|---|
| **C1** | Prose describing default Opus 5.5 behaviour, not a rule: "re-read your draft", "keep changes small and focused", "read the relevant files", "be concrete", "keep it tight" when no number is attached | None. The ledger states why it carries no rule |
| **C2** | A rule restated **inside the same file**, e.g. a `## Don't` bullet that repeats a step verbatim | The surviving line in the same file |
| **C3** | A rule restated across files **where the restating actor does not act on it**, e.g. a command describing an agent's internal steps | The acting file (agent or command) |
| **C4** | Provenance and history tags that carry no instruction: `(R2)`, `(AC4)`, `R5/AC2`, "this is the P1 fix", "Phase 3 stale-propagation" | None |
| **C5** | Explanation of a rule `core` already enforces, where the prompt keeps the instruction and drops only the "why/how core does it" | A named `core` function (e.g. `checkGate`, `propagateStale`, `rollupPhases`) |

**Multi-actor rules are never de-duplicated across actors.** INV-1 (single-phase ⇒ no `final`, 4 actors), INV-2, INV-11, INV-16, INV-19, INV-25 (`Don't approve`, min 8) and INV-30 exist because each actor must reach the rule alone. For these, only C2 (within one actor's file) applies.

## Keep-list

These are never cut, whatever the category:

- Any span whose removal fails a `min` (`selftest-prompts` decides; the mutation pass also flags patterns that start matching neighbouring prose).
- **Parsed and literal output shapes**:
  - `planner.md`'s `## Phase <name> — <theme>`, `**Exit test:**`, `**UI check:**`, `# | Task | Pts | Notes`, the `**Scale:**` legend, the `| Phase | Theme | Points |` + **Total** row, and dotted numbering.
  - The reviewer's `{ verdict, reasons }` JSON.
  - `NEEDS_HUMAN: <…>`.
  - `Phase <name> complete — ready for walkthrough` / `Phase <name> stopped at <task-id>: <reason>`.
  - The Wait-branch block in `specmanager-build.md` step 8.4 (INV-12).
  - The `Loop mode:` lines.
  - The refined-intent block template.
  - The walkthrough section headings (INV-50a–e).
  - The architect's section-anchor convention (INV-35).
- **Every `create_document`/`create_design_brief`/`create_task`/`set_phase_meta` call sketch** in an agent: field names, `dependsOn`/`basedOn` (INV-11).
- **Everything owned by `feat-specmanager-simplification-cleanup`** (`prd-specmanager-simplification-cleanup-039`, `arch-specmanager-simplification-cleanup-024` R1–R5):
  - `specmanager-build.md` step 6b, the tier/alias prose in step 7, and the step 7b tier ladder.
  - `builder.md`'s "Model is parent-supplied (R2)" blockquote.
  - INV-6/7/21.
  - The three `core`-enforced rules it reduces to one carrier each: artifact-on-done, version conflict, complexity ≤3 split.
  - The selftest-prompts row count, the optional `max`, the carrier-sensitivity pass, and the header comment.
- **Work already done by `feat-opus-5-readiness`** (R1–R9, Q2, Q3) is not re-proposed. Only regrowth since then is in scope.
- **Newly load-bearing regrowth (resolves PRD Q7).** Each block below arrived with a feature and is pinned by its own invariants, so it is **kept**. Only C2/C4 cuts inside it are allowed:
  - Git strategy (`build.md` 6a, builder step 3, walkthrough `### Git strategy`; INV-50e, INV-51a–f, INV-52a/b).
  - Human prerequisites (`build.md` 6c, `NEEDS_HUMAN`, planner `## Human prerequisites`; INV-47a/b, INV-48a–c).
  - Loop mode (INV-38–44).
  - The planner rewrite triggers (INV-44, INV-45a–c, INV-46a/b).
  - The reviewer UI check (INV-49a/b).
- **The `R3 reviewer` phrase** in `builder.md` stays as worded. It is the only provenance tag a pattern pins (INV-3), so C4 skips it.

## Removal ledger

New file `docs/verification/prompt-simplification-ledger.md`, next to the existing `docs/verification/reviewer-disallowedtools.md`. It is outside `plugins/`, so it is not shipped and is not a release. It sits apart from the four `docs/` measurement files that cleanup R2 deletes. The file has three parts:

- **Header**: the baseline sha (`ad11cd8`), the counting commands (`wc -w` over the 19 files; the `Don't`/`Never` grep above), and the before/after totals.
- **One table per file**, with columns `| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |`.
- **Frontmatter decisions** (see **Frontmatter review**), each with its evidence.

Success metric (PRD, binding): 100% of rule-bearing removals (C2, C3, C5) have a non-empty carrier column.

## Per-file critique

Candidate cuts found at `ad11cd8`. Final cuts are decided at build time under the keep-list. Word figures are rough, non-binding estimates.

### agents/builder.md

- **C1**: step 2's "Read the relevant files, make the change. Keep changes small and focused". Step 3's "Pre-existing repository hooks may run; respect them" can go, but **keep** "fix the underlying issue rather than bypassing" (hook-bypass ban).
- **C1/C3**: step 3 of the research list. Keep the topological-order instruction; drop the explanation of `list_tasks` creation order.
- **C2**: the Don't bullets "Don't start the next phase…" (restates stop condition 1; INV-19 min 2 across 2 actors, so cut only if the count stays ≥ min) and "Don't skip the `in_progress` transition" (restates step 1; INV-18 min 1 max 1, so cut only one of the two and keep the step).
- **C4**: `(R4)`, `R5/AC2`.
- **Frozen**: design-grounding method clause (INV-15a), Superpowers boundary (INV-3, INV-26), no-vendoring and degradation (INV-36a/b), DESIGN.md tokens (INV-37), `NEEDS_HUMAN`, single-phase terminal (INV-1), no switch/push (INV-52a/b), MCP-only writes into `.claude/specs/` (INV-31). The R2 blockquote is cleanup's.
- ≈ −120 words.

### agents/planner.md

- **C2**: self-check items 2–4 restate the complexity rule, the phase-trigger rule and the conventions list. **Keep** items 5 and 6 (INV-46a and INV-48c need the rule *and* the self-check) and item 7 (INV-10).
- **C2**: Don't "Don't emit a flat plan with no phases" restates the phase rule.
- **C1**: Don't "Don't write the code itself" (planner has no code task).
- **C4**: `(R1)`, `(R3)` in `testCommand`/`architectureRefs`.
- **C5**: the Stop-gate mechanics sentence in `testCommand`. Keep "never leave the field absent" and its consequence in one clause; `core/active-card.ts` and `hooks/stop-gate.sh` enforce the rest.
- **Frozen**: all parsed shapes, the loop-mode carve-out (INV-44), triggers (INV-45a–c), prerequisites (INV-48c), fill mode, the complexity ≤3 statement (cleanup's single carrier).
- ≈ −180 words.

### agents/walkthrough-writer.md

- **C2**: "single-phase ⇒ no `final`" appears in Inputs, the Final-mode lead, and two Don't bullets. Keep the Inputs line and the Final-mode refusal; cut the restatements. INV-1 counts 3 here and the total is 8 = max, so lower the max.
- **C2**: Don't "Don't write a new code tour in final mode" repeats Final-mode scope discipline.
- **C1**: "Two audiences… six months from now" can be compressed to one clause.
- **Frozen**: emit order and headings (INV-50a–e), `### Git strategy` derivation for manual runs, "Never invent a lesson", density contract (INV-13/29 byte-identical).
- ≈ −150 words.

### agents/designer.md

- **C2**: Hard constraints' "Aesthetic bar" repeats the fallback's genericness critique. Keep the fallback (INV-14a–e) and cut the overlap in Aesthetic bar.
- **C2**: Don't "link external assets or use JS" restates Self-contained.
- **C2**: Don't "persist via anything but `create_design_brief`" restates Self-contained persistence. Keep one of the two.
- **C4**: `(R5)`, `(AC5)`–`(AC8)`, "Phase 3 stale-propagation".
- **C5**: the description of what `create_design_brief` does on write (`core` enforces it).
- **Frozen**: `bootstrap_design_tokens` as the only token write path; the sandbox/no-JS constraint; DESIGN.md tokens (INV-37).
- ≈ −160 words.

### agents/architect.md

- **C1**: "Keep it grounded — every 'we will add X'…" is merged into Don't "invent files" (C2).
- **C5**: the anchor convention's closing explanation of how the build command slices. **Only** if INV-35 stays green; otherwise keep it.
- **Frozen**: Context7 block (INV-27a–c, INV-28), design-grounding clause (INV-15a), density contract, persist sketch.
- ≈ −60 words.

### agents/reviewer.md

- **C1**: "How to review" step 2 can be compressed.
- **C4**: "(a future stage-two reviewer owns that)".
- **Frozen**: slice-only contract (INV-23), "Never writes." in the description (INV-22), no style grading (INV-24), UI check (INV-49a/b), verdict JSON, parent-advances line (INV-8).
- ≈ −50 words.

### agents/prd-writer.md

- Already minimal (448 words). **C1**: step 6's "Report the new document id" stays (the command relies on it). Cut little: "Keep it tight." is not a rule but has a number attached ("≤250 lines"), so it is **kept**.
- ≈ −10 words.

### commands/specmanager-build.md

- **C4**: `(R2 — driven by persisted state…)`, "this is the P1 fix", `(AC4)` (AC4 sits inside cleanup-owned tier prose, so leave it), `(R3)` in the 7b heading.
- **C2**: Don't bullets. Each is checked against its INV row before cutting. The pinned ones stay: INV-2 (`clear_active_build`, max reached), INV-48b, INV-51e, INV-33 ("Don't mark tasks `done`", single-sited). Candidates:
  - "Don't run `/init` on Managed blocks only…" restates the step 8.4 table.
  - "Don't hand the reviewer the whole Architecture doc" (INV-23 min 2 max 4; the reviewer and 7b also carry it).
  - "Don't let the reviewer write…" (INV-8 min 2).
  - The single-phase Don't (INV-1).
- **C1**: step 9's three canned sync-path sentences can be compressed to "say which sync path ran; on a sync error surface it verbatim and say which steps ran".
- **C3**: step 8.3's walkthrough-writer input list duplicates `commands/specmanager-walkthrough.md` step 5. **Kept**: build is the acting dispatcher here.
- **Frozen**: steps 4c, 6a, 6c, 6d, the R=2/N=3 non-nesting sentence (INV-9), `get_phase_completion` (INV-5), the `--bulk` lines (INV-4, at max), the Wait block (INV-12), and everything cleanup owns (6b, step 7 tier text, 7b ladder).
- ≈ −250 words, excluding cleanup's removals.

### commands/specmanager-loop.md

- Already compact. **C4**: requirement tags `(R5)`–`(R11)` in step headings.
- **Frozen**: INV-38–44 and INV-46b. INV-39 matches `subagent_type: "<agent>"`, so the `Task(`→`Agent(` rename is safe.
- ≈ −20 words.

### commands/specmanager-init.md

- **C2**: "What this does" duplicates Steps 1–3. The line-anchored-merge rationale appears three times (What this does, step 2, Don't). Keep once.
- **C2**: the Don't "Don't expect init to write into a declared sibling repo" repeats "The paths ARE the read grant".
- **C3/C5**: "Notes on the optional Design stage" restates `checkGate` plan-gate semantics. Compress to one line and keep the user-visible pointer.
- **Fix, no rule change**: the link `../docs/references/stitch-design-md.md` resolves from `commands/` to `plugins/specmanager/docs/references/`, which does not exist. The file lives at the repo-root `docs/references/stitch-design-md.md`, outside the plugin. Replace the link with the plain spec name. Record it in the ledger as a fix.
- ≈ −250 words.

### commands/specmanager-interview.md

- Behaviour spec, mostly frozen (one question per turn, instant exit, four-section synthesis, `dependsOn: []`).
- **C2**: Don't bullets 3–5 restate the loop rules and the exit rule. Keep "Don't delegate to a subagent" (the main-session invariant) and "Don't … approve it".
- ≈ −60 words.

### Smaller command files (`specmanager-plan.md`, `-walkthrough.md`, `-design.md`, `-prd.md`, `-architecture.md`, `-board.md`)

- **C3**:
  - `plan.md` step 3's trailing paragraph restates the planner's output contract (phases, Exit test, ≤3, single phase default); the planner is the actor. Keep its Don't "send back a flat plan" (the command acts on it).
  - `design.md` step 4's restatement of the designer's constraints.
  - `walkthrough.md`'s Don't "fabricate code tours" (agent scope discipline).
- **C2**: `prd.md` Don't "Don't approve the new feature" is a second `Don't approve` match in the file (INV-25 at max 10, min 8). Cut only if INV-25 stays ≥ 8. **Kept by default**, since it is a distinct statement about features.
- **Rename (resolves PRD Q4)**: the 9 `Task` dispatch lines become `Agent(` / "the `Agent` tool". No INV pattern contains `Task` (verified: the only hit in `selftest-prompts.ts` is the `updateTask` prose in INV-18's `what`). Nouns like "builder Task" in `build.md` are left alone; they sit inside INV-4-pinned lines.
- ≈ −150 words combined.

### docs/agent-snippets/

- `lossless-carryover.md`: the "Verified identical … as of this task" paragraph holds stale line references (`architect.md:65`, …) and history. Cut it to one line naming the four carriers. The fragment itself is **unchanged** (INV-13/29 byte-identical, min = max = 4).
- `design-grounding.md`: unchanged (INV-15a/b). The header sentence ("also copy-pasted into each agent prompt…") stays because it names the carriers.
- Snippets are not shipped (outside `plugins/`), so these cuts are maintenance only.

**Directional target (sets PRD success metric "numeric target set at Architecture")**: about −1,450 words from this feature's own cuts (≈ −9% of 16,248, giving ≈ 14,800). This is measured separately from cleanup's tier-prose removals. The target is never binding: a target blocked by a `min` floor is adjusted, not over-cut. The `Don't`/`Never` bullet target is −10 to −14 lines, also non-binding.

## G1 — Trim redundancy, keep every rule

Implemented by **Approach** + **Removal taxonomy** + **Keep-list** + **Removal ledger** + **Per-file critique**. Every enforced behaviour keeps at least one carrier: a prompt line (proved by `selftest-prompts` `min`) or a `core` point. Dropped C5 explanations map to these `core` points:

| Rule | `core` point |
|---|---|
| Gates | `checkGate` (`core/`, single call site; INV-16) |
| Staleness | `propagateStale` (`core/status.ts`) |
| Single-phase terminal | `isFeatureShipped` (`core/shipped.ts`) |
| Placeholder/empty phases | `rollupPhases` (`core/phases.ts`) |
| Phase completion | `get_phase_completion` (`core/phase-completion.ts`) |
| Spec slice | `get_spec_slice` (`core/spec-slice.ts`) |
| Stop-gate arming | `core/active-build.ts` + `hooks/stop-gate.sh` |
| Design-brief escaping and 5MB cap | `create_design_brief` |

## G2 — Frontmatter review

Reviewed against the Claude Code subagent frontmatter contract (`name`, `description`, `tools`, `disallowedTools`, `model`, `effort`, and others). The Context7 lookup was not attempted (`plugin:context7` needs auth this session), so this rests on training-data knowledge of the contract, plus the in-repo evidence `docs/verification/reviewer-disallowedtools.md`.

| Agent | Today | Decision | Evidence |
|---|---|---|---|
| prd-writer, architect, designer, planner, walkthrough-writer | `model: inherit`, no `tools` (inherit all) | **No change.** Restricting tools risks breaking MCP access; `inherit` is the subagent default but the explicit line is harmless | — |
| builder | `model: inherit`, explicit `tools:` allowlist (Read, Edit, Write, Bash, Glob, Grep + 7 SpecManager MCP tools) | **Conditional change — see Q-A.** The body defers to Superpowers and `frontend-design` skills, but the allowlist has no `Skill` tool, so the skill path may be dead | Needs a headless probe |
| reviewer | `model: opus`, `disallowedTools` denylist | **Keep the `opus` pin (resolves PRD Q3).** `build.md` 7b relies on "its frontmatter fixes its tier regardless of the cards' build tier"; switching to `inherit` would change the review tier under a `sonnet` session | `build.md` 7b; `docs/verification/reviewer-disallowedtools.md` |
| all | no `effort` | **Leave unset (resolves PRD Q2, conservative default).** Revisit only if the G4 dogfood shows a defect that `effort` addresses | PRD Q2 default |

Descriptions stay as they are. They drive auto-delegation, and the reviewer's "Never writes." is pinned (INV-22).

## G3 — Snippet parity

The only snippet edit is the non-fragment header paragraph of `lossless-carryover.md`. Neither fragment changes, so no carrier changes. If the build finds a fragment change necessary, the snippet and all its carriers go in one commit, and INV-13, INV-15a/b and INV-29 must stay green.

## G4 — Dogfood harness

Resolves PRD Q6. The harness is two identical headless runs, **before** (baseline sha `ad11cd8`) and **after** (branch head). Each runs in a fresh scratch project outside the repo, under the session scratchpad.

**Setup per run**

1. `git worktree add <scratch>/plugin-<before|after> <sha>`.
2. `npm ci` at its `plugins/specmanager` (runtime deps; `dist/` is committed).
3. A scratch project: `git init` plus a tiny Node CLI (`hello.js`, `package.json` with `"test": "node --test"`).
4. `CLAUDE_PLUGIN_DATA` points at a scratch dir, so the board's pidfile reaper never touches the session's own board (repo CLAUDE.md).

**Fixed intent**: "Add a `--version` flag to the hello CLI that prints the package.json version". It is single-phase and not UI-facing.

To avoid `AskUserQuestion` stalls in `-p` mode, the run pre-seeds a `kind: "interview"` doc covering problem, users, scope and UI-facing = no. Loop step 4 then skips refinement. The harness prompt says: "if `AskUserQuestion` is unavailable, take the *(recommended)* option". This line is harness input, never plugin prose.

**Runs**

- `claude --plugin-dir <worktree>/plugins/specmanager -p "/specmanager:specmanager-loop <intent>" --output-format stream-json --verbose`
- Then `-p "/specmanager:specmanager-build <slug> next"`.
- Capture: the stream-json, the `.claude/specs/` tree, and `git log`.

**Checklist** (the builder fills it from the captured outputs; the maintainer reviews it in the phase walkthrough; recorded in `docs/verification/prompt-simplification-dogfood.md`, one column each for before and after):

1. `check_gate` is called before every stage.
2. No `set_status` approval from a subagent; approvals come from the loop's main session only.
3. The PRD, Architecture and Plan carry their required sections (PRD 7 headings; Architecture anchors; Plan Scale legend, summary + Total, `## Phase`, `**Exit test:**`, dotted numbering, `## Human prerequisites`, `## Notes on estimates`).
4. Tasks: every one ≤3 with `phase` set, titles 1:1 with plan rows, `set_phase_meta` with `testCommand` and `architectureRefs`.
5. The builder marks each task `in_progress` before `done`, one commit per task, no branch switch or push, artifacts recorded.
6. The reviewer verdict JSON is returned.
7. The walkthrough has Stakeholder test guide first and `## Lessons learned` → `### Git strategy` last.
8. No `final` walkthrough (single-phase).
9. Directional: total input tokens from the stream-json `result` usage.

**Non-determinism rule**: an item that fails only on *after* gets one re-run of both sides. A persistent after-only failure is a regression: restore the cut prose (from the ledger) and re-run.

## Sequence / flow

1. Pin the baseline: sha, counts and invariant snapshot in the ledger header. Capture the *before* dogfood run.
2. For each file, in the order the Plan sets: critique → ledger rows → edit → lower touched `max` → `npm run build && npm run selftest-prompts` → commit.
3. Snippet header commit.
4. Frontmatter: the builder `Skill` probe (Q-A), then apply or record no-change.
5. Full verification:
   - Every self-test (`selftest`, `-board`, `-phases`, `-build`, `-tiers` if it still exists, `-stopgate`, `-roundtrip`, `-pidfile`, `-shutdown`, `-autoport`, `-repos`, `-specslice`, `-prompts`, `-directory`, `smoke-mcp`).
   - `claude plugin validate plugins/specmanager`.
6. Capture the *after* dogfood run, fill in the checklist, close the ledger with totals.

## Interfaces

No code interface changes. These prompt contracts are **frozen**: their text may move but not change.

- **Subagent inputs**:
  - The `Loop mode:` lines.
  - The refined-intent block.
  - `Git strategy:` block (INV-51f).
  - `Mode: fill`.
  - The walkthrough phase name and single-phase terminal flag.
- **Subagent outputs**:
  - `NEEDS_HUMAN: <…>`.
  - The builder's two stop reports.
  - The reviewer's `{ "verdict", "reasons" }`.
  - Every persist call sketch.
- **`selftest-prompts.ts`**: `PromptInvariant` is unchanged. Only `max` values (lowered) and, where text moves, `pattern` strings change. The `files` arrays change only if a carrier moves within the same actor.

## Data model changes

None in `core` or on-disk spec formats. New files:

- `docs/verification/prompt-simplification-ledger.md`
- `docs/verification/prompt-simplification-dogfood.md`

These also give verification-only tasks the file artifact a `done` transition requires (repo CLAUDE.md: tasks need a commit or file artifact). There is no migration.

## Failure & edge cases

- **A `min` fails after a cut**: restore the span. Never lower `min` or delete the row.
- **The mutation pass flags a pattern** that now matches neighbouring prose: re-anchor the pattern on the surviving statement. Never loosen it.
- **Collision with cleanup**: cleanup's Build edits `build.md`, `builder.md` and `selftest-prompts.ts` too. See Q1 resolution: region exclusion makes the conflicts textual only, resolved by rebase.
- **Cleanup's plan cites 42 → ~14 rows; the suite now has ~76 rows / 52 ids.** If cleanup's row cut lands first, rows this feature would have lowered may be gone. Lowering `max` on a removed or now-optional row is skipped.
- **Dogfood stalls on `AskUserQuestion` in `-p`**: handled by the seeded interview and the harness line. If it still stalls, run that stage interactively and note it in the dogfood file.
- **Board reaping**: handled by the scratch `CLAUDE_PLUGIN_DATA`.
- **Known gap (the background-subagent Stop-gate)** can mark the dogfood build `blocked` during long builders. The intent is tiny to stay inside one turn. A `blocked` caused only by this gap on both sides is not a regression.
- **Release**: `plugins/specmanager/` changes plus a rebuilt `server/dist` make this a release if pushed to `main`. It never goes to `main` from this feature (1.0.3 is under directory review). See Q8.

## Conventions used

- Prompt prose in markdown under `plugins/specmanager/{agents,commands}`. Snippet parity is by copy-paste plus the snippet file naming its carriers (repo CLAUDE.md `docs/agent-snippets/`).
- `selftest-prompts` is the regression net:
  - `min` is the floor and is never lowered.
  - `max` is lowered to post-trim counts (the header rule in `selftest-prompts.ts`).
  - Patterns anchor on structure, never on model-alias values.
- TypeScript ESM, Node 20+, `tsc` build to the committed `dist/`. Rebuild before committing source changes.
- Model routing uses aliases, never dated ids. Subagent dispatch is via the `Agent` tool (already used by `build.md`).
- One commit per task, staging only that task's files. Never switch branches or push from a builder. Work on a branch stacked on `feat/planner-rewrite`, never `main`.
- No model or API calls from the plugin. Unchanged.

## Open questions

- **Q1 — Ordering vs `feat-specmanager-simplification-cleanup` (resolved; owner confirmed cleanup builds first).** This feature is order-independent: it never edits cleanup-owned regions (see Keep-list) and only lowers `max`/re-points patterns. **Preferred order**: cleanup's Build lands first and this feature rebases onto it. If this feature builds first, cleanup's tasks still apply; its INV-6/7/21 deletion and row cut supersede any `max` lowering here. Open for the owner: confirm the preferred order, since cleanup's Plan is still `draft` (`plan-specmanager-simplification-cleanup-018` v2) and its "42 rows" figure needs re-pinning on its side.
- **Q2 — `effort` (resolved)**: leave unset. Reopen only on dogfood evidence.
- **Q3 — Reviewer `model: opus` (resolved)**: keep.
- **Q4 — `Task(`→`Agent(` (resolved)**: in scope; 9 lines, cosmetic, no INV pattern affected.
- **Q5 — Which `Don't` lists (resolved)**: every file's Don't list is critiqued under C2. The heaviest targets are `build.md` (13 bullet lines by the grep above), `walkthrough-writer.md` (7) and `designer.md` (6). Each cut is subject to its INV row.
- **Q6 — Dogfood harness (resolved)**: see G4. The builder fills the checklist; the maintainer reviews it in the walkthrough (owner, end questions).
- **Q7 — Regrowth cause (resolved)**: git strategy, prerequisites, loop and planner-rewrite prose are newly load-bearing (each pinned by INV-44–52). Only C2/C4 cuts apply inside them.
- **Q8 — Release (resolved, owner: fold into the next stacked release)**: recommend folding into the next release on the stack, with a patch bump (1.2.0 → 1.2.1) if it ships alone. The owner decides; never `main` while 1.0.3 is in directory review.
- **Q-A — Builder skill access (open, needs evidence)**: `builder.md` tells the builder to invoke Superpowers / `frontend-design` skills, but its `tools:` allowlist has no `Skill` tool. Run a headless probe: dispatch the builder with a skill installed and check whether it can invoke the skill.
  - **Can't**: the minimal fix is to add `Skill` to the allowlist (makes the existing prose true: "same or better").
  - **Can**: no change.
  - In both cases the prose is kept and the probe result is recorded in the ledger.
- **Q-B — "task titles + notes" (resolved, owner: apply the fact fix)**: `reviewer.md` (description and §1 item 2) and `build.md` 7b describe the slice as including task "notes", but task records have no notes field (repo CLAUDE.md). Confirmed in code: `core/spec-slice.ts:238` always emits `notes: null`, so the only notes are the plan table's `Notes` column inside `planSection`. Recommended: reword to "task titles (notes live in the plan table)" during the trim. This is a fact fix, not a rule change. INV-22/23 must stay green. Open only on whether the owner wants this fact fix inside a "trim" feature.
- **Q-C — Counting rule for `Don't`/`Never` (open, minor)**: the PRD's 70 and this doc's 77 use different greps. The Plan pins one command in the ledger header and reports before/after with it.
