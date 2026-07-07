---
id: prd-multi-repo-nested-docs-claude-md-design-md-030
featureId: feat-multi-repo-nested-docs-claude-md-design-md
stage: prd
status: draft
stale: false
title: Multi-repo nested docs (CLAUDE.md / DESIGN.md) interview
dependsOn: []
basedOn: {}
generatedBy: agent
version: 1
kind: interview
createdAt: '2026-06-30T09:39:43.825Z'
updatedAt: '2026-06-30T09:39:43.825Z'
---
_Mode: builder / design-thinking. Forcing questions from the gstack office-hours method (github.com/garrytan/gstack/tree/main/office-hours). 7 of 7 plan areas touched; wedge & success criteria are the thinnest._

## Extracted
- **Setup:** a workspace folder `A/` holds sibling git repos. One is the **meta repo** (orchestrates cross-repo changes) and is the only one running specmanager (`.claude/specs/`, managed `CLAUDE.md`, `docs/DESIGN.md`). The others (`code-repo-1`, `code-repo-2`, …) are **plain repos** with no specmanager.
- **Pain:** the meta repo's managed docs are too **lean**. They don't carry per-repo context, so the orchestrator can't rely on them alone.
- **Goal:** centralise *all* documentation in the meta repo via **nested per-repo `CLAUDE.md` and `DESIGN.md`** (e.g. `meta-repo/repos/repo-1/CLAUDE.md`), mirroring the sibling repos. Once centralised, each sub-repo's own `CLAUDE.md`/`DESIGN.md` is treated as **redundant**.
- **Discovery/mapping:** the user **declares the involved repos at meta-repo setup**; specmanager records them in the managed `CLAUDE.md` and creates a nested file per repo. If a shipped feature **touches a new repo**, that repo is added too.
- **Content source (both):** (a) **seed** by importing each sub-repo's existing files into the nested tree, then (b) **keep current** as features ship and touch a repo.
- **Role (both):** a browsable centralised archive **and** live context — implying the meta `CLAUDE.md` must link to / inline the nested files so they're reachable.

## Critique
- **"Both" everywhere = unbounded scope.** Every fork (seed vs feature-driven, archive vs live, CLAUDE.md vs DESIGN.md) was answered "both." That's a big-bang feature unless deliberately sliced.
- **Auto-load reality bites the "live context" wish.** Claude Code only auto-reads `CLAUDE.md` from the root and up-tree from cwd. Nested `meta-repo/repos/repo-1/CLAUDE.md` files **won't** auto-load while orchestrating from the meta root. Making them live means the always-loaded meta `CLAUDE.md` must link/inline them — which **inflates the token budget** already targeted by the "Token usage optimisation" card.
- **Feature→repo detection is unspecified.** "If a feature touches a new repo, add it" implies either diff/path inference (not built) or a manual per-feature declaration. Unresolved.
- **DESIGN.md doesn't obviously nest.** Today `docs/DESIGN.md` is a *design-system* spec refreshed only on `feature.shipped`. Most code repos have no design system — what a per-repo `DESIGN.md` even means is unclear; this half may be weaker than the CLAUDE.md half.
- **Architectural reach.** specmanager resolves a single project root from the env and writes only within it. The sibling repos live **outside** that root in `A/`. Seeding *from* them (and the redundancy/deletion of their files) crosses the managed boundary — a genuine design change, not a tweak.

## Recommended wedge
**Declare-and-seed, CLAUDE.md only, linked from the meta block.**
- At setup (or a new command), user lists the involved sibling repos.
- specmanager records the list in the managed meta `CLAUDE.md` block **with links** to each nested file, and **seeds** one nested `repos/<name>/CLAUDE.md` per repo (importing the sub-repo's existing `CLAUDE.md` if present).
- **Explicitly cut from v1:** per-repo `DESIGN.md` nesting; automatic feature-driven updates; auto-detection of newly-touched repos; deleting/ignoring the redundant sub-repo files. Those land once the nested structure + linking proves useful.

This gives the centralised, browsable, linked archive immediately, and defers every "both" that carries real cost or ambiguity.

## Unresolved
- Exact nested path convention (`repos/<name>/CLAUDE.md`? mirror sibling names how?).
- How a feature's **touched repos** are detected — manual declaration vs diff inference.
- Whether **live auto-load** is truly required, given the token-budget tension — link, inline, or accept passive-reference.
- **DESIGN.md** semantics per repo — keep, drop, or redefine for v1.
- Fate of the **redundant sub-repo files** — leave, gitignore, or delete.
- Reaching repos **outside** the managed project root — how specmanager is allowed to read sibling `A/` repos at all.
