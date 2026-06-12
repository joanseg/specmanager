---
id: wt-redesign-002
featureId: feat-redesign
stage: walkthrough
status: approved
stale: false
title: Redesign — Phase B walkthrough
dependsOn:
  - plan-redesign-001
basedOn:
  plan-redesign-001: 2
generatedBy: agent
version: 1
phase: B
createdAt: '2026-05-28T18:16:15.557Z'
updatedAt: '2026-06-11T15:01:37.026Z'
---
# Redesign — Phase B walkthrough

> Per-phase walkthrough for **Phase B** (design-fidelity pass) of the Redesign feature. Documents only Phase B's work (tasks `task-013`–`task-018`). Phase A — the Obsidian Flux re-skin that this phase polishes — is covered in `walkthroughs/redesign/phase-a.md`. Where a file Phase A already owns is *extended* here, only the extension is described.
>
> Source plan: `plan-redesign-001` v2, Phase B section (`.claude/specs/features/redesign/plan/plan.md`).

## 1. What shipped in this phase

Phase A landed the Obsidian Flux palette, tokens, fonts, and layout, but a visual diff against the mockups (`docs/temp/redesign/board.png` / `panel.png`) showed the delivered board read *flat* — it had the colors but not the **depth** the design system calls for. Phase B closes exactly four high-signal fidelity gaps plus one lower-priority detail, all presentation-only:

1. **Card depth + micro-interaction** — board stage cards and walkthrough sub-cards now sit on a subtle tonal gradient with a hairline border that violet-tints toward `--primary` on hover, plus a soft glow and a slight lift/scale.
2. **Display-type header** — the "SpecManager" title renders in the large Hanken Grotesk display face (CSS-only, no JSX change).
3. **Gradient primary CTA** — the high-intent **Approve** action is now a filled indigo→purple gradient button; Save/Edit/Gate read as secondary/ghost, making the three-tier button hierarchy explicit.
4. **Panel-as-drawer** — the doc panel opens as a focused ~65%-width right-side drawer over a dimmed-but-visible board, with a glass leading edge and a large soft shadow.
5. **Rendered-pane breadcrumb** (lower priority) — a small `featureId › stage` crumb above the panel title.

It introduces no new product capability, data field, or endpoint, and never touches `@specmanager/core`, the MCP tools, the board server, or gate semantics. Every change is a token addition or a class/value swap on the existing Phase-A CSS/JSX. The phase is anchored to its build + manual-acceptance exit test (Section 4).

## 2. How it works

All work lands under `plugins/specmanager/ui/src/` in three files Phase A already established:

- **`tokens.css`** — extended with a new depth/elevation token block (card gradients, brightening borders, hover glow, glass edge, backdrop dim) and a primary-gradient CTA pair. Consistent with the Phase A invariant, **every new color/gradient/shadow lives here** and is derived from the existing palette via `color-mix` (the only literal rgba values — the card glow, the backdrop dim — are confined to this file). This keeps the legacy-hex grep gate strictly clean.
- **`styles.css`** — the single global stylesheet. Phase B rewrites a handful of existing rules to consume the new tokens: the card fills/hovers, the display title size, the `.btn--primary` treatment, the `.panel` drawer width + glass edge, and a new `.panel__crumb`. The existing `@media (prefers-reduced-motion: reduce)` block is extended so the new glow + scale are disabled.
- **`DocPanel.tsx`** — two small JSX edits: a class swap that moves the primary weight from Save onto Approve, and a new `<nav className="panel__crumb">` line. No handler, disabled-logic, or data-flow change.

The dependency discipline from Phase A repeats: the depth/elevation tokens (`task-013`) land before the card rules that consume them (`task-015`) and the drawer that uses the glass edge (`task-017`); the gradient token (`task-014`) lands before the Approve button re-point (`task-016`).

## 3. Code tour

Grouped by task. All paths are relative to the repo root; commit refs are the single commit each task landed under.

### task-013 — Depth/elevation tokens (`0145979`)
**`plugins/specmanager/ui/src/tokens.css`** (extension of the Phase A token layer). Added a "Card depth / micro-interaction" block (currently around lines 94–107) deriving everything from the existing palette via `color-mix`:
- `--card-gradient` / `--card-gradient-hover` — 135° tonal fills (`--surface-container` → `--surface-container-low`, brightening on hover) for "depth through layering".
- `--card-border` / `--card-border-hover` — a hairline that brightens toward `--primary` on hover (`color-mix(in srgb, var(--primary) 55%, var(--outline-variant))`).
- `--shadow-card` — a soft tonal hover glow, deliberately distinct from the large modal `--shadow-overlay`.
- `--glass-edge` — the semi-transparent leading-edge tint later consumed by the drawer.

