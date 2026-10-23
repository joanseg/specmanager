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
| After (`1e85c75`) | 14,775 (−1,473, −9.1%) | 56 (−15) | 49 / 49 = **100%** |

### Per-file baseline

| File | Words before | Don't/Never before | Words after | Don't/Never after |
|---|---|---|---|---|
| `agents/architect.md` | 892 | 4 | 845 | 4 |
| `agents/builder.md` | 1173 | 5 | 1072 | 3 |
| `agents/designer.md` | 1195 | 6 | 1125 | 4 |
| `agents/planner.md` | 1905 | 5 | 1743 | 3 |
| `agents/prd-writer.md` | 448 | 4 | 421 | 4 |
| `agents/reviewer.md` | 552 | 0 | 550 | 0 |
| `agents/walkthrough-writer.md` | 1508 | 7 | 1412 | 5 |
| `commands/specmanager-architecture.md` | 188 | 1 | 176 | 1 |
| `commands/specmanager-board.md` | 110 | 1 | 100 | 1 |
| `commands/specmanager-build.md` | 2683 | 13 | 2528 | 10 |
| `commands/specmanager-design.md` | 416 | 2 | 279 | 2 |
| `commands/specmanager-init.md` | 884 | 4 | 643 | 3 |
| `commands/specmanager-interview.md` | 1031 | 5 | 992 | 3 |
| `commands/specmanager-loop.md` | 1501 | 5 | 1495 | 5 |
| `commands/specmanager-plan.md` | 633 | 4 | 521 | 4 |
| `commands/specmanager-prd.md` | 304 | 3 | 289 | 3 |
| `commands/specmanager-walkthrough.md` | 459 | 2 | 329 | 1 |
| `docs/agent-snippets/design-grounding.md` | 173 | 0 | 173 | 0 |
| `docs/agent-snippets/lossless-carryover.md` | 193 | 0 | 82 | 0 |
| **Total** | **16,248** | **71** | **14,775** | **56** |

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
| 1 | "Keep it grounded — every "we will add X" should reference a real file or directory that exists today." (standalone paragraph) | C2 | `agents/architect.md` § Don't, first bullet ("Don't invent files or modules that don't exist — every "we will add X" references a real file or directory that exists today.") | — | — |
| 2 | "This is the structure this prompt already produces; making it a rule guarantees … `meta.architectureRefs` … resolves unambiguously — the build command locates the heading whose id-token (or kebab-slug) equals the ref and slices to the next same-level heading…" | C5 | `core/spec-slice.ts:resolveArchitectureRefs` (via `idToken` / `kebabSlug` / `indexHeadings`); the prompt keeps the anchor rules, the `architectureRefs` link and "do not reuse an anchor for two sections" | INV-35 (count unchanged, 1) | 1→1 |
| 3 | C4 tags "— R6" (Context7 heading) and "R3/AC2a — " (anchor heading); 3 words by `wc -w` | C4 | None: provenance only | — | — |

Kept (Keep-list / plan 1.5): the Context7 block verbatim (INV-27a–c, INV-28), the design-grounding clause (INV-15a), the density contract (INV-13/29), the persist sketch and the `basedOn` lines (INV-11, 3 here), "Don't approve the doc." (INV-25), "outside `.claude/specs/`" (INV-30), the anchor rules (INV-35). Words 892→845 (−47); Don't/Never 4→4. No INV count changed, so no `max` moves and `selftest-prompts.ts` is untouched.

