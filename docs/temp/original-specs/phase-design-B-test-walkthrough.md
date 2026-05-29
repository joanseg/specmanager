# Design feature — Phase B test walkthrough

End-to-end test of the **`./docs/DESIGN.md` lifecycle** that ships in Phase B of `docs/plan-design-feature.md`. Phase B introduces the design-system spec layer that lives at the repo root and re-syncs automatically. No new UI yet (that's Phase D) and no new slash command (that's Phase C) — this phase is purely the file-on-disk contract plus its triggers.

> Exit criterion (from `docs/plan-design-feature.md`):
> in a scratch repo with at least one UI file, running `/specmanager-init` creates `./docs/DESIGN.md` populated with managed sections inferred from the UI; touching `./docs/DESIGN.md` with hand-edits above the markers and re-running init preserves them. Approving the *final* walkthrough of any feature triggers a debounced refresh that updates only the managed region. A new `sync_design_md` MCP tool and `POST /api/design/sync` REST endpoint produce the same result on demand.

Assumes Phase A of the Design feature already passes (see `docs/phase-design-A-test-walkthrough.md`).

## 0. Prerequisites

- Node ≥ 20, the plugin repo with Phase B changes (this commit) on `main`.
- A scratch / real repo with **at least one UI file** so `scanUiSources` has something to find. The selftest seeds one automatically; manual exercise wants a real repo.
- `docs/references/stitch-design-md.md` is pinned in this commit (the Google Stitch DESIGN.md spec snapshot). `renderDesignMd` follows its 8-section canonical layout.

## 1. Build (contributors only)

```bash
cd plugins/specmanager/server
npm install
npm run build
npm run selftest          # Phase 1 + Phase A + Phase B DESIGN.md assertions
npm run selftest-board    # Phase 2–6 REST + design-stage gate + POST /api/design/sync
npm run smoke-mcp         # MCP handshake + tools list (now 20 tools)

cd ../ui
npm install
npm run build             # no UI changes yet, but a clean rebuild verifies UI types still type-check
```

`selftest` output should include these **new** Phase B lines:

```
ok — init reports it created DESIGN.md
ok — init returns DESIGN.md path under docs/
ok — DESIGN.md has design start marker
ok — DESIGN.md has design end marker
ok — DESIGN.md frontmatter includes primary token
ok — DESIGN.md components section names the scanned component
ok — DESIGN.md preamble preserved across refresh
ok — DESIGN.md still has markers after refresh
ok — DESIGN.md refresh is idempotent (byte-identical)
```

`selftest-board` output should include:

```
ok — POST /api/design/sync → 200
ok — design sync echoes refresh mode
ok — design sync returns DESIGN.md path
ok — DESIGN.md on disk has the design start marker
```

