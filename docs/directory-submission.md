# Submitting SpecManager to the Anthropic plugin directory

A checklist for the repo owner. Work through it top to bottom for the first submission. For every later release, sections 2, 3 and 7 are the ones to repeat.

Nothing here is automated, and nothing here needs a password or token typed into a file or a terminal. The portal is at <https://claude.ai/directory/manage>.

Two steps in this checklist come from the portal's "Submit your plugin" help page, which was summarised rather than copied when this was written: the wording of the form's fields in section 4, and the status names in section 7. If the portal's labels differ slightly, follow the portal.

## 1. Before you start

Confirm each of these before opening the portal.

- [ ] **Your claude.ai account is on a paid plan**: Pro, Max, Team or Enterprise. Free accounts cannot submit.
- [ ] **You have the right role.** On Pro and Max you submit from your own account. On Team and Enterprise an Owner submits (on Enterprise, an Owner can also give another member the Directory permission).
- [ ] **You are in the organisation that should own the listing for good.** The first organisation to submit a repository folder owns that listing; the portal refuses a second organisation that submits the same folder.
- [ ] **The repository is public.** `joanseg/specmanager` is. The directory requires this before a listing goes live.
- [ ] **The work is on `main`.** The directory follows the branch you type into the form and scans every new commit on it. The directory-readiness work was built on the branch `directory-readiness`; merge it to `main` and push before you validate, or the portal will read the old `main`.

Order of work for the first submission:

1. On `directory-readiness`: section 2, then tests (a) and (b) of section 3.
2. Merge to `main` and push.
3. Test (c) of section 3.
4. Sections 4 to 7 in the portal.

## 2. Pre-push checks, every release

Run these before every push to `main`, not only before a release: the directory scans each commit it picks up from `main`.

- [ ] **Raise `version`** in `plugins/specmanager/.claude-plugin/plugin.json` (for example `1.0.0` to `1.0.1`). The first submission ships as `1.0.0`, which is already set, so skip this step that one time.

  Why it matters: Claude Code decides whether a plugin has an update by comparing version strings. Before `1.0.0` the plugin had no `version`, so every commit counted as an update. Now that a version is pinned, people who installed from the GitHub marketplace (`/plugin marketplace add joanseg/specmanager`) stay on their cached copy until the string changes, however many commits you push. `claude plugin update` tells them they are already on the latest version. People who install from the directory get the version claude.ai records, but raise the number for them too: the directory's own checklist asks for it on every release.

- [ ] **Rebuild both packages.** The committed `dist/` folders are what ships.

  ```bash
  cd plugins/specmanager && npm ci
  cd server && npm ci && npm run build
  cd ../ui && npm ci && npm run build
  ```

  Commit any change under `plugins/specmanager/server/dist` or `plugins/specmanager/ui/dist`.

- [ ] **Run the conformance selftest.**

  ```bash
  cd plugins/specmanager/server && npm run selftest-directory
  ```

  Expect a list of `ok` lines ending in `All directory-conformance assertions passed.` A `FAIL:` line names the file or field that breaks a directory rule (a file over 256 KiB, more than 512 files, a `.map` file, a lockfile out of step, and so on). Fix it before you push.

- [ ] **Validate the manifest.** From the repo root:

  ```bash
  claude plugin validate plugins/specmanager
  ```

  Expect `✔ Validation passed` with no warning. This checks syntax only; the portal's Validate is the real test.

## 3. Test on each surface before submitting

### Local results, 2026-09-30

Already verified on the development machine, so you do not need to repeat it for the first submission. The results apply to commit `79f8f08` on `directory-readiness`; a later commit that changes only files under `docs/` does not affect them. Toolchain: Node v25.6.1, npm 11.9.0, Claude Code 2.1.281.

| Check | Result | Limit or expectation |
|---|---|---|
| Server build, then `selftest-directory` and the 14 existing scripts (`selftest`, `selftest-board`, `selftest-phases`, `selftest-build`, `selftest-tiers`, `selftest-stopgate`, `selftest-roundtrip`, `selftest-pidfile`, `selftest-shutdown`, `selftest-autoport`, `selftest-repos`, `selftest-specslice`, `selftest-prompts`, `smoke-mcp`) | All 15 pass, exit code 0 | All pass |
| Committed `dist` against a fresh build | Identical (`git status --short plugins/` empty after the build) | Identical |
| `claude plugin validate plugins/specmanager` | `✔ Validation passed`, no warnings | Passed, no warnings |
| `npm ci --ignore-scripts` in a clean copy of the shipped folder, empty npm cache: wall time | 4.98 s (5.46 s on a second run) | 60 s |
| Same install: download size (size of the npm cache afterwards) | 12 MB | None stated |
| Same install: `node_modules` size | 48 MB, 6,615 files | None stated |
| Same install: packages | 232 | None stated |
| MCP smoke test, board selftest and Stop-gate selftest, run from that copy with only the root `node_modules` (no `server/node_modules`, `NODE_PATH` unset) | All three pass | All pass |
| Shipped files (`git ls-files plugins/specmanager`) | 228 | 512 |
| Largest shipped file that is not an image or font | 195,298 bytes, about 191 KiB (`ui/dist/assets/react-dom-3WAF5SeA.js`) | 256 KiB |

