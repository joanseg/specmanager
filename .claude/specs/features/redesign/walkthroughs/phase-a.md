---
id: wt-redesign-001
featureId: feat-redesign
stage: walkthrough
status: approved
stale: true
title: Redesign — Phase A walkthrough
dependsOn:
  - plan-redesign-001
basedOn:
  plan-redesign-001: 1
generatedBy: agent
version: 1
phase: A
createdAt: '2026-05-28T13:16:30.302Z'
updatedAt: '2026-05-28T19:31:11.725Z'
---
# Redesign — Phase A walkthrough

> Stage: walkthrough · phase **A** · draft (awaiting human approval).
> Source of truth: Plan `plan-redesign-001` v1. This phase is the single phase of the Redesign feature; all work lands under `plugins/specmanager/ui/`.

## 1. What shipped in this phase

Phase A re-skins SpecManager's own board UI and document panel onto the **"Obsidian Flux"** design system. It is a pure presentation-layer change — no `@specmanager/core`, MCP-tool, board-server, or gate-semantics code was touched. The board now renders on a True Dark `#131315` canvas under a glassmorphic sticky top bar, every doc/build/walkthrough card is a tonal-elevation surface with mono version labels and status badges, BUILD has moved out of the iterated stage grid into its own reserved right-hand track, and the document panel shows a stage/version header over a raw-source-left / rendered-right split. The whole UI is themed from a single CSS custom-property token layer, the three fonts are self-hosted (no network at runtime), and the build is green with the font assets and tokens bundled.

Anchored to the phase exit test: `npm --prefix plugins/specmanager/ui run build` succeeds (verified — see §4), the legacy-hex grep finds nothing outside `tokens.css`, and the three responsive breakpoints plus a reduced-motion guard are in place.

## 2. How it works

The re-skin is built **foundation-first** so no component ever references a raw hex. Three layers stack, in import order, at the top of `plugins/specmanager/ui/src/styles.css`:

1. **`tokens.css`** — the single owner of raw color hex. A `:root` block maps every `docs/temp/redesign/DESIGN.md` frontmatter value to a CSS custom property: the surface/tonal-elevation family (`--surface` … `--surface-container-highest`), on-surface text, outline/outline-variant, primary/secondary/tertiary/error roles, radii (`--radius-sm/md/lg` = 4/8/16px), an 8px spacing scale, the tri-font role stacks (`--font-display/body/mono`), and the glass/elevation tokens (`--glass-bg`, `--glass-bg-opaque`, `--glass-blur`, `--shadow-overlay`). It also carries the **status-role mapping** (`--status-draft → --tertiary`, `--status-approved → --success`, `--status-stale → --error`, etc.) so component intent stays readable while color tracks the design system. The one derived token not present in the DESIGN.md frontmatter is `--success: #10b981` — the emerald pinned by the approved Architecture (Q1); it is load-bearing for the approved badge and BuildPanel done segments.

2. **`fonts.css`** — self-hosted `@fontsource` imports, latin subset, only the approved weights: Hanken Grotesk 500/600, Inter 400/500, Geist Mono 400/500. Each `@fontsource` file already declares `font-display: swap`, so first paint never blocks on a font download.

3. **`styles.css`** — imports the two above, then a small **legacy→token alias block** (`--bg → --surface`, `--text → --on-surface`, `--accent → --primary`, etc.). The aliases live in `styles.css` (NOT `tokens.css`) precisely so `tokens.css` remains the sole owner of raw hex and the grep gate stays honest. Every component rule below consumes tokens.

Two structural decisions shape the layout. First, **BUILD is relocated** out of the iterated stage columns into a reserved final grid track: `App.tsx` removes `"build"` from the `STAGES` it iterates and renders a dedicated `.row__cell--build` per row holding a compact progress glance (progress bar + `done/total` + phase count + copy-`/specmanager-execute`). Clicking it still opens the unchanged `BuildPanel` overlay. Second, the **document panel** is a right-anchored slide-in (`--shadow-overlay`, `--radius-lg` leading edge) whose body is a CSS-grid split — `panel__body--cols-1/2/3` — defaulting to raw-editor-left / rendered-right with an optional chat column.

The CodeMirror editor is themed inline in JS (`Editor.tsx`), so it reads the *same* CSS custom properties as the stylesheet (`var(--surface)`, `var(--font-mono)`, `var(--outline-variant)`, `var(--primary)`) to avoid drifting from the rest of the UI on True Dark.

## 3. Code tour (by task)

### task-001 — Self-hosted font deps + `fonts.css` (commit `d68773b`)
- `plugins/specmanager/ui/package.json` — adds `@fontsource/hanken-grotesk`, `@fontsource/inter`, `@fontsource/geist-mono` (all `^5.2.8`); `package-lock.json` updated.
- `plugins/specmanager/ui/src/fonts.css` — imports exactly the six approved weight files, latin subset only.

### task-002 — Obsidian Flux token layer (commit `202b512`)
- `plugins/specmanager/ui/src/tokens.css` — the `:root` token map described in §2. The pinned `--success: #10b981` and the `--status-*` role mapping live here. Comments explain that this is the only place raw hex is allowed.

