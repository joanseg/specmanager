---
id: plan-markdown-viewer-004
featureId: feat-markdown-viewer
stage: plan
status: approved
stale: false
title: Markdown viewer plan
dependsOn:
  - arch-markdown-viewer-004
  - design-markdown-viewer-001
basedOn:
  arch-markdown-viewer-004: 2
  design-markdown-viewer-001: 2
generatedBy: agent
version: 2
createdAt: '2026-05-31T13:48:47.960Z'
updatedAt: '2026-05-31T14:02:44.192Z'
---
## Overview

This plan executes the approved Architecture (`arch-markdown-viewer-004` v2) for the **Markdown viewer**: a frontend-only replacement of the SpecManager board's split *raw CodeMirror source + `marked` HTML preview* with a single **Milkdown** WYSIWYG markdown surface, a formatting toolbar, a wider reading-width panel, and VS Code-quality table styling. The work is confined to `plugins/specmanager/ui/` — no `@specmanager/core`, server, MCP, or data-model changes. The body contract (markdown in via `fetchDoc`, markdown out via `putDoc` carrying `baseVersion`) is unchanged, so save/approve/reopen, version display, optimistic-concurrency (409), stale badges, and chat all keep working verbatim.

The phase split follows the only hard sequencing constraint in this codebase: **every phase must end with an installable, testable plugin** (`claude plugin install ./specmanager --scope local`). Phase 1 lands the Milkdown surface as a working drop-in replacement (byte-clean round-trip is the binding PRD success metric, so a node round-trip self-test ships *with* it). Phase 2 adds the full formatting toolbar (the `MarkdownToolbar` per design Screens 2–3). Phase 3 ships the reading-width and table-styling polish (design Screens 4–5) and retires the now-dead `Editor.tsx` + `marked`. Each phase is shippable on its own: after Phase 1 you can read/edit/save every markdown doc as WYSIWYG; Phases 2–3 layer on formatting controls and visual quality. Phases and tasks are grounded in the six design mockup screens (`design-markdown-viewer-001` v2): `.md-surface`, `.md-toolbar`, the centered `.prose` column, and the `.tbl-wrap` table treatment, all drawn from the real `tokens.css` Obsidian Flux palette.

**Scale:** `1` trivial · `2` small · `3` moderate · `5` substantial · `8` large · `13`/`21` epic.

*Every task below is decomposed to **≤3 points**. The naturally large items — standing up the Milkdown editor and building the seven-action toolbar — were deliberately split into smaller install-deps / mount-surface / wire-state and per-cluster-of-buttons tasks; the phase subtotals are unchanged by that granularity choice, they just reflect more, smaller rows.*

| Phase | Theme | Points |
|---|---|---|
| 1 | WYSIWYG surface swap + round-trip guard | 13 |
| 2 | Formatting toolbar | 13 |
| 3 | Reading width, tables, dead-code cleanup | 12 |
| **Total** | | **38** |

---

## Phase 1 — Surface swap — single Milkdown WYSIWYG surface replaces the split editor

Stand up `MarkdownEditor.tsx` (Milkdown + remark/remark-gfm) as a prop-compatible drop-in for `Editor.tsx`, mount it as the single surface in `DocPanel.tsx` for markdown stages (drop the `marked.parse` preview and the `showPreview` toggle), make the design stage iframe-only, and ship a node round-trip self-test that proves byte-clean serialization over real repo docs. This is design **Screen 1** (read mode) and **Screen 2's** surface (minus the toolbar, which is Phase 2).

**Exit test:** `npm run build` (in `plugins/specmanager/ui/`) succeeds and `claude plugin install ./specmanager --scope local` installs; opening any markdown doc (PRD/Architecture/Plan/Walkthrough) shows rendered prose with no monospace pane and no Preview checkbox; typing edits, then Save round-trips to disk; an approved doc opens read-only; a design (HTML) doc shows only the iframe preview. The new `selftest-roundtrip` node script passes (parse→serialize equals input) over the repo's existing markdown docs.

