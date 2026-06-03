---
id: arch-post-phase-doc-sync-claude-md-design-md-008
featureId: feat-post-phase-doc-sync-claude-md-design-md
stage: architecture
status: approved
stale: false
title: Post-phase doc sync (CLAUDE.md + DESIGN.md) architecture
dependsOn:
  - prd-post-phase-doc-sync-claude-md-design-md-009
basedOn:
  prd-post-phase-doc-sync-claude-md-design-md-009: 2
generatedBy: agent
version: 1
createdAt: '2026-06-02T13:25:15.402Z'
updatedAt: '2026-06-02T13:39:32.500Z'
---
## 1. Summary

This feature stops project docs from drifting after a build phase lands. It is a **prompt-only** change to two existing slash-command files — `commands/specmanager-build.md` (touchpoint A) and `commands/specmanager-init.md` (touchpoint B). No new MCP tools, REST routes, or `core` functions are added; the work reuses three already-registered tools (`sync_claude_md`, `sync_design_md`, `specmanager_init`) plus Claude Code's native `/init`. Because `/init` is agent-only and interactive-only, all `/init`-running behavior lives strictly in the command prompts — never in `server/src/mcp.ts` or `server/src/board-server.ts`. The design "fits" the repo by changing only Markdown prompt-flow, leaving the TypeScript `core`/server layer and its event listeners untouched.

## 2. Affected components

**Edited (prompt files):**
- `plugins/specmanager/commands/specmanager-build.md` — touchpoint A. The post-phase sync AskUserQuestion is inserted into **step 8** (the existing "Auto-fire the phase walkthrough" point), and **step 9** (Report) gains wording for what synced. The current unconditional `sync_claude_md` line at the end of step 8 ("Then call `sync_claude_md`.") is **replaced** by the new three-option flow.
- `plugins/specmanager/commands/specmanager-init.md` — touchpoint B. A native `/init` step is appended after the existing `specmanager_init` step, and the report is extended to mention codebase docs were (re)generated.

**Referenced only — NOT edited (grounding for the non-clobber invariant and tool reuse):**
- `plugins/specmanager/server/src/core/claude-md.ts` — `syncClaudeMd` + `lineMarkerRe` (line-anchored marker merge). The invariant proof rests on this code.
- `plugins/specmanager/server/src/core/design-md.ts` — `syncDesignMd`, `mode: "init" | "refresh"`, the `specmanager:design` markers.
- `plugins/specmanager/server/src/core/init.ts` — `initProject` (what `specmanager_init` runs: `syncClaudeMd` + `syncDesignMd({ mode: "init" })`).
- `plugins/specmanager/server/src/mcp.ts` — tool registration for `specmanager_init` (line ~61), `sync_claude_md` (~369), `sync_design_md` (~378); autosync listeners `startClaudeMdAutoSync` (~432) and `startDesignMdAutoSync` (~464). **All of this stays unchanged.**

**New files:** none.

## 3. Data model changes

None. No schemas, frontmatter fields, manifest fields, or task records change. The only artifacts touched at runtime are the project's `CLAUDE.md` and `./docs/DESIGN.md`, and only through existing tools that already own their managed regions.

## 4. Interfaces

No new code interfaces. The feature composes existing registered MCP tools and one native command:

- `sync_claude_md` — no args. Refreshes the CLAUDE.md managed block.
- `sync_design_md({ mode: "refresh" })` — refreshes the DESIGN.md managed block. (`mode` default is already `"refresh"`; pass it explicitly for clarity in the prompt.)
- `specmanager_init` — runs `initProject` (managed CLAUDE.md block + DESIGN.md `mode: "init"`).
- `/init` — Claude Code native slash command, agent-only/interactive-only. Regenerates the general codebase-doc region of CLAUDE.md, outside the SpecManager markers.

The only "interface" being designed is the **AskUserQuestion** in touchpoint A. Specified as exactly three options, with the first pre-selected as the recommended default:

| Option label (recommended order) | Actions, in order |
|---|---|
| **Full sync now** *(recommended, default)* | `/init` → `sync_claude_md` → `sync_design_md({ mode: "refresh" })` |
| **Managed blocks only** | `sync_claude_md` → `sync_design_md({ mode: "refresh" })` (no `/init`) |
| **Wait until I've verified the phase** | no sync; print the manual re-sync instruction (§ below) |