### task-014 — Primary gradient CTA token + button hierarchy (`633c0e8`)
**`plugins/specmanager/ui/src/styles.css`** — rewrote `.btn--primary` from the Phase A outlined treatment (transparent fill + `--primary` text/border) to a filled gradient: `background: var(--gradient-primary)`, `--on-surface` light text, a 1px top-border highlight via `box-shadow: inset 0 1px 0 …`, and a `--gradient-primary-hover` brighten. The `--gradient-primary` / `--gradient-primary-hover` token pair itself was added in `tokens.css` (its block currently around lines 113–121; the breadcrumb commit later nudged its line numbers). `.btn` (secondary) and `.btn--ghost` are left untouched so the three-tier primary/secondary/ghost hierarchy is explicit. CSS-only — no JSX in this task.

### task-015 — Card depth + hover glow/scale (and the display title) (`381e7c3`)
**`plugins/specmanager/ui/src/styles.css`**:
- `.card` and `.card--button` swap their flat `--surface-container` fill for `--card-gradient` and their border to `--card-border`; on `:hover` they take `--card-border-hover`, `box-shadow: var(--shadow-card)`, and a `transform: translateY(-1px) scale(1.01)` micro-interaction. The transition list grew to include `box-shadow` and `transform`.
- Walkthrough sub-cards (`.card--sub` / `.card--final`) get the depth at a **lighter weight** — border-brighten + glow on hover but no scale (the rows are tight).
- Affordance carve-outs are preserved: `.card--empty` / `.card--locked` hovers explicitly reset shadow/transform/border so the dashed placeholders stay flat, and `.card--stale:hover` keeps its error-color border while still taking the depth lift.
- **Display-type header (gap 2)** is closed here with no JSX: `.board__title` `font-size` goes from `1.5rem` to `3rem` / `line-height: 3.5rem` (the `display-lg` Hanken Grotesk scale). `App.tsx` already applies the `.board__title` class, so no markup change was needed. The mobile `<640px` rule scales it back to `1.5rem` so the header still fits.
- The `@media (prefers-reduced-motion: reduce)` block is extended so `.card:hover`, `.card--button:hover`, and `.card--sub:hover` drop the glow + scale (the border-brighten remains as the sole hover affordance).

### task-016 — Re-point DocPanel actions to the new hierarchy (`f03b03c`)
**`plugins/specmanager/ui/src/DocPanel.tsx`** — two class swaps only, no behavior change:
- The **Save** button drops from `btn btn--primary` to `btn` (it is conditional/transient).
- The **Approve** button (draft-only) is promoted from `btn` to `btn btn--primary` — Approve is the high-intent action.

The existing disabled logic is untouched (Save still gates on `!dirty || saving || readOnly`; Approve still gates on `dirty` with the "save your changes first" title). Edit/Reopen stays secondary `btn` and Gate stays `btn--ghost`.

### task-017 — Constrain DocPanel to a ~65%-width drawer (`a269757`)
**`plugins/specmanager/ui/src/styles.css`** — `.panel` width changes from `min(80rem, 95vw)` to a focused `min(52rem, 65vw)`, so the dimmed board stays visible behind it. The left border becomes `--glass-edge` and the box-shadow gains an inner glass highlight (`inset 1px 0 0 color-mix(in srgb, var(--primary) 14%, transparent)`) layered over the existing large soft `--shadow-overlay`. A tablet-breakpoint rule was added so that at the narrower drawer width the chat-open 3-column split (`.panel__body--cols-3`) stacks chat under the editor/preview row instead of taking a third column — layout-only, the chat pane is still shown (reusing the existing "chat drops first" collapse intent, no behavior change). The mobile full-width override (`.panel { width: 100vw }`) is preserved.

### task-018 — Rendered-pane breadcrumb + verification pass (`7e63b3b`)
**`plugins/specmanager/ui/src/DocPanel.tsx`** — added a `<nav className="panel__crumb">` above the title row inside `panel__header`, rendering `{doc.featureId} › {STAGE_LABEL[doc.stage]}`. It derives entirely from data already on `doc` (no new fetch/endpoint).
**`plugins/specmanager/ui/src/styles.css`** — styled `.panel__crumb` (mono, low-contrast `--on-surface-variant`) and its `.panel__crumb-sep`. This commit also did the **in-scope cleanup** noted below.
**`plugins/specmanager/ui/src/tokens.css`** — added `--backdrop-dim: rgba(0, 0, 0, 0.55)`.

