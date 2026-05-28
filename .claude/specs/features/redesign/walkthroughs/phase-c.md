---
id: wt-redesign-003
featureId: feat-redesign
stage: walkthrough
status: approved
stale: false
title: Redesign — Phase C walkthrough
dependsOn:
  - plan-redesign-001
basedOn:
  plan-redesign-001: 3
generatedBy: agent
version: 1
phase: C
createdAt: '2026-05-28T19:20:58.459Z'
updatedAt: '2026-05-28T19:21:27.000Z'
---
> Per-phase walkthrough for **Phase C — Layout-correctness pass**. Phases A and B are documented in their own walkthroughs (`walkthroughs/redesign/phase-a.md`, `walkthroughs/redesign/phase-b.md`); this doc covers ONLY Phase C and cross-references A/B where it re-touches shared files.

## What shipped in this phase

Phase B made the board look right — depth, gradient CTA, the right-side drawer — but a live DOM measurement at 1280px found the box model never actually fit the grid. Populated stage cards rendered taller than their grid row and spilled into the next feature row; cards in a row were ragged (different heights, content-hugging widths); the Walkthroughs "★ Feature roll-up" sub-label rode over its card's top border; and the doc-panel header was still a vertical stack instead of the single horizontal bar the mockup shows. Phase C is a **geometry-only** correction that fixes exactly those measured defects. No behavior, no new color, no new endpoint — box-model/flex/grid values, one header JSX regroup, and one breadcrumb-label helper. The phase is "done" when a re-measure at 1280px confirms the five exit-test items (a–e) and the behavior-regression pass is clean.

## How it works

All changes land in three files already established by Phases A/B, under `plugins/specmanager/ui/src/`:

- `styles.css` — the single global stylesheet (board grid, cards, panel).
- `DocPanel.tsx` — the document drawer.
- `App.tsx` — referenced but **not** changed in Phase C; the grid markup (`display: contents` rows, `.row__cell` cells) it emitted in Phase A is what the new CSS targets.

The core insight driving the board fix: the grid already had `align-items: stretch`, so each row track is sized to its tallest cell — but the cells weren't passing that height down to the cards. `.row__cell` had only a `min-height`, so its child card laid out at intrinsic content height and overflowed. Phase C makes each cell a flex container and lets its single child card fill it on both axes. The header fix is a pure layout regroup: `.panel__header` becomes a flex row, and the action buttons move up out of the separate `.panel__toolbar` strip into a right-aligned cluster in the header — every handler and disabled-rule preserved.

## Code tour (by task)

