---
id: plan-redesign-001
featureId: feat-redesign
stage: plan
status: approved
stale: false
title: Redesign plan
dependsOn:
  - arch-redesign-001
basedOn:
  arch-redesign-001: 4
generatedBy: agent
version: 1
createdAt: '2026-05-28T12:10:28.503Z'
updatedAt: '2026-05-28T12:21:23.216Z'
---
> Status: draft · awaiting human review and approval in the board UI.
> Based on: Architecture `arch-redesign-001` v4 (approved), which is itself based on PRD `prd-redesign-001` v2 (approved). No SpecManager `design`-stage doc exists for this feature; the visual source-of-truth lives as raw materials under `docs/temp/redesign/` (`DESIGN.md` "Obsidian Flux", reference mockups `board.png` and `panel.png`).

## Overview

This plan executes the **presentation-layer redesign** of SpecManager's own board UI and document panel to the "Obsidian Flux" design system. It is a pure re-skin: no `@specmanager/core`, MCP-tool, board-server API/WS, or gate-semantics changes (confirmed against Architecture §1, §3, §4 and PRD Non-goals). All work lands under `plugins/specmanager/ui/src/` plus a new token + font layer; the `tsc -p && vite build` → `ui/dist` pipeline and the Fastify `@fastify/static` serving path are unchanged.

The work is organised into **a single phase** (per the explicit one-phase constraint). It is still a real working-software increment: the phase exits with an installable plugin whose board renders in the new design system — token layer in place, fonts loaded, every component re-skinned, BUILD relocated to a right-hand region, responsive at the three breakpoints, and all pre-existing behaviors verified. Tasks are sequenced foundation-first (fonts + tokens before any component can consume them) so each later task references real CSS custom properties rather than legacy hex.

## Phase summary

| Phase | Theme | Tasks | Points |
| --- | --- | --- | --- |
| A | Obsidian Flux re-skin of board + doc panel | 12 | 29 |

## Phase A — Obsidian Flux re-skin of board + doc panel

**Exit test:** From the repo root run `npm --prefix plugins/specmanager/ui run build` (i.e. `tsc -p && vite build`) — it succeeds with the new font assets + tokens bundled. Install/run the plugin (`claude plugin install ./plugins/specmanager --scope local`, start a session to boot the board server) and open the localhost board. The board renders on a True Dark `#131315` canvas with a glassmorphic top bar ("SpecManager" + feature count + Rescan whose tooltip shows the last-synced time), tonal-elevation cards carrying status badges + mono version labels, and BUILD as a right-hand per-row region. Click a stage card → the doc panel shows the stage/version header with Approve + Edit/Reopen over a raw-source-left / rendered-right split. A manual pass confirms approve/reopen, save + 409-conflict banner, staleness display, gate check, chat, copy-slash helpers, and task editing still work. The board visually matches `docs/temp/redesign/board.png` and the panel matches `docs/temp/redesign/panel.png`; a grep for legacy hex (`#0d0e10`, `#7ad0ff`) finds none outside `tokens.css`. Layout holds with no broken overflow at <640px, 640–1024px, and >1024px.

