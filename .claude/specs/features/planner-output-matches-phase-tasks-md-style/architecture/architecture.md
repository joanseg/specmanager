---
id: arch-planner-output-matches-phase-tasks-md-style-003
featureId: feat-planner-output-matches-phase-tasks-md-style
stage: architecture
status: approved
stale: false
title: Planner output matches phase-tasks.md style architecture
dependsOn:
  - prd-planner-output-matches-phase-tasks-md-style-003
basedOn:
  prd-planner-output-matches-phase-tasks-md-style-003: 2
generatedBy: agent
version: 1
createdAt: '2026-05-28T20:39:56.228Z'
updatedAt: '2026-05-28T20:43:29.702Z'
---
## Summary

This feature is a prompt-engineering refinement to a single agent-definition file, `plugins/specmanager/agents/planner.md`, so the `plan.md` documents the planner subagent emits reproduce the house conventions of the gold-standard `docs/phase-tasks.md`. We are closing four small, visible style deltas (scale legend, Total row, "Notes on estimates" section, testing/docs-as-tasks framing) by adding unambiguous mandates to the planner's output contract — the `## What a good Plan doc contains` section — and propagating those mandates into the `## Self-check before persisting` list so the prompt stays internally consistent. **No code, schema, MCP tool, board, or runtime behavior changes.** The planner's existing mechanics (phase headings, `**Exit test:**` lines, `# | Task | Pts | Notes` tables, Fibonacci ≤3 split rule, `create_task` emission) are untouched.

## Affected components

**Edited (one file):**
- `plugins/specmanager/agents/planner.md` — the planner subagent prompt. Specifically its `## What a good Plan doc contains` section (lines ~43–58) and its `## Self-check before persisting` section (lines ~60–66). The change is additive: new mandated sections and self-check items, not a rewrite of the existing structure.

**Read-only reference (must NOT be edited):**
- `docs/phase-tasks.md` — the exemplar whose conventions we are reproducing. It is the style oracle, not a target. The PRD's non-goals explicitly forbid editing it.

**Explicitly NOT touched (out of scope — do not let the plan invent work here):**
- `plugins/specmanager/core/**` — no schema, validation, or state-machine change.
- The MCP server and its tools (`create_task`, `create_document`, `check_gate`, …) — the emitted task-record shape and the `complexity ≤3` rejection are unchanged.
- `plugins/specmanager/server/**` and `plugins/specmanager/ui/**` — the board does not render `plan.md` body structure differently.
- The other subagents: `plugins/specmanager/agents/prd-writer.md`, `architect.md`, `walkthrough-writer.md`.
- The Plan gate, staleness graph, and `dependsOn`/`basedOn` wiring.

## Data model changes

None. No frontmatter fields, zod schemas, `tasks.json` records, or manifest entries change. The `plan.md` body is freeform markdown; the additions live entirely inside that body and do not affect any parser. The two structurally-parsed constructs — the `## Phase <name> — <theme>` headings and the `# | Task | Pts | Notes` task tables — are deliberately left byte-compatible.

## Interfaces

No public functions, endpoints, or events are introduced. The only "interface" affected is the **prose output contract** inside `planner.md`. The contract gains four mandated elements, each tied to a delta in the approved PRD:

