---
id: prd-multi-repo-nested-docs-claude-md-design-md-031
featureId: feat-multi-repo-nested-docs-claude-md-design-md
stage: prd
status: approved
stale: false
title: Multi-repo nested docs (CLAUDE.md / DESIGN.md) PRD
dependsOn: []
basedOn: {}
generatedBy: human
version: 4
createdAt: '2026-06-30T09:41:18.950Z'
updatedAt: '2026-07-13T14:29:15.002Z'
---
## Problem

A workspace folder `A/` holds sibling git repos. One is the **meta repo** that orchestrates cross-repo changes and is the _only_ repo running specmanager (`.claude/specs/`, managed `CLAUDE.md`, `docs/DESIGN.md`). The others (`code-repo-1`, `code-repo-2`, …) are **plain repos** with no specmanager, sitting beside the meta repo (siblings on disk, not nested).

The meta repo's managed docs are too **lean**: they carry no per-repo context. When the orchestrator works a cross-repo change from the meta root, the meta `CLAUDE.md` doesn't tell it what each sub-repo is, so it has to leave the meta repo and consult each sub-repo's own files. The meta repo is supposed to be the single place you orchestrate from, but it isn't self-sufficient.

## Users & jobs-to-be-done

| User                                                           | Job                                                                                                                                |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Solo dev orchestrating a multi-repo workspace from a meta repo | "Work a cross-repo change from the meta root with enough per-repo context that I don't have to go read each sibling repo's files." |
| Same dev, later                                                | "Browse one centralised, current archive of every involved repo's context instead of `cd`-ing around the workspace."               |

Single-user, fully local — same operating model as the rest of specmanager.

## Goals / non-goals

**v1 goal — declare-by-path at `init`, seed nested docs, linked from the meta block:**

- The user **declares the involved sibling repos by passing their paths to** **`specmanager-init`**:

  ```
  /specmanager:specmanager-init /path-to/repo-1 /path-to/repo-2
  ```

  The paths the user hands to `init` _are_ the authorization to read those repos (see Constraints — this is how the single-root invariant is relaxed without guessing).

- specmanager **records the declared repos in the managed meta** **`CLAUDE.md`** **block, with links** to each nested file.

- For each declared repo, specmanager **seeds nested** **`repos/<name>/CLAUDE.md`** **and** **`repos/<name>/DESIGN.md`**, importing that sub-repo's existing `CLAUDE.md` / `DESIGN.md` if present. A repo **without a UI** gets a **placeholder** **`DESIGN.md`** (empty stub); its `CLAUDE.md` still seeds from source or a stub.

- **Re-running** **`specmanager-init`** **reconciles the set.** Fired again (e.g. at the end of a feature), it picks up any **additional repo that has been used** but isn't yet declared, and seeds its nested files too — so the centralised archive stays complete as the workspace grows.

This delivers the centralised, browsable, **linked** archive of both doc types immediately, driven entirely by the one command the user already runs to set the project up.

**Non-goals (explicitly cut from v1):**

- **Continuous feature-driven sync** — auto-refreshing every nested file on every `feature.shipped`. v1's freshness mechanism is **re-running** **`init`**, not event-driven sync.

- **Deleting / gitignoring** the now-redundant sub-repo files — leave them in place.

- **Inlining** nested content into the always-loaded meta `CLAUDE.md` — links only in v1 (see Constraints).

- **Writing into the sibling repos** — specmanager only ever _reads_ them; all writes stay inside the meta root.

## Success metrics

- After `init` with repo paths, the meta repo contains `repos/<name>/CLAUDE.md` **and** `repos/<name>/DESIGN.md` for **100% of declared repos**, each seeded from the sub-repo's existing file when one exists (placeholder `DESIGN.md` for non-UI repos).

- The managed meta `CLAUDE.md` block lists every declared repo with a **working relative link** to its nested files.

- Re-running `init` after a feature that touched a new repo results in that repo being **declared, linked, and seeded** with no manual file edits.

- **Qualitative:** the orchestrator can answer "what is `code-repo-1`?" from the meta repo alone, without opening any sibling repo's files.

- **Zero regressions:** native `/init` content and existing managed blocks (`CLAUDE.md`, `docs/DESIGN.md`) are untouched outside their markers; deleting `manifest.json` still loses nothing.

## Constraints & assumptions

