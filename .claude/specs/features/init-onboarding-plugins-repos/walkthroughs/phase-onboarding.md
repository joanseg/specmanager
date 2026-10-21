---
id: wt-init-onboarding-plugins-repos-027
featureId: feat-init-onboarding-plugins-repos
stage: walkthrough
status: draft
stale: false
title: 'Init onboarding: plugins & repos — Phase onboarding walkthrough'
dependsOn:
  - plan-init-onboarding-plugins-repos-024
basedOn:
  plan-init-onboarding-plugins-repos-024: 4
generatedBy: agent
version: 2
phase: onboarding
createdAt: '2026-10-20T18:52:41.966Z'
updatedAt: '2026-10-21T11:07:42.689Z'
---
## Stakeholder test guide

This feature changes two things. Setting up a project now helps you add the companion tools SpecManager works best with, and it asks about any other code folders the project works with. The project's overview file also now shows the real step each feature has reached.

**Happy path**

1. Make a new, empty folder for a test project and open Claude Code in it, using this version of SpecManager.
2. Type `/specmanager:specmanager-init` and press Enter. Don't add anything after it.
3. You should see a list of the recommended companion tools you don't have yet. Each one has a short line saying which helper uses it and why. Only tools set up for you everywhere, or for this project, count as "already have". A tool you set up only inside some other project does not count, so it shows up here as missing.
4. You are asked one question: which of them to install. Nothing is ticked to begin with. Tick one, for example "context7", and confirm.
5. You should see that only the tool you ticked was installed, plus a reminder to run `/reload-plugins` (or restart) before it shows up.
6. Next you should see a list of the other code folders already linked to this project. For a new project it says "none declared". You are then asked whether this project works with other folders. Answer "no".
7. At the end you get a summary: what was created, which tools were found, missing, installed or declined, and which folders are linked.
8. Open the project's `CLAUDE.md` file in the SpecManager repo, once it has been refreshed by this version. Features that have reached their plan now show "Plan (approved)" or "Walkthroughs (…)" with a build progress note, not "PRD" for every feature.

**Edge cases**

- **You already have every tool.** Run setup again. *What should happen:* it says all recommended tools are present and asks you nothing about them.
- **A tool you only set up in another project.** On the owner's computer, the browser-testing tool "playwright" is only set up, and switched off, inside one other project (`/Users/joan/Documents/UDEMY/finally`). *What should happen:* setup treats playwright as missing and does not tell you to switch it on. On that computer you still won't be offered it, because the other browser tool already in the session ("chrome-devtools") covers the same job.
- **You tick nothing.** Leave every box empty. *What should happen:* nothing is installed and the summary lists those tools as declined.
- **You say yes to other folders.** Give the full address of another code folder on your computer. *What should happen:* it is linked, and the summary shows it as newly declared. Your other folder is not changed.
- **You give folder addresses up front** (typed after the command). *What should happen:* those folders are linked straight away, and you are not asked the folder question.

If something looks different, tell the team what you saw.

---

# Init onboarding: plugins & repos — Phase onboarding walkthrough

This phase delivers the whole feature (single phase, 11 tasks, 22 points; plan `plan-init-onboarding-plugins-repos-024` v4). `/specmanager:specmanager-init` now detects the four recommended companion plugins, offers the missing ones and installs only the user's picks. Detection counts only `claude plugin list --json` entries that apply to this project (no `projectPath`, or one equal to this project's root; task-011). With no arguments it lists the known declared repos and asks about more. `specmanager_init` returns a new `knownRepos` field. The managed CLAUDE.md table labels each feature by its **furthest** stage (`furthestStage`), so the label and Build note no longer stick at `PRD`. The plugin version moves to 1.3.0. Because the feature is single-phase, this walkthrough is the terminal artifact: approving it ships the feature, and no `final` roll-up is written.

> from the repo root, `cd plugins/specmanager/server && npm run build && npm run selftest && npm run selftest-repos && npm run selftest-prompts && npm run selftest-directory` passes, and `claude plugin validate plugins/specmanager` prints `✔ Validation passed` with no warning. After that, running `/specmanager:specmanager-init` with no arguments in a scratch project lists the missing recommended plugins with reasons, asks which to install, installs only the ones picked, lists the declared repos and asks about more. In this repo's managed CLAUDE.md block, features with an approved Plan show `Plan (approved)` or `Walkthroughs (…)` with the Build note. *(This phase has no UI check: no board screen changes.)*