| # | Task | Pts | Notes |
|---|---|---|---|
| 1.1 | Add Milkdown + remark/remark-gfm deps to `ui/package.json`, pin latest, `npm install`, confirm `vite build` still produces a working `dist/` | 2 | Per arch Dependencies; "Latest APIs" convention. Verify bundle builds before any wiring. |
| 1.2 | Create `MarkdownEditor.tsx` mounting a Milkdown instance with the remark serializer; props `{ value, readOnly, onChange }` mirroring `Editor.tsx` | 3 | The `.md-surface`/`.prose` host from design Screen 1. Configure `remark-stringify` to corpus conventions (bullet `-`, fenced code, GFM tables, no reference links) per arch Failure cases. |
| 1.3 | Implement the external-value-sync + read-only-reconfigure effects (replace the ProseMirror doc on `value` change without firing a spurious `onChange`; editable=false when `readOnly`) | 3 | Reuse `Editor.tsx`'s echo-guard idiom (arch Conventions; design Screen 6 note on chat-reload). |
| 1.4 | Swap `MarkdownEditor` into `DocPanel.tsx` for markdown stages: remove `marked.parse` preview + `showPreview` state/checkbox; keep save/approve/reopen/gate/stale/conflict logic verbatim | 3 | Only the editor/preview region changes (design Screen 6 builder note). `dirty = body !== doc.body` and the 409 reload path stay. |
| 1.5 | Make the design (HTML) stage iframe-only: drop the HTML source-editor column from the `isDesign` branch, keep the sandboxed `srcDoc` iframe | 1 | Resolved PRD Q1 / arch open item #7. Removes the last design-stage `Editor` mount. |
| 1.6 | Add `server/src/selftest-roundtrip.ts` node script asserting parse→serialize is byte-clean over real repo markdown docs; wire it as an npm script alongside the other `selftest-*` | 3 | Arch open item #5 / PRD "round-trip integrity" metric. Follows the existing `selftest-*` node-script convention; flags any normalization churn before it hits a real Save. |

---

## Phase 2 — Toolbar — formatting controls live with the surface

Build `MarkdownToolbar.tsx` and wire its seven `ToolbarAction`s to Milkdown commands against the current selection, with the active-mark state, the `H ▾` heading level-picker menu, and the narrow-width `⋯` overflow menu. This is design **Screen 2** (resting toolbar) and **Screen 3** (active/selected state).

**Exit test:** Re-install the plugin; open a draft markdown doc — a formatting bar sits above the surface with Bold / Italic / Heading always visible and List / Link / Table / Code-block present. Each button applies the expected formatting to the selection and round-trips to correct markdown; selecting bold text lights the Bold button (`aria-pressed`); the `H ▾` button opens an H1/H2/H3 menu; at a narrow panel width the secondary four collapse into a `⋯` menu; the whole bar is hidden on an approved (read-only) doc, replaced by the slim "Approved — read-only" hint. Typed markdown (`**`, `# `, `- `) and the buttons produce identical serialized output.

| # | Task | Pts | Notes |
|---|---|---|---|
| 2.1 | Create `MarkdownToolbar.tsx` shell with the always-visible primary trio (Bold / Italic / Heading) dispatching `bold`/`italic`/`heading` Milkdown commands; `disabled` mirrors `readOnly` | 3 | Design Screen 2; arch `MarkdownToolbarProps`. Replaces the removed `.panel__toolbar` Preview row; the Chat toggle moves to the bar's right. |
| 2.2 | Add the secondary four actions — Bullet list / Link / Table / Code block — dispatching `bulletList`/`link`/`table`/`codeBlock` | 2 | Expanded v1 scope per PRD Q8 answer; same `ToolbarAction` command set (design Screen 2 builder note). |
| 2.3 | Implement active-mark state: read active marks from the ProseMirror selection on every transaction and light the matching button (`aria-pressed="true"`, `--tb-active-bg` fill) | 3 | Design Screen 3 — the required active/selected state, mirroring VS Code/Notion. Toggling a mark off returns the button to resting. |
| 2.4 | Implement the `H ▾` heading level-picker popover (H1/H2/H3 menu, not click-cycle) dispatching the chosen level against the selection | 2 | Resolved design Q4. |
| 2.5 | Implement the narrow-width `⋯` overflow menu collapsing List / Link / Table / Code-block; primary trio stays visible | 2 | Resolved design Q3; the `⋯` menu reuses the same `ToolbarAction` commands. |
| 2.6 | Render the read-only state: hide the whole toolbar and show the slim "Approved — read-only" hint row where the bar would sit | 1 | Design Screen 1 read-only hint; mirrors `readOnly = doc.status === "approved"`. |

---

## Phase 3 — Reading and tables — comfortable width, VS Code-quality tables, dead-code cleanup

Ship the layout and table styling that make the panel "feel like reading a document, not editing source," then retire the now-unused `Editor.tsx` and `marked` dependency. This is design **Screen 4** (width before/after) and **Screen 5** (tables).

**Exit test:** Re-install the plugin; the `.panel` is visibly ~an inch wider and the prose sits in a centered column measuring ~65–80 characters per line (~72ch; ~62ch with chat open); a markdown table renders with visible cell borders, a filled/styled header row, zebra striping, and comfortable padding — readable at a glance like the VS Code preview — and a wide table scrolls horizontally inside its wrapper rather than reflowing. `grep` confirms no remaining importer of `Editor.tsx` and no remaining `marked` usage; both are removed and `npm run build` + `claude plugin install` still pass.

