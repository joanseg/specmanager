---
description: Scaffold .claude/specs/ in the current project and write the managed SpecManager block into CLAUDE.md.
---

Initialize this project for SpecManager.

## Declaring sibling repos (multi-repo)

Optional, a monorepo/meta-repo convenience. Pass one or more repo paths after the command:

```
/specmanager:specmanager-init /path-to/repo-1 /path-to/repo-2
```

- **The paths ARE the read grant.** Passing a path authorizes init to read
  that sibling repo (path-validated, read-only). **Every write stays inside
  this project's meta root** — init never writes into the sibling repos.
- **Recommend absolute paths.** Relative args resolve against the MCP
  server process's `process.cwd()`, which may differ from the directory you
  typed the command in — absolute paths remove that ambiguity.
- **What gets created**, per declared repo, under `repos/<name>/`:
  - `CLAUDE.md` — the sibling's `CLAUDE.md` seeded verbatim (read-only mirror
    banner prepended), or a stub if the sibling has none.
  - `DESIGN.md` — seeded from the sibling's `DESIGN.md` if present, otherwise
    a placeholder (the repo has no UI/design system).
  - `.specmanager-repo.json` — the provenance sidecar (source path, `hasUi`,
    seeded-at). This — not the manifest — is the authoritative record.
  - Plus a linked **"Declared repos"** subsection inside the managed CLAUDE.md
    block (links only, never inlined bodies — token budget).
- **Reconcile-on-re-run.** Re-running init with paths reconciles the set:
  newly-passed repos are added; already-declared repos keep their nested
  mirror bodies **byte-for-byte** (write-if-absent — any annotations you made
  to a mirror survive, and re-running with the same path is how you refresh a
  mirror). A path whose resolved name collides with an existing
  repo declared from a *different* source is reported as a conflict and
  skipped, never overwritten.

## Steps

1. Call the **`specmanager_init`** MCP tool first (idempotent — safe to
   re-run). This creates `.claude/specs/` (and `features/`) + `manifest.json`
   (the rebuildable board index), writes the managed CLAUDE.md block between
   the `<!-- specmanager:start -->` / `<!-- specmanager:end -->` markers
   (creating `CLAUDE.md` if missing), and creates/refreshes `./docs/DESIGN.md`
   — the design-system spec in the Google Stitch DESIGN.md format, tokens
   inferred from the existing UI source, managed region between
   `<!-- specmanager:design:start -->` / `<!-- specmanager:design:end -->`.
   If the user passed sibling repo paths, forward them as the tool's
   `repoPaths` argument (e.g. `repoPaths: ["/path-to/repo-1", "/path-to/repo-2"]`)
   so init declares and seeds them in the same call.
2. After it returns, run the native **`/init`** slash command in-session to
   populate CLAUDE.md's general codebase-doc region. `/init` is a native
   interactive command the agent runs in-session — it is not a server/MCP call.
   It writes **only outside** the SpecManager markers, so it never clobbers the
   managed block (the marker-merge in `core/claude-md.ts` is line-anchored, so
   the regions are disjoint). Running `specmanager_init` first means the markers
   already exist when `/init` fills the surrounding codebase docs.
3. Report what changed across **both** regions:
   - From `specmanager_init`: which directories were created, whether the
     managed CLAUDE.md block was created/updated, and whether `./docs/DESIGN.md`
     was created/updated.
   - If repos were declared, summarise the per-repo seed outcomes from the
     tool's `declaredRepos` (each entry's `name`, whether it was freshly
     `added`, whether `CLAUDE.md`/`DESIGN.md` were `seeded` this run, `hasUi`,
     and any `warnings` such as `notAGitRepo`), **and** list any `rejectedRepos`
     with their `arg` + `reason` (e.g. `notFound`, `notADirectory`, `conflict`)
     — a rejected path never aborts the others.
   - From `/init`: that the general codebase docs in CLAUDE.md (outside the
     markers) were (re)generated — so the user need not run `/init` separately.
   - That Design is an optional stage between Architecture and Plan
     (`/specmanager-design <feature>`); a `draft` design brief keeps the Plan
     gate closed until it is approved or deleted.

## Don't

- Don't hand-edit content **between** the `<!-- specmanager:start -->` /
  `<!-- specmanager:end -->` markers in `CLAUDE.md` — that managed block is
  owned by `sync_claude_md`.
- Don't edit content **between** the design markers in `./docs/DESIGN.md` by
  hand — SpecManager regenerates it after every feature ships. Hand-edits
  belong above the start marker or below the end marker.
- Don't create features here — point the user at `/specmanager-prd`.
