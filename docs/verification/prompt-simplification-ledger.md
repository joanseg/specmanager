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
| `agents/architect.md` | 892 | 4 | 845 | 4 |
| `agents/builder.md` | 1173 | 5 | | |
| `agents/designer.md` | 1195 | 6 | 1125 | 4 |
| `agents/planner.md` | 1905 | 5 | 1743 | 3 |
| `agents/prd-writer.md` | 448 | 4 | 421 | 4 |
| `agents/reviewer.md` | 552 | 0 | 550 | 0 |
| `agents/walkthrough-writer.md` | 1508 | 7 | 1412 | 5 |
| `commands/specmanager-architecture.md` | 188 | 1 | 176 | 1 |
| `commands/specmanager-board.md` | 110 | 1 | 100 | 1 |
| `commands/specmanager-build.md` | 2683 | 13 | | |
| `commands/specmanager-design.md` | 416 | 2 | 279 | 2 |
| `commands/specmanager-init.md` | 884 | 4 | | |
| `commands/specmanager-interview.md` | 1031 | 5 | | |
| `commands/specmanager-loop.md` | 1501 | 5 | | |
| `commands/specmanager-plan.md` | 633 | 4 | 521 | 4 |
| `commands/specmanager-prd.md` | 304 | 3 | 289 | 3 |
| `commands/specmanager-walkthrough.md` | 459 | 2 | | |
| `docs/agent-snippets/design-grounding.md` | 173 | 0 | | |
| `docs/agent-snippets/lossless-carryover.md` | 193 | 0 | 82 | 0 |
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
| 1 | "Keep it grounded — every \"we will add X\" should reference a real file or directory that exists today." (standalone paragraph) | C2 | `agents/architect.md` § Don't, first bullet ("Don't invent files or modules that don't exist — every \"we will add X\" references a real file or directory that exists today.") | — | — |
| 2 | "This is the structure this prompt already produces; making it a rule guarantees … `meta.architectureRefs` … resolves unambiguously — the build command locates the heading whose id-token (or kebab-slug) equals the ref and slices to the next same-level heading…" | C5 | `core/spec-slice.ts:resolveArchitectureRefs` (via `idToken` / `kebabSlug` / `indexHeadings`); the prompt keeps the anchor rules, the `architectureRefs` link and "do not reuse an anchor for two sections" | INV-35 (count unchanged, 1) | 1→1 |
| 3 | C4 tags "— R6" (Context7 heading) and "R3/AC2a — " (anchor heading); 3 words by `wc -w` | C4 | None: provenance only | — | — |

Kept (Keep-list / plan 1.5): the Context7 block verbatim (INV-27a–c, INV-28), the design-grounding clause (INV-15a), the density contract (INV-13/29), the persist sketch and the `basedOn` lines (INV-11, 3 here), "Don't approve the doc." (INV-25), "outside `.claude/specs/`" (INV-30), the anchor rules (INV-35). Words 892→845 (−47); Don't/Never 4→4. No INV count changed, so no `max` moves and `selftest-prompts.ts` is untouched.

### `agents/builder.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|

### `agents/designer.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|
| 1 | Aesthetic bar tail: "Avoid generic \"AI slop\" layouts: no centered-everything, no purple gradients unless the design system calls for them, no filler." | C2 | `agents/designer.md` § Design-discipline leverage, fallback "**Critique for genericness** … reject centered-everything, default purple gradients, filler content…" | INV-14e (count unchanged, 1) | 1→1 |
| 2 | Don't "Don't link external assets or use JS — the sandbox blocks them." | C2 | `agents/designer.md` § Hard constraints, **Self-contained** ("No external stylesheets, fonts, scripts, or image URLs … scripts disabled") and **No frameworks** | — | — |
| 3 | Don't "Don't persist via anything but `create_design_brief`." | C2 | `agents/designer.md` § Hard constraints, **Self-contained persistence** ("the ONLY way you write anything is the `create_design_brief` tool. Never use `Write`/`Edit`…") | — | — |
| 4 | "The tool writes to `design/mockups.html`, sets `stage: \"design\"`, `status: \"draft\"`, `generatedBy: \"agent\"`, escapes any leading `---` in your body, and rejects bodies over 5MB." | C5 | `create_design_brief` handler (`server/src/mcp.ts`: `DESIGN_BRIEF_MAX_BYTES` check, `sanitizeDesignBriefBody` in `core/documents.ts`, wraps `createDocument` with `stage: "design"`); the file path stays in the intro paragraph | — | — |
| 5 | C4 tags "(R5)", "(AC5)", "(AC6)", "(AC7, optional)", "(AC8)" and "Phase 3 stale-propagation" (→ "staleness propagation"); 7 words by `wc -w` | C4 | None: provenance only; "(AC7, optional)" adds nothing beyond the paragraph's own "Always optional" | INV-11 (count unchanged, 3 here) | 9→9 |

