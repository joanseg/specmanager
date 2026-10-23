---
id: arch-loop-command-specmanager-loop-027
featureId: feat-loop-command-specmanager-loop
stage: architecture
status: approved
stale: false
title: Loop command (/specmanager-loop) architecture
dependsOn:
  - prd-loop-command-specmanager-loop-042
basedOn:
  prd-loop-command-specmanager-loop-042: 1
generatedBy: agent
version: 1
createdAt: '2026-10-01T11:11:23.852Z'
updatedAt: '2026-10-01T11:11:39.994Z'
---
## Summary

Implements `prd-loop-command-specmanager-loop-042` (v1) as **one new orchestration prompt**, `plugins/specmanager/commands/specmanager-loop.md`, that runs in the main session and chains the existing stage subagents (`prd-writer`, `architect`, `designer`, `planner`) through the existing MCP tools (`check_gate`, `list_documents`, `read_document`, `set_status`, `write_document`, `link_documents`, `update_task`, `create_task`). It adds no MCP tool, no `core` logic and no UI. Supporting edits: one sentence in `agents/planner.md` (loop mode, Q7), new invariants in `server/src/selftest-prompts.ts` (R12), the managed-block **Commands:** string in `server/src/core/claude-md.ts` and the command lists in both READMEs and the repo `CLAUDE.md` (R13). Design is not applicable (no UI); no design doc exists for this feature.

Decisions taken on the PRD's open questions (detail in the matching sections): Q1 title proposed inside the first refinement round; Q2 at most 2 rounds of up to 4 questions; Q3 review runs inline in the main session; Q4 design fixes via `write_document` with the HTML defang applied by the loop, task fixes via `update_task`/`create_task`, removals become questions; Q5 bounded 529 retry R=2 per stage subagent; Q6 dedicated loop invariants, INV-16 and INV-25 untouched; Q7 planner split defaults to its own recommendation in loop mode, surfaced at the end; Q8 loop approvals recorded in the report only.

## Affected components

| Path | Change |
|---|---|
| `plugins/specmanager/commands/specmanager-loop.md` | **New.** Frontmatter `description` (states auto-approval, R11) + `argument-hint: "<intent description, or existing featureId/slug>"`; Steps (resolve → refine → stage chain → review → questions → report); Don't list. Same shape as `commands/specmanager-build.md` / `specmanager-interview.md`. |
| `plugins/specmanager/agents/planner.md` | One added sentence next to the existing "Confirm any split with the user first" rule (line 18): when the prompt says **loop mode**, do not call `AskUserQuestion`; apply the recommended split (or single phase) and record the decision + alternative under the plan's Open questions. |
| `plugins/specmanager/server/src/selftest-prompts.ts` | New entries INV-38…INV-44 (see R12; INV-44 covers `agents/planner.md`). No change to INV-16 or INV-25 files/counts. |
| `plugins/specmanager/server/src/core/claude-md.ts` | The hard-coded **Commands:** line in `renderBlock` (line 124) gains `` `/specmanager-loop` (auto-approves, stops before Build) ``. Only server source change; rebuild `server/dist`. |
| `plugins/specmanager/README.md` | Command table row for `/specmanager:specmanager-loop`. |
| `README.md` (repo root) | Workflow code block + one sentence, next to the interview paragraph. |
| `CLAUDE.md` (repo root) | Layout bullet for `commands/*.md`: the loop, like the interview, runs in the main session (orchestrates subagents, no subagent for refinement/questions/review). The managed block refreshes itself via `sync_claude_md` after the rebuild. |
| `plugins/specmanager/.claude-plugin/plugin.json` | `version` 1.0.2 → 1.1.0 (minor: new feature), per the CLAUDE.md release steps. |

Not touched: `core/dependencies.ts` (`checkGate`), `core/status.ts` (`setStatus`), `core/documents.ts`, `mcp.ts`, `board-server.ts`, `ui/`, `hooks/`, the four stage commands (they keep "Don't approve — only the user does that", R11), `agents/reviewer.md`.