- **Single-project-root invariant — relaxed by explicit paths, not by scanning.** specmanager resolves one project root from the env (`SPECMANAGER_PROJECT_DIR` ?? `CLAUDE_PROJECT_DIR` ?? cwd) and writes **only within it**. The declared sibling repos live in `A/`, **outside** that root. v1's rule: the **user-supplied paths passed to** **`init`** **are the read grant** — specmanager reads those paths (path-validated, read-only) to seed, and never writes outside the meta root. It does **not** auto-scan `A/`; a repo is reachable only because the user named it. This is still a genuine design change; the architecture must specify the read seam and the path validation.

- **Auto-load reality vs "live context."** Claude Code only auto-reads `CLAUDE.md` from the root and up-tree from cwd. Nested `repos/<name>/CLAUDE.md` files **will not auto-load** while orchestrating from the meta root. v1 makes them reachable via **links** in the always-loaded meta block — passive reference, not auto-load.

- **Token-budget tension.** Making nested files truly live means linking or inlining them into the always-loaded meta `CLAUDE.md`, which **inflates the context budget** the **Token usage optimisation** feature is actively trying to shrink. v1 ships **links only** (a few lines), not inlined bodies, to keep the always-loaded cost near-flat. Inlining is a non-goal pending that tension's resolution.

- **Marker-merge reuse.** The repo list goes inside the existing line-anchored managed region (`<!-- specmanager:start --> / <!-- specmanager:end -->`) via `core/claude-md.ts`, so native `/init` content outside the markers is never clobbered. Nested `repos/<name>/CLAUDE.md` and `repos/<name>/DESIGN.md` are **whole new managed files**, not marker-merges into sub-repo files.

- **DESIGN.md — placeholder for non-UI repos (decided).** A per-repo `DESIGN.md` only has real meaning for repos with a UI / design system. For a UI repo, seed the sub-repo's existing `DESIGN.md` if present. For a **repo without a UI**, write a **placeholder** `DESIGN.md` (empty stub) — the nested tree stays uniform (every declared repo has both files) without inventing design content that doesn't exist.

- **Assumption (mark in arch):** nested path convention is `repos/<name>/CLAUDE.md`, `<name>` = the sibling repo's **directory basename**.

## High-level user flows

**Declare & seed (v1 primary):**

- User runs `specmanager-init /path-to/repo-1 /path-to/repo-2`.

- specmanager validates each path is a readable sibling repo, reads its `CLAUDE.md` / `DESIGN.md` if present.

- specmanager writes `repos/<name>/CLAUDE.md` and `repos/<name>/DESIGN.md` per repo (seeded content, or placeholder `DESIGN.md` for non-UI repos).

- specmanager updates the managed meta `CLAUDE.md` block with the repo list + relative links to each nested file.

**Browse / use:**

- Orchestrator reads the meta `CLAUDE.md`, sees the linked repo list, follows a link to `repos/<name>/CLAUDE.md` for per-repo context — all without leaving the meta repo.

**Reconcile after a feature (adding a repo):**

- A feature turns out to touch a repo not yet declared.

- User re-runs `specmanager-init` (optionally naming the new path); it detects the additional repo, seeds its nested files, and adds it to the linked list. No manual file editing.

## Open questions

1. **`<name>` collisions / nesting** — directory basename is confirmed, but two declared repos could share a basename, or a path could sit deeper than a direct `A/` sibling. How does `init` disambiguate? (label suffix? full relative path under `repos/`?)
1. **Detecting "an additional repo has been used"** on a re-run of `init` — does the user re-pass the full path list, or does `init` infer newly-used repos from the feature's docs/diffs? v1 can be "user re-passes paths"; flag whether inference is wanted.
1. **Live auto-load** — is passive link-reference acceptable for v1, or is a stronger mechanism (e.g. an `@`-import / inline) required despite the token cost? Default: links only.
1. **UI detection for the DESIGN.md rule** — how does `init` decide a repo "has no UI" to choose placeholder vs seed? (presence of a source `DESIGN.md`? a heuristic? always seed-if-present, placeholder-if-absent — simplest.)
1. **Redundant sub-repo files** — leave / gitignore / delete? Cut from v1 (leave them); confirm "leave" is acceptable.
1. **Path validation & read seam** — precisely what `init` accepts as a valid repo path (must be a git repo? must exist? relative vs absolute?), and how the read-only reach outside the meta root is implemented without letting any write escape.
