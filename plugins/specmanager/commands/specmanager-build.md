---
description: Build one phase of a SpecManager feature's plan via the builder subagent. Stops at the phase boundary; never advances.
argument-hint: "<featureId or slug> <phaseName | \"next\"> [--force]"
---

Build one phase of the plan for **$ARGUMENTS**.

`$ARGUMENTS` is `<feature> <phaseName | "next"> [--force]`.
- `next` resolves to the first phase whose tasks aren't all done (`get_next_phase`).
- Otherwise `<phaseName>` must match a `## Phase <name>` heading from `plan.md` exactly.
- `--force` allows building out of order. Off by default.

## Steps

1. **Parse the arguments.** Split into `<feature>`, `<phaseName>`, optional `--force`. If `<phaseName>` is missing, ask the user (offer `list_phases({ featureId })`).
2. **Resolve the feature.** `list_features` → match by `id`/`slug`. Stop if not found.
3. **Check the Plan is approved.** `check_gate({ featureId, stage: "plan" })` must be `ok: true` AND an approved `plan` doc must exist (`list_documents({ featureId, stage: "plan" })`). If not, report and stop — the builder needs a stable plan.
4. **Resolve the target phase.** `next` → `get_next_phase({ featureId })`; `null` means "All phases done — nothing to build", stop. Otherwise find `<phaseName>` in `list_phases({ featureId })`; if absent, list available phases and stop.
5. **Order check (unless `--force`).** If any phase with a lower `order` than the target has `status !== "done"`, refuse: "Phase X has open tasks — build it first, or pass `--force`."
6. **Idempotency.** If the target phase is already `done`, report and stop — suggest `/specmanager-walkthrough <feature> <phaseName>` instead.
7. **Invoke the builder.** `Task({ subagent_type: "builder", prompt: ... })` with: feature id/title/slug, the resolved phase name (not `next`), the Plan doc id, and the phase's exit-test line lifted from `plan.md`.
8. **Auto-fire the phase walkthrough (only if the phase is now fully done).** When the builder returns, `check_gate({ featureId, stage: "walkthrough", phase: "<phaseName>" })` — the gate opens only when every task in the phase is `done`.
   - Gate **closed** (mid-phase stop) → skip auto-fire, go to step 9 and report the stop.
   - Gate **open** → dedupe first: `list_documents({ featureId, stage: "walkthrough" })` filtered to `frontmatter.phase === "<phaseName>"`. If one exists, don't create another — note it in the report. Otherwise auto-invoke `Task({ subagent_type: "walkthrough-writer", prompt: ... })` in per-phase mode (feature id/title/slug, phase name, Plan doc id, the exit-test line, and a hint that this phase's task artifacts come from `list_tasks` filtered by `phase`). The walkthrough lands in `draft` — never approve it.
   - **Then offer the post-phase doc sync (only on this open-gate path).** Present an `AskUserQuestion` with exactly **three** options; list **Full sync now** first, labelled *(recommended)* — ordering + label convey the default (matching the style in `commands/specmanager-plan.md` / `agents/planner.md`). Cancel/decline = **Wait**. Run the chosen branch's tools in this exact order (`/init` is the native in-session slash command, not a server/MCP call):

     | Answer | Actions, in order |
     |---|---|
     | **Full sync now** *(recommended, default)* | `/init` → `sync_claude_md` → `sync_design_md({ mode: "refresh" })` |
     | **Managed blocks only** | `sync_claude_md` → `sync_design_md({ mode: "refresh" })` (no `/init`) |
     | **Wait until I've verified the phase** | no sync; print the manual re-sync block below |
     | *(cancel / decline)* | same as **Wait** |

     On the **Wait** branch (and on cancel/decline), print this block **exactly as written** — do not paraphrase, reword, or change the spacing:

     ```
     Docs not synced. After you've verified this phase, re-sync manually:
       /init   (then)   sync_claude_md   +   sync_design_md(refresh)
     ```
9. **Report.**
   - The tasks the builder completed and the artifacts recorded.
   - If step 8 auto-created a walkthrough: its doc id + file path (`walkthroughs/<slug>/phase-<phaseName>.md`), `draft` awaiting review. If one already existed: say so, point at `/specmanager-walkthrough <feature> <phaseName>`.
   - **Which sync path ran** (only when the question was asked): Full sync now → "Codebase docs regenerated via `/init` + both managed blocks refreshed (CLAUDE.md and DESIGN.md)." · Managed blocks only → "Both managed blocks refreshed (CLAUDE.md and DESIGN.md); codebase-doc region left as-is." · Wait/cancel → "Docs intentionally not synced — manual re-sync command printed above." If a sync tool errored mid-sequence, surface the error verbatim and note which steps did/didn't run; don't retry.
   - **Mid-phase stop** (walkthrough gate closed): report the stop only — there was no sync prompt, so say nothing about syncing. Surface the failing task id and the error verbatim. Don't retry.

## Don't
- Don't bypass the plan-approved check. The Plan is the contract.
- Don't run two phases back-to-back; the user reviews each one.
- Don't approve any documents.
- Don't mark tasks `done` from this command — the builder owns task state.
- Don't drive a phase that is already done.
- Don't sync docs unconditionally: the sync `AskUserQuestion` fires **only** on the open-gate path; a mid-phase stop stays prompt-free and syncs nothing.
- Don't run `/init` on **Managed blocks only**, and don't refresh any managed block on **Wait** — all three sync steps defer together. Never leave a half-synced state.
