---
id: plan-planner-output-matches-phase-tasks-md-style-002
featureId: feat-planner-output-matches-phase-tasks-md-style
stage: plan
status: draft
stale: false
title: Planner output matches phase-tasks.md style plan
dependsOn:
  - arch-planner-output-matches-phase-tasks-md-style-003
  - prd-planner-output-matches-phase-tasks-md-style-003
basedOn:
  arch-planner-output-matches-phase-tasks-md-style-003: 1
  prd-planner-output-matches-phase-tasks-md-style-003: 2
generatedBy: agent
version: 1
createdAt: '2026-05-28T20:45:11.622Z'
updatedAt: '2026-05-28T20:45:11.622Z'
---
## Overview

This feature is a prompt-engineering refinement to a single file — `plugins/specmanager/agents/planner.md` — so the `plan.md` documents the planner subagent emits reproduce the house conventions of the gold-standard `docs/phase-tasks.md`. We close four committed style deltas (Scale legend line, **Total** points row, "Notes on estimates" section, testing/docs-as-tasks framing) by adding additive mandates to the prompt's `## What a good Plan doc contains` section and mirroring each in `## Self-check before persisting` so the prompt stays internally consistent. No code, schema, MCP tool, board, or runtime behavior changes; the structurally-parsed constructs (`## Phase <name> — <theme>` headings and `# | Task | Pts | Notes` tables) stay byte-compatible. Because this is one small, additive edit to one Markdown file with no build/test surface, the honest shape is a **single phase** of small tasks ending in a manual side-by-side verification — there is no second working-software boundary to manufacture.

**Scale:** `1` trivial · `2` small · `3` moderate · `5` substantial · `8` large · `13`/`21` epic.
*Every task below is decomposed to **≤3 points** — there were no `5`s or `8`s to split here; the work is genuinely small. Phase subtotals are unchanged.*

| Phase | Theme | Points |
|-------|-------|--------|
| A | Reproduce phase-tasks.md conventions in the planner prompt | 5 |
| **Total** | | **5** |

---

## Phase A — Reproduce phase-tasks.md conventions in the planner prompt
**Exit test:** generate (or inspect a freshly generated) `plan.md` from the updated planner and confirm it carries, without manual editing: (a) a `**Scale:**` legend line placed between the Overview paragraph and the phase summary table, (b) a phase summary table with a bold **Total** row, (c) a closing `## Notes on estimates` section, and (d) explicit framing that testing/docs are their own per-phase tasks — and that the `## Phase` headings, `**Exit test:**` lines, and `# | Task | Pts | Notes` tables still parse unchanged. Read the result side-by-side with `docs/phase-tasks.md`: a reader familiar with one should need no re-orientation for the other.

| # | Task | Pts | Notes |
|---|------|-----|-------|
| A.1 | Add the Scale legend + ≤3 note and the **Total** row mandates to `## What a good Plan doc contains` | 2 | Embed the verbatim legend string and the ≤3 italic note; require the legend placed between Overview and the summary table; require a bold **Total** row summing phase totals, kept out of any per-phase task table, included even for single-phase features. Do not instruct the planner to read `docs/phase-tasks.md` at runtime — that file won't exist in target projects. |
| A.2 | Add the `## Notes on estimates` section + testing/docs-as-tasks framing mandate to `## What a good Plan doc contains` | 2 | Mandate a closing `## Notes on estimates` section with the embedded verbatim notes (points are relative complexity not hours; calibrate after the first phase, phrased phase-agnostic; the 5s/8s split is a granularity change leaving subtotals unchanged) plus a line that testing/docs are their own per-phase tasks. Word mandates as "reproduce these conventions/sections," not "reproduce this content," to avoid formulaic output; keep the "don't manufacture phases" guidance intact. |
| A.3 | Mirror all four mandates as matching items in `## Self-check before persisting` | 1 | Add self-check items so the model verifies the legend (verbatim wording), the Total row, the Notes section, and the testing/docs framing are all present before reporting done — matching how the existing prompt pairs its ≤3 rule with a self-check item. |
| A.4 | Verification pass: generate/inspect a plan and confirm the four deltas against docs/phase-tasks.md | 1 | No automated test exists for prompt output, so this is a deliberate manual review task. Run the Phase A exit test; confirm zero regressions on parsed constructs; note any residual divergence from the exemplar as a follow-up rather than expanding scope. |

---

## Risk & sequencing notes

- **A.1 and A.2 both edit the same `## What a good Plan doc contains` section** — sequence them in order (A.1 then A.2) to avoid edit conflicts; they touch adjacent additive content.
- **A.3 depends on A.1 + A.2** — the self-check mirrors mandates that must already exist, or the prompt would reference items it hasn't introduced.
- **A.4 depends on all edits** — verification can only run against the finished prompt.
- **Primary risk is over-rigidity** (per architecture): over-specifying can make generated plans formulaic — e.g. forcing a verbose Notes section onto a one-task feature, or copying the exemplar's exact phase count/themes. Mitigation lives in task notes: word mandates as conventions, keep the anti-manufacture guidance.
- **Parser-regression risk**: the **Total** row must stay inside the (non-parsed) summary table and never inside a per-phase `# | Task | Pts | Notes` table, or a parser could read "Total" as a task. A.1's note calls this out explicitly.
- **Rollback is trivial** — it is a single-file, additive Markdown change; reverting the commit fully restores prior behavior. No data, gate, or staleness impact.

## Test strategy

There is no build system, schema, or API in this feature's surface and no existing automated test harness in the repo (no `package.json`, no `*.test.*` files yet). Per the repo's current conventions and the PRD/architecture success metrics, verification is a **manual side-by-side read** of a freshly generated `plan.md` against the four deltas and against `docs/phase-tasks.md`. This is captured as task A.4 (a final-pass verification within the single phase), not as per-task automated tests. If future side-by-side reviews surface drift, a lightweight lint on emitted `plan.md` could be considered — but that would be a code change and is out of scope here.

## Out of scope

- Editing `docs/phase-tasks.md` — it is the style oracle, not a target.
- Any change to `plugins/specmanager/core/**`, the MCP server/tools (`create_task`, `create_document`, `check_gate`, …), `plugins/specmanager/server/**`, or `plugins/specmanager/ui/**`.
- The other subagents: `prd-writer.md`, `architect.md`, `walkthrough-writer.md`.
- The Plan gate, staleness graph, and `dependsOn`/`basedOn` emission logic.
- Changing how `create_task` records are shaped, scored, or split (the `complexity ≤3` rule and `splitRequired` rejection are unchanged).
- Instructing the planner to read `docs/phase-tasks.md` at runtime — the verbatim strings are embedded in the prompt instead, since that file won't exist in target projects.
- Adding an automated lint/check for the emitted plan structure.

## Open questions

- **Placement of the testing/docs framing.** The PRD lists it as a distinct delta, but its natural home (as in the exemplar) is a bullet in `## Notes on estimates`. This plan homes it there (task A.2). Flag if a reviewer wants it as a standalone line near the top instead.
- No repo drift found: `plugins/specmanager/agents/planner.md` exists and matches the structure the architecture describes; the `core/` directory and any test harness referenced elsewhere in the project are not yet present, which is consistent with "no build/test surface" for this feature.