### C1 — Grid row box-model (task-019, commit `befbcbe`)
`plugins/specmanager/ui/src/styles.css`. Makes `.row__cell` and `.row__cell--build` `display: flex`, and adds rules so their single child card (`> .card`, `> .card--button`) gets `flex: 1; min-height: 0`. The cell now stretches to the full row-track height (driven by the grid's `align-items: stretch`) and the card fills it; flex's default `align-self: stretch` gives the card full column width. Net effect at 1280px: a row's height equals its tallest cell, no card overflows into the next feature row, and PRD/ARCH/PLAN/BUILD cards become uniform full-column-width. The bottom-alignment of badges was already handled in Phase A via `.card__badges { margin-top: auto }` — C1 just gives those cards equal height to align against. No JSX change.

### C2 — Walkthroughs roll-up sub-label (task-020, commit `d6f9cbc`)
`plugins/specmanager/ui/src/styles.css`. The "★ Feature roll-up" label was riding over the sub-card's top border because of tight padding and the tall ★ glyph cap. Fix bumps `.card--sub` top padding (`0.42rem 0.55rem` → `0.5rem 0.55rem 0.42rem`), mirrors the same adjustment on the empty/locked variant (`.card--sub.card--empty`), and constrains `.card__sub-label` with `line-height: 1.15` so the label's line box clears the 1px border and the `--radius-sm` corner. Only the sub-card label spacing is touched — the Phase B depth tokens (`--card-gradient` / `--card-border`) and the dashed placeholder variants are left intact. The per-phase sub-cards share these classes and were verified to still read correctly.

### C3 — Horizontal panel header (task-021, commit `b80f18b`)
`plugins/specmanager/ui/src/DocPanel.tsx` + `styles.css`. The largest change in the phase, but still layout-only. Previously `.panel__header` was `display: block` (close ×, breadcrumb, title-row, badges each on their own line) and the Save/Approve/Edit/Gate? buttons lived in a **separate** `.panel__toolbar` strip below. C3 lays the header out as a flex row: `display: flex; justify-content: space-between; align-items: flex-start`, with a left cluster `.panel__header-main` (breadcrumb + title + badges) and a right cluster `.panel__header-actions` holding the action buttons plus the close ×. In the JSX the four action buttons moved up from `.panel__toolbar` into the header's right cluster; the toolbar now holds only the Preview/Chat toggles. The close × dropped its absolute positioning (it now sits in the flex action cluster). **Every handler and disabled rule is preserved verbatim** — `onSave` with its `!dirty || saving || readOnly` gate, the draft→Approve / approved→Edit branch (`onApprove` / `onReopen`), `onShowGate`, and the Phase B button hierarchy (Approve = `btn btn--primary` gradient, Save/Edit = `btn`, Gate? = `btn--ghost`). The conflict/error/saved banners and the cols-1/2/3 body split stay below the header. The mobile breakpoint adds `flex-wrap: wrap` to both header and action cluster so the bar wraps to two rows under 640px rather than crushing the title.

### C4 — Feature-title breadcrumb + drawer width (task-022, commit `675b2d6`)
`plugins/specmanager/ui/src/DocPanel.tsx` + `styles.css`. Two polish items. (1) The breadcrumb rendered the raw `doc.featureId` ("feat-redesign"); `DocFull` carries no feature title, so a one-line helper `featureTitle(featureId)` strips the `feat-` prefix and title-cases the slug ("feat-redesign" → "Redesign"). No new fetch/endpoint. (2) The drawer measured ~57% rather than the ~65% target because the `52rem` cap bound first at 1280px; the `.panel` width changes from `min(52rem, 65vw)` to `min(60rem, 65vw)` so `65vw` binds and the drawer reads at 65%. The mobile full-width override (`.panel { width: 100vw }`) is preserved and the cols-3 split still fits.

### C5 — Verification pass + flex-child height fix (task-023, commit `bbdd8f0`)
`plugins/specmanager/ui/src/styles.css`. The verification re-measure surfaced a real bug the first C1 pass missed: the flex children still inflated to intrinsic content height (measured 224px vs the 206px row track) because the base `.card` / `.card--button` rule carries `height: 100%`, which against a content-sized flex container resolves to the card's own content height. The fix adds `height: auto` to the `.row__cell > .card` / `.card--button` and `.row__cell--build > .card` / `.card--button` rules so `flex: 1` alone drives the height. Post-fix measurement: rows equal-height (206px), bottom-aligned, no row-to-row overlap (8px gap), uniform widths, roll-up label inside its border, header one horizontal row with the human feature title and the drawer at 65%. Build green, legacy-hex grep clean.

## How to verify

Phase C **Exit test** (from `plan.md`, Phase C):

> From the repo root `npm --prefix plugins/specmanager/ui run build` (`tsc -p && vite build`) succeeds; the legacy-hex grep (`#0d0e10`, `#7ad0ff`, and any one-off color) finds nothing outside `tokens.css`. Install/run the plugin and open the board, then re-measure the live DOM at **1280px** and confirm: **(a)** no stage card's bottom crosses into the next feature row — a row's height is driven by its tallest cell and there is no row-to-row overlap; **(b)** all cards in a single row are equal height and bottom-aligned; **(c)** cards fill their column width uniformly (no content-hugging / left-aligned narrow cards); **(d)** the Walkthroughs "★ Feature roll-up" label sits fully inside its card (no border overlap); **(e)** the doc panel header is a single horizontal bar with the document title + stage breadcrumb on the left and the Save/Approve/Edit/Gate actions aligned right on the **same** row, matching `board.png`/`panel.png`; and the breadcrumb shows the human feature **title** ("Redesign"), not the raw `feat-redesign` id, with the drawer at the ~65% target. Reduced-motion behavior is unchanged. Layout holds at <640px, 640–1024px, and >1024px. A behavior-regression pass confirms approve/reopen, save + 409-conflict banner, staleness, gate, chat, and task editing still work unchanged.

Run order:
1. `npm --prefix plugins/specmanager/ui run build` → expect green.
2. Legacy-hex grep across `plugins/specmanager/ui/src/` for `#0d0e10`, `#7ad0ff`, and any one-off color → nothing outside `tokens.css`.
3. Open the board (see limitation 1 below about which server serves the fixed bundle), measure rendered geometry at 1280px against items (a)–(e). The box-model defects are only catchable by measuring rendered geometry, not by visual diff.
4. Reduced-motion check + the three-breakpoint check + the behavior-regression pass (approve/reopen, save + 409 conflict, staleness, gate, chat, task editing).

## Known limitations / follow-ups

1. **The running board on :4317 may serve a stale bundle.** The MCP-booted board server caches `dist/` at boot, so the live :4317 board keeps serving the pre-Phase-C bundle until a fresh `claude` session reboots the board server. `dist/` is gitignored, so the Phase C commits show only `src` changes. The builder verified Phase C against a temporary `vite dev` server rather than :4317. To see the fixes on :4317, restart the `claude` session that boots the board.

2. **Under 640px the grid does not linearize to one column.** `App.tsx` sets `--grid-cols` as an inline style that overrides the mobile media query's `--grid-cols: 1fr`, so the grid stays multi-column on narrow screens. This is **pre-existing** from the Phase A responsive task (commit `a386936`) — NOT a Phase C regression — and is out of Phase C's geometry-only scope. Flagged as a follow-up (candidate Phase D): move the column count off the inline style (or make the media query win) so mobile stacks to a single column.
