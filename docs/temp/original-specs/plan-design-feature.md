# Design feature — Plan

Companion to [`architecure-design-feature.html`](./architecure-design-feature.html). Phases are working-software increments; each task is shippable in one sitting (Fibonacci ≤3). Anything scored 5+ has been split.

## Overview

We're adding an **optional Design stage** between Architecture and Plan, plus a repo-level `./docs/DESIGN.md` design-system spec that `/specmanager-init` generates and that refreshes whenever a feature ships. The plan is sliced into four phases so contributors can install and demo each one independently — the load-bearing order is core schema → DESIGN.md → slash command + subagent → board UI, because every later phase consumes the earlier phase's primitives.

## Phase summary

| Phase | Theme | Tasks | Points |
|-------|-------|-------|--------|
| A | Core schema + gate (design stage exists, plan gate aware) | 7 | 14 |
| B | DESIGN.md lifecycle (init creates, feature-shipped refreshes) | 7 | 15 |
| C | `/specmanager-design` slash command + designer subagent + grounding | 8 | 18 |
| D | Board UI: Design column, HTML doc panel, live sync pulse | 7 | 14 |
| **Total** | | **29** | **61** |

---

## Phase A — Core schema + gate

**Exit test:** with the plugin re-installed after this phase, `npm run selftest` and `npm run selftest-board` both pass, and the new selftest cases prove (a) the `design` stage round-trips through `create_document`/`list_documents`/`read_document`, and (b) the Plan gate refuses until the design doc is approved when one exists, and stays open when none exists.

| # | Task | Pts | Notes |
|---|------|-----|-------|
| A.1 | Extend `STAGE` Zod enum + `STAGES` array to include `"design"` in canonical order | 1 | `types.ts`, `paths.ts`. Pure enum widening — no migration. |
| A.2 | Extend `stageDir` map + `DEFAULT_FILENAMES` for `design` (`brief.html`) | 1 | `paths.ts`, `documents.ts`. |
| A.3 | Add `PRIOR_STAGE["design"] = "prd"` and document the edge in a comment | 1 | `dependencies.ts`. |
| A.4 | Rewrite Plan gate as compound: architecture approved AND (no design doc OR design approved) | 3 | `dependencies.ts::checkGate`. Care needed: keep the existing reason strings stable so Phase 3 UI banners still read clean. |
| A.5 | Extend `stageLabel` + Commands footer in `claude-md.ts` to mention Design | 1 | One-line label add, command list append. |
| A.6 | Extend `manifest.ts` to surface the design doc in the per-feature document list | 2 | No special phase rollup needed for design — it's a single doc per feature like PRD/Architecture. Matches the existing surface. |
| A.7 | Selftest coverage: 4 gate cases (no design + draft/approved arch, draft/approved design + approved arch) + design doc create/read round-trip | 3 | Extends `selftest-board.ts`. New assertions named explicitly so failures point at exactly the case. |

---

## Phase B — DESIGN.md lifecycle

**Exit test:** in a scratch repo with at least one UI file, running `/specmanager-init` creates `./docs/DESIGN.md` populated with managed sections inferred from the UI; touching `./docs/DESIGN.md` with hand-edits above the markers and re-running init preserves them. Approving the *final* walkthrough of any feature triggers a debounced refresh that updates only the managed region. A new `sync_design_md` MCP tool and `POST /api/design/sync` REST endpoint produce the same result on demand.

| # | Task | Pts | Notes |
|---|------|-----|-------|
| B.1 | Add `designMdPath(root)` to `paths.ts` returning `<root>/docs/DESIGN.md` | 1 | One-liner. |
| B.2 | Implement `scanUiSources(root)` — discover UI dirs via glob heuristics + token files | 3 | `design-md.ts` (new). Heuristics: `src/`, `app/`, `ui/`, `web/`, `frontend/`; look for `tailwind.config.*`, `*.tokens.json`, `*.css` with `--*:` vars. Return a flat digest. |
| B.3 | Implement `renderDesignMd(digest)` — render Stitch-spec sections from digest | 3 | `design-md.ts`. Pin a snapshot of the Stitch spec at `docs/references/stitch-design-md.md` first; render sections from that contract. |
| B.4 | Implement `syncDesignMd({ mode })` with managed markers + non-destructive merge | 3 | Mirror `claude-md.ts::syncClaudeMd` pattern exactly — same marker logic, same idempotency. Emits `design.synced` event. |
| B.5 | Wire `initProject` to call `syncDesignMd({mode:"init"})`; widen `InitResult` | 1 | `init.ts`. Reports new fields back to the user. |
| B.6 | Emit `feature.shipped` from `setStatus` when approving final walkthrough; auto-sync listener refreshes DESIGN.md | 2 | `status.ts` emit; `mcp.ts` listener wiring next to the existing CLAUDE.md auto-sync. 250ms debounce. |
| B.7 | Register `sync_design_md` MCP tool + `POST /api/design/sync` REST endpoint; selftest both | 2 | `mcp.ts`, `board-server.ts`, `selftest-board.ts`. WS broadcast of `design.synced` covered too. |