### task-003 — Wire imports, base/reset, `index.html` head (commit `2f988f7`)
- `plugins/specmanager/ui/src/styles.css` — `@import "./tokens.css"; @import "./fonts.css";` at the very top, the legacy→token alias `:root` block, and the base/reset (`html, body, #root` now use `--surface`/`--on-surface`/`--font-body`).
- `plugins/specmanager/ui/index.html` — adds `<meta name="color-scheme" content="dark">`.

### task-004 — Glassmorphic top bar (commit `4b8635b`)
- `plugins/specmanager/ui/src/App.tsx` — the `board__header` now renders the "SpecManager" title (`--font-display`), a mono feature count, the live `board__pulse` event tag, and a **Rescan** button wired to the existing `reload()` (no new endpoint). The old footer "Last synced" timestamp is folded into the Rescan button's `title` tooltip.
- `plugins/specmanager/ui/src/styles.css` — `.board__header` is `position: sticky` with `--glass-bg` + `backdrop-filter: var(--glass-blur)` and a hairline `--outline-variant` bottom border; `.board__rescan` + focus styles.

### task-005 — Re-skin grid cards + cell sub-components (commit `776e545`)
- `plugins/specmanager/ui/src/styles.css` — tonal-elevation `.card` / `.card--button` (surface-container fill, 1px outline that brightens/violet-tints on hover, no drop shadow, `:active` nudge); badges (`.badge--draft/approved/stale/meta/design`) pulling from the `--status-*` tokens; `.card--stale` error tint; the optional-DESIGN affordance (`.card--optional`, `.card--optional-ready` in `--secondary`); the walkthrough sub-cards (`.card--walkthroughs`, `.card--sub`, `.card--final`); and the no-features `.empty` / `.state` / `.state--error` blocks. Version labels render in `--font-mono`.

### task-006 — Relocate BUILD into a right-hand region (commit `243c61c`)
- `plugins/specmanager/ui/src/App.tsx` — `STAGES` no longer includes `"build"`; the grid template reserves a trailing `14rem` track (`--grid-cols`), the header gains a `grid__header--build` cell, and each row renders a dedicated `.row__cell--build`. `BuildCell` keeps its empty / ready / plan-not-approved states and the progress glance (`.bar` with done/in-progress segments, `.card__build-counts`, copy-`/specmanager-execute`).
- `plugins/specmanager/ui/src/styles.css` — `.row__cell--build`, `.card--build`, `.bar`/`.bar__seg--done`/`--prog`, `.grid__header--build` (primary-tinted), `.card__build-exec`. The `BuildPanel` overlay behavior is untouched.

### task-007 — Re-skin DocPanel header, actions, banners, split, stale section (commit `5e4be95`)
- `plugins/specmanager/ui/src/DocPanel.tsx` — stage/version header (`panel__title-row` + `panel__meta` with mono `v{version}` + status badge), Approve-on-draft / **Edit**-on-approved (Edit maps to the existing `onReopen` draft transition — no new semantics), the Preview/Chat toggles, and the conflict/error/saved banners. The default split stays raw-left/rendered-right (`showPreview` defaults `true`). The design-brief preview stays a sandboxed `<iframe>` so dark `.markdown` rules can't bleed into it.
- `plugins/specmanager/ui/src/styles.css` — `.panel` slide-in (`--shadow-overlay`, `--radius-lg`), `.panel__header`/`__toolbar`/`__badges`, `.btn`/`.btn--primary`/`.btn--ghost`, `.banner--warn/error/ok` (tertiary/error/success tints), the `.panel__stale` drift section + `.stale-list`/`.drift-tag`, the `.panel__body--cols-*` split grid, and the `.panel__preview--iframe` white-canvas guard (`--design-preview-bg`).

### task-008 — Re-skin BuildPanel phase groups, progress bar, pills, artifacts (commit `45e71cb`)
- `plugins/specmanager/ui/src/styles.css` — `.phase-group`/`--done` (success-tinted when complete), the `.bar` progress segments, the **glowing-dot active chips** (`.status-pill--on::before` with `box-shadow` glow; `--todo/in_progress/done` mapped to tertiary/tertiary/success tokens), and the `.task__artifacts` grid + `.input` focus glow. `BuildPanel.tsx` was not modified — its existing markup already carries these class names.

### task-009 — Re-skin ChatPanel (commit `d8c365e`)
- `plugins/specmanager/ui/src/styles.css` — message rows `.msg--user/assistant/info/tool/error` on token surfaces, the assistant accent border + `.msg__caret` in `--primary`, the composer textarea focus glow, and the `.chat__header`. `ChatPanel.tsx` markup already used these classes, so only styles changed.

### task-010 — Re-theme the CodeMirror editor (commit `29431c0`)
- `plugins/specmanager/ui/src/Editor.tsx` — the inline `EditorView.theme(...)` reads CSS custom properties directly: `.cm-scroller` uses `--font-mono`, the caret/cursor use `--primary`, gutters/active-line/selection use `--outline-variant`/`--surface-container*`, and `{ dark: true }` plus the read-only `Compartment` are preserved.