The default is conveyed by listing "Full sync now" first and labeling it *(recommended)* in both the question prompt and the option text, matching the lightweight AskUserQuestion convention already used in `commands/specmanager-plan.md` / `agents/planner.md`.

## 5. Sequence / flow

### Touchpoint A — `/specmanager-build`, step 8 (phase fully done)

1. Builder returns. Command re-checks completion: `check_gate({ featureId, stage: "walkthrough", phase: "<phaseName>" })`.
2. **Gate closed (mid-phase stop):** skip everything new — no walkthrough, **no sync prompt**. Fall through to step 9 and report the stop. (Unchanged from today.)
3. **Gate open (phase fully done):**
   a. Auto-fire / dedupe the phase walkthrough draft exactly as today (`list_documents` filtered by `phase`, then `Task({ subagent_type: "walkthrough-writer", ... })` if none exists).
   b. **Present the AskUserQuestion** (three options, "Full sync now" default).
   c. Branch on the answer:
      - **Full sync now:** run native `/init`, then `sync_claude_md`, then `sync_design_md({ mode: "refresh" })`, in that order.
      - **Managed blocks only:** run `sync_claude_md`, then `sync_design_md({ mode: "refresh" })`. Skip `/init`.
      - **Wait:** run nothing; print the manual re-sync instruction.
4. **Step 9 report** notes: walkthrough doc id/path + draft status (as today), plus which sync path ran and what it touched ("codebase docs regenerated + both managed blocks refreshed" / "both managed blocks refreshed, codebase-doc region left as-is" / "docs intentionally not synced — manual command printed above").

The previously-unconditional `sync_claude_md` call at the end of step 8 is **superseded**: the managed-block refresh now happens inside "Full sync now" / "Managed blocks only", or defers wholesale on "Wait". The PRD is explicit that "Wait" defers all three steps together — we do **not** refresh the managed block while telling the user the rest is deferred.

### Touchpoint B — `/specmanager-init`

1. Call `specmanager_init` (existing step) — creates `.claude/specs/`, manifest, CLAUDE.md managed block, and `./docs/DESIGN.md` (`mode: "init"`).
2. After it returns, run native `/init` — populates the CLAUDE.md codebase-doc region outside the SpecManager markers.
3. Report both: managed blocks + DESIGN.md (from the tool result) and that codebase docs were (re)generated by `/init`.

Order is `specmanager_init` first, then `/init`, per the PRD — for clarity, not correctness (the regions are disjoint either way; see §6).

## 6. Non-clobber invariant (the load-bearing guarantee)

Three disjoint regions exist across two files:

- **CLAUDE.md native `/init` region** — general codebase docs, **outside** the SpecManager markers. SpecManager never writes here.
- **CLAUDE.md SpecManager block** — between `<!-- specmanager:start -->` / `<!-- specmanager:end -->`, written only by `syncClaudeMd`.
- **DESIGN.md block** — between `<!-- specmanager:design:start -->` / `<!-- specmanager:design:end -->`, written only by `syncDesignMd`. `/init` does not write DESIGN.md at all.

The invariant is **guaranteed by the merge logic in `core/claude-md.ts`**, not by the prompt: `syncClaudeMd` locates the markers with `lineMarkerRe(START)` / `lineMarkerRe(END)` — regexes anchored to a marker that **stands alone on its own line** (`^[ \t]*<marker>[ \t\r]*$`). When both markers are found it replaces only `existing.slice(startMatch.index … endMatch.index + len)`, splicing the freshly rendered block between an untouched `before` and `after`. Therefore:

- Whatever `/init` writes outside the markers lands in `before`/`after` and is preserved verbatim on the next `syncClaudeMd`.
- `syncClaudeMd` cannot reach into the `/init` region because it only rewrites between the two line-anchored markers.
- `/init` writes general codebase docs and does not target the SpecManager markers, so it does not disturb the managed block.

`syncDesignMd` uses the analogous `indexOf(START)`/`indexOf(END)` splice on its own design markers; `/init` never touches DESIGN.md, so there is no contention there.

**Consequence for ordering:** because the writers target disjoint, line-anchored regions, running `/init` before or after `sync_claude_md` yields the same result. The PRD-specified orders (`/init` → `sync_claude_md` in touchpoint A; `specmanager_init` → `/init` in touchpoint B) are adopted for predictable reporting, not because correctness depends on them.

