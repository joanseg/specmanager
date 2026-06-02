---
id: wt-html-viewer-scroll-fix-008
featureId: feat-html-viewer-scroll-fix
stage: walkthrough
status: approved
stale: false
title: HTML viewer scroll fix — Phase viewer-parity walkthrough
dependsOn:
  - plan-html-viewer-scroll-fix-007
basedOn:
  plan-html-viewer-scroll-fix-007: 1
generatedBy: agent
version: 1
phase: viewer-parity
createdAt: '2026-06-02T13:34:55.719Z'
updatedAt: '2026-06-02T13:36:42.093Z'
---
# HTML viewer scroll fix — Phase viewer-parity walkthrough

This phase brings the board's sandboxed design-brief iframe to scroll parity with the markdown viewer. It kills two spurious wrapper-level scrollbars (vertical from a baseline descender gap, horizontal from wide content), removes the descender gap itself, and gives both surfaces an identical custom scrollbar (10px thumb, `--outline-variant` colour, `--outline` on hover). The whole change is board-UI-only: three coupled edits in `plugins/specmanager/ui/src/` (`tokens.css`, `styles.css`, `DocPanel.tsx`).

The bar this phase had to clear, lifted verbatim from the plan's exit test:

> Run the board (`npm run dev` in `plugins/specmanager/ui/`, or the installed plugin). Open this feature's approved design brief (`design/mockups.html`) in the drawer: it scrolls with a single vertical custom scrollbar (10px thumb on `--outline-variant`, hover `--outline`), shows **no** wrapper-level horizontal scrollbar and **no** descender gap, and the wide strip (Screen 4b, ~1760px) scrolls horizontally **inside** the iframe only — the drawer wrapper never grows a bar and never clips/rescales. Switch to a markdown doc in the same session: its `.md-surface` shows the same thumb width + colour, with no change to the 90% prose column. *(Verification is observational — the UI package ships no test runner.)*

This is the single phase of a single-phase feature, so there are no prior phases to assume. You only need a working SpecManager checkout with the iframe-parity commits landed.

## 0. Prerequisites

- **Node 20+** and a Chromium-based browser (Chrome/Edge) — the WebKit `::-webkit-scrollbar` rules render there; Firefox falls back to the `scrollbar-width`/`scrollbar-color` standards properties (thin grey thumb, no faux-padding border). Verify the per-pixel thumb width/colour in Chrome.
- The repo at the commit range for this phase. The five commits are:
  - `4939db4` — scrollbar tokens (`tokens.css`)
  - `322fdca` — `display: block` on the iframe (`styles.css`)
  - `62c4bdb` — scoped `.md-surface` scrollbar rules (`styles.css`)
  - `6c8fbec` — `srcDoc`-prepended `<style>` in `DocPanel.tsx`
  - `be1466a` — observational verification pass (all three files)
- This feature's **approved design brief** on disk, which doubles as the QA fixture: `.claude/specs/features/html-viewer-scroll-fix/design/mockups.html`. Screen 4b is the ~1760px wide strip that exercises the horizontal-overflow path.
- At least one **markdown doc** in the same session (any PRD/Plan in the board) for the parity check.

## 1. Build

The UI package ships no test runner — its `package.json` scripts are only `dev`, `build`, `preview`. So `build` is the type/compile gate for the `DocPanel.tsx` edit, not a behavioural test.

```bash
cd /Users/joan/Documents/projects/specmanager/plugins/specmanager/ui
npm install        # if you haven't already
npm run build      # tsc -p tsconfig.json && vite build
```

Expected: `tsc` reports **no type errors** and `vite build` finishes with a `✓ built in …` line and writes `dist/`. The `srcDoc={PREVIEW_STYLE + body}` change is plain string concatenation of two `string`s, so a clean `tsc` confirms the JSX edit type-checks.

If the build fails, stop here — fix the compile error before any observational check, since the iframe injection won't reflect your source otherwise.

## 2. Run the board

Two ways to get the board running so you can open the drawer.

**Fast path — dev server (recommended for this UI-only fix):**

```bash
cd /Users/joan/Documents/projects/specmanager/plugins/specmanager/ui
npm run dev        # Vite dev server, prints a http://127.0.0.1:<port>/ URL
```

Open the printed URL. Hot-reload picks up edits to `tokens.css` / `styles.css` instantly. Note: the iframe `<style>` injection in `DocPanel.tsx` is baked into `srcDoc` at render — if you edit `PREVIEW_STYLE`, close and reopen the design drawer (or hard-reload) to re-render the iframe.

