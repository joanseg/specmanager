<!-- specmanager:design:start -->
---
version: alpha
name: specmanager
description: "Auto-generated design system spec. Tokens inferred from 1 UI dir(s); fill in real values to harden."
colors:
  bg: var(--surface)
  surface-2: var(--surface-container-high)
  border: var(--outline-variant)
  text: var(--on-surface)
  text-dim: var(--on-surface-variant)
  accent: var(--primary)
  draft: var(--status-draft)
  approved: var(--status-approved)
  stale: var(--status-stale)
  build-prog: var(--status-in-progress)
  build-done: var(--status-done)
  surface: "#131315"
typography:
  body-md:
    fontFamily: system-ui
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
rounded:
  sm: 4px
  md: 8px
  lg: 12px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 32px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: 12px
---

# Design system

_This file follows the [Stitch DESIGN.md spec](./references/stitch-design-md.md). The block between the managed markers is auto-generated from the repo's UI sources by `/specmanager-init` and refreshed after every feature ships. **Anything outside the markers is yours** — write freely._

## Overview

Inferred from `plugins/specmanager/ui` (7 component file(s)). The project's voice and feel should be described here — replace this paragraph with brand personality, target audience, and the emotional response the UI should evoke.

## Colors

Colors harvested from CSS custom properties in the UI source:

- `--bg`: `var(--surface)`
- `--surface-2`: `var(--surface-container-high)`
- `--border`: `var(--outline-variant)`
- `--text`: `var(--on-surface)`
- `--text-dim`: `var(--on-surface-variant)`
- `--accent`: `var(--primary)`
- `--draft`: `var(--status-draft)`
- `--approved`: `var(--status-approved)`
- `--stale`: `var(--status-stale)`
- `--build-prog`: `var(--status-in-progress)`
- `--build-done`: `var(--status-done)`
- `--surface`: `#131315`

## Typography

Typography scale — replace the placeholder body-md entry in the frontmatter with the real scale (headlines, body sizes, labels). Most design systems have 9–15 levels.

## Layout

Layout strategy — grid model, breakpoint(s), max content width, spacing scale. The frontmatter `spacing` keys are the canonical values.

## Elevation & Depth

How visual hierarchy is conveyed — shadows, tonal layers, borders, or color contrast. Describe the approach this project takes.

## Shapes

Corner radii and edge treatments. See `rounded.*` in the frontmatter for the scale.

## Components

Sample component files discovered:

- `plugins/specmanager/ui/src/App.tsx`
- `plugins/specmanager/ui/src/BuildPanel.tsx`
- `plugins/specmanager/ui/src/ChatPanel.tsx`
- `plugins/specmanager/ui/src/DocPanel.tsx`
- `plugins/specmanager/ui/src/MarkdownEditor.tsx`
- `plugins/specmanager/ui/src/MarkdownToolbar.tsx`
- `plugins/specmanager/ui/src/main.tsx`

Define style guidance for the component atoms used in this project (Buttons, Inputs, Cards, Lists, etc.) in the frontmatter `components` map.

## Do's and Don'ts

- Do treat the frontmatter as the source of truth — components reference it via `{colors.primary}`-style token references.
- Do keep this file in `./docs/DESIGN.md` so `/specmanager-init` and the auto-refresh can find it.
- Don't edit content **between** the managed markers by hand — SpecManager rewrites it after every feature ships.
- Don't move or rename the markers themselves; the merge logic searches for them literally.
<!-- specmanager:design:end -->
