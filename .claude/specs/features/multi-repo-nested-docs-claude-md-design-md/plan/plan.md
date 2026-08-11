---
id: plan-multi-repo-nested-docs-claude-md-design-md-016
featureId: feat-multi-repo-nested-docs-claude-md-design-md
stage: plan
status: approved
stale: false
title: Multi-repo nested docs (CLAUDE.md / DESIGN.md) plan
dependsOn:
  - arch-multi-repo-nested-docs-claude-md-design-md-021
basedOn:
  arch-multi-repo-nested-docs-claude-md-design-md-021: 2
generatedBy: agent
version: 1
createdAt: '2026-07-13T15:26:25.350Z'
updatedAt: '2026-07-13T15:29:51.323Z'
---
## Overview

Extend `specmanager-init` so the user declares sibling repos by path (`/specmanager:specmanager-init /A/repo-1 /A/repo-2`); init reads each (path-validated, read-only — the paths *are* the read grant), seeds `repos/<name>/{CLAUDE.md,DESIGN.md,.specmanager-repo.json}` inside the meta root, and renders a links-only "Declared repos" subsection into the managed `CLAUDE.md` block. All logic lands in one new `core/repos.ts` module (guards + read seam + seeding + registry scan); the rest is thin wiring into the existing init pipeline (`paths.ts`, `claude-md.ts`, `init.ts`, `mcp.ts`), the command doc, and a new `selftest-repos.ts`. This is a single server/`core` increment with no user-facing partial milestone mid-build — there is no point where shipping "declare but don't render" or "render but don't seed" is a coherent stop — so it is **one phase**. Grounded in arch `arch-multi-repo-nested-docs-claude-md-design-md-021` (R1–R6, `core-repos-module`) and PRD `prd-multi-repo-nested-docs-claude-md-design-md-031`.

**Scale:** `1` trivial · `2` small · `3` moderate · `5` substantial · `8` large · `13`/`21` epic.

_Every task below is decomposed to **≤3 points**. The safety-critical `core/repos.ts` surface is genuinely substantial, so it is split into three granularity-only tasks (guards / seeding / orchestration) whose combined behaviour is the single module the architecture specifies; the phase subtotal is unchanged by that split._

| Phase | Theme | Points |
|-------|-------|--------|
| core | Declare-by-path init: repo read seam, nested seeding, linked block | 22 |
| **Total** | | **22** |

---

## Phase core — Declare-by-path init: repo read seam, nested seeding, linked block

**Exit test:** `cd plugins/specmanager/server && npm run build && npm run selftest-repos` passes — declares two temp sibling repos, verifies each gets `repos/<name>/{CLAUDE.md,DESIGN.md,.specmanager-repo.json}` (seed-if-present / placeholder-if-absent), the managed `CLAUDE.md` block gains a linked "Declared repos" subsection, a second `initProject` re-run reconciles idempotently without clobbering nested bodies, **and** the write-containment/traversal case (crafted arg/basename) cannot escape the meta root. _(selftest is hand-rolled in `dist/`, run by name — matches the existing `selftest-*` suite.)_

