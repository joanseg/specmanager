---
id: plan-token-usage-optimisation-011
featureId: feat-token-usage-optimisation
stage: plan
status: approved
stale: false
title: Token usage optimisation plan
dependsOn:
  - arch-token-usage-optimisation-014
basedOn:
  arch-token-usage-optimisation-014: 3
generatedBy: agent
version: 1
createdAt: '2026-06-12T13:09:36.297Z'
updatedAt: '2026-06-12T13:22:02.573Z'
---
## Overview

Implements architecture v3's five surviving changes (D1 model tiering was dropped — no tasks exist for it): D2 MCP output economy in `server/src/mcp.ts`, D3 prompt trims of the four heaviest prompts with per-file invariant checklists, D4 doc-flow trims, D5 the density contract block into four drafting agents, and D6 the CLAUDE.md shipped-row collapse in `core/claude-md.ts`. **All work happens on a dedicated git branch (`feat/token-usage-optimisation`), never on `main`** — branch creation is the first task, every task lands on the branch, and the branch is pushed and verified (selftests, plugin validate, and the end-to-end acceptance run from a branch install) *before* any merge to `main`. This is a single phase: the changes are independent file edits whose only meaningful user verification is one acceptance experiment at the end (a plugin reinstall + Claude restart per check makes mid-build pause points artificial), per architecture open question 4 the acceptance run is the final task. Server work is sequenced before prompt work so the rebuilt `dist/` is stable while prompts are reviewed against their invariant checklists.

**Scale:** `1` trivial · `2` small · `3` moderate · `5` substantial · `8` large · `13`/`21` epic.

_Every task below is decomposed to **≤3 points**. The D2 output-economy work and the four D3 prompt trims would each have scored 5+ as single items, so they are split per tool-group and per-file respectively — a granularity change only; the phase subtotal is unchanged. Remaining items were genuinely small._

| Phase | Theme | Points |
|-------|-------|--------|
| economy | MCP output economy + prompt/doc density, on a branch | 32 |
| **Total** | | **32** |

---

## Phase economy — MCP output economy + prompt/doc density, on a branch

**Exit test:** From a plugin install built off branch `feat/token-usage-optimisation` (never `main`): (a) `npm run selftest`, the other selftest scripts, and `npm run smoke-mcp` are all green; (b) MCP tool calls visibly return compact JSON, `list_documents` returns the slim projection, and mutation tools return slim acks; (c) after `sync_claude_md`, shipped features collapse to the single `_N features shipped…_` line while in-flight rows remain; (d) `claude plugin validate plugins/specmanager` passes; (e) a reference feature's full lifecycle on Opus completes inside one 5-hour Pro window (task 1.14). Merge to `main` only after (a)–(e) pass. *(The acceptance run (e) is user-driven and costs a full window per attempt — it runs once, last.)*

| # | Task | Pts | Notes |
|---|------|-----|-------|
| 1.1 | Create and push branch `feat/token-usage-optimisation` from `main` | 1 | All subsequent tasks commit here; sets upstream so the branch is testable remotely before merge. |
| 1.2 | D2: compact `text()` serialisation in `mcp.ts` + assertion updates | 2 | Drop `null, 2` at mcp.ts:46. Update any selftest/smoke-mcp assertions that depend on pretty output in the same commit. |
| 1.3 | D2: `docSummary()` projection for `list_documents` + assertion updates | 2 | Project to `{ id, featureId, stage, kind, status, stale, title, version, phase, filePath }`; `read_document` unchanged. |
| 1.4 | D2: slim mutation acks (6 tools) + assertion updates | 3 | `create_document`/`create_design_brief`/`write_document` → `{ id, version, filePath }`; `set_status` → `{ id, status, stale }`; `create_task`/`update_task` → `{ id, status, phase, complexity }`. `list_tasks`, `check_gate`, `list_phases`, `get_next_phase` untouched. |
| 1.5 | D6: shipped-row collapse in `renderBlock()` + selftest coverage | 3 | Shipped = approved walkthrough with `phase: "final"`; collapse to `_N features shipped — full history on the board._`. Repo check confirms manifest.ts:81 already exposes `phase` on document entries — verify, don't add. Marker merge untouched. |
| 1.6 | Rebuild `server/dist`; full selftest suite + smoke-mcp green | 2 | `npm run build` then every selftest script by name. `ui/` untouched by D2/D6 → no ui rebuild. Commit the rebuilt `dist/`. |
| 1.7 | D3: trim `specmanager-interview.md` (~10.8 KB → ~6 KB) | 3 | Per architecture invariants: four-section synthesis format, `dependsOn: []`/`basedOn: {}` contract, `write_document`+`baseVersion` re-interview, instant-exit, one-question-per-turn, plan-diff format. |
| 1.8 | D3: trim `specmanager-build.md` (~7.5 KB → ~4.5 KB) | 2 | Step 8 sync branches stated once (keep table, cut prose). Invariants: manual re-sync block byte-identical; three AskUserQuestion options + exact action orders; mid-phase-stop = no sync prompt. |
| 1.9 | D3: trim `planner.md` (~10.9 KB → ~6.5 KB) | 3 | Conventions stated once; self-check references them. Invariants verbatim: `## Phase <name> — <theme>`, `**Exit test:**`, `# \| Task \| Pts \| Notes`, `**Scale:**` legend, summary table + **Total** row, dotted numbering, ≤3 splitting, AskUserQuestion-before-multi-phase. |
| 1.10 | D3+D4: trim `walkthrough-writer.md` (~8.5 KB → ~5.5 KB) | 3 | Compress 9-section spec; per-phase inputs become Plan + this phase's tasks/artifacts; PRD read moves to final mode; Architecture on-demand. Invariants: section order, exit-criterion blockquote, pass-criteria checklist, both modes' gates and filenames. |
| 1.11 | D4: `builder.md` prior-walkthrough-only + mockup reads via `Read(filePath)` in planner/builder; designer light pass | 2 | Builder step 4 reads only the immediately prior phase walkthrough; design mockups read via `Read` on `list_documents`' `filePath` (chunked), not `read_document`. |
| 1.12 | D5: density contract block into 4 drafting agents + prd-writer length tweak | 2 | Verbatim block from architecture D5 into `prd-writer`, `architect`, `planner`, `walkthrough-writer` (designer excluded); prd-writer "200–500 lines" → "target ≤250 lines; longer must earn it". |
| 1.13 | `claude plugin validate` + cross-file invariant sweep; push branch | 1 | Re-review every D3 diff against its checklist in one pass; push so the branch is installable for 1.14. |
| 1.14 | End-to-end acceptance run on the branch | 3 | Reinstall plugin from the branch build; user drives a reference feature's full lifecycle on Opus within one 5-hour Pro window (PRD metric 1, architecture Q4). Pass → branch is merge-ready; the merge itself is the user's call after the exit test. |

