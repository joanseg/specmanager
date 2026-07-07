---
id: prd-multi-repo-nested-docs-claude-md-design-md-031
featureId: feat-multi-repo-nested-docs-claude-md-design-md
stage: prd
status: draft
stale: false
title: Multi-repo nested docs (CLAUDE.md / DESIGN.md) PRD
dependsOn: []
basedOn: {}
generatedBy: human
version: 2
createdAt: '2026-06-30T09:41:18.950Z'
updatedAt: '2026-07-06T10:40:34.593Z'
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

**v1 goal — declare-and-seed, CLAUDE.md only, linked from the meta block** (the interview's recommended wedge):

- The user **declares the involved sibling repos** (at meta-repo setup or via a dedicated command).

- specmanager **records the list in the managed meta** **`CLAUDE.md`** **block, with links** to each nested file.

- specmanager **seeds one nested** **`repos/<name>/CLAUDE.md`** **per declared repo**, importing that sub-repo's existing `CLAUDE.md` if present (empty stub otherwise).

This delivers the centralised, browsable, **linked** archive immediately and defers every "both" that carries real cost or ambiguity.

**Non-goals (explicitly cut from v1, deferred until the nested structure + linking proves useful):**

- Per-repo **`DESIGN.md`** nesting — semantics unclear for code repos with no design system; weaker half of the idea.

- **Automatic feature-driven updates** — keeping nested files current as features ship.

- **Auto-detection** of repos newly touched by a shipped feature.

- **Deleting / gitignoring** the now-redundant sub-repo files.

- **Inlining** nested content into the always-loaded meta `CLAUDE.md` (links only in v1 — see Constraints).

## Success metrics

- After declare-and-seed, the meta repo contains `repos/<name>/CLAUDE.md` for **100% of declared repos**, each seeded from the sub-repo's existing `CLAUDE.md` when one exists.

- The managed meta `CLAUDE.md` block lists every declared repo with a **working relative link** to its nested file.

- **Qualitative:** the orchestrator can answer "what is `code-repo-1`?" from the meta repo alone, without opening any sibling repo's files.

- **Zero regressions:** native `/init` content and existing managed blocks (`CLAUDE.md`, `docs/DESIGN.md`) are untouched outside their markers; deleting `manifest.json` still loses nothing.

## Constraints & assumptions

- **Single-project-root invariant (the hard one).** specmanager resolves one project root from the env (`SPECMANAGER_PROJECT_DIR` ?? `CLAUDE_PROJECT_DIR` ?? cwd) and writes **only within it**. The sibling repos live in `A/`, **outside** that root. Seeding _reads_ from those siblings — crossing the managed boundary. This is a **genuine design change, not a tweak**; the architecture must define how specmanager is permitted to read sibling `A/` repos at all (read-only, path-validated). v1 **writes stay inside the meta root** (`repos/<name>/CLAUDE.md`); only reads reach outside, and only to seed.

- **Auto-load reality vs "live context."** Claude Code only auto-reads `CLAUDE.md` from the root and up-tree from cwd. Nested `repos/<name>/CLAUDE.md` files **will not auto-load** while orchestrating from the meta root. v1 makes them reachable via **links** in the always-loaded meta block — passive reference, not auto-load.

- **Token-budget tension.** Making nested files truly live means linking or inlining them into the always-loaded meta `CLAUDE.md`, which **inflates the context budget** the **Token usage optimisation** feature is actively trying to shrink. v1 deliberately ships **links only** (a few lines), not inlined bodies, to keep the always-loaded cost near-flat. Inlining is a non-goal pending that tension's resolution.

- **Marker-merge reuse.** The repo list goes inside the existing line-anchored managed region (`<!-- specmanager:start --> / <!-- specmanager:end -->`) via `core/claude-md.ts`, so native `/init` content outside the markers is never clobbered. Nested `repos/<name>/CLAUDE.md` files are **whole new managed files**, not marker-merges into sub-repo files.

- **Assumption (mark in arch):** nested path convention is `repos/<name>/CLAUDE.md`, `<name>` mirroring the sibling repo's directory name. Open below.

- **Assumption:** if a declared repo has no existing `CLAUDE.md`, seed an empty stub rather than skip it.

## High-level user flows

**Declare & seed (v1 primary):**

- User declares sibling repos (e.g. `code-repo-1`, `code-repo-2`) at meta-repo setup or via a dedicated command, giving their paths in `A/`.

- specmanager validates each path is a readable sibling repo, reads its `CLAUDE.md` if present.

- specmanager writes `repos/<name>/CLAUDE.md` per repo (seeded content or stub).

- specmanager updates the managed meta `CLAUDE.md` block with the repo list + relative links to each nested file.

**Browse / use:**

- Orchestrator reads the meta `CLAUDE.md`, sees the linked repo list, follows a link to `repos/<name>/CLAUDE.md` for per-repo context — all without leaving the meta repo.

**Re-declare (adding a repo):**

- User declares an additional repo; specmanager seeds its nested file and adds it to the linked list. (Manual only in v1; auto-detection of feature-touched repos is a non-goal.)

## Open questions

1. **Nested path convention** — `repos/<name>/CLAUDE.md` confirmed? How is `<name>` derived from the sibling — directory basename, or user-supplied label? Answer: directory basename
1. **Feature→repo detection** (deferred feature, but decide the seam now) — manual per-feature declaration vs diff/path inference. v1 is manual; does the architecture need to leave room for inference later? Answer: new repos can be added on new features while doing prd or architecture.
1. **Live auto-load** — is passive link-reference acceptable for v1, or is a stronger mechanism (e.g. an `@`-import / inline) required despite the token cost? Default: links only.
1. **DESIGN.md per repo** — keep, drop, or redefine? Cut from v1; flag whether it ever has meaning for code repos.
1. **Redundant sub-repo files** — leave / gitignore / delete? Cut from v1 (leave them); confirm "leave" is acceptable.
1. **Reaching outside the project root** — what exactly is specmanager allowed to do in sibling `A/` repos? v1 says read-only, seed-only, path-validated. Architecture must specify how the root-resolution invariant is relaxed without letting writes escape the meta root.
