---
id: wt-redesign-004
featureId: feat-redesign
stage: walkthrough
status: draft
stale: false
title: Redesign — Phase D walkthrough
dependsOn:
  - plan-redesign-001
basedOn:
  plan-redesign-001: 7
generatedBy: agent
version: 1
phase: D
createdAt: '2026-05-28T20:51:04.096Z'
updatedAt: '2026-05-28T20:51:04.096Z'
---
# Redesign — Phase D walkthrough

> Per-phase walkthrough for **Phase D** of the Redesign feature. Phase D is the fourth and final presentation-only pass on the board UI, riding on the already-shipped Phase A (re-skin), Phase B (depth/gradient/drawer), and Phase C (grid box-model + horizontal panel header). It documents only Phase D's changes; where it re-touches files A/B/C already covered, it describes the Phase D delta and points back to the earlier walkthroughs (`wt-redesign-001`/`002`/`003`).

## 1. What shipped in this phase

Phase D is four small board-layout tweaks that bring the live board into final alignment with the `board.png` mockup. Looking at the board at 1280px after this phase: there is **no underline beneath the column titles**, **no vertical divider between the FEATURE row-label column and the PRD column**, the columns read **FEATURE · PRD · ARCHITECTURE · DESIGN · PLAN · BUILD · WALKTHROUGHS** (BUILD moved out of the rightmost position to sit between PLAN and WALKTHROUGHS), and the populated stage cards render at a **compact, capped height** instead of being stretched to fill a sparse row track. Everything else — the BUILD compact glance, its click-to-open overlay, the Phase C equal-height/bottom-aligned invariants, and the horizontal panel header — is preserved.

This maps directly to the phase's exit test (restated in §4): the four visible outcomes (a)–(d), with the Phase C correctness invariants still holding.

It is a pure presentation pass: two CSS border removals, one render-order + grid-track reorder, and a card-height cap (a dimension). No `@specmanager/core`, MCP tool, board-server, manifest, or gate-semantics change. No `DocPanel.tsx` this time — only `styles.css` and `App.tsx` under `plugins/specmanager/ui/`. No new colors, so the legacy-hex grep gate stays clean.

## 2. How it works

All four tweaks land in two files:

- **`/Users/joan/Documents/projects/specmanager/plugins/specmanager/ui/src/styles.css`** — the two divider removals (D1, D2) and the card-height cap (D4).
- **`/Users/joan/Documents/projects/specmanager/plugins/specmanager/ui/src/App.tsx`** — the BUILD column reorder (D3).

The two divider removals are single-rule deletions on the column-header and row-label CSS. The reorder is a render-order change: BUILD is emitted just before the `walkthrough` stage in the header and cell maps, and the `--grid-cols` track string is rewritten from a `repeat(5, …)` form to explicit tracks so the wide `14rem` BUILD track sits 6th. The card-height cap is the subtle one — it required more than a bare `max-height` (see below) and rides directly on the Phase C box-model (`.row__cell` flex parent + cards filling the cell). `STAGES`/`COLUMNS` in `types.ts` are deliberately untouched — the reorder is layout-only, so the gate logic and `Cell column="build"` markup are unchanged.

### The card-cap subtlety (D4)

The plan anticipated a simple `max-height`, but the real fix was more specific, because two cells must opt **out** of the cap and one variant had a box-model trap:

- `.card--button` carries `all: unset`, which had flipped it to `content-box`. With a fixed height that made the button-variant card render ~19px taller than its dashed `.card` siblings — a ragged row. The fix sets `box-sizing: border-box` alongside the fixed `height: 5.5rem` so the cap is the total box across both the plain `.card` (already border-box via the global reset) and the `.card--button`.
- `.row__cell` gained `align-items: flex-end` so a capped, compact stage card pins to the **bottom** of a taller row track (a track made tall by the BUILD glance or a tall Walkthroughs sub-card stack), preserving the Phase C bottom-aligned invariant instead of floating at the top with a gap.
- The BUILD glance (`.row__cell--build > .card--button`) and the Walkthroughs roll-up (`.row__cell > .card--walkthroughs`) keep explicit `height: auto` opt-outs so they still size to their own content and legitimately drive their tall rows; the compact stage cards bottom-align against them.

This replaces the Phase C rule that gave cards `flex: 1; height: auto` (which is what stretched them to ~206–226px on a sparse single-feature row). All of it is in `styles.css`; there was **no `App.tsx` row-track change** needed — the cap drives the geometry on its own.

## 3. Code tour

Grouped by task. All paths are absolute; all under `plugins/specmanager/ui/src/`.

### D1 — Remove the divider below each column title (`task-024`, commit `71da44d`)
`styles.css`. Dropped two declarations: the `border-bottom: 1px solid var(--outline-variant)` on `.grid__corner, .grid__header`, and the now-orphaned `border-bottom-color: var(--primary)` override on `.grid__header--build`. The BUILD header keeps its `color: var(--primary)` label tint; only the hairline underline is gone. CSS-only, no JSX.