| # | Task | Pts | Notes |
|---|------|-----|-------|
| 1.1 | Add `reposDir(root)` + `repoDir(name, root)` to `core/paths.ts` | 1 | `reposDir` = `<root>/repos`, `repoDir(name)` = `<reposDir>/<name>`. Same `root = projectRoot()` default pattern as existing helpers (paths.ts:13–35). No index change (paths already re-exported). |
| 1.2 | `core/repos.ts` — guards + read seam (`validateRepoPath`, `assertInsideRoot`, two-file read) | 3 | **Safety-critical.** `validateRepoPath(arg, cwd)`: `abs = path.resolve(cwd, arg)` → `fs.stat` must exist + be a directory (else `{ok:false, reason}`); `.git` presence is a *warning* (`notAGitRepo`), never a gate (worktrees/submodules use a `.git` file); `name = path.basename(abs)`. `assertInsideRoot(p, root)` throws unless `path.resolve(p) === root` or starts with `root + path.sep`. Read seam = `fs.readFile(join(abs,"CLAUDE.md"))` + `…/DESIGN.md`, each ENOENT/EACCES ⇒ "absent" (never throws); **no directory walk** of the sibling. New `node:fs/promises`/`node:path` only. |
| 1.3 | `core/repos.ts` — nested seeding + provenance sidecar + collision disambiguation | 3 | Write-if-absent `repos/<name>/{CLAUDE.md,DESIGN.md,.specmanager-repo.json}` via `mkdir({recursive:true})`, every write path through `assertInsideRoot`. CLAUDE.md: seed body verbatim under `> Seeded by SpecManager from <sourcePath> on <ISO>. Read-only mirror…` header, else stub. DESIGN.md: seed-if-present (`hasUi=true`), placeholder stub if absent (`hasUi=false`). Sidecar `{name, sourcePath, hasUi, seededAt, sourceHadClaudeMd, sourceHadDesignMd}` with `sourcePath = path.relative(path.dirname(root), abs)` (portable, not machine-local). Same-set basename collision ⇒ **both** entries become `<parent>__<basename>`; deeper paths keep basename, `repos/` stays flat. Re-declare of existing `repos/<name>/` ⇒ skip seed, don't clobber bodies. Uses `repoDir`/`reposDir` (dep 1.1). |
| 1.4 | `core/repos.ts` — `declareRepos` + `scanDeclaredRepos` orchestration + core/index re-export | 3 | `declareRepos(root, repoPaths, cwd=process.cwd())` → per arg: validate → collision-disambiguate across the set → read seam → compute `sourcePath` → seed → collect `{outcomes: DeclareOutcome[], rejected: DeclareRejection[]}` (partial success; a bad arg never aborts). `scanDeclaredRepos(root)` reads `reposDir`, loads each `.specmanager-repo.json`, degrades to `{name:<dir>, hasUi:<DESIGN.md present>, sourcePath:""}` when the sidecar is missing, returns sorted by `name`. Add `export * from "./repos.js"` to `core/index.ts` (after existing exports). Cross-run collision (existing dir, different sidecar `sourcePath`) ⇒ report conflict + skip, never overwrite. |
| 1.5 | `core/claude-md.ts` `renderBlock` — "Declared repos" linked subsection | 2 | Inside the existing `START`/`END` markers (no new marker pair); render only when `scanDeclaredRepos(root)` non-empty (zero-regression for single-repo projects). Position: **after** the feature table, **before** the `**Rules:**` line (claude-md.ts:106–108). Each row: `- **<name>** — [CLAUDE.md](./repos/<name>/CLAUDE.md) · [DESIGN.md](./repos/<name>/DESIGN.md)` + ` _(placeholder)_` when `hasUi===false`. Links only, never inlined bodies (token budget). `renderBlock` is already `async` + disk-reading; second shallow `readdir` is cheap — note the arch's hot-path flag (fires on many doc/status events) but no change needed. |
| 1.6 | `core/init.ts` — `initProject(root, opts?)` threads `repoPaths`/`cwd`, calls `declareRepos`, folds results into `InitResult` | 2 | Signature → `initProject(root = projectRoot(), opts?: { repoPaths?: string[]; cwd?: string })`. Call `declareRepos(root, opts?.repoPaths ?? [], opts?.cwd)` **between** `writeManifest` and `syncClaudeMd` (init.ts:20–21) so the block renders the freshly-seeded set. Add `declaredRepos: DeclareOutcome[]` + `rejectedRepos: DeclareRejection[]` to `InitResult`. Empty/absent `repoPaths` ⇒ identical behaviour to today. |
| 1.7 | `mcp.ts` — `specmanager_init` inputSchema `repoPaths` + pass-through | 1 | `inputSchema: z.object({ repoPaths: z.array(z.string()).optional() })` (mcp.ts:84); handler `initProject(PROJECT_DIR, { repoPaths })`. Arch `cwd` risk: MCP process cwd may differ from the workspace the user typed from — leave `cwd` to `process.cwd()` default for v1, note in command doc that absolute paths are safest. |
| 1.8 | `commands/specmanager-init.md` — positional-args form, read-grant semantics, reconcile-on-re-run | 1 | Document `/specmanager:specmanager-init /path/repo-1 /path/repo-2`; the paths *are* the read grant (reads siblings read-only, writes stay in meta root); re-run reconciles the set (adds new repos, never clobbers existing mirror bodies); recommend absolute paths (cwd caveat). Extend the "report what changed" step to include per-repo seed outcomes + `rejectedRepos`. |
| 1.9 | `selftest-repos.ts` — declare → seed → render → re-run reconcile (idempotent) | 3 | New hand-rolled script in `src/`, `assert`-style like selftest.ts, throwaway `mkdtemp` root + two temp sibling dirs (one with CLAUDE.md+DESIGN.md, one CLAUDE.md-only → placeholder DESIGN.md). Assert: both `repos/<name>/` trees + sidecars written; `hasUi` correct; managed CLAUDE.md block has the linked subsection with a working relative path; second `initProject` run leaves nested bodies byte-identical (annotate a mirror, assert un-clobbered) and adds a newly-passed third repo. |
| 1.10 | `selftest-repos.ts` — write-containment / traversal case | 2 | **Required, not optional.** Add to the same script: a crafted arg and a crafted basename (e.g. `../../escape`, separators in a name) must not produce any write outside the meta root — assert `assertInsideRoot` rejects and no file appears outside `reposDir`. Also assert a missing / not-a-directory arg is reported in `rejectedRepos` without aborting the other repos. |
| 1.11 | Register `selftest-repos` npm script + rebuild `dist/` | 1 | Add `"selftest-repos": "node dist/selftest-repos.js"` to `server/package.json` scripts (after `selftest-shutdown`). Run `npm run build` so the committed `dist/` ships the new module + selftest (build convention — `dist/` is what end users install). |

