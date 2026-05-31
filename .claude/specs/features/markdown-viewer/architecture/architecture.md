---
id: arch-markdown-viewer-004
featureId: feat-markdown-viewer
stage: architecture
status: approved
stale: false
title: Markdown viewer architecture
dependsOn:
  - prd-markdown-viewer-005
basedOn:
  prd-markdown-viewer-005: 3
generatedBy: human
version: 2
createdAt: '2026-05-29T12:38:27.703Z'
updatedAt: '2026-05-31T12:57:25.210Z'
---
## Summary

Replace the document panel's split *raw CodeMirror source + `marked` HTML preview* with a **single WYSIWYG markdown surface** plus a **formatting toolbar**, give the rendered prose a centered, comfortable reading column, and ship VS Code-quality table styling. This is a **frontend-only** change confined to `plugins/specmanager/ui/`. The body contract with the board server (markdown text in via `fetchDoc`, markdown text out via `putDoc` carrying `baseVersion`) is unchanged, so `@specmanager/core`, the MCP/board servers, save/approve/version/optimistic-concurrency/staleness, and the chat panel all keep working exactly as today. The design (HTML) stage is explicitly *not* WYSIWYG: per the PRD answers it drops its source-editor column and shows only its sandboxed iframe preview.

## Library decision (PRD open question #6)

The hard requirement is **clean round-trip to markdown** (toolbar output and typed markdown must serialize to identical bytes, no churned whitespace in the diff), plus a toolbar (bold/italic/heading and — per the expanded PRD answers — list/link/table/code-block) and good table editing. Three candidates were weighed against the existing CodeMirror 6 stack already pinned in `plugins/specmanager/ui/package.json`:

| Option | Round-trip fidelity | Toolbar/commands | Tables | Fit with repo | Verdict |
|---|---|---|---|---|---|
| **CodeMirror 6 + live decorations** (stay) | Excellent — the document *is* the markdown string; no serialization step, byte-clean by construction | Toolbar must hand-roll text transforms (wrap selection in `**`, prefix `#`) | No table widgets; renders as styled source | Already in deps; smallest change | Strong on round-trip, weak on "looks rendered" — headings/bold still show syntax markers |
| **Milkdown** (ProseMirror + remark) | Very good — `remark` serializer is the de-facto markdown round-trip standard (GFM tables, stable list markers) | First-class commands + ready toolbar plugins | GFM table plugin with editing | New dep tree (ProseMirror + remark + Milkdown), but purpose-built for *markdown WYSIWYG* | Best match to all three hard requirements |
| **TipTap** (ProseMirror) | Good for HTML; markdown is a secondary export — round-trip needs `tiptap-markdown` and is lossier on edge cases (nested lists, tables, escaping) | Excellent commands + toolbar | Table extension (editing-oriented) | New dep tree; markdown is not its native model | Great editor, but markdown is bolted on — risks the byte-clean diff goal |

**Recommendation: adopt Milkdown** (ProseMirror core + `remark`/`remark-gfm`). Reason: the PRD's success metric "round-trip integrity … byte-clean markdown with no spurious reformatting" is the binding constraint, and a remark-based pipeline is the only candidate whose *document model is markdown* while still rendering as true WYSIWYG (headings styled, bold bold, bullets as bullets) and offering a real GFM table editing experience. CodeMirror 6 cannot deliver "feels like reading a document, not editing source" without re-implementing a rendering layer; TipTap treats markdown as an export format, which is exactly where round-trip diffs leak.

**Trade-off accepted:** Milkdown/ProseMirror/remark is a heavier dependency than staying on CodeMirror, and the parse→edit→serialize cycle can *normalize* markdown on the very first save (e.g. unify `*`/`-` bullets, tidy table pipes). That normalization is bounded and deterministic; see Failure & edge cases for how we contain it. The current `marked` dependency becomes unnecessary for the markdown stages once Milkdown renders inline (kept only if any non-panel render path still uses it — grep before removal).

## Affected components

