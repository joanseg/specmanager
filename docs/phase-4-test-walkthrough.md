# Phase 4 — Test walkthrough

End-to-end test of **agent stage generators**: `/specmanager-prd`, `/specmanager-architecture`, `/specmanager-plan`, `/specmanager-walkthrough` invoke per-stage subagents (`prd-writer`, `architect`, `planner`, `walkthrough-writer`) that draft documents grounded in prior stages AND the existing codebase.

> Exit criterion (from `docs/phase-tasks.md`):
> In a real repo, `/specmanager-prd <feature>` drafts a PRD → approve → `/specmanager-architecture <feature>` drafts from the PRD **and** existing code; CLAUDE.md block updates.

Assumes Phases 1–3 already pass.

## 0. Prerequisites

A real (brownfield) git repository — not an empty scratch dir. The architect's grounding step relies on there being source code, build files, and conventions to read. Any repo of yours will do; pick one where you actually want a feature spec written.

The plugin must be installed (see Phase 1 walkthrough §3). Phase 4 ships:

- `plugins/specmanager/agents/{prd-writer,architect,planner,walkthrough-writer}.md`
- `plugins/specmanager/commands/specmanager-{prd,architecture,plan,walkthrough}.md`
- `sync_claude_md` triggers on every doc/status/stale event (auto-debounced, 150ms).

## 1. Build (contributors only)

```bash
cd plugins/specmanager/server
npm install
npm run build
npm run selftest          # Phase 1 core flow
npm run selftest-board    # Phase 2+3 REST + WS + gate
npm run smoke-mcp         # 17 tools registered

cd ../ui
npm install
npm run build
```

## 2. Install + open Claude Code in your real repo

```
cd /path/to/your/real/repo
claude
```

Inside the session:

```
/plugin marketplace update specmanager
/plugin uninstall specmanager
/plugin install specmanager@specmanager
```

**Quit Claude and kill the daemon** before continuing (Phase 1+2 troubleshooting still applies — stale MCP servers cause "1 error during load" on `/reload-plugins`):

```bash
pkill -f '^claude$'
claude daemon stop
ps aux | grep specmanager | grep -v grep   # confirm no leftover node mcp.js processes; kill any
cd /path/to/your/real/repo
claude
```

## 3. Phase 4 exit checks

### 3.1 Bootstrap a feature

```
/specmanager-init
/specmanager-feature <a short feature title for something you'd plausibly build in this repo>
```

Note the new `feat-<slug>` id reported by the command.

### 3.2 Draft the PRD

```
/specmanager-prd <feat-id-or-slug>
```

Expected:

- Claude reads `commands/specmanager-prd.md`, calls `check_gate`, then invokes the **prd-writer** subagent via the Task tool.
- The subagent may ask one clarifying question if the prompt is thin. Answer it tersely; the goal is to see the flow, not to write a perfect PRD here.
- The subagent calls `create_document` with `stage: "prd"` and reports the new doc id.

Verify on disk:

```bash
ls .claude/specs/features/<slug>/prd/
cat .claude/specs/features/<slug>/prd/prd.md | head -40
sed -n '/specmanager:start/,/specmanager:end/p' CLAUDE.md
```

The PRD frontmatter should show `status: draft`, `generatedBy: agent`, `version: 1`. The `CLAUDE.md` managed block should now list the feature with its PRD status — that's the auto-sync on `document.created` working.

### 3.3 Approve via the board

```
/specmanager-board
```

Open `http://127.0.0.1:4317`, click the PRD card → **Approve**. Confirm the badge flips green.

```bash
grep "^status:" .claude/specs/features/<slug>/prd/prd.md
# → status: approved
sed -n '/specmanager:start/,/specmanager:end/p' CLAUDE.md
# → PRD row should now say approved
```

### 3.4 Draft the Architecture — brownfield grounding

```
/specmanager-architecture <feat-id-or-slug>
```

Expected behavior:

- Slash command calls `check_gate` → ok (PRD approved).
- It calls `list_documents({ featureId, stage: "prd" })` to get the PRD id, and passes it in the Task prompt.
- The **architect** subagent reads:
  - The PRD via `read_document`.
  - Repo conventions: `Glob` for `package.json`/etc., `Read` of `README.md` / `CLAUDE.md` / `ARCHITECTURE.md` if present, sample test files.
  - Adjacent features via `Grep` on PRD-mentioned domain terms.
