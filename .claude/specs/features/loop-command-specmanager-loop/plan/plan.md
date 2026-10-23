---
id: plan-loop-command-specmanager-loop-021
featureId: feat-loop-command-specmanager-loop
stage: plan
status: approved
stale: false
title: Loop command (/specmanager-loop) plan
dependsOn:
  - arch-loop-command-specmanager-loop-027
basedOn:
  arch-loop-command-specmanager-loop-027: 1
generatedBy: agent
version: 1
createdAt: '2026-10-01T11:12:33.303Z'
updatedAt: '2026-10-01T11:13:25.037Z'
---
## Overview

Builds `prd-loop-command-specmanager-loop-042` per `arch-loop-command-specmanager-loop-027`: one new orchestration prompt (`commands/specmanager-loop.md`), a one-sentence loop-mode carve-out in `agents/planner.md`, invariants INV-38…INV-44 in `selftest-prompts.ts`, the managed-block **Commands:** string in `core/claude-md.ts`, doc listings, and a 1.0.2 → 1.1.0 release. **Single phase** (confirmed by the owner): the command file is only usable once the whole chain (resolve → refine → stages → review → questions → report) exists, and every other change is small, so there is no partial result worth stopping to verify. Alternative considered: phase 1 = command + selftests, phase 2 = docs + release; rejected because phase 1 would leave an unlisted, unreleased command with nothing new to demo. No design doc (feature has no UI). Work on a feature branch, one commit per task.

**Scale:** `1` trivial · `2` small · `3` moderate · `5` substantial · `8` large · `13`/`21` epic.

*Every task below is decomposed to **≤3 points**: the command file (otherwise ~8) is split by section; the rest was genuinely small. Phase subtotal unchanged by the split.*

| Phase | Theme | Points |
|---|---|---|
| loop | `/specmanager-loop` command, invariants, docs and release | 16 |
| **Total** | | **16** |

---

## Phase loop — `/specmanager-loop` command, invariants, docs and release

**Exit test:** `cd plugins/specmanager/server && npm run build && npm run selftest-prompts && npm run selftest && npm run selftest-directory` passes and `claude plugin validate plugins/specmanager` prints `✔ Validation passed`. *(No dogfood task: the owner dropped it; the loop is exercised on real features after release.)*

| # | Task | Pts | Notes |
|---|---|---|---|
| 1.1 | Create `commands/specmanager-loop.md`: frontmatter, intent entry, feature resolution and refinement | 3 | Arch R1, R2 (incl. Q1: title proposed in round 1), R3 (Q2: ≤2 rounds × ≤4 questions, skip option, UI-facing always asked, interview doc read first), R11 (description contains `approves each stage's document automatically`; opening turn repeats it). Shape as `specmanager-build.md` / `specmanager-interview.md`. |
| 1.2 | Add the stage chain to the loop command: existing-doc check, gates, subagent dispatch, auto-approval, conditional Design, failure stop | 3 | Arch R4, R5, R9 (Q5: 529 retry R=2 with pre-retry `list_documents`), R10, subagent prompt contract (refined intent + `Loop mode:` line; designer "no attachments"; planner split rule). Plan approved only after `plan.md` has `## Phase` and `list_tasks` non-empty. |
| 1.3 | Add the loop-mode sentence to `agents/planner.md` | 1 | Q7: beside "Confirm any split with the user first" (line 18): in loop mode, no `AskUserQuestion`; apply the recommendation and record decision + alternative under Open questions. Must contain `loop mode` exactly once (INV-44). |
| 1.4 | Add review, end questions, report and Don't list to the loop command | 3 | Arch R6 (Q3 inline; Q4: design defang `---` → `<!-- --- -->`, task sync via `update_task`/`create_task`, removals → questions; `link_documents` re-stamp; `baseVersion` conflict → question), R7, R8 (Q8 report-only note; suggest `/specmanager:specmanager-build <slug> next`). Don't list phrases the Build ban without the INV-42 literals. |
| 1.5 | Add INV-38…INV-44 to `server/src/selftest-prompts.ts` | 2 | Arch R12 table. INV-16 and INV-25 untouched. Highest existing id is INV-37 (verified). Depends on 1.1–1.4. |
| 1.6 | Add `/specmanager-loop` to the managed-block Commands line in `core/claude-md.ts` and rebuild `server/dist` | 1 | `renderBlock`, `lines.push("**Commands:**")` at line 124 (arch said ~126). Text: `` `/specmanager-loop` (auto-approves, stops before Build) ``. Run `selftest` after build. |
| 1.7 | List the command in `plugins/specmanager/README.md`, root `README.md` and root `CLAUDE.md` | 1 | Arch R13 row text; root README workflow block + one sentence next to the interview paragraph (line ~79/92); CLAUDE.md `commands/*.md` Layout bullet. Then `sync_claude_md`. |
| 1.8 | Release prep: bump `version` to 1.1.0, rebuild, `selftest-directory`, `claude plugin validate` | 2 | CLAUDE.md `## Releasing` steps 1–4, stop at first failure. `npm ci` at plugin root, `npm ci && npm run build` in `server/` and `ui/` (ui dist should not move). No packaging change → no surface test. Do not push; pushing to `main` is the owner's call. |

---

## Risk & sequencing notes

- 1.1 → 1.2 → 1.4 build the command file in order (1.3, the planner sentence, is independent); 1.5 depends on 1.1–1.4 (its patterns match their text). 1.6 and 1.7 are independent of the command body; 1.8 needs everything committed and is last.
- INV-42 is a negative invariant: any `subagent_type: "builder"` or `set_active_build(` literal in the loop file fails it — phrase the Don't list around it (1.4).
- INV-44 is exact-count 1/1: don't repeat `loop mode` in `planner.md`.
- Rollback is trivial (new file + additive edits); the only shipped server change is one string in `claude-md.ts`. The risky part is behavioural (subagents may still ask the user — instructions, not tool restrictions) and only shows when the loop is used on real features after release.
- Version bump is a release only when pushed to `main`; keep 1.8 on the branch.

## Test strategy

- Hand-rolled self-tests in `server/dist/`: `selftest-prompts` after 1.5 (includes mutation + carrier-sensitivity passes for new rows), `selftest` after 1.6, `selftest-directory` in 1.8. No new test files beyond the invariant rows.
- `claude plugin validate plugins/specmanager` in 1.8.
- Prompt behaviour is not tested automatically (no harness for orchestration prompts exists); it is exercised on real features after release.

## Out of scope

- Any `core`, `mcp.ts`, `board-server.ts`, `ui/` or `hooks/` change beyond the Commands string; no new MCP tool (incl. `delete_task`), no `approvedBy` frontmatter (Q8 deferred).
- Editing the four stage commands' or the agents' "Don't approve" wording (R11).
- Build, walkthroughs, auto-resume of an interrupted loop, board UI.
- Pushing the release to `main` and the post-release marketplace check (owner).

## Open questions

Resolved by the owner at the end of planning: single phase kept; dogfood task dropped; the `agents/planner.md` loop-mode sentence is in; loop approvals recorded in the report only.

- Carried from `arch-loop-command-specmanager-loop-027`: Q2 cap and R2 near-match heuristic to tune after real runs; R6 value unproven (cut if runs yield nothing); inline R6 token cost; subagents may still ask the user; `delete_task` tool as a separate feature if removals are common.

## Notes on estimates

Points are relative complexity, not hours; recalibrate after the first phase you build with the loop. The command file is the bulk (9 of 16 points), split by section purely for granularity. Selftests, docs and release are separate tasks so the phase's "installable and testable" gate is real work, not an afterthought.