| # | Task | Pts | Notes |
|---|---|---|---|
| 3.1 | Widen `.panel` from `min(60rem,65vw)` to `min(64rem,68vw)` and constrain the prose to a centered `max-width: 72ch; margin-inline: auto` column (~62ch with chat) | 2 | Design Screen 4 / resolved PRD Q5. Panel wider, text column narrower — both moves together (styles.css line ~402). |
| 3.2 | Add `.md-surface` / `.md-toolbar` / `.prose` styling from `tokens.css` (toolbar bar, surface, reading column), echoing the existing `.panel__toolbar` pattern | 2 | Token-driven styling convention; no new color-scale tokens. |
| 3.3 | Add `.markdown table/th/td` rules: collapsed borders, header fill, zebra, comfortable padding, scoped to `.markdown` so reading and editing match | 3 | Design Screen 5 / PRD goal #5. Currently no `table` selector exists in styles.css. |
| 3.4 | Decide and apply the four derived style values — name them (`--tb-active-bg`, `--table-header-bg`, zebra, cell border) in `tokens.css` or inline the `color-mix` consistently | 1 | Design "new tokens introduced" flag. Pick one approach so active-state and table styling don't drift. |
| 3.5 | Wrap wide tables in `.tbl-wrap` (`overflow-x: auto`) so they scroll horizontally inside the panel rather than reflowing | 1 | Resolved design Q2. |
| 3.6 | Remove the now-dead `Editor.tsx` and the `marked` dependency after grep-confirming no remaining importer/usage; rebuild and reinstall to verify | 3 | Arch open items #3 and #4. `DocPanel` is the sole `Editor` importer and sole `marked` user; both go dead once Phases 1–2 land. |

---

## Risk & sequencing notes

- **Phase 1 is the load-bearing phase and must land first.** Everything downstream mounts on `MarkdownEditor`. Its top risk is **round-trip normalization churn** (Milkdown's remark serialize may tidy bullet glyphs/table pipes on first save), which directly threatens the PRD's byte-clean metric — that is exactly why task 1.6 (the `selftest-roundtrip` node script) ships inside Phase 1, not later. Tune `remark-stringify` (task 1.2) until 1.6 passes over real repo docs *before* relying on a real Save.
- **Dead-code removal is intentionally last (3.6).** `Editor.tsx` and `marked` stay importable through Phases 1–2 so each phase is independently installable and reversible; removing them only after the WYSIWYG surface and toolbar are proven avoids a rollback that would strip the old editor before the new one is trusted.
- **Bundle size:** ProseMirror+Milkdown+remark is heavier than CodeMirror. Acceptable for a localhost single-user tool, but task 1.1 verifies `vite build` produces a working `dist/` before any wiring, so a build break surfaces immediately.
- **Design-stage behavior change (1.5):** dropping the HTML editor column is a small but real change to the `isDesign` mount — verify the iframe preview still renders before moving on.
- **No `core`/server rollback risk:** nothing in this feature touches `core`, the servers, or persisted data, so a rollback is a pure UI revert.

## Test strategy

The repo has **no UI test harness** today — server validation is node `selftest-*` scripts. This plan follows that convention rather than introducing a new framework:

- **Phase 1** ships its own automated guard: `selftest-roundtrip` (task 1.6) asserts parse→serialize byte-equality over real repo markdown docs — the one stated success metric with no existing coverage.
- **Phases 2–3** are verified by the per-phase **Exit test** (manual install + interaction against the running board), consistent with how the board/UI is validated today. Toolbar actions, active state, overflow, width, and table rendering are exercised through the installed plugin.
- Every phase ends with `npm run build` (`tsc && vite build`) + `claude plugin install ./specmanager --scope local` as the standing gate.

## Out of scope

- No `@specmanager/core`, MCP server, board server, or data-model/schema/migration changes — body stays a markdown string round-tripped through `fetchDoc`/`putDoc`.
- No changes to gate logic, approval flow, staleness computation, or optimistic-concurrency — those are exercised but not modified.
- No raw-markdown "source mode" escape hatch (resolved PRD Q3 — WYSIWYG only).
- No redesign of the board itself (cards, columns, header) — only the document panel's editing/reading surface and width.
- No collaborative editing, comments, or track-changes (single-user local tool).
- No change to the chat panel, `api.ts`, `types.ts`, `App.tsx`, `tokens.css` color scale, or `fonts.css` (beyond the four optionally-named derived values in task 3.4).

## Notes on estimates

Points here are **relative complexity, not hours** — calibrate them to your own velocity after the first phase ships, since Phase 1 carries the unfamiliar Milkdown/remark setup and will tell you the most about how the rest will go. Every task is scored **≤3 points**; the two genuinely large items (standing up the Milkdown surface, and the seven-action toolbar) were split into smaller install/mount/wire-state and per-button-cluster tasks — that is a granularity choice that leaves the phase subtotals unchanged, not a scope reduction. Testing is treated as first-class per-phase work, not an afterthought: the round-trip self-test is its own task (1.6) inside Phase 1, and each phase's exit test is the real "installable & testable" gate that must pass before the next phase starts.