## 7. Exact manual re-sync text (printed on "Wait")

Lifted verbatim from the PRD's "exact manual-command text" section:

```
Docs not synced. After you've verified this phase, re-sync manually:
  /init   (then)   sync_claude_md   +   sync_design_md(refresh)
```

This single block tells the user how to re-trigger the same three underlying steps, so the deferred sync is reproducible without guessing.

## 8. Failure & edge cases

- **Builder stops mid-phase (walkthrough gate closed):** no walkthrough, **no sync prompt**. Step 9 reports the stop only. Matches today's behavior exactly.
- **Walkthrough already exists for this phase:** the existing dedupe in step 8 still runs (no second walkthrough created); the AskUserQuestion still fires afterward, since the phase is fully done. Doc-creation and sync are independent.
- **`/init` on a project with no existing CLAUDE.md:** native `/init` creates the file with the codebase-doc region. If `syncClaudeMd` then runs and finds no markers in an otherwise non-empty file, its fallback prepends the block (`${block}\n\n${existing}`) — both regions coexist. In touchpoint B the more common path is `specmanager_init` first (file already has markers), then `/init` filling around them.
- **User declines / cancels the AskUserQuestion:** treat as the safest no-write outcome — equivalent to **Wait**: perform no sync and print the manual re-sync instruction. (Keeps the "never silently sync" non-goal intact and avoids leaving a half-synced state.)
- **A sync tool fails mid-sequence (e.g. `sync_design_md` errors after `sync_claude_md` succeeded):** surface the error verbatim in the report; do not retry automatically and do not roll back the step that succeeded. Each tool is independently idempotent, so the user can re-run the manual command. This matches the repo's "don't program defensively / don't auto-retry" stance (the builder already surfaces failures verbatim without retry).

## 9. Conventions used

- **Prompt-only change** — behavior lives in `.md` command files; the TypeScript `core`/server layer is untouched (matches the repo's "no duplicated logic; gates and syncs live in core" pillar — we add no logic, only orchestration in prompts).
- **Reuse registered MCP tools** rather than adding new ones (`sync_claude_md`, `sync_design_md`, `specmanager_init` already wired in `mcp.ts`).
- **AskUserQuestion** styled like the existing usage in `commands/specmanager-plan.md` — a short question with a recommended default, no heavyweight scaffolding.
- **Managed-region discipline** — never write inside another writer's markers; rely on `claude-md.ts` line-anchored merge.
- **Simple/incremental, no defensive programming** (user global rule): no retries, no rollback, no new abstractions; failures reported verbatim.

## 10. Open questions / risks

- **AskUserQuestion default-selection mechanics.** The PRD requires "Full sync now" *pre-selected*. AskUserQuestion does not always honor a literal default highlight; the prompt expresses the default by ordering it first and labeling it *(recommended)*. The planner should confirm this is sufficient to satisfy acceptance criterion 1 ("pre-selected as the default"), or decide whether the wording must explicitly instruct the agent to treat the first option as the default on an empty/ambiguous answer.
- **Cancel == Wait.** §8 treats decline/cancel as Wait (no write + print manual command). The PRD enumerates only three explicit choices and is silent on cancel; confirm this mapping is acceptable.
- **`/init` cost/noise per phase.** `/init` is slow and verbose. The "Managed blocks only" option is the mitigation per the PRD; no further throttling is designed. Flagging in case the planner wants a one-line note in the report nudging users toward the lighter option on small phases.
- **No design doc exists for this feature** — architecture is grounded in the PRD (v2) and the repo only. No design mockups to reconcile.

## 11. Out of scope / unchanged (explicit)

- **Server-side autosync listeners** `startClaudeMdAutoSync` / `startDesignMdAutoSync` in `mcp.ts` — unchanged. We do **not** add `/init` to them (it is agent-only and cannot run server-side).
- **`feature.shipped` DESIGN.md refresh** — the on-ship `syncDesignMd({ mode: "refresh" })` listener stays as a backstop; this feature is purely additive (per-phase opt-in).
- **Marker scheme** — `specmanager:start/end` and `specmanager:design:start/end` are unchanged.
- **`/specmanager-prd`** — the originally-proposed third touchpoint (PRD syncing DESIGN.md) was removed from the PRD and is **not** part of this design.
- **`core` functions, MCP tools, REST routes** — none added or modified.