---

## Risk & sequencing notes

- **`core/repos.ts` is the foundation** — 1.2 (guards/read seam) → 1.3 (seeding/sidecar) → 1.4 (orchestration/scan) must land in order; everything downstream imports the module. `paths.ts` helpers (1.1) land first because 1.3 uses `repoDir`/`reposDir`.
- **Wiring depends on behaviour:** 1.5 (render) needs `scanDeclaredRepos`; 1.6 (init) needs `declareRepos`; 1.7 (mcp) needs the new `initProject` signature. The command doc (1.8) and both selftest tasks (1.9, 1.10) come after the behaviour exists.
- **Safety is not deferrable:** the `assertInsideRoot` containment guard ships in 1.2 and is *verified* in 1.10 — the write boundary is the load-bearing invariant (read may leave the meta root; write structurally cannot).
- **Rollback:** low-risk — the feature is additive and gated on `repoPaths` being non-empty. With no paths passed, init is byte-for-byte unchanged, so a revert of 1.5–1.7 restores prior behaviour without touching existing projects (no migration; existing repos have no `repos/` dir → `scanDeclaredRepos` returns `[]`).
- **Hot-path note (arch flag):** `renderBlock` gains a second shallow `readdir` on every `syncClaudeMd` (which fires on many doc/status events). It is cheap and bounded; no caching added in v1, but keep the `scanDeclaredRepos` read shallow (no recursion into `repos/<name>/`).
- **`cwd` correctness (arch flag):** relative args resolve against `process.cwd()`; the MCP server's cwd may not be the workspace the user typed from. v1 mitigation is documentation (1.8 recommends absolute paths), not code — flagged in Open questions.

## Test strategy

- Single new hand-rolled `selftest-repos.ts` (1.9 + 1.10), matching the repo's `selftest-*` convention (assert-on-first-failure against a `mkdtemp` root; no test-runner). It is the phase's exit gate: happy-path seed/render/reconcile **and** the containment/traversal safety case in one script.
- No changes to existing selftests — the feature is additive and no-op when `repoPaths` is empty, so `selftest` / `selftest-board` etc. stay green unchanged (a quick `npm run selftest` sanity pass confirms zero regression).
- `npm run build` (1.11) is part of the gate — the committed `dist/` is what ships.

## Out of scope (explicit non-goals — do not add tasks)

- **Continuous feature-driven sync** — no auto-refresh of nested files on `feature.shipped`; freshness = re-run `init`.
- **Deleting / gitignoring** redundant sub-repo files — leave them in place; specmanager never writes into siblings.
- **Inlining nested bodies** into the always-loaded meta `CLAUDE.md` — links only in v1 (token budget).
- **Feature-diff inference** of newly-used repos on re-run — user re-passes paths explicitly; no coupling to feature state.
- **`--reseed` flag / force-refresh** of nested bodies — deferred; v1 seeding is write-if-absent.
- **A top-level `repos.json` registry** — the per-repo sidecars *are* the authoritative record; no second source of truth.
- **Board REST route / live-sync endpoint** for `repos/` — served via files/git only.

## Notes on estimates

Points are relative complexity, not clock time — calibrate against 1.2/1.3/1.4 (the three moderate `core/repos.ts` slices) once the first of them lands. Every task is ≤3; the `core/repos.ts` split (guards / seeding / orchestration) is granularity-only — the three tasks compose into the single module the architecture specifies, and the phase subtotal (22) is unchanged by splitting. The command doc (1.8) and both selftest tasks (1.9, 1.10) are their own work items so "build `dist/` + `selftest-repos` green, including containment" stays a real, runnable gate rather than an afterthought bolted onto the code tasks.
