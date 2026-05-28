---
name: Obsidian Flux
colors:
  surface: '#131315'
  surface-dim: '#131315'
  surface-bright: '#39393b'
  surface-container-lowest: '#0e0e10'
  surface-container-low: '#1b1b1d'
  surface-container: '#201f21'
  surface-container-high: '#2a2a2c'
  surface-container-highest: '#353437'
  on-surface: '#e5e1e4'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#e5e1e4'
  inverse-on-surface: '#303032'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#ddb7ff'
  on-secondary: '#490080'
  secondary-container: '#6f00be'
  on-secondary-container: '#d6a9ff'
  tertiary: '#ffb783'
  on-tertiary: '#4f2500'
  tertiary-container: '#d97721'
  on-tertiary-container: '#452000'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#f0dbff'
  secondary-fixed-dim: '#ddb7ff'
  on-secondary-fixed: '#2c0051'
  on-secondary-fixed-variant: '#6900b3'
  tertiary-fixed: '#ffdcc5'
  tertiary-fixed-dim: '#ffb783'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#703700'
  background: '#131315'
  on-background: '#e5e1e4'
  surface-variant: '#353437'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  code-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 20px
  margin: 24px
  container-max: 1440px
---

## Brand & Style

This design system is engineered for professional software management, evoking a sense of focused productivity, technical precision, and understated premium quality. The brand personality is "The Quiet Powerhouse"—reliable and sophisticated without being loud.

The aesthetic blends **Minimalism** with subtle **Glassmorphism**. It utilizes deep charcoal foundations, high-quality typography, and surgical applications of vibrant gradients to guide the eye. The emotional response is one of calm control, designed to reduce cognitive load during complex software orchestration tasks.

**Key Visual Principles:**
- **Depth through Layering:** Surfaces are defined by tonal shifts rather than heavy borders.
- **Micro-interactions:** Subtle glows and slight scale shifts indicate interactivity.
- **Intentionality:** Every pixel serves a function; decoration is reserved for state changes and primary actions.

## Colors

The palette is rooted in a "True Dark" philosophy, using a nearly black neutral base to maximize contrast and reduce eye strain.

- **Primary & Secondary:** A digital violet-to-indigo gradient scale is used for high-intent actions and active states.
- **Neutrals:** A scale of cool grays (Zinc/Slate) provides the structural hierarchy. Surfaces utilize a slight "inner glow" border to separate themselves from the background.
- **Semantic Colors:** Success (Emerald), Warning (Amber), and Error (Rose) are used sparingly in desaturated tones, only gaining vibrancy during hover or critical alerts.
- **Gradients:** Linear gradients at 135 degrees are used for primary button backgrounds and subtle container highlights to imply depth.

## Typography

The system utilizes a tri-font approach to balance character with utility. 

- **Hanken Grotesk** is used for large displays and headlines, offering a modern, sharp geometric feel.
- **Inter** handles the heavy lifting for body text and UI controls, ensuring maximum legibility across all screen densities.
- **Geist** (Monospaced) is used for labels, metadata, and technical data points, reinforcing the software management context.

All typography follows a strict 4px baseline grid. Headlines should use "Optical" sizing where available, tightening tracking as font size increases.

## Layout & Spacing

The layout utilizes a **Fluid-Fixed Hybrid Grid**. The main navigation and sidebars are fixed-width to maintain consistent utility access, while the main content area utilizes a 12-column fluid grid.

**Breakpoints:**
- **Mobile:** < 640px (1 column, 16px margin)
- **Tablet:** 640px - 1024px (6 columns, 20px margin)
- **Desktop:** > 1024px (12 columns, 24px margin)

A strict 8px spatial system governs all padding and margins. Vertical rhythm is maintained by using 16px (md) as the default gap for stack layouts and 24px (lg) for section separation.

## Elevation & Depth

Depth is established through **Tonal Elevation** rather than traditional drop shadows. As an element "rises" in the UI hierarchy, its background color becomes lighter.

1.  **Level 0 (Floor):** `#09090B` - The canvas.
2.  **Level 1 (Card/Sidebar):** `#18181B` - Primary containers.
3.  **Level 2 (Popovers/Modals):** `#27272A` - Overlays.

**Shadow Character:**
When shadows are necessary (e.g., floating modals), they are extremely large and soft: `0px 20px 50px rgba(0, 0, 0, 0.5)`. 

**Glassmorphism:**
Top navigation bars and active input containers use a `backdrop-filter: blur(12px)` with a semi-transparent background (`rgba(24, 24, 27, 0.8)`) to maintain context of the content beneath.

## Shapes

The shape language is consistently "Rounded," avoiding both the aggression of sharp corners and the playfulness of pills.

- **Small Components:** (Checkboxes, Tags) use `rounded-sm` (4px).
- **Standard Components:** (Buttons, Inputs, Cards) use `rounded-md` (8px).
- **Large Components:** (Modals, Feature Sections) use `rounded-lg` (16px).

The uniform application of these radii creates a cohesive, modern software feel that mirrors contemporary OS design.

## Components

### Buttons
- **Primary:** Gradient background (Indigo to Purple), white text, subtle 1px top-border highlight.
- **Secondary:** Surface-colored background with a 1px border (`#3F3F46`).
- **Ghost:** No background or border; shifts to a subtle gray hover state.

### Input Fields
Inputs are dark-filled (`#0F0F11`) with a 1px border. On focus, the border transitions to the Primary Indigo color with a 2px outer glow (0.2 opacity).

### Chips & Tags
Small, Geist-font labels with a low-contrast background. Active chips use a "glowing dot" indicator to the left of the text.

### Cards
Cards utilize a subtle `1px` solid border (`#27272A`). For "Active" or "Hovered" cards, the border should transition to a subtle gradient or a brighter neutral.

### Lists
List items should have a generous 12px vertical padding. Use a subtle separator line (`1px`, `#1F1F22`) between items, or no separator if the background alternates slightly.