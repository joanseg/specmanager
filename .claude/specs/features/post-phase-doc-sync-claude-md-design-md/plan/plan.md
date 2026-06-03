---
id: plan-post-phase-doc-sync-claude-md-design-md-008
featureId: feat-post-phase-doc-sync-claude-md-design-md
stage: plan
status: approved
stale: false
title: Post-phase doc sync (CLAUDE.md + DESIGN.md) plan
dependsOn:
  - arch-post-phase-doc-sync-claude-md-design-md-008
basedOn:
  arch-post-phase-doc-sync-claude-md-design-md-008: 1
generatedBy: agent
version: 2
createdAt: '2026-06-02T13:41:19.280Z'
updatedAt: '2026-06-02T15:05:19.315Z'
---
## Overview

This feature stops project docs from drifting after a build phase lands, by editing two existing slash-command prompt files — nothing else. `commands/specmanager-build.md` step 8 swaps its unconditional `sync_claude_md` call for a three-option `AskUserQuestion` (Full sync now / Managed blocks only / Wait) that fires only when a phase is fully done, and `commands/specmanager-init.md` gains a native `/init` step after `specmanager_init`. There is no TypeScript, no new MCP tool, no route, no `core` change.

This is a genuinely small, prompt-only change, so it is planned as **a single phase**. The two file edits are independent one-file edits with no behavioral coupling, so there is nothing to gate one behind the other; splitting them into separate phases would add ceremony without a real testable boundary between them. The whole feature is shippable and verifiable in one pass: read both prompts end-to-end against the acceptance criteria plus a live dogfood run, since this repo dogfoods itself.

**Scale:** `1` trivial · `2` small · `3` moderate · `5` substantial · `8` large · `13`/`21` epic.

*Every task below is decomposed to **≤3 points**. This feature is genuinely small — pure prompt text — so nothing needed splitting from a 5/8; the tasks are naturally 1–2 points each, and the subtotal reflects the real work, not padding.*

| Phase | Theme | Points |
|---|---|---|
| Phase A | Post-phase doc-sync prompts (build + init commands) | 9 |
| **Total** | | **9** |

---

## Phase A — Post-phase doc-sync prompts (build + init commands)

Two independent prompt edits delivered together:

1. **`commands/specmanager-build.md`** — rework step 8 so that, only when a phase is fully done (walkthrough gate open), the command presents the three-option `AskUserQuestion` instead of unconditionally calling `sync_claude_md`, and step 9 reports which sync path ran. Mid-phase stops must remain prompt-free. This is the load-bearing surface: it owns the non-clobber ordering (`/init` → `sync_claude_md` → `sync_design_md({ mode: "refresh" })`) and the "Wait" deferral semantics.
2. **`commands/specmanager-init.md`** — append a native `/init` step after the existing `specmanager_init` call, and extend the report + Notes so the user understands codebase docs were (re)generated and never has to run `/init` separately. Disjoint, line-anchored regions mean order is for clarity, not correctness — no code change required.

**Exit test:** Read both command files end-to-end and confirm:

*specmanager-build.md* — (1) step 8, only on an open walkthrough gate, presents an `AskUserQuestion` with exactly three options — *Full sync now* (recommended, listed first/default), *Managed blocks only*, *Wait* — and the old unconditional `sync_claude_md` line is gone; (2) Full sync runs `/init` → `sync_claude_md` → `sync_design_md({ mode: "refresh" })` in that order, Managed blocks only runs `sync_claude_md` → `sync_design_md({ mode: "refresh" })` with no `/init`, and Wait runs nothing and prints the verbatim manual re-sync block; (3) the mid-phase-stop branch presents no prompt; (4) step 9 reports the chosen sync path.

*specmanager-init.md* — the Steps section runs `specmanager_init` first, then native `/init`, and the report mentions both the managed blocks/DESIGN.md and that codebase docs were (re)generated.

Then do a live dogfood: run `/specmanager-build <feature> <a completed phase>` in this repo and confirm the prompt appears and the default branch behaves; run `/specmanager-init` and confirm CLAUDE.md ends up with both a populated codebase-doc region (outside the markers) and an intact managed block, plus DESIGN.md — neither region clobbering the other. Optionally `claude plugin validate` to confirm the command files still parse. *(These are manual prompt-walkthrough and dogfood checks — there is no automated test for prompt text.)*