Before you start, you need a checkout of branch `feat/init-onboarding-plugins-repos`, Node 20+, and a logged-in `claude` CLI.

## 0. Prerequisites

- macOS or Linux, Node 20+, npm. Claude Code CLI (the task-008 run used **2.1.285**), logged in.
- Repo `specmanager`, branch `feat/init-onboarding-plugins-repos`, based on `feat/agent-prompt-simplification`. The phase commits are `8e6c938..1a1ab24` (10 task commits) plus `305fcfb` (task-011), on top of the spec-only commit `7d16c45`. None are pushed.
- No seed data is needed. Section 3.8 uses the repo's own `.claude/specs/`.
- Human prerequisites: none (plan "Human prerequisites").

## 1. Build

From the repo root:

```bash
cd plugins/specmanager && npm ci
cd server && npm ci && npm run build
npm run selftest && npm run selftest-repos && npm run selftest-prompts && npm run selftest-directory
cd ../../.. && claude plugin validate plugins/specmanager
```

These new lines must appear (all observed on 2026-10-20, and re-observed on 2026-10-21 at `305fcfb`):

`npm run selftest`. The furthestStage cases (11.4a) and the label/note cases (11.4b) are new:

```
ok — furthestStage: no docs → null
ok — furthestStage: interview-only → null
ok — furthestStage: a draft plan counts
ok — furthestStage: design counts as a stage
ok — furthestStage: walkthroughs outrank plan; any draft walkthrough → draft
ok — furthestStage: all walkthroughs approved → approved
ok — approved Plan with tasks → `Plan (approved)` label and Build note
ok — draft walkthrough → `Walkthroughs (draft)` label keeps the Build note
...
All Phase 1 assertions passed.
```

`npm run selftest-repos`:

```
ok — init with no paths declares nothing new
ok — init with no paths lists the previously declared repos in knownRepos
...
All multi-repo declare/seed/render/reconcile + containment assertions passed.
```

`npm run selftest-prompts`. The INV-53, INV-54 and INV-55 rows (Part G) are new:

```
ok — INV-53 — init installs only the recommended plugins the user picked, never silently (want 1..1, got 1) [commands/specmanager-init.md:1]
ok — INV-54 — init never passes `-y` or `--accept-command` to `claude plugin install` (want 1..1, got 1) [commands/specmanager-init.md:1]
ok — INV-55 — init counts only plugin entries with no `projectPath` or one equal to this project's root (want 1..1, got 1) [commands/specmanager-init.md:1]
ok — INV-53 mutation — stripping the matched text turns the check red (want 1..1, got 0 after removal) [commands/specmanager-init.md:0]
ok — INV-54 mutation — stripping the matched text turns the check red (want 1..1, got 0 after removal) [commands/specmanager-init.md:0]
ok — INV-55 mutation — stripping the matched text turns the check red (want 1..1, got 0 after removal) [commands/specmanager-init.md:0]
...
All prompt invariant assertions passed (80 invariants checked: match + mutation).
```

`npm run selftest-directory` ends with `All directory-conformance assertions passed.`, and `claude plugin validate` prints `✔ Validation passed` with no warning.

After the build, `git status --short plugins/specmanager/server/dist` must be empty, because the committed `dist/` already matches the source (task-007 found no `server/dist` or `ui/dist` diff; task-011 committed its rebuilt `server/dist/selftest-prompts.js`). If any of these fail, stop here.

## 2. Install / run

The feature is itself a Claude Code plugin. Pick one of these:

- **Scratch-project check (recommended for section 3):** load the checkout directly, so your installed copy is not touched:
  ```bash
  P=$(mktemp -d -t smproj) && cd "$P"
  claude --plugin-dir /Users/joan/Documents/projects/specmanager/plugins/specmanager \
         --settings '{"enabledPlugins":{"specmanager@specmanager":false}}'
  ```
  Run `/mcp`. The `specmanager` server should show `connected`, with plugin version `1.3.0`.
- **Reinstall into your session:** `/plugin marketplace update specmanager` → `/plugin install specmanager@specmanager` → `/reload-plugins`, then reconnect via `/mcp`. Your marketplace must point at a ref that contains `fc9b9bc` (1.3.0) and `305fcfb` (the scope filter). Per project memory, the owner's marketplace is pinned to the planner-rewrite branch, which does not contain this phase.