Not verified locally, and still yours to do: the interactive `--plugin-dir` session in (a), the Cowork upload in (b), the marketplace path in (c), and everything in the portal.

To look at before submitting: `npm ci` reports 11 audit advisories in the dependency tree (1 low, 3 moderate, 7 high). Nobody has examined them yet; `npm audit` at the plugin root lists them.

### (a) Claude Code, loading the folder directly

`--plugin-dir` loads the folder in place and does not install dependencies, so install them first.

```bash
cd plugins/specmanager && npm ci
cd ../.. && claude --plugin-dir plugins/specmanager
```

For that session this copy replaces your installed SpecManager, without any message.

- [ ] `/mcp` lists a `specmanager` server as connected.
- [ ] `/specmanager:specmanager-board` runs and the board opens in your browser at `http://127.0.0.1:4317` or the next free port.
- [ ] Open a draft document in the board, change a word, and select **Save**. `git diff` shows the change in that file under `.claude/specs/`. Undo it afterwards with `git checkout -- <file>`. This step matters: the editor has not been click-tested on the new unminified UI build.

If the server is not connected, the `npm ci` at the plugin root did not run or did not finish. If the board opens but the document editor is blank or throws errors, stop: that is a bug in the UI build to fix before submitting.

### (b) Cowork, uploading a zip