> **In-scope cleanup (legacy-hex gate hygiene):** the `.panel-backdrop` rule in `styles.css` carried a stray inline `rgba(0, 0, 0, 0.55)` left over from earlier work. This commit tokenized it to `--backdrop-dim` (added in `tokens.css`) so the "any one-off color outside `tokens.css`" half of the gate stays strictly clean.

## 4. How to verify

The Phase B exit test (verbatim from `plan.md`):

> From the repo root `npm --prefix plugins/specmanager/ui run build` (`tsc -p && vite build`) succeeds; the legacy-hex grep (`#0d0e10`, `#7ad0ff`, and any one-off color) finds nothing outside `tokens.css` — all Phase B colors/gradients/shadows are tokens. Install/run the plugin and open the board: cards (board stage cards + walkthrough sub-cards) now show tonal-elevation depth with a brightened/violet-tinted border and a hover glow + slight scale (matching `board.png`), and the "SpecManager" header title renders in the large Hanken Grotesk display face. Click a stage card → the doc panel opens as a focused right-side drawer (~65% width) with the dimmed board still visible behind it, a large soft shadow, and a glass leading edge (matching `panel.png`); the Approve action is a filled indigo→purple gradient primary button while Save/Edit/Gate read as secondary/ghost; and the rendered pane carries the stage breadcrumb header. Reduced-motion still disables the new glow/scale. Layout holds at <640px (drawer goes full-width), 640–1024px, and >1024px. A manual pass confirms approve/reopen, save + 409-conflict banner, staleness, gate, chat, and task editing still work unchanged.

How to run it:

1. **Build:** from the repo root, `npm --prefix plugins/specmanager/ui run build`. Confirmed green during this phase (`tsc -p` strict + `vite build` → `ui/dist`).
2. **Legacy-hex grep:** confirmed clean during this phase — `grep -rnE "#0d0e10|#7ad0ff" plugins/specmanager/ui/src/styles.css plugins/specmanager/ui/src/DocPanel.tsx plugins/specmanager/ui/src/App.tsx` returns nothing, and there are no raw 6-digit hex values left in `styles.css` / `DocPanel.tsx`. All new gradients/shadows/dim live only in `tokens.css`.
3. **Install/run + visual check:** `claude plugin install ./plugins/specmanager --scope local`, start a session to boot the board server, open the localhost board, and visually compare card depth + hover glow, the display-type header, the gradient Approve button, and the 65% drawer against `docs/temp/redesign/board.png` / `panel.png` at all three breakpoints (<640px full-width drawer, 640–1024px, >1024px).
4. **Reduced-motion:** with `prefers-reduced-motion: reduce` enabled, confirm the new card glow + scale are gone (border-brighten remains).
5. **Behavior regression:** confirm approve/reopen, save + 409-conflict banner, staleness display, gate check, chat, and task editing all still work unchanged.

## 5. Known limitations / follow-ups

- **The live visual match, the interactive behavior regression, the reduced-motion check, and the three-breakpoint checks all still require a running session.** The build verified during this phase was a static pass + green build only: `tsc`/`vite` succeed and the legacy-hex grep is clean, but the mockup-fidelity comparison, the approve/reopen + save/409-conflict + staleness + gate + chat + task-editing regression sweep, the reduced-motion toggle, and the layout-at-three-breakpoints checks have not been exercised against a live board. These should be confirmed in a running session before relying on the phase as fully accepted.
- **Drawer 3-column split is the tightest layout constraint.** At the narrower ~65% drawer width with chat open, the fix stacks chat under the editor/preview row via the tablet breakpoint. This is layout-only and should be eyeballed live to confirm none of the three panes feel cramped.
- **No automated test harness.** Consistent with the rest of SpecManager's UI work, this presentation-only phase introduces no test runner; the gate remains build + manual acceptance.
- **No structural follow-ups deferred to a later phase.** Phase B is additive polish on the Phase A surface; the planned `BuildRail.tsx` extraction remains flagged-not-assumed (not triggered) and the DESIGN column is intentionally kept per the PRD — neither is a Phase B gap.
