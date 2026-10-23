---
id: plan-init-onboarding-plugins-repos-024
featureId: feat-init-onboarding-plugins-repos
stage: plan
status: approved
stale: false
title: 'Init onboarding: plugins & repos plan'
dependsOn:
  - arch-init-onboarding-plugins-repos-030
basedOn:
  arch-init-onboarding-plugins-repos-030: 3
generatedBy: agent
version: 4
createdAt: '2026-10-20T15:46:09.026Z'
updatedAt: '2026-10-20T19:19:34.543Z'
---
## Overview

Implements `arch-init-onboarding-plugins-repos-030` (v1) for `prd-init-onboarding-plugins-repos-045` (v1): the stage-label fix in `core/claude-md.ts` (G4, `furthestStage`), `knownRepos` on `InitResult` (G3), the rewritten `commands/specmanager-init.md` (G1, G2, G3, G5), one `selftest-prompts` invariant, the 1.3.0 release steps, and automated checks for M1, M4 and M5 that write results files. **One phase, no split.** No spike trigger applies: the Architecture decides Q1 to Q8, and the open items left (the chrome-devtools prefix check, whether `claude plugin install` works inside a session, M1 testability) change how a task is done, not which tasks exist. No size trigger applies either (20 points, well under ≈100). No design doc exists (not UI-facing).

**Scale:** `1` trivial · `2` small · `3` moderate · `5` substantial · `8` large · `13`/`21` epic.

*Every task below is ≤3 points. The work was small to begin with, so nothing needed splitting.*

| Phase | Theme | Points |
|---|---|---|
| onboarding | Stage-label fix, known repos, plugin and repo onboarding in init | 22 |
| **Total** | | **22** |

---

## Phase onboarding — Stage-label fix, known repos, plugin and repo onboarding in init

**Exit test:** from the repo root, `cd plugins/specmanager/server && npm run build && npm run selftest && npm run selftest-repos && npm run selftest-prompts && npm run selftest-directory` passes, and `claude plugin validate plugins/specmanager` prints `✔ Validation passed` with no warning. After that, running `/specmanager:specmanager-init` with no arguments in a scratch project lists the missing recommended plugins with reasons, asks which to install, installs only the ones picked, lists the declared repos and asks about more. In this repo's managed CLAUDE.md block, features with an approved Plan show `Plan (approved)` or `Walkthroughs (…)` with the Build note. *(This phase has no UI check: no board screen changes.)*