**Installed-plugin path — if you want to verify the shipped plugin:**

SpecManager is itself a Claude Code plugin, so the full reinstall/reload dance applies:

```bash
claude plugin install ./plugins/specmanager --scope local
```

then in your `claude` session run `/reload-plugins`, and `/specmanager-board` to open the board.

Troubleshooting the reload path:
- **Board shows old CSS after reinstall** — the plugin serves the built `dist/`, not `src/`. Run `npm run build` *before* `claude plugin install`, then `/reload-plugins`.
- **`/reload-plugins` doesn't pick up the new build** — fully restart the `claude` session; the MCP process that boots the board server is long-lived and caches the loaded plugin.
- **Board port already in use** — a previous MCP-launched board server is still bound to `127.0.0.1`; kill the stale process or restart the session.

## 3. Phase viewer-parity exit checks

Each check is a single observation against the running board. Open the drawer by clicking the feature's design-stage card, or the markdown card for the markdown checks. (The drawer wrapper is `.panel__body`; the iframe is `.panel__preview--iframe`; the markdown surface is `.md-surface`.)

### 3.1 Tokens are present and resolve to the agreed values

```bash
grep -n "scrollbar" /Users/joan/Documents/projects/specmanager/plugins/specmanager/ui/src/tokens.css
```

Expected — four aliases, one new dimension value, no new colour:

```
--scrollbar-size: 10px;
--scrollbar-thumb: var(--outline-variant);
--scrollbar-thumb-hover: var(--outline);
--scrollbar-track: transparent;
```

`--outline-variant` resolves to `#464554` and `--outline` to `#908fa0` (both already in `tokens.css`), so the thumb is grey-violet and hover is the lighter grey. No ad-hoc colour entered the scale.

### 3.2 The iframe has no baseline descender gap (vertical-overflow fix)

Open the design brief at **normal width** (Screen 2, the after/normal-width screen). The iframe fills the drawer body edge to edge.

Expected: the drawer wrapper (`.panel__body`) shows **no** vertical scrollbar of its own. Scrolling happens with one scrollbar belonging to the iframe content. The fix is `display: block` on `.panel__preview--iframe` (styles.css ~L841) — an `<iframe>` defaults to `display: inline`, which reserves a few pixels of baseline descender space below the box and forces the wrapper to overflow. `block` removes that gap; `width/height: 100%`, `--design-preview-bg`, and the `--outline-variant` left border are unchanged.

To prove the root cause in DevTools: inspect `.panel__preview--iframe` and confirm `display: block` is the computed value; temporarily toggle it back to `inline` and watch the wrapper grow a vertical bar plus the few-pixel gap reappear.

### 3.3 No inner 8px margin (the second half of the bug)

Still on the normal-width brief, inspect the iframe document's `<body>`.

Expected: `body { margin: 0 }`. The injected `PREVIEW_STYLE` (DocPanel.tsx ~L40) prepends `html, body { margin: 0; }` to `srcDoc` ahead of the verbatim brief HTML. Without it, the iframe document's default 8px body margin fights the canvas and contributes to wrapper overflow. `display: block` (3.2) and this reset must both be present — either alone leaves a visible artifact.

### 3.4 Single vertical custom scrollbar on the iframe, correct width + colour

On the normal-width brief, scroll the content vertically (in Chrome).