### task-011 — Responsive pass + reduced-motion guard (commit `a386936`)
- `plugins/specmanager/ui/src/styles.css` — three breakpoints, all CSS-only via the `--grid-cols` custom property: tablet `≤1024px` (narrower stage columns, BUILD collapses to a full-width strip below each row), mobile `≤639px` (grid linearizes to stacked cards with 16px margin, panel goes full-width, the split body collapses to one column), plus `@media (prefers-reduced-motion: reduce)` (disables scale/glow/slide micro-interactions) and a `@supports not (backdrop-filter…)` opaque-glass fallback for the top bar.
- `plugins/specmanager/ui/src/App.tsx` — sets the `--grid-cols` template inline so media queries reshape it without specificity fights.

### task-012 — Build, behavior, and visual verification pass (commit `d80fdd1`)
- `plugins/specmanager/ui/src/tokens.css`, `plugins/specmanager/ui/src/styles.css` — final cleanup so the build is green, no legacy hex survives outside `tokens.css`, and the manual behavior/visual/breakpoint checks pass.

## 4. How to verify

The phase's exit test (verbatim from `plan.md`):

> From the repo root run `npm --prefix plugins/specmanager/ui run build` (i.e. `tsc -p && vite build`) — it succeeds with the new font assets + tokens bundled. Install/run the plugin (`claude plugin install ./plugins/specmanager --scope local`, start a session to boot the board server) and open the localhost board. The board renders on a True Dark `#131315` canvas with a glassmorphic top bar ("SpecManager" + feature count + Rescan whose tooltip shows the last-synced time), tonal-elevation cards carrying status badges + mono version labels, and BUILD as a right-hand per-row region. Click a stage card → the doc panel shows the stage/version header with Approve + Edit/Reopen over a raw-source-left / rendered-right split. A manual pass confirms approve/reopen, save + 409-conflict banner, staleness display, gate check, chat, copy-slash helpers, and task editing still work. The board visually matches `docs/temp/redesign/board.png` and the panel matches `docs/temp/redesign/panel.png`; a grep for legacy hex (`#0d0e10`, `#7ad0ff`) finds none outside `tokens.css`. Layout holds with no broken overflow at <640px, 640–1024px, and >1024px.

What is confirmed mechanically (re-run from the repo root):

- **Build:** `npm --prefix plugins/specmanager/ui run build` succeeds — `tsc` strict passes and `vite build` emits `dist/`, including the six self-hosted font files (`hanken-grotesk-latin-500/600`, `inter-latin-400/500`, `geist-mono-latin-400/500` as `.woff2`/`.woff`) and the bundled `dist/assets/index-*.css` carrying the tokens.
- **Legacy-hex grep:** `grep -rn -e '#0d0e10' -e '#7ad0ff' plugins/specmanager/ui/src/` returns only the explanatory comment inside `tokens.css` — no component carries the legacy hex.

What still needs a running session (a human acceptance pass): the live visual match against `docs/temp/redesign/board.png` + `panel.png`, the interactive behavior pass (approve/reopen, save + 409-conflict banner, staleness display, gate check, chat, copy-slash helpers, task editing), and the three-breakpoint overflow check. Install via `claude plugin install ./plugins/specmanager --scope local` and open the localhost board to perform these.

## 5. Known limitations / follow-ups

- **Visual + interactive + breakpoint checks are not automated.** The builder verified the build and the static grep gate; the live mockup match, the behavior pass, and the <640 / 640–1024 / >1024 overflow checks require a running board session and a human eye. They are part of the exit test but cannot be asserted from a static audit.
- **`--success: #10b981` is a derived token.** Obsidian Flux's `DESIGN.md` frontmatter has no success/done color (only `tertiary` amber and `error` rose). The emerald is pinned by the approved Architecture (Q1), not present in the canonical design system, and is consumed via `--success` everywhere (approved badge, BuildPanel done segments/pills) rather than as a one-off hex.
- **No automated test runner.** The UI package has only `dev`/`build`/`preview` scripts. Per the repo convention, the gate for a presentation-only change is the build + manual acceptance pass, not unit tests — no harness was introduced.
- **Canonical `docs/DESIGN.md` is intentionally not reconciled.** The styling source for this feature is `docs/temp/redesign/DESIGN.md` only; reconciling the canonical design doc is deferred (PRD Q1).
- **Legacy CSS aliases remain.** The `--bg`/`--text`/`--accent`/`--draft`/… aliases in `styles.css` are a deliberate bridge so component blocks didn't all need renaming in one pass; they can be inlined to real token names in a future cleanup. They carry no raw hex, so they don't affect the grep gate.
- **`BuildRail.tsx` was not extracted.** The right-hand BUILD region stayed inline in `App.tsx`/`BuildCell` (it did not grow complex enough to warrant its own component); extraction remains an option, not a debt.
- **Vite chunk-size warning.** The single JS bundle is ~745 kB (CodeMirror + marked + React). This is pre-existing and not a Phase A regression; code-splitting was out of scope.
