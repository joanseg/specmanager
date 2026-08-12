---
description: Build one phase of a SpecManager feature's plan via the builder subagent. Stops at the phase boundary; never advances.
argument-hint: "<featureId or slug> <phaseName | \"next\"> [--force] [--bulk]"
---

Build one phase of the plan for **$ARGUMENTS**.

`$ARGUMENTS` is `<feature> <phaseName | "next"> [--force] [--bulk]`.
- `next` resolves to the first phase whose tasks aren't all done (`get_next_phase`).
- Otherwise `<phaseName>` must match a `## Phase <name>` heading from `plan.md` exactly.
- `--force` allows building out of order. Off by default.
- `--bulk` dispatches the **whole phase** in one builder Task (max tier of its tasks) instead of the default per-task loop. Off by default — an explicit opt-in for tiny, tightly-coupled phases, since it re-accepts one 529's blast radius across the whole phase.

## Steps

1. **Parse the arguments.** Split into `<feature>`, `<phaseName>`, optional `--force`, optional `--bulk`. If `<phaseName>` is missing, ask the user (offer `list_phases({ featureId })`).
2. **Resolve the feature.** `list_features` → match by `id`/`slug`. Stop if not found.
3. **Check the Plan is approved.** `check_gate({ featureId, stage: "plan" })` must be `ok: true` AND an approved `plan` doc must exist (`list_documents({ featureId, stage: "plan" })`). If not, report and stop — the builder needs a stable plan.
4. **Resolve the target phase.** `next` → `get_next_phase({ featureId })`; `null` means "All phases done — nothing to build", stop. Otherwise find `<phaseName>` in `list_phases({ featureId })`; if absent, list available phases and stop.
4c. **Mark the build active (arms the Stop-gate).** `set_active_build({ featureId, phase: <resolvedPhaseName> })` — use the concrete resolved phase name, never `"next"`. This writes the `.cache/active-build.json` marker that pins the Stop-gate to this exact phase; without it the gate is a no-op. Pair it with `clear_active_build()` on the **terminal paths only** — phase complete (step 8) and persistent-fail blocked (step 7b). A mid-phase stop, an exhausted retry budget included, must **not** clear: the build is still in flight and a re-entered session resumes this phase.
5. **Order check (unless `--force`).** If any phase with a lower `order` than the target has `status !== "done"`, refuse: "Phase X has open tasks — build it first, or pass `--force`."
6. **Idempotency.** If the target phase is already `done`, report and stop — suggest `/specmanager-walkthrough <feature> <phaseName>` instead.
6b. **Confirm the session tier→model table (R2).** Once per build session, `AskUserQuestion` to confirm or remap which Claude Code model **alias** each complexity tier dispatches at. Pre-fill the defaults from `core/tiers.ts`: **cheap → `sonnet`** (complexity 1), **standard → `sonnet`** (complexity 2), **strong → `opus`** (complexity 3, and anything >3 / unscored) — cheap is `sonnet`, not `haiku`: Haiku 4.5's 200K context cap is a correctness cliff, not a cost preference. Offer the defaults as the recommended option plus an "all `opus`" / custom alternative. Hold it in session state for this build — `aliasForTier` takes it as `sessionTable`, so what you return is live. Always use **aliases**, never dated model ids. If the user declines, keep the defaults.
7. **Invoke the builder (per-task tier dispatch is the enforced default; `--bulk` is the opt-in).** Work the phase's tasks in `dependsOn` order.

   **Default — per task (N=1, no flag).** For **each** task: read its `complexity` (`list_tasks`), resolve it through the session table (1 → cheap, 2 → standard, 3 → strong, >3 or null → strong), and dispatch `Agent({ subagent_type: "builder", model: <alias>, prompt: ... })` with: feature id/title/slug, the resolved phase name (not `next`), the **single task** id + title, the Plan doc id, and the phase's exit-test line lifted from `plan.md`. If the resolved alias is unknown/unavailable, **omit `model:`** so the builder runs at the session default (`inherit`) — never error or block (AC4). The builder marks that task `in_progress`→`done` with artifacts; on its return move to the next task. Per-task is the default because it isolates a 529 to a single card.

   **Opt-in — `--bulk`.** When `--bulk` was passed (step 1), dispatch **all** the phase's tasks in **one** builder Task at the **max tier** of its tasks (resolve each task's alias, pick the strongest). Then fall through to step 8's re-resolve exactly as the per-task path does.

   **Bounded transient-error retry (R=2, transient overload only).** Wrap **each** builder `Agent(...)` dispatch (per-task, or the single `--bulk` Task) in a bounded retry: on a transient overload error (`529` / `Overloaded`) — i.e. the Task never returned a usable result — **immediately re-dispatch the same Task** (no backoff; the agent has no `sleep` primitive and the natural inter-tool latency suffices). Retry up to **2** times (3 attempts total). If all 3 attempts are exhausted on overload, mark that task `blocked` (`update_task`) and **stop the phase** — re-entering the phase resets the retry budget. A **genuine** task failure (a test won't pass, a missing dependency) is the builder's own stop condition and is **not** retried — re-running it would just re-fail; surface it verbatim and stop. (R=2 is a *pre-completion transport retry* — the Task never returned; the Stop-gate's **N=3** is a *post-stop* cap — it ran but didn't pass. They do not nest.)
7b. **Spec-compliance review (R3) — after the Stop-gate exits 0, before advancing.** The deterministic Stop-gate hook (bash, zero model calls) already gated *stopping*; now run the semantic reviewer before the card advances. Only do this when every task in the phase is `done` (a mid-phase stop skips review). Steps:
   - **Assemble the spec slice — one call.** `get_spec_slice({ featureId, phase })` returns `{ planSection, tasks, architecture: [{ ref, heading, body }], unresolvedRefs, fallbackUsed }` — plan section, task titles + notes, and the `meta.architectureRefs` sections, resolved. The reviewer is read-only and never reads the whole Architecture doc — you assemble its slice. `null` ⇒ unknown phase name: report phase-not-found and stop.
   - **Never swallow the provenance signals.** Non-empty **`unresolvedRefs`** = a mistyped or drifted anchor — fix it with `set_phase_meta`; ignored, it silently thins the slice and the reviewer passes for lack of anything to check. **`fallbackUsed: true`** = sections name-matched rather than explicitly named, so provenance is weaker.
   - **Invoke the reviewer** — its frontmatter fixes its tier regardless of the cards' build tier: `Agent({ subagent_type: "reviewer", prompt: <the returned slice + the phase's commit shas/changed files> })`.
   - **Branch on the verdict** `{ verdict, reasons }`:
     - `pass` → continue to step 8 (advance / walkthrough).
     - `fail` → re-dispatch a **fix** to the builder one R2 tier higher than the card's current build tier (cheap→standard→strong, capped at strong), feeding it the reviewer's `reasons`. This counts against the **same** N=3 Stop-gate iteration budget for the phase — it is **not** a second independent loop. After the fix, the Stop-gate re-runs on the builder's stop; re-review. Persistent `fail` even at strong ⇒ the phase surfaces as **blocked** (the Stop-gate's cap path): `clear_active_build()`, report it and stop — do not advance.
8. **Re-resolve phase completion, then run the post-phase pipeline (R2 — driven by persisted state, not the builder's exit path).** After the step-7 dispatch loop finishes — **whether the last builder Task returned normally OR errored (any error type, including a 529)** — **always** call `get_phase_completion({ featureId, phase: "<phaseName>" })`. This single deterministic call is the source of truth for the branch; never infer "phase done" from the fact that the builder returned. (`null` ⇒ unknown phase name — report phase-not-found and stop, as a `list_phases` miss would.) Then branch on `complete`:

   - **`complete === false`** (mid-phase stop, or a builder crash with tasks still `todo`/`in_progress`) → **do not** auto-fire the walkthrough; leave the active-build marker set (step 4c). Go to step 9 and report the partial state: which tasks landed (`doneCount`/`taskCount`), the failing task id, and the error **verbatim**.

   - **`complete === true`** → the phase is fully done **regardless of how it got there** (this is the P1 fix: a 529 that crashed the builder *after* the last task landed still fires this whole branch). Run the post-phase pipeline:
     1. **Reviewer** (step 7b) — if it hasn't already run for this phase, run it now. A `fail` that persists to `blocked` follows step 7b's terminal path. Only continue when the verdict is `pass`.
     2. `clear_active_build()` now (so the next Stop is a no-op).
     3. **Auto-fire the walkthrough if `needsWalkthrough`.** `get_phase_completion` already deduped (`hasWalkthrough`): if `needsWalkthrough === false`, a walkthrough already exists — don't create another, note it in the report. If `needsWalkthrough === true`, auto-invoke `Agent({ subagent_type: "walkthrough-writer", prompt: ... })` in per-phase mode (feature id/title/slug, phase name, Plan doc id, the exit-test line, and a hint that this phase's task artifacts come from `list_tasks` filtered by `phase`). The walkthrough lands in `draft` — never approve it. **If `isSinglePhase === true`** (from `get_phase_completion`), pass the walkthrough-writer a flag that this per-phase walkthrough is the **terminal** artifact — never the `final` mode. For a single-phase feature, approving this per-phase walkthrough ships the feature (`isFeatureShipped`); there is no separate `final` roll-up.
     4. **Then offer the post-phase doc sync (only on this `complete === true` path).** Present an `AskUserQuestion` with exactly **three** options; list **Full sync now** first, labelled *(recommended)* — ordering + label convey the default (matching the style in `commands/specmanager-plan.md` / `agents/planner.md`). Cancel/decline = **Wait**. Run the chosen branch's tools in this exact order (`/init` is the native in-session slash command, not a server/MCP call):

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
   - **The reviewer's verdict** (pass, or fail + the spec points it flagged and how they were resolved). If the phase was surfaced as blocked after a persistent fail, say so and point at re-entering the phase to reset the retry budget.
   - If step 8 auto-created a walkthrough: its doc id + file path (`walkthroughs/<slug>/phase-<phaseName>.md`), `draft` awaiting review. If one already existed: say so, point at `/specmanager-walkthrough <feature> <phaseName>`.
   - **Which sync path ran** (only when the question was asked): Full sync now → "Codebase docs regenerated via `/init` + both managed blocks refreshed (CLAUDE.md and DESIGN.md)." · Managed blocks only → "Both managed blocks refreshed (CLAUDE.md and DESIGN.md); codebase-doc region left as-is." · Wait/cancel → "Docs intentionally not synced — manual re-sync command printed above." If a sync tool errored mid-sequence, surface the error verbatim and note which steps did/didn't run; don't retry.
   - **Mid-phase stop** (`get_phase_completion` returned `complete === false`): report the stop only — there was no sync prompt, so say nothing about syncing. Surface the failing task id and the error verbatim. Don't retry.

## Don't
- Don't bypass the plan-approved check. The Plan is the contract.
- Don't run two phases back-to-back; the user reviews each one.
- Don't approve any documents.
- Don't mark tasks `done` from this command — the builder owns task state.
- Don't `clear_active_build()` on a mid-phase stop — the build is in flight; clear only on the terminal done (step 8) and blocked (step 7b) paths.
- Don't suggest or attempt a `final` walkthrough for a single-phase feature (`isSinglePhase === true`) — the per-phase walkthrough is terminal and its approval ships the feature. `final` is multi-phase only.
- Don't run `/init` on **Managed blocks only**, and don't refresh any managed block on **Wait** — all three sync steps defer together. Never leave a half-synced state.
- Don't block or error when a tier's alias is unknown/unavailable — omit `model:` and let the builder inherit the session default.
- Don't let the reviewer write or change task state — it is read-only; you assemble its slice and you alone advance the card on its verdict.
- Don't hand the reviewer the whole Architecture doc — pass only the assembled slice (phase plan section + task notes + the `meta.architectureRefs` sections).