Make the zip from the committed files, so `node_modules` stays out (with it the folder is over Cowork's 5,000-file limit):

```bash
git archive --format=zip -o ~/Desktop/specmanager-plugin.zip HEAD:plugins/specmanager
```

This puts `.claude-plugin/plugin.json` at the top of the zip, 228 files in all. If Cowork refuses the zip, make it again with `--prefix=specmanager/` added before `HEAD:` so the files sit inside one folder.

In the Claude desktop app: **Customize > Plugins > Add > Upload plugin**, choose the zip, then start a Cowork session **that runs on your computer**, in a scratch folder.

Nobody has been able to check what Cowork does with this plugin, so record what you see:

| # | Question | How to tell | Result |
|---|---|---|---|
| 1 | Did the dependencies get installed? | Ask Claude to list SpecManager features. The server cannot start without its dependencies, so a real answer means yes. | |
| 2 | Does the MCP server start? | Same request: Claude uses a SpecManager tool and gets an answer. | |
| 3 | Does the project root resolve? | Run `/specmanager:specmanager-init`. The `.claude/specs/` folder appears in the scratch folder the session is working in, not somewhere else. | |
| 4 | Does the board port arrive? | Run `/specmanager:specmanager-board`. The address is `http://127.0.0.1:4317` or the next free port. Anything without a real port number is a no. | |

Also confirm the commands appear as `/specmanager:<command>`.

**If answer 1 is no, stop.** The server cannot run in Cowork without its dependencies. Do not add an install hook or any other workaround: that would bring back the findings this work removed. Decide instead whether to submit with Cowork unsupported, which means changing the "Where it works" section of `plugins/specmanager/README.md` first. If 3 or 4 is no, the same applies: it is a decision about the Cowork claim, not something to patch around.

Copy the filled table into the feature's walkthrough.

### (c) After merging to `main`: the marketplace path

- [ ] **Fresh install.** On a machine or user account with no SpecManager installed (or after `/plugin uninstall specmanager@specmanager`):

  ```
  /plugin marketplace add joanseg/specmanager
  /plugin install specmanager@specmanager
  /reload-plugins
  ```

  Expect the `specmanager` server connected in `/mcp` and the board opening, with no manual `npm` step.

- [ ] **Update of an existing install.** On a machine that has an older SpecManager:

  ```bash
  claude plugin marketplace update specmanager
  claude plugin update specmanager@specmanager
  ```

  Restart Claude. Expect the update to `1.0.0` to go through and the server to connect with no manual cleanup. If it says the plugin is already at the latest version, the marketplace copy did not refresh.

If the server fails to start in either case, run `claude --debug` and look for a dependency-install warning. The manual recovery is in the Troubleshooting section of `plugins/specmanager/README.md`.

## 4. Portal steps

1. Open <https://claude.ai/directory/manage>, signed in to the organisation from section 1.
2. **Connect GitHub** if the portal asks. It needs a GitHub account that is connected to this same Claude organisation and has push access to `joanseg/specmanager`. Validating a public repository works without it; creating and submitting the listing does not. Do this through the portal's own GitHub screen. Never paste a token anywhere.
3. Select **Submit new**.
4. Under **What would you like to submit?**, select **Plugin bundle**.
5. On the **Source** step, type exactly:

   | Field | Value |
   |---|---|
   | Repository | `joanseg/specmanager` |
   | Plugin path | `plugins/specmanager` |
   | Branch or tag | `main` |

   The plugin path is case-sensitive and has no leading or trailing slash.
6. Select **Validate**. Read the report against section 5.
   - If you see **Couldn’t validate that repository** with no findings: check the three Source values for typos first.
   - If you see **Already submitted by another organization**: an earlier submission of this folder exists. Withdraw it at <https://platform.claude.com/plugins/submissions>, or email `directory@anthropic.com`.
7. If you had to fix something: push the fix to `main`, come back to the **Source** step of the same form and select **Re-validate**. A report describes one commit only and does not change when you push, so re-validate after every push.
8. **Listing details.** The directory shows `plugins/specmanager/README.md` as the listing's description. Where the form asks for them, use the values from `plugin.json`: name `specmanager`, display name `SpecManager`, licence `MIT`, homepage `https://specmanager.org`. The portal works out the supported surfaces itself and shows them here. Expect Claude Code and Cowork. If it also lists Chat, that is because Chat loads command files as skills; the README already says Chat is unsupported and why. Note it and move on.
9. **Data handling.** Use section 6.
10. **Compliance.** Enter a contact email you read: reviewers use it. Read the four acknowledgements and tick them yourself. They bind you to the Anthropic Software Directory Terms and Policy.
11. **Review and submit.** Choose how the directory learns about new commits: **GitHub push webhook** (it is told on each push) or **Scheduled check only** (it looks on its own schedule). Either works with the release flow in section 7. Then select **Submit for review**.
12. Go to section 7.

## 5. What to expect at Validate

The target: **zero Blocking, zero Warning**, and Policy holds limited to the four below.

A **Policy hold** is not a rejection. You can still submit. It means a reviewer reads the held version before it goes live, and the same hold can come back on every new version. These four were accepted on purpose on 2026-09-30:

| Id | Title the report is likely to show | Files it names | Why it stays |
|---|---|---|---|
| A1 | **Dependencies install from a lockfile** | `plugins/specmanager/package.json`, `plugins/specmanager/package-lock.json` | Always held for any plugin that installs npm packages. It replaced a worse finding (an install run from a hook). |
| A2 | **Scripts the validator couldn’t follow** | `plugins/specmanager/server/dist/mcp.js`, the Node program the MCP server command runs | The validator only reads plain shell scripts. It goes away only if the plugin sits at the root of its own repository, and the plugin is staying in `plugins/specmanager`. |
| A3 | **Scripts the validator couldn’t follow** | `plugins/specmanager/hooks/stop-gate.sh` and the two Node files it runs, `plugins/specmanager/server/dist/resolve-active-card.js` and `plugins/specmanager/server/dist/set-phase-blocked.js` | The Stop hook needs shell variables and those two files to do its job. No version of it avoids the hold in a subfolder plugin. |
| A4 | No fixed title; worded as code the scan can't read, or unreadable or minified code | The `react-*.js`, `react-dom-*.js` and `scheduler-*.js` files in `plugins/specmanager/ui/dist/assets` | React 18 publishes only a pre-minified production build. The rest of the UI ships unminified. |

A4 comes from the security scan, so it may not be in the Validate report at all and may only show up after you submit, on the plugin's **Versions** tab.

If the A2 finding lists more files under `plugins/specmanager/server/dist/` than `mcp.js`, that is the same hold described more widely (they are all part of the same Node program). Write down the list for the walkthrough.

### Two things nobody could check locally

Look for these in the report and write down what you find, including "no finding".

- [ ] **Does the validator object to `env` in `plugins/specmanager/.mcp.json`?** The file passes the port setting to the server as `"SPECMANAGER_BOARD_PORT": "${user_config.board_port}"`. The rules only talk about the server's command, so no finding is expected. If there is one, note its level and exact wording. There is no prepared fix: that entry is the only way the port setting reaches the server, and without it the board always asks for port 4317. A Warning or a hold here is a decision for you; a Blocking finding means stopping to decide whether to drop the setting.
- [ ] **Does the validator accept the quoted path in the Stop hook command?** `plugins/specmanager/hooks/hooks.json` has `"command": "bash \"${CLAUDE_PLUGIN_ROOT}/hooks/stop-gate.sh\""`. If the report objects to the quotes, replace that one line with the documented exec form:

  ```json
  "command": "bash", "args": ["${CLAUDE_PLUGIN_ROOT}/hooks/stop-gate.sh"]
  ```

  Then run `npm run selftest-stopgate` and the section 2 checks, push, and **Re-validate**.

### Anything else

Any other Blocking finding, Warning or hold is unexpected. Fix it in the repo, run section 2, push to `main`, and **Re-validate**. If the fix lands after `1.0.0` has reached `main`, raise `version` with it, or marketplace users will not receive the fix.

## 6. Suggested Data handling answers

These are suggestions. You sign the form, so check each one against `plugins/specmanager/README.md` before you use it. The portal's answers and the README must say the same thing, because the security scan compares what the plugin does with what it discloses. All quotes below are from the README section "What this plugin does on your machine".

| Portal question | Suggested answer | Why |
|---|---|---|
| Does the plugin read or store personal data? | **No.** It has no accounts and collects nothing about the person using it. If the form asks more broadly about user data or files, say: it reads and writes project documents (specs, tasks, a block in `CLAUDE.md`, `docs/DESIGN.md`) as files in the user's own repository, and nowhere else. | "Writes files in your project." and "Keeps small state files." Both bullets describe files on the user's machine only. |
| Does it send data to services other than its declared connectors? | **No.** The plugin declares no remote connector; its one MCP server is a local program. | "Sends no data anywhere. The plugin makes no model or API calls of its own and has no telemetry or analytics." |
| How long does it keep data? | **It keeps none.** Nothing reaches the publisher, so there is nothing to retain. The documents stay in the user's repository until the user deletes them. | "Sends no data anywhere." plus "Keeps small state files.", which lists the pidfile and the cache files under `.claude/specs/.cache/`, all local. |
| Is it intended for people under 18? | **No.** It is a tool for people running software projects. | The README's opening paragraph. This one is a statement of your intent, not a fact about the code. |

If the form has a free-text box, state these three facts there. None of them changes an answer above, but a reviewer will find all three in the source and should not find them undisclosed:

- Dependencies are downloaded from the npm registry when the plugin is installed. ("Installs dependencies.") Claude Code does this, from the lockfile; no user data is involved.
- The architecture agent's prompt tells Claude it may look up public library documentation with the session's own web tools (Context7 or web fetch). That runs inside the user's Claude session under the user's permissions; the plugin's code makes no request. (Last sentence of "Sends no data anywhere.")
- During a build Claude makes local git commits and never pushes. ("Edits code and commits during a build.")

What would change an answer:

- **Cowork.** If test (b) in section 3 shows a Cowork session keeping the spec files anywhere other than a folder on the user's own computer, the first and third answers need rewriting before you submit.
- **A future feature that leaves the machine.** Sharing documents on a public URL, syncing specs to GitHub issues, telemetry, or bringing back an in-board chat would each turn the second answer into a yes and give the third a real retention period. Change the README and the portal answers in the same release as the feature.

## 7. After submitting

Each version ends in one of three states, shown on the plugin's page in the portal:

- **Passes.** The scan found nothing. The version can be published.
- **Held for a reviewer.** Expected here, because of A1 to A4. An Anthropic reviewer reads the version before it can go live. Review time is not fixed. Nothing for you to do but wait.
- **Doesn't pass.** The **Versions** tab shows **Didn’t pass the security scan** or a category such as **Sends data to an undisclosed destination**. A first submission that fails is rejected. Fix the cause in the repo, push to `main`, then use **Resubmit for review** on the rejected submission.

**Publish.** A new listing is always reviewed by a person before it goes live. By default a reviewer publishes each version once it has passed; if the portal shows a **Publish** action on a passed version, that is the step that makes it live.

**Add the results to the feature walkthrough**: the section 3 tables, the list of holds the report actually showed, and the answers to the two unknowns in section 5.

**Later releases.** No new submission is needed.

1. Do section 2 (raise `version`, rebuild, selftest, validate).
2. Repeat section 3 (a) if the UI or server changed.
3. Merge to `main` and push. The directory picks up the commit and scans it.
4. Watch the **Versions** tab. Expect the same holds A1 to A4 again. A new hold, or a version that doesn't pass, is handled as in section 5: fix, raise `version`, push. A later version that fails cannot go live.
