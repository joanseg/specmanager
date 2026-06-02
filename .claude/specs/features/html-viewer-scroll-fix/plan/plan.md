---
id: plan-html-viewer-scroll-fix-007
featureId: feat-html-viewer-scroll-fix
stage: plan
status: approved
stale: false
title: HTML viewer scroll fix plan
dependsOn:
  - arch-html-viewer-scroll-fix-007
  - design-html-viewer-scroll-fix-002
basedOn:
  arch-html-viewer-scroll-fix-007: 1
  design-html-viewer-scroll-fix-002: 2
generatedBy: agent
version: 1
createdAt: '2026-06-02T13:19:48.523Z'
updatedAt: '2026-06-02T13:25:08.880Z'
---
## Overview

Bring the board's sandboxed design-brief iframe to scroll parity with the markdown viewer: kill the spurious wrapper-level scrollbars (vertical + horizontal), remove the baseline descender gap, and give both surfaces an identical custom scrollbar (width + colour). The work is board-UI-only and lands in three coupled CSS-and-small-JSX edits inside `plugins/specmanager/ui/src/` — `tokens.css`, `styles.css`, and `DocPanel.tsx`. None of the three changes is independently demoable: the `display: block` fix, the `srcDoc` `<style>` injection, and the shared scrollbar tokens only become verifiable together, against the wide QA fixture baked into the approved mockups. There is therefore no real mid-build pause-and-test boundary, so this is a single phase — `viewer-parity` — that the user verifies once at the end by opening the design brief and the markdown brief side by side. The design brief's four stacked screens (Screen 1 before/bug, Screen 2 after/normal-width, Screen 3 markdown reference, Screen 4 + 4b wide QA fixture) drive the task sequence directly.

**Scale:** `1` trivial · `2` small · `3` moderate · `5` substantial · `8` large · `13`/`21` epic.

*Every task below is decomposed to **≤3 points**. This is a genuinely small fix — nothing needed splitting from a 5/8; the tasks are naturally trivial-to-moderate. The phase subtotal reflects the real work, not padding.*

| Phase | Theme | Points |
|-------|-------|--------|
| viewer-parity | Iframe scroll parity with the markdown viewer | 9 |
| **Total** | | **9** |

---

## Phase viewer-parity — Iframe scroll parity with the markdown viewer

**Exit test:** Run the board (`npm run dev` in `plugins/specmanager/ui/`, or the installed plugin). Open this feature's approved design brief (`design/mockups.html`) in the drawer: it scrolls with a single vertical custom scrollbar (10px thumb on `--outline-variant`, hover `--outline`), shows **no** wrapper-level horizontal scrollbar and **no** descender gap, and the wide strip (Screen 4b, ~1760px) scrolls horizontally **inside** the iframe only — the drawer wrapper never grows a bar and never clips/rescales. Switch to a markdown doc in the same session: its `.md-surface` shows the same thumb width + colour, with no change to the 90% prose column. *(Verification is observational — the UI package ships no test runner, matching the PRD's observational success metrics.)*

