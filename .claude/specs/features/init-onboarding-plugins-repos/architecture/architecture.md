---
id: arch-init-onboarding-plugins-repos-030
featureId: feat-init-onboarding-plugins-repos
stage: architecture
status: approved
stale: false
title: 'Init onboarding: plugins & repos architecture'
dependsOn:
  - prd-init-onboarding-plugins-repos-045
basedOn:
  prd-init-onboarding-plugins-repos-045: 2
generatedBy: agent
version: 3
createdAt: '2026-10-20T15:43:48.376Z'
updatedAt: '2026-10-20T19:19:28.154Z'
---
## Summary

Implements `prd-init-onboarding-plugins-repos-045` (v1) with the smallest design that fits: almost all of G1–G3 and G5 is **prompt work in `plugins/specmanager/commands/specmanager-init.md`** (it already runs in the main session, so it can ask the user and run Bash). Server changes are two small, pure, network-free edits in `server/src/core/`: (a) `initProject` also returns the repos already declared (`knownRepos`, from the existing `scanDeclaredRepos`), and (b) the managed-block stage label and plan-stage note are derived from the documents by a new pure function instead of the never-advanced `currentStage` field (G4). No new MCP tool, no hook, no packaging change, no UI change, no model/network call from `server/`.

No design doc exists for this feature (UI-facing: no), so there is no design grounding.

## Affected components

| Path | Change |
|---|---|
| `plugins/specmanager/commands/specmanager-init.md` | Rewritten steps: plugin detection/offer (G1, G2), repo question when no args (G3), extended report (G5). Adds frontmatter `argument-hint: "[/abs/path/to/repo ...]"` (every other command has one; init does not today). Recommended-plugin table lives here. |
| `plugins/specmanager/server/src/core/init.ts` | `InitResult` gains `knownRepos: DeclaredRepo[]` (filled by `scanDeclaredRepos(root)` after `declareRepos`). |
| `plugins/specmanager/server/src/core/claude-md.ts` | New exported pure `furthestStage(documents)`; `currentStageLabel` and `notesFor` use it and stop reading `currentStage`. |
| `plugins/specmanager/server/src/selftest.ts` | New cases next to 11.4 (stage label) — covers M4. |
| `plugins/specmanager/server/src/selftest-repos.ts` | One assertion that `knownRepos` lists previously declared repos when init runs with no paths (M3). |
| `plugins/specmanager/server/src/selftest-prompts.ts` | New invariant(s) for the init command's consent rule (see `selftest-prompts-invariant`). No existing INV lists `commands/specmanager-init.md` today (verified by grep), so no existing min/max moves. |
| `plugins/specmanager/server/dist/**` | Rebuilt and committed (release rule). |
| `plugins/specmanager/.claude-plugin/plugin.json` | `version` 1.2.0 → 1.3.0 (minor: feature). |

Untouched on purpose: `core/repos.ts` validation/seeding (PRD non-goal), `core/features.ts` (the `currentStage: "prd"` write at line 75 stays), `core/types.ts` / `core/manifest.ts` / `ui/src/types.ts` (field stays in the schema and manifest — see Q6 decision), every `agents/*.md` (no tool-list changes), `hooks/`, `.mcp.json`, `ui/`.

## Data model changes

- **No frontmatter, `feature.json`, `tasks.json` or `manifest.json` schema change.** `currentStage` remains in `feature.json`, `FeatureSchema` (`core/types.ts:43`, `STAGE.default("prd")`), the manifest and `ui/src/types.ts:96`; it simply stops being read by `claude-md.ts`. Because the label is now computed from document frontmatter (via `buildManifest` → `listDocuments`), it survives a manifest delete + rebuild (frontmatter is authoritative).
- **`InitResult` (MCP response of `specmanager_init`)** is additive: `knownRepos: DeclaredRepo[]` (`{ name, sourcePath, hasUi, seededAt }`, existing type from `core/repos.ts`). Existing fields unchanged, so `declaredRepos` / `rejectedRepos` behave byte-for-byte as today.
- No migration.

