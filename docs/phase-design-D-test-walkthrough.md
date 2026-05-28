# Design feature — Phase D test walkthrough

End-to-end test of the **board UI for the Design stage** that ships in Phase D of `docs/plan-design-feature.md` — the final phase. Phase D surfaces everything the earlier phases built: a Design column on the kanban board, an "optional" affordance for features without a brief, an HTML editor + sandboxed `<iframe>` preview in the doc panel, and a live pulse when DESIGN.md re-syncs.

> Exit criterion (from `docs/plan-design-feature.md`):
> after rebuilding `ui/dist` and reinstalling the plugin, the kanban board shows a Design column between Architecture and Plan. Features without a design doc show a clearly-styled "optional" empty cell with a clickable `/specmanager-design` affordance. Clicking a design doc opens the doc panel with a CodeMirror HTML editor on the left and an `<iframe srcdoc>` preview on the right. Triggering `POST /api/design/sync` (or shipping a feature) makes the board pulse with `design.synced` in the header.

Assumes Phases A, B, C of the Design feature already pass.

## 0. Prerequisites

- Phases A–C green on `main`.
- The plugin rebuilt with Phase D UI changes and reinstalled in your test repo.

## 1. Build (contributors only)

```bash
cd plugins/specmanager/server
npm install
npm run build
npm run selftest          # Phase 1 + A + B + C (unchanged in D)
npm run selftest-board    # unchanged in D

cd ../ui
npm install               # pulls @codemirror/lang-html (now an explicit dep)
npm run build             # produces ui/dist with the 6-column board + HTML preview
```

No new server assertions in Phase D — it's UI-only. The build must succeed and `ui/dist/` must regenerate (the JS bundle grows slightly from the HTML language mode).

## 2. Install + reload the plugin in your test repo

```
/plugin marketplace update specmanager
/plugin uninstall specmanager
/plugin install specmanager@specmanager
/reload-plugins
```

If `/reload-plugins` reports "1 error during load":

```bash
pkill -f '^claude$'
claude daemon stop
ps aux | grep mcp.js | grep -v grep   # kill stragglers (grep mcp.js, not specmanager — avoids the IDE false match)
lsof -nP -iTCP:4317 -sTCP:LISTEN
cd /path/to/your/test/repo
claude
```

## 3. Phase D exit checks

### 3.1 Six-column board

```
/specmanager-board
```