## Data model changes

None. No frontmatter field, manifest key or task field is added. Loop approvals are indistinguishable on disk from hand approvals (Q8 decision: report only). Relies on existing behaviour verified in code:
- `setStatus` (`core/status.ts`) performs `draft→approved`, clears `stale`; only `approved→draft` cascades (`propagateStale`).
- `writeDocument` (`core/documents.ts`) bumps `version`, enforces `baseVersion`, never changes `status` — so R6/R7 writes keep docs `approved` with no staleness cascade.
- `linkDocuments` (`core/dependencies.ts`) re-stamps `basedOn[upstream]` to the upstream's current version without bumping the downstream version.
- `writeDocument` does **not** run `sanitizeDesignBriefBody`; only `create_design_brief` does (see R6).
- Task statuses are `todo | in_progress | done | blocked` (`core/types.ts`); there is no delete-task tool or REST route.

## Interfaces

Command invocation: `/specmanager:specmanager-loop <intent description | featureId/slug [extra context]>`.

No new tool. Calls the loop makes, in the project's existing tool shapes:
- `list_features()`, `create_feature({ title })`
- `list_documents({ featureId, stage })`, `read_document({ id })`
- `check_gate({ featureId, stage })` for `prd` (no-op gate but called for uniformity), `architecture`, `design` (when run), `plan`
- `Task/Agent({ subagent_type: "prd-writer" | "architect" | "designer" | "planner", prompt })` — prompts carry exactly what the matching stage command passes (ids, versions, slug) **plus** the refined intent block and a `Loop mode:` line
- `set_status({ id, status: "approved" })`
- `write_document({ id, body, baseVersion })`, `link_documents({ downstreamId, upstreamId })`
- `list_tasks({ featureId })`, `update_task({ id, featureId, title?, phase?, complexity? })`, `create_task({ featureId, title, phase, complexity ≤3, dependsOn? })`
- `AskUserQuestion` (main session only): refinement (R3), fuzzy-match (R2), draft-exists (R10), end questions (R7)

Subagent prompt contract (sketch): `Feature: <id>/<slug>/<title>` · upstream ids + versions · `Refined intent:` (verbatim original intent + Q/A list + assumptions) · `Loop mode: running under /specmanager-loop — do not ask the user anything; infer and record assumptions/open questions in the doc.` · for the designer: `No attachments; proceed without a design reference.` · for the planner: the loop-mode split rule (Q7).

## Sequence / flow

1. Parse `$ARGUMENTS`; empty → ask for a one-line intent, stop (R1).
2. Resolve/create feature (R2); print the auto-approve notice (R11).
3. Read any interview doc; refine intent in-session (R3).
4. For stage in PRD → Architecture → [Design] → Plan: R10 existing-doc check → `check_gate` → subagent (R=2 retry on 529) → verify the doc exists via `list_documents` → `set_status(approved)` → one-line progress note (R4, R5).
5. Cross-doc review inline, apply fixes, re-stamp `basedOn` (R6).
6. End questions, apply answers (R7).
7. Report; suggest `/specmanager-build <slug> next` (R8).

Any failure in 2–6 jumps to the R9 stop report.

## R1 — Command entry & intent argument

- No argument → ask for a one-line intent and stop (as `commands/specmanager-prd.md` step 1).
- The verbatim `$ARGUMENTS` is held as **Original intent** and pasted unchanged into the refined-intent block given to every subagent and into the R6 review checklist as the drift reference.

## R2 — Feature resolution