**Reload troubleshooting:** if `/mcp` shows the old version or a failed server after reinstall, a full Claude restart is the reliable fix (README Troubleshooting). If the slash command's text looks old (no "Recommended plugins" table), the session is still on the cached 1.2.0 command. Restart.

## 3. Phase onboarding exit checks

### 3.1 Build and self-tests pass

Run section 1. Expected: every command exits 0, and the new `ok —` lines listed there are all present.

### 3.2 `furthestStage` rules (task-001, `server/src/core/claude-md.ts`)

```bash
cd plugins/specmanager/server
node -e "import('./dist/core/claude-md.js').then(m=>{
 const f=m.furthestStage;
 console.log(JSON.stringify(f([])));
 console.log(JSON.stringify(f([{stage:'prd',status:'approved',kind:'interview'}])));
 console.log(JSON.stringify(f([{stage:'plan',status:'approved'},{stage:'walkthrough',status:'approved'},{stage:'walkthrough',status:'draft'}])));
 console.log(JSON.stringify(f([{stage:'architecture',status:'approved'},{stage:'design',status:'draft'}])));
})"
```

Expected:

```
null
null
{"stage":"walkthrough","status":"draft"}
{"stage":"design","status":"draft"}
```

The rules: stages are taken in `STAGE` order, interview docs are excluded, drafts count, Design counts, walkthroughs outrank Plan (the status is draft if any walkthrough is draft), and the result is `null` with no non-interview doc.

### 3.3 Label and Build note wiring (task-004)

`currentStageLabel` and `notesFor` now call `furthestStage` and no longer read `currentStage`. A `null` result renders `PRD`. The Build note fires when the furthest stage is `plan` or `walkthrough` and `tasks.total > 0`. Check that the field is unread in the renderer:

```bash
grep -n "currentStage" plugins/specmanager/server/src/core/claude-md.ts
```

Expected: no line reads `f.currentStage` (only the function name `currentStageLabel` matches). Per Q6, `currentStage` itself is unchanged in `features.ts`, `types.ts`, the manifest and `ui/src/types.ts`:

```bash
git diff 7d16c45..305fcfb --stat -- plugins/specmanager/server/src/core/features.ts plugins/specmanager/server/src/core/types.ts plugins/specmanager/ui/src
```

Expected: empty output. Selftest 11.4b (section 1) proves `| Label widget | Plan (approved) | Build (0/1 tasks done) |` and then `| Label widget | Walkthroughs (draft) | Build (0/1 tasks done) |`.

### 3.4 `knownRepos` on `InitResult` (task-002, `core/init.ts`)

`initProject` calls `scanDeclaredRepos(root)` after `declareRepos`. `mcp.ts:91` returns the whole `InitResult`, so the field also reaches the `specmanager_init` response. `declaredRepos` and `rejectedRepos` are unchanged. In the scratch session from section 2, ask Claude to call `specmanager_init` with no arguments.

Expected: the response JSON contains `"knownRepos": []` for a fresh project. After a call with `repoPaths: ["/abs/path/to/some-repo"]`, a later no-arg call returns that repo in `knownRepos` (with `name` and `sourcePath`) and `"declaredRepos": []`.

### 3.5 Init command: plugin step (tasks 003, 011, `commands/specmanager-init.md`)

```bash
sed -n '1,4p' plugins/specmanager/commands/specmanager-init.md
grep -c "@claude-plugins-official" plugins/specmanager/commands/specmanager-init.md
```

Expected: the frontmatter has `argument-hint: "[/abs/path/to/repo ...]"`, and the count is `4`. The table lists `superpowers`, `frontend-design`, `context7` and `playwright`, each with "Used by / Why / Without it".

Then, interactively, in the scratch session from section 2 (a config that lacks at least one of the four):

1. Run `/specmanager:specmanager-init` with no args.
   Expected: Claude runs `specmanager_init`, then `claude plugin list --json`, and lists each missing plugin with its "Used by / Why". It asks **one** multi-select question with nothing pre-selected.
2. Pick exactly one.
   Expected: one `claude plugin install <id>` per pick, with no `-y` or `--accept-command`. A failure is recorded with the CLI message and is not retried, and it does not stop the other picks. A `/reload-plugins` (or restart) reminder follows.
3. Check: `claude plugin list --json` now shows only the picked plugin added.

Branch behaviour to confirm (as written in the prompt):