Expected: exactly one vertical scrollbar, **inside the iframe**, with a **10px** thumb coloured `#464554` (`--outline-variant`), pill-shaped (`border-radius: 999px`), with a 2px `#0e0e10` faux-padding border (the iframe's own `--surface-container-lowest` background). On hover the thumb lightens to `#908fa0` (`--outline`). The `<style>` literals are inlined because a sandboxed iframe cannot read the parent `:root` custom properties — but they are the exact resolved token values, so the colours match the markdown surface pixel for pixel.

### 3.5 Wide strip (Screen 4b) scrolls horizontally INSIDE the iframe only

Scroll the brief down to **Screen 4b**, the ~1760px wide QA strip.

Expected:
- A **horizontal** scrollbar appears, and it belongs to the **iframe content**, styled identically (10px thumb, same colour — the `::-webkit-scrollbar` rule sets both `width` and `height` to 10px).
- The **drawer wrapper never grows a horizontal bar.** `.panel__preview--iframe` itself stays at `width: 100%` and does not widen.
- The wide content is **not clipped and not rescaled** — it keeps its honest in-iframe horizontal scroll. (Zoom/fit-to-width was explicitly out of scope.)

This is the check that proves overflow is contained by the iframe, not the parent. The sandboxed iframe is its own scroll container, so a 1760px child scrolls within it without touching the drawer layout.

### 3.6 Markdown `.md-surface` parity — same thumb, untouched prose column

Switch the drawer to a **markdown doc** (any PRD/Plan) in the same session and scroll it (in Chrome).

Expected:
- The `.md-surface` scrollbar shows the **same 10px thumb width and same colour** (`#464554`, hover `#908fa0`) as the iframe — both read the shared `--scrollbar-*` tokens.
- The thumb's 2px faux-padding border here tracks `--surface` (the colour the markdown surface sits on) rather than `#0e0e10`, since the two surfaces sit on different backgrounds — the border is cosmetic padding, not the thumb colour.
- The **90% prose column is unchanged** — `.md-surface .prose` / `.ProseMirror` still `width: 90%`, centred. Only scrollbar appearance was added.

Confirm the rule is **scoped**: `grep -n "scroll" styles.css` shows the scrollbar rules attached to `.md-surface…`, never a global `*` selector. A global rule would regress other board scroll containers — this is the one scope-sensitive spot in the phase.

## 4. Pass criteria

All required:

- [ ] `npm run build` passes clean (tsc + vite, no type errors).
- [ ] `tokens.css` defines `--scrollbar-size: 10px`, `--scrollbar-thumb: var(--outline-variant)`, `--scrollbar-thumb-hover: var(--outline)`, `--scrollbar-track: transparent`.
- [ ] Normal-width design brief: drawer wrapper shows **no** vertical scrollbar of its own; iframe has `display: block` and no baseline descender gap.
- [ ] Iframe `<body>` has `margin: 0` (injected reset present).
- [ ] Iframe vertical scrollbar: single, 10px thumb, `#464554`, hover `#908fa0`.
- [ ] Screen 4b wide strip: horizontal scroll stays **inside the iframe**; drawer wrapper grows **no** horizontal bar; content is neither clipped nor rescaled.
- [ ] Markdown `.md-surface`: same thumb width + colour as the iframe; 90% prose column unchanged.
- [ ] Scrollbar rules are scoped to `.md-surface` (no global `*` rule).

## 5. Deferred / Out of scope

These are expected, not bugs:

- **No zoom / fit-to-width / responsive rescale** for wide mockups — wide content keeps its honest in-iframe horizontal scroll (Screen 4b). This was a PRD non-goal.
- **No change to the verbatim brief HTML** — the mockup renders as-is; only a reset/scrollbar `<style>` is prepended ahead of the body.
- **No change to `MarkdownEditor` behaviour or the 90% prose column** — only scrollbar appearance was added.
- **No standalone `_qa` fixture feature** — the approved `mockups.html` (Screen 4b) is the fixture.
- **No `core`/MCP/backend/`api.ts` change, and no new colour value** — tokens reuse existing colours; this is a pure CSS/JSX board-UI change, so rollback is a clean revert of the five commits.

## 6. Troubleshooting

- **Thumb shows but with no rounded shape / wrong colour in Firefox** — Firefox only honours `scrollbar-width: thin` and `scrollbar-color`; the pill radius and 2px faux border are `::-webkit-` only. Verify exact appearance in Chrome.
- **Iframe scrollbar reverts to the browser default after editing `PREVIEW_STYLE`** — the style is baked into `srcDoc` at render. Close and reopen the design drawer (or hard-reload) to re-render.
- **Wrapper still grows a bar on the normal-width brief** — one of the two coupled fixes is missing. Confirm both `display: block` on `.panel__preview--iframe` *and* `html, body { margin: 0 }` in `PREVIEW_STYLE` are present; either alone leaves an artifact.
- **Other board scroll containers suddenly look different** — the scrollbar rule leaked to a global selector. It must stay scoped to `.md-surface`.
- **Installed plugin shows old styles** — you skipped `npm run build` before `claude plugin install`, or the cached MCP board process needs a session restart (see section 2).

## 7. What ships next (preview)

This is the only phase of this feature, so there is no next phase. Once every phase walkthrough is approved, the feature roll-up walkthrough (`/specmanager-walkthrough` with `phaseName="final"`) ties the work back to the PRD's success metrics. Any follow-up — e.g. a zoom/fit-to-width affordance for very wide briefs — would be a new feature, not a continuation of this one.
