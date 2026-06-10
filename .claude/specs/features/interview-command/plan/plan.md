---
id: plan-interview-command-009
featureId: feat-interview-command
stage: plan
status: approved
stale: false
title: Interview command plan
dependsOn:
  - arch-interview-command-009
  - design-interview-command-003
basedOn:
  arch-interview-command-009: 3
  design-interview-command-003: 1
generatedBy: agent
version: 1
createdAt: '2026-06-10T13:17:16.332Z'
updatedAt: '2026-06-10T13:23:03.329Z'
---
## Overview

`/specmanager:specmanager-interview` is a new optional pre-PRD command: a multi-turn, adaptive interview run in the main Claude Code session (no subagent — subagents are single-shot), embedding the office-hours forcing-question method (credited to <https://github.com/garrytan/gstack/tree/main/office-hours>), with the result optionally persisted as a `kind: "interview"` doc inside the `prd` stage. The Architecture's "Plan phasing (required)" section mandates **exactly two phases**, and the user has approved the split: Phase `chat` builds only the command prompt and ends in an explicit go/no-go on real conversation quality — if the chat isn't better than typing a long prompt, the rest of the feature is never built. Phase `complete` then lands everything else: the `kind: "interview"` core exclusion filters, the board chip per the approved design (Option A confirmed; Option B rejected), prompt updates, persistence, self-tests, docs, and rebuilt `dist/`.

**Scale:** `1` trivial · `2` small · `3` moderate · `5` substantial · `8` large · `13`/`21` epic.

*Every task below is decomposed to **≤3 points**. The two items that would have scored 5 — the interview protocol plus live validation, and the App.tsx chip work plus DocPanel changes — were each split in two; everything else was genuinely small. Phase subtotals are unchanged by the splits.*

| Phase | Theme | Points |
|-------|-------|--------|
| chat | validate the interview conversation | 11 |
| complete | persistence, board surface, prompts, docs | 23 |
| **Total** | | **34** |

---

## Phase chat — validate the interview conversation

**Exit test:** Run `/specmanager:specmanager-interview "<feature>"` in a live Claude Code session and hold a real multi-turn interview. Verify: opening turn states the goal, prints the numbered interview plan, and states the exit phrase; one focused question per turn; plan revisions print as short `+ added / − dropped (reason)` diffs, never a full re-dump; startup↔builder mode switching when the conversation warrants it; "finish interview now" (and obvious paraphrases) goes straight to synthesis with no "are you sure"; synthesis prints the four sections (Extracted / Critique / Recommended wedge / Unresolved) matching design Screen 4. **Nothing is written to disk** — persistence is stubbed. The phase ends with the user's explicit go/no-go on conversation quality.

*(No core, MCP, or UI changes in this phase, by Architecture mandate.)*

| # | Task | Pts | Notes |
|---|------|-----|-------|
| 1.1 | Scaffold `commands/specmanager-interview.md`: frontmatter, feature resolve/create, existing-interview detection, stubbed persistence | 2 | Mirrors `specmanager-prd.md` step 1 (`list_features` → `create_feature`); `list_documents({ stage: "prd" })` detects an existing interview (update mode) or PRD (note it, proceed). Storage step prints the synthesis only — no writes. |
| 1.2 | Write the interview protocol: opening turn, one-question loop, plan diffs, exit handling, synthesis format | 3 | Per design Screen 4: numbered plan (5–8 areas), exit phrase stated up front and restated ~every 5 turns, plan updates as `+/−` diffs, instant exit on "finish interview now" + paraphrases ("let's stop", "wrap it up"), synthesis = Extracted / Critique / Recommended wedge / Unresolved. |
| 1.3 | Embed the office-hours forcing-question method with mode selection and mid-interview switching | 2 | Six forcing questions (demand reality, status quo, desperate specificity, narrowest wedge, observation, future-fit) + builder/design-thinking mode, written directly into the prompt and credited to <https://github.com/garrytan/gstack/tree/main/office-hours>. No `Skill` invocation, no install detection. |
| 1.4 | Validate and reinstall the plugin for live testing | 1 | `claude plugin validate plugins/specmanager`, marketplace update → install → `/reload-plugins`. No build needed — prompt-only change. |
| 1.5 | Live dogfood sessions: run real multi-turn interviews and record the go/no-go | 3 | At least one startup-mode and one builder-mode run against real feature ideas. Assess question quality, critique depth, plan-diff behaviour, mode switching, exit robustness. Iterate the prompt until the exit test passes or the no-go is called. |

---

## Phase complete — persistence, board surface, prompts, docs

**Exit test:** Full end-to-end flow: run an interview → answer "yes" at the storage prompt → `interview.md` lands under `.claude/specs/features/<slug>/prd/` with `kind: interview`, `dependsOn: []` → the Interview chip (`.chip-interview` with hollow ring) appears beneath the PRD card (and beneath the generate affordance when no PRD exists) → clicking it opens the DocPanel with the neutral `.badge--interview` tag and **Save + close only** (no Approve/Edit/Gate?) → re-running the interview updates the doc in place (version bump) → `/specmanager-prd` grounds the PRD in the interview → approving the interview via the API does **not** open the Architecture gate → the CLAUDE.md feature table is unaffected by the interview → `npm run selftest` (with the new cases) and `npm run smoke-mcp` pass → manifest delete + rebuild preserves `kind`.

| # | Task | Pts | Notes |
|---|------|-----|-------|
| 2.1 | `core/types.ts`: add `DOC_KIND` enum and optional `kind` on `DocFrontmatterSchema` | 1 | `z.enum(["interview"]).optional()`, mirroring optional `phase`. Non-strict schema keeps old readers safe; no migration. |
| 2.2 | `core/documents.ts`: `kind` on `CreateDocInput`, prd-only validation, `interview.md` default filename, frontmatter stamping | 2 | Reject `kind: "interview"` with `stage !== "prd"`. `writeDocument` untouched — kind is immutable after creation. |
| 2.3 | `core/dependencies.ts`: `checkGate` skips `kind === "interview"` docs in prior-stage lookup and emptiness check | 2 | The load-bearing exclusion — without it an approved interview falsely opens the Architecture/Design gates. Plan compound gate and walkthrough paths unaffected. |
| 2.4 | `core/manifest.ts` `kind` passthrough + `core/claude-md.ts` fixes | 2 | Spread-passthrough like `phase`; `currentStageLabel` skips interview entries (readdir puts `interview.md` before `prd.md`); append `/specmanager-interview` (optional) to the Commands line in `renderBlock`. |
| 2.5 | `mcp.ts`: `create_document` gains `kind` input + description sentence | 1 | No new tool. |
| 2.6 | UI `types.ts` + `App.tsx`: `findDoc` exclusion, `findInterview`, `.cell-stack` + `.chip-interview` chip in the prd Cell | 3 | Option A per the approved design: pill with hollow `--primary` ring, "Interview · vN" label, wired to `onOpenDoc(id)`; renders beneath the PRD card or the EmptyCell generate affordance. `findDoc` skipping interviews keeps `priorStageApproved` correct. |
| 2.7 | `DocPanel.tsx`: neutral `.badge--interview` tag; hide Approve/Edit/Gate? for interviews (Save + close only) | 2 | Per the design's resolved decisions: ghost-outline tag instead of draft/approved badge; no stale banner can render (`dependsOn: []` by contract). |
| 2.8 | Prompt updates: `agents/prd-writer.md` required-if-present interview grounding; `commands/specmanager-prd.md` duplicate check ignores interviews | 2 | New numbered prd-writer step after the `list_features` check; without the prd command fix, an interview-first flow wrongly reports an existing PRD. |
| 2.9 | `commands/specmanager-interview.md`: replace the stub with real persistence (create / update / discard) + `sync_claude_md` | 2 | New: `create_document({ kind: "interview", dependsOn: [], basedOn: {} })`; existing: `write_document` with `baseVersion` (re-read + re-apply on version conflict); no: nothing written. Report id + path. |
| 2.10 | Extend `server/src/selftest.ts` with interview cases | 3 | Creation defaults filename/kind; non-prd stage rejected; approved interview does **not** open the architecture gate; `currentStageLabel` unaffected; update path bumps version; manifest rebuild preserves `kind`. |
| 2.11 | README + `docs/architecture-and-spec.md` command-list sweep | 1 | Add `/specmanager-interview` (optional, pre-PRD) wherever the command set is listed. Keep README concise. |
| 2.12 | Rebuild `server/dist` + `ui/dist`, run the self-test suite + `smoke-mcp`, validate plugin, end-to-end board check | 2 | The committed `dist/` is what ships. Reinstall and walk the exit test on the live board. |

---

## Risk & sequencing notes

- **The phase boundary is a real kill switch.** Phase `complete` must not start until the user's explicit go on Phase `chat`'s conversation quality — that is the entire point of the mandated split. A no-go means the feature stops with zero core/UI footprint.
- **2.3 is the highest-risk change** (gate logic). It *narrows* what `checkGate` looks at; the self-test case in 2.10 (approved interview must not open the gate) is the regression guard and should be written against 2.3's behaviour, not after-the-fact.
- **Core before MCP before command persistence:** 2.1 → 2.2 → 2.5 → 2.9 is a hard chain; 2.3 and 2.4 hang off 2.1. UI (2.6 → 2.7) only needs the manifest passthrough (2.4) to show real data but can be built against a hand-edited manifest in parallel.
- **Rollback is cheap everywhere** except 2.9: once interviews exist on disk, reverting core would leave `kind: interview` docs that old code treats as ordinary prd docs — which would shadow the PRD in `currentStageLabel` and could falsely open gates. Land 2.12's rebuilt `dist/` in the same commit as the core changes.
- **Staleness is by contract, not code:** the interview's `dependsOn: []` is written by the command (2.9) and respected by the prd-writer (2.8). No `propagateStale` change exists to test — the contract lives in the prompts, so 2.8/2.9 reviews should check it explicitly.

## Test strategy

The repo's convention is hand-rolled self-test scripts compiled into `dist/` and run by name (`npm run selftest`, etc.), not a test-runner suite. Phase `chat` is validated entirely by live dogfooding (1.5) — there is nothing machine-testable in a prompt-only phase, which is why the Architecture made human evaluation the phase gate. Phase `complete` carries one dedicated test task (2.10) extending `selftest.ts` with the interview cases the Architecture enumerates, and the final task (2.12) runs the whole suite plus `smoke-mcp` and the plugin validator against the rebuilt `dist/`. UI behaviour (chip, DocPanel deltas) is verified manually in the exit test, matching how the existing UI is validated.

## Out of scope

- **No new lifecycle stage, gate, event, or MCP tool** — the interview rides existing machinery (PRD non-goal + Architecture decision 1).
- **No `agents/interviewer.md`** — the interview runs in the main session; a subagent cannot hold a multi-turn conversation (Architecture decision 4).
- **No board-side interview UX** — the board only displays the stored artifact; the conversation never happens in the UI.
- **No multi-session resume** of an in-progress interview (PRD non-goal; the update path softens restarts for stored interviews).
- **No Option B stacked sub-card** — mocked for comparison in the design doc and explicitly rejected; do not build both.
- **No staleness wiring** — interviews sit outside the `dependsOn` graph by contract; editing one never flags the PRD stale.
- **No runtime dependency on the gstack office-hours skill** — the method is embedded and credited; no install detection or degradation path.

## Notes on estimates

Points are relative complexity, not hours — Phase `chat` is mostly prompt-writing and judgement, Phase `complete` mostly small mechanical edits across many files; calibrate against actual velocity after the first phase before trusting the second's subtotal. Both 5-point candidates (the protocol+validation work, the App.tsx+DocPanel work) were split into ≤3 tasks — a granularity change only, phase subtotals are unchanged. Self-tests (2.10), the docs sweep (2.11), and the rebuild/verification pass (2.12) are their own tasks rather than footnotes on code tasks, so each phase's "installable & testable" exit gate is real work that gets sequenced, not an afterthought.
