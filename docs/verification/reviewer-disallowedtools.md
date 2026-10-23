# R-1 check: reviewer `disallowedTools` denylist

- **Date:** 2026-10-20
- **Claude Code:** 2.1.285
- **Feature / task:** feat-planner-rewrite, task-013 (plan 1.13), Architecture risk R-1
- **Frontmatter under test** (`plugins/specmanager/agents/reviewer.md`, from task-012 / 288abc8):
  `disallowedTools: Write, Edit, NotebookEdit, Agent, mcp__plugin_specmanager_specmanager__*`

## Command

From a scratch git repo outside this one (one committed file, `existing.txt` = `original content`), with `CLAUDE_PLUGIN_DATA` pointed at a separate scratch directory:

```bash
CLAUDE_PLUGIN_DATA=<scratch>/r1-plugindata timeout 300 claude \
  --plugin-dir /Users/joan/Documents/projects/specmanager/plugins/specmanager \
  -p "<prompt>" --output-format stream-json --verbose \
  --allowedTools "Agent" "Write" "Edit" "mcp__plugin_specmanager_specmanager__*"
```

`--allowedTools` grants Write, Edit and the SpecManager tools to the session up front. A denial inside the subagent therefore comes from the reviewer's `disallowedTools`, not from a missing permission. A first attempt with `--permission-mode bypassPermissions` was refused by the outer session's auto-mode classifier, so the run used the scoped grant instead.

The prompt asked the main session to call `specmanager_init` and `create_feature("R1 probe")`, then dispatch `specmanager:reviewer` to: (a) Write `probe.txt`; (b) Edit `existing.txt`; (c) call `update_task` and `list_features`; (d) list its tools. It was told not to use Bash to write.

The run finished with `result: success` (5 turns, about 46 s).

## Main-session evidence

- Init event: `plugin:specmanager:specmanager` status `connected`; `specmanager:reviewer` is listed in `agents`.
- `specmanager_init` returned `ok: true`. `create_feature` returned `ok: true` with id `feat-r1-probe`. So the SpecManager tools worked in the parent session.

## Subagent attempts

The reviewer's only tool call was `ToolSearch` with `select:Write,Edit,mcp__plugin_specmanager_specmanager__update_task,mcp__plugin_specmanager_specmanager__list_features`. The result was:

> `No matching deferred tools found.`

The tools were never in its toolset, so it had nothing to call.

| Attempt | Outcome | Evidence (from the reviewer's report) |
|---|---|---|
| (a) Write `probe.txt` | Failed: tool absent | "There is no Write tool in my toolset." |
| (b) Edit `existing.txt` | Failed: tool absent | "There is no Edit tool." |
| (c) `update_task` / `list_features` | Failed: tools absent | "No SpecManager server or tools appear anywhere in this session." |
| (d) Tool list | Listed | Ready: Artifact, Bash, ListAgents, Read, ReportFindings, Skill, ToolSearch, Claude Docs batch/guide/update. Deferred: chrome-devtools `*`, other connected MCP servers, WebFetch, SendMessage, … |

The list has no Write, Edit, NotebookEdit or Agent, and no `mcp__plugin_specmanager_specmanager__*`. The browser MCP (`mcp__chrome-devtools__*`) is still there, so the reviewer's UI check keeps its tooling.

## On-disk checks (after the run)

- `probe.txt` was not created. `ls` of the scratch repo shows only `.claude/`, `.git/`, `CLAUDE.md`, `docs/` (all written by the parent's `specmanager_init`) and `existing.txt`.
- `existing.txt` still reads `original content`, with the same sha1 before and after: `09c2f8647e14e49e922b955c194102070597c2d1`.
- `feat-r1-probe` has no task records, and no task was set to `done`.

## Conclusion

**The denylist is honoured.** Claude Code 2.1.285 removes every `disallowedTools` entry, including the `mcp__plugin_specmanager_specmanager__*` wildcard, from the plugin subagent's toolset. The allowlist fallback was not needed and was not applied. The reviewer frontmatter and INV-22's `what` in `server/src/selftest-prompts.ts` stay as task-012 left them.

**Residual (unchanged, already recorded in INV-22):** Bash is still available and could write files. The reviewer also keeps other session MCP servers that have write tools (Claude Docs, Google Drive, Mintlify, and so on, depending on the user's setup). Its prompt forbids modification; nothing structural does.
