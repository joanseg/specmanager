---
id: arch-redesign-001
featureId: feat-redesign
stage: architecture
status: approved
stale: false
title: Redesign architecture
dependsOn:
  - prd-redesign-001
basedOn:
  prd-redesign-001: 2
generatedBy: human
version: 4
createdAt: '2026-05-28T11:45:54.691Z'
updatedAt: '2026-05-28T12:06:38.114Z'
---
> Status: draft · awaiting human review and approval in the board UI.
> Based on: PRD `prd-redesign-001` v2 (approved). Design source: `docs/temp/redesign/DESIGN.md` ("Obsidian Flux"), reference mockups `docs/temp/redesign/board.png` and `docs/temp/redesign/panel.png`. No SpecManager `design`-stage doc exists for this feature; the design lives as raw materials under `docs/temp/redesign/`.

## 1. Summary

This is a **presentation-layer redesign** of SpecManager's existing localhost board UI (`plugins/specmanager/ui/`). We re-skin the current React 18 + Vite + CodeMirror 6 app to the "Obsidian Flux" design system: True Dark `#131315` surfaces, violet-indigo primary `#c0c1ff`, a tri-font stack (Hanken Grotesk / Inter / Geist mono, self-hosted), tonal elevation (no drop shadows except large-soft floating overlays), a glassmorphic top bar, an 8px spatial grid, and radii 4/8/16px. The work slots entirely into `ui/src/` (the seven components plus `styles.css`) plus a new tokens layer and self-hosted fonts. **No `@specmanager/core` changes, no MCP-tool changes, no board-server API/WS contract changes.** The Fastify static-serving path (`@fastify/static` rooted at `ui/dist`) and the build pipeline (`tsc -p && vite build`) are unchanged; the only build delta is that vite now bundles font assets + a tokens stylesheet.

Per the approved PRD's resolutions to the 5 open questions: canonical `docs/DESIGN.md` is **left untouched** (reconciled later via re-sync, out of scope); the DESIGN column **stays** in the primary grid despite the mockup; "Rescan" reuses the existing client-side `reload()` (no new endpoint); fonts are **self-hosted**; and the motion/micro-interactions are **implemented** (glassmorphism, focus glows, glowing-dot active chips, subtle scale/glow).

## 2. Affected components

All paths under `plugins/specmanager/ui/`. The current component tree (verified):

```
ui/index.html               → entry, mounts #root, loads /src/main.tsx
ui/src/main.tsx             → React root + imports styles.css
ui/src/App.tsx             → board grid (header, grid columns, footer) + opens DocPanel/BuildPanel
ui/src/DocPanel.tsx        → slide-in doc panel: header + toolbar + split body (editor | preview | chat)
ui/src/BuildPanel.tsx      → slide-in build panel: phase groups + task rows + artifacts
ui/src/ChatPanel.tsx       → chat column inside DocPanel
ui/src/Editor.tsx          → CodeMirror 6 wrapper with inline EditorView.theme
ui/src/styles.css          → single hand-rolled stylesheet, legacy :root tokens
ui/src/api.ts / types.ts   → fetch helpers + manifest mirror types (NO change needed)
```

### Files to change

| File | Change |
| --- | --- |
| `ui/src/styles.css` | Replace legacy `:root` block (`--bg:#0d0e10`, `--accent:#7ad0ff`, system-ui font). Restructure into: (1) imported tokens layer, (2) base/reset, (3) component blocks re-skinned to token variables. Every component class below is restyled here. |
| `ui/src/App.tsx` | Restructure board header (glassmorphic top bar: "SpecManager" + feature count + **Rescan** button wired to existing `reload()`). Relocate BUILD: today `COLUMNS = [...STAGES,"build"]` renders Build as the last grid column; new layout makes BUILD a right-hand per-row panel (see §6). Keep DESIGN column (PRD decision). Restyle all cell sub-components (`DocCellView`, `LockedCell`, `EmptyCell`, `OptionalDesignCell`, `BuildCell`, `WalkthroughCell`, walkthrough sub-cards). |
| `ui/src/DocPanel.tsx` | Re-skin header to a stage/version header with Approve + Edit/Reopen actions matching `panel.png`. Add an explicit **Edit** affordance for approved (read-only) docs that triggers `onReopen` (PRD: "Edit implies the doc moves to draft"). Default the split to raw-source-left / rendered-right (already the default: `showPreview=true`). Restyle toolbar, banners, stale section. No new save/approve/gate semantics. |
| `ui/src/BuildPanel.tsx` | Re-skin phase groups, progress bar, status pills (glowing-dot active chips), artifact inputs (focus glow). Layout/behavior unchanged; may render in the new right-hand panel slot (see §6) instead of a backdrop overlay. |
| `ui/src/ChatPanel.tsx` | Re-skin messages, streaming caret, tool/info lines, composer to the new palette. Behavior unchanged. |
| `ui/src/Editor.tsx` | Swap the inline `EditorView.theme` to read Obsidian Flux tokens: Geist mono `.cm-scroller`, token-based gutter/active-line/selection colors, primary focus glow. Keep `{ dark: true }`. No editor-behavior change. |
| `ui/index.html` | Optionally add `<link rel="preload">` for the three self-hosted font files (or rely on `@fontsource` CSS imports). Add `<meta name="color-scheme" content="dark">` already implied by `color-scheme: dark`. |
| `ui/package.json` | Add self-hosted font dependencies (see §4 — `@fontsource` packages, latest versions). |