- First whitespace-separated token matches a feature `id`/`slug` (`list_features`) → use it; the rest of the argument is extra context (same parsing as `commands/specmanager-design.md` step 1). Then R10 applies.
- Otherwise derive a short title (≤6 words) from the intent. Compare it case-insensitively against existing titles/slugs (substring or shared-significant-word match, judged in-prompt — no server fuzzy matcher). A near match → one `AskUserQuestion`: use `<existing>` / create new.
- Q1 decision: the derived title is proposed as the first question of the first refinement round (accept / edit), so it costs no extra interruption; `create_feature({ title })` runs right after that round, before any doc work, and id/slug/folder are reported.

## R3 — Intent refinement in the main session

- Runs in the main session (`specmanager-interview.md` precedent); no subagent.
- If a `kind: "interview"` doc exists (R10), `read_document` it first and ask only about what it leaves open; if it covers problem, users, scope and UI-facing, skip refinement and say so.
- Q2 decision: at most **2 rounds**, each one `AskUserQuestion` with up to 4 questions; round 2 only if round 1 left a PRD-critical gap (problem, users, scope/wedge, constraints, UI-facing). Every question offers a "skip / decide for me" option; choosing it ends refinement, and gaps are carried as **Assumptions** in the refined-intent block.
- UI-facing is always asked (or inferred from the interview) because R5 needs it.

## R4 — Stage chain with auto-approval

