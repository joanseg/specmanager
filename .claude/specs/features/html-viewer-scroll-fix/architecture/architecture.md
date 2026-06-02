---
id: arch-html-viewer-scroll-fix-007
featureId: feat-html-viewer-scroll-fix
stage: architecture
status: approved
stale: false
title: HTML viewer scroll fix architecture
dependsOn:
  - prd-html-viewer-scroll-fix-008
basedOn:
  prd-html-viewer-scroll-fix-008: 2
generatedBy: agent
version: 1
createdAt: '2026-06-02T11:30:14.865Z'
updatedAt: '2026-06-02T11:36:36.136Z'
---
## Summary

We are making the board's sandboxed design-brief viewer scroll like the markdown
viewer: a single vertical scroll, no spurious horizontal scrollbar under normal-width
content, and matching scrollbar appearance (width + colour). This is a board-UI-only,
CSS-and-small-JSX change confined to `plugins/specmanager/ui/`. No `core`, MCP-server,
backend, or stored-content changes. The reference behaviour (the markdown viewer) is
unchanged; we bring the design iframe up to parity with it.

## Root-cause findings (from reading the source)

The PRD leaves root cause to be proven. Reading the current code confirms three
distinct contributors, which the design must address together:

1. **Inline iframe → baseline descender gap.** `<iframe class="panel__preview
   panel__preview--iframe">` (`DocPanel.tsx` ~L288–293) is styled with `width/height:
   100%` but no `display: block` (`styles.css` ~L817–824). Replaced inline elements sit
   on the text baseline, leaving a few px of descender space below them; against a
   `height: 100%` iframe inside a `overflow: hidden` grid cell this forces the wrapper to
   overflow and can produce a scroll artifact. Confirmed: no `display: block` exists on
   `.panel__preview--iframe` today.

2. **Inner mockup width vs. iframe viewport.** The verbatim mockup HTML is rendered
   as-is inside the iframe's own document. If the mockup is wider than the iframe
   viewport (e.g. a fixed-px layout), the iframe document shows a legitimate horizontal
   scrollbar — this is *inside* the iframe, not the wrapper. PRD open-Q1 (answered
   "correct") confirms the reported bug is the spurious wrapper-level scroll, not
   deliberately-wide content; normal-width mockups must not trigger it.

