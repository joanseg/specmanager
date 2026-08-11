---
id: wt-multi-repo-nested-docs-claude-md-design-md-018
featureId: feat-multi-repo-nested-docs-claude-md-design-md
stage: walkthrough
status: draft
stale: false
title: Multi-repo nested docs (CLAUDE.md / DESIGN.md) — Phase core walkthrough
dependsOn:
  - plan-multi-repo-nested-docs-claude-md-design-md-016
basedOn:
  plan-multi-repo-nested-docs-claude-md-design-md-016: 1
generatedBy: agent
version: 1
phase: core
createdAt: '2026-07-13T16:11:39.471Z'
updatedAt: '2026-07-13T16:11:39.471Z'
---
# Multi-repo nested docs (CLAUDE.md / DESIGN.md) — Phase core walkthrough

This phase teaches `specmanager-init` to **declare sibling repos by path**. Running `/specmanager:specmanager-init /A/repo-1 /A/repo-2` in a meta repo reads each sibling **read-only** (the path *is* the read grant), seeds `repos/<name>/{CLAUDE.md,DESIGN.md,.specmanager-repo.json}` mirrors *inside the meta root*, and renders a links-only **"Declared repos"** subsection into the managed `CLAUDE.md` block. Re-running reconciles the set without clobbering mirror bodies. The load-bearing invariant: **read may leave the meta root; write structurally cannot.** This is a single-phase feature — approving this walkthrough ships it.

> **Exit test:** `cd plugins/specmanager/server && npm run build && npm run selftest-repos` passes — declares two temp sibling repos, verifies each gets `repos/<name>/{CLAUDE.md,DESIGN.md,.specmanager-repo.json}` (seed-if-present / placeholder-if-absent), the managed `CLAUDE.md` block gains a linked "Declared repos" subsection, a second `initProject` re-run reconciles idempotently without clobbering nested bodies, **and** the write-containment/traversal case (crafted arg/basename) cannot escape the meta root.

You should already have the SpecManager repo checked out with this phase's commits (`fbc511d` → `cbd33d3`) on `main`, and the server toolchain installed (`npm install` under `plugins/specmanager/server`).

## 0. Prerequisites