### `agents/builder.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|
| 1 | Research step 3: "the order returned by `list_tasks` already preserves creation order, which the planner produced in dependency order, but verify with a topological pass" | C1/C3 | Same step 3, reworded: "Order them topologically so each task's `dependsOn` predecessors come first." (the planner's ordering is the planner's concern) | — | — |
| 2 | Research step 5: "If the doc is `draft` you wouldn't be here (Plan gate would have refused)" | C5 | `server/src/core/dependencies.ts:checkGate` (plan gate requires an approved Design doc if one exists); "If none exists, proceed (design is optional)" kept | — | — |
| 3 | Execution step 2: "Read the relevant files, make the change. Keep changes small and focused" | C1 | None: default model behaviour | — | — |
| 4 | Execution step 2: "— one task = one logical unit" | C2 | Same file, Don't "Don't bundle unrelated edits into a single task's commit … planning bug; surface it" (INV-20) | — | — |
| 5 | Execution step 3: "Pre-existing repository hooks may run; respect them." | C1 | None; the hook-bypass ban "If a hook fails, fix the underlying issue rather than bypassing" is kept | — | — |
| 6 | Tags `R4` (Superpowers bullet) and `R5/AC2` (`frontend-design` bullet) | C4 | None: provenance only; "R3 reviewer" kept (INV-3) | — | — |
| 7 | Don't: "Don't start the next phase. Even one task. The phase is the testable boundary; the user must approve the walkthrough before you move on." | C2 | Same file, Stop condition 1 ("Do not look at the next phase. Do not start tasks from the next phase even if they look small.") and the intro ("You never advance to the next phase — the user reviews and explicitly invokes you again.") | INV-19 (builder 4→3, total 5→4, min 2) | 5→4 |
| 8 | Don't: "Don't skip the `in_progress` transition. The board needs the live signal." | C2 | Same file, execution step 1 "Do this BEFORE you write code so the board reflects live state." (INV-18, count unchanged 1) | INV-18 (1→1) | 1→1 |