Per stage:
1. R10 existing-doc check.
2. `check_gate({ featureId, stage })`; `ok:false` → R9 stop with `reason` verbatim. Never draft around it.
3. Dispatch the subagent with the same inputs as the stage command (`specmanager-prd.md` step 3, `-architecture.md` step 2, `-design.md` step 4, `-plan.md` step 3), plus the refined intent and the loop-mode line.
4. Confirm the new doc via `list_documents({ featureId, stage })` (and, for Plan, `list_tasks` non-empty and `plan.md` has a `## Phase` heading — the plan command's flat-plan rule). Missing → R9.
5. `set_status({ id, status: "approved" })` in the main session. Plan is approved only after `plan.md` and its task records both exist.
6. Print one progress line (`PRD approved — <id>`).

Agents' own "Don't approve" rules are untouched; only the loop, in the main session, calls `set_status`.

## R5 — Conditional Design stage

- Decision input: the refined intent's UI-facing answer plus the approved PRD (screens, board/UI requirements, flows that render). Decided once, after PRD approval, with a one-line reason kept for the report.
- UI-facing → after Architecture is approved (keeps the loop linear; the design gate only needs the PRD) run `designer` exactly as `/specmanager-design` does (PRD id+version, Architecture id+version, no attachments), which writes via `create_design_brief`; approve before Plan.
- Not UI-facing → create nothing; the plan gate's "approved Design if one exists" leg is satisfied by absence.

## R6 — One cross-doc review pass

- Q3 decision: **inline in the main session**. No new agent (would add a "Don't approve" carrier and selftest scope); the `reviewer` agent is code-vs-spec and read-only, so it cannot apply fixes.
- Read: PRD, Architecture, Plan via `read_document`; Design (if any) via `Read` on its `filePath` (chunked), as the stage agents do; `list_tasks`.
- Checklist: contradictions between docs; each PRD requirement (R-ids) has Architecture and Plan coverage; tasks match `plan.md` build order (title, phase, complexity); drift from the Original intent and refined intent.
- Apply each fix once with `write_document({ id, body, baseVersion: <read version> })`. Docs stay `approved`. A version conflict (someone edited in the board meanwhile) → do not retry over it; the finding becomes an R7 question.
- **Design (Q4):** fixes are limited to small textual edits of the notes in the HTML body read from `filePath`; before writing, the loop replaces any column-0 `---` line with `<!-- --- -->` (the `sanitizeDesignBriefBody` rule, because `write_document` skips it). Any visual/structural change → R7 question, not a guess.
- **Tasks (Q4):** a Plan fix that changes task scope updates `plan.md` and the task records together: changed title/phase/complexity → `update_task`; new item → `create_task` (complexity ≤3, split otherwise); removal → no delete tool exists, so it becomes an R7 question and, if confirmed, a manual follow-up listed in the report.
- After fixes, `link_documents` re-stamps `basedOn` for each downstream doc whose upstream version moved, so the board's drift display stays truthful.
- Single pass; unresolvable findings become R7 questions.

## R7 — End-of-loop questions

- Gather: each doc's Open questions section, unresolved R6 findings, R3 assumptions, and the planner's loop-mode split decision (Q7).
- Ask via `AskUserQuestion` in batches of up to 4, most impactful first; each question names the doc it affects.
- Answers → applied with the R6 write rules (same `baseVersion`, design defang, task sync); answered items are removed from or marked resolved in the doc's Open questions.
- Skipped questions stay recorded in the relevant doc's Open questions (added there if they came from R3/R6).
- None to ask → skip and say so in the report.

## R8 — Report and stop before Build

Report: feature id/slug; per doc id, path, final status, version; Design decision + reason; review fixes applied (doc → one line each); questions answered vs left open; manual follow-ups (task removals); note that all approvals in this run were made by `/specmanager-loop` (Q8); next step `/specmanager:specmanager-build <slug> next`. The loop never dispatches the builder, never calls `set_active_build`, and never runs a walkthrough.

## R9 — Failure handling

- Stop immediately on: closed gate, subagent error after retries, subagent returned without creating its doc, any tool `ok:false` in the chain.
- Q5 decision: each stage subagent dispatch gets the build command's bounded transient retry — on `529`/`Overloaded` (the Task never returned a usable result), re-dispatch the same Task immediately, up to 2 retries (3 attempts). Before a retry, `list_documents` for the stage: if the doc already landed, do not re-dispatch (avoids duplicates). Genuine failures are not retried.
- Stop report: last completed (approved) stage, failed stage, reason verbatim, and the stage command to resume with (`/specmanager:specmanager-<stage> <slug>`). Approved docs stay approved; a drafted-but-unapproved doc stays `draft` — never approved after a failure.
- R6/R7 failures (a write error) stop the remaining fixes and report what was and was not applied; all stage docs remain approved.

## R10 — Existing feature with existing docs

Per stage, before the gate: `list_documents({ featureId, stage })` (ignore `kind: "interview"` in the prd stage).
- `approved` → skip the stage, reuse the doc as upstream input, note "reused".
- `draft` → one `AskUserQuestion`: approve as-is and continue / stop (edit in the board, rerun). Never overwrite a human draft. Approving a draft goes through `check_gate` first.
- Interview doc → read as refinement input (R3); never approved or linked.
- An existing approved Design doc counts as "UI-facing: yes" for R5; a missing one on a later stage triggers the normal R5 decision.

## R11 — Auto-approval is explicit opt-in

- Command frontmatter `description` contains "approves each stage's document automatically" and the opening turn repeats it before any write.
- The four stage commands and six agents keep their "Don't approve" wording; the loop file is not added to INV-25.

## R12 — Prompt-invariant coverage

Q6 decision: dedicated entries, because INV-16's literal `check_gate` count (min 4, max 5 across five files) would need its ceiling re-tuned to absorb the loop's several mentions, weakening it. New `PromptInvariant` rows, all `files: ["commands/specmanager-loop.md"]`:

| Id | Pattern (sketch) | min / max |
|---|---|---|
| INV-38 | `check_gate` | ≥1 |
| INV-39 | `/subagent_type: "(prd-writer\|architect\|designer\|planner)"/g` | ≥4 |
| INV-40 | `set_status` with `"approved"` | ≥1 |
| INV-41 | `main session` | ≥1 (refinement, review and end questions run there) |
| INV-42 | negative: `/subagent_type: "builder"\|set_active_build\(/g`, `negativeSample: 'subagent_type: "builder"'` | 0 / 0 |
| INV-43 | `approves each stage's document automatically` (R11 opt-in statement) | ≥1 |

Plus one planner row (INV-44: `loop mode` in `agents/planner.md`, 1/1) so the Q7 carve-out cannot silently vanish. The loop's own Don't list must phrase the Build ban without the INV-42 literals (e.g. "never start a build or arm the Stop-gate"). Existing INV-16 and INV-25 keep files and counts; the mutation and carrier-sensitivity passes in `main()` cover the new rows automatically.

## R13 — Docs list the command

- `plugins/specmanager/README.md` table: `| /specmanager:specmanager-loop | Runs intent → approved Plan in one go: asks a few questions, drafts and auto-approves each stage, reviews across docs, then stops before Build. |`
- Root `README.md`: line in the workflow block + one sentence; root `CLAUDE.md`: Layout bullet (see Affected components).
- `core/claude-md.ts` Commands line; then `npm run build` in `server/`.
- Release steps from CLAUDE.md apply: version bump, `npm ci` + build in `server/` and `ui/` (ui unchanged, dist should not move), `npm run selftest-directory`, `claude plugin validate plugins/specmanager`. No packaging change, so no surface test is required.

## Failure & edge cases

- **Gate closed mid-chain** (e.g. someone reopened the PRD in the board) → R9 stop with `reason`.
- **Subagent asks the user anyway** (prd-writer's one clarifying question, designer's reference invite, planner split) → mitigated by the loop-mode line; if it still happens the user answers and the loop continues — accepted, not a failure.
- **Subagent created a duplicate** after a retried 529 → prevented by the pre-retry `list_documents` check.
- **Concurrent board edit** during R6/R7 → `baseVersion` conflict, finding becomes a question, never a clobber.
- **Design HTML `---`** → loop defangs before `write_document`.
- **Task removal needed** → no tool; question + manual follow-up.
- **Planner returns a flat plan** (no `## Phase`) → treated as subagent failure, R9 (the plan command would send it back; the loop does not iterate).
- **Huge context**: the loop reads all docs once in R6; design HTML is read chunked.
- **Interrupted session** → no resume (non-goal); the board shows exactly which docs are approved, and the stage commands continue.

## Conventions used

- Commands are orchestration prompts; drafting is always delegated to subagents (`specmanager-*.md` "Don't" lists).
- Multi-turn work runs in the main session (`specmanager-interview.md`).
- Gate enforcement only in `core` via `check_gate`; prompts call it, never reimplement it.
- Optimistic concurrency: every `write_document` carries `baseVersion`.
- Design docs are created only through `create_design_brief`; HTML read via `Read` on `filePath`.
- Transient retry wording and R=2 bound mirror `commands/specmanager-build.md` step 7.
- `AskUserQuestion` style: recommended option first, labelled *(recommended)* (`specmanager-build.md` step 8.4, `agents/planner.md`).
- Prompt invariants are `PromptInvariant` rows in `selftest-prompts.ts` with min/max counts and mutation coverage; snippet parity rule applies only to fragments in `docs/agent-snippets/` (none added).
- No model/API calls from the plugin server; the server change is one string.
- Release = push touching `plugins/specmanager/`; rebuild committed `dist/`.

## Open questions / risks

- Q7 planner carve-out: owner confirmed the one sentence in `agents/planner.md`.
- Q8: owner confirmed report-only; no `approvedBy` field.
- Q2 cap (2 rounds × 4 questions) and the R2 near-match heuristic are prompt-level judgement; tune after the first dogfood runs.
- Risk: R6's value is unproven (PRD success metric); if several runs yield no fix or question, cut it.
- Risk: inline R6 in the main session spends main-context tokens on reading every doc; acceptable for single-feature runs, revisit if large designs make it costly.
- Risk: subagents asked to "not ask the user" may still do so — they are instructions, not tool restrictions.
- Task removal has no tool; if review removals turn out common, a `delete_task` MCP tool would be a separate feature.
