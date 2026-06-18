---
description: Build one phase of a SpecManager feature's plan via the builder subagent. Stops at the phase boundary; never advances.
argument-hint: "<featureId or slug> <phaseName | \"next\"> [--force] [--bulk]"
---

Build one phase of the plan for **$ARGUMENTS**.

`$ARGUMENTS` is `<feature> <phaseName | "next"> [--force] [--bulk]`.
- `next` resolves to the first phase whose tasks aren't all done (`get_next_phase`).
- Otherwise `<phaseName>` must match a `## Phase <name>` heading from `plan.md` exactly.
- `--force` allows building out of order. Off by default.
- `--bulk` dispatches the **whole phase** in one builder Task (max tier of its tasks) instead of the default per-task loop. Off by default — it re-accepts a single 529's blast radius across the phase, so it's an explicit opt-in for tiny, tightly-coupled phases only.

## Steps

1. **Parse the arguments.** Split into `<feature>`, `<phaseName>`, optional `--force`, optional `--bulk`. If `<phaseName>` is missing, ask the user (offer `list_phases({ featureId })`). Default dispatch is **per-task** (step 7); `--bulk` switches to one whole-phase builder Task.
2. **Resolve the feature.** `list_features` → match by `id`/`slug`. Stop if not found.
3. **Check the Plan is approved.** `check_gate({ featureId, stage: "plan" })` must be `ok: true` AND an approved `plan` doc must exist (`list_documents({ featureId, stage: "plan" })`). If not, report and stop — the builder needs a stable plan.
4. **Resolve the target phase.** `next` → `get_next_phase({ featureId })`; `null` means "All phases done — nothing to build", stop. Otherwise find `<phaseName>` in `list_phases({ featureId })`; if absent, list available phases and stop.
4c. **Mark the build active (arms the Stop-gate).** `set_active_build({ featureId, phase: <resolvedPhaseName> })` — use the concrete resolved phase name, never `"next"`. This writes the `.cache/active-build.json` marker that pins the Stop-gate to this exact phase; without it the gate is a no-op. Pair this with `clear_active_build()` on every terminal path (steps 8 and 9 below).
5. **Order check (unless `--force`).** If any phase with a lower `order` than the target has `status !== "done"`, refuse: "Phase X has open tasks — build it first, or pass `--force`."
6. **Idempotency.** If the target phase is already `done`, report and stop — suggest `/specmanager-walkthrough <feature> <phaseName>` instead.
6b. **Confirm the session tier→model table (R2).** Once per build session, `AskUserQuestion` to confirm or remap which Claude Code model **alias** each complexity tier dispatches at. Pre-fill the defaults from `core/tiers.ts`: **cheap → `haiku`** (complexity 1), **standard → `sonnet`** (complexity 2), **strong → `opus`** (complexity 3, and anything >3 / unscored). Offer the defaults as the recommended option plus an "all `opus`" / custom alternative. Hold the chosen table in session state for the rest of this build. Always use **aliases**, never dated model ids. If the user declines, keep the defaults.
7. **Invoke the builder (per-task tier dispatch is the enforced default; `--bulk` is the opt-in).** Work the phase's tasks in `dependsOn` order.

   **Default — per task (N=1, no flag).** For **each** task: read its `complexity` (`list_tasks`), map complexity → tier → alias via the session table (default 1→cheap/`haiku`, 2→standard/`sonnet`, 3→strong/`opus`, >3 or null → strong), and dispatch `Task({ subagent_type: "builder", model: <alias>, prompt: ... })` with: feature id/title/slug, the resolved phase name (not `next`), the **single task** id + title, the Plan doc id, and the phase's exit-test line lifted from `plan.md`. If the resolved alias is unknown/unavailable, **omit `model:`** so the builder runs at the session default (`inherit`) — never error or block (AC4). The builder marks that task `in_progress`→`done` with artifacts; on its return move to the next task. Per-task is the default because it isolates a 529 to a single card and spends the cheapest adequate model on each.

   **Opt-in — `--bulk`.** When `--bulk` was passed (step 1), dispatch **all** the phase's tasks in **one** builder Task at the **max tier** of its tasks (resolve each task's alias, pick the strongest). This trades per-task isolation/tier savings for one builder context — use only on tiny, tightly-coupled phases. Then fall through to step 8's re-resolve exactly as the per-task path does.

   **Bounded transient-error retry (R=2, transient overload only).** Wrap **each** builder `Task(...)` dispatch (per-task, or the single `--bulk` Task) in a bounded retry: on a transient overload error (`529` / `Overloaded`) — i.e. the Task never returned a usable result — **immediately re-dispatch the same Task** (no backoff; the agent has no `sleep` primitive and the natural inter-tool latency suffices). Retry up to **2** times (3 attempts total). If all 3 attempts are exhausted on overload, mark that task `blocked` (`update_task`), **stop the phase**, and do **not** `clear_active_build()` (the build is still in flight — re-entering the phase resets the retry budget). A **genuine** task failure (a test won't pass, a missing dependency) is the builder's own stop condition and is **not** retried — re-running it would just re-fail; surface it verbatim and stop.

   **Retry-budget boundary (keep these two caps legible, they don't compose):** R=2 here is a *pre-completion transport retry* — the builder Task never returned. It is distinct from the Stop-gate's **N=3** *post-stop* iteration cap (the builder ran but the phase didn't pass) and from the reviewer's shared N=3 fix budget (step 7b). R=2 absorbs "couldn't even run the task"; N=3 absorbs "ran but didn't pass". They are not nested into a larger loop.
7b. **Spec-compliance review (R3) — after the Stop-gate exits 0, before advancing.** The deterministic Stop-gate hook (bash, zero model calls) already gated *stopping*; now run the semantic reviewer before the card advances. Only do this when every task in the phase is `done` (a mid-phase stop skips review). Steps:
   - **Assemble the spec slice** (the reviewer is read-only and does NOT read the whole Architecture doc — you assemble it):
     1. the phase's `plan.md` section (locate the `## Phase <name> — …` heading, slice to the next `## Phase`/`---`);
     2. the phase's task titles + notes from `list_tasks` filtered by `phase`;
     3. the Architecture section(s) named in the phase's `meta.architectureRefs`. Read `meta` via `resolve_active_card` (its `architectureRefs`) or by reading `tasks.json`'s `meta.phases[<phase>].architectureRefs`. Resolve each anchor by finding the Architecture heading whose leading id-token (`R1`, `R2`, …) or kebab-slug equals the ref and slicing to the next same-level heading. **Fallback when `architectureRefs` is empty:** match by the requirement id/name shared between the plan phase and an Architecture heading.
   - **Invoke the reviewer** at the **strong** alias regardless of the cards' build tier: `Task({ subagent_type: "reviewer", model: "opus", prompt: <the assembled slice + the phase's commit shas/changed files> })`.
   - **Branch on the verdict** `{ verdict, reasons }`:
     - `pass` → continue to step 8 (advance / walkthrough).
     - `fail` → re-dispatch a **fix** to the builder one R2 tier higher than the card's current build tier (cheap→standard→strong, capped at strong), feeding it the reviewer's `reasons`. This counts against the **same** N=3 Stop-gate iteration budget for the phase — it is **not** a second independent loop. After the fix, the Stop-gate re-runs on the builder's stop; re-review. Persistent `fail` even at strong ⇒ the phase surfaces as **blocked** (the Stop-gate's cap path): `clear_active_build()` (so the blocked phase stops re-arming the gate), report it and stop — do not advance.
8. **Auto-fire the phase walkthrough (only if the phase is now fully done).** When the builder returns and the reviewer passed, `check_gate({ featureId, stage: "walkthrough", phase: "<phaseName>" })` — the gate opens only when every task in the phase is `done`.
   - Gate **closed** (mid-phase stop) → skip auto-fire, go to step 9 and report the stop. **Do not** `clear_active_build()` — the build is still in flight and a re-entered session must resume this phase.
   - Gate **open** → the phase is complete: `clear_active_build()` now (so the next Stop is a no-op), then dedupe first: `list_documents({ featureId, stage: "walkthrough" })` filtered to `frontmatter.phase === "<phaseName>"`. If one exists, don't create another — note it in the report. Otherwise auto-invoke `Task({ subagent_type: "walkthrough-writer", prompt: ... })` in per-phase mode (feature id/title/slug, phase name, Plan doc id, the exit-test line, and a hint that this phase's task artifacts come from `list_tasks` filtered by `phase`). The walkthrough lands in `draft` — never approve it.
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
   - **The reviewer's verdict** (pass, or fail + the spec points it flagged and how they were resolved). If the phase was surfaced as blocked after a persistent fail, say so and point at re-entering the phase to reset the retry budget — and confirm `clear_active_build()` ran on this terminal path.
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
- Don't make whole-phase dispatch the default — per-task (step 7) is the enforced default; the single whole-phase Task fires **only** behind an explicit `--bulk`, which re-accepts a 529's blast radius by user choice.
- Don't retry a genuine task failure — R=2 is transient-overload-only (`529`/`Overloaded`). A test that won't pass or a missing dependency is the builder's own stop condition; surface it verbatim and stop.
- Don't compose R=2 with the Stop-gate N=3 — they cover different failures (transport vs. didn't-pass) and never nest.
- Don't pin dated model ids in the tier table — always use Claude Code aliases (`haiku`/`sonnet`/`opus`) so a model version bump in a tier is automatic.
- Don't block or error when a tier's alias is unknown/unavailable — omit `model:` and let the builder inherit the session default.
- Don't let the reviewer write or change task state — it is read-only; you assemble its slice and you alone advance the card on its verdict.
- Don't open a second retry loop for reviewer fails — they share the Stop-gate's N=3 phase budget; persistent fail ⇒ blocked, not infinite re-review.
- Don't hand the reviewer the whole Architecture doc — pass only the assembled slice (phase plan section + task notes + the `meta.architectureRefs` sections).
- Don't leave an active-build marker after a phase completes or is blocked — always pair `set_active_build` (step 4c) with a `clear_active_build` on all terminal paths (open-gate done, step 8; persistent-fail blocked, steps 7b/9). A mid-phase stop must **not** clear — the build is still in flight.