### Files to add

| File | Purpose |
| --- | --- |
| `ui/src/tokens.css` | The Obsidian Flux token layer: a `:root` mapping every DESIGN.md frontmatter value to a CSS custom property (colors, typography roles, radii, spacing, elevation, glass). Imported first by `styles.css`. |
| `ui/src/fonts.css` | `@font-face` (or `@fontsource` `@import`) declarations for Hanken Grotesk / Inter / Geist mono, with fallbacks. Imported by `styles.css`. |
| `ui/public/fonts/` (only if self-hosting raw `.woff2` rather than `@fontsource`) | Static font files copied verbatim into the bundle by vite. Recommendation: prefer `@fontsource` packages (cleaner, version-pinned) over hand-managing `.woff2`. |

> No new React components are strictly required: the mockups map onto the existing component set. The only structural change is moving BUILD out of the grid `COLUMNS` array into a per-row right-hand panel region (a small new presentational wrapper inside `App.tsx`, not a new file). If the right-hand BUILD region grows complex it MAY be extracted to `ui/src/BuildRail.tsx` — flagged in §8, not assumed.

## 3. Data model changes

**None.** This feature touches only the presentation layer. The board manifest shape (`ui/src/types.ts`, mirroring `core/manifest.ts`), the document/task records, and all frontmatter remain byte-for-byte identical. No new fields, no new schemas, no migration. `@specmanager/core`, the manifest cache, the staleness graph, and gate semantics are explicit non-goals (PRD §Non-goals).

