---
id: arch-multi-repo-nested-docs-claude-md-design-md-021
featureId: feat-multi-repo-nested-docs-claude-md-design-md
stage: architecture
status: approved
stale: false
title: Multi-repo nested docs (CLAUDE.md / DESIGN.md) architecture
dependsOn:
  - prd-multi-repo-nested-docs-claude-md-design-md-031
basedOn:
  prd-multi-repo-nested-docs-claude-md-design-md-031: 4
generatedBy: agent
version: 2
createdAt: '2026-07-13T14:35:33.675Z'
updatedAt: '2026-07-13T15:22:18.327Z'
---
## Summary

Extend `specmanager-init` so the user can **declare sibling repos by path** (`/specmanager:specmanager-init /path-to/repo-1 /path-to/repo-2`). For each declared repo, init seeds two whole managed files inside the meta root — `repos/<name>/CLAUDE.md` and `repos/<name>/DESIGN.md` — importing the sibling's own `CLAUDE.md`/`DESIGN.md` when present (placeholder `DESIGN.md` when the repo has no UI), and renders a **linked list** of those files into the managed `CLAUDE.md` block. The user-supplied paths are the **read grant**: init reads the siblings (read-only, path-validated) but every write stays inside the meta root. This slots into the existing init pipeline (`core/init.ts` → `ensureSpecsRoot`/`writeManifest`/`syncClaudeMd`/`syncDesignMd`) and the line-anchored marker-merge in `core/claude-md.ts`, adding one new `core/repos.ts` module and one new managed subtree; it changes no existing invariant except the single-root **read** boundary, which is relaxed by explicit paths only.

## Affected components

| Path | Change |
|------|--------|
| `server/src/core/repos.ts` | **New.** Path validation + read seam + nested-file seeding + registry scan. The whole feature's logic. |
| `server/src/core/init.ts` | Extend `initProject(root, opts?)` to accept `repoPaths: string[]`; call `declareRepos(...)` before `syncClaudeMd`; thread results into `InitResult`. |
| `server/src/core/claude-md.ts` | `renderBlock` gains a **"Declared repos"** subsection rendered from the repo registry (still inside the existing `START`/`END` markers — no new marker pair). |
| `server/src/core/paths.ts` | Add `reposDir(root)` = `<root>/repos` and `repoDir(name, root)`. |
| `server/src/mcp.ts` | `specmanager_init` tool's `inputSchema` gains `repoPaths: z.array(z.string()).optional()`; pass through to `initProject`. |
| `commands/specmanager-init.md` | Document the positional-args form, the read-grant semantics, and the reconcile-on-re-run behaviour. |
| `server/src/*.selftest*` | New `selftest-repos.ts` (declare → seed → render → re-run reconcile → containment). |

New on-disk artifacts (all **inside** the meta root):

```
<meta-root>/
  repos/
    <name>/
      .specmanager-repo.json   # provenance sidecar (source path relative to A/, hasUi, seededAt)
      CLAUDE.md                # seeded from sibling's CLAUDE.md, or a stub
      DESIGN.md                # seeded from sibling's DESIGN.md, or a placeholder stub
```

Nothing is ever written under a declared sibling's path.

## R1 — Positional repo-path arguments to `init`

The command passes positional args through to the `specmanager_init` MCP tool as `repoPaths: string[]`. `initProject(root, { repoPaths })` resolves and validates each, then seeds. `repoPaths` is optional and defaults to `[]` — omitting it makes init behave exactly as today (pure idempotent re-scaffold), so existing single-repo usage is unchanged.

- **Arg resolution:** each arg is resolved to an absolute path with `path.resolve(cwd, arg)` where `cwd = process.cwd()` (the shell dir the user typed the command from — the workspace `A/`), so both `../repo-1` and `/abs/A/repo-1` work. Absolute args resolve to themselves. The absolute path is used for the read seam; only the **relative-to-`A/`** form is persisted (R3/R4).
- The tool returns, per declared repo, `{ name, sourcePath, hasUi, seeded: {claudeMd, designMd}, added: boolean }` plus the usual `InitResult` fields, so the command can report exactly what changed.