If any of these fail, **stop here** — Phase C and Phase D both build on the DESIGN.md contract being honoured.

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
ps aux | grep specmanager | grep -v grep   # kill stragglers
lsof -nP -iTCP:4317 -sTCP:LISTEN
cd /path/to/your/test/repo
claude
```

## 3. Phase B exit checks

### 3.1 `/specmanager-init` creates `./docs/DESIGN.md`

In a fresh test repo that contains at least one UI file (say `src/ui/Button.tsx` plus a `:root { --primary: #1A1C1E; }` declaration in some `.css`):

```
/specmanager-init
```

Verify on disk:

```bash
ls docs/DESIGN.md
sed -n '1,30p' docs/DESIGN.md
```

Expected:

- File exists at `./docs/DESIGN.md` (`docs/` is created if absent).
- First non-empty line is `<!-- specmanager:design:start -->`.
- A YAML frontmatter block follows (`---` delimited) with `version: alpha`, `name: <your project name>`, `colors:`, `typography:`, `rounded:`, `spacing:`, and `components:` keys.
- Body has eight `## ` sections in canonical order: Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts.
- Last line is `<!-- specmanager:design:end -->`.
- The **Colors** section enumerates any CSS custom properties harvested from your UI's stylesheets; the **Components** section names sample component files it found.

If your repo has no UI dir yet, the Overview/Components sections explicitly say so — that's correct behaviour, not a bug.

### 3.2 Hand-edits outside the markers survive a refresh

Add a preamble at the top of `docs/DESIGN.md`:

```bash
{ echo "# Design (hand-written preamble)"; echo; echo "This paragraph is owned by the team, not by SpecManager."; echo; cat docs/DESIGN.md; } > docs/DESIGN.md.tmp && mv docs/DESIGN.md.tmp docs/DESIGN.md
```

Ask Claude:

> Use the `sync_design_md` MCP tool with `mode: "refresh"`.

Verify the preamble is still there:

```bash
head -5 docs/DESIGN.md
# → # Design (hand-written preamble)
# →
# → This paragraph is owned by the team, not by SpecManager.
```

The managed block below the preamble has been regenerated (timestamps + token table may have shifted) but **nothing above the start marker was touched**.

### 3.3 Idempotent refresh (no source changes → byte-identical output)

```bash
cp docs/DESIGN.md /tmp/before.md
# trigger a no-op refresh
curl -s -X POST -H "content-type: application/json" \
  -d '{"mode":"refresh"}' http://127.0.0.1:4317/api/design/sync
diff /tmp/before.md docs/DESIGN.md
# → (no output: byte-identical)
```

`POST /api/design/sync` echoes a JSON envelope:

```json
{ "path": "/abs/repo/docs/DESIGN.md", "created": false, "updated": false, "mode": "refresh" }
```

`updated: false` confirms the refresh was a no-op write skip (the file on disk was not rewritten because the rendered content matched byte-for-byte).

### 3.4 `feature.shipped` → debounced DESIGN.md refresh

This is the auto-sync hook the architecture promised. To exercise it end-to-end, you need a feature that has reached the final-walkthrough stage. The fastest path: create a tiny feature with one phase, mark its single task done, generate its phase walkthrough, approve it, generate the `final` roll-up, then approve THAT.

```bash
# in your scratch repo
/specmanager-feature B demo
# ...drive PRD → architecture → approve → plan + tasks → finish tasks → /specmanager-walkthrough <slug> <phase>
# ...approve the phase walkthrough → /specmanager-walkthrough <slug> final → approve the final
```

The moment you approve the **final** walkthrough, the MCP server's `feature.shipped` listener debounces 250ms and calls `syncDesignMd({mode: "refresh"})`. To verify:

```bash
# right before approving the final walkthrough
stat -f "%m" docs/DESIGN.md
# approve final
# ~half a second later:
stat -f "%m" docs/DESIGN.md
```

The mtime should have advanced (assuming any rendered content differs — e.g. new components landed during the build). If your build added no new UI files and no new CSS vars, the rendered block is byte-identical, the writer skips the write, and mtime stays put. In that case watch the MCP server's stderr — you'll see a `design.synced` event flow but no disk write:

```bash
# tail -f the MCP server's log file or watch its stderr
# (you'll see this only if you've enabled extra logging — by default it's quiet)
```

For a cheap smoke test of the listener without doing a full feature flow, you can fire the event manually via a debug stub — not part of the public API; see `selftest.ts` for the direct `syncDesignMd` exercise instead.

### 3.5 MCP tool — `sync_design_md`

Ask Claude:

> Use the `sync_design_md` MCP tool with `mode: "init"`.

Expected JSON response:

```json
{ "ok": true, "data": { "path": "/abs/repo/docs/DESIGN.md", "created": false, "updated": false, "mode": "init" } }
```

`created: false` because the file already exists from §3.1. `mode: "init"` round-trips through the wire — proves the input schema accepts the enum value.

### 3.6 No-UI-yet edge case

In a fresh empty repo (no `src/`, no `app/`, no UI dirs at all):

```bash
SCRATCH=$(mktemp -d -t specmanager-emptyrepo.XXXX)
cd "$SCRATCH"; git init -q; echo "# Empty" > README.md
claude   # then /specmanager-init
```

`docs/DESIGN.md` is still created. The Overview section says:

> _No UI source directory detected yet. Once the project grows a `src/`, `app/`, `ui/`, `web/`, `frontend/`, or `client/` directory with component files, the next re-sync will populate this section._

The frontmatter still includes placeholder tokens (with `TODO:` markers) so downstream agents can read it without crashing.

## 4. Pass criteria (all required)

- [ ] `npm run selftest` exits 0 with all 9 Phase B assertions listed in §1.
- [ ] `npm run selftest-board` exits 0 with all 4 Phase B REST assertions.
- [ ] `npm run smoke-mcp` exits 0 (now 20 tools registered).
- [ ] §3.1: `/specmanager-init` creates `./docs/DESIGN.md` with the Stitch-spec'd YAML frontmatter and the 8 canonical sections.
- [ ] §3.2: hand-written preamble outside the markers survives a refresh.
- [ ] §3.3: a no-op refresh produces byte-identical output (`updated: false`).
- [ ] §3.4: `POST /api/design/sync` returns 200 with the envelope shape `{ path, created, updated, mode }`.
- [ ] §3.5: `sync_design_md` MCP tool round-trips with both `init` and `refresh` modes.
- [ ] §3.6: empty repo without UI dirs still gets a valid DESIGN.md.

## 5. Deferred to later phases

- **`/specmanager-design` slash command** (Phase C) — invoking the designer subagent and creating per-feature HTML briefs is still in-progress; Phase B only ships the project-level DESIGN.md.
- **Design column on the kanban board** (Phase D) — the board still shows 5 columns. Design docs only surface via REST / file inspection.
- **Designer subagent reading DESIGN.md as context** (Phase C) — the architect/planner/builder don't yet ground in DESIGN.md.
- **`<iframe srcdoc>` HTML preview for design-stage docs** (Phase D).

## 6. Troubleshooting

- **`./docs/DESIGN.md` is not created on init** — verify the MCP server is on a fresh Phase B build (`ls plugins/specmanager/server/dist/core/design-md.js` should exist). If you reinstalled but the file's still missing, the daemon may be holding a stale process — `pkill -f mcp.js && claude daemon stop`.
- **The Components section lists the wrong files** — `scanUiSources` walks up to 4 directories deep from each candidate UI dir, capped at 8 sample files. If your project's components live somewhere unusual (e.g. `apps/web/src/lib/components/`), the scan won't find them yet. Open an issue with the dir layout and we'll add it to `UI_DIR_CANDIDATES`.
- **Refresh keeps bumping mtime even with no source changes** — `syncDesignMd` skips writes when `next === existing`. If you're still seeing rewrites, it means the rendered output is shifting (likely because CSS vars are being read in a non-deterministic order). Capture the diff and file a bug.
- **`feature.shipped` doesn't trigger a refresh** — confirm the walkthrough you approved had `phase: "final"` in its frontmatter. The event ONLY fires for the feature-level roll-up, not per-phase walkthroughs. (Phase C of the original SpecManager Phase 7 series enforces this distinction in `walkthrough-writer.md`.)

## 7. What ships in Phase C (preview)

- `agents/designer.md` — system prompt for the HTML design brief writer.
- `commands/specmanager-design.md` — `/specmanager-design <featureId-or-slug>` slash command.
- `create_design_brief` MCP tool — wraps `create_document` with screenshot inlining.
- Architect / planner / builder prompts gain a "if a design doc exists, read it and ground in it" addendum.
- `/specmanager-plan` looks up the design doc id and passes it into the planner subagent prompt.
