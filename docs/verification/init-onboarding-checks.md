# Init onboarding: automated checks (M4, M5)

Task-009, plan row 1.9, feature `feat-init-onboarding-plugins-repos`. Run on 2026-10-20 against the checkout at `39a9ab6` (branch `feat/init-onboarding-plugins-repos`).

## Verdict

| Check | Result |
|---|---|
| M4: managed table shows each feature's real current stage after a sync with the checkout's `syncClaudeMd` | **Pass** |
| M5: no new network or process use in `plugins/specmanager/server/src` on this branch | **Pass** (none found) |

## M4: managed-table stage labels

The session's MCP server runs the installed 1.2.0 plugin, not this checkout, and the repo `CLAUDE.md` has owner-uncommitted hunks. So the real repo was not synced. Instead:

```
S=$(mktemp -d); mkdir -p $S/.claude
cp -R .claude/specs $S/.claude/specs; cp CLAUDE.md $S/CLAUDE.md
cd plugins/specmanager/server
node -e "import('./dist/core/claude-md.js').then(async m=>console.log(await m.syncClaudeMd(process.argv[1])))" $S
diff <(sed -n '/specmanager:start/,/specmanager:end/p' <repo>/CLAUDE.md) \
     <(sed -n '/specmanager:start/,/specmanager:end/p' $S/CLAUDE.md)
rm -rf $S
```

The sync returned `{ created: false }` (it merged into the copied `CLAUDE.md`). It logged one pre-existing warning, `skipping unparseable doc .../fly-io-deployment/architecture/architecture.md` (no frontmatter). That doc is unrelated to this feature.

Rows that changed (real `CLAUDE.md` before, scratch after the sync):

| Feature | Before (real CLAUDE.md) | After (checkout sync) |
|---|---|---|
| Redesign | PRD (approved) · — | Walkthroughs (approved) · Build (28/28 tasks done) · phases 4/4 |
| Markdown viewer | PRD (approved) · — | Plan (approved) · Build (20/20 tasks done) · phases 4/4 |
| Reinstall refactor | PRD (approved) · — | Plan (approved) · Build (14/14 tasks done) · phases 3/3 |
| Interview command | PRD (approved) · — | Walkthroughs (draft) · Build (17/17 tasks done) · phases 2/2 |
| Antigravity plugin | PRD (approved) · — | Plan (approved) · Build (0/25 tasks done) · phases 0/3 |
| Share docs on public URL | PRD (approved) · — | Design (approved) · — |
| Cursor plugin | PRD (approved) · — | Design (approved) · — |
| Codex plugin | PRD (approved) · — | Architecture (approved) · — |
| Token usage optimisation | PRD (approved) · — | Plan (approved) · Build (13/14 tasks done) |
| Viral loop feature | PRD (approved) · — | Architecture (draft) · — |
| Spec-stage tier dispatch | PRD (approved) · — | Architecture (draft) · — |
| Multi-repo nested docs (CLAUDE.md / DESIGN.md) | PRD (approved) · — | Walkthroughs (draft) · Build (11/11 tasks done) |
| Multi-session boards (auto-port) | PRD (approved) · — | Walkthroughs (draft) · Build (8/8 tasks done) |
| Landing page redesign (ethskills style) | PRD (approved) · — | Design (draft) · — |
| Marketing phase | PRD (approved) · Plan ⚠️ stale | Plan (draft) · Build (0/25 tasks done) · phases 0/2 · Plan ⚠️ stale |
| SpecManager simplification cleanup | PRD (approved) · — | Plan (draft) · Build (0/11 tasks done) |
| Loop command (/specmanager-loop) | PRD (approved) · — | Walkthroughs (draft) · Build (8/8 tasks done) |
| Agent prompt simplification (Opus 5.5) | PRD (approved) · — | Walkthroughs (draft) · Build (22/22 tasks done) |
| Init onboarding: plugins & repos | PRD (approved) · — | Plan (approved) · Build (9/10 tasks done) |

Features whose only doc is a PRD (e.g. Dummy feature, User adoption acceleration) kept their `PRD (…)` label, as expected. The `9/10` for this feature is the working-tree `tasks.json` at run time, with task-009 in progress.

The real `CLAUDE.md` shows `PRD (…)` for every feature because the installed 1.2.0 server rendered it. The checkout's renderer labels each feature with its furthest stage and adds the Build note once a Plan has tasks.

## M5: no network or process use

```
git diff 7d16c45..HEAD -- plugins/specmanager/server/src | grep -nE \
  '^\+.*(fetch\(|child_process|from "node:(http|https|net|dgram|tls)"|from "(http|https|net|dgram|tls)"|XMLHttpRequest|WebSocket|undici|axios|spawn|exec\()'
```

No matches (grep exit 1). The diff touches 5 files (`core/claude-md.ts`, `core/init.ts`, `selftest-prompts.ts`, `selftest-repos.ts`, `selftest.ts`, +138/-13). It adds only two imports, both local modules: `./types.js` in `core/claude-md.ts`, and more names from `./repos.js` in `core/init.ts`. The plugin still makes no model or API calls and opens no new network connections.