## R2 — Read seam & path validation (the relaxed single-root boundary)

This is the load-bearing safety design: **read may leave the meta root; write never may.** Implemented as two one-directional helpers in `core/repos.ts`.

**Validation** (`validateRepoPath(arg, cwd) → { ok, abs, name, reason? }`), in order:
1. Resolve `abs = path.resolve(cwd, arg)`.
2. `fs.stat(abs)` — must **exist** and be a **directory**. Missing / not-a-dir ⇒ reject with a clear reason; init continues with the other repos (partial success, reported).
3. **Git-repo check is a warning, not a gate.** `abs/.git` (dir or file) present ⇒ normal. Absent ⇒ still seed but flag `notAGitRepo` in the report — the user named it explicitly, so we honour the grant rather than second-guess it (matches "the paths *are* the authorization"). Rationale: worktrees and submodules use a `.git` *file*, and a freshly-cloned-but-not-yet-`git-init` dir is still a legitimate target.
4. `name = path.basename(abs)` (collision handling in R3).

**Read seam** — the *only* reads outside the root are:
- `fs.readFile(path.join(abs, "CLAUDE.md"))` and `fs.readFile(path.join(abs, "DESIGN.md"))`, each wrapped so ENOENT ⇒ "absent" (drives seed-vs-stub), never an error.
- No directory walking of the sibling (no `scanUiSources` against it — that would be an unbounded read of foreign trees). UI-detection for the DESIGN.md rule uses **only** the presence of the sibling's `DESIGN.md` (see Open questions Q4).