The board header row should now read (left → right): **Feature · PRD · Architecture · Design · Plan · Walkthroughs · Build**. The Design column sits between Architecture and Plan. (Build remains the rightmost column — Phase D inserts Design but doesn't reorder Build/Walkthroughs.)

### 3.2 Optional affordance for a feature with no design brief

Create a feature and approve only its PRD:

```
/specmanager-feature Design D demo
/specmanager-prd design-d-demo
```

Approve the PRD in the board panel. Now look at the **Design** cell for that row:

- It shows a **dotted-border** card labelled "Design" with an "optional" tag and a clickable `/specmanager-design` command (amber, distinct from the accent-blue "Generate" cells and from the grey "locked" cells).
- Click the `/specmanager-design` text → it copies to clipboard. Paste to confirm you get the literal `/specmanager-design`.

Before the PRD is approved, the same cell reads "Design · optional · PRD not approved" with no clickable command — it never shows a hard "locked" state, because design is genuinely optional.

### 3.3 Create a design brief → cell becomes a card

Generate a brief (Phase C):

```
/specmanager-design design-d-demo
```

Once the designer subagent persists the brief, the Design cell flips from the optional affordance to a normal doc card showing `draft` (and a `v1` badge). It's clickable like any other doc card.

### 3.4 HTML editor + sandboxed iframe preview

Click the **Design** card. The doc panel opens. Compared to a PRD/Architecture/Plan doc:

- The editor on the left is in **HTML mode** (CodeMirror `@codemirror/lang-html` — tag highlighting, attribute completion) instead of markdown mode.
- Tick the **Preview** toggle. The right pane is an **`<iframe>`** that renders the brief's HTML via `srcdoc`, sandboxed with `sandbox="allow-same-origin"` (no script execution, no external requests). Embedded `data:` URI screenshots render; any `file://` or external URL is blocked by the sandbox.
- The markdown preview path (marked) is NOT used for design docs — confirm by putting an HTML tag like `<strong>bold</strong>` in the editor; the preview shows actual bold text, not escaped markup.

Save flow, approve/reopen, and the chat panel all work the same as other docs (the design doc is a first-class versioned doc).

### 3.5 Approve the brief → Plan unlocks

With the brief in `draft`, the **Plan** cell shows a locked state (the UI's `priorStageApproved` now encodes the compound gate: architecture approved AND design approved-or-absent). Approve the design brief in the panel; once it's `approved` (and architecture is approved), the Plan cell flips to its "Generate" affordance.

This mirrors the server-side gate from Phase A — the UI is just reflecting it. To prove they agree, open the Plan empty cell's state before/after approving the design.

### 3.6 `design.synced` pulse

Trigger a DESIGN.md refresh:

```bash
curl -s -X POST -H "content-type: application/json" \
  -d '{"mode":"refresh"}' http://127.0.0.1:4317/api/design/sync >/dev/null
```

Watch the board header — the `· design.synced` pulse appears briefly in the meta line (same mechanism as every other live event). Shipping a feature (approving its final-phase walkthrough) produces the same pulse via the `feature.shipped` → auto-refresh chain from Phase B.

### 3.7 Live add across two tabs (regression)

Open the board in two tabs. In a Claude session, run `/specmanager-design` on a second feature (or create a design doc via `create_design_brief`). Both tabs' Design cells update live without a manual reload — the existing WS reload-on-event wiring covers the new column for free.

## 4. Pass criteria (all required)

- [ ] `cd ui && npm run build` succeeds; `ui/dist/` regenerated.
- [ ] §3.1: board shows a Design column between Architecture and Plan (6 stage columns + Feature label).
- [ ] §3.2: a feature with an approved PRD but no brief shows a dotted "optional" Design cell with a clickable, copyable `/specmanager-design`; before PRD approval it shows "optional · PRD not approved" with no command.
- [ ] §3.3: creating a brief turns the cell into a normal doc card.
- [ ] §3.4: clicking a design doc opens an HTML-mode editor + an `<iframe srcdoc sandbox>` preview (NOT the markdown renderer).
- [ ] §3.5: Plan cell is locked while the design brief is draft, unlocks once approved.
- [ ] §3.6: `POST /api/design/sync` makes the board pulse `design.synced`.
- [ ] No regression: PRD/Architecture/Plan docs still render with the markdown editor + marked preview.

## 5. The Design feature is now complete

With Phase D shipped, all four phases of `docs/plan-design-feature.md` are done:

- **A** — `design` stage in core, compound Plan gate.
- **B** — `./docs/DESIGN.md` lifecycle (init creates, feature-shipped refreshes).
- **C** — `/specmanager-design` + `designer` subagent + downstream grounding.
- **D** — board column, HTML editor/preview, live pulse.

End-to-end demo: `/specmanager-init` (creates DESIGN.md) → `/specmanager-feature` → `/specmanager-prd` → approve → `/specmanager-design` (optional, with screenshots) → approve → `/specmanager-architecture` → approve → `/specmanager-plan` (grounded in the brief) → `/specmanager-execute` per phase (builder honours the brief) → walkthroughs → on final approval, DESIGN.md auto-refreshes.

## 6. Troubleshooting

- **Design column missing after reinstall** — `ui/dist` wasn't rebuilt or the daemon is serving a stale bundle. Hard-refresh the browser (Cmd-Shift-R); if still missing, kill the daemon and relaunch Claude so the MCP server re-reads `ui/dist`.
- **Design doc opens with markdown editor, not HTML** — the `Editor` keys off `doc.stage === "design"`. If a design doc has the wrong `stage` in frontmatter (e.g. the hand-written-schema bug from earlier), it'll render as markdown. Check the frontmatter `stage:` field.
- **Iframe preview is blank** — the brief's HTML may reference external assets the sandbox blocks. Confirm screenshots are inlined as `data:` URIs (Phase C's designer prompt requires this), not `<img src="/path">`.
- **Plan cell unlocks even with a draft design** — the UI mirror in `priorStageApproved` may be stale; but the **server gate is authoritative** and will still refuse `/specmanager-plan`. If the UI and server disagree, trust the server and file a UI bug.