Canonical `docs/DESIGN.md` (the `specmanager-init` stub) is **not** modified by this feature (PRD open-question #1 answer: keep separate, reconcile later). The Obsidian Flux source-of-truth for this work is `docs/temp/redesign/DESIGN.md` only.

## 4. Interfaces

No public functions, endpoints, or events are introduced or changed. The board server's HTTP/WS surface (`/api/board`, `/api/documents/:id`, `/api/documents/:id/status`, `/api/features/:id/tasks`, `/api/features/:featureId/tasks/:taskId`, `/api/features/:id/gate`, `/api/chat/status`, `/ws`) and the client wrappers in `ui/src/api.ts` are untouched.

The only "interface" introduced is the **token contract** — a CSS custom-property API that all component styles consume. Naming follows the DESIGN.md frontmatter keys verbatim so the mapping is auditable:

```css
/* ui/src/tokens.css — sketch, not exhaustive */
:root {
  /* Surfaces / tonal elevation (DESIGN.md colors.*) */
  --surface: #131315;                 /* canvas / background */
  --surface-container-lowest: #0e0e10;
  --surface-container-low: #1b1b1d;
  --surface-container: #201f21;
  --surface-container-high: #2a2a2c;
  --surface-container-highest: #353437;
  --surface-bright: #39393b;
  /* Text */
  --on-surface: #e5e1e4;
  --on-surface-variant: #c7c4d7;
  --outline: #908fa0;
  --outline-variant: #464554;
  /* Primary (violet-indigo) */
  --primary: #c0c1ff;
  --on-primary: #1000a9;
  --primary-container: #8083ff;
  --surface-tint: #c0c1ff;
  /* Semantic — mapped to existing status roles */
  --secondary: #ddb7ff;               /* design / accent-2 */
  --tertiary: #ffb783;                /* warning / in-progress / draft */
  --error: #ffb4ab;                   /* error / stale */
  /* Radii (DESIGN.md rounded.*) */
  --radius-sm: 0.25rem;  --radius-md: 0.75rem;  --radius-lg: 1rem;
  /* Spacing (DESIGN.md spacing.* — strict 8px grid) */
  --space-xs: 4px; --space-sm: 8px; --space-md: 16px; --space-lg: 24px; --space-xl: 40px;
  --gutter: 20px; --margin: 24px; --container-max: 1440px;
  /* Type roles (DESIGN.md typography.*) */
  --font-display: "Hanken Grotesk", system-ui, sans-serif;
  --font-body:    "Inter", system-ui, sans-serif;
  --font-mono:    "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  /* Elevation / glass (DESIGN.md Elevation & Depth) */
  --shadow-overlay: 0px 20px 50px rgba(0,0,0,0.5);
  --glass-bg: rgba(24,24,27,0.8);
  --glass-blur: blur(12px);
}
```

**Status-color mapping decision** (load-bearing — the legacy palette had bespoke draft/approved/stale/build colors that must map onto Obsidian Flux semantics, since DESIGN.md has no explicit success/warning tokens, only `tertiary`/`error` and a note that Success=Emerald, Warning=Amber, Error=Rose are "used sparingly in desaturated tones"):

| Legacy token | Role | Obsidian Flux mapping |
| --- | --- | --- |
| `--approved` `#5fb56b` | approved / task done | new desaturated emerald `--approved` (DESIGN.md says Success=Emerald, sparingly); not in frontmatter → add a single derived token in tokens.css |
| `--draft` / `--build-prog` `#c8924a` | draft / in-progress | `--tertiary` `#ffb783` (amber) |
| `--stale` `#d77b6b` | stale / error | `--error` `#ffb4ab` (rose) |
| `--accent` `#7ad0ff` (cyan) | primary actions, links, focus | `--primary` `#c0c1ff` (violet-indigo) — legacy cyan fully removed |
| `--badge--design` cyan | design stage accent | `--secondary` `#ddb7ff` (violet) |

> Emerald success is the one color not present in the DESIGN.md frontmatter; it is introduced as a single derived token (e.g. `--success: #9bd3a0` desaturated) in `tokens.css`, kept consistent with the "desaturated, sparingly" guidance. Surfaced in §8.

## 5. Sequence / flow

Nothing in the runtime data flow changes. The visual flow:

1. **Board load** — `main.tsx` → `App` mounts → `reload()` GETs `/api/board` → renders. `openWebSocket` subscribes; bursts coalesce into a debounced `reload()` (existing 100ms timer). The glassmorphic top bar renders title + `board.features.length` count + **Rescan** button.
2. **Rescan** — the new header button calls the existing `reload()` (re-fetch `/api/board`). It is a relabel/repromotion of the current "Last synced" footer + WS reload behavior — **no new endpoint** (PRD answer #3). The footer "Last synced" timestamp can remain or fold into the header per `board.png`.
3. **Open doc** — click a stage card → `setOpenDocId` → `DocPanel` GETs `/api/documents/:id`, renders the stage/version header, split editor/preview. CodeMirror (`Editor.tsx`) loads with the new theme; `marked.parse` renders the preview into the restyled `.markdown` block via `dangerouslySetInnerHTML`. Design briefs (`stage==="design"`) still render verbatim in the sandboxed iframe (`sandbox="allow-same-origin"`, `srcDoc={body}`) — **rendering path preserved**.
4. **Edit / Approve / Reopen** — same handlers (`onSave` with optimistic concurrency via `baseVersion`, `onApprove`, `onReopen`). The panel's **Edit** button on an approved doc maps to `onReopen` (draft transition). Conflict/error/saved banners are restyled but identical in behavior.
5. **Build** — the right-hand BUILD region (or panel) renders `BuildPanel` content: phase groups, progress bar, status pills, artifact editing — all via existing `/api/features/:id/tasks` + PATCH. Status pills become glowing-dot active chips.
6. **Chat** — toggled inside `DocPanel`; `openChatSocket` streams `chat.*` WS events into restyled message rows. Unchanged.

## 6. Layout & responsive approach

### Board grid (matches `board.png`)
- The current grid is `display:grid` with `grid-template-columns: 12rem repeat(COLUMNS.length, minmax(11rem,1fr))` and rows via `display:contents`.
- **New layout:** stage columns render FEATURE · PRD · ARCHITECTURE · **DESIGN** · PLAN · WALKTHROUGHS (DESIGN kept per PRD), and **BUILD becomes a fixed right-hand region per feature row** rather than a grid column. Concretely: remove `"build"` from the iterated `COLUMNS` used for the grid headers/cells, and render the build content in a dedicated right-aligned panel/column that the mockup shows flush to the right of each row's WALKTHROUGHS cell. Implement as either (a) a fixed-width final grid track reserved for BUILD outside the stage `COLUMNS` map, or (b) a per-row flex sidebar. Recommendation: keep it inside the same CSS grid as a reserved fixed-width track (simplest, preserves row alignment) — flagged in §8.
- Cards become tonal-elevation surfaces (`--surface-container` family) with `--radius-md`, no drop shadow, a subtle 1px `--outline-variant` border that brightens / gains a violet tint on hover/active (DESIGN.md Cards). Empty/locked/optional cells keep their dashed/dotted treatments re-skinned. Version labels (`v1`,`v2`) render in `--font-mono` Geist (DESIGN.md: metadata in Geist mono).

### Top bar (glassmorphic)
- `position: sticky; top: 0`, `background: var(--glass-bg)`, `backdrop-filter: var(--glass-blur)`, bottom hairline `--outline-variant`. Title in `--font-display` (Hanken Grotesk). Feature count + Rescan in `--font-body`/`--font-mono`.

### Doc panel (matches `panel.png`)
- Stage/version header row (stage label + `v{version}` in mono + status badge) with Approve + Edit actions; below it the split body. Default split is `panel__body--cols-2` (raw source left, rendered right) since `showPreview` defaults true; Preview/Chat toggles remain. Floating panel uses `--shadow-overlay` (the one allowed large-soft shadow) and `--radius-lg` on its leading edge.

### Breakpoints (DESIGN.md / PRD)
- **Desktop > 1024px:** full grid, BUILD right-hand region, doc panel as wide slide-in (`min(80rem,95vw)`).
- **Tablet 640–1024px:** grid columns narrow (reduce `minmax`), BUILD region may wrap below the row or collapse to a compact progress strip; doc-panel split may drop chat first, then collapse to single column.
- **Mobile < 640px:** grid linearizes (single column / stacked cards per feature, 16px margin); doc/build panels go full-width; split body collapses to a single tabbed column (editor | preview toggle). Implemented with CSS media queries in `styles.css` keyed to the three breakpoints; no JS layout logic added.

## 7. Failure & edge cases

- **Fonts fail to load / FOUT.** Self-hosted fonts ship in-bundle (no network), so failure is unlikely; still declare robust fallbacks (`system-ui`, `ui-monospace`) in the token font stacks and use `font-display: swap` to avoid invisible text. Offline-first is the whole point of self-hosting for a local tool.
- **Legacy hard-coded colors leak through.** Acceptance requires no surviving legacy tokens or one-off hex. Mitigation: the only `:root` color definitions live in `tokens.css`; component styles reference variables exclusively. A grep for `#0d0e10` / `#7ad0ff` / raw hex in component blocks is the verification gate (PRD success metric "Token fidelity").
- **CodeMirror theme drift.** `Editor.tsx` sets colors inline via `EditorView.theme`; these must reference the same tokens (passed as CSS custom props the theme reads, e.g. `var(--font-mono)`, `var(--outline-variant)`) so the editor doesn't diverge from the rest of the UI. Selection/active-line colors must keep adequate contrast on `#131315`.
- **Markdown/iframe rendering.** Restyling `.markdown` must not change the `dangerouslySetInnerHTML` path; design-brief HTML must stay in the sandboxed iframe (white background by design). Don't let the new dark `.markdown` styles bleed into the iframe.
- **Glassmorphism backdrop-filter unsupported / perf.** `backdrop-filter` is broadly supported in the local Chromium/WebKit target; provide a solid `--glass-bg`-opaque fallback via `@supports not (backdrop-filter: blur(1px))`. Keep blur to the top bar + active inputs only (DESIGN.md) to avoid scroll jank.
- **Optimistic-concurrency banners.** The 409-conflict, error, and saved banners must remain visible and legible after restyle — these are the behaviors most likely to be silently broken by a color-only pass; verify against PRD acceptance ("save + conflict").
- **Status-color contrast.** Desaturated semantic colors on True Dark must stay WCAG-legible for badges/pills; pick the lighter container/on- variants where contrast is tight.
- **Empty board / error states.** `state`, `state--error`, and the no-features `empty` block must be re-skinned too (easy to miss — they live outside the main grid).

## 8. Conventions used

Matching the existing repo (verified in source):
- **React 18 function components**, default export per component, hooks-only (`useState`/`useEffect`/`useMemo`/`useCallback`/`useRef`). No class components, no state library.
- **TypeScript strict** with `noUncheckedIndexedAccess` (`ui/tsconfig.json`); `target ES2022`, `module ESNext`, `moduleResolution bundler`, `jsx react-jsx`, `noEmit` (vite/tsc split). New `.ts`/`.tsx` (if any) must compile clean under these.
- **Single global stylesheet** imported once in `main.tsx`; flat, mostly-BEM class names (`.card`, `.card__title`, `.card--button`, `.panel__body--cols-2`). The redesign keeps this model — tokens + fonts are additional CSS files imported at the top of `styles.css`, not a CSS-in-JS swap (no framework change per PRD constraint).
- **CodeMirror 6** theming via `EditorView.theme(..., { dark: true })` (existing pattern in `Editor.tsx`).
- **`marked` v15** for markdown → HTML; sandboxed iframe for design-brief HTML. Preserved.
- **Latest pinned deps** (CLAUDE.md convention): React 18+, Vite 5, CodeMirror 6, `marked` 15. Fonts added as version-pinned `@fontsource` packages (latest) for self-hosting, consistent with "self-host, offline-friendly" (PRD answer #4) and the project's "use latest APIs" rule.
- **Build/serve path unchanged**: `npm run build` = `tsc -p tsconfig.json && vite build` → `ui/dist`; served by `@fastify/static` rooted at `ui/dist` in `server/src/board-server.ts` (UI_DIST = `../../ui/dist`). vite will bundle/hash the font assets automatically; no server change.
- **localhost-only, no auth** — no security surface touched.

## 9. Open questions / risks

1. **Emerald success token.** DESIGN.md frontmatter has no success/done color (only `tertiary` amber and `error` rose); the board needs a distinct approved/done color. Recommendation: add one derived desaturated-emerald token in `tokens.css` (e.g. `--success: ~#9bd3a0`) per DESIGN.md's prose ("Success=Emerald, used sparingly in desaturated tones"). Planner to confirm the exact hex or have the designer specify it.

   ANSWER: success emerald #10b981
3. **BUILD region implementation.** `board.png` shows BUILD as a right-hand per-row panel, but the build content (phase groups, task editing) is currently a full slide-in overlay (`BuildPanel`). Two viable shapes: (a) keep `BuildPanel` as the click-to-open overlay and show only a compact per-row BUILD progress summary in the new right-hand region; or (b) inline the full build view in the rail. Recommendation: (a) — minimal change, preserves existing overlay behavior; the right-hand region is a read-only progress glance that opens the full panel on click. Confirm with the mockup's intent. If (b), extract `ui/src/BuildRail.tsx`.

ANSWER: option A

4. **DESIGN column placement.** PRD says keep the DESIGN column even though `board.png` omits it. Confirm its position in the order (proposed: PRD · ARCHITECTURE · DESIGN · PLAN · WALKTHROUGHS) and that the optional/empty DESIGN affordances (`OptionalDesignCell`) carry over re-skinned.

   ANSWER: Confirmed
   
6. **Footer "Last synced" fate.** `board.png` surfaces Rescan + feature count in the header; the existing footer shows "Last synced". Decide whether to drop the footer, move the timestamp into the header tooltip on Rescan, or keep both.

   ANSWER: move the timestamp into the header tooltip on Rescan
8. **Font scope.** DESIGN.md lists six typography roles (display-lg, headline-lg, body-md, label-sm, code-md, +mobile). Confirm which weights of each family to self-host (avoid bundling unused weights to keep the bundle lean) — likely Hanken Grotesk 500/600, Inter 400/500, Geist Mono 400/500.

ANSWER: Hanken Grotesk 500/600, Inter 400/500, Geist Mono 400/500.

9. **Motion budget.** PRD answer #5 says implement the motion (focus glows, glowing-dot chips, scale/glow micro-interactions, backdrop-blur). Confirm reduced-motion handling: add `@media (prefers-reduced-motion: reduce)` to disable scale/glow transitions for accessibility — recommended default.
ANSWER: OK