| #   | Task | Pts | Notes |
|-----|------|-----|-------|
| 1.1 | Add shared scrollbar tokens to `tokens.css` | 1 | Pin the brief's proposed tokens: `--scrollbar-size: 10px`, `--scrollbar-thumb: var(--outline-variant)`, `--scrollbar-thumb-hover: var(--outline)`, `--scrollbar-track: transparent`. Resolves design open-Q2/Q3: 10px is the agreed width (one new dimension value; colours reuse existing tokens — no new colour). |
| 1.2 | Add `display: block` to `.panel__preview--iframe` in `styles.css` | 1 | At ~L817–824. Kills the baseline descender gap that forces wrapper overflow (Architecture root-cause #1, design Screen 1→2). Keep `width/height: 100%`, `--design-preview-bg`, and the `--outline-variant` left border untouched. |
| 1.3 | Add a scoped `.scroll-styled` utility in `styles.css` and apply it to `.md-surface` | 2 | Token-driven rule: `scrollbar-width: thin` + `scrollbar-color` for standards engines, `::-webkit-scrollbar` / `-thumb` / `-thumb:hover` for WebKit. Scope to the named surface — never a global `*` rule (Architecture failure case). Markdown thumb border tracks `--surface`; no change to the 90% column (design Screen 3). |
| 1.4 | Inject `srcDoc`-prepended `<style>` reset + scrollbar rules in `DocPanel.tsx` | 3 | At the `isDesign` branch (~L287–293). Compose `PREVIEW_STYLE + body` into `srcDoc`, carrying `html,body{margin:0}` plus the matching custom-scrollbar rules (iframe thumb border tracks `--surface-container-lowest`). Parent CSS cannot reach inside a sandboxed iframe, so this is the only parity path. Resolves design open-Q4: srcDoc-prepend, not an `onLoad` writer. Keep `sandbox="allow-same-origin"`; do not inline into the main document. |
| 1.5 | Verify against the wide QA fixture and confirm no markdown regression | 2 | Resolves design open-Q5: the approved `mockups.html` (Screen 4b, ~1760px strip) **is** the fixture — no separate `_qa` feature is created. Open it in the live viewer: confirm horizontal scroll stays inside the iframe, wrapper shows no bar, no clip/rescale; confirm normal-width briefs show vertical-only; confirm `.md-surface` thumb matches. Capture before/after observation. |

---

## Risk & sequencing notes

- **Land tokens first (1.1).** Both the `styles.css` utility (1.3) and the injected iframe `<style>` (1.4) reference `--scrollbar-*`; without them the rules render with no thumb styling. 1.1 blocks 1.3 and 1.4.
- **1.2 and 1.4 are the actual bug fix and must ship together.** `display: block` (1.2) removes the descender-gap overflow; the `html,body{margin:0}` reset (1.4) removes the inner 8px margin. Either alone leaves a visible artifact, so the exit test only passes once both land.
- **Scope-creep risk on 1.3.** The shared selector must stay scoped to the two named surfaces. A broad selector would regress unrelated board scroll containers — this is the one rollback-tricky spot, mitigated by scoping (no `*` rule).
- **No backend/`core`/MCP risk.** Confined to `plugins/specmanager/ui/src/`; nothing here touches stored content, frontmatter, or the servers, so rollback is a pure CSS/JSX revert.

## Test strategy

The UI package has no test runner (`package.json` scripts are only `dev`/`build`/`preview`), so per repo convention verification is observational and lives as its own task (1.5), run at the phase exit rather than per-task. The 1.5 task uses the approved mockups' Screen 4b wide strip as the live fixture, plus a normal-width brief and a markdown doc for the parity check. `npm run build` (`tsc` + `vite build`) should pass clean as a type/compile gate for the `DocPanel.tsx` edit.

## Out of scope

- Changing the verbatim HTML of any design brief (PRD non-goal) — the mockups render as-is; we only inject a reset/scrollbar `<style>` ahead of the body.
- Any change to `MarkdownEditor` behaviour or the `.md-surface` 90% prose column — only scrollbar appearance is added (PRD non-goal, design Screen 3 note).
- Zoom / fit-to-width / responsive rescale for wide mockups — wide content keeps its honest in-iframe horizontal scroll (PRD non-goal, design Screen 4).
- New ad-hoc colours, new stylesheets, or a standalone `_qa` fixture feature — tokens reuse existing colours and the approved mockup doubles as the fixture.
- Any `core`, MCP-server, backend, `api.ts`, or `tokens.css` colour-value change beyond adding the three scrollbar aliases.

## Notes on estimates

Points here are relative complexity, not clock time — calibrate them to your own velocity after the first phase ships (and since this feature is a single phase, that calibration is mostly for the next feature). Every task is ≤3 points; nothing in this fix was large enough to need splitting down from a 5 or 8, so the phase subtotal of 9 reflects genuinely small work rather than a granularity rewrite. The observational verification (1.5) is carried as its own task rather than folded into the code edits, so "installable & testable" stays a real exit gate — the phase isn't done until the wide-fixture and markdown-parity checks pass in the running board.