| # | Task | Pts | Notes |
| --- | --- | --- | --- |
| 1 | Add self-hosted font deps and author `ui/src/fonts.css` | 2 | Add `@fontsource/hanken-grotesk`, `@fontsource/inter`, `@fontsource/geist-mono` (latest 5.2.8) to `ui/package.json`. Author `ui/src/fonts.css` importing only the confirmed weights (Architecture Q8): Hanken Grotesk 500/600, Inter 400/500, Geist Mono 400/500, all `font-display: swap`. Foundation — no consumers yet, so safe to land first. |
| 2 | Author `ui/src/tokens.css` Obsidian Flux token layer | 3 | New `:root` mapping every `docs/temp/redesign/DESIGN.md` frontmatter value to a CSS custom property: surfaces/tonal-elevation, on-surface text, outline/outline-variant, primary/secondary/tertiary/error, radii sm/md/lg = 4/8/16px, 8px spacing scale, tri-font role stacks, `--shadow-overlay`, `--glass-bg`/`--glass-blur`. Include the load-bearing status-color mapping (Architecture §4 table) AND the one derived token with the **pinned hex**: `--success: #10b981` (Architecture Q1 answer — the emerald not present in DESIGN.md frontmatter). |
| 3 | Wire token+font imports, base/reset, and `index.html` head | 1 | Import `tokens.css` then `fonts.css` at the top of `styles.css` (imported once via `main.tsx`); replace the legacy `:root` block + base/reset to consume tokens (`--surface`, `--on-surface`, `--font-body`). In `index.html` add `<meta name="color-scheme" content="dark">` and optional font `<link rel="preload">`. After this, no `:root` color lives outside `tokens.css`. |
| 4 | Re-skin board header to glassmorphic top bar | 2 | `App.tsx` `board__header`: sticky glass top bar (`--glass-bg` + `--glass-blur`, hairline `--outline-variant`), title in `--font-display`, feature count in `--font-body`/mono. Add a **Rescan** button wired to the existing `reload()` (no new endpoint, PRD Q3); fold the footer "Last synced" timestamp into the Rescan button's `title` tooltip and drop the footer (Architecture Q6 answer). |
| 5 | Relocate BUILD out of the grid into a right-hand region | 3 | Per `board.png` + Architecture §6/Q3 (option A): remove `"build"` from the iterated grid `COLUMNS`; render a fixed-width right-hand BUILD track per feature row showing a compact progress glance (progress bar + `done/total`, phases, in-progress, copy-`/specmanager-execute`) that opens the existing `BuildPanel` overlay on click. Keep `BuildCell`'s empty/ready/plan-not-approved states. Preserve row alignment in the same CSS grid (reserved final track). Do not touch the `BuildPanel` overlay behavior. |
| 6 | Re-skin board grid cards and cell sub-components | 3 | Re-style `card`, `card--button`, `card--stale`, `card--empty`/`--locked`/`--optional`, badges (`badge--draft/approved/stale/meta/design`), and the walkthrough sub-cards (`card--walkthroughs`, `card--sub`, `card--final`) to tonal-elevation surfaces: `--surface-container` family, `--radius-md`, 1px `--outline-variant` border that brightens/violet-tints on hover/active, no drop shadow. Version labels (`v1`) in `--font-mono` Geist. Keep DESIGN column (PRD Q2). Re-skin the no-features `empty` block and `state`/`state--error`. |
| 7 | Re-skin DocPanel header, actions, banners, split, stale section | 3 | `DocPanel.tsx`: stage/version header (stage label + `v{version}` mono + status badge) matching `panel.png`, with Approve on draft and **Edit** on approved mapping to existing `onReopen` (draft transition; no new semantics). Restyle toolbar, the Preview/Chat toggles, the floating panel (`--shadow-overlay`, `--radius-lg` leading edge), the stale `panel__stale`/drift section, and the warn/error/ok banners. Default split stays raw-left/rendered-right (`showPreview` true). Keep the design-brief sandboxed iframe (white bg) untouched; don't let dark `.markdown` styles bleed into it. Verify 409-conflict + saved banners stay legible. |
| 8 | Re-skin BuildPanel phase groups, progress bar, pills, artifacts | 3 | `BuildPanel.tsx`: re-skin phase groups (`phase-group`, `--done`), the `.bar` progress bar (`--success` done seg / `--tertiary` in-progress seg), status pills as glowing-dot active chips (`status-pill--on` per status mapped to success/tertiary/primary tokens), and artifact inputs with focus glow. Behavior/layout unchanged; remains the click-to-open overlay. |
| 9 | Re-skin ChatPanel to the new palette | 2 | `ChatPanel.tsx` styles: message rows (`msg--user/assistant/info/tool/error`) to token surfaces, assistant accent border + `msg__caret` to `--primary`, composer textarea focus glow, header chips. Behavior unchanged. |
| 10 | Re-theme the CodeMirror editor to Obsidian Flux tokens | 2 | `Editor.tsx`: swap the inline `EditorView.theme` to read tokens — `.cm-scroller` Geist mono (`--font-mono`), gutter/active-line/selection colors from `--outline-variant`/`--surface-container`, primary focus glow. Keep `{ dark: true }` and the read-only compartment; ensure selection/active-line contrast on `#131315` stays legible. |
| 11 | Responsive pass + reduced-motion guard | 3 | Add `styles.css` media queries for the three Obsidian Flux breakpoints (Architecture §6): desktop >1024px (full grid + right-hand BUILD + wide slide-in), tablet 640–1024px (narrow columns, BUILD wraps/collapses to compact strip, panel drops chat then collapses), mobile <640px (grid linearizes to stacked cards 16px margin, panels full-width, split collapses to single tabbed column). CSS-only, no JS layout logic. Add `@media (prefers-reduced-motion: reduce)` to disable scale/glow transitions (Architecture Q9). Provide a `@supports not (backdrop-filter: blur(1px))` opaque glass fallback. |
| 12 | Build, behavior, and visual verification pass | 2 | Run `npm --prefix plugins/specmanager/ui run build` (tsc + vite) and confirm it succeeds and the bundle still serves from the board server. Grep component blocks for surviving legacy hex (`#0d0e10`, `#7ad0ff`) → none outside `tokens.css`. Manual behavior pass (approve/reopen, save + conflict, staleness, gate, chat, copy-slash, task editing). Visual compare against `docs/temp/redesign/board.png` + `panel.png` at all three breakpoints. |

