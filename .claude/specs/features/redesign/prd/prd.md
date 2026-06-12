---
id: prd-redesign-001
featureId: feat-redesign
stage: prd
status: approved
stale: false
title: Redesign PRD
dependsOn: []
basedOn: {}
generatedBy: human
version: 2
createdAt: '2026-05-28T11:26:54.969Z'
updatedAt: '2026-06-11T15:01:06.898Z'
---
> Status: draft · awaiting human review and approval in the board UI.

## Problem

SpecManager's board UI and document panel work, but they look provisional. The
current presentation layer is a single hand-rolled `styles.css` with ad-hoc CSS
variables (`--bg: #0d0e10`, a cyan `--accent: #7ad0ff`, system sans font stack)
and no shared design vocabulary. There is no token system, no typographic scale,
no consistent elevation model, and no responsive strategy — surfaces are flat
charcoal panels with 1px borders and generic spacing.

Because SpecManager dogfoods itself (it manages its own lifecycle on its own
board), the board is the product's storefront: it is the first and most
persistent thing a user sees. A polished, intentional UI signals that the tool
itself is trustworthy for orchestrating serious software work. The "Obsidian
Flux" design system — a True Dark, violet-indigo, tri-font, tonal-elevation
aesthetic — has been authored specifically as the target look. This feature
adopts it across the existing board and document panel.

This is a presentation-layer redesign. It does not change what the product does;
it changes how it looks and feels while doing it.

## Users & jobs-to-be-done

Single primary user (SpecManager is single-user, local-only):

