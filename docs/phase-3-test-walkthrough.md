# Phase 3 — Test walkthrough

End-to-end test of the **edit / approve / stale UI** layer against a scratch repo.

> Exit criterion (from `docs/phase-tasks.md`):
> edit a PRD in the UI and save; approve; reopen and watch the Architecture card gain a stale badge; Generate stays disabled until the gate is met.

This walkthrough assumes Phases 1 and 2 already pass — if not, run `docs/phase-1-test-walkthrough.md` and `docs/phase-2-test-walkthrough.md` first.

## 0. Prerequisites

Same as Phase 1. The plugin must be installed in a scratch repo (see Phase 1 walkthrough §3). Both `server/dist/` and `ui/dist/` are committed in this repo, so no local build is required for consumers.

## 1. Build (contributors only)

```bash
cd plugins/specmanager/server
npm install
npm run build
npm run selftest-board    # Phase 2+3 REST + WS + PUT + status + gate

cd ../ui
npm install
npm run build
```

The board selftest output should include:

```
ok — PUT /api/documents/:id → 200
ok — PUT bumps version to 2
ok — PUT with stale baseVersion → 409
ok — POST status=approved → 200
ok — POST status=draft (reopen) → 200
ok — architecture gate is closed when PRD is draft
```

If any of these fail, **stop here** — the UI relies on them.

## 2. Scratch project setup

Identical to Phase 1 §2. Install the plugin into the scratch repo, restart Claude Code, then in the session:

```
/specmanager-init
/specmanager-feature Checkout corridor
```

Then create the PRD via MCP (Phase 1 §4.3):

> Use `create_document` to add a PRD draft for `feat-checkout-corridor` titled "Checkout corridor PRD" with body `# PRD\nDraft.`

And the Architecture doc with `dependsOn: ["prd-checkout-corridor-001"]` and `basedOn: { "prd-checkout-corridor-001": 1 }` (Phase 1 §4.4).

## 3. Open the board

```
/specmanager-board
```

The board opens at `http://127.0.0.1:4317`. You should see:

- One row labelled **Checkout corridor**.
- A **PRD** card and an **Architecture** card. Both show `draft · v1`.
- Plan, Build, and Walkthrough columns show locked / empty states (PRD not approved yet).

## 4. Phase 3 exit checks

### 4.1 Edit + save a draft

1. Click the **PRD** card. The detail panel slides in from the right.
2. The CodeMirror editor shows `# PRD\nDraft.`. Status badge: `draft`. Save button: `Saved`.
3. Type below the existing body, e.g. `\n\n## Goals\n- Reduce checkout drop-off.`
4. The Save button now reads `Save` (dirty indicator).
5. Click **Save**. The button flickers to `Saving…`, then `Saved`, and an "ok" banner shows `Saved · now v2`.

Verify on disk:

```bash
grep "Reduce checkout drop-off" "$SCRATCH/.claude/specs/features/checkout-corridor/prd/prd.md"
sed -n '1,15p' "$SCRATCH/.claude/specs/features/checkout-corridor/prd/prd.md"
```

The frontmatter should show `version: 2`.

### 4.2 Optimistic concurrency

1. Keep the panel open. From a shell, append to the file directly:

   ```bash
   echo "\n<!-- touched externally -->" >> "$SCRATCH/.claude/specs/features/checkout-corridor/prd/prd.md"
   ```

2. The board pulses with a `file.changed` event (header right side).
3. Back in the panel, edit the body again and click **Save**.
4. A warning banner appears:

   > File changed on disk (now v3). Your edits weren't saved. Reload from disk to merge by hand.

5. Click **Reload from disk**. The editor refreshes to v3 with the external content visible.

### 4.3 Approve the PRD

1. With the PRD panel open and saved, click **Approve**. The badge flips to `approved`. The editor becomes read-only (light gutter, no caret).
2. Close the panel (× or Esc). On the board:
   - PRD card: `approved` badge in green.
   - **Plan** column previously locked is now an empty "Generate" cell showing the slash command `/specmanager-plan` (click it to copy to clipboard).