## Risk & sequencing notes

- **Foundation must land first.** Tasks 1→2→3 are strictly ordered: fonts and tokens have to exist before any component task can reference `--font-*` or `--surface-*`. Everything from task 4 onward depends on task 3 (the import wiring + base reset).
- **Pinned emerald is load-bearing (Architecture §9 / Q1).** Obsidian Flux's DESIGN.md frontmatter has **no** success/done color — only `tertiary` (amber) and `error` (rose). The board needs a distinct approved/done color, so task 2 introduces a single derived token `--success: #10b981` (the exact hex confirmed in the approved architecture). Both BuildPanel done segments/pills (task 8) and the approved badge (task 6) must consume this token, not a one-off hex — otherwise the legacy-hex grep gate in task 12 fails.
- **BUILD relocation is the only structural change (task 5).** It is option A (Architecture Q3): the right-hand region is a read-only progress glance; the full `BuildPanel` overlay behavior is preserved. If the region grows complex it MAY be extracted to `ui/src/BuildRail.tsx`, but that is not assumed and not a separate task. Rollback is contained to `App.tsx` grid layout — revert `COLUMNS` to include `"build"` to restore the old column.
- **Behavior-preservation hot spots.** The optimistic-concurrency banners (409 conflict / error / saved) and the sandboxed design-brief iframe are the things most likely to be silently broken by a color-only pass. Task 7 explicitly verifies the banners and protects the iframe; task 12 re-verifies end-to-end.
- **CodeMirror can drift from the rest of the UI (task 10).** The editor theme is set inline in JS, so it must read the same CSS custom properties as the stylesheet or selection/active-line colors will diverge on True Dark.
- **What blocks what:** 1→2→3 → {4, 6} → 5 (relocation depends on the re-skinned header/cards being in place) → 7 (panel) → {8, 9} → 10 → 11 (responsive depends on the final desktop layout existing) → 12 (verification last).

## Test strategy

The UI package has **no automated test runner** (verified: `ui/package.json` has only `dev`/`build`/`preview`; no test deps or config). Per the repo's existing convention, the gate is the **build + manual acceptance pass** rather than unit tests:
- **Per task:** keep the build green — re-run `npm --prefix plugins/specmanager/ui run build` after component tasks so `tsc` strict (`noUncheckedIndexedAccess`) and `vite build` stay clean.
- **Final pass (task 12):** the full behavior + visual + breakpoint + legacy-hex-grep verification, mapping 1:1 to the PRD acceptance criteria. This is the single source of "done" for the phase, consistent with how the rest of SpecManager's UI work has been validated (no test harness introduced by a presentation-only feature).

## Out of scope

- **No `@specmanager/core`, manifest, staleness-graph, or gate-semantics changes** (Architecture §3, PRD Non-goals). Data model is byte-for-byte identical.
- **No MCP-tool or board-server HTTP/WS contract changes** (Architecture §4). No new endpoints — "Rescan" reuses the existing client `reload()`.
- **No new product capabilities** — no new stages, editing modes, or data fields.
- **Canonical `docs/DESIGN.md` is NOT modified** (PRD Q1 answer: keep separate, reconcile later via re-sync). The styling source for this feature is `docs/temp/redesign/DESIGN.md` only.
- **No framework swap** — stays React 18 + Vite + single global stylesheet + CodeMirror 6 + `marked`; no CSS-in-JS.
- **DESIGN column is kept** despite `board.png` omitting it (PRD Q2) — not a removal task.
- **No `BuildRail.tsx` extraction** unless the right-hand region proves complex (flagged, not assumed; not a task).

## Open questions

None blocking. The Architecture (v4) already resolved every flagged risk inline: success emerald pinned to `#10b981` (Q1); BUILD = option A compact glance + existing overlay (Q3); DESIGN column kept (Q4); footer timestamp → Rescan tooltip (Q6); font weights Hanken Grotesk 500/600, Inter 400/500, Geist Mono 400/500 (Q8); reduced-motion guard on (Q9). No design-stage doc exists, so there is no draft-design contradiction to flag.