**Write-containment guarantee** — every write path is built as `path.join(reposDir(root), name, …)` and passed through an `assertInsideRoot(p, root)` guard that throws unless `path.resolve(p)` equals `root` or starts with `root + path.sep`. `name` is sanitised (basename only, no separators — a traversal-laden basename can't occur, but the guard is belt-and-suspenders). The seam has **no write API that takes a sibling path** — reads take the sibling `abs`, writes take `(root, name)`. The two never mix, so no write can structurally escape.

## R3 — Nested managed-file seeding (`repos/<name>/`)

For each validated repo, write three files under `repos/<name>/` (created with `fs.mkdir(..., { recursive: true })`):

- **`CLAUDE.md`** — if the sibling's `CLAUDE.md` exists, copy its body verbatim under a short generated header (`> Seeded by SpecManager from <sourcePath> on <ISO>. Read-only mirror; edit the source repo, not this file.`). If absent, write a **stub** with that header + a one-line "no CLAUDE.md found in source" note.
- **`DESIGN.md`** — **seed-if-present, placeholder-if-absent** (the PRD's simplest rule, and the answer to Q4). Sibling `DESIGN.md` present ⇒ `hasUi = true`, copy body under the header. Absent ⇒ `hasUi = false`, write a **placeholder stub** (header + "This repo has no design system / UI; placeholder kept so the nested tree is uniform."). Every declared repo therefore has both files.
- **`.specmanager-repo.json`** — provenance sidecar: `{ name, sourcePath, hasUi, seededAt, sourceHadClaudeMd, sourceHadDesignMd }`. **`sourcePath` is stored *relative to the meta root's parent*** — `path.relative(path.dirname(root), abs)` (e.g. `repo-1`, or `../elsewhere/repo-1` if the sibling isn't directly under `A/`) — **not** a machine-local absolute path, so the committed sidecar is portable across machines that preserve the `A/` workspace layout. This is the round-trip record (R4).

**These are plain generated files, not frontmatter `create_document` docs.** They live under `repos/`, **not** `.claude/specs/features/<slug>/<stage>/`, so they carry no doc frontmatter, never enter the `dependsOn`/staleness graph, and are not read by `buildManifest`. `create_document` is **not** used — direct `fs.writeFile`. This is deliberate: they are point-in-time mirrors of foreign context, not lifecycle artifacts, and giving them doc identity would wrongly make them gate/stale.

**`<name>` collision & nesting rule (Q1):** `<name>` defaults to `path.basename(abs)`. On a collision within a single declare set (two paths, same basename), disambiguate deterministically by prefixing the parent segment: `repos/<parent>__<basename>` for **both** colliding entries (never silently overwrite). Paths deeper than a direct `A/` sibling are accepted as-is; `<name>` is still the basename (or the disambiguated form), so the `repos/` tree stays one level deep regardless of source depth. The chosen `name` is recorded in the sidecar so re-runs are stable.

**Idempotency / re-seed policy:** seeding is **write-if-absent** at the file level. A re-run that re-declares an already-seeded repo does **not** clobber its nested `CLAUDE.md`/`DESIGN.md` (the user may have annotated the mirror). Re-run's job is set-reconciliation (R6), not refresh — consistent with init being idempotent and with "freshness = re-run" being about *adding* repos, not overwriting bodies. A future `--reseed` flag can force-refresh; out of scope for v1.

## R4 — Declared-repo registry & round-trip

**The authoritative store is the on-disk `repos/` tree itself** — the set of `repos/<name>/` directories (each with a `.specmanager-repo.json` sidecar) **is** the declared set. There is no separate authoritative list to keep in sync, which is why it survives `manifest.json` deletion (the invariant): the manifest never holds it.

- `scanDeclaredRepos(root) → DeclaredRepo[]` reads `reposDir(root)`, and for each subdir loads its `.specmanager-repo.json` (falling back to `{ name: dirname, hasUi: <DESIGN.md present> }` if the sidecar is missing, so a hand-created dir still renders). Sorted by `name`.
- **Round-trip for re-run:** because each sidecar carries `sourcePath` (relative to `A/`), a re-run knows what is already declared *and where it came from*. The stored relative path is resolved back to an absolute for any read via `path.resolve(path.dirname(root), sourcePath)`. New positional args whose resolved `name` is not already a `repos/<name>/` dir are the "additional repos" to seed (R6).
- This reuses the repo's established pattern — **frontmatter/on-disk file is authoritative, the manifest is a rebuildable cache** — applied to `repos/` instead of `features/`. We do **not** add repos to `manifest.json` (keeps the "delete manifest, lose nothing" invariant trivially true) and we do **not** invent a top-level `repos.json` registry (the per-repo sidecars already are the record, and a single registry file would be a second source of truth to drift).

## R5 — Rendering the linked repo list into the managed `CLAUDE.md` block

`renderBlock` gains a **"Declared repos"** subsection emitted **inside the existing `START`/`END` markers** — no new marker pair, so the line-anchored marker-merge in `syncClaudeMd` continues to protect native `/init` content outside the markers unchanged.

- The subsection renders only when `scanDeclaredRepos(root)` is non-empty, so single-repo projects see no new content (zero-regression on the common case).
- Each row links with a **relative path** from the meta root: `- **<name>** — [CLAUDE.md](./repos/<name>/CLAUDE.md) · [DESIGN.md](./repos/<name>/DESIGN.md)` (+ ` _(placeholder)_` when `hasUi === false`). **Links only, never inlined bodies** — the token-budget constraint; the always-loaded cost is a few lines regardless of how large the mirrors are.
- `renderBlock` is `async` already and reads the disk (`buildManifest`); adding a second async disk read (`scanDeclaredRepos`) fits the existing shape. Ordering: repo list goes after the feature table, before the `**Rules:**` line, so the lifecycle table stays primary.

## R6 — Re-run reconciliation (adding a repo later)

`init` is already idempotent and safe to re-run. v1's reconcile model is **user re-passes paths** (the PRD's default, and the answer to Q2):