3. **No scrollbar styling anywhere today.** A repo-wide search finds no
   `::-webkit-scrollbar` / `scrollbar-width` / `scrollbar-color` rules in
   `plugins/specmanager/ui/src/`. Both viewers currently use native OS scrollbars. The
   markdown reference scrolls on `.md-surface` (`flex: 1; overflow: auto`, `styles.css`
   ~L554–558) with its prose column capped at `width: 90%` (`styles.css` ~L560–564) so
   it never overflows horizontally. The iframe wrapper has no equivalent column cap and
   no scrollbar styling. Therefore PRD open-Q2 (answered "width and color across both
   viewers") requires *adding* scrollbar styling to both surfaces, not just the iframe.

## Affected components

Existing files touched (both already exist):

- `plugins/specmanager/ui/src/styles.css` — primary change surface.
  - `.panel__preview--iframe` (~L817–824): add `display: block` to kill the baseline
    descender gap; keep `width/height: 100%`, the `--design-preview-bg` background, and
    the `--outline-variant` left border (constraint: don't regress wrapper styling).
  - `.md-surface` (~L554–558) and the iframe wrapper: add shared custom scrollbar
    styling (width + colour) so the two viewers match. Implemented via a single reusable
    selector or a `.scroll-surface` utility class applied to both, token-driven.
- `plugins/specmanager/ui/src/DocPanel.tsx` — `isDesign` iframe branch (~L287–293).
  - Inject a small `<style>` block into the iframe document (prepended to `srcDoc`, or
    set after load) carrying `html,body { margin:0 }` and the matching custom-scrollbar
    rules, because parent-document CSS cannot reach inside a sandboxed iframe. This is
    the only way to achieve scrollbar parity *inside* the design document.

New files: none required. (If a `.scroll-surface` utility grows beyond a few rules it
stays in `styles.css`; we do not add a new stylesheet.)

Not touched (explicit non-goals): `MarkdownEditor.tsx` behaviour, `tokens.css` values
(we reuse existing tokens), `api.ts`, anything under `server/` or `core/`.

## Data model changes

None. No schema, frontmatter, type, or stored-content change. Design-brief HTML is
rendered verbatim and is untouched (PRD non-goal).

## Interfaces

No public functions, endpoints, or events introduced. The only code-level surface is
the existing React component's render output.

The iframe-side style injection is the one new internal detail. Sketch (TS/React,
strict mode, matching the existing arrow-function + className style):

```
// In DocPanel.tsx, design branch — compose the scrollbar/reset CSS into srcDoc
const PREVIEW_STYLE = `<style>html,body{margin:0}
  /* webkit + standards scrollbar rules mirroring .md-surface */ </style>`;
// <iframe ... srcDoc={PREVIEW_STYLE + body} />
```

Constraint preserved: `sandbox="allow-same-origin"` stays; we do not inline the HTML
into the main document.

## Sequence / flow

1. User opens a feature's **design** doc in the board; `DocPanel` loads it via
   `fetchDoc` (unchanged).
2. `isDesign` is true → the iframe branch renders. `srcDoc` is now the injected
   `<style>` (margin reset + matching scrollbar rules) followed by the verbatim mockup
   body.
3. `.panel__preview--iframe` is `display: block`, so no baseline descender gap; the
   iframe fills its grid cell with no wrapper-level overflow.
4. The iframe document scrolls vertically with the shared scrollbar styling. For
   normal-width mockups there is no horizontal scrollbar. For a genuinely wide mockup,
   horizontal scroll appears *inside* the iframe only (intentional, per open-Q1).
5. User switches to a markdown doc: `.md-surface` carries the same scrollbar width/colour
   → consistent feel. No change to its existing 90%-column overflow behaviour.

## Failure & edge cases

- **Genuinely wide mockup (fixed-px layout).** Horizontal scroll appears inside the
  iframe, not on the wrapper. This is the intended behaviour per open-Q1; the fix must
  not clip or rescale it (no zoom/fit-to-width — PRD non-goal).
- **Empty / tiny mockup.** `display: block` + `height: 100%` still fills the cell; no
  scrollbar shown; light background preserved via `--design-preview-bg`.
- **Scrollbar styling not applied (e.g. Firefox vs WebKit).** Use both the standards
  `scrollbar-width`/`scrollbar-color` and the WebKit `::-webkit-scrollbar` pseudo so
  parity holds across the engines the board may run in; degrade gracefully to native.
- **Dark `.markdown` rules bleeding into the light iframe.** Structurally impossible
  (separate document); the injected `<style>` only adds reset + scrollbar rules and must
  not set a body background that fights `--design-preview-bg`.
- **Regression to markdown viewer.** Risk if the shared scrollbar selector is too broad.
  Mitigation: scope it to the two named scroll surfaces, not a global `*` rule.

## Conventions used

- React 18 + Vite + TypeScript strict; functional components, arrow handlers, BEM-ish
  `panel__*` / `md-*` class names (matches `DocPanel.tsx`, `MarkdownEditor.tsx`).
- Token-driven CSS only — reuse existing `--surface-container-*`, `--outline` /
  `--outline-variant`, and `--design-preview-bg` from `tokens.css`. No new ad-hoc
  colours (PRD constraint).
- Sandboxed iframe with `sandbox="allow-same-origin"` and `srcDoc` retained (PRD
  constraint); no inlining into the main document.
- Verification is observational/visual — the UI package has no test runner (no test
  script or test dep in `plugins/specmanager/ui/package.json`), matching the PRD's
  observational success metrics.

## Open questions / risks

1. **Scrollbar token choice.** No scrollbar token exists today. The planner should
   decide whether to introduce a small named token (e.g. a `--scrollbar-thumb` derived
   from `--outline-variant`) for the shared rule, or use the existing tokens directly
   inline. Leaning toward reusing existing tokens to honour "no new ad-hoc colours,"
   but a single semantic alias may read cleaner.
2. **Wide-mockup test fixture (PRD open-Q3, answered "construct one on design phase").**
   This feature currently has **no design doc**. A representative wide design brief is
   needed for QA. The planner should either (a) wait for / request a design-phase mockup
   to test against, or (b) hand-construct a throwaway wide HTML brief for manual
   verification. This architecture depends only on the PRD; if a design doc is later
   added and approved, this doc may need a `basedOn` update.
3. **Injection mechanism for iframe styles.** Prepending a `<style>` to `srcDoc` is the
   simplest approach and keeps everything declarative; an alternative is an `onLoad`
   handler writing into `contentDocument.head`. Recommend the `srcDoc` prepend for
   simplicity and to avoid timing/race concerns — planner to confirm.