Kept (plan 1.17 / Arch § agents/builder.md): the "Model is parent-supplied (R2)" blockquote (cleanup-owned; INV-6/7/21 unchanged) and the `tools:` frontmatter (task-020); the design-grounding method clause (INV-15a); the Superpowers boundary incl. "R3 reviewer" (INV-3, INV-26); "No vendoring" and both "graceful degradation" lines (INV-36a/b); the DESIGN.md token line (INV-37); `NEEDS_HUMAN`; the single-phase terminal line (INV-1); "never switch branches" / "never push" (INV-52a/b); "go through MCP tools only" (INV-31); the artifact-on-done line (cleanup's single carrier; INV-17); "Don't approve any documents." (INV-25). Words 1173→1071 (−102); Don't/Never 5→3. INV-19 `max` 5→4 in `selftest-prompts.ts`.

### `agents/designer.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|
| 1 | Aesthetic bar tail: "Avoid generic "AI slop" layouts: no centered-everything, no purple gradients unless the design system calls for them, no filler." | C2 | `agents/designer.md` § Design-discipline leverage, fallback "**Critique for genericness** … reject centered-everything, default purple gradients, filler content…" | INV-14e (count unchanged, 1) | 1→1 |
| 2 | Don't "Don't link external assets or use JS — the sandbox blocks them." | C2 | `agents/designer.md` § Hard constraints, **Self-contained** ("No external stylesheets, fonts, scripts, or image URLs … scripts disabled") and **No frameworks** | — | — |
| 3 | Don't "Don't persist via anything but `create_design_brief`." | C2 | `agents/designer.md` § Hard constraints, **Self-contained persistence** ("the ONLY way you write anything is the `create_design_brief` tool. Never use `Write`/`Edit`…") | — | — |
| 4 | "The tool writes to `design/mockups.html`, sets `stage: "design"`, `status: "draft"`, `generatedBy: "agent"`, escapes any leading `---` in your body, and rejects bodies over 5MB." | C5 | `create_design_brief` handler (`server/src/mcp.ts`: `DESIGN_BRIEF_MAX_BYTES` check, `sanitizeDesignBriefBody` in `core/documents.ts`, wraps `createDocument` with `stage: "design"`); the file path stays in the intro paragraph | — | — |
| 5 | C4 tags "(R5)", "(AC5)", "(AC6)", "(AC7, optional)", "(AC8)" and "Phase 3 stale-propagation" (→ "staleness propagation"); 7 words by `wc -w` | C4 | None: provenance only; "(AC7, optional)" adds nothing beyond the paragraph's own "Always optional" | INV-11 (count unchanged, 3 here) | 9→9 |

Kept (Keep-list / plan 1.6): the five fallback elements (INV-14a–e), `bootstrap_design_tokens` as the only token write path and "Never raw-`Write` to `docs/DESIGN.md`", the sandbox/no-JS constraint, the three token source-of-truth lines (INV-37, 3 here), "No vendoring" (INV-36a), the persist sketch and the `basedOn` lines (INV-11), "Don't approve the doc" (INV-25), "Don't write a prose "design brief"" (the intro states the job; when unsure, keep). Words 1195→1125 (−70); Don't/Never 6→4. No INV count changed (INV-11 9, INV-14a–e 1 each, INV-25 10, INV-36a 2, INV-37 4), so no `max` moves and `selftest-prompts.ts` is untouched.

### `agents/planner.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|
| 1 | Self-check item 2: "Any task you could score 5+? **Split it now.**" | C2 | `agents/planner.md` § The complexity rule ("Every task you persist must score ≤3. Anything that would score 5+ must be split before calling `create_task`."); `core/tasks.ts:assertSplittable` rejects complexity >3 | — | — |
| 2 | Self-check item 3: "More than one phase? The Overview must name the trigger … no trigger → collapse to one phase. A size split must already be confirmed via `AskUserQuestion` (or recorded per the loop-mode rule)." | C2 | `agents/planner.md` § The phase rule ("One phase is the default … Split only when a trigger below applies, and every split names its trigger in the Overview"; Size trigger "call `AskUserQuestion` *before persisting any task*"; the loop-mode paragraph) and § What a good Plan doc contains item 1 | INV-44 (count unchanged, 1: "loop-mode" never matched "loop mode") | 1→1 |
| 3 | Self-check item 4: "Confirm every numbered convention in **What a good Plan doc contains** is present, and that no parsed construct changed shape — …" | C2 | `agents/planner.md` § What a good Plan doc contains items 2–4 (the `**Scale:**` legend, `\| Phase \| Theme \| Points \|` + **Total**, `## Phase <name> — <theme>` "exactly this shape — downstream tools parse it", `**Exit test:**`, `# \| Task \| Pts \| Notes`, dotted numbering) | — | — |
| 4 | Don't "Don't emit a flat plan with no phases — even one phase uses the `## Phase` heading." | C2 | `agents/planner.md` § The phase rule ("One phase is the default; it still uses the `## Phase <name> — <theme>` heading and an exit test") | — | — |
| 5 | `testCommand` mechanics: "The Stop-gate reads this as its primary verification source (a real command is run; `"none"` skips the run and checks only that tasks are `done`); … so always declare it." | C5 | `hooks/stop-gate.sh` (`TEST_COMMAND="$(card_field testCommand)"`, the `"none"` branch) fed by `core/active-card.ts:resolveActiveCard`; the prompt keeps "never leave the field absent, or the Stop-gate falls back to a brittle convention probe" in one clause | INV-10 (count unchanged, 2) | 2→2 |
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
| 1 | Don't "Don't write `phase: "final"` for a single-phase feature at all — `final` is multi-phase only; the lone per-phase walkthrough is terminal and ships the feature on approval." | C2 | `agents/walkthrough-writer.md` § Inputs, phase-name bullet ("For a **single-phase feature** … is the **terminal** artifact … no `"final"` roll-up is ever written") and § Final mode refusal line; `core/shipped.ts:isFeatureShipped` | INV-1 (walkthrough-writer 3→2, total 8→7) | 8→7 |
| 2 | Final-mode lead: "**Multi-phase only:** `"final"` exists solely to roll up a feature with **two or more** phases. A **single-phase feature has no `"final"`** — its one per-phase walkthrough is terminal…" (the refusal sentence on the same line is kept) | C2 | `agents/walkthrough-writer.md` § Final mode heading ("multi-phase features only"), § Inputs phase-name bullet, and the kept refusal on the same line | INV-1 (line still matches via the refusal, 1) | (counted in row 1) |
| 3 | Don't "Don't write a new code tour in final mode." | C2 | `agents/walkthrough-writer.md` § Final mode, **Scope discipline** ("no new code tour — the phase walkthroughs own that") | — | — |
| 4 | C1: "who tests the feature by hand" → "testing by hand", "reading this six months from now" dropped; "(The slash command refuses this early, so you should not normally see it.)"; "ever"; 24 words by `wc -w` | C1 | None: the two audiences and the refusal stay; the cut text only explains them | — | — |

Kept (Keep-list / plan 1.7): the Inputs single-phase line and the Final-mode refusal (INV-1, 2 here), the emit order and headings (INV-50a–e), the `### Git strategy` derivation for manual runs, "Never invent a lesson", the density contract (INV-13/29), the persist sketch (INV-11, 1 here), "Don't approve the doc." (INV-25), and "Don't write `phase: "final"` unless every phase walkthrough is `approved`" (restates the Final-mode Gate line but is outside plan 1.7's named cuts; when unsure, keep). Words 1508→1412 (−96); Don't/Never 7→5. INV-1 `max` lowered 8→7 in `selftest-prompts.ts` (min 4 unchanged); no other INV count changed.

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
| 1 | Step 7b heading tag "(R3)" | C4 | None: provenance only | — | — |
| 2 | Step 8 heading "(R2 — driven by persisted state, not the builder's exit path)" | C4, C2 | Same step 8: "**always** call `get_phase_completion` … never infer \"phase done\" from the fact that the builder returned" (INV-5); `server/src/core/phase-completion.ts:getPhaseCompletion` | INV-5 (count unchanged, 1) | 1→1 |
| 3 | Step 8 `complete === true`: "(this is the P1 fix: a 529 that crashed the builder *after* the last task landed still fires this whole branch)" | C4, C2 | Same bullet: "the phase is fully done **regardless of how it got there**"; step 8 lead: "whether the last builder Task returned normally OR errored (any error type, including a 529)" | — | — |
| 4 | Step 9 three canned sync-path sentences: Full sync now → "Codebase docs regenerated via `/init` + both managed blocks refreshed …" · Managed blocks only → "Both managed blocks refreshed …; codebase-doc region left as-is." · Wait/cancel → "Docs intentionally not synced — manual re-sync command printed above." | C1 | Same bullet: "**Which sync path ran** … and what it refreshed"; what each path runs stays in the step 8.4 table; the Wait block stays verbatim (INV-12) | INV-12 (count unchanged, 1) | 1→1 |
| 5 | Fact fix (Q-B), no rule change: 7b "task titles + notes" → "task titles (notes live in the plan table)" | Fix | `core/spec-slice.ts` emits `notes: null` for every task; the plan table's `Notes` column is inside `planSection` | INV-23 (count unchanged, 4) | 4→4 |
| 6 | Don't "Don't suggest or attempt a `final` walkthrough for a single-phase feature (`isSinglePhase === true`) — the per-phase walkthrough is terminal …" | C2 | Same file, step 8.3: "**If `isSinglePhase === true`** … this per-phase walkthrough is the **terminal** artifact — never the `final` mode" (one INV-1 match survives here; builder, walkthrough-writer and walkthrough cmd keep theirs) | INV-1 (6→5, min 4) | 6→5 |
| 7 | Don't "Don't run `/init` on **Managed blocks only**, and don't refresh any managed block on **Wait** — all three sync steps defer together. Never leave a half-synced state." | C2 | Same file, step 8.4 table: Managed blocks only = "(no `/init`)", Wait and cancel = "no sync"; Wait block verbatim (INV-12) | INV-12 (count unchanged, 1) | 1→1 |
| 8 | Don't "Don't hand the reviewer the whole Architecture doc — pass only the assembled slice (phase plan section + task notes + …)" | C2 | Same file, step 7b: "The reviewer is read-only and never reads the whole Architecture doc — you assemble its slice"; reviewer.md lines 12 and 18 (other actor, untouched). Its "task notes" wording leaves with it, so the Q-B fix has no target here | INV-23 (4→3, min 2) | 4→3 |

Kept (plan 1.18 / Arch § commands/specmanager-build.md): every `## Don't` bullet (task-019's, including its "task notes" wording), steps 4c, 6a, 6c, 6d, the R=2/N=3 non-nesting sentence (INV-9), `get_phase_completion` (INV-5), the `--bulk` lines (INV-4, at max), the Wait block (INV-12), the `clear_active_build` lines (INV-2, at max), and everything cleanup owns: step 6b (incl. its "(R2)"), step 7's tier/alias prose and "(AC4)", the 7b fix ladder (incl. "one R2 tier higher"). Words 2683→2612 (−71); Don't/Never 13→13. No INV count changed, so no `max` moves and `selftest-prompts.ts` is untouched.

Kept (plan 1.19, task-019): the INV-2 (`clear_active_build`), INV-48b (credentials), INV-51e (branch/push) and INV-33 ("the builder owns task state") bullets; "Don't approve any documents" (INV-25); the plan-approved and back-to-back bullets; the tier/alias bullet (cleanup-owned); and "Don't let the reviewer write or change task state" (INV-8 would stay at its min 2, but it is the build command's only "you alone advance" line, and INV-8 is a two-actor rule, so cutting it would de-duplicate across actors; kept, "when unsure, keep"). Words 2612→2528 (−84); Don't/Never 13→10. `selftest-prompts.ts`: INV-1 max 6→5, INV-23 max 4→3; no `min` moved.

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
| 1 | `## What this does` items 1–3 and 5 ("Creates `.claude/specs/`…", "Writes/refreshes `manifest.json`…", managed block "between `<!-- specmanager:start -->`…", "Declares sibling repos…") | C2 | Same file, Steps 1 (`specmanager_init` creates `.claude/specs/` + `manifest.json`, managed block, `CLAUDE.md` created if missing, `repoPaths`) and § Declaring sibling repos | — | — |
| 2 | `## What this does` item 4 (DESIGN.md: Stitch spec, tokens inferred from UI source, design markers, "idempotent and non-destructive") folded into one clause | C2 | Same file, Steps 1 ("creates/refreshes `./docs/DESIGN.md` — … Google Stitch DESIGN.md format, tokens inferred from the existing UI source, managed region between `<!-- specmanager:design:start -->` / `…end -->`"; "idempotent — safe to re-run") | — | — |
| 3 | Don't 1 tail: "Native `/init` writes only **outside** those markers…; because the marker-merge in `core/claude-md.ts` is line-anchored, the two regions are disjoint" (third copy of the rationale) | C2 | Same file, Steps 2 ("writes **only outside** the SpecManager markers … the marker-merge in `core/claude-md.ts` is line-anchored, so the regions are disjoint") | — | — |
| 4 | Don't: "Don't expect init to write into a declared sibling repo — it reads siblings read-only and every write stays inside this project's meta root. To refresh a mirror… re-run init with the same path" | C2 | Same file, § Declaring sibling repos: "**The paths ARE the read grant.** … **Every write stays inside this project's meta root** — init never writes into the sibling repos"; refresh-by-re-run moved into the Reconcile-on-re-run bullet | — | — |
| 5 | `## Notes on the optional Design stage` paragraph (lifecycle arrow, "Plan gate stays open if you skip Design; a `draft` brief refuses…") compressed to one Step 3 report bullet | C3/C5 | `server/src/core/dependencies.ts:checkGate` (Plan requires an approved Design doc only if one exists); user-visible pointer kept in Steps 3 last bullet | — | — |
| 6 | Fix, no rule change: link `[Google Stitch DESIGN.md spec](../docs/references/stitch-design-md.md)` resolved from `commands/` to the non-existent `plugins/specmanager/docs/references/`; the file is repo-root `docs/references/stitch-design-md.md`, outside the plugin. Replaced with the plain spec name "Google Stitch DESIGN.md format" | — | Same file, Steps 1 | — | — |

Kept (plan 1.15 / Arch § commands/specmanager-init.md): the sibling-repo contract (read grant, writes stay in the meta root, absolute paths, per-repo files, reconcile/conflict rules), Steps 1–3 including the `repoPaths` forwarding and the `declaredRepos`/`rejectedRepos` report, the line-anchored-merge rationale once (Step 2), the three remaining Don'ts. Words 884→643 (−241); Don't/Never 4→3. No INV row covers this file, so no `max` moves and `selftest-prompts.ts` is untouched; `selftest-directory` passes after the link fix.

### `commands/specmanager-interview.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|
| 1 | Don't: "Don't give the interview `dependsOn`/`basedOn` links" (the approve half kept as its own bullet) | C2 | Same file, step 5 "Yes, none exists": "`dependsOn: []` / `basedOn: {}` is a hard contract — the interview sits outside the staleness graph; never link it." | — | — |
| 2 | Don't: "Don't ask more than one question per turn; don't re-print the full plan when a diff will do." | C2 | Same file, protocol "The loop": "**One focused question per turn** — never bundled or multi-part"; "**Plan revisions print as diffs** — never re-dump the whole plan" | — | — |
| 3 | Don't: "Don't second-guess an exit request — synthesis follows immediately." | C2 | Same file, protocol **Exit**: "Exit is **instant and unconditional**: straight to synthesis — no "are you sure?", no "one more question"" | — | — |
| 4 | Synthesis: "(chat and stored artifact identical)" | C2 | Same file, step 5: "then the four sections — chat and artifact match" | — | — |

Kept (plan 1.14 / Arch § commands/specmanager-interview.md): the behaviour spec (one question per turn, instant exit, four-section synthesis, `dependsOn: []`/`basedOn: {}` contract), "Don't delegate to a subagent" (main-session invariant), "Don't approve the interview", "Don't draft a PRD", the write-only-after-yes / MCP-only persistence bullet, the office-hours method and modes. Words 1031→992 (−39); Don't/Never 5→3. No INV row covers this file, so no `max` moves and `selftest-prompts.ts` is untouched.

### `commands/specmanager-loop.md`

| # | Removed (≤1-line quote) | Cat | Surviving carrier (file § / line) or core enforcement (file:function) | INV rows | max before→after |
|---|---|---|---|---|---|
| 1 | Requirement tags in step headings and step 11: "(R10)", "(R5)", "(R6)" ×2, "(R7)", "(R3)", "(R8)", "(R9)" | C4 | None: provenance only, no instruction | — | — |
| 2 | Rename the 4 `Task({ subagent_type: … })` dispatches → `Agent({ … })`, and "the Task" → "the Agent call" in the transient-retry paragraph (Arch Q4); no rule change | — | Same lines, steps 5–9; INV-39 matches `subagent_type: "<agent>"`, still 4 | INV-39 (count unchanged, 4) | 4→4 |

Kept (plan 1.16 / Arch § commands/specmanager-loop.md): everything frozen by INV-38–44 and INV-46b (counts unchanged: `check_gate` 1, `subagent_type` 4, `set_status` approved 1, "main session" 4, builder/`set_active_build` 0, opt-in statement 2, "no task is a human verification task" 1); the `Loop mode:` lines, the refined-intent block template, "Transient retry (R=2)" (a retry count, not a provenance tag), all `## Don't` bullets. Words 1501→1495 (−6; the tags go, "Agent call" adds two words); Don't/Never 5→5. No INV count changed, so no `max` moves and `selftest-prompts.ts` is untouched.

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

Kept (plan 1.13): step 3's single-phase `final` refusal (INV-1 carrier for this actor, 1 line) and the `isFeatureShipped` pointer, the `check_gate` call (INV-16, count unchanged), the no-duplicate rule, the phase `kind` pass, the manual-run "no build log" Lessons-learned instruction (the command is the only actor that knows the run is manual), "Don't approve the walkthrough" (INV-25, count unchanged). Words 459→329 (−130); Don't/Never 2→1 by the pinned rule (task-021 re-measure at `ad11cd8` and HEAD; the earlier "5→3" did not use the pinned `grep`). INV-1 `max` 7→6 in `selftest-prompts.ts`.

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
| builder | `model: inherit`, explicit `tools:` allowlist with no `Skill` | Add `Skill` to `tools:` (Q-A probe: the builder could not invoke skills) | See "Q-A probe (task-020)" below |
| reviewer | `model: opus`, `disallowedTools` denylist | Keep the `opus` pin (PRD Q3) | `commands/specmanager-build.md` 7b; `docs/verification/reviewer-disallowedtools.md` |
| all | no `effort` | Leave unset (PRD Q2) | Revisit only if the G4 dogfood shows a defect `effort` addresses |

### Q-A probe (task-020)

Setup: a scratch git project with one project-local skill, `.claude/skills/probe-skill/SKILL.md` ("write SKILL_RAN to probe-marker.txt"). One headless run per state, CLI 2.1.285, under a clean env, with the repo's plugin loaded and the installed one disabled:

```bash
env -i HOME="$HOME" PATH="$PATH" USER="$USER" SHELL="$SHELL" TMPDIR="$TMPDIR" CLAUDE_PLUGIN_DATA=<scratch>/data \
  claude --plugin-dir <repo>/plugins/specmanager \
    --settings '{"enabledPlugins":{"specmanager@specmanager":false}}' \
    --allowedTools Agent Skill Read Write Bash \
    -p 'Dispatch the specmanager:builder subagent ... list every tool available to you; if you have a tool named Skill, call it with skill "probe-skill" ...; else say NO_SKILL_TOOL' \
    --output-format stream-json --verbose
```

- **Before** (allowlist without `Skill`): the main session's init lists `Skill` and `probe-skill`, but the builder reported its tools as Read, Edit, Write, Bash plus the 7 SpecManager MCP tools, and answered `NO_SKILL_TOOL`. The stream had no `Skill` tool_use under the builder's `parent_tool_use_id`, and `probe-marker.txt` was absent. So the Superpowers and `frontend-design` defer paths in builder.md could never fire.
- **After** (`Skill` added after `Grep`): the builder reported `Skill` in its tool list. The stream shows `Skill {"skill":"probe-skill"}`, then the skill's `Bash printf 'SKILL_RAN' > probe-marker.txt`, both under the builder's `parent_tool_use_id`, and `probe-marker.txt` contains `SKILL_RAN`. Cost: $0.33 before, $0.41 after.
- Checks after the change: `npm run build`, `npm run selftest-prompts` (77 invariants) and `npm run selftest-directory` all pass.
- Side finding, not changed here: `Glob` and `Grep` are in the allowlist, but CLI 2.1.285 doesn't offer them as tools, not even in the main session's init list. The builder silently goes without them and searches with Bash. The entries are harmless, and the task's scope was `Skill` only.

## Verification results

task-021, at `f3ba60b` (all trim tasks committed), CLI 2.1.285. From `plugins/specmanager/server` after `npm run build` (tsc clean; the rebuild left no diff under `dist/`), with `CLAUDE_PLUGIN_DATA` pointed at a scratch dir. Every command ran once, exit 0; no re-runs were needed.

| Command | Result | Key output line |
|---|---|---|
| `npm run build` | pass | `tsc -p tsconfig.json` (no errors) |
| `npm run selftest` | pass | All Phase 1 assertions passed. |
| `npm run selftest-board` | pass | Phase B reap/rebind assertions passed. |
| `npm run selftest-phases` | pass | All Phase 7.A assertions passed. |
| `npm run selftest-build` | pass | All Phase 7.B assertions passed. |
| `npm run selftest-tiers` | pass | All R2 tier assertions passed. |
| `npm run selftest-stopgate` | pass | All R1 Stop-gate assertions passed. |
| `npm run selftest-roundtrip` | pass | PASS — selftest-roundtrip |
| `npm run selftest-pidfile` | pass | All Phase A pidfile assertions passed. |
| `npm run selftest-shutdown` | pass | All Phase C shutdown assertions passed. |
| `npm run selftest-autoport` | pass | All autoport assertions passed. |
| `npm run selftest-repos` | pass | All multi-repo declare/seed/render/reconcile + containment assertions passed. |
| `npm run selftest-specslice` | pass | All R6 spec-slice assertions passed. |
| `npm run selftest-prompts` | pass | All prompt invariant assertions passed (77 invariants checked: match + mutation). |
| `npm run selftest-directory` | pass | All directory-conformance assertions passed. |
| `npm run smoke-mcp` | pass | ok — all 18 tools registered |
| `claude plugin validate plugins/specmanager` (repo root) | pass | ✔ Validation passed (no warnings) |

Bookkeeping fixed in this task: the `commands/specmanager-walkthrough.md` per-file row (re-measured with the pinned commands: 459/2 at `ad11cd8`, 329/1 at HEAD; the task-013 note said 5→3) and the `design-grounding.md` after-columns (173/0, unchanged). The `reviewer` and `all` rows of the Frontmatter table had ended up below the Q-A probe section; they are back in the table.

## Ledger close (task-022)

Measured at `1e85c75` with the pinned commands from the Header, over the same 19 files.

- **Words:** 16,248 → 14,775 (−1,473, −9.1%). The `agents/builder.md` row is re-measured at 1072: task-017 recorded 1071, and task-020 then added one word (`Skill`) to its `tools:` line.
- **Don't/Never lines:** 71 → 56 (−15).
- **C2/C3/C5 rows with a carrier:** 49 of 49 rows whose Cat names C2, C3 or C5 (incl. mixed C1/C3, C3+C4, C3/C5, C4,C2) name a surviving carrier or `core` enforcement; none says "None". Share **100%**. Counted with an `awk` pass over the Removals tables (Cat column matching `C2|C3|C5`, carrier column non-empty and not starting `None`).
- **Dogfood (G4):** the after run meets every checklist item the before run met; see `docs/verification/prompt-simplification-dogfood.md`. No regression, so no cut prose was restored.
- **Exit test re-run at `1e85c75`:** `npm run build && npm run selftest-prompts && npm run selftest-directory && npm run selftest && npm run smoke-mcp` from `plugins/specmanager/server` all pass (77 invariants; directory conformance; Phase 1; 18 tools registered), and the rebuild left no diff under `dist/`. The full 15-self-test + `claude plugin validate` record is § Verification results (task-021, at `f3ba60b`; `1e85c75` changes only this ledger).