- **The solo operator driving a project lifecycle.** Spends extended sessions on
  the localhost board moving features through PRD → Architecture → (Design) →
  Plan → Build → Walkthroughs. Jobs:
  - *Scan the board* and instantly read each feature's stage, status
    (draft/approved), version, and staleness without parsing visual noise.
  - *Track build progress* per phase (task counts, in-progress vs done) at a
    glance from the board.
  - *Review and edit a document* in a focused panel — read rendered markdown,
    edit raw source, approve, and reopen — without the chrome fighting the
    content.
  - *Work for long stretches* in a dark environment that reduces eye strain and
    cognitive load (the explicit emotional goal of Obsidian Flux: "calm
    control").

Secondary consideration: the redesigned UI is what `/specmanager-design`'s
designer subagent will be measured against for future features, so the board
itself should exemplify the design system it ships.

## Goals / non-goals

### Goals
- Re-skin the existing React board (`App.tsx`) and document panel
  (`DocPanel.tsx`, plus `BuildPanel.tsx`, `ChatPanel.tsx`, `Editor.tsx` theming)
  to the Obsidian Flux design system.
- Introduce a real token layer (CSS custom properties, or equivalent) sourced
  directly from `docs/temp/redesign/DESIGN.md`: True Dark surfaces, tonal
  elevation, violet-indigo primary, tri-font stack, 8px spatial grid, rounded
  shapes, glassmorphism on the top bar.
- Reorganize the board layout to match `board.png`: stage columns plus a
  dedicated right-hand BUILD panel rather than Build as an inline grid column.
- Rework the document panel to match `panel.png`: a stage/version header with
  Approve + Edit actions over a split view (raw markdown source left, rendered
  markdown right).
- Preserve every existing behavior and affordance (status/version badges,
  staleness, gate logic, optimistic-concurrency save, chat panel, copy-slash
  helpers, build/task editing).

### Non-goals
- **No changes to `@specmanager/core`** — data model, frontmatter
  source-of-truth, manifest cache, gate semantics, staleness graph all stay as
  they are.
- **No changes to MCP tool contracts** or the board server's HTTP/WebSocket API
  shapes (`/api/board`, `/api/doc`, task endpoints, chat sockets).
- **No new product capabilities** — no new stages, no new editing modes, no new
  data fields. Pure visual/interaction redesign.
- **No backend rewrite** — the Fastify static-serving path (`ui/dist` via
  `@fastify/static`) and the build pipeline (`tsc + vite build`) remain.
- Not changing the lifecycle gate quirks (e.g. Plan's compound gate, optional
  Design, walkthroughs gating on tasks done).

## Success metrics

Because this is single-user and local, metrics are acceptance-based and
qualitative rather than analytics-driven:

- **Token fidelity:** all colors, type styles, radii, and spacing in the
  redesigned UI trace to values in `docs/temp/redesign/DESIGN.md`. No
  surviving legacy tokens (`--bg: #0d0e10`, cyan `--accent: #7ad0ff`) and no
  hard-coded one-off hex values outside the token layer.
- **Board parity with `board.png`:** header reads "SpecManager" with a feature
  count and a "Rescan" action; stage columns render in order
  FEATURE · PRD · ARCHITECTURE · PLAN · WALKTHROUGHS; a right-hand BUILD panel
  shows per-phase task progress; per-stage cards show status badge
  (approved/draft) and version (v1, v2).
- **Panel parity with `panel.png`:** the document panel shows a stage/version
  header with Approve + Edit actions and a side-by-side split — raw markdown
  source on the left, rendered markdown on the right.
- **Behavior preserved:** a manual pass confirms approve/reopen, save with
  optimistic-concurrency conflict handling, staleness display, gate check,
  chat, copy-slash helpers, and task editing all still work.
- **Responsiveness:** layout honors the Obsidian Flux breakpoints (mobile
  < 640px, tablet 640–1024px, desktop > 1024px) without broken overflow.
- **No regressions:** `tsc -p` and `vite build` succeed; the built bundle still
  serves correctly from the board server.

## Constraints & assumptions

### Constraints
- **Stack is fixed** (per repo conventions): React 18 + Vite, TypeScript,
  CodeMirror 6 for the editor, `marked` for markdown rendering, Fastify static
  serving. The redesign must work within this stack — no framework swap.
- **Tokens come from `docs/temp/redesign/DESIGN.md`.** That file is the
  authoritative styling target (surface `#131315`, primary `#c0c1ff`,
  on-primary `#1000a9`, Hanken Grotesk / Inter / Geist, 8px grid, radii
  sm 4px / md 8px / lg 16px).
- **Fonts:** Hanken Grotesk, Inter, and Geist are not currently loaded. The
  redesign must source them (self-hosted or via a font CDN) and define
  sensible fallbacks; assume offline-friendly self-hosting is preferred for a
  local-only tool.
- **Markdown preview** is `marked`-rendered HTML injected via
  `dangerouslySetInnerHTML` (and a sandboxed iframe for HTML design briefs).
  Restyling the `.markdown` block must keep this rendering path; design-brief
  previews stay in their sandboxed iframe.
- **No auth, localhost-only** — no security surface changes.

### Assumptions
- The board column set in `board.png` (PRD · ARCHITECTURE · PLAN ·
  WALKTHROUGHS, with BUILD as a right-hand panel) is the desired layout.
  **Assumption:** the current standalone DESIGN column is folded out of the
  primary grid; the design stage still exists in core and is still openable as
  a document, but the mockup does not give it a dedicated column. (Flagged in
  Open questions.)
- "Rescan" in the header maps to the existing rescan/reload capability the board
  already exposes (the current footer "Last synced" + WebSocket reload). It is a
  relabel/repromotion of existing behavior, not a new endpoint.
- "Edit" in the panel header corresponds to the existing read-only-toggle
  behavior: approved docs are read-only; editing implies the doc is in (or moves
  to) draft. No new editing semantics are introduced.
- The split view in `panel.png` shows raw-left / rendered-right by default; the
  existing Preview/Chat toggles can remain as panel options.

### Dependencies
- Source design system: `docs/temp/redesign/DESIGN.md`.
- Reference mockups: `docs/temp/redesign/board.png`, `docs/temp/redesign/panel.png`.
- Existing UI source under `plugins/specmanager/ui/`.
- Relationship to canonical `docs/DESIGN.md` (see Open questions).

## High-level user flows

Bullet sketches only — not designs. The architect/designer owns the actual
layout and component spec.

- **Open the board (Obsidian Flux skin)**
  - User loads localhost board → True Dark canvas, glassmorphic top bar reading
    "SpecManager", feature count, and a Rescan action.
  - Stage columns (PRD · ARCHITECTURE · PLAN · WALKTHROUGHS) render as tonal
    cards; each card carries an approved/draft status chip and a version label
    (v1, v2) in Geist mono; stale cards keep their stale affordance restyled to
    the new palette.
  - A right-hand BUILD panel shows per-phase task progress (done/total, in
    progress) using the redesigned progress bar.

- **Scan a feature's state**
  - User reads a row left-to-right; tonal elevation and the violet primary draw
    the eye to active/approved states; empty/locked/optional cells use the new
    dashed/dotted treatments re-skinned to Obsidian Flux.

- **Open and review a document**
  - User clicks a stage card → document panel opens with a stage/version header
    and Approve + Edit actions.
  - Split view: raw markdown source (CodeMirror, restyled to the Geist mono +
    Obsidian Flux theme) on the left; rendered markdown (restyled `.markdown`)
    on the right.
  - User edits (when draft), Saves (optimistic-concurrency banners restyled),
    Approves, or Reopens — all existing flows, new skin.

- **Track and edit build/tasks**
  - From the BUILD panel, user expands phases, flips task status pills, and
    edits artifacts — same interactions, Obsidian Flux components (status pills,
    chips with glowing-dot active indicator, inputs with focus glow).

- **Chat about a doc (unchanged behavior)**
  - The chat column remains available as a panel option; messages, streaming
    caret, and tool lines are re-skinned to the new palette.

## Acceptance criteria

- [ ] A token layer derived from `docs/temp/redesign/DESIGN.md` replaces the
      legacy `:root` variables in `ui/src/styles.css`; legacy cyan accent and
      `#0d0e10` background are gone.
- [ ] Hanken Grotesk (headlines), Inter (body/UI), and Geist (labels/mono +
      code/editor) are loaded with fallbacks and applied per the typographic
      roles in the design system.
- [ ] Board header matches `board.png`: title, feature count, Rescan action,
      glassmorphic treatment.
- [ ] Board columns render in the `board.png` order with BUILD as a right-hand
      panel; per-stage cards show status badge + version.
- [ ] Document panel matches `panel.png`: stage/version header, Approve + Edit
      actions, split raw-source / rendered-markdown view.
- [ ] Surfaces use tonal elevation (no drop shadows except large-soft on
      floating overlays); radii use sm/md/lg = 4/8/16px; spacing follows the 8px
      grid.
- [ ] Responsive behavior holds at the three documented breakpoints.
- [ ] All pre-existing behaviors verified working (approve/reopen, save +
      conflict, staleness, gate check, chat, copy-slash, task editing).
- [ ] `tsc` + `vite build` succeed and the bundle serves from the board server.

## Open questions

1. **Canonical `docs/DESIGN.md` vs Obsidian Flux.** A fresh `docs/DESIGN.md` was
   just generated by `specmanager-init` and is currently an `alpha`,
   auto-inferred stub (placeholder primary `#1A1C1E`, system-ui font, "No UI
   source directory detected"). "Obsidian Flux"
   (`docs/temp/redesign/DESIGN.md`) is the *target*. **Should this feature
   replace the managed block of `docs/DESIGN.md` with Obsidian Flux as part of
   the redesign**, so the project's canonical design source-of-truth matches
   what ships? Or keep them separate and reconcile later via a re-sync? This is
   a scope decision for the user. (Note the managed-marker rule: only the region
   between `<!-- specmanager:design:start -->` / `:end` is machine-owned.)

   ANSWER: keep them separate and reconcile later via a re-sync
3. **Design column fate.** `board.png` does not show a standalone DESIGN column.
   Should the DESIGN stage be (a) dropped from the primary grid but still
   openable, (b) merged into another column's affordance, or (c) kept as a
   column despite the mockup? Core keeps the design stage regardless; this is
   purely a board-layout question.

   ANSWER: kept as a column despite the mockup
5. **"Rescan" semantics.** Confirm Rescan = existing reload/rescan, not a new
   server endpoint. If a true filesystem rescan is desired distinct from the
   WebSocket-driven reload, that would touch the server (out of current scope).

    ANSWER: there is no new server endpoint.
7. **Font delivery.** Self-host the tri-font stack (offline-friendly, preferred
   for a local tool) vs. load from a CDN? Affects the build and bundle.

   ANSWER: Self-host the tri-font stack 
9. **Scope of glassmorphism / micro-interactions.** The design system calls for
   backdrop-blur top bars, focus glows, glowing-dot active chips, and subtle
   scale/glow micro-interactions. Confirm how far to take motion vs. keeping the
   first pass static-but-on-system.

   Answere: implement the montion desired.