---

## Phase C — `/specmanager-design` slash command + grounding

**Exit test:** in a test repo with an approved PRD, running `/specmanager-design <featureId>` (after pasting one screenshot path and a one-line brief into the chat) invokes the `designer` subagent visibly via the Task tool. The subagent calls `create_design_brief`, which persists a versioned HTML doc with `stage: "design"`, `generatedBy: "agent"`, the screenshot inlined as a `data:` URI, and proper `dependsOn`/`basedOn` linking to the PRD (+ architecture if approved). Approving the design doc and then running `/specmanager-plan` produces a plan whose body references the design doc id at least once. Running `/specmanager-plan` with the design doc in `draft` is refused by the gate.

| # | Task | Pts | Notes |
|---|------|-----|-------|
| C.1 | Write `agents/designer.md` — Stitch-aware system prompt for HTML brief writer | 2 | Mirrors the Phase 4 subagent skeleton; insists on self-contained HTML, no external CSS, sandbox-safe. |
| C.2 | Add `create_design_brief` MCP tool with `attachments` array; embed each as base64 data URI under 2MB | 3 | `mcp.ts`. Read via `Read` tool (already allowed) is for the subagent; the MCP tool just receives bytes-as-base64 from the subagent's body string OR a file path it reads server-side. Pick one path here — recommended: subagent does the read+encode in-prompt, MCP tool accepts only the final HTML body. Reject `---` at column 0 in the body. |
| C.3 | Write `commands/specmanager-design.md` slash command harness | 2 | Resolve feature → `check_gate` → spawn Task → call `create_design_brief` → sync CLAUDE.md. Mirrors `specmanager-architecture.md` exactly. |
| C.4 | Add a shared prompt fragment `docs/agent-snippets/design-grounding.md` | 1 | One paragraph: "if a `design` stage doc exists, `read_document` it and ground your output in it". |
| C.5 | Reference the design-grounding fragment from `architect.md`, `planner.md`, `builder.md` | 1 | Three small edits. Inline the fragment text (no preprocessor) so the install ships as-is. |
| C.6 | Extend `commands/specmanager-plan.md` to look up the design doc and pass its id into the planner Task prompt when present | 2 | Slash command harness only — planner already reads whatever ids the harness hands it. |
| C.7 | Extend `commands/specmanager-init.md` copy to mention DESIGN.md creation + the new optional Design stage | 1 | Documentation in the command body. |
| C.8 | End-to-end selftest: spin up a tmp project, run the slash command flow programmatically, assert the design doc exists with the right frontmatter | 3 | Extends `selftest-board.ts` or a new `selftest-design.ts`. No real LLM call — fake the subagent's body inline; we're testing wiring, not generation quality. |

---

## Phase D — Board UI: Design column, HTML doc panel, live pulse

**Exit test:** after rebuilding `ui/dist` and reinstalling the plugin, the kanban board shows a 6-column grid (PRD, Architecture, **Design**, Plan, Build, Walkthroughs). Features without a design doc show a clearly-styled "optional" empty cell with a clickable `/specmanager-design` affordance. Clicking a design doc opens the doc panel with a CodeMirror HTML editor on the left and an `<iframe srcdoc>` preview on the right. Triggering `POST /api/design/sync` (or shipping a feature) makes the board pulse with `design.synced` in the header.