---

## Risk & sequencing notes

- **Branch discipline is the hard requirement:** task 1.1 must land first and everything else commits to that branch. The merge to `main` is *outside* the build — it happens only after the exit test (including the acceptance run) passes on the branch.
- **Server before prompts:** 1.2–1.6 land and prove green before prompt trims start, so a selftest failure is unambiguously attributable to D2/D6, not to a prompt regression.
- **D2 tasks (1.2–1.4) serialise** — all touch `mcp.ts` and the same selftest files; each carries its own assertion updates so the suite is never knowingly red between tasks.
- **Prompt trims are the regression risk concentration** (architecture scorecard: D3/D5 risk 3). Mitigation is mechanical: each trim task's notes carry its invariant checklist, and 1.13 re-reviews all diffs before the expensive acceptance run.
- **The acceptance run costs a full 5-hour window per attempt** (PRD constraint) — it cannot be iterated cheaply. Everything cheap (selftests, validate, invariant sweep) gates it.
- **Rollback is trivial by construction:** nothing touches `main` until merge, so a failed acceptance run leaves `main` clean; fixes land as further branch commits.
- **No repo drift found.** All architecture anchors verified (mcp.ts:43/46, claude-md.ts:64, prompt byte counts exact). One refinement: `manifest.ts` already exposes `phase` (line 81), so D6 needs no manifest change — 1.5 verifies instead of adds.

## Test strategy

The repo's convention is hand-rolled selftest scripts run by name, not a test runner. Each D2/D6 task (1.2–1.5) updates the affected assertions *in the same task*, so the suite stays green commit-by-commit; 1.6 is the consolidated rebuild-and-run gate. Prompt changes have no script coverage beyond `selftest-phases`' parsing of plan constructs — their test is the per-file invariant checklist (in each task) plus the 1.13 sweep and `claude plugin validate`. The end-to-end acceptance run (1.14) is the single expensive experiment, scheduled last per architecture open question 4.

## Out of scope

- **D1 model tiering** — dropped by scope decision; no model names in frontmatter, commands, or config; no `--model` argument. Do not reintroduce.
- Token instrumentation or per-phase reporting (PRD non-goal).
- Any change to `core/documents.ts`, `board-server.ts`, gates, staleness, optimistic concurrency, or the line-anchored marker merge.
- The seven already-lean command files (beyond what D4/D5 name) and `ui/` (no UI surface; no ui rebuild).
- Optimising the Cursor/Codex/Antigravity surfaces — they inherit this result; their plans wait for this feature's final walkthrough (architecture Q6).
- A Sonnet quality rubric — board approval remains the fidelity check.
- Merging to `main` as a build task — the merge is the user's post-acceptance decision.

## Notes on estimates

Points are relative complexity, not hours — calibrate against actual velocity after the first phase before trusting the 32-point total. Every task is ≤3: the D2 output-economy block and the D3 trims were split per tool-group and per-file from what would have been 5/8-point items, which changes granularity only, not the phase subtotal. Verification is deliberately its own tasks (1.6 rebuild+selftests, 1.13 validate+sweep, 1.14 acceptance) rather than a footnote on the code tasks, because this feature's exit gate — installable from the branch, green, and window-fitting on Opus — is the whole point of the work.
