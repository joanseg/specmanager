---
id: wt-planner-output-matches-phase-tasks-md-style-005
featureId: feat-planner-output-matches-phase-tasks-md-style
stage: walkthrough
status: approved
stale: false
title: Planner output matches phase-tasks.md style — Phase A walkthrough
dependsOn:
  - plan-planner-output-matches-phase-tasks-md-style-002
basedOn:
  plan-planner-output-matches-phase-tasks-md-style-002: 1
generatedBy: agent
version: 1
phase: A
createdAt: '2026-05-29T09:38:38.347Z'
updatedAt: '2026-05-29T09:45:18.093Z'
---
## Phase A — Reproduce phase-tasks.md conventions in the planner prompt

### What shipped in this phase

The planner subagent now instructs the model to reproduce four house conventions from the gold-standard `docs/phase-tasks.md` in every `plan.md` it emits — so a freshly generated plan carries them *without manual editing*. Concretely, an emitted plan now gets: (a) a `**Scale:**` legend line wedged between the Overview paragraph and the phase summary table, (b) a phase summary table with a closing bold **Total** row, (c) a closing `## Notes on estimates` section, and (d) explicit framing that testing and docs are their own per-phase tasks. The structurally-parsed constructs the rest of the system depends on — `## Phase <name> — <theme>` headings, `**Exit test:**` lines, and `# | Task | Pts | Notes` tables — are untouched, so nothing downstream re-parses differently. This is the whole feature: it's a single-phase, prompt-only change.

This is a documentation/prompt change with no runtime surface. The "feature" is the wording inside one Markdown file that the `planner` agent loads as its system prompt; there is no code, schema, MCP tool, or board behavior in scope.

### How it works

Everything lives in one file: `/Users/joan/Documents/projects/specmanager/plugins/specmanager/agents/planner.md`. The edits are additive and land in exactly two of the prompt's sections, with the agent's existing structure (phase rule, complexity rule, emit-the-artifacts steps) left alone:

- **`## What a good Plan doc contains`** gained the four content mandates. The list it already had (Overview, phase summary table, per-phase blocks, risk/test/out-of-scope) was extended so that the Scale legend and the **Total** row are now numbered requirements, and a new closing item mandates the `## Notes on estimates` section plus the testing/docs-as-tasks framing.
- **`## Self-check before persisting`** gained a single consolidated item that mirrors all four mandates, so the model re-verifies them before reporting done — matching the prompt's existing habit of pairing each rule with a self-check.

Two deliberate design choices show up in the wording, both tracing back to the architecture's "over-rigidity" risk:

1. The mandates say **reproduce the convention**, not reproduce the content. The Scale legend and **Total** row are required verbatim (they're fixed strings), but the `## Notes on estimates` prose is explicitly "write the convention, not the verbatim content — adapt the wording … so the section never reads as boilerplate," with a carve-out to keep it to a line or two for a one-task feature. This is why a plan generated for a tiny feature doesn't get a padded Notes section.
2. The prompt does **not** tell the planner to read `docs/phase-tasks.md` at runtime. That file is the style oracle for *this* repo and won't exist in target projects, so the legend string is embedded directly in the prompt instead. The legend in the prompt (`**Scale:** \`1\` trivial · \`2\` small · \`3\` moderate · \`5\` substantial · \`8\` large · \`13\`/\`21\` epic.`) is byte-identical to line 5 of the exemplar.

The two anti-parser guards are written into the prompt too: the **Total** row must stay inside the summary table and is explicitly forbidden from any per-phase `# | Task | Pts | Notes` table ("a parser will misread 'Total' as a task"), and the self-check item closes with a check that the parsed constructs "still match exactly."

### Code tour

All four tasks touched only `plugins/specmanager/agents/planner.md`. Grouped by task:

- **A.1 — Scale legend + Total row mandates** (`task-001`, commit `2b0912a`). Added item 2 ("Scale legend") and extended item 3 ("Phase summary table") under `## What a good Plan doc contains`. Item 2 embeds the verbatim legend fenced block and requires it placed between the Overview and the summary table, followed by the italic ≤3-points note. Item 3 requires the bold **Total** row summing phase totals, mandates it even for single-phase features, and adds the "never put **Total** in a per-phase task table" parser guard. (+12 / −5 lines.)

- **A.2 — Notes on estimates section + testing/docs framing** (`task-002`, commit `1989001`). Added item 8 ("Notes on estimates") under the same section: a closing `## Notes on estimates` section covering points-are-relative-complexity-not-hours (phrased phase-agnostically — "after the first phase," never hard-coded to Phase 1), the ≤3 granularity note, and the line that testing/docs are their own per-phase tasks. Includes the "write the convention, not the verbatim content" and "don't pad a one-task feature" guidance. (+6 lines.)

- **A.3 — Mirror the four mandates in the self-check** (`task-003`, commit `e6c149e`). Added item 4 under `## Self-check before persisting` with four sub-bullets mirroring the legend (verbatim wording), the **Total** row (and its absence from per-phase tables), the Notes section, and the parser-shape check for `## Phase` headings / `**Exit test:**` lines / task tables. (+5 lines.)

- **A.4 — Verification pass** (`task-004`, commits `2b0912a`, `1989001`, `e6c149e`; also read `docs/phase-tasks.md`). No code change — this was the deliberate manual side-by-side review described below. The plan flagged that there's no automated test harness for prompt output, so verification is a human read, not a test file.

### How to verify

Run the Phase A exit test from the plan: generate (or inspect a freshly generated) `plan.md` from the updated planner and confirm it carries, *without manual editing*:

1. a `**Scale:**` legend line placed between the Overview paragraph and the phase summary table;
2. a phase summary table with a bold **Total** row;
3. a closing `## Notes on estimates` section;
4. explicit framing that testing/docs are their own per-phase tasks;

…and confirm the parsed constructs still parse unchanged — `## Phase` headings, `**Exit test:**` lines, and `# | Task | Pts | Notes` tables. Then read the result side-by-side with `/Users/joan/Documents/projects/specmanager/docs/phase-tasks.md`: a reader familiar with one should need no re-orientation for the other.

The plan that produced *this* feature (`plan-planner-output-matches-phase-tasks-md-style-002`) is itself a worked example of the convention landing — it opens with the verbatim `**Scale:**` line, its summary table closes with a `| **Total** | | **5** |` row, and it carries a `## Test strategy` plus the relative-complexity framing. A grep against the exemplar confirms the four anchors line up (legend line 5, `| **Total** |` row at line 16, `## Notes on estimates` at line 153, relative-complexity bullet at line 155).

### Known limitations / follow-ups

- **No automated guard.** Nothing lints emitted `plan.md` for these conventions — drift can only be caught by a future side-by-side read. The plan calls out that a lightweight lint on emitted plans *could* be added later, but that would be a code change and is explicitly out of scope here.
- **Convention, not enforcement.** Because the Notes section is intentionally phrased as "adapt the wording," there's residual room for a model to under- or over-write it. The mitigation is the wording itself plus the self-check; there's no hard stop.
- **Open question carried forward (from the plan).** The testing/docs-as-tasks framing is homed as a bullet inside `## Notes on estimates` (following the exemplar) rather than as a standalone line near the top of the plan. If a reviewer prefers it elevated, that's a one-line prompt tweak.
- **Scope boundary.** The sibling subagents (`prd-writer.md`, `architect.md`, `walkthrough-writer.md`) were not touched; this change is isolated to `planner.md`.