1. **Scale legend line** — a `**Scale:**` line placed *between the Overview paragraph and the phase summary table* (per the PRD's resolved open question, mirroring `docs/phase-tasks.md`). Wording must mirror the reference exactly:
   `**Scale:** \`1\` trivial · \`2\` small · \`3\` moderate · \`5\` substantial · \`8\` large · \`13\`/\`21\` epic.`
   followed by the italic note that every persisted task is decomposed to ≤3 and phase subtotals are unchanged.

2. **Total row in the phase summary table** — the summary table gains a trailing bold **Total** row summing all phase point totals. Per the PRD's resolved question, include it even for single-phase features (consistency over redundancy-avoidance).

3. **Closing "Notes on estimates" section** — a short trailing `## Notes on estimates` section stating: points are relative complexity not hours; calibrate to your own velocity after the first phase (phrase phase-agnostic per the PRD's resolved question); and the rationale that the 5s/8s split is a granularity change that leaves subtotals unchanged.

4. **Testing/docs-as-tasks framing** — an explicit line (naturally homed in the "Notes on estimates" section and/or the sizing expectations) making clear testing and docs are their own per-phase tasks, so "installable & testable" stays a real exit gate.

These are additive instructions to the prompt's `## What a good Plan doc contains` numbered list (e.g. promote the existing item 2 "Phase summary table" to require the Total row, and add new items for the Scale legend placement and the closing Notes section). The `## Self-check before persisting` list must gain matching items so the model verifies it emitted all four before reporting done.

## Sequence / flow

The runtime flow is unchanged; only the emitted markdown's shape changes:

1. User runs `/specmanager:plan <feature>` → skill checks the Plan gate (Architecture approved) → invokes the `planner` subagent.
2. Planner reads the approved Architecture + PRD (+ design if present), inspects repo paths — **unchanged**.
3. Planner drafts `plan.md`. **New:** the draft now opens (after Overview) with the Scale legend + ≤3 note, carries a **Total** row in the summary table, and closes with a `## Notes on estimates` section including the testing/docs framing.
4. Planner self-checks. **New:** the self-check now also verifies the four style elements are present, in addition to the existing ≤3-and-phase-boundary checks.
5. Planner calls `create_document` for the plan, then `create_task` per task row — **unchanged**; task titles still map 1:1 to the per-phase table rows.

## Failure & edge cases

- **Single-phase feature.** Total row equals the one phase total. Resolved in PRD: include it anyway for shape consistency. The prompt must phrase the Total mandate so it is not skipped when there is only one phase.
- **Parser regression risk.** The Total row is appended *inside* the summary table (which is not the structurally-parsed table — only the per-phase `# | Task | Pts | Notes` tables and `## Phase` headings are parsed). The mandate must explicitly keep the Total row out of any per-phase task table so no parser ever reads "Total" as a task. State this in the prompt to avoid the model placing it ambiguously.
- **Legend drift.** If the planner paraphrases the legend, readers lose the exact convention they trust. Mandate verbatim wording in the prompt and add it to the self-check.
- **Over-rigidity (primary design risk).** Over-specifying the prompt can make generated plans formulaic — e.g. forcing a verbose Notes section onto a one-task feature, or making the model copy `docs/phase-tasks.md`'s exact phase *count/themes* rather than just its *conventions*. Mitigation: word the mandates as "reproduce these conventions/sections" not "reproduce this content"; keep the existing "don't manufacture phases" guidance intact; phrase the calibration note phase-agnostically.
- **No gate/staleness impact.** Because nothing about `dependsOn`/`basedOn` emission changes, staleness behavior is unaffected.

## Conventions used

- **Prompt-as-contract.** SpecManager subagents are Markdown files with YAML frontmatter; behavior lives in prose mandates, not code (matches `architect.md`, `prd-writer.md`). The change follows that pattern.
- **Gate enforcement stays in core, not the prompt.** This edit touches only output formatting; it does not attempt to enforce or relax any gate (per CLAUDE.md pillar "Gate enforcement lives in core, not in prompts").
- **Structurally-parsed constructs left untouched** — `## Phase <name> — <theme>` headings and `# | Task | Pts | Notes` tables remain byte-compatible (per PRD success metric "zero regressions").
- **Internal consistency of the prompt** — every new mandate in `## What a good Plan doc contains` has a mirror in `## Self-check before persisting`, matching how the existing prompt pairs its ≤3 rule with a self-check item.
- **Exemplar-driven wording** — legend and notes text mirror `docs/phase-tasks.md` verbatim where the PRD requires (the reference is authoritative for style).

## Open questions / risks

- **Reference the exemplar by content vs. by path?** The prompt should embed the verbatim legend string and a short description of the Notes section rather than instructing the planner to open `docs/phase-tasks.md` at runtime — that file lives in *this* repo and won't exist in the target projects the planner runs against. The planner edit must be self-contained. (Recommend: embed the strings; do not tell the planner to read `docs/phase-tasks.md`.)
- **Placement of the testing/docs framing.** The PRD lists it as a distinct delta but its natural home overlaps the "Notes on estimates" section (as in the exemplar, which carries it as a Notes bullet). The planner is free to place it as a Notes bullet; flag if a reviewer wants it as a standalone line near the top instead.
- **Rigidity ceiling.** No automated check guarantees the four elements appear; the only enforcement is the self-check prose. If future side-by-side reviews show drift, a lightweight lint on emitted `plan.md` could be considered — but that would be a *code* change and is out of scope for this feature (the PRD's "assumption: the four deltas fully capture the gap").
- **No build/test surface.** There is no build system, schema, or API touched by this feature. The plan must not invent infrastructure phases; verification is a manual side-by-side read of a freshly generated `plan.md` against the four deltas (matching the PRD's success metrics).