Kept (Keep-list / plan 1.6): the five fallback elements (INV-14a–e), `bootstrap_design_tokens` as the only token write path and "Never raw-`Write` to `docs/DESIGN.md`", the sandbox/no-JS constraint, the three token source-of-truth lines (INV-37, 3 here), "No vendoring" (INV-36a), the persist sketch and the `basedOn` lines (INV-11), "Don't approve the doc" (INV-25), "Don't write a prose \"design brief\"" (the intro states the job; when unsure, keep). Words 1195→1125 (−70); Don't/Never 6→4. No INV count changed (INV-11 9, INV-14a–e 1 each, INV-25 10, INV-36a 2, INV-37 4), so no `max` moves and `selftest-prompts.ts` is untouched.

### `agents/planner.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|
| 1 | Self-check item 2: "Any task you could score 5+? **Split it now.**" | C2 | `agents/planner.md` § The complexity rule ("Every task you persist must score ≤3. Anything that would score 5+ must be split before calling `create_task`."); `core/tasks.ts:assertSplittable` rejects complexity >3 | — | — |
| 2 | Self-check item 3: "More than one phase? The Overview must name the trigger … no trigger → collapse to one phase. A size split must already be confirmed via `AskUserQuestion` (or recorded per the loop-mode rule)." | C2 | `agents/planner.md` § The phase rule ("One phase is the default … Split only when a trigger below applies, and every split names its trigger in the Overview"; Size trigger "call `AskUserQuestion` *before persisting any task*"; the loop-mode paragraph) and § What a good Plan doc contains item 1 | INV-44 (count unchanged, 1: "loop-mode" never matched "loop mode") | 1→1 |
| 3 | Self-check item 4: "Confirm every numbered convention in **What a good Plan doc contains** is present, and that no parsed construct changed shape — …" | C2 | `agents/planner.md` § What a good Plan doc contains items 2–4 (the `**Scale:**` legend, `\| Phase \| Theme \| Points \|` + **Total**, `## Phase <name> — <theme>` "exactly this shape — downstream tools parse it", `**Exit test:**`, `# \| Task \| Pts \| Notes`, dotted numbering) | — | — |
| 4 | Don't "Don't emit a flat plan with no phases — even one phase uses the `## Phase` heading." | C2 | `agents/planner.md` § The phase rule ("One phase is the default; it still uses the `## Phase <name> — <theme>` heading and an exit test") | — | — |
| 5 | `testCommand` mechanics: "The Stop-gate reads this as its primary verification source (a real command is run; `\"none\"` skips the run and checks only that tasks are `done`); … so always declare it." | C5 | `hooks/stop-gate.sh` (`TEST_COMMAND="$(card_field testCommand)"`, the `"none"` branch) fed by `core/active-card.ts:resolveActiveCard`; the prompt keeps "never leave the field absent, or the Stop-gate falls back to a brittle convention probe" in one clause | INV-10 (count unchanged, 2) | 2→2 |
| 6 | C1: Don't "Don't write the code itself — tasks are work items, not solutions." (the planner has no code task); C4: "(R1)" and "(R3)" on the `testCommand`/`architectureRefs` bullets; 14 words by `wc -w` | C1, C4 | None: no rule; the planner's job (intro) is the plan and task records | — | — |