| # | Task | Pts | Notes |
|---|---|---|---|
| 1.1 | Add pure `furthestStage(documents)` to `core/claude-md.ts`, with selftest cases next to 11.4 | 2 | Follows the arch "Interfaces" rules (Q5): `STAGE` order, interview excluded, drafts count, Design counts, walkthroughs outrank Plan (draft if any walkthrough is draft), `null` when only an interview doc exists. Cases go in `server/src/selftest.ts`. |
| 1.2 | Add `knownRepos: DeclaredRepo[]` to `InitResult` (from `scanDeclaredRepos(root)` after `declareRepos`), with a `selftest-repos` assertion | 2 | M3. Additive only: `declaredRepos` and `rejectedRepos` stay byte-for-byte. The assertion checks that init with no paths lists repos declared earlier. |
| 1.3 | Rewrite `commands/specmanager-init.md`, part 1: add the `argument-hint` frontmatter, the recommended-plugin table, and the plugin detect/offer/install step | 3 | G1, G2. The table holds the PRD's four ids with their "Used by / why" lines. Detection uses `claude plugin list --json`. The playwright row also counts as satisfied when the session has `mcp__chrome-devtools__*` tools. An `enabled: false` entry is reported with `claude plugin enable <id>`. Offer one multi-select question (default none), then install each pick in turn with `claude plugin install <id>` and never pass `-y`/`--accept-command`. One failure does not stop the rest. Add the `/reload-plugins` reminder. Add the edge branches: cannot ask → report only; `claude` not available → "not installable here"; list fails → report once and skip. |
| 1.4 | Make `currentStageLabel` and `notesFor` use `furthestStage` instead of `currentStage`, with selftest cases for the label and the Build note | 2 | `notesFor` fires when the furthest stage is plan or walkthrough and `tasks.total > 0`. `null` renders `PRD`, and 11.4 stays green. Keep `currentStage` in `features.ts:75`, `types.ts`, the manifest and `ui/src/types.ts` untouched (Q6). |
| 1.5 | Rewrite `commands/specmanager-init.md`, part 2: repo question when no args, flow order, extended report | 2 | G3, G5. Path args are forwarded exactly as today. With no args, list `knownRepos`, ask, collect absolute paths (C5), then call `specmanager_init({ repoPaths })` again. The order follows the arch "Sequence / flow" steps 1 to 6. The report adds plugins found, missing, offered, installed, declined, failed (with error) and installed-but-disabled, the reload reminder, and repos listed and newly declared. Keep the existing "Don't" items. |
| 1.6 | Add INV-53 (consent: install only the user's picks) and INV-54 (`-y` never passed) over `commands/specmanager-init.md` in `selftest-prompts.ts` | 2 | Anchor on structure, not plugin names. Set min/max to the exact counts. No existing INV covers the init file (grep shows 0), so no other count moves. |
| 1.7 | Release prep: bump `plugin.json` `version` 1.2.0 → 1.3.0, `npm ci` at the plugin root and `npm ci && npm run build` in `server/` and `ui/`, commit any `dist/` change, run `selftest-directory` and `claude plugin validate plugins/specmanager` | 2 | C3, following the repo release rule (no `ui/dist` diff expected, since `ui/` source is untouched). 1.3.0 on the current branch stack (owner-confirmed); the base is set at build step 6a. Never push. |
| 1.8 | Automated headless surface test for M1 and M2 in an isolated `CLAUDE_CONFIG_DIR`, results in `docs/verification/init-onboarding-surface.md` | 3 | The owner already has all four plugins installed, so the child runs with `CLAUDE_CONFIG_DIR=<scratch dir>` (plus `env -i HOME=$HOME PATH=$PATH`, `--plugin-dir <repo>/plugins/specmanager`, `-p "…" --output-format stream-json --verbose`) in an empty scratch project outside the repo, so it sees no installed plugins and installs into the scratch config only; the owner's real config is never touched. State the plugin pick in the `-p` prompt. Record which plugins were listed and what was installed (`claude plugin list --json` against the scratch config before and after), whether MCP `specmanager` shows `connected`, and whether `.claude/specs/` was created. If the login does not carry over to the scratch config, record that and fall back to the M2 check only: a re-run against the real config reports "all recommended plugins present" and asks nothing. If it fails, report it and add no workaround (C2). |
| 1.9 | Automated M4/M5 check, results in `docs/verification/init-onboarding-checks.md` | 1 | M4: run `sync_claude_md` on this repo and record the labels and Build notes of features with an approved Plan. M5: grep `server/src` for new `fetch`, `child_process` or network use and record the result (none expected). |
| 1.11 | Scope filter: in `commands/specmanager-init.md` step 2, count (and report as disabled) only plugin entries that apply to this project — no `projectPath` (`user`, `synced`), or `projectPath` equal to this project's root — with an INV-55 row in `selftest-prompts.ts` | 2 | Follow-up from the reviewer advisory and task-008: `claude plugin list --json` includes project-scope entries from every project, so "any enabled entry, in any scope" counted a plugin enabled only in another project as present (falls short of PRD G1). Arch "Failure and edge cases" updated. INV-55 anchors on the `projectPath` rule, exact min/max. Rebuild and commit `server/dist/selftest-prompts.js`. No version bump (1.3.0 is unreleased). |
| 1.10 | Docs: describe the plugin and repo onboarding in `plugins/specmanager/README.md`, and refresh the init line in the repo `CLAUDE.md` | 1 | Keep it short. Name the four recommended plugins and the rule that init never installs anything you did not pick. |

---

## Risk & sequencing notes

- **1.1 → 1.4** (wiring needs the function). **1.2 → 1.5** (the repo step reads `knownRepos`). **1.3 → 1.5 → 1.6** (both parts edit the same file, and the INV counts are pinned to its final text). **1.2, 1.4, 1.6 → 1.7** (rebuild after every source change). **1.7 → 1.8, 1.9** (the checks run against the rebuilt `dist/`). 1.10 can go anywhere after 1.5.
- **Server changes land first** (1.1, 1.2) because they are pure and covered by self-tests, so the prompt rewrite (1.3, 1.5) can rely on `knownRepos`. 1.4 is independent of the prompt and can run any time after 1.1.
- **The label change is visible across the repo:** the next sync rewrites every row of the managed CLAUDE.md table. That is the intended fix, and a revert of 1.4 undoes it cleanly. No data migration is needed, so rollback is easy.
- **The release is the hard part to roll back:** a push to `main` with the 1.3.0 bump is a directory-scanned release. The project git strategy says never push from a build, so 1.7 stops at the local commit.
- **Test installs in 1.8 stay in a scratch `CLAUDE_CONFIG_DIR`**, so the owner's real plugin config is never changed.

## Test strategy

- **Hand-rolled self-tests (`server/src/selftest*.ts`, run from `dist/`):** `selftest` gains `furthestStage`, label and note cases (1.1, 1.4). `selftest-repos` gains the `knownRepos` assertion (1.2). `selftest-prompts` gains INV-53 and INV-54 (1.6). Write each one in the same task as the code it covers.
- **Release checks:** `selftest-directory` and `claude plugin validate` (1.7).
- **Behaviour checks the self-tests cannot reach** (prompt flow, real CLI): the headless surface test (1.8) and the M4/M5 checks (1.9). Each writes a results file under `docs/verification/`, because a task cannot reach `done` without an artifact.
- Phase `testCommand`: `cd plugins/specmanager/server && npm run build && npm run selftest && npm run selftest-repos && npm run selftest-prompts && npm run selftest-directory`.

## Human prerequisites

None. Task 1.8 uses the session's own `claude` CLI login, which is already present. No accounts, credentials, access or reviewer test accounts are needed.

## Out of scope

- Every PRD non-goal, for example: the server installing plugins or making network or model calls, install hooks or packaging changes, any agent requiring a companion plugin, Cowork, board or UI changes, changes to `repos.ts` validation or seeding, and removing or migrating `currentStage`.
- Changes to agent tool lists, `hooks/`, `.mcp.json`, `ui/` source, or `docs/agent-snippets/` (the table has one carrier).
- Version checks on installed plugins (Q7), and `--scope` flags (Q8).
- Recommending `code-review`, `feature-dev`, `github` and similar plugins.
- Cursor, Codex and Antigravity host behaviour beyond the defensive "not installable here" wording (no such plugin directory exists in `plugins/` today).
- Pushing or merging the release.

## Open questions

All resolved by the owner on 2026-10-20 in the `/specmanager-loop` end questions:

- **Resolved — size split:** single phase (20 points). Alternative not taken: label fix first, then init onboarding.
- **Resolved — spike:** none; task 1.8 exercises `claude plugin install` from a session headlessly. If it fails, report it and add no workaround (C2).
- **Resolved — M1 testability:** the pick is stated in the `-p` prompt of an automated headless run in an isolated `CLAUDE_CONFIG_DIR` (1.8), falling back to the M2 check if the login does not carry over. The interactive multi-select itself is left to the reviewer and the walkthrough.
- **Resolved — human setup:** none; the session's CLI login is enough.
- **Resolved — Q2 browser row:** playwright is recommended, and the row counts as satisfied when the session already has `mcp__chrome-devtools__*` tools. 1.8 records what it saw.
- **Resolved — second `specmanager_init` call** with `repoPaths` for newly added repos (idempotent).
- **Resolved — branch and version:** 1.3.0 on the `feat/planner-rewrite` / `feat/agent-prompt-simplification` stack; `main` stays untouched; build step 6a sets the base.
- **Resolved — rebuild scope:** 1.7 follows the repo release rule and rebuilds `ui/` too.
- **Risks carried from the Architecture:** plugin ids and marketplace names can drift (Q1), and the table must then be edited by hand. `currentStage` stays as a dead, unread field (Q6, owner-confirmed); a later cleanup can drop or derive it.
- **Drift check:** no drift found. `commands/specmanager-init.md` has no `argument-hint` today. `claude-md.ts` lines 36 to 67 read `currentStage`. `InitResult` is at `init.ts:9`. `scanDeclaredRepos` is at `repos.ts:342`. Selftest 11.4 exists. The highest INV is 52, and no INV covers the init file. `plugin.json` is at 1.2.0.

## Notes on estimates

Points measure relative complexity, not hours. Calibrate them once the first phase is built. The only 3-point items are the plugin step of the prompt (the most branches) and the headless surface test (it needs a real CLI and an isolated config). Tests and docs are their own rows, so "installable and testable" stays a real gate. The release prep is a row too, because the committed `dist/` is what ships.