- Writes a markdown architecture doc with sections that reference **real file paths** from your repo.
- Calls `create_document` with `dependsOn: [<prdId>]` and `basedOn: { <prdId>: 1 }`.

Verify:

```bash
cat .claude/specs/features/<slug>/architecture/architecture.md
```

Pass criteria for this section:

- [ ] At least one paragraph names a real path that exists in your repo (e.g. `src/foo/bar.ts`, not `src/feature/new-module.ts` invented out of thin air).
- [ ] The "Conventions used" section calls out 2–3 actual repo conventions (lint config, module style, test framework). If your repo is small enough that there are few conventions, the section should say so honestly.
- [ ] `dependsOn` and `basedOn` are populated in the frontmatter.
- [ ] `CLAUDE.md` managed block now lists Architecture as `draft`.

### 3.5 Closed gate is enforced

Reopen the PRD in the board (Approve→Reopen on the card). Then try:

```
/specmanager-architecture <feat-id-or-slug>
```

The slash command should refuse with the gate reason ("prd stage is not approved") and NOT invoke the subagent. This proves the gate is in `core`, not just prompt politeness.

Re-approve the PRD before continuing. The Architecture doc will now show `stale: true` (Phase 3 propagation).

### 3.6 Plan + tasks

Approve the Architecture, then:

```
/specmanager-plan <feat-id-or-slug>
```

Expected:

- The **planner** subagent reads PRD + Architecture, inspects repo test/build conventions, and emits:
  - `plan.md` with an ordered Build list, rationale, and risks.
  - One `create_task` call per Build-order item.

Verify:

```bash
cat .claude/specs/features/<slug>/plan/plan.md | head -40
cat .claude/specs/features/<slug>/plan/tasks.json
```

The board should now show a non-empty **Build** column for this feature with `0/<n> done`.

### 3.7 Walkthrough gate (completion-based, not approval-based)

```
/specmanager-walkthrough <feat-id-or-slug>
```

Expected refusal: "`<n>` task(s) not done: …". The walkthrough gate is the one stage that gates on Build completion, not on a prior stage being approved. Without manually flipping every task to `done`, this should always fail at this point — and that's the correct behavior.

(Full walkthrough generation will be re-tested in Phase 5, where the Build column gets first-class task interactions.)

## 4. Pass criteria (all required)

- [ ] `/specmanager-prd` invokes `prd-writer` (visible as a Task call in Claude's transcript).
- [ ] PRD is persisted with `generatedBy: agent`.
- [ ] `CLAUDE.md` managed block updates after PRD creation **without** a manual `sync_claude_md` call (auto-sync via events).
- [ ] `/specmanager-architecture` refuses with the gate reason when PRD is draft.
- [ ] Approved PRD → architect successfully reads PRD via `read_document` AND repo files via `Read`/`Glob`/`Grep` (you should see those tool calls in the transcript).
- [ ] Architecture references real file paths from the repo, not fabricated ones.
- [ ] `/specmanager-plan` emits a `plan.md` AND `tasks.json` with multiple tasks.
- [ ] `/specmanager-walkthrough` refuses while tasks are undone.
- [ ] `git status` shows changes only inside `.claude/specs/` and `CLAUDE.md`.

## 5. Troubleshooting

- **"Unknown subagent type"** — confirm `plugins/specmanager/agents/` is in the installed cache (`ls ~/.claude/plugins/cache/specmanager/specmanager/<commit>/agents`). A fresh `/plugin install` should pick them up.
- **Subagent skips repo reading and produces a generic architecture** — the architect prompt instructs it to do this, but a strongly anchored parent context can override. Re-run with an explicit instruction in your slash-command arg: `/specmanager-architecture feat-X please ground the design in the actual repo layout`.
- **CLAUDE.md doesn't refresh** — confirm the auto-sync wiring is live by tailing the MCP server stderr; if you see `sync_claude_md failed:` lines, check the project root resolution. The Phase 1 fallback is to call `sync_claude_md` MCP tool directly.
- **Architect writes file paths that don't exist** — that's a real failure of the brownfield grounding step. The subagent prompt explicitly forbids this. Report it; we'll tune the prompt.

## 6. Teardown

`.claude/specs/` is the source of truth — commit it like normal code.

```bash
git add CLAUDE.md .claude/
git diff --staged --stat
```
