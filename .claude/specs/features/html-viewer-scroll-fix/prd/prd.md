---
id: prd-html-viewer-scroll-fix-008
featureId: feat-html-viewer-scroll-fix
stage: prd
status: draft
stale: false
title: HTML viewer scroll fix PRD
dependsOn: []
basedOn: {}
generatedBy: agent
version: 1
createdAt: '2026-06-01T13:33:40.685Z'
updatedAt: '2026-06-01T13:33:40.685Z'
---
## Problem

The board's document panel renders two kinds of content in the same drawer, but they
do not scroll the same way.

- **Markdown documents** (PRD / Architecture / Plan / Walkthrough) render in a
  `<div class="panel__editor">` via `MarkdownEditor`. The content reflows to the
  panel width, so the reader gets a single clean **vertical** scroll and never a
  horizontal one.
- **Design briefs** (the `design` stage — verbatim HTML mockups) render in a
  sandboxed `<iframe class="panel__preview panel__preview--iframe">`
  (`plugins/specmanager/ui/src/DocPanel.tsx` ~L288–293, styled in
  `plugins/specmanager/ui/src/styles.css` ~L817).

The HTML/design viewer shows **both a vertical and a horizontal scrollbar**, and the
overall scroll feel does not match the markdown viewer. A user-reported screenshot
shows a prominent horizontal scrollbar across the bottom of the panel plus a vertical
scrollbar on the right.

This is jarring: two viewers living in the same drawer should behave consistently. The
horizontal scrollbar in particular reads as a layout bug, not an intentional affordance.

> Assumption: the inconsistency is purely a frontend layout/CSS issue in the board UI.
> Nothing about the stored design-brief content or the backend is implicated.

## Users & jobs-to-be-done

- **The single board user (the spec author / reviewer)** opening a design brief to read
  or review a mockup. Their job: read the brief top-to-bottom comfortably, the same way
  they read every other document in the same panel. A spurious horizontal scrollbar and
  inconsistent scroll styling break that flow and erode trust in the UI's polish.

## Goals

- The HTML/design viewer scrolls like the markdown viewer: a **single, consistent
  vertical scroll**.
- **No spurious horizontal scrollbar** in the design viewer under normal content widths.
- **Visual parity** of scroll styling (scrollbar appearance/behaviour, panel edges, no
  descender gap under the iframe) between the two viewers.

## Non-goals

- Changing the **verbatim HTML content** of design briefs. The mockups are authored
  artifacts and are rendered as-is; we do not rewrite or reflow their internal markup.
- Changing the **markdown viewer's** behaviour. It is the reference; it stays as it is.
- Any **backend, `core`, or MCP-server** change. This is board-UI-only.
- Adding zoom, fit-to-width, or responsive-rescale features for mockups. (Captured as an
  open question, not committed.)

## Success metrics

This is a small fix, not a measurable-funnel feature; success is observational:

- Opening any approved design brief shows no horizontal scrollbar for normal-width
  mockups, and a single vertical scrollbar — matching the markdown viewer.
- No regression reports about design-brief readability after the change.

## Constraints & assumptions

- **Keep the iframe sandboxed.** The design brief must continue to render inside the
  sandboxed `<iframe srcDoc=...>` (`sandbox="allow-same-origin"`). No inlining of the
  HTML into the main document.
- **Keep the iframe's own light background.** The iframe is a separate document with its
  own `--design-preview-bg`; the dark `.markdown` rules must not bleed into it. (They
  structurally cannot, since the iframe is a separate document — this constraint is about
  not regressing the wrapper styling.)
- **Use the existing Obsidian Flux design tokens** (the `--surface-*`, `--outline-*`,
  `--design-preview-bg` CSS custom properties already in `styles.css`). No new ad-hoc
  colours.
- **Root cause is not yet proven.** Investigation is part of the work. Candidate causes
  to confirm or rule out:
  - The `<iframe>` is inline-level by default; without `display: block` it can leave a
    baseline descender gap that forces overflow on the wrapper.
  - The inner verbatim mockup content may be wider than the iframe viewport, producing a
    legitimate horizontal scroll inside the iframe document itself.
  - The iframe wrapper (`.panel__preview--iframe`, `width/height: 100%`) handles overflow
    differently from the markdown wrapper (`.panel__editor`, `overflow: hidden` that
    delegates scrolling inward).
  The fix must follow from whichever cause(s) are confirmed; the PRD does not prescribe
  the solution.
- Scope is confined to `plugins/specmanager/ui/` (expected: `DocPanel.tsx` and/or
  `styles.css`).

## High-level user flows

- User opens the board, selects a feature, and opens its **design** document.
- The drawer renders the design brief in the sandboxed iframe.
- User scrolls: the brief scrolls vertically only, smoothly, with the same scroll feel
  as a markdown doc. No horizontal scrollbar appears for normal-width content.
- User switches to a markdown doc in the same session and perceives no jarring difference
  in how the panel scrolls.

## Open questions

1. **Wide mockups.** If a design brief's own HTML is genuinely wider than the panel
   (e.g. a fixed 1440px layout), what is the desired behaviour — allow horizontal scroll
   *inside* the iframe (intentional), scale-to-fit, or clip? The goal of "no horizontal
   scrollbar" likely refers to the spurious wrapper-level one, not a deliberately wide
   mockup. Investigation should distinguish the two; default assumption is that the
   reported bug is the spurious wrapper-level scroll, not legitimately-wide content.
2. **Scrollbar styling parity.** Does parity require matching custom scrollbar styling
   (width/colour) across both viewers, or just matching overflow behaviour? Confirm how
   far "visually consistent scroll styling" extends.
3. **Verification.** Is there a representative wide design brief in the repo to test
   against, or should one be constructed for QA?
