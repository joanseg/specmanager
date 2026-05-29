---
id: prd-markdown-viewer-005
featureId: feat-markdown-viewer
stage: prd
status: draft
stale: false
title: Markdown viewer PRD
dependsOn: []
basedOn: {}
generatedBy: agent
version: 1
createdAt: '2026-05-29T11:41:31.968Z'
updatedAt: '2026-05-29T11:41:31.968Z'
---
## Problem

The SpecManager board's document panel (`DocPanel.tsx`) currently splits markdown editing into **two distinct surfaces shown side by side**: a raw CodeMirror 6 markdown editor (`Editor.tsx`, monospace font, line numbers, syntax-highlighted source) on the left, and a `marked`-rendered HTML preview on the right, toggled by a "Preview" checkbox.

This split creates real friction for the one person who lives in these documents:

- **Two mental models for one document.** The author reads finished prose in the preview but edits raw `##`, `-`, `**bold**` syntax in the monospace pane. Their eyes ping-pong between the two to confirm a change landed.
- **Half the panel is "wasted" on source.** With Preview on, the panel's `1fr / 1fr` split gives the editor and the preview ~30rem each (the panel itself is `min(60rem, 65vw)`). Neither pane gets a comfortable reading width for long-form prose.
- **Cramped reading width even at full panel.** PRDs, Architecture docs, and Plans are long-form prose. At ~30rem the rendered column wraps too tightly to read comfortably, and turning Preview off to widen it loses the rendering entirely.

The net effect: the documents that are the *source of truth* for the whole lifecycle are uncomfortable to read and edit. This is a UI/UX quality problem, not a data or correctness problem.

## Users & jobs-to-be-done

SpecManager is **single-user, fully local** (one author per project, no collaboration, no auth). The PRD is written for that one user wearing two hats:

- **As reader / reviewer:** "I want to read a PRD or Plan as finished prose at a comfortable width so I can judge whether it's right and decide to approve it." Reading dominates editing time — most panel opens are to review, not to type.
- **As author / editor:** "I want to fix a sentence, add a bullet, or restructure a heading and immediately see it as it will render — without translating markdown syntax in my head or hunting across two panes."

## Goals

1. **Single WYSIWYG editing surface.** Replace the split raw-editor + rendered-preview with one component where the text the user edits is already rendered (headings look like headings, bullets like bullets, bold is bold). Editing and reading happen in the same place.
2. **Comfortable reading width.** When the panel opens, the markdown document gets a prose column wide enough for long-form readability (target ~65–80 characters per line) rather than the current ~30rem split column.
3. **No loss of existing capability.** Save, approve/reopen, version display, optimistic-concurrency conflict handling, stale badges, and the chat panel all keep working exactly as today.

## Non-goals

- **Not changing the data model or persistence.** Documents remain markdown files on disk; frontmatter stays authoritative; `manifest.json` stays a rebuildable cache. The body is still markdown round-tripped through `read_document` / `write_document`.
- **Not touching the design-brief (HTML) stage.** Design briefs are authored as HTML and rendered in a sandboxed iframe (`isDesign` path). This feature is scoped to the **markdown** stages (PRD, Architecture, Plan, Walkthrough). The HTML iframe path stays as-is. *(Assumption — see Open Questions.)*
- **Not building a rich toolbar / formatting UI.** No bold/italic/heading button bar is required for v1. Markdown shortcuts and direct typing are sufficient.
- **Not adding collaborative editing, comments, or track-changes.** Out of scope; single-user local tool.
- **Not changing gate logic, approval flow, or any `core` behavior.** This is a frontend-only change in `plugins/specmanager/ui/`.
- **Not redesigning the rest of the board** (cards, columns, header). Only the document panel's editing/reading surface and width.

## Success metrics

Single-user local tool, so metrics are qualitative / observational rather than analytics-driven:

- **No mode toggle needed to read a rendered doc.** The "Preview" checkbox is gone (or repurposed); opening a doc shows rendered prose immediately.
- **Reading width hits target.** Rendered prose lines measure roughly 65–80 characters at the default panel width on a typical laptop screen.
- **Round-trip integrity.** A document opened, lightly edited, and saved produces byte-clean markdown with no spurious reformatting of untouched content (no churned whitespace, reordered list markers, or escaped characters in the diff).
- **No regression** in save, conflict (409) handling, approve/reopen, stale display, or chat across the markdown stages.
- **The author reports the panel feels like reading a document, not editing source.**

## Constraints & assumptions

**Constraints**
- Frontend stack is fixed: React 18 + Vite, in `plugins/specmanager/ui/`. Styling uses the existing CSS custom-property token system (`tokens.css`, `styles.css`) — the editor must read the same tokens so it never drifts from the rest of the UI (today's `Editor.tsx` already does this).
- The body contract with the server is **markdown text**: the editor must load markdown via `fetchDoc`, emit markdown to `putDoc`, and preserve the optimistic-concurrency `version` round-trip. Whatever WYSIWYG library is chosen must serialize cleanly back to markdown.
- Read-only state must be honored: approved docs render read-only until reopened (today's `readOnly` flag).
- The chat panel and stale/dependency sections coexist in the same panel and must keep working.

**Assumptions** (flagged for review)
- The WYSIWYG surface applies to the four **markdown** stages only; the **design** stage keeps its HTML-in-iframe rendering. (Open question below.)
- "Wide enough" means widening the prose column and/or the panel so a single rendered column reaches comfortable reading width — not necessarily widening the whole panel to full screen. The architect/designer will choose the exact mechanism (wider panel vs. centered max-width prose column vs. removing the second pane and letting one column breathe).
- A markdown source ("escape hatch") view is **nice-to-have, not required** for v1; many WYSIWYG markdown editors keep raw syntax editable inline, which may make a separate source mode unnecessary.
- Latest library APIs per project convention (e.g. CodeMirror 6 already in use, or a markdown-native WYSIWYG such as TipTap/Milkdown/ProseMirror) — the specific choice is an Architecture decision, not a PRD decision.

## High-level user flows

**Read a document**
- User clicks a card → document panel opens.
- The body appears as **rendered prose** at comfortable reading width — no toggle, no monospace source.
- User reads top-to-bottom; stale badge and dependency drift (if any) show as today; user can jump to a dependency.

**Edit a document**
- User clicks into the prose and types; the text stays rendered as they edit (a heading stays styled as a heading, a new `-` bullet renders as a bullet).
- Panel goes "dirty"; **Save** writes markdown back via `putDoc` carrying the base `version`.
- On a version mismatch, the existing 409 conflict banner + "Reload from disk" path is unchanged.

**Approve / reopen**
- Approved docs open read-only in the same rendered surface (no editing).
- "Edit" reopens as draft → surface becomes editable again. Unchanged from today.

**Chat alongside**
- With Chat enabled, the chat column sits beside the document surface as today; document edits and chat-driven reloads continue to work.

## Open questions

1. **Design stage:** Confirm the HTML design-brief stage is explicitly out of scope and keeps its sandboxed iframe rendering. (Assumed yes.)
2. **Raw-markdown escape hatch:** Do we want a "view/edit raw source" mode retained for power edits (e.g. fixing a malformed table), or is the WYSIWYG surface the only editing surface in v1? (Assumed: WYSIWYG only; raw mode is nice-to-have.)
3. **Width mechanism:** Is the intent to widen the panel itself, or to keep the panel width and give the single prose column a centered max-width? Either satisfies the reading-width goal — flagging it as a design decision, not blocking the PRD.
4. **Library choice:** Stay on CodeMirror 6 (with live preview styling) or adopt a markdown-native WYSIWYG editor (TipTap/Milkdown/ProseMirror)? This is an Architecture-stage decision; noted here only because it affects round-trip-to-markdown fidelity, which is a hard requirement.