Kept (Keep-list / plan 1.8): every parsed shape (§ What a good Plan doc contains), the loop-mode carve-out (INV-44), the triggers (INV-45a–c), self-check "person verifying…" (INV-46a, 2), the prerequisites rule and self-check (INV-48c, 2), the `set_phase_meta` self-check (INV-10), fill mode, the complexity ≤3 statement (cleanup's single carrier), the density contract (INV-13/29), the persist sketches and the `basedOn` Don't (INV-11, 2 here), "Don't approve anything" (INV-25), the `architectureRefs` resolution sentence (outside plan 1.8's named cuts; when unsure, keep), and self-check item 1 "Re-read your draft." (outside plan 1.8's named cuts). Words 1905→1743 (−162); Don't/Never 5→3. No INV count changed (INV-10 2, INV-11 9, INV-13 4, INV-15a 3, INV-25 10, INV-29 4, INV-44 1, INV-45a–c 1, INV-46a 2, INV-48c 2), so no `max` moves and `selftest-prompts.ts` is untouched.

### `agents/prd-writer.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|
| 1 | "Your job is to produce a high-signal PRD draft and persist it." | C2 | `agents/prd-writer.md` § How to write it, step 5 (persist with `create_document`) | — | — |
| 2 | C1 explanation tails: "— the frontmatter carries it." (step 4), "— that's the architect's job." and "— the user owns approval." (Don't); 16 words by `wc -w` | C1 | None: each instruction stays verbatim; the tails only explain it | INV-25 (count unchanged, 1) | 10→10 |

Kept (Keep-list / plan 1.3): "Keep it tight. Target ≤250 lines" (has a number), "Report the new document id" (the command relies on it), the interview `dependsOn` exclusion and its reason (no `core` guard rejects an interview in `dependsOn`; `core/dependencies.ts` only filters it from the graph, so the prompt stays the carrier), the density contract (INV-13/29), "outside `.claude/specs/`" (INV-30). Words 448→421 (−27); Don't/Never 4→4. INV-13, -25, -29, -30 counts unchanged, so no `max` moves.

### `agents/reviewer.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|
| 1 | C1/C4 spans: "How to review" step 2 compressed ("For every concrete requirement … confirm the implementation satisfies it. Note any that are…" → "Confirm every … is satisfied; note any…"); C4 "(a future stage-two reviewer owns that)"; 12 words by `wc -w` (step 2: 25→19, tag: 6) | C1, C4 | None: step 2's instruction stays; the C4 tag names no rule | INV-24 (count unchanged, 1) | 1→1 |
| 2 | Fact fix (Q-B), no rule change: "task titles/notes" (description) and "task titles + notes (from `tasks.json`)" (§1 item 2) → "task titles (notes live in the plan table)"; +10 words | Fix | `core/spec-slice.ts` emits `notes: null` for every task (task records have no notes field); the plan table's `Notes` column reaches the reviewer inside the plan section (§1 item 1) | INV-22, INV-23 (counts unchanged, 1 and 2) | 1→1, 4→4 |

Kept (Keep-list / plan 1.4): both parent-advances lines (INV-8, reviewer 2 + build 1 = 3; "when unsure, keep"), "Never writes." in the description (INV-22), the slice-only contract (INV-23), no style grading (INV-24), the UI check (INV-49a/b), the verdict JSON. Words 552→550 (−12 cut, +10 fact fix); Don't/Never 0→0. No INV count changed, so no `max` moves and `selftest-prompts.ts` is untouched. The `build.md` 7b "notes" wording is task-018's.

### `agents/walkthrough-writer.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|
| 1 | Don't "Don't write `phase: \"final\"` for a single-phase feature at all — `final` is multi-phase only; the lone per-phase walkthrough is terminal and ships the feature on approval." | C2 | `agents/walkthrough-writer.md` § Inputs, phase-name bullet ("For a **single-phase feature** … is the **terminal** artifact … no `\"final\"` roll-up is ever written") and § Final mode refusal line; `core/shipped.ts:isFeatureShipped` | INV-1 (walkthrough-writer 3→2, total 8→7) | 8→7 |
| 2 | Final-mode lead: "**Multi-phase only:** `\"final\"` exists solely to roll up a feature with **two or more** phases. A **single-phase feature has no `\"final\"`** — its one per-phase walkthrough is terminal…" (the refusal sentence on the same line is kept) | C2 | `agents/walkthrough-writer.md` § Final mode heading ("multi-phase features only"), § Inputs phase-name bullet, and the kept refusal on the same line | INV-1 (line still matches via the refusal, 1) | (counted in row 1) |
| 3 | Don't "Don't write a new code tour in final mode." | C2 | `agents/walkthrough-writer.md` § Final mode, **Scope discipline** ("no new code tour — the phase walkthroughs own that") | — | — |
| 4 | C1: "who tests the feature by hand" → "testing by hand", "reading this six months from now" dropped; "(The slash command refuses this early, so you should not normally see it.)"; "ever"; 24 words by `wc -w` | C1 | None: the two audiences and the refusal stay; the cut text only explains them | — | — |

Kept (Keep-list / plan 1.7): the Inputs single-phase line and the Final-mode refusal (INV-1, 2 here), the emit order and headings (INV-50a–e), the `### Git strategy` derivation for manual runs, "Never invent a lesson", the density contract (INV-13/29), the persist sketch (INV-11, 1 here), "Don't approve the doc." (INV-25), and "Don't write `phase: \"final\"` unless every phase walkthrough is `approved`" (restates the Final-mode Gate line but is outside plan 1.7's named cuts; when unsure, keep). Words 1508→1412 (−96); Don't/Never 7→5. INV-1 `max` lowered 8→7 in `selftest-prompts.ts` (min 4 unchanged); no other INV count changed.

### `commands/specmanager-architecture.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|
| 1 | "The architect reads the PRD, scans repo conventions, and calls `create_document` itself." | C3 | `agents/architect.md` § Persist ("Call `create_document` with:") and its PRD/convention read steps; the command keeps § Don't "Don't draft architecture inline" | INV-16 (count unchanged, 1 here) | 5→5 |
| 2 | Rename "Use the `Task` tool" → "Use the `Agent` tool" (Arch Q4); no rule change | — | Same line, step 2 | — | — |

Kept (plan 1.10): `check_gate` call and closed-gate stop (INV-16), the explicit PRD-id hand-off, the Don't. Words 188→176 (−12); Don't/Never 1→1. No INV count changed, so no `max` moves and `selftest-prompts.ts` is untouched.

### `commands/specmanager-board.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|
| 1 | "The MCP tool handles platform-specific opening (`open` on macOS, `xdg-open` on Linux, `start` on Windows)." → "`open_board` opens the browser itself." | C5 | `server/src/mcp.ts` `open_board` tool (platform switch at the `xdg-open` branch); the Don't "try to start a separate process or use `Bash`" is kept | — | — |

Kept: both steps and the Don't. Words 110→100 (−10); Don't/Never 1→1. No INV row covers this file; `selftest-prompts.ts` untouched.

### `commands/specmanager-build.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|

### `commands/specmanager-design.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|
| 1 | "— open once the PRD is approved; Architecture is **not** required, design can run in parallel with it" | C5 | `server/src/core` `checkGate` (design gate on approved PRD only); the prompt keeps the `check_gate` call and "If closed, report `reason` and stop" | INV-16 (count unchanged, 1 here) | 5→5 |
| 2 | "— the designer uses them as visual reference and may inline them as data URIs. If no attachments, the designer works from the PRD + DESIGN.md alone." | C3 | `agents/designer.md` step 4 (read attachments, inline as `data:` URI) and Token-source ladder items 1–3 | — | — |
| 3 | "**Optional design reference (R5/AC7):** when `docs/DESIGN.md` holds only placeholder/`# TODO` tokens, the designer may invite an optional design reference …" | C3 + C4 | `agents/designer.md` "Invite a reference when tokens are thin"; the command keeps "Attachments are optional" | — | — |
| 4 | "The designer reads the upstream docs and `./docs/DESIGN.md`, designs the actual screens as one self-contained HTML file …, and calls `create_design_brief` itself." | C3 | `agents/designer.md` steps 1–3, Output (self-contained HTML, stacked screens + notes), Persist (`create_design_brief`) | — | — |
| 5 | Don't "inline in chat" clause: "— the subagent has the system prompt that enforces self-contained, DESIGN.md-grounded, high-fi HTML" | C3 | `agents/designer.md` Hard constraints (Self-contained, Grounded, Aesthetic bar); the Don't instruction stays | — | — |
| 6 | Don't `create_design_brief` clause: "so the `---` escape and the 5MB cap apply" | C5 | `server/src/core/documents.ts:sanitizeDesignBriefBody` + `DESIGN_BRIEF_MAX_BYTES` (5MB), applied by the `create_design_brief` tool; the Don't instruction stays | — | — |
| 7 | Rename "Use the `Task` tool" → "Use the `Agent` tool" (Arch Q4); no rule change | — | Same line, step 4 | — | — |

Kept (plan 1.11): the `check_gate` call and closed-gate stop (INV-16), the no-duplicate rule, the PRD/Architecture id lookup with `null` fallback, attachment forwarding, the report step, both Don't instructions. Words 416→279 (−137); Don't/Never 2→2. No INV count changed, so no `max` moves and `selftest-prompts.ts` is untouched.

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
| 1 | Step 3 trailing paragraph: "The planner writes `plan.md` (organised into `## Phase <name> — <theme>` sections with `**Exit test:**` lines) AND emits a `create_task` call per Build-order item with `phase` and Fibonacci `complexity` (≤3), … single named phase … spike … ≈100 points … `AskUserQuestion` … In fill mode it adds tasks to the placeholder phase only." | C3 | `agents/planner.md`: intro (one phase default, `## Phase <name> — <theme>`, spike/size triggers + `AskUserQuestion`), "Every task you persist must score ≤3", step 2 design grounding (screens/components/tokens), plan-structure steps 3–4 (`**Exit test:**`), `create_task` sketch (`phase`, `complexity`), Fill mode step 2 (placeholder phase only) | — | — |
| 2 | Rename `Task({ subagent_type: "planner", … })` → `Agent({ … })` (Arch Q4); no rule change | — | Same line, step 3 | — | — |

Kept (plan 1.12): the "Don't accept a truly flat plan … send it back to redo" bullet (the command acts on it; single-named-phase clause intact), the gate/mode resolution, the fill-mode `set_status` draft step, `check_gate` (INV-16, count unchanged), "Don't approve the plan". Words 633→521 (−112); Don't/Never 4→4. No INV count changed, so no `max` moves and `selftest-prompts.ts` is untouched.

### `commands/specmanager-prd.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|
| 1 | "— it generates a kebab-case slug, scaffolds the per-stage folders, writes `feature.json`, and refreshes `manifest.json`" | C5 | `server/src/core/features.ts:createFeature`; the prompt keeps the `create_feature({ title })` call and the report of `id`, `slug`, folder path | — | — |
| 2 | Rename "Use the `Task` tool" → "Use the `Agent` tool" (Arch Q4); no rule change | — | Same line, step 3 | — | — |

Kept (plan 1.10): "Don't approve the PRD" and "Don't approve the new feature" (INV-25, 2 here, total 10, min 8), the interview-kind exclusion, no-duplicate rule, the subagent-only Don't. Words 304→289 (−15); Don't/Never 3→3. No INV count changed, so no `max` moves and `selftest-prompts.ts` is untouched.

### `commands/specmanager-walkthrough.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|
| 1 | Don't: "Don't fabricate code tours. The subagent must read real files in per-phase mode; in final mode it must read the existing phase walkthroughs and link, not re-explain." | C3 | `agents/walkthrough-writer.md`: per-phase "Scope discipline (load-bearing)" (read the files and commits from this phase's tasks), exit checks "read them, don't invent"; final mode "do NOT re-read code" + "Link, don't re-explain"; Don't "describe what *is*" | — | — |
| 2 | Step 3: "`final` is valid only for multi-phase features. Don't burn a gate round-trip or a subagent Task." | C2 | Same step 3: "refuse before touching the gate" + the refusal text ("there is no `final` roll-up") | — | — |
| 3 | Step 4: "— for a phase name it fails until every task in that phase is `done`; for `final` it fails until every phase has an **approved** walkthrough (it lists the missing ones, and is only reachable for multi-phase features — single-phase `final` was refused at step 3)" | C5 | `server/src/core/dependencies.ts:checkGate` (walkthrough branch: phase tasks `done`; `final` lists unapproved phase walkthroughs in `reason`); the prompt keeps the `check_gate` call (INV-16) and "report `reason` and stop"; single-phase refusal stays in step 3 | INV-1 (walkthrough cmd 2→1, total 7→6, min 4) | 7→6 |
| 4 | Step 5: "and hint that that phase's task artifacts come from `list_tasks` filtered by `phase`" | C3 | `agents/walkthrough-writer.md` per-phase Inputs (`list_tasks({ featureId })` filtered to `task.phase === <phase>`) | — | — |
| 5 | Step 5: "Its `### Git strategy` comes from the commits (branch via `git branch --contains <sha>`, the message pattern; proposal unknown)." | C3 | `agents/walkthrough-writer.md` Lessons learned: "Manual run (no build log): derive the branch from the phase commits (`git branch --contains <sha>`) and the commit-message pattern, and say the proposal is unknown." | — | — |
| 6 | Step 5 final mode: "explicitly, so the agent doesn't search for them" | C1 | None: rationale only; the command still passes the phase walkthrough doc ids | — | — |
| 7 | Rename `Task({ subagent_type: "walkthrough-writer", … })` → `Agent({ … })` (Arch Q4); no rule change | — | Same line, step 5 | — | — |

Kept (plan 1.13): step 3's single-phase `final` refusal (INV-1 carrier for this actor, 1 line) and the `isFeatureShipped` pointer, the `check_gate` call (INV-16, count unchanged), the no-duplicate rule, the phase `kind` pass, the manual-run "no build log" Lessons-learned instruction (the command is the only actor that knows the run is manual), "Don't approve the walkthrough" (INV-25, count unchanged). Words 459→329 (−130); Don't/Never 5→3. INV-1 `max` 7→6 in `selftest-prompts.ts`.

### `docs/agent-snippets/design-grounding.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|

### `docs/agent-snippets/lossless-carryover.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|
| 1 | "Verified identical (byte-for-byte) across all four current call sites as of this task — `architect.md:65`, `planner.md:56`, … — no drift found. The block was originally five sentences; … were deleted (`task-020`). Two sentences survive because…" (stale line refs and history) | C4 | None: provenance only; the byte-identity it reports is enforced by INV-13 and INV-29 (min = max = 4) in `server/src/selftest-prompts.ts` | INV-13, INV-29 (counts unchanged, 4 and 4) | 4→4, 4→4 |
| 2 | Header line 3 restated as one line: "Shared prompt fragment duplicated verbatim, as the … block, in … The text below is the canonical source — it is also copy-pasted into each agent prompt (no preprocessor at install time, so the install ships the resolved text). If you change the fragment here, also update the four agent prompts." | C1 | Same file, new header line (names the four carriers, "no preprocessor", same-commit update rule, INV-13/29) | — | — |

Kept (plan 1.9 / Arch § docs/agent-snippets/): the fragment below `---`, byte-identical (verified by `diff` against the pre-edit text; INV-13/29 still 1 per carrier, 4 total); the carrier list and the update-every-carrier rule. `design-grounding.md` untouched (INV-15a/b). Words 193→82 (−111); Don't/Never 0→0. No INV count changed, so no `max` moves and `selftest-prompts.ts` is untouched; G3: no carrier changes.

## Frontmatter decisions (G2)

| Agent | Today | Decision | Evidence |
|---|---|---|---|
| prd-writer, architect, designer, planner, walkthrough-writer | `model: inherit`, no `tools` (inherit all) | No change | Arch G2: restricting tools risks breaking MCP access |
| builder | `model: inherit`, explicit `tools:` allowlist with no `Skill` | Conditional on the Q-A probe | _filled by task-020_ |
| reviewer | `model: opus`, `disallowedTools` denylist | Keep the `opus` pin (PRD Q3) | `commands/specmanager-build.md` 7b; `docs/verification/reviewer-disallowedtools.md` |
| all | no `effort` | Leave unset (PRD Q2) | Revisit only if the G4 dogfood shows a defect `effort` addresses |

## Verification results

_Filled by task-021._