- **Scope filter (task-011, `specmanager-init.md` step 2):** only entries with no `projectPath` (`user`, `synced`) or with `projectPath` equal to this project's root apply; the rest are ignored. Any enabled applying entry counts as present. Check the raw data:
  ```bash
  claude plugin list --json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{for(const p of JSON.parse(s)){if(/playwright|superpowers|frontend-design|context7/.test(p.id))console.log(p.id,p.scope,p.enabled,p.projectPath||"")}})'
  ```
  Observed on the owner's machine (2026-10-21):
  ```
  context7@claude-plugins-official user true
  context7@claude-plugins-official project true /Users/joan/Documents/UDEMY/finally
  frontend-design@claude-plugins-official user true
  frontend-design@claude-plugins-official project true /Users/joan/Documents/UDEMY/finally
  playwright@claude-plugins-official project false /Users/joan/Documents/UDEMY/finally
  superpowers@claude-plugins-official user true
  ```
  Expected: superpowers, frontend-design and context7 are present (user scope). playwright's only entry belongs to another project, so it is ignored: playwright is treated as missing and is **not** reported as installed-but-disabled. In this session the `mcp__chrome-devtools__*` tools still satisfy the browser row, so playwright is not offered either.
- An applying entry with `enabled: false` is reported with `claude plugin enable <id>`. It is never offered for install, and init does not enable it.
- The playwright row is satisfied when the session has `mcp__chrome-devtools__*` tools. Init never recommends both.
- A headless run installs nothing and prints the `claude plugin install <id>` commands.
- When `claude` is missing, the plugins are listed as "not installable here".
- When `plugin list` fails or can't be parsed, init reports it once, skips the step and continues.

### 3.6 Init command: all present (M2) and repo step (task-005)

Run the headless M2 check from `docs/verification/init-onboarding-surface.md` (section "M2 fallback") in an empty scratch project:

```bash
env -i HOME=$HOME PATH=$PATH USER=$USER LOGNAME=$LOGNAME claude \
  --plugin-dir <repo>/plugins/specmanager \
  --settings '{"enabledPlugins":{"specmanager@specmanager":false}}' \
  -p "Run /specmanager:specmanager-init with no arguments. Do not install, enable or uninstall any plugin. If the plugin step would ask a question, say exactly what you would ask and treat the answer as: decline all. For the repo question: no other repos. Skip the native /init step." \
  --allowedTools "mcp__plugin_specmanager_specmanager__specmanager_init" "Bash(claude plugin list:*)" \
  --output-format stream-json --verbose < /dev/null
```

Expected, as recorded on 2026-10-20:

- The init event shows `plugin:specmanager:specmanager` `connected`.
- The tool calls are Skill `specmanager:specmanager-init`, then `specmanager_init`, then `claude plugin list --json`. No install or enable command runs, and `permission_denials: []`.
- The output reports all recommended plugins present ("Nothing was missing …") and "Known repos: none declared". It quotes the repo question and skips it. (This run predates task-011. The scope filter does not change the M2 result on this machine, because the chrome-devtools tools satisfy playwright's row and the other three are present at user scope.)
- The scratch project gains `.claude/specs/` (`.gitignore`, `features/`, `manifest.json`), `CLAUDE.md` and `docs/DESIGN.md`.
- `claude plugin list --json` on the real config is identical before and after.

Interactive repo step (section 2 session): with no args, init lists `knownRepos` (or "none declared") and asks whether this project works with other repos. On yes, it collects **absolute** paths and calls `specmanager_init({ repoPaths })` a second time (idempotent; existing mirrors are kept). Path args passed on the command line are forwarded as before, and the question is skipped. The flow order is: `specmanager_init` → plugins → repos (no-args only) → native `/init` → report. The report adds plugins found, missing, offered, installed, declined, failed (with the CLI message) and installed-but-disabled (with the enable command), the reload reminder, and the repos listed and newly declared. The existing "Don't" items are kept.

### 3.7 Consent and scope invariants (tasks 006, 011, `server/src/selftest-prompts.ts`)

```bash
grep -n 'Install only the plugins the user picked' plugins/specmanager/commands/specmanager-init.md
grep -nE 'Never pass `-y` or' plugins/specmanager/commands/specmanager-init.md
grep -n 'no `projectPath` (`user`, `synced`), or with' plugins/specmanager/commands/specmanager-init.md
```

Expected: exactly one line each. They are pinned min=max=1 by INV-53, INV-54 and INV-55 (section 1 output, including the mutation rows). INV-55's pattern spans the line break before `` `projectPath` equal to this project's root ``.

### 3.8 Managed CLAUDE.md labels (M4, task-009)

The session MCP server may still be the installed 1.2.0 one, and the repo `CLAUDE.md` holds owner-uncommitted hunks. So sync a scratch copy with the checkout's `dist`:

```bash
S=$(mktemp -d); mkdir -p $S/.claude
cp -R .claude/specs $S/.claude/specs; cp CLAUDE.md $S/CLAUDE.md
cd plugins/specmanager/server
node -e "import('./dist/core/claude-md.js').then(async m=>console.log(await m.syncClaudeMd(process.argv[1])))" $S
diff <(sed -n '/specmanager:start/,/specmanager:end/p' ../../../CLAUDE.md) \
     <(sed -n '/specmanager:start/,/specmanager:end/p' $S/CLAUDE.md)
rm -rf $S
```

Expected:

- The sync returns `{ created: false }`. It logs one pre-existing warning: `skipping unparseable doc .../fly-io-deployment/architecture/architecture.md`.
- The diff shows rows moving off `PRD (…)` to their furthest stage. Examples from the recorded run (19 rows changed): `Redesign | Walkthroughs (approved) | Build (28/28 tasks done) · phases 4/4`, `Markdown viewer | Plan (approved) | Build (20/20 tasks done) · phases 4/4`, `Token usage optimisation | Plan (approved) | Build (13/14 tasks done)`, `Codex plugin | Architecture (approved) | —`, `Marketing phase | Plan (draft) | Build (0/25 tasks done) · phases 0/2 · Plan ⚠️ stale`.
- PRD-only features (for example Dummy feature, User adoption acceleration) keep `PRD (…)`.
- This feature's own row now reads `Walkthroughs (draft) | Build (11/11 tasks done)`, because this walkthrough exists. The recorded run showed `Plan (approved) · Build (9/10 …)` while task-009 was in progress.

The full before/after table is in `docs/verification/init-onboarding-checks.md`.

### 3.9 No new network or process use (M5)

```bash
git diff 7d16c45..305fcfb -- plugins/specmanager/server/src | grep -nE \
  '^\+.*(fetch\(|child_process|from "node:(http|https|net|dgram|tls)"|from "(http|https|net|dgram|tls)"|XMLHttpRequest|WebSocket|undici|axios|spawn|exec\()'; echo "exit=$?"
```

Expected: no matches, `exit=1` (re-run 2026-10-21). The source diff touches 5 files, +147/-13 (+138/-13 at `1a1ab24`; task-011 adds INV-55 to `selftest-prompts.ts`), and adds only local imports (`./types.js`, and more names from `./repos.js`). Plugin installs run through the `claude` CLI in the user's session, never from the server.

### 3.10 Release prep and docs (tasks 007, 010)

```bash
grep '"version"' plugins/specmanager/.claude-plugin/plugin.json
git show 53f7712 --stat
```

Expected: `"version": "1.3.0"`, and `README.md` (+5 lines, an "Init also helps you set up" list naming the four plugins and the "never installs anything you did not pick" rule, plus a data-handling sentence on CLI installs) and `CLAUDE.md` (the `commands/*.md` line now describes `specmanager-init.md`). task-011 did not bump the version, because 1.3.0 is unreleased.

## 4. Pass criteria

All are required.

- [ ] Section 1 commands all exit 0, and `git status --short plugins/specmanager/server/dist` is empty after the build.
- [ ] The `selftest` output includes the six `furthestStage:` lines and the two label/Build-note lines.
- [ ] The `selftest-repos` output includes both `init with no paths …` lines.
- [ ] The `selftest-prompts` output includes INV-53, INV-54 and INV-55 `ok` rows and their mutation rows, ending with `80 invariants checked`.
- [ ] `selftest-directory` ends with `All directory-conformance assertions passed.`
- [ ] `claude plugin validate plugins/specmanager` prints `✔ Validation passed` with no warning.
- [ ] The `furthestStage` node probe (3.2) prints `null`, `null`, `{"stage":"walkthrough","status":"draft"}`, `{"stage":"design","status":"draft"}`.
- [ ] The renderer no longer reads `currentStage`, and `features.ts`, `types.ts` and `ui/src` are unchanged (3.3).
- [ ] The `specmanager_init` response carries `knownRepos`, and a no-arg re-run lists earlier repos (3.4).
- [ ] The init command has `argument-hint` and the four-row table (3.5).
- [ ] Detection counts only entries with no `projectPath` or one equal to this project's root; another project's playwright entry is neither counted present nor reported as disabled (3.5).
- [ ] Interactive: missing plugins are listed with reasons, one multi-select question is asked (default none), only the picked plugin is installed, no `-y`/`--accept-command` is passed, and the reload reminder is shown (3.5).
- [ ] Headless M2: all present, nothing asked or installed, real config unchanged, MCP `connected`, `.claude/specs/` created (3.6).
- [ ] With no args, init lists `knownRepos` and asks about more repos; a yes triggers a second `specmanager_init({ repoPaths })` (3.6).
- [ ] The two consent phrases and the scope-filter phrase each appear exactly once in `specmanager-init.md` (3.7).
- [ ] The scratch CLAUDE.md sync shows approved-Plan features as `Plan (approved)` or `Walkthroughs (…)` with the Build note (3.8).
- [ ] The M5 grep returns no matches (3.9).
- [ ] `plugin.json` is at `1.3.0`, and the README and CLAUDE.md updates are present (3.10).

## 5. Deferred / out of scope

These are expected and are not bugs:

- **The real repo `CLAUDE.md` still shows `PRD (…)` everywhere** until a 1.3.0 server runs the sync. The session's MCP server is the installed 1.2.0, and the repo's `CLAUDE.md` holds owner-uncommitted managed-block hunks, so M4 was proven on a scratch copy only.
- **M1 (the install path and the multi-select pick) is not verified by automation.** The isolated `CLAUDE_CONFIG_DIR` run returned `Not logged in · Please run /login`. Check 3.5 is the owner's interactive check. A fresh config also has no marketplaces (`No marketplaces configured`), so an install there would need `claude plugin marketplace add` of the official marketplace first. That source was not verified.
- **Release not pushed:** 1.3.0 sits on the local branch stack. A push to `main` is a directory-scanned release and is left to the owner. `main` is untouched.
- **`currentStage` stays as a dead, unread field** (Q6, owner-confirmed); a later cleanup can drop or derive it.
- **Plugin ids and marketplace names can drift** (Q1); the table must then be edited by hand.
- **Not in this feature:** version checks on installed plugins (Q7), `--scope` flags (Q8), and recommending `code-review`, `feature-dev`, `github` or similar. Also out: Cursor, Codex and Antigravity behaviour beyond the "not installable here" wording; server-side installs, network or model calls; install hooks or packaging changes; any agent requiring a companion plugin; Cowork; board or UI changes; changes to `repos.ts` validation or seeding; agent tool lists, `hooks/`, `.mcp.json`, `ui/` source and `docs/agent-snippets/`.

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| A headless `claude -p` child returns `Not logged in · Please run /login` | On macOS the login lives in the Keychain, which needs `USER`/`LOGNAME`, and it is tied to the config dir | Add `USER=$USER LOGNAME=$LOGNAME` to `env -i`. A scratch `CLAUDE_CONFIG_DIR` has no login, so use the real config (M2-style, read-only `--allowedTools`). |
| *(Resolved by task-011, `305fcfb`.)* The init run lists nothing missing even though a plugin is absent here | `claude plugin list --json` includes project-scope entries from **every** project (`projectPath`), and the prompt used to count any enabled entry in any scope as present | Fixed: step 2 now ignores entries whose `projectPath` is another project's root, pinned by INV-55. If it recurs, the session is on a pre-`305fcfb` command; reinstall or use `--plugin-dir`. |
| playwright is not offered | The session has `mcp__chrome-devtools__*` tools, which satisfy the browser row | Expected. |
| A plugin you have enabled in another project shows as missing | Only user/synced entries and this project's own entries count (task-011) | Expected. Install it at user scope, or for this project. |
| The slash command still shows the old flow | The session is on the cached 1.2.0 plugin | Reinstall or `--plugin-dir`, then restart Claude. |
| `--dangerously-skip-permissions` is refused in a nested run | The parent session's permission classifier blocks it | Use a narrow `--allowedTools` list as in 3.6. |
| The sync warns `skipping unparseable doc …/fly-io-deployment/architecture/architecture.md` | That doc has no frontmatter (pre-existing, unrelated) | Ignore for this feature. |
| `selftest-prompts` fails on INV-53/54/55 | The consent or scope-filter sentence was reworded or duplicated in `specmanager-init.md` | Restore exactly one `Install only the plugins the user picked`, one ``Never pass `-y` or `--accept-command` `` and one ``no `projectPath` (`user`, `synced`), or with `projectPath` equal to this project's root``. |

## 7. What ships next (preview)

This is the only phase, and this walkthrough is terminal: approving it ships the feature (`isFeatureShipped`), and no `final` roll-up is written. The follow-ups on the table are a push and release of 1.3.0 when the owner decides, and the owner's interactive M1 check. The plugin-presence scope advisory is resolved (task-011).

## Lessons learned

### Git strategy

- **Proposed (build step 6a):** base `feat/agent-prompt-simplification`, because `main` is under directory review and 1.2.0 lives on the stack. New branch `feat/init-onboarding-plugins-repos`. Spec docs went first as a spec-only commit (`7d16c45`), then one commit per task, staging only that task's files. Message style: `Init onboarding: <summary> (task-0NN, plan 1.N)` plus the `Co-Authored-By` trailer. Never push. Leave unrelated uncommitted work untouched (marketing-phase, cowork-support, `manifest.json`, the owner's `CLAUDE.md` hunks, the planner-rewrite walkthrough, `docs/install-from-branch.md`).
- **User change:** none. The owner accepted it unchanged.
- **Result:** 11 task commits, `8e6c938..1a1ab24` plus `305fcfb` (task-011, same strategy and message style), one per task, none pushed. task-010 staged only its own `CLAUDE.md` hunk, through `git hash-object` / `update-index --cacheinfo`, so the owner's managed-block hunks stayed uncommitted.