1. User re-runs `specmanager-init <old paths…> <new path>` (or just the new path).
2. `declareRepos` validates each arg (R2). For each, compute `name`; if `repos/<name>/` already exists ⇒ **skip seed** (idempotent, `added:false`); if not ⇒ seed it (`added:true`).
3. `syncClaudeMd` re-renders the block from `scanDeclaredRepos`, so the newly-seeded repo appears in the linked list automatically.

No feature-diff inference in v1 — init does **not** infer newly-used repos from a shipped feature's docs/diffs (Open questions Q2 flags this as a possible v2; the arch answer is "explicit re-pass only"). This keeps init free of coupling to feature state and keeps the read grant explicit.

## core-repos-module

`core/repos.ts` — the single new module. Public surface (sketch, project style: `async`, `type: module`, no defensive over-wrapping, errors thrown for programmer faults / returned in result objects for expected per-repo failures):

```ts
export interface DeclaredRepo {
  name: string;
  sourcePath: string;   // relative to dirname(root); resolve reads via path.resolve(dirname(root), sourcePath)
  hasUi: boolean; seededAt: string;
}
export interface DeclareOutcome {
  name: string; sourcePath: string; hasUi: boolean;
  added: boolean;                    // false = already declared (re-run)
  seeded: { claudeMd: boolean; designMd: boolean };
  warnings: string[];                // e.g. "notAGitRepo", "sourceHadNoClaudeMd"
}
export interface DeclareRejection { arg: string; reason: string; }

// Validate + read-seam + write inside root. cwd = process.cwd().
export async function declareRepos(
  root: string, repoPaths: string[], cwd?: string
): Promise<{ outcomes: DeclareOutcome[]; rejected: DeclareRejection[] }>;

// Authoritative read of the on-disk declared set (drives renderBlock + re-run).
export async function scanDeclaredRepos(root: string): Promise<DeclaredRepo[]>;

// Guards (not exported unless tested directly).
function validateRepoPath(arg: string, cwd: string): { ok: true; abs: string; name: string } | { ok: false; reason: string };
function assertInsideRoot(p: string, root: string): void;   // throws if it escapes
```

`initProject` calls `declareRepos` between `writeManifest` and `syncClaudeMd`, then folds `outcomes`/`rejected` into `InitResult`. The sidecar's stored `sourcePath` is computed as `path.relative(path.dirname(root), abs)` at write time.

## Data model changes

- **No schema/manifest changes.** `Manifest` (`core/manifest.ts`), feature/doc frontmatter, and `tasks.json` are untouched. Declared repos live entirely in the `repos/` tree.
- **New file kind — the provenance sidecar** `repos/<name>/.specmanager-repo.json`:
  `{ name: string, sourcePath: string /* relative to dirname(root), e.g. "repo-1" */, hasUi: boolean, seededAt: string (ISO), sourceHadClaudeMd: boolean, sourceHadDesignMd: boolean }`. Rebuildable-tolerant: if deleted, `scanDeclaredRepos` degrades to `{ name: <dir>, hasUi: <DESIGN.md present>, sourcePath: "" }` — the repo still renders, only re-seed provenance is lost.