**Changed (existing files):**
- `plugins/specmanager/ui/src/DocPanel.tsx` — the central change. Remove the `marked.parse` preview path and the `showPreview` toggle for markdown stages; mount the new `MarkdownEditor` as the single surface. Keep all save/approve/reopen/gate/stale/conflict logic verbatim (`onSave`, `putDoc(doc.id, body, doc.version)`, the 409 → `reload` flow, `dirty`, `readOnly = doc?.status === "approved"`). For `isDesign`, render only the sandboxed iframe preview and drop the source-editor column (PRD answer to open question #1).
- `plugins/specmanager/ui/src/Editor.tsx` — retained *only* for the design (HTML) stage source path if still needed, or deleted if DocPanel no longer mounts a CodeMirror source view for any stage. Decision deferred to Plan after confirming no other caller (grep `from "./Editor"`).
- `plugins/specmanager/ui/src/styles.css` — add `.markdown table/th/td` rules (VS Code-preview styling, currently absent — grep confirms no `table` selector exists), add the prose reading-column max-width, the toolbar styles, and widen `.panel` (`width: min(60rem, 65vw)` → roughly `min(64rem, 68vw)`, "an inch wider" per PRD answer #5). Reuse existing `.markdown` h1/h2/h3/p/code/pre/blockquote rules and all `tokens.css` custom properties.
- `plugins/specmanager/ui/package.json` — add Milkdown + remark deps (see Dependencies).

**New files (under `plugins/specmanager/ui/src/`):**
- `MarkdownEditor.tsx` — the WYSIWYG surface wrapping a Milkdown editor instance; props mirror today's `Editor` (`value: string`, `readOnly: boolean`, `onChange: (next: string) => void`) so DocPanel's state wiring is unchanged. Owns the remark serialize/parse and the same external-value-sync + read-only-reconfigure effects pattern Editor.tsx already uses.
- `MarkdownToolbar.tsx` — the formatting bar: bold, italic, heading, plus list / link / table / code-block (expanded v1 scope per PRD answers). Buttons dispatch Milkdown commands against the current selection. Hidden/disabled when `readOnly`.

Untouched: `api.ts`, `types.ts`, `ChatPanel.tsx`, `BuildPanel.tsx`, `App.tsx`, all `server/` and `core/` code, `tokens.css`, `fonts.css`.

## Data model changes

**None.** Documents remain markdown files on disk; frontmatter stays authoritative; `manifest.json` stays a rebuildable cache. No schema, no migration. `DocFull.body` is still a markdown string (`types.ts` unchanged). The only behavioral subtlety is *content* normalization on first save (cosmetic, not structural) — addressed below, not a data-model change.

## Interfaces

No server endpoints, MCP tools, or events change. New UI component contracts only, matching the project's existing prop style (see `Editor.tsx`):

```ts
// MarkdownEditor.tsx — drop-in shape match with today's Editor props
interface MarkdownEditorProps {
  value: string;                      // markdown in
  readOnly: boolean;                  // approved docs render read-only
  onChange: (next: string) => void;   // emits serialized markdown
}

// MarkdownToolbar.tsx
type ToolbarAction =
  | "bold" | "italic" | "heading"
  | "bulletList" | "link" | "table" | "codeBlock";
interface MarkdownToolbarProps {
  onAction: (action: ToolbarAction) => void; // dispatches a Milkdown command
  disabled: boolean;                          // mirrors readOnly
}
```

DocPanel continues to call the existing, unchanged API surface: `fetchDoc`, `putDoc(id, body, baseVersion)`, `postDocStatus`, `fetchGate`, and the chat socket via `ChatPanel`.

## Sequence / flow

**Open (read):** card click → `DocPanel` `fetchDoc(docId)` → `setBody(d.body)` → `MarkdownEditor` parses the markdown (remark) into the ProseMirror doc → renders as styled prose in a centered max-width column. No preview toggle, no monospace. `readOnly` when `status === "approved"` → toolbar hidden.

**Edit:** user types or clicks a toolbar button → Milkdown mutates the ProseMirror state → on each change the remark serializer emits markdown → `onChange` → `setBody` → `dirty = body !== doc.body` flips, exactly as today. Typed markdown shortcuts (input rules: `**`, `# `, `- `) and toolbar commands both mutate the same ProseMirror state, so both paths converge on one serialized string (PRD goal #4).

**Save:** `Save` → `putDoc(doc.id, body, doc.version)`. On success `setDoc(res.doc)` / `setBody(res.doc.body)`. On 409 → existing conflict banner + `reload` from disk. Unchanged from current `onSave`.

**Approve / reopen / chat / stale:** all unchanged — `postDocStatus`, the stale `<section>` with `depVersions`, the `ChatPanel` column (`onDocChanged={reload}`), and the gate alert all operate on the same `doc`/`body` state.

## Layout & table specifics

- **Reading width (PRD goal #2, answer #5):** widen `.panel` modestly (≈ one inch: `min(60rem,65vw)` → `min(64rem,68vw)`) AND constrain the prose to a centered column at a measure of ~65–80ch (e.g. `max-width: 72ch; margin-inline: auto`) inside the editor/preview container. This satisfies the target without going full-screen.
- **Toolbar:** a slim bar above the surface, styled from `tokens.css` (`--surface-container`, `--space-*`, `--font-body`), echoing the existing `.panel__toolbar` pattern. The current `showPreview` checkbox is removed; `showChat` stays.
- **Tables (PRD goal #5):** add `.markdown table` (collapsed borders, `width:auto`, `--font-body`), `.markdown th` (header background via `--surface-container-high`, bold, left-aligned), `.markdown td/th` (1px `--outline-variant` borders, comfortable padding ≈ `var(--space-sm)`), matching VS Code preview. Milkdown's GFM table node reuses these `.markdown`-scoped rules so reading and editing look identical.

## Failure & edge cases

- **Round-trip / normalization churn (top risk):** parsing then re-serializing can normalize untouched markdown (bullet glyphs, table pipe padding, trailing spaces), producing a noisy diff on first save — directly threatening the PRD's "byte-clean" metric. Mitigation: configure `remark-stringify` to match the corpus's existing conventions (bullet `-`, fenced code, GFM tables, no reference links), and validate against real repo docs (`.claude/specs/features/**/prd/*.md`, plan/walkthrough files) in a Plan-phase round-trip check before wiring Save.
- **Malformed markdown with no raw escape hatch:** PRD answer #3 mandates WYSIWYG-only (no source mode). A pre-existing malformed table or HTML block could parse oddly. ProseMirror tolerates this by keeping unknown content as a raw/code node; if a doc fails to parse, fall back to read-only rendering and surface a non-blocking notice rather than silently dropping content.
- **Optimistic concurrency:** unchanged — `putDoc` still carries `doc.version`; a manual on-disk edit yields 409 and the existing reload path. The WYSIWYG layer never sees version logic.
- **Read-only approved docs:** Milkdown set to editable=false and toolbar hidden, mirroring the current `EditorState.readOnly` reconfigure pattern in `Editor.tsx`.
- **External reload (chat co-write, file watcher):** when `value` prop changes (the `reload` path), `MarkdownEditor` must replace the ProseMirror doc without firing a spurious `onChange` — same guard as `Editor.tsx`'s "if doc already equals value, skip dispatch".
- **Bundle size:** ProseMirror+Milkdown+remark is heavier than CodeMirror; acceptable for a localhost single-user tool, but verify Vite build still produces a working `dist/` (the `npm run build` = `tsc && vite build` path).

## Conventions used

- **Frontend-only, body-as-markdown contract** — load via `fetchDoc`, emit via `putDoc` with `baseVersion`; no `core`/server/data-model edits (CLAUDE.md pillar: every mutation flows through `core`; this feature adds no mutation).
- **Token-driven styling** — editor, toolbar, and tables read `tokens.css` custom properties only (as `Editor.tsx` already does via `EditorView.theme`), so they never drift from the board.
- **Prop shape parity** — `MarkdownEditor` mirrors `Editor`'s `{ value, readOnly, onChange }` so DocPanel state wiring is a drop-in swap.
- **Effect patterns** — reuse Editor.tsx's external-value-sync and read-only-reconfigure idioms (guard against echo, reconfigure without rebuild).
- **TypeScript strict, React 18, Vite, latest pinned APIs** — Milkdown/ProseMirror/remark pinned to current versions per CLAUDE.md "Latest APIs".
- **Bind/scope unchanged** — no server, port, or transport changes; `127.0.0.1` board server untouched.

## Open questions / risks

1. **Milkdown vs stay-on-CodeMirror final call.** This doc recommends Milkdown for round-trip + true WYSIWYG + table editing. If the planner judges the new dependency tree too heavy for the value, the fallback is CodeMirror 6 with live-rendered decorations (byte-clean by construction, but worse "feels rendered" and no table widgets). Needs a decision before Plan.

Answere: milkdown confirmed

3. **`Editor.tsx` fate.** Keep it for the design-stage HTML source view, or delete entirely if DocPanel mounts no CodeMirror for any stage? Confirm no other importer (`grep 'from "./Editor"'`) during Plan.
4. **`marked` removal.** Once Milkdown renders markdown inline, the `marked` dependency may be dead; confirm no other render path uses it before removing from `package.json`.

5. **Round-trip acceptance test.** There is no UI test framework today (server uses node `selftest-*` scripts). Recommend a Plan-phase task to add a lightweight round-trip assertion (parse→serialize equals input) over real repo docs, since "byte-clean diff" is a stated success metric with no current harness.

Answer: yes please do.

7. **Design-stage scope confirmation.** PRD answer #1 says remove the design HTML *editor* column and keep only the iframe preview — confirm the design stage should become read-only-preview (no inline HTML editing in the panel at all), which is a small behavior change to today's `isDesign` editor mount.

Answer: confirmed
