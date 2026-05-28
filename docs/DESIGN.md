<!-- specmanager:design:start -->
---
version: alpha
name: specmanager
description: "Auto-generated design system spec. Tokens inferred from 0 UI dir(s); fill in real values to harden."
colors:
  primary: "#1A1C1E"     # TODO: replace with real brand color
  neutral: "#F7F5F2"
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

_No UI source directory detected yet. Once the project grows a `src/`, `app/`, `ui/`, `web/`, `frontend/`, or `client/` directory with component files, the next re-sync will populate this section._

## Colors

No color CSS variables detected. Add `:root { --primary: #…; }` declarations in your UI's main stylesheet and re-run `/specmanager-init` (or POST `/api/design/sync`) to populate this section.

## Typography

Typography scale — replace the placeholder body-md entry in the frontmatter with the real scale (headlines, body sizes, labels). Most design systems have 9–15 levels.

## Layout

Layout strategy — grid model, breakpoint(s), max content width, spacing scale. The frontmatter `spacing` keys are the canonical values.

## Elevation & Depth

How visual hierarchy is conveyed — shadows, tonal layers, borders, or color contrast. Describe the approach this project takes.

## Shapes

Corner radii and edge treatments. See `rounded.*` in the frontmatter for the scale.

## Components

No component files detected yet. Once UI components exist in the repo, the next re-sync will surface them here.

## Do's and Don'ts

- Do treat the frontmatter as the source of truth — components reference it via `{colors.primary}`-style token references.
- Do keep this file in `./docs/DESIGN.md` so `/specmanager-init` and the auto-refresh can find it.
- Don't edit content **between** the managed markers by hand — SpecManager rewrites it after every feature ships.
- Don't move or rename the markers themselves; the merge logic searches for them literally.
<!-- specmanager:design:end -->