- **Migration:** none. Existing projects have no `repos/`; `scanDeclaredRepos` returns `[]` and the block renders as today.
- **Git-tracking:** `repos/` is committed like the rest of the managed docs (it's the browsable archive). The sidecar's relative `sourcePath` is machine-independent, so committing it is safe. It is **not** added to `.claude/specs/.gitignore` (that file scopes only the transient `.cache/`).

## Interfaces

Introduced (signatures in the project's actual style):

- MCP tool `specmanager_init` — `inputSchema` extended: `z.object({ repoPaths: z.array(z.string()).optional() })`. Returns the extended `InitResult`.
- `initProject(root = projectRoot(), opts?: { repoPaths?: string[]; cwd?: string }): Promise<InitResult>` — `InitResult` gains `declaredRepos: DeclareOutcome[]`, `rejectedRepos: DeclareRejection[]`.
- `core/repos.ts` — `declareRepos`, `scanDeclaredRepos` (signatures above).
- `core/paths.ts` — `reposDir(root = projectRoot()): string`, `repoDir(name: string, root = projectRoot()): string`.
- No new events, endpoints, or board REST routes. (The board serves the rendered `CLAUDE.md`/`repos/` via git/files; no live-sync route in v1 — event-driven refresh is an explicit non-goal.)

## Sequence / flow

**Declare & seed (`/specmanager:specmanager-init /A/repo-1 /A/repo-2`):**
1. Command → `specmanager_init` tool with `repoPaths: ["/A/repo-1", "/A/repo-2"]`.
2. `initProject` → `ensureSpecsRoot` → `migrateWalkthroughs` → `writeManifest` (unchanged).
3. `declareRepos(root, repoPaths, cwd)`: per path → `validateRepoPath` (exists/dir; git warn) → `name` (+ collision disambiguation) → read seam (`CLAUDE.md`, `DESIGN.md`) → compute `sourcePath = path.relative(dirname(root), abs)` → `assertInsideRoot` → write `repos/<name>/{CLAUDE.md,DESIGN.md,.specmanager-repo.json}` (write-if-absent).
4. `syncClaudeMd(root)` → `renderBlock` now also calls `scanDeclaredRepos` and emits the linked "Declared repos" subsection inside the markers.
5. `syncDesignMd(root, {mode:"init"})` (unchanged — meta repo's own DESIGN.md).
6. Tool returns; command runs native `/init` (writes outside markers, unchanged) and reports both regions + per-repo seed outcomes.

**Browse:** orchestrator reads meta `CLAUDE.md` → sees "Declared repos" links → opens `./repos/<name>/CLAUDE.md` — no `cd` out of the meta repo.

**Reconcile (re-run with a new path):** steps 1–4 repeat; already-seeded repos skip (idempotent), the new one seeds and appears in the re-rendered list.

## Failure & edge cases

| Case | Handling |
|------|----------|
| Arg path missing / not a directory | Rejected with reason; other repos still seed; reported in `rejectedRepos`. Never aborts init. |
| Arg is not a git repo | Seed anyway, `warnings:["notAGitRepo"]` — explicit grant honoured. |
| Sibling has no `CLAUDE.md` | Seed a stub `CLAUDE.md`; `sourceHadClaudeMd:false`. |
| Sibling has no `DESIGN.md` (non-UI repo) | Placeholder `DESIGN.md`, `hasUi:false` — the decided rule. |
| Basename collision within a declare set | Both disambiguated to `<parent>__<basename>`; neither overwrites. |
| Path deeper than a direct sibling | Accepted; `<name>` = basename; `repos/` stays one level deep; `sourcePath` becomes a `../…` relative form. |
| Re-declaring an already-seeded repo | `added:false`, nested bodies **not** clobbered (preserves user annotations). |
| Symlink / traversal in a crafted basename | `name` is `path.basename` (no separators) + `assertInsideRoot` guard ⇒ write cannot escape root. |
| Sibling repo unreadable (EACCES) | Treated as "absent" for that file ⇒ stub/placeholder; warning recorded; never throws. |
| `repos/<name>/` exists but sidecar deleted | `scanDeclaredRepos` degrades gracefully (name from dir, `hasUi` from `DESIGN.md` presence). |
| `manifest.json` deleted | No effect — declared set is the `repos/` tree, not the manifest. |
| No `repoPaths` passed | Zero behaviour change; block renders with no "Declared repos" subsection. |

## Conventions used

- **Project-root from env only** (`SPECMANAGER_PROJECT_DIR ?? CLAUDE_PROJECT_DIR ?? cwd`) — writes resolved via `paths.ts` helpers; new `reposDir`/`repoDir` follow the same pattern.
- **Line-anchored marker-merge reused** — repo list lives inside the existing `<!-- specmanager:start/end -->` region; native `/init` content outside is never touched.
- **On-disk/frontmatter is authoritative; manifest is a rebuildable cache** — declared repos are the `repos/` tree; nothing added to the manifest (invariant preserved).
- **Idempotent, non-destructive init** — re-run reconciles the set without clobbering bodies, mirroring `syncClaudeMd`/`syncDesignMd` idempotency.
- **`type: module`, Node 20+, TS strict, `zod` input schemas** — new tool arg and module match.
- **Latest APIs, no defensive over-engineering** — plain `node:fs/promises`/`node:path`; expected per-repo failures returned in result objects, programmer faults thrown; one guard (`assertInsideRoot`) because the write boundary is the actual safety-critical invariant.
- **Self-test script style** — hand-rolled `selftest-repos.ts` in `dist/`, run by name (matches `selftest-*` suite), not a test-runner.

## Open questions / risks — PRD's six, answered

1. **`<name>` collisions / nesting (Q1):** Decided — `name` = basename; on same-set collision, both become `<parent>__<basename>`; deeper paths keep basename, `repos/` stays flat. Chosen name persisted in the sidecar for stability. *Risk:* cross-run collision (a new path collides with an already-seeded different repo) — v1 detects the existing dir and, if the sidecar's `sourcePath` differs, reports a conflict and skips rather than overwrite; planner to confirm this conflict-report UX.
2. **Detecting "additional repo used" on re-run (Q2):** Decided for v1 — **user re-passes paths**; no feature-diff inference. Inference (init reads a shipped feature's touched paths) is a plausible v2 but couples init to feature state; flagged, not built.
3. **Live auto-load (Q3):** Decided — **links only**, passive reference. Nested files won't auto-load from the meta root; that's accepted for v1 per the token-budget constraint. Inlining/`@`-import deferred pending the Token-usage-optimisation tension.
4. **UI detection for the DESIGN.md rule (Q4):** Decided — **seed-if-`DESIGN.md`-present, placeholder-if-absent** (simplest; no heuristic scan of the foreign tree, which also keeps the read seam narrow). `hasUi` is purely "source had a `DESIGN.md`."
5. **Redundant sub-repo files (Q5):** Confirmed **leave in place** — specmanager never writes into siblings; no delete/gitignore. Non-goal upheld.
6. **Path validation & read seam (Q6):** Decided — accept any **existing directory** (relative resolved against `cwd`, absolute as-is); git-repo is a *warning* not a gate (supports worktrees/submodules/`.git`-file). Read seam = two file reads per repo (`CLAUDE.md`/`DESIGN.md`), no tree walk; write seam = `repos/<name>/` under root only, enforced by `assertInsideRoot`. Read may leave the root; write structurally cannot.

**Additional risks for the planner:**
- **`renderBlock` now does a second disk scan** (`scanDeclaredRepos`) on every `syncClaudeMd` (which fires on many doc/status events). It's a shallow `readdir` of `repos/` — cheap — but confirm no hot-path concern given the auto-sync listeners.
- **`cwd` correctness:** `declareRepos` resolves relative args against `process.cwd()`. The MCP server's cwd must be the workspace the user typed from; if the server runs with a different cwd, relative args would misresolve. Prefer users pass absolute paths, or thread an explicit `cwd` from the tool context; planner to verify what cwd the MCP process has.
- **`.specmanager-repo.json` in git (resolved):** committed alongside the mirrors. `sourcePath` is stored **relative to the meta root's parent** (`path.relative(path.dirname(root), abs)`), not machine-local absolute, so it is safe to commit and portable across machines that keep the same `A/` workspace layout. **Anchor assumption confirmed:** the meta root is a direct child of `A/`, so `path.dirname(root)` is the workspace anchor and the relative base is stable. *Residual note for the planner:* a sibling outside `A/` still yields a `../…` traversal in `sourcePath` — valid, just less tidy.
