# SubagentStop for a background builder — spike findings

Feature `feat-stop-gate-fixes`, plan row 1.3. Feeds rows 2.8 (matcher) and 2.13 (dispatch prose).

Verdict: fires
First record: prompt

## What was run

`docs/verification/subagentstop-probe.sh <scratch>` (commit `14ddc24`), twice:

| Run | Date | CLI | Model | Cost |
|-----|------|-----|-------|------|
| smoke (task 1.2) | 2026-10-29 | 2.1.285 | sonnet | $0.217 |
| repeat (task 1.3) | 2026-10-29 | 2.1.285 | sonnet | $0.200 |

One headless `claude -p` session loads this checkout's plugin with `--plugin-dir`, the
installed `specmanager` plugin disabled, and one logging `SubagentStop` hook with **no
matcher**. The session dispatches a foreground `specmanager:builder` (`Dispatch: task-001`),
then a background one (`run_in_background: true`, `Dispatch: task-002`). The hook appends
its stdin to a log and copies `agent_transcript_path` at hook time.

Both runs gave the same result. Main-stream tool calls, run 2:

```
Agent type=specmanager:builder bg=false first=Dispatch: task-001
Agent type=specmanager:builder bg=true first=Dispatch: task-002
```

## Captured payloads (run 2, paths trimmed)

Both payloads carry the same 14 keys: `agent_id`, `agent_transcript_path`, `agent_type`,
`background_tasks`, `cwd`, `effort`, `hook_event_name`, `last_assistant_message`,
`permission_mode`, `prompt_id`, `session_crons`, `session_id`, `stop_hook_active`,
`transcript_path`.

Foreground:

```json
{
  "session_id": "50a3bbf8-17a0-48d5-a36f-502116e0ceb9",
  "prompt_id": "78c02f73-7261-407d-bba5-885369cf18a5",
  "agent_id": "a982e27c1c7467f23",
  "agent_type": "specmanager:builder",
  "hook_event_name": "SubagentStop",
  "stop_hook_active": false,
  "last_assistant_message": "DONE",
  "background_tasks": [],
  "transcript_path": ".../50a3bbf8-17a0-48d5-a36f-502116e0ceb9.jsonl",
  "agent_transcript_path": ".../50a3bbf8-17a0-48d5-a36f-502116e0ceb9/subagents/agent-a982e27c1c7467f23.jsonl"
}
```

Background:

```json
{
  "session_id": "50a3bbf8-17a0-48d5-a36f-502116e0ceb9",
  "prompt_id": "78c02f73-7261-407d-bba5-885369cf18a5",
  "agent_id": "a5a6fee096b88fb8e",
  "agent_type": "specmanager:builder",
  "hook_event_name": "SubagentStop",
  "stop_hook_active": false,
  "last_assistant_message": "DONE",
  "background_tasks": [{"id": "a5a6fee096b88fb8e", "type": "subagent", "status": "running",
    "description": "Probe task-002", "agent_type": "specmanager:builder"}],
  "transcript_path": ".../50a3bbf8-17a0-48d5-a36f-502116e0ceb9.jsonl",
  "agent_transcript_path": ".../50a3bbf8-17a0-48d5-a36f-502116e0ceb9/subagents/agent-a5a6fee096b88fb8e.jsonl"
}
```

- `session_id` and `transcript_path` are the **parent's** session, for both.
- The background payload lists the stopping agent itself in `background_tasks`, still
  `running` — SubagentStop fires before the task is marked finished.
- The smoke run matched field for field (agent ids `a12676d18b2a17646` / `ae0a970a97951feb4`).

## First transcript record (run 2, background agent)

```json
{
  "type": "user",
  "parentUuid": null,
  "isSidechain": true,
  "agentId": "a5a6fee096b88fb8e",
  "sessionId": "50a3bbf8-17a0-48d5-a36f-502116e0ceb9",
  "version": "2.1.285",
  "message": {
    "role": "user",
    "content": "Dispatch: task-002\nProbe only: reply DONE and change nothing. Call no tools."
  }
}
```

The foreground agent's first record has the same shape with `Dispatch: task-001`.
**`message.content` is a string**, not an array of blocks, in all four transcripts across both
runs. The `Dispatch:` line is the first line of that string, verbatim as dispatched.

## Finding not asked for: the final reply is not in the transcript at hook time

At hook time each agent transcript held 1 `user` + 9 `attachment` records and **no
`assistant` record**. After the session ended the same files held 1 `user` + 10 `attachment`
+ 1 `assistant`. Same in both runs (4 of 4 agents). The agent's last message is flushed to
`agent_transcript_path` only after SubagentStop runs; at hook time it exists only in
`last_assistant_message`.

