# Design feature — Phase C test walkthrough

End-to-end test of the **`/specmanager-design` slash command + `designer` subagent + downstream design grounding** that ships in Phase C of `docs/plan-design-feature.md`. Phase C adds the runtime that designs a feature's actual screens — one self-contained HTML doc of stacked high-fi mockups with explanatory notes between them — and wires every downstream agent (architect, planner, builder) to read those mockups when they exist.

> Exit criterion (from `docs/plan-design-feature.md`):
> in a test repo with an approved PRD, running `/specmanager-design <featureId>` (after pasting one screenshot path and a one-line brief into the chat) invokes the `designer` subagent visibly via the Task tool. The subagent calls `create_design_brief`, which persists a versioned HTML doc with `stage: "design"`, `generatedBy: "agent"`, the screenshot inlined as a `data:` URI, and proper `dependsOn`/`basedOn` linking to the PRD (+ architecture if approved). Approving the design doc and then running `/specmanager-plan` produces a plan whose body references the design doc id at least once. Running `/specmanager-plan` with the design doc in `draft` is refused by the gate.

Assumes Phases A and B of the Design feature already pass (`docs/phase-design-A-test-walkthrough.md`, `docs/phase-design-B-test-walkthrough.md`).

## 0. Prerequisites

- Phase A + Phase B selftests pass on `main`.
- A test repo where you'll run the slash-command flow end-to-end. At least one PRD-bearing feature so the gate has something to gate on.
- An `ANTHROPIC_API_KEY` exported in your shell (only required for the live Task-tool invocation; the selftests don't need it).

## 1. Build (contributors only)

```bash
cd plugins/specmanager/server
npm install
npm run build
npm run selftest          # Phase 1 + A + B + C unit assertions
npm run selftest-board    # REST + design-stage gate + sync_design_md
npm run smoke-mcp         # MCP handshake + tools list (now 21 tools — create_design_brief added)

cd ../ui
npm install
npm run build             # no UI changes yet (Phase D adds the column + iframe preview)
```

`selftest` should now include these Phase C lines:

```
ok — sanitizeDesignBriefBody defangs `---` at column 0
ok — sanitizeDesignBriefBody wraps `---` in an HTML comment
ok — design doc stage is design
ok — design doc generatedBy is agent
ok — design doc depends on PRD
ok — design doc lands at design/mockups.html
ok — design doc body round-trips stacked screen sections
ok — design doc body round-trips inline styles
ok — design doc body preserves the sanitized escape on read
```

`smoke-mcp` should print `tools/list returned 21 tools` (was 20 in Phase B — `create_design_brief` is the new one).

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

## 3. Phase C exit checks

### 3.1 Bootstrap a feature with an approved PRD

```
/specmanager-init
/specmanager-feature Design C demo
/specmanager-prd design-c-demo
```

Approve the PRD via the board panel. Confirm:

```bash
grep "^status:" .claude/specs/features/design-c-demo/prd/prd.md
# → status: approved
```

### 3.2 `/specmanager-design` invokes the designer subagent

Place a screenshot somewhere in the repo (or just a tiny PNG anywhere on disk you can reference). Then in the Claude session:

> I want to use this screenshot: `/tmp/sample.png` — design minimalist screens for this feature.
> /specmanager-design design-c-demo

Expected:

- Claude reads `commands/specmanager-design.md`, calls `check_gate({ stage: "design" })` — opens because PRD is approved.
- It calls `list_documents({ stage: "prd" })` and (optionally) `list_documents({ stage: "architecture" })` to grab the upstream ids.
- It invokes the `designer` subagent **visibly via the Task tool** with the feature id + PRD id + screenshot path.
- The subagent reads PRD via `read_document`, reads `./docs/DESIGN.md` via `Read`, reads `/tmp/sample.png` via `Read`, and designs the actual screens as one self-contained HTML doc — stacked `<section class="sm-screen">` mockups with `<section class="sm-note">` explanations between them, grounded in DESIGN.md tokens, any screenshot inlined as a `data:` URI — then calls `create_design_brief`.

Verify on disk:

```bash
ls .claude/specs/features/design-c-demo/design/
# → mockups.html
head -30 .claude/specs/features/design-c-demo/design/mockups.html
grep -c "sm-screen" .claude/specs/features/design-c-demo/design/mockups.html   # ≥ number of screens
```

Frontmatter must show:

```yaml
stage: design
status: draft
generatedBy: agent
dependsOn:
  - prd-design-c-demo-001
basedOn:
  prd-design-c-demo-001: 1
```

Body must include `<img src="data:image/png;base64,…">` for the embedded screenshot.

### 3.3 Plan gate refuses while design is in draft

```
/specmanager-architecture design-c-demo
```

(Draft, then approve the architecture via the board.)

Now try Plan while design is still `draft`:

```
/specmanager-plan design-c-demo
```

Expected refusal:

> Gate closed: design stage is not approved (design is optional — delete the draft to skip)

The slash command should NOT invoke the planner — Phase A's compound gate logic catches this. The reason string is deliberately educational so users know they can either approve the design or delete the brief to skip the stage entirely.

### 3.4 Approve design → planner grounds in it

Open the design doc in the board panel and click **Approve**. The badge flips to `approved`.

Now run plan:

```
/specmanager-plan design-c-demo
```

Expected:

- `check_gate({ stage: "plan" })` returns `ok: true` (architecture approved AND design approved).
- The slash command calls `list_documents({ stage: "design" })`, grabs the design doc id, and passes it into the planner's Task prompt.
- The **planner** subagent reads the design brief via `read_document` (its updated `## Required research` step #2 enforces this).
- The generated `plan.md` body references the design doc id at least once (e.g. "Phase A scaffolds the screens described in `design-design-c-demo-001`").
- The plan doc's frontmatter `dependsOn` includes both the architecture id AND the design id; `basedOn` records the versions of both.

Verify:

```bash
grep -E "(design-design-c-demo|dependsOn|basedOn)" .claude/specs/features/design-c-demo/plan/plan.md | head -10
```

You should see the design doc id mentioned in the body AND the architecture+design pair in the frontmatter.

### 3.5 Architect grounding (regression check)

The architect prompt also gained the design-grounding step. To verify quickly without re-running the full slash command:

Open `plugins/specmanager/agents/architect.md` in the installed cache and confirm step #2 of `## Required research` mentions `list_documents({ featureId, stage: "design" })`. (This file ships with the plugin install; if you edited the source after install, reinstall first.)

When the architect runs on a feature that has an approved design doc, it should `read_document` the brief and reference the brief's components/tokens in its **Affected components** and **Conventions used** sections.

### 3.6 `create_design_brief` rejects oversized bodies

Ask Claude:

> Use `create_design_brief` with `featureId: "feat-design-c-demo"`, `title: "Oversize test"`, `body: <a 6MB string>`.

(In practice you'd ask Claude to construct a 6MB body; the cleanest path is to ask it to fabricate one in-prompt rather than read a file. The cap is 5MB — high-fi stacked mockups need more headroom than the old 2MB brief.)

Expected: the MCP tool returns `{ ok: false, error: "design brief body is N bytes — cap is 5242880. Refer to large screenshots by repo-relative path instead of inlining as data: URIs." }`. No file is written.

### 3.7 `---` at column 0 is defanged (regression check)

If you crafted a brief whose body included a line that's exactly `---` at column 0 (e.g. the agent generated `<hr>` as `---`), `create_design_brief` should wrap it in `<!-- --- -->` before persisting. The selftest in §1 already exercises this. To verify manually:

```bash
grep "<!-- --- -->" .claude/specs/features/<slug>/design/mockups.html
# (empty if the body has no col-0 `---` lines — that's fine; sanitize is a no-op then)
```

If the file fails to parse via `gray-matter` on next read (you'd see odd manifest behavior), the escape isn't being applied; capture the body and file a bug.

## 4. Pass criteria (all required)

- [ ] `npm run selftest` exits 0 with all 9 Phase C unit assertions listed in §1.
- [ ] `npm run smoke-mcp` reports `tools/list returned 21 tools` (create_design_brief added).
- [ ] §3.2: `/specmanager-design` invokes the **designer** subagent via Task tool (visible in Claude's transcript).
- [ ] §3.2: the design doc is persisted at `design/mockups.html` with `stage: "design"`, `generatedBy: "agent"`, `dependsOn` including PRD id, `basedOn` with PRD version. Body is one self-contained HTML doc with multiple stacked `<section>` screen mockups + inline `<style>`.
- [ ] §3.2: any screenshot is inlined as a `data:image/...;base64,...` URI in the body.
- [ ] §3.3: `/specmanager-plan` is REFUSED while design is in `draft` with the compound-gate reason naming design.
- [ ] §3.4: approving design → `/specmanager-plan` succeeds AND the generated plan body references the design doc id; plan frontmatter `dependsOn`/`basedOn` includes both architecture and design.
- [ ] §3.6: `create_design_brief` rejects bodies > 5MB.
- [ ] `git status` shows changes only inside `.claude/specs/` and `CLAUDE.md`.

## 5. Deferred to later phases

- **Design column on the kanban board** (Phase D) — the board still shows 5 columns. Design docs only surface via the doc panel (clicking the PRD/Architecture/Plan cells and inspecting `list_documents`).
- **`<iframe srcdoc>` HTML preview in the doc panel** (Phase D) — currently the design doc renders as raw HTML text in the markdown preview pane.
- **Builder grounding live demo** — the builder.md update is in place but only matters once you run `/specmanager-execute` on a feature whose plan was grounded in a design brief. Covered end-to-end by Phase D's exit test once the column lands.

## 6. Troubleshooting

- **`/specmanager-design` errors with "Unknown subagent type"** — confirm `plugins/specmanager/agents/designer.md` is in the installed cache (`ls ~/.claude/plugins/cache/specmanager/specmanager/<commit>/agents`). A fresh `/plugin install` should include it.
- **Screenshot doesn't inline as data URI** — the designer subagent has to read the file with the `Read` tool and base64-encode it inline in the body. If the brief instead has `<img src="/tmp/sample.png">`, the subagent didn't follow its instructions; the Phase D iframe sandbox blocks file:// URLs, so this would render broken.
- **Plan gate refuses with the architecture reason instead of the design reason** — the compound gate checks architecture first. If architecture is also draft, that's the message you'll see; approve architecture and the design reason surfaces. Phase A selftest 3.3 covers all four combinations.
- **Planner doesn't reference the design doc id in the plan body** — confirm `commands/specmanager-plan.md` step #4 (design lookup) is present in the installed cache; reinstall if it's missing.

## 7. What ships in Phase D (preview)

- UI `Stage` union and `COLUMNS` array gain `"design"` — board grows to 6 columns.
- New `OptionalEmptyCell` variant clearly signals "Design (optional) · /specmanager-design".
- `DocPanel` detects `stage === "design"` and swaps the markdown editor for an HTML editor + `<iframe srcdoc sandbox="allow-same-origin">` preview.
- WS subscription to `design.synced` events makes the board pulse when DESIGN.md is refreshed.