| # | Task | Pts | Notes |
|---|---|---|---|
| A.1 | Rewrite step 8 of `specmanager-build.md` to replace the unconditional `sync_claude_md` call with the three-option `AskUserQuestion`, fired only when the walkthrough gate is open | 3 | Three options, *Full sync now* listed first and labelled *(recommended)* per the existing `AskUserQuestion` style in `specmanager-plan.md`. Keep the existing walkthrough auto-fire/dedupe ahead of the question. |
| A.2 | Specify the per-branch action sequences inside step 8 (Full sync now / Managed blocks only / Wait), in the exact tool order from the Architecture | 1 | Full: `/init` → `sync_claude_md` → `sync_design_md({ mode: "refresh" })`. Managed blocks only: `sync_claude_md` → `sync_design_md({ mode: "refresh" })`, no `/init`. Wait: no sync. Map cancel/decline to Wait. |
| A.3 | Add the verbatim manual re-sync text block printed on the Wait branch | 1 | Lift the exact two-line block from the Architecture §7 / PRD verbatim; do not paraphrase. |
| A.4 | Update step 9 (Report) to state which sync path ran and what it touched; confirm mid-phase stop reports no sync | 1 | Three report phrasings per Architecture §5.4; keep the existing mid-phase-stop wording prompt-free. |
| A.5 | Add a native `/init` step to `specmanager-init.md` after the `specmanager_init` MCP call, and update its report + Notes | 2 | Order: `specmanager_init` first, then `/init` (clarity, not correctness — regions are disjoint per Architecture §6). Report both regions; note codebase docs are now generated as part of init so the user need not run `/init` separately. |

---

## Risk & sequencing notes

- **Tasks within the phase run in the listed order** (A.1 → A.5, a linear `dependsOn` chain). A.1–A.4 own the higher-risk build-command surface (a new `AskUserQuestion` branch and the non-clobber ordering); A.5 is a single additive init-command step with no behavioral coupling to the rest.
- **Non-clobber is already guaranteed by `core/claude-md.ts`'s line-anchored marker merge — no code change.** The only way the prompts can break it is wrong *ordering* or writing into the wrong region; A.2 and A.5 must state the orders exactly. The dogfood exit test verifies both regions survive.
- **Don't refresh the managed block on Wait.** The PRD is explicit that all three steps defer together; A.2/A.3 must not leave a half-synced state.
- **Rollback is trivial** — these are prompt files under git; revert the edit. No data migration, no state.

## Test strategy

There is no unit-testable code in this feature — it is prompt text — so there are no automated tests to write, consistent with the repo having no test harness for command `.md` files yet. Verification is manual: (1) a close prompt-walkthrough read of both files against the acceptance criteria, and (2) a live dogfood run of the edited commands in this self-hosting repo, plus optionally `claude plugin validate` to confirm the command files still parse. Both checks live in the phase's exit test.

## Out of scope

- Any change to `server/src/mcp.ts` autosync listeners (`startClaudeMdAutoSync` / `startDesignMdAutoSync`), `core/*`, the board server, or the marker scheme — `/init` is agent/interactive-only and stays in the prompts.
- New MCP tools, REST routes, or `core` functions — none; only the three already-registered tools are reused.
- The removed `/specmanager-prd` DESIGN.md touchpoint — explicitly dropped from the PRD; not planned here.
- The `feature.shipped` DESIGN.md autosync backstop — left as-is; this feature is purely additive.

## Notes on estimates

Points here are relative complexity, not clock time — and for a feature this small (a handful of prompt edits) they cluster at 1–2. Every task is **≤3 points**; nothing in this plan was a 5/8 that needed splitting — the work is genuinely small, so the phase subtotal (9) is the real total. There are no separate testing/docs tasks because there is no code to test and the doc changes *are* the work; the phase's "installable & testable" gate is its prompt-walkthrough-plus-dogfood exit test.