- **Node 20+** (the server is `"type": "module"`, Node 20+). Check: `node --version`.
- **Repo + branch:** this repo at `main` with the `core`-phase commits landed. All 11 tasks are `done`.
- **Server deps installed:** `cd plugins/specmanager/server && npm install` (once).
- **No seed data.** The self-test builds its own throwaway workspace via `mkdtemp`; the manual checks below build a scratch meta root under `/tmp`. Nothing touches your real project.
- **New files this phase:** `core/repos.ts` (the whole feature's logic), `selftest-repos.ts`; extended: `core/paths.ts`, `core/claude-md.ts`, `core/init.ts`, `core/index.ts`, `mcp.ts`, `commands/specmanager-init.md`, `server/package.json`.

## 1. Build

From the server package, compile TypeScript and run the phase's self-test — this is the exit gate.

```bash
cd plugins/specmanager/server
npm run build          # tsc -p tsconfig.json → dist/
npm run selftest-repos # node dist/selftest-repos.js
```

**New assertions this phase adds** (29, all must print `ok —`). The final line must read:

```
All multi-repo declare/seed/render/reconcile + containment assertions passed.
```

The individual lines you should see, in order:

```
ok — init declares both repos
ok — init rejects nothing
ok — both repos/<name>/ trees + sidecars written
ok — seeded mirror carries the read-only banner
ok — seeded mirror includes the source CLAUDE.md body
ok — repo-with-ui sidecar hasUi is true
ok — repo-no-ui sidecar hasUi is false
ok — repo-no-ui sidecar records the source had no DESIGN.md
ok — scanDeclaredRepos returns both repos
ok — scan reports repo-with-ui hasUi true
ok — scan reports repo-no-ui hasUi false
ok — CLAUDE.md has Declared repos subsection
ok — CLAUDE.md renders the repo-with-ui row with working relative links
ok — Declared repos link resolves to a real nested file
ok — CLAUDE.md marks the CLAUDE.md-only repo row as _(placeholder)_
ok — re-run declares all three repos
ok — re-run rejects nothing
ok — re-run leaves the annotated nested body byte-identical (un-clobbered)
ok — third repo seeded on re-run
ok — scan returns all three repos after re-run
ok — CLAUDE.md renders the newly-added repo-third row after re-run
ok — assertInsideRoot accepts an in-root repos/<name>/ path
ok — assertInsideRoot rejects a traversal path that escapes the meta root
ok — seedRepo throws on a traversal-laden name (write-containment guard)
ok — no file was written outside repos/ after the crafted traversal attempt
ok — a missing arg is reported in rejectedRepos with reason notFound
ok — both valid repos are still declared despite the bad arg (partial success)
ok — a not-a-directory arg is reported in rejectedRepos with reason notADirectory
ok — the valid repo is still declared alongside the not-a-directory rejection
```

Also confirm zero regression on the existing suite (the feature is a no-op when no `repoPaths` are passed):

```bash
npm run selftest        # core flow — must stay green
```

**If any of these fail, stop here** — the phase gate is red and nothing below will hold.

## Install / run

The capability is exposed two ways: the `specmanager_init` MCP tool (argument `repoPaths`) and the `/specmanager:specmanager-init` slash command that forwards them. Two ways to exercise it:

- **Automated / no reinstall (recommended for verification):** the self-test above and the manual `node` snippets in §2 drive `@specmanager/core` directly from freshly-built `dist/` — no plugin reload needed.
- **Live slash-command path (optional):** to run the real `/specmanager:specmanager-init /path/repo-1` in a session, reinstall the rebuilt plugin:
  1. `/plugin marketplace update specmanager`
  2. `/plugin install specmanager@specmanager`
  3. `/reload-plugins`
  4. reconnect via `/mcp`.

  **Reload troubleshooting:** if `/mcp` still shows the old tool schema (no `repoPaths` on `specmanager_init`), a full Claude restart is the reliable fix (see README Troubleshooting) — the in-process reconnect occasionally keeps a stale MCP handshake.

## 2. Phase core exit checks

Each check is user-runnable against freshly-built `dist/`. Set up a scratch workspace once:

```bash
cd /Users/joan/Documents/projects/specmanager/plugins/specmanager/server
WS=$(mktemp -d /tmp/smrepos.XXXX)
mkdir -p "$WS/meta" "$WS/repo-ui" "$WS/repo-plain"
printf '# repo-ui\n\nHello UI.\n'      > "$WS/repo-ui/CLAUDE.md"
printf '# repo-ui design\n--c: #123;\n'> "$WS/repo-ui/DESIGN.md"
printf '# repo-plain\n\nNo UI here.\n' > "$WS/repo-plain/CLAUDE.md"
echo "$WS"
```

### 2.1 Declare-by-path seeds nested mirrors (seed-if-present)

Drive the real init pipeline through the compiled `core`:

```bash
node --input-type=module -e '
import { initProject } from "./dist/core/index.js";
const ws = process.env.WS, root = ws + "/meta";
const r = await initProject(root, { repoPaths: [ws+"/repo-ui", ws+"/repo-plain"], cwd: ws });
console.log("declared:", r.declaredRepos.map(o => `${o.name}(hasUi=${o.hasUi},added=${o.added})`));
console.log("rejected:", r.rejectedRepos);
' 
find "$WS/meta/repos" -type f | sort
```

**Expected** — both declared, nothing rejected, and six files under `repos/` (three per repo):

```
declared: [ 'repo-ui(hasUi=true,added=true)', 'repo-plain(hasUi=false,added=true)' ]
rejected: []
```
```
<WS>/meta/repos/repo-plain/.specmanager-repo.json
<WS>/meta/repos/repo-plain/CLAUDE.md
<WS>/meta/repos/repo-plain/DESIGN.md
<WS>/meta/repos/repo-ui/.specmanager-repo.json
<WS>/meta/repos/repo-ui/CLAUDE.md
<WS>/meta/repos/repo-ui/DESIGN.md
```

Note `repo-plain` **still gets a `DESIGN.md`** even though its source has none — a placeholder keeps the nested tree uniform (`hasUi=false`).

### 2.2 Seeded mirror carries the read-only banner + source body verbatim

```bash
head -3 "$WS/meta/repos/repo-ui/CLAUDE.md"
```

**Expected** — the `seedHeader` banner, then the source body (`core/repos.ts` `seedRepo`):

```
> Seeded by SpecManager from repo-ui on <ISO-8601>. Read-only mirror; edit the source repo, not this file.

# repo-ui
```

The placeholder `DESIGN.md` for the no-UI repo instead ends with `_This repo has no design system / UI; placeholder kept so the nested tree is uniform._`:

```bash
tail -1 "$WS/meta/repos/repo-plain/DESIGN.md"
```

### 2.3 Provenance sidecar is the authoritative record (portable sourcePath)

```bash
cat "$WS/meta/repos/repo-ui/.specmanager-repo.json"
cat "$WS/meta/repos/repo-plain/.specmanager-repo.json"
```

**Expected** — `sourcePath` is **relative to the meta root's parent** (`path.relative(path.dirname(root), abs)` → `repo-ui`, not an absolute machine path), and `hasUi`/`sourceHadDesignMd` track the source:

```json
{
  "name": "repo-ui",
  "sourcePath": "repo-ui",
  "hasUi": true,
  "seededAt": "<ISO>",
  "sourceHadClaudeMd": true,
  "sourceHadDesignMd": true
}
```

For `repo-plain`: `"hasUi": false`, `"sourceHadDesignMd": false`.

### 2.4 Managed CLAUDE.md gains a linked "Declared repos" subsection

```bash
sed -n '/### Declared repos/,/\*\*Rules:\*\*/p' "$WS/meta/CLAUDE.md"
```

**Expected** — links only (never inlined bodies), rendered *after* the feature area and *before* the `**Rules:**` line; the no-UI repo carries a `_(placeholder)_` tag (`core/claude-md.ts` `renderBlock`, `core/repos.ts` `scanDeclaredRepos`):

```
### Declared repos

- **repo-plain** — [CLAUDE.md](./repos/repo-plain/CLAUDE.md) · [DESIGN.md](./repos/repo-plain/DESIGN.md) _(placeholder)_
- **repo-ui** — [CLAUDE.md](./repos/repo-ui/CLAUDE.md) · [DESIGN.md](./repos/repo-ui/DESIGN.md)
```

Rows are sorted by `name` (so `repo-plain` precedes `repo-ui`). The relative links resolve to the real nested files created in §2.1. The block sits **inside** the existing `<!-- specmanager:start -->`/`<!-- specmanager:end -->` markers — no new marker pair.

### 2.5 Re-run reconciles idempotently — never clobbers mirror bodies

Annotate a mirror, add a third repo, re-run init with all three:

```bash
printf '\n<!-- keep me -->\n' >> "$WS/meta/repos/repo-ui/CLAUDE.md"
BEFORE=$(shasum "$WS/meta/repos/repo-ui/CLAUDE.md" | cut -d" " -f1)
mkdir -p "$WS/repo-third"
printf '# repo-third\n' > "$WS/repo-third/CLAUDE.md"
printf '# third design\n' > "$WS/repo-third/DESIGN.md"
node --input-type=module -e '
import { initProject } from "./dist/core/index.js";
const ws = process.env.WS, root = ws + "/meta";
const r = await initProject(root, { repoPaths: [ws+"/repo-ui", ws+"/repo-plain", ws+"/repo-third"], cwd: ws });
console.log("declared count:", r.declaredRepos.length, "rejected:", r.rejectedRepos.length);
'
AFTER=$(shasum "$WS/meta/repos/repo-ui/CLAUDE.md" | cut -d" " -f1)
[ "$BEFORE" = "$AFTER" ] && echo "UNCLOBBERED" || echo "CLOBBERED"
ls "$WS/meta/repos"
```

**Expected** — three declared, none rejected; the hand annotation survives byte-for-byte (write-if-absent `wx`); the third repo is now present:

```
declared count: 3 rejected: 0
UNCLOBBERED
repo-plain
repo-third
repo-ui
```

### 2.6 Write-containment / traversal cannot escape the meta root

The safety invariant. A crafted traversal name must throw at `assertInsideRoot` *before any bytes land*:

```bash
node --input-type=module -e '
import { assertInsideRoot, seedRepo, reposDir, repoDir } from "./dist/core/index.js";
const root = process.env.WS + "/meta";
// direct guard: in-root passes, traversal throws
assertInsideRoot(repoDir("legit", root), root);
let guard=false; try { assertInsideRoot(repoDir("../../escape", root), root); } catch { guard=true; }
console.log("guard rejects traversal:", guard);
// seedRepo with a traversal name must throw, writing nothing
let seed=false;
try { await seedRepo(root, "../../escape", process.env.WS+"/repo-ui", {claudeMd:"x",designMd:"x"}); } catch { seed=true; }
console.log("seedRepo throws on traversal name:", seed);
'
# nothing was written outside repos/
ls "$WS/escape" 2>&1 | head -1
```

**Expected**:

```
guard rejects traversal: true
seedRepo throws on traversal name: true
ls: <WS>/escape: No such file or directory
```

### 2.7 Partial success — a bad arg never aborts the good ones

```bash
node --input-type=module -e '
import { initProject } from "./dist/core/index.js";
const ws = process.env.WS, root = ws + "/meta";
const r = await initProject(root, { repoPaths: [ws+"/repo-ui", ws+"/does-not-exist"], cwd: ws });
console.log("declared:", r.declaredRepos.map(o=>o.name));
console.log("rejected:", r.rejectedRepos);
'
```

**Expected** — the missing arg is reported with `reason: "notFound"`, the valid repo is still declared. (A file path arg instead reports `"notADirectory"`; a re-declare from a *different* source than an existing sidecar reports `"conflict"` and skips, never overwrites.)

```
declared: [ 'repo-ui' ]
rejected: [ { arg: '<WS>/does-not-exist', reason: 'notFound' } ]
```

Clean up when done: `rm -rf "$WS"`.

## 3. Pass criteria

- [ ] `npm run build` compiles clean and `npm run selftest-repos` prints all 29 `ok —` lines + the final "assertions passed" line (§1).
- [ ] `npm run selftest` stays green — zero regression when no `repoPaths` are passed (§1).
- [ ] Declaring two sibling repos creates `repos/<name>/{CLAUDE.md,DESIGN.md,.specmanager-repo.json}` for each; a source without `DESIGN.md` still gets a placeholder (`hasUi=false`) (§2.1).
- [ ] Seeded mirrors carry the read-only banner and reproduce the source `CLAUDE.md` body verbatim (§2.2).
- [ ] The sidecar records a portable `sourcePath` (relative to the meta root's parent) and correct `hasUi`/`sourceHadDesignMd` (§2.3).
- [ ] The managed CLAUDE.md block gains a links-only "Declared repos" subsection, sorted by name, `_(placeholder)_` on no-UI repos, inside the existing markers, before `**Rules:**` (§2.4).
- [ ] A second init reconciles: adds a newly-passed repo, leaves an annotated mirror byte-identical (§2.5).
- [ ] A traversal-laden arg/name is rejected by `assertInsideRoot`/`seedRepo` and writes nothing outside `repos/` (§2.6).
- [ ] A missing / not-a-directory / cross-run-conflict arg lands in `rejectedRepos` without aborting the valid repos (§2.7).

## Deferred / Out of scope

Expected non-behaviours (not bugs) — from the plan's explicit non-goals:

- **No continuous feature-driven sync** of nested files on `feature.shipped` — freshness is by re-running `init`.
- **No `--reseed` / force-refresh** of mirror bodies — v1 seeding is strictly write-if-absent; annotated mirrors are preserved, so a source-side change is **not** re-pulled into an existing mirror. Delete the `repos/<name>/` dir and re-init to refresh.
- **No inlined nested bodies** in the always-loaded meta CLAUDE.md — links only (token budget).
- **No deleting / gitignoring** of the sibling's own files — SpecManager never writes into siblings.
- **No feature-diff inference** of newly-used repos — you re-pass paths explicitly.
- **No top-level `repos.json` registry** — the per-repo sidecars are the sole source of truth.
- **No board REST route / live-sync endpoint** for `repos/` — served via files/git only.
- **`cwd` for relative args:** relative paths resolve against the MCP server's `process.cwd()`, which may differ from where you typed the command. v1 mitigation is documentation only — **use absolute paths** (`commands/specmanager-init.md`).

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `selftest-repos` script not found | `dist/` predates the phase, or wrong package | `cd plugins/specmanager/server && npm run build`; script is registered in `server/package.json`. |
| A declared repo lands in `rejectedRepos: notFound` | Relative arg resolved against the MCP server's cwd, not your shell's | Pass an **absolute** path (see Deferred, `cwd` note). |
| `rejectedRepos: notADirectory` | The arg points at a file, not a repo directory | Point at the repo root directory. |
| `rejectedRepos: conflict` on re-run | `repos/<name>/` already exists with a sidecar `sourcePath` from a *different* source | Rename/remove the existing mirror, or declare from the original source. Same-set basename collisions instead disambiguate to `<parent>__<basename>` automatically. |
| A source edit isn't reflected in the mirror after re-init | Write-if-absent never clobbers existing bodies (by design) | Delete `repos/<name>/` and re-init to re-seed. |
| Live `/specmanager:specmanager-init` has no `repoPaths` arg | Stale MCP handshake after reload | Reinstall + `/reload-plugins` + `/mcp`; if still stale, restart Claude (Install/run). |

## What ships next

Nothing — this is a **single-phase feature**. There is no `final` roll-up; approving this walkthrough fires `feature.shipped`, which refreshes `docs/DESIGN.md` and collapses the feature into the shipped-count line of the managed CLAUDE.md block. Any future refresh-on-ship / `--reseed` work is out of scope here (see Deferred).