### Build notes

- **Tier table:** the owner chose "all opus" instead of the default (sonnet for complexity 1–2).
- **No friction from the setup itself:** there were no prerequisites, no `NEEDS_HUMAN` pauses and no R=2 retries.
- **Stop-gate background-subagent gap fired once:** attempt 1/3 at the first turn end, while task-001's builder was still running. It was mitigated by waiting in-turn with a foreground Bash poll on `tasks.json` for each task. No further gate attempts were spent, and the phase was never marked blocked.
- **The M1 isolated-config install could not run** (task-008). Root cause: the macOS Keychain login is tied to the config dir and needs `USER`/`LOGNAME`. The M2 fallback passed on the real config, which was unchanged before and after. The repo `CLAUDE.md` surface-test recipe `env -i HOME=$HOME PATH=$PATH` is also not logged in on this machine without `USER`/`LOGNAME`. This was recorded, not changed, and is worth fixing in the Releasing section. `--dangerously-skip-permissions` was refused by the parent's permission classifier and not retried; `--allowedTools` was used instead.
- **M4 ran on a scratch copy** of `.claude/specs` and `CLAUDE.md`, with the checkout's `dist` (task-009), because the session MCP server is the installed 1.2.0. 19 table rows changed to their real stages, and the M5 grep was clean. `fly-io-deployment/architecture/architecture.md` has no frontmatter and is skipped by the parser.
- **Reviewer verdict: pass**, with one advisory (not a fail). `claude plugin list --json` includes project-scope entries from every project (with `projectPath`). So "any enabled entry in any scope counts as present" (`init.md:68-69`, per the architecture edge case) could count a plugin enabled only in another project as present. That fell short of PRD G1 "installed in the session". The suggested follow-up was to count only user/local scope, or entries whose `projectPath` equals this project root.
- **The advisory became task-011 and was built and reviewed in the same session.** Plan row 1.11 (complexity 2, plan v4; Arch "Failure and edge cases" updated) narrows step 2 of `specmanager-init.md` to entries with no `projectPath` (`user`, `synced`) or one equal to this project's root, and applies the same filter to the installed-but-disabled report. INV-55 pins it with exact min/max (80 invariants now). The rebuilt `server/dist/selftest-prompts.js` was committed with it, and there was no version bump (1.3.0 is unreleased). Reviewer verdict on the follow-up: **pass**. The Git strategy was unchanged.
- **Still open:** the M1 install path and the interactive multi-select remain unverified by automation (owner check 3.5).
- **Docs re-written during the loop review:** plan v3 (an isolated `CLAUDE_CONFIG_DIR` for 1.8, a `ui/` rebuild for 1.7), and the PRD/architecture open questions marked resolved. Plan v4 adds row 1.11.