| # | Task | Pts | Notes |
|---|------|-----|-------|
| D.1 | Extend UI `Stage` union, `STAGES`, `COLUMNS`, `STAGE_LABEL` to include `"design"` | 1 | `ui/src/types.ts`, `App.tsx`. |
| D.2 | Add `OptionalEmptyCell` variant — distinct visual from locked/empty; surfaces `/specmanager-design` | 2 | `App.tsx`, `styles.css`. New `--design` color token; new `.card--optional` class. |
| D.3 | Update `priorStageApproved` so Design gates on PRD approved; Plan still computes its old prior plus reads design status from `findDoc` | 2 | `App.tsx`. Keep `priorStageApproved` returning a boolean; add a separate `planUnblockedBy(row)` helper rather than overloading the existing function. |
| D.4 | Update grid CSS template to 6 columns + the design column header | 1 | `styles.css`. |
| D.5 | Detect `doc.stage === "design"` in `DocPanel`; swap CodeMirror HTML mode for markdown mode; render preview in `<iframe srcdoc sandbox="allow-same-origin">` | 3 | `DocPanel.tsx`. Add `@codemirror/lang-html` to `ui/package.json`. Keep the existing markdown path for the other four stages. |
| D.6 | Subscribe to `design.synced` WS event in `App.tsx`; pulse the header briefly | 1 | One branch in the existing `openWebSocket` handler. |
| D.7 | Rebuild `ui/dist`, run all selftests, write `docs/phase-<N>-test-walkthrough.md` for this feature's exit verification end-to-end | 3 | Last step. Walkthrough mirrors prior phase docs. |

---

## Risk &amp; sequencing notes

- **A before B.** B's DESIGN.md generator emits the `design.synced` event and listens for `feature.shipped`. Both are wired through the bus you set up in A.
- **B before C.** The `designer` subagent reads `./docs/DESIGN.md` for the project's existing design vocabulary; if B hasn't shipped, DESIGN.md doesn't exist and the subagent falls back to scanning UI on its own — workable but produces inferior briefs.
- **C before D.** D is read-only against everything C produces. If you ship D first you have a column with no way to create the doc, which is confusing.
- **Compound Plan gate is the easiest spot to regress.** Phase A.4 + A.7 are deliberately paired in the same phase so the gate change and its selftest land together. Don't split them across phases.
- **DESIGN.md refresh is best-effort.** If `syncDesignMd` throws (disk full, permissions), the feature still ships. The MCP server logs the failure to stderr and the WS event surfaces a failure flag; never block a state transition on the refresh.
- **HTML body + gray-matter.** Phase C.2's defensive `---`-escape is small but easy to forget. Add a regression test that round-trips a body containing `---\nfoo` and confirms the frontmatter parses cleanly.
- **Stitch spec snapshot.** Phase B.3 depends on a written-down Stitch spec. Pin it (commit `docs/references/stitch-design-md.md`) at the start of Phase B so the planner's "render sections from spec" task has a concrete contract; otherwise the task becomes a 5+ in disguise.

## Test strategy

- **Unit-style selftests** stay in `selftest.ts` (core) and `selftest-board.ts` (REST + WS). Every gate combination and every new MCP tool gets at least one assertion line.
- **No real LLM in tests.** Phase C.8 fakes the subagent's body inline; we're verifying the slash-command + MCP-tool wiring, not the agent's output quality. Quality is verified manually via the phase exit test.
- **Idempotency** is non-negotiable for `syncDesignMd`. Selftest must run init twice and diff DESIGN.md byte-for-byte the second time.
- **HTML iframe sandbox**: smoke-test in a browser tab during the Phase D walkthrough. No JS execution, no external requests — the sandbox attribute is the contract.

## Out of scope

- **Chrome-style asset pipeline for screenshots.** We're inlining as data URIs with a 2MB cap. Anything fancier (CDN, deduplication, lazy-load) is a follow-up if real briefs blow past the cap.
- **Multi-design per feature.** One design brief per feature, like PRD/Architecture. Users who need design variants iterate by reopening the existing doc, not by creating a second one.
- **Design approval workflow distinct from approve/reopen.** Reuses the existing `setStatus` machinery; no new "needs designer signoff" state.
- **Cross-feature design references.** A design doc only references the upstream PRD/Architecture of *its own* feature. Linking across features is a Phase 8+ concern.
- **DESIGN.md generation from a remote Stitch spec URL.** We snapshot the spec to disk at the start of Phase B; we do not fetch it at runtime.
- **In-UI chat editing of HTML briefs.** Phase 6's chat panel works on markdown bodies. Reusing it for HTML is a follow-up: the system prompt needs HTML-grounding rules and the diff visualization breaks down at HTML granularity.

## Open questions

1. **Stitch spec details.** Resolve before Phase B starts by pinning a snapshot under `docs/references/`.
2. **Screenshot inline vs filesystem.** Picked inline+2MB cap as default; revisit at the end of Phase C if user feedback shows briefs routinely blow past.
3. **Should design-doc approve gate the Plan, or only block its `approved`?** Current call: gates entry to Plan when present. Alternative (more permissive): Plan can be drafted at any time, but can't be approved while a design doc is in `draft`. Both are reasonable; the architecture picks the stricter one because it keeps the gate graph simple. Reopenable in Phase A.4 review.
