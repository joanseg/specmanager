# Init onboarding: headless surface test (M1, M2)

Task-008, plan row 1.8, feature `feat-init-onboarding-plugins-repos`. Run on 2026-10-20 with Claude Code 2.1.285 against the checkout's plugin at 1.3.0 (`fc9b9bc`).

## Verdict

| Check | Result |
|---|---|
| M1: install only the picked plugin, in an isolated `CLAUDE_CONFIG_DIR` | **Not run.** The login does not carry over to a scratch config (see below). |
| M2 (fallback): real config, all recommended plugins present, nothing asked or installed | **Pass** |
| MCP `specmanager` connected in the init event | **Pass** (both runs) |
| `.claude/specs/` created in the scratch project | **Pass** (M2 run) |
| Owner's real plugin config unchanged | **Pass** (`claude plugin list --json` identical before and after, 26 entries) |

## Setup

- Scratch config: `mktemp -d -t smcfg`. Scratch project: `mktemp -d -t smproj` (empty, outside the repo). Both deleted at the end.
- Scratch config before the run: `claude plugin list --json` returned `[]`, and `claude plugin marketplace list` returned `No marketplaces configured`. So `claude-plugins-official` is not there in a fresh config. An install would need `claude plugin marketplace add` first. This was not tried, because the run never got past auth.
- The child got only the tools init needs: `--allowedTools "mcp__plugin_specmanager_specmanager__specmanager_init" "Bash(claude plugin list:*)"` (M1 also allowed `"Bash(claude plugin install:*)"`). The first attempt used `--dangerously-skip-permissions`, and the parent session's permission classifier refused it.

## M1 attempt: isolated config

```
env -i HOME=$HOME PATH=$PATH CLAUDE_CONFIG_DIR=<scratch-cfg> claude \
  --plugin-dir <repo>/plugins/specmanager \
  -p "Run /specmanager:specmanager-init with no arguments. For the plugin question, my pick is: install only context7 (context7@claude-plugins-official), decline the others. For the repo question: no other repos. Skip the native /init step." \
  --allowedTools ... --output-format stream-json --verbose
```

- Init event: `plugin:specmanager:specmanager` status `connected`, plugin `specmanager@inline` version `1.3.0`, `apiKeySource: "none"`.
- Result, verbatim: `Not logged in · Please run /login` (`"error":"authentication_failed"`, `is_error: true`, `num_turns: 1`).
- No model turn ran, so no plugins were listed or installed, and the scratch project stayed empty (no `.claude/specs/`). The scratch config's `claude plugin list --json` was still `[]` afterwards.

**Root cause, checked with `claude auth status`:**

| Environment | `loggedIn` |
|---|---|
| `env -i HOME PATH` (real config) | `false` |
| `env -i HOME PATH USER LOGNAME` (real config) | `true` (`claude.ai`) |
| `env -i HOME PATH USER LOGNAME CLAUDE_CONFIG_DIR=<scratch>` | `false` |

On macOS the CLI reads its login from the Keychain. That needs `USER`/`LOGNAME`, and the Keychain entry is tied to the config dir, so a fresh `CLAUDE_CONFIG_DIR` has no login. Per the plan, this falls back to the M2 check. Note: the surface-test recipe in the repo `CLAUDE.md` ("Releasing") says `env -i HOME=$HOME PATH=$PATH`. On this machine that recipe is not logged in unless `USER` and `LOGNAME` are also passed. This was recorded but not changed here.

## M2 fallback: real config, read-only for plugins

```
env -i HOME=$HOME PATH=$PATH USER=$USER LOGNAME=$LOGNAME claude \
  --plugin-dir <repo>/plugins/specmanager \
  --settings '{"enabledPlugins":{"specmanager@specmanager":false}}' \
  -p "Run /specmanager:specmanager-init with no arguments. Do not install, enable or uninstall any plugin. If the plugin step would ask a question, say exactly what you would ask and treat the answer as: decline all. For the repo question: no other repos. Skip the native /init step." \
  --allowedTools "mcp__plugin_specmanager_specmanager__specmanager_init" "Bash(claude plugin list:*)" \
  --output-format stream-json --verbose < /dev/null
```

- Init event: `plugin:specmanager:specmanager` `connected`. Only `specmanager@inline` loaded (the marketplace copy was disabled). The session had 32 `mcp__chrome-devtools__*` tools and 0 playwright tools.
- Tool calls, in order: Skill `specmanager:specmanager-init`, then `specmanager_init` (ok, `createdClaudeMd: true`, `createdDesignMd: true`), then `claude plugin list --json`. No install or enable command ran, and `permission_denials` was `[]`.
- Plugins reported: `superpowers`, `frontend-design` and `context7` present and enabled. Playwright was treated as present because the session has `mcp__chrome-devtools__*` tools. The output also noted, unprompted, that `playwright@claude-plugins-official` is installed but disabled in another project, and did not suggest enabling it. It said "Nothing was missing, so there was no install question to ask, and nothing was installed, enabled or uninstalled." This matches M2: all recommended plugins are present and nothing is asked.
- Repos: "Known repos: none declared". It quoted the question it would have asked and skipped the step.
- Scratch project afterwards: `.claude/specs/` (`.gitignore`, `features/`, `manifest.json`), `CLAUDE.md` and `docs/DESIGN.md`.
- Real config: `claude plugin list --json` (id, scope, enabled, version, projectPath) was identical before and after.

## Observations for the walkthrough

- The playwright row depends on the chrome-devtools rule. The owner's only playwright install is project-scoped and disabled in another project. Without chrome-devtools tools, init would have listed playwright as missing.
- `claude plugin list --json` lists project-scope installs from **every** project (each has a `projectPath`), not just the current one. The prompt's "any enabled entry, in any scope, counts as present" therefore counts a plugin enabled only in another project as present here. For example, `context7` has a `project`-scope entry for `/Users/joan/Documents/UDEMY/finally`. It made no difference in this run, because the user-scope entries are enabled.
- M1 (the install path and the multi-select pick) is still unverified by automation. It needs either an interactive check by the owner or a scratch config with a login, plus a `claude plugin marketplace add` of the official marketplace in that config (source not verified here).