### D2 — Remove the FEATURE↔PRD vertical divider (`task-025`, commit `dfb661a`)
`styles.css`. Removed the `border-right: 1px solid var(--outline-variant)` from `.row__label` (the first / FEATURE row-label column). The existing grid `gap` is now the only separation between FEATURE and PRD, matching every other column boundary. The mobile `<640px` rule that re-derives this as a `border-bottom` for the stacked layout was left intact.

### D3 — Reorder BUILD between PLAN and WALKTHROUGHS (`task-026`, commit `fd17bfb`)
`App.tsx`. The structural change. BUILD was the rightmost track, rendered after the `STAGES.map(...)` loop. Now:
- The header and cell maps each wrap their stage element in a `Fragment` and inject the BUILD header / `row__cell--build` **just before** the `walkthrough` stage (`c === "walkthrough" && …`), so BUILD renders 6th (after `prd…plan`, before `walkthrough`). `Fragment` was added to the React import.
- The `--grid-cols` inline style switched from `12rem repeat(${STAGES.length}, minmax(11rem, 1fr)) 14rem` (trailing BUILD) to explicit tracks `12rem repeat(4, minmax(11rem, 1fr)) 14rem minmax(11rem, 1fr)` so the wide `14rem` BUILD track sits in the 6th position between the four `prd…plan` tracks and the `walkthrough` track.

The `BuildCell` / `Cell column="build"` markup and the `.row__cell--build` class are byte-for-byte the same — only the emission position moved. `types.ts` `STAGES` is unchanged (layout-only, no semantic change). Live measure confirmed the order correct and the BUILD cell intact (compact glance + overlay).

### D4 — Cap board card height (`task-028`, commit `4891638`)
`styles.css`. Replaced the Phase C `.row__cell > .card, .row__cell > .card--button` rule (`flex: 1; min-height: 0; height: auto`) with `flex: 1; box-sizing: border-box; height: 5.5rem`, added `align-items: flex-end` to `.row__cell`, and added the `height: auto` opt-out for `.row__cell > .card--walkthroughs`. The BUILD glance's existing `height: auto` got a clarifying comment. (See §2 for why `box-sizing` and the opt-outs are load-bearing.) Same commit as D5.

### D5 — Phase D verification pass (`task-027`, commit `4891638`)
The phase gate, landed in the same commit as D4. The verifier ran the build, the legacy-hex grep, and the live 1280px re-check of items (a)–(d) plus the Phase C invariants. Live measure confirmed the stage cards drop from ~206–226px (Phase C, sparse-row stretch) to **77px** capped, with no row-to-row overlap and the column order correct.

## 4. How to verify

Phase D's `**Exit test:**` from the plan, verbatim:

> `npm --prefix plugins/specmanager/ui run build` green; legacy-hex grep clean. Re-check live at 1280px: (a) no underline divider beneath the column titles; (b) no vertical divider between the FEATURE and PRD columns; (c) column order FEATURE · PRD · ARCHITECTURE · DESIGN · PLAN · BUILD · WALKTHROUGHS with the BUILD cell intact (compact glance + overlay) and aligned; (d) populated stage cards at the capped mock-like height (not stretched), Phase C invariants holding (equal-height up to cap, bottom-aligned, full-column width, no row-to-row overlap), content fits no inner scroll; the horizontal panel header still holds. Reduced-motion unchanged. Responsive holds <640 / 640–1024 / >1024.

How to run it:

1. **Build** — from the repo root: `npm --prefix plugins/specmanager/ui run build` (runs `tsc -p && vite build`). Confirmed green in this pass (`✓ built in ~1s`, bundle serves as before).
2. **Legacy-hex grep** — `grep -rn -e '#0d0e10' -e '#7ad0ff' plugins/specmanager/ui/src --include='*.css' --include='*.tsx' | grep -v 'tokens.css'` should return nothing. Confirmed clean in this pass.
3. **Live re-check at 1280px** — open the board and confirm (a)–(d) above plus that the horizontal panel header still holds; check reduced-motion is unchanged; check the three breakpoints (the tablet `grid-column: 1 / -1` BUILD strip and the mobile linearized stack survive the reorder). Note the caveat in §5 about where the live board is served from.

The UI package has no automated test runner, so build + manual acceptance is the gate, consistent with Phases A–C.

## 5. Known limitations / follow-ups

- **The live board at `:4317` lags the source.** That port serves the installed clone's bundle, so Phase D only appears after push → marketplace update → reinstall → full session restart. The builder verified Phase D via `vite preview` (the freshly-built bundle), **not** `:4317`. If you open `:4317` and don't see the changes, reinstall the plugin and restart the session.
- **Pre-existing mobile linearization bug — NOT introduced by Phase D.** At `<640px` the grid does not collapse to a single column: `App.tsx` sets `--grid-cols` as an inline style, which overrides the mobile media query's `--grid-cols: 1fr`. This dates to Phase A (commit `a386936`, the responsive pass — see `wt-redesign-001`), is out of Phase D scope, and is a candidate follow-up. The clean fix is to move the breakpoint `--grid-cols` off the media query and onto a form that can win against the inline style (or stop setting it inline).
- **No other deferrals.** Phase D closes the board-layout fidelity gaps; with all four phases' walkthroughs in place, the feature-level roll-up (`/specmanager-walkthrough phaseName=final`) is the next step once every per-phase walkthrough is approved.