## Open: SubagentHandback

The local CLI is 2.1.285 (`~/.local/share/claude/versions` holds 2.1.252, 2.1.281,
2.1.285; nothing newer). It has no `SubagentHandback` tool — 0 mentions in all transcripts —
so how a handback report appears in the payload is unverified. The planning session ran
2.1.309, where subagents hand back through `SubagentHandback`.

The finding above weakens the Architecture's fallback ("the resolver reads both
`last_assistant_message` and the transcript"): if the handback tool call is the agent's final
record, it is likely not yet in the transcript when the hook reads it either. Not proven —
needs one probe run on a CLI that has `SubagentHandback`.

## Consequences

**Row 2.8 (matcher).** `agent_type` is exactly `specmanager:builder` for both modes, so
`^specmanager:builder$` matches. The probe used no matcher, so it did not test whether the
matcher is applied to `agent_type`. Row 2.8's test should dispatch a non-builder agent and
check that the gate does not run for it.

**Row 2.13 (dispatch prose).** Background dispatch is fine: SubagentStop fires for a
background builder, with the parent's `session_id` and the `Dispatch:` line as the first
transcript record. The prose may allow `run_in_background: true` and parallel builders. The
resolver should read the first record's `message.content` as a string (accepting an array
costs little if a later CLI changes the shape) and take the `Dispatch:` line from its first
line.

**R1 / NEEDS_HUMAN (rows that build the resolver).** Read `last_assistant_message` first.
Treat the transcript as covering earlier messages only; do not count on it for the agent's
final message. Before the gate phase ships, re-run this probe on a CLI with
`SubagentHandback` with a builder that hands back `NEEDS_HUMAN: probe`, and record where the
marker shows up.

## SubagentHandback (CLI 2.1.310)

Run 2026-10-29 for plan row 2.4, CLI 2.1.310 (the VS Code extension's bundled binary, put
first on `PATH` for the run), sonnet, $0.165. The probe ran from a scratch copy whose only
changes were `REPO` fixed to this checkout and a one-builder prompt: one foreground
`specmanager:builder` with `Dispatch: task-001`, told to call `SubagentHandback` with
`NEEDS_HUMAN: probe`, or to reply with that text if it has no such tool.

- **The builder has no `SubagentHandback` tool.** Its tool list on 2.1.310 headless was
  `Bash`, `Edit`, `Read`, `Write`, `Skill`, `advisor` and the seven `specmanager` MCP tools.
  It replied in plain text.
- **The text lands in `last_assistant_message`:** `"last_assistant_message":"NEEDS_HUMAN: probe"`.
- **Not in the transcript at hook time:** 1 `user`, 9 `attachment`, 1 `api-request-shape`,
  2 `api-request-blob`, 1 `api-request` and no `assistant` record. After the session, one
  `assistant` record held the text `NEEDS_HUMAN: probe`. This matches the 2.1.285 finding.
- 2.1.310 adds `api-request*` records to the agent transcript. The first record is still
  `type: "user"` with string content starting `Dispatch: task-001`.

Gap: how a real `SubagentHandback` call shows up in the hook input is still unverified,
because a plugin builder run by the CLI doesn't get that tool. The resolver detects
`NEEDS_HUMAN:` at the start of `last_assistant_message` (proven above), and falls back to
the `message` of any `SubagentHandback` tool_use in the agent transcript. That call ends the
run, so it can only be the final report. Earlier assistant text in the transcript does not
count.

## Matcher (CLI 2.1.310)

Run 2026-10-29 for plan row 2.8, CLI 2.1.310, sonnet, $0.229. A scratch copy of the probe
registered two logging `SubagentStop` hooks: one with `matcher: "^specmanager:builder$"`, one
with no matcher. The session dispatched one foreground `specmanager:builder`
(`Dispatch: task-001`) and one foreground `general-purpose` agent, both with trivial prompts.

```
== matched
{"hook_event_name":"SubagentStop","agent_type":"specmanager:builder","agent_id":"a4eed2c2a893bee60"}
== all
{"hook_event_name":"SubagentStop","agent_type":"specmanager:builder","agent_id":"a4eed2c2a893bee60"}
{"hook_event_name":"SubagentStop","agent_type":"general-purpose","agent_id":"a3553545ef19afd6c"}
```

**Verdict: the `SubagentStop` matcher is checked against `agent_type`.** Both agents fired
`SubagentStop`, and only the builder reached the anchored hook. The resolver's own
`agent_type !== "specmanager:builder"` check stays as a second guard for selftests and other
hosts.
