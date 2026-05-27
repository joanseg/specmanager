# Design feature — Phase A test walkthrough

End-to-end test of the **core schema + compound Plan gate** layer that ships in Phase A of `docs/plan-design-feature.md`. Phase A is plumbing — no UI, no slash command, no DESIGN.md generator yet. The exit criterion is purely contractual:

> with the plugin re-installed after this phase, `npm run selftest` and `npm run selftest-board` both pass, and the new selftest cases prove (a) the `design` stage round-trips through `create_document`/`list_documents`/`read_document`, and (b) the Plan gate refuses until the design doc is approved when one exists, and stays open when none exists.

Assumes Phases 1–6 of SpecManager already pass and the Design plan's Phase A code is on disk.

## 0. Prerequisites

Same as Phase 6:

- macOS or Linux, Node ≥ 20.
- The plugin repo with Phase A changes (this commit) on `main`.
- (Optional) a scratch repo if you want to run the slash-command flow manually — but Phase A has no slash command yet, so the value of a scratch repo is mostly to inspect the on-disk file layout.

## 1. Build (contributors only)

```bash
cd plugins/specmanager/server
npm install
npm run build
npm run selftest          # Phase 1 core flow
npm run selftest-board    # Phase 2–6 REST + WS + Phase A design assertions
npm run smoke-mcp         # MCP handshake + tools list

cd ../ui
npm install
npm run build             # no UI changes yet, but a clean rebuild verifies UI types still type-check
```

`selftest-board` output should include these **new** lines (the Phase A additions):

```
ok — architecture starts draft
ok — plan gate closed when architecture draft (no design)
ok — plan gate reason names architecture
ok — plan gate open when architecture approved + no design
ok — design gate opens when PRD approved
ok — design doc lands at design/brief.html
ok — plan gate closed when design is draft (design exists → must approve)
ok — plan gate reason names design when design is the blocker
ok — plan gate open when architecture + design both approved
ok — design doc appears in /api/board features[].documents
ok — GET /api/documents/:id returns design doc
ok — design doc round-trips stage field
ok — design doc round-trips body
```

If any of these fail, **stop here** — Phase B builds on every one of them.

## 2. Install + reload the plugin in your test repo

Standard reinstall dance — Phase A changes the MCP server's compiled JS and the on-disk feature directory layout, so consumers need a fresh install.

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
ps aux | grep specmanager | grep -v grep   # kill any stale child mcp.js
lsof -nP -iTCP:4317 -sTCP:LISTEN
cd /path/to/your/test/repo
claude
```

Confirm the right MCP is up:

```bash
ps aux | grep specmanager | grep -v grep
# expect exactly one node …/cache/specmanager/specmanager/<commit>/server/dist/mcp.js
```

## 3. Phase A exit checks

### 3.1 Open the board (no functional change, but confirms reinstall worked)

```
/specmanager-board
```

The board opens at `http://127.0.0.1:4317`. **There is no new "Design" column yet** — that ships in Phase D. The five-column layout is unchanged. This is intentional; Phase A is plumbing.

### 3.2 Design stage round-trips through MCP

In your Claude session, bootstrap a feature with an approved PRD:

```
/specmanager-init
/specmanager-feature Design A demo
/specmanager-prd design-a-demo
```

Approve the PRD (open it in the board, click Approve).

Then ask Claude:

> Use the `create_document` MCP tool to create a **design** doc for `feat-design-a-demo` titled "Design A demo brief", body `<h1>Brief</h1><p>Draft.</p>`. No filename — let it default.

Verify on disk:

```bash
ls "$SCRATCH/.claude/specs/features/design-a-demo/design/"
# → brief.html
head -16 "$SCRATCH/.claude/specs/features/design-a-demo/design/brief.html"
```

Frontmatter should show:

```yaml
stage: design
status: draft
title: Design A demo brief
version: 1
generatedBy: human
```

Verify the doc appears in `/api/board`:

```bash
curl -s http://127.0.0.1:4317/api/board | jq '.features[] | select(.id=="feat-design-a-demo") | .documents'
```

You should see two entries — one with `"stage": "prd"`, one with `"stage": "design"`.

### 3.3 Compound Plan gate — all four states

The plan gate is now a compound expression. Phase A wires it; the selftest above covers the matrix automatically, but you can also exercise it by hand to feel the failure messages a user would actually see.

**State 1: architecture draft, no design.**

Don't approve the architecture yet. Ask Claude:

> Use the `check_gate` MCP tool with `featureId: "feat-design-a-demo"`, `stage: "plan"`.

Expected: `{ ok: false, reason: "architecture stage is not approved" }`. (Same as before Phase A.)

Now draft architecture: ask Claude:

> Use `create_document` to create an **architecture** draft for `feat-design-a-demo` titled "Design A demo architecture", body `# Arch\nDraft.`.

The gate still says architecture not approved, because the architecture doc is `draft`.

**State 2: architecture approved, no design.**

Delete the design doc you created in §3.2 so this state exists cleanly:

```bash
rm "$SCRATCH/.claude/specs/features/design-a-demo/design/brief.html"
rmdir "$SCRATCH/.claude/specs/features/design-a-demo/design"  # optional
```

Approve the architecture via the board panel. Then re-ask Claude to `check_gate(stage: "plan")`.

Expected: `{ ok: true }`. The plan gate is open — design is optional and absent.

**State 3: architecture approved, design draft.**

Re-create the design doc (same `create_document` call as §3.2 but body `<h1>Brief v2</h1>`). Then `check_gate(stage: "plan")`.

Expected: `{ ok: false, reason: "design stage is not approved (design is optional — delete the draft to skip)" }`.

This is the **new behaviour** Phase A introduces. The reason string is deliberately educational so the panel's "Gate?" banner explains to the user how to escape: either approve the design, or delete the draft to skip the stage.

**State 4: architecture approved, design approved.**

Approve the design doc (open it in the board panel — it'll render as raw HTML for now since the panel still uses markdown mode; Phase D fixes the renderer — but the **Approve button still works**). Then `check_gate(stage: "plan")`.

Expected: `{ ok: true }`.

### 3.4 CLAUDE.md picks up the Design row in the Commands footer

After §3.3, run:

```bash
sed -n '/specmanager:start/,/specmanager:end/p' CLAUDE.md
```

The Commands line should now include `/specmanager-design (optional)`. The actual slash command doesn't exist yet — Phase C adds it — but the managed block already advertises the new stage so users know it's coming.

### 3.5 (Sanity) existing flows are unbroken

Run a full smoke pass through Phases 1–6 to confirm nothing regressed:

```bash
# inside the repo
cd plugins/specmanager/server
npm run selftest && npm run selftest-board && npm run smoke-mcp
```

All three exit 0. The smoke-mcp message "all 17 tools registered" is a hard-coded copy that has been stale since Phase 7 added 2 more tools (now 19); not a Phase A regression.

## 4. Pass criteria (all required)

- [ ] `npm run selftest` exits 0.
- [ ] `npm run selftest-board` exits 0 and the output includes all 13 new Phase A assertion lines listed in §1.
- [ ] `npm run smoke-mcp` exits 0.
- [ ] §3.2: `create_document(stage: "design")` writes a file at `.claude/specs/features/<slug>/design/brief.html` with frontmatter `stage: design`, `status: draft`.
- [ ] §3.2: the design doc appears in `/api/board` under `features[].documents` with `stage === "design"`.
- [ ] §3.3 state 2: plan gate is OPEN when architecture is approved and no design doc exists.
- [ ] §3.3 state 3: plan gate is CLOSED with the educational reason naming **design** when a draft design doc exists.
- [ ] §3.3 state 4: plan gate is OPEN when both architecture and design are approved.
- [ ] §3.4: `CLAUDE.md` Commands footer includes `/specmanager-design (optional)`.
- [ ] `git status` shows changes only inside `.claude/specs/` and `CLAUDE.md` in your test repo.

## 5. Deferred to later phases (not regressions)

These are out of scope for Phase A — explicitly part of B / C / D. If you notice them missing, that's expected:

- **No `/specmanager-design` slash command yet** (Phase C).
- **No `designer` subagent** (Phase C).
- **No Design column on the board** (Phase D).
- **No `<iframe srcdoc>` HTML preview in the doc panel** (Phase D) — HTML design briefs currently render as raw text in the markdown preview pane, which is ugly but functional.
- **No `./docs/DESIGN.md` generation on `/specmanager-init`** (Phase B).
- **No `feature.shipped` event yet** (Phase B).
- **Plan and Build agents don't yet ground in the design doc** (Phase C.4–C.6).

## 6. Troubleshooting

- **`create_document(stage: "design")` fails with "Invalid enum value"** — your MCP server is on a pre-Phase-A build. Re-pull, rebuild, reinstall, kill daemon, restart Claude.
- **Plan gate is open even with a draft design** — confirm `listDocuments` is reading the design doc. The Phase A fix widened the file filter to accept `.html`, so a stale dist build that still filters `.md`-only will produce this exact symptom. Check `plugins/specmanager/server/dist/core/documents.js` for the line `name.endsWith(".html")`.
- **Architecture doc still flagged stale after PRD approval** — unrelated to Phase A; that's Phase 3's behaviour. Approve the architecture and the stale flag clears.

## 7. What ships in Phase B (preview)

- `docs/references/stitch-design-md.md` — pinned snapshot of the Google Stitch DESIGN.md spec.
- `plugins/specmanager/server/src/core/design-md.ts` — `scanUiSources`, `renderDesignMd`, `syncDesignMd`.
- `initProject` extended to call `syncDesignMd({mode: "init"})` and report `designMd` + `createdDesignMd`.
- `feature.shipped` event emitted from `setStatus` on final-walkthrough approval; auto-sync listener triggers a debounced DESIGN.md refresh.
- `sync_design_md` MCP tool + `POST /api/design/sync` REST endpoint, broadcasting `design.synced` over WS.
