---
id: prd-planner-output-matches-phase-tasks-md-style-003
featureId: feat-planner-output-matches-phase-tasks-md-style
stage: prd
status: approved
stale: false
title: Planner output matches phase-tasks.md style PRD
dependsOn: []
basedOn: {}
generatedBy: human
version: 2
createdAt: '2026-05-28T20:32:28.704Z'
updatedAt: '2026-05-28T20:38:06.738Z'
---
## Problem

The planner subagent (`plugins/specmanager/agents/planner.md`) already produces phase-structured, Fibonacci-scored plans. But its output drifts in small, visible ways from the document the project owner considers the gold standard: `docs/phase-tasks.md`. That reference doc has a few conventions the planner doesn't yet mandate, so generated `plan.md` files feel slightly off from the house style the owner explicitly likes.

The pain is consistency and trust: when the canonical example carries an estimate legend, a total-points row, and a closing rationale, but generated plans drop them, the reader has to re-establish context (what does a "3" mean? what's the whole-feature size? why are testing tasks counted?) on every plan. Plans are read more than they're written; the missing framing taxes every reader.

This is a **quality-of-output refinement to one prompt file**, not a code change, schema change, or new capability. The "product" being improved is the consistency of the markdown the planner emits.

## Users & jobs-to-be-done

- **The plan reader (primary)** — the SpecManager user reviewing a generated `plan.md` before approving it. Job: understand the scope, sizing convention, and total cost of a feature at a glance, in the same shape as `docs/phase-tasks.md` they already trust.
- **The planner subagent (the producer)** — needs an unambiguous output contract so it reliably reproduces the reference style without per-run improvisation.
- **The project owner (assumed = primary reader)** — stated the intent verbatim: "i like the plan and tasks the way it has been done here docs/phase-tasks.md, review the plan agent so it writes plans in that way."

## Goals / non-goals

### Goals
- Generated `plan.md` documents match the structural conventions of `docs/phase-tasks.md`.
- Close the four identified style deltas (see *High-level user flows* / the delta list below).
- Keep the change scoped to the planner prompt; no behavioral change to gating, task emission, or the ≤3 split rule.

### Non-goals
- Not redesigning the plan format or inventing new sections beyond what `docs/phase-tasks.md` demonstrates.
- Not changing how `create_task` records are emitted, scored, or split.
- Not changing the Plan gate, staleness, or `dependsOn`/`basedOn` wiring.
- Not editing `docs/phase-tasks.md` itself (it is the reference, not the target).
- Not touching the other subagents (prd-writer, architect, walkthrough-writer).

## Success metrics

- A freshly generated `plan.md` includes, without manual editing: (a) a `**Scale:**` legend line, (b) a phase summary table with a **Total** row, (c) a closing "Notes on estimates" section, and (d) explicit framing that testing/docs are per-phase tasks.
- Side-by-side, a generated plan and `docs/phase-tasks.md` share the same section skeleton and conventions — a reader familiar with one needs no re-orientation for the other.
- Zero regressions: phase headings still parse, exit tests still present, every persisted task still ≤3.

## Constraints & assumptions

- **Scope is a single file:** `plugins/specmanager/agents/planner.md`. (Implementation is the architect's/planner's call; this PRD only states the target.)
- The reference document is `docs/phase-tasks.md` — treat its conventions as authoritative for style.
- The planner is **already largely aligned**: it mandates `## Phase <name> — <theme>` headings, a per-phase `**Exit test:**` line, a phase summary table with point totals, `# | Task | Pts | Notes` task tables, and Fibonacci scoring with every persisted task ≤3 (5s/8s split first). The deltas below are additive prompt instructions, not a rewrite.
- **Assumption:** the four deltas fully capture the gap. If a later side-by-side review surfaces another divergence, it is in scope to note but the four below are the committed set.
- **Assumption:** the legend wording should mirror the reference exactly: `1 trivial · 2 small · 3 moderate · 5 substantial · 8 large · 13/21 epic`.
- No change to MCP tools, board, or any file outside the planner prompt.

## The deltas to close

These are the concrete gaps between current planner output and `docs/phase-tasks.md`:

1. **Scale legend line.** A `**Scale:**` row near the top of the doc spelling out the Fibonacci legend (`1 trivial · 2 small · 3 moderate · 5 substantial · 8 large · 13/21 epic`), plus the note that every persisted task is decomposed to ≤3.
2. **Total points row in the phase summary table.** The summary table gains a bold **Total** row summing all phase point totals (as `docs/phase-tasks.md` does).
3. **Closing "Notes on estimates" section.** A short trailing section stating: points are relative complexity not hours; calibrate to your own velocity after phase 1; and the rationale that the 5s/8s split is a granularity change leaving subtotals unchanged.
4. **Explicit testing/docs-as-tasks framing.** A line making clear that testing and docs are their own per-phase tasks, so "installable & testable" stays a real exit gate rather than an afterthought.

## High-level user flows

- **Generate a plan:** user runs `/specmanager:plan <feature>` → planner reads the approved Architecture (and PRD/design as today) → emits `plan.md` → the doc now opens with the Scale legend, carries a Total row in the summary table, and closes with "Notes on estimates" including the testing/docs framing.
- **Review a plan:** reader opens the generated `plan.md` → reads the legend to calibrate point meaning → sees the Total to gauge whole-feature size → reads the closing notes for sizing rationale → recognizes the same shape as `docs/phase-tasks.md`, no re-orientation needed.
- **Regression check:** the phase headings, exit tests, and task tables remain byte-compatible with the current parseable shape; emitted `create_task` records are unchanged.

## Open questions

- Should the Scale legend and ≤3 note appear before or after the Overview paragraph? `docs/phase-tasks.md` places them between the intro line and the summary table — adopt that placement unless the owner prefers otherwise.

  ANSWER: ok
- For a single-phase feature, is a Total row in the summary table redundant (it would equal the one phase's total)? Default assumption: include it anyway for consistency with the reference shape.

ANswere: ok
- Should the "calibrate after phase 1" note generalize to "after the first phase" for features whose phases aren't numbered the same way as the reference? Default: phrase it phase-agnostic.

  Answere: ok

