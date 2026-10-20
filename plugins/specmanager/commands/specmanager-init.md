---
description: Scaffold .claude/specs/ in the current project and write the managed SpecManager block into CLAUDE.md.
argument-hint: "[/abs/path/to/repo ...]"
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

## Recommended plugins

SpecManager's agents detect these and degrade silently without them. Init offers
the missing ones; it never requires them.

| Plugin id | Used by | Why | Without it |
|---|---|---|---|
| `superpowers@claude-plugins-official` | builder | TDD, systematic-debugging and two-stage-review hand-offs | plain execution loop |
| `frontend-design@claude-plugins-official` | builder (UI tasks), designer | visual-judgment hand-off, still grounded in `docs/DESIGN.md` tokens | DESIGN.md-only fallback |
| `context7@claude-plugins-official` | all writers and builder | current library docs ("use latest APIs") | model memory only |
| `playwright@claude-plugins-official` | reviewer UI check (web) | browser MCP tools to drive the happy path | reviewer judges from the diff |

The playwright row also counts as present when this session already has
`mcp__chrome-devtools__*` tools. Never recommend both.

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
2. **Plugins.** Run `claude plugin list --json` via Bash and match each table id
   (name and marketplace; versions are not checked). Any enabled entry, in any
   scope, counts as present.
   - Installed but `enabled: false`: report it with `claude plugin enable <id>`.
     Don't offer it for install or enable it yourself.
   - Nothing missing: note "all recommended plugins present" and ask nothing.
   - Missing: ask one multi-select question listing each missing plugin with its
     "Used by / Why", default none. Install only the plugins the user picked,
     one at a time, with `claude plugin install <id>`. Never pass `-y` or
     `--accept-command`. A failed install does not stop the rest; record each
     outcome (installed, or failed with the CLI message) and never retry.
   - After any install, tell the user to run `/reload-plugins` (or restart)
     before the new skills and tools appear.
   - Can't ask (headless or non-interactive run): install nothing; report the
     missing plugins with their `claude plugin install <id>` commands.
   - `claude` not available (command not found, or another host): list the
     missing plugins as "not installable here" with their ids; install nothing.
   - `plugin list` fails or its output can't be parsed: report it once, skip
     this step, and continue.
3. **Repos** (only when no paths were passed). List the tool's `knownRepos`
   (`name` + `sourcePath`, or "none declared"), then ask whether this project
   should work with other repos.
   - On yes, collect their **absolute** paths and call `specmanager_init` again
     with `repoPaths` (idempotent; existing mirrors are kept). On no, skip.
   - Can't ask (headless or non-interactive run): list `knownRepos` and skip.
4. Run the native **`/init`** slash command in-session to
   populate CLAUDE.md's general codebase-doc region. `/init` is a native
   interactive command the agent runs in-session — it is not a server/MCP call.
   It writes **only outside** the SpecManager markers, so it never clobbers the
   managed block (the marker-merge in `core/claude-md.ts` is line-anchored, so
   the regions are disjoint). Running `specmanager_init` first means the markers
   already exist when `/init` fills the surrounding codebase docs.
5. Report what changed across **both** regions:
   - From `specmanager_init`: which directories were created, whether the
     managed CLAUDE.md block was created/updated, and whether `./docs/DESIGN.md`
     was created/updated.
   - If repos were declared, summarise the per-repo seed outcomes from the
     tool's `declaredRepos` (each entry's `name`, whether it was freshly
     `added`, whether `CLAUDE.md`/`DESIGN.md` were `seeded` this run, `hasUi`,
     and any `warnings` such as `notAGitRepo`), **and** list any `rejectedRepos`
     with their `arg` + `reason` (e.g. `notFound`, `notADirectory`, `conflict`)
     — a rejected path never aborts the others.
   - Repos: the `knownRepos` listed, and any newly declared in step 3.
   - Plugins: found, missing, offered, installed, declined, failed (with the
     CLI message) and installed-but-disabled (with the enable command), plus
     the `/reload-plugins` reminder if anything was installed.
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