## Interfaces

**Core (TS strict, ESM, `.js` import suffixes as in the rest of `core/`):**

```ts
// core/claude-md.ts
export function furthestStage(
  documents: Array<{ stage: string; status: string; kind?: string }>
): { stage: Stage; status: "draft" | "approved" } | null;

// core/init.ts
export interface InitResult { /* existing fields */ knownRepos: DeclaredRepo[] }
```

`furthestStage` rules (resolves PRD Q5):
- Order is `STAGE` order from `core/types.ts`: `prd < architecture < design < plan < walkthrough`.
- Interview docs (`kind === "interview"`) are excluded, as `currentStageLabel` already does.
- **Draft docs count** — a drafted Plan shows `Plan (draft)`; this matches today's `(status)` suffix and tells a reader which doc is in flight.
- **Design counts as a stage** (it sits between Architecture and Plan in `STAGE`; a draft Design keeps the Plan gate closed, so `Design (draft)` is the truthful label).
- **Walkthroughs outrank Plan**; with several walkthrough docs the status is `draft` if any is draft, else `approved`. Shipped features are already collapsed out of the table by `isFeatureShipped`, so shipped state needs no label.
- Returns `null` when the feature has no non-interview doc; `currentStageLabel` then renders `PRD` (today's fallback for a fresh feature).

`notesFor` condition changes from `f.currentStage === "plan"` to "furthest stage is `plan` or `walkthrough`" and `tasks.total > 0`, so the `Build (x/y tasks done)` note returns for features with plans.

**MCP:** `specmanager_init` input schema unchanged (`{ repoPaths?: string[] }`); output gains `knownRepos`.

**CLI used by the command (run by Claude via Bash, never by the server):**
- `claude plugin list --json` → array of `{ id: "<name>@<marketplace>", scope, enabled, ... }` (checked against Claude Code 2.1.285 on 2026-10-20).
- `claude plugin install <name>@<marketplace>` — default scope (user, Q8 assumption). The command must **not** pass `-y` / `--accept-command`: those accept a marketplace-declared command without showing it to a person.

## Recommended plugin list

Hard-coded as a table in `commands/specmanager-init.md` (resolves Q1). It is used by exactly one prompt, so per the repo rule it does **not** go in `docs/agent-snippets/` (snippets are for fragments with more than one carrier), and a server-exposed data file would add an MCP surface for no gain while staying network-free either way. Contents are the PRD's four rows, by id: `superpowers@claude-plugins-official`, `frontend-design@claude-plugins-official`, `context7@claude-plugins-official`, `playwright@claude-plugins-official`, each with its PRD "Used by / why" line. The PRD's exclusions (`code-review`, `feature-dev`, `github`, …) are not listed.

**Browser row (resolves Q2):** the playwright row counts as satisfied if **either** `playwright@…` is installed and enabled **or** the session already has chrome-devtools MCP tools (`mcp__chrome-devtools__*`) — the reviewer only needs "the session's browser MCP tools". Init recommends playwright only when neither is present; it never recommends both.

**Presence only (Q7 assumption kept):** match by the `id` prefix before `@` plus marketplace; versions are not checked. An entry present but `enabled: false` is reported as "installed, disabled" with the `claude plugin enable <id>` command to run — not offered for install and not enabled automatically.

## G1 — Detect plugins

Step after the first `specmanager_init` call: Claude runs `claude plugin list --json` via Bash, parses ids, and compares them to the table (plus the chrome-devtools check above). Detection comes from the session (C6); the server never reads Claude Code's plugin config.

## G2 — Offer installs, never force them

- No gaps → note "all recommended plugins present" for the report and ask nothing (M2).
- Gaps → one multi-select question (AskUserQuestion) listing each missing plugin with its "Used by / why" line, default none.
- For each chosen plugin, run `claude plugin install <id>` sequentially; one failure does not stop the rest. Capture each outcome (installed / failed + stderr summary).
- Nothing outside the user's pick is ever installed. The Bash call is also subject to the user's own permission prompt, a second consent layer.
- After any install, tell the user to run `/reload-plugins` (or restart) before the new skills/tools appear (A1) — not a failure.

## G3 — Guide repo declaration

- **Path arguments given:** forward as `repoPaths` exactly as today; no question (M3 byte-for-byte; `selftest-repos` unchanged).
- **No arguments:** after the first `specmanager_init` call (no `repoPaths`), list `knownRepos` (name + `sourcePath`), then ask whether this instance should work with other repos. On yes, collect absolute paths (C5: relative paths resolve against the MCP server's `process.cwd()`), and call `specmanager_init` again with `repoPaths` (idempotent; existing mirrors are write-if-absent). Report `declaredRepos` / `rejectedRepos` as today. On no, skip.
- The second call re-renders the managed block, so the "Declared repos" subsection is current.

## G4 — Fix the stage label

Root cause (proven, PRD Problem 3): `currentStage` is written once at `core/features.ts:75` and never advanced; `currentStageLabel` (`claude-md.ts:57-67`) and `notesFor` (`claude-md.ts:43`) read it. Fix: both read `furthestStage(f.documents)` (see Interfaces). Resolves Q6: **keep `currentStage` untouched** (PRD non-goal forbids removing or migrating it) and stop reading it; it becomes a dead field, recorded as a risk for a later cleanup feature.

## G5 — Report everything

Existing report items stay. Added: plugins found / missing / offered / installed / declined / failed (with the error) / installed-but-disabled, the reload reminder, and the repos listed (`knownRepos`) plus any newly declared.

## Sequence / flow

1. Parse args. If repo paths were passed, keep them.
2. `specmanager_init` (with `repoPaths` only if args were passed) → result incl. `knownRepos`.
3. Plugins: `claude plugin list --json` → diff vs table → ask (if gaps) → install chosen → collect outcomes.
4. Repos (only when no args): show `knownRepos` → ask → if paths, `specmanager_init({ repoPaths })` again.
5. Native `/init` (unchanged, writes outside the markers).
6. Combined report (G5).

Stage label: no user flow; every `syncClaudeMd` (init, auto-sync listeners in `mcp.ts`, `sync_claude_md`) renders via `furthestStage`.

## Failure and edge cases

- **Cannot ask (headless `-p` or another non-interactive run):** skip both questions; report missing plugins with the install commands to run, and the declared repos (resolves C7/Q4). `/specmanager-loop` does not call init (grep of `commands/specmanager-loop.md` finds no init reference), so no loop flag is needed.
- **`claude` CLI unavailable** (Bash `command not found`, or a non-Claude-Code host): list the recommendations as "not installable here" with their ids, install nothing (C8/Q3). Note: no Cursor/Codex/Antigravity plugin directory exists in `plugins/` today — only `plugins/specmanager/` — so this branch is defensive wording only.
- **`plugin list --json` fails or is unparseable:** report it once and skip the plugin step; init still completes.
- **Install fails** (marketplace not added, network, a marketplace-declared command needing confirmation): report the CLI message per plugin; never retry with `-y`; never add hooks or workarounds (C2).
- **Plugin installed in several scopes** (e.g. `context7` on the owner's machine): any enabled entry **that applies to this project** counts as present. An entry with a `projectPath` (project or local scope) counts only when that path equals this project's root; an entry without one (`user`, `synced`) applies everywhere. `claude plugin list --json` lists project-scope installs from every project, so without this filter a plugin enabled only in another project would count as present here (found by task-008, reviewer advisory). The same filter applies to the installed-but-disabled report.
- **Disabled plugin:** reported with the enable command, not installed.
- **Repo path rejected** (`notFound`, `notADirectory`, `conflict`): reported from `rejectedRepos`; others proceed (unchanged).
- **Feature with only an interview doc:** label stays `PRD` (interview excluded) — keeps selftest 11.4 green.

## selftest-prompts invariant

Add one invariant (next free id after INV-52, e.g. INV-53) over `commands/specmanager-init.md` pinning the consent rule (only installs the plugins the user picked / never installs silently), with `min`/`max` set to its exact count, following the harness's "anchor on structure, not values" rule (no pinned plugin names). Optionally a second row pinning that `-y` is never passed. Lowering or raising other INV counts is not expected because no current row covers the init file.

## Release and verification

- C3 applies: bump version, rebuild `server/` (and commit `dist/`), `npm run selftest-directory`, `claude plugin validate plugins/specmanager`. `ui/` is not touched, so no UI rebuild is needed beyond the standard rebuild step.
- **Surface test:** the repo CLAUDE.md requires it only for packaging changes, and none are made here; it is still run for M1 (headless, scratch project, `env -i HOME=$HOME PATH=$PATH`, `--settings '{"enabledPlugins":{"specmanager@specmanager":false}}'`). Since a headless run cannot answer questions, M1's "installs exactly what the user picks" is exercised by stating the pick in the `-p` prompt (see Open questions).
- M4: after build, run `sync_claude_md` on this repo and check features with approved Plans (e.g. Agent prompt simplification) show `Plan (approved)` / `Walkthroughs (…)` and the Build note.
- M5: grep `server/src` for new `fetch`/`child_process`/network use — none expected (the only CLI calls live in the prompt).

## Conventions used

- All mutations through `core/` (`initProject`, `syncClaudeMd`); no logic duplicated in `mcp.ts` or `board-server.ts`.
- TS strict, ESM, `.js` import suffixes, small pure functions with short docstrings; self-tests are hand-rolled `assert` scripts in `server/src/selftest*.ts`, run from `dist/`.
- Prompts: init runs in the main session (like interview/loop), so it may ask questions; "Don't" section style kept; no shared fragment, so no snippet file.
- "No model or API calls from the plugin": the server stays filesystem + `127.0.0.1` only; installation is Claude-in-session (C1).
- Frontmatter authoritative, manifest rebuildable — the label is derived from doc frontmatter.
- Release: version bump, committed `dist/`, directory self-test, `claude plugin validate`; one commit per task (project git strategy).

## Open questions / risks

_All resolved by the owner on 2026-10-20 in the `/specmanager-loop` end questions._


- **Q1 (decided):** table in the command prompt. Risk: plugin ids/marketplace names drift; the table must be edited by hand.
- **Q2 (decided):** playwright, satisfied by chrome-devtools MCP tools too. Planner to confirm the chrome-devtools tool-name prefix check is reliable inside a command prompt.
- **Q3 (decided, defensive):** "not installable here" listing when `claude` is unavailable; no other host plugin exists in the repo yet.
- **Q4 (decided):** non-interactive → report only; loop never invokes init.
- **Q5 (decided):** drafts count, Design counts, walkthroughs outrank Plan, interview excluded.
- **Q6 (decided):** keep `currentStage`, stop reading it. Risk: a dead field in `feature.json`/manifest/UI types that a reader may still trust; a later cleanup can drop or derive it.
- **Q7 (assumption kept):** presence only, no version check.
- **Q8 (assumption kept):** default CLI scope (user); no `--scope` flag passed.
- **M1 testability (resolved):** the pick is stated in the `-p` prompt of a headless run in an isolated `CLAUDE_CONFIG_DIR`, because the owner already has all four plugins installed; fall back to the M2 check if the login does not carry over.
- **Re-running `specmanager_init` twice** (step 2 and step 4) re-renders CLAUDE.md/DESIGN.md twice; idempotent, but the second call is kept (resolved): `repoPaths` must go through `specmanager_init` anyway.
- **Nested `claude` CLI inside a session:** `claude plugin install` from the Bash tool is assumed to work in-session (it is a CLI subcommand, no model call); not yet verified for every scope.
- **Branch stack (resolved):** 1.3.0 on the `feat/planner-rewrite` / `feat/agent-prompt-simplification` stack; `main` stays untouched; build step 6a sets the base.