Verify on disk:

```bash
grep "^status:" "$SCRATCH/.claude/specs/features/checkout-corridor/prd/prd.md"
# → status: approved
```

### 4.4 Reopen the PRD → Architecture flips to stale

1. Click the PRD card again. Click **Reopen**. Badge returns to `draft`.
2. Close the panel.
3. The **Architecture** card now shows the orange-bordered card with a `⚠ stale` badge — without a page reload (WS event).

Verify on disk:

```bash
grep "^stale:" "$SCRATCH/.claude/specs/features/checkout-corridor/architecture/architecture.md"
# → stale: true
```

### 4.5 "What changed" view on the stale doc

1. Click the **Architecture** card.
2. The panel shows a stale notice: *"This doc is stale. Dependencies have changed since it was based on them."*
3. The dependency list shows `prd-checkout-corridor-001 · based on v1 · now v3 drift` (or whatever the current PRD version is). The `prd-...` id is a button — click it to jump straight to the PRD panel.

### 4.6 Gate awareness

1. Open the **Architecture** doc. Click **Gate?**. An alert reports: *"Gate closed: prd stage is not approved"*.
2. Close the panel. Open the PRD, click **Approve**.
3. Re-open Architecture, click **Gate?** again — *"Gate is open."*

### 4.7 Generate buttons (gate-disabled affordance)

On the board, with PRD still in `draft`:

- The Plan column shows `Plan locked / 🔒 prior stage not approved` (because the *Architecture stage* gates on PRD, and Plan gates on Architecture).
- Approve PRD → Architecture's empty cell stays "Generate" with `/specmanager-architecture` (since architecture doc exists, it's not empty — but on a fresh feature with no architecture, this is where you'd copy the command).
- Approve Architecture → Plan column shows `/specmanager-plan` as a clickable monospace label that copies to clipboard.

Clipboard test:

1. Click the `/specmanager-plan` text on the Plan empty cell.
2. Paste somewhere — you should get the literal string `/specmanager-plan`.

### 4.8 Read-only lock on approved docs

1. Approve the PRD (again).
2. Open the PRD panel — the editor gutter is dimmed, typing does nothing, **Save** stays disabled even after clicking in the editor.
3. Click **Reopen** to edit again.

## 5. Pass criteria (all required)

- [ ] `npm run selftest-board` reports the new PUT / status / gate assertions.
- [ ] Section 4.1: PRD edits persist to disk, frontmatter `version: 2`.
- [ ] Section 4.2: editing after an external write fails with a 409 banner, "Reload from disk" recovers cleanly.
- [ ] Section 4.3: Approve updates `status: approved` on disk.
- [ ] Section 4.4: Reopen updates the on-disk PRD to `status: draft` AND the Architecture doc gains `stale: true` on disk AND the board updates live (no page reload).
- [ ] Section 4.5: stale notice lists dependencies with drift versions, and jump-to navigates to the upstream doc.
- [ ] Section 4.6: Gate? button reports the right state.
- [ ] Section 4.7: clicking an empty Generate cell copies the slash command to the clipboard.
- [ ] Section 4.8: approved docs are read-only in the editor.
- [ ] `git status` shows changes only inside `.claude/specs/` and `CLAUDE.md`.

## 6. Teardown

```
rm -rf "$SCRATCH"
```

## Troubleshooting

- **Panel doesn't open** — check the browser console; CodeMirror initializes lazily. If the JS bundle 404s, `ui/dist/` is missing — rebuild (`cd plugins/specmanager/ui && npm run build`).
- **`Save` does nothing** — open devtools → Network and inspect the PUT response. A 422 means the request body was rejected; a 409 means another writer beat you (use Reload).
- **Architecture didn't flip stale on PRD reopen** — confirm the architecture frontmatter has `dependsOn: ["prd-checkout-corridor-001"]` (the dep id must match exactly).
