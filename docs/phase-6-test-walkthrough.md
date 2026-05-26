# Phase 6 — Test walkthrough

End-to-end test of **in-UI AI chat**: a chat panel inside the doc detail view interviews you on a blank PRD, co-writes on a doc that already has content, and persists changes through the same optimistic-concurrency path the human editor uses.

> Exit criterion (from `docs/phase-tasks.md`):
> Open a blank PRD → chat interviews you and drafts live; open an existing doc → co-write; make a manual edit mid-stream and confirm the version check prevents clobbering.

Assumes Phases 1–5 already pass.

## 0. Prerequisites

- An `ANTHROPIC_API_KEY` (or an active `CLAUDE_CODE_OAUTH_TOKEN` / `CLAUDE_AGENT_SDK_OAUTH_TOKEN`) exported in the environment that **launches Claude Code**. The board server inherits it. Without it, the chat panel renders an explicit "Chat unavailable" state — that's correct behavior, not a bug.
- Phase 6 is single-user / single-host. The board server still binds 127.0.0.1 only.

```bash
# Verify before launching claude:
echo "$ANTHROPIC_API_KEY" | head -c 7 && echo " …"
```

## 1. Build (contributors only)

```bash
cd plugins/specmanager/server
npm install
npm run build
npm run selftest          # Phase 1 core flow
npm run selftest-board    # Phase 2–5 REST + WS + tasks
npm run smoke-mcp         # 17 tools registered

cd ../ui
npm install
npm run build
```

Note: Phase 6 bumps `zod` to v4 (the Agent SDK requires it; the MCP SDK 1.29 accepts it). If your `npm install` fails with `ERESOLVE`, delete `node_modules` and `package-lock.json` and retry.

## 2. Install + reload the plugin in your test repo

```
/plugin marketplace update specmanager
/plugin uninstall specmanager
/plugin install specmanager@specmanager
/reload-plugins
```

If `/reload-plugins` reports "1 error during load":

```bash
pkill -f '^claude$'
claude daemon stop
ps aux | grep specmanager | grep -v grep   # kill any leftovers (e.g. kill -9 70410) -9 forces the kill
lsof -nP -iTCP:4317 -sTCP:LISTEN
cd /path/to/your/test/repo
ANTHROPIC_API_KEY=sk-ant-... claude       # confirm the key is in the env, but selct No (Recommended)
```

## 3. Open the board

```
/specmanager-board
```
if fails, /reload-plugins, exit claude, and open claude.

## 4. Phase 6 exit checks

### 4.1 Chat backend status

In the browser, hit `http://127.0.0.1:4317/api/chat/status` directly.

Expected JSON when chat is available:

```json
{ "available": true }
```

Or, without a key:

```json
{ "available": false, "reason": "set ANTHROPIC_API_KEY (…)" }
```

### 4.2 Open a blank PRD → interview mode

1. Create a fresh feature: `/specmanager-feature Sample chat feature`.
2. Use the MCP tool `create_document` to create an **empty-body** PRD:
   > Use `create_document` with `{ featureId: "feat-list-view", stage: "prd", title: "Sample PRD", body: "" }`.
3. Click the PRD card on the board. The doc panel opens. Tick the **Chat** toggle in the toolbar — a third column slides in on the right.
4. The chat header should show a mode badge **interview** (because the body is blank).
5. In the composer, type `please draft a tight PRD for a leaderboard feature on this app — the contributors track is the priority.` and press Enter.

Expected:

- The chat shows a `You` message immediately, then an `Agent` message that **streams in token-by-token**.
- A `tool: write_document` row appears at the moment the agent persists the first draft.
- The CodeMirror editor on the left **refreshes** to show the new body without you saving (the panel watches for the write_document tool call).
- The doc panel's version badge bumps from v1 to v2 (or higher, if the agent does multiple revisions).

Verify on disk:

```bash
grep "^version:" .claude/specs/features/sample-chat-feature/prd/prd.md
# → version: 2  (or higher)
grep "^generatedBy:" .claude/specs/features/sample-chat-feature/prd/prd.md
# → generatedBy: agent
head -40 .claude/specs/features/sample-chat-feature/prd/prd.md
```

### 4.3 Co-write mode on a doc that already has content

1. Open any *existing* PRD draft (one with body content).
2. Enable Chat.
3. Mode badge should now show **co-write**.
4. Ask: `add a "Success metrics" section after Goals; suggest 3 KPIs.`
5. Expected: agent proposes briefly in chat, then writes via `write_document` (tool chip appears). The body diff appears in the editor.

### 4.4 Mid-stream conflict (version check prevents clobbering)

1. In the panel, send a longer prompt that will plausibly take several seconds: `expand every section significantly with examples.`
2. **While the agent is mid-stream**, switch to a terminal and append a line directly to the file:

   ```bash
   echo "\n<!-- human touched mid-stream -->" >> .claude/specs/features/<slug>/prd/prd.md
   ```

3. When the agent tries `write_document`, its `baseVersion` will be stale. Expected:
   - A `tool: write_document` chip appears.
   - The agent receives a **version-conflict error** from the tool (the prompt instructs it to surface this rather than retry blindly).
   - The agent's next message reports the conflict to you in plain English.
   - **The file on disk is NOT overwritten by the agent** — your manual line is still there:

     ```bash
     tail -3 .claude/specs/features/<slug>/prd/prd.md
     ```

4. (Sanity) Send `re-read the doc and try again, keeping my manual additions.` The agent should call `read_document` first, then write with the fresh version. The conflict pattern resolves itself.

### 4.5 Cancel a turn

1. Send a prompt that will be long-running.
2. Click **Cancel**. The streaming stops, the agent run is aborted (AbortController on the server). Mode + composer return to idle.

### 4.6 Approved doc is read-only in chat

1. Approve the PRD via the panel's Approve button.
2. The composer label becomes "Read-only — reopen to edit." The agent prompt also enforces this in its system prompt; if the user pushes back, the agent should refuse to edit until you reopen.

## 5. Pass criteria (all required)

- [ ] `GET /api/chat/status` returns `{ available: true }` when a credential is on env, `{ available: false, reason: ... }` when not.
- [ ] Chat panel renders an explicit "unavailable" card when no credential — never blank-screens.
- [ ] Blank PRD → mode badge is `interview`; agent draft persists via `write_document` and the editor refreshes live (no manual reload).
- [ ] Existing doc → mode badge is `co-write`.
- [ ] Mid-stream manual edit causes `write_document` to fail with a version-conflict error AND the on-disk file retains the manual edit.
- [ ] Cancel button aborts an in-flight stream within ~1s.
- [ ] Approved doc shows a read-only composer.

## 6. Deferred (explicit follow-ups, not regressions)

These are out of scope for the Phase 6 MVP and tracked for a follow-up:

- **6.13 AI-written range highlighting + undo** — would require CodeMirror decoration plumbing to mark which character ranges came from the agent and let the user revert one write at a time. The Phase 3 "Reload from disk" + git already cover the safety net.
- **6.14 Per-doc turn budget (the cap side)** — only the idle-teardown half ships (sessions older than 15 minutes drop from the in-memory registry). A hard `maxTurns` per session lifetime is not yet enforced beyond the SDK's per-call `maxTurns: 12`.
- **6.4 Subscription credit awareness** — we detect API-key presence only; no live subscription-credit reporting.

## 7. Troubleshooting

- **Chat panel shows "Chat unavailable" even though `ANTHROPIC_API_KEY` is set in your shell** — Claude Code (and therefore the MCP server it spawns) inherits env from the parent terminal, but daemons launched earlier from a different shell may not see it. Restart the Claude daemon from a shell where the env var is set: `claude daemon stop && claude`.
- **`write_document` repeatedly fails with version-conflict** — the agent is using a stale `baseVersion`. The system prompt tells it to refresh via `read_document` before retrying. If you see retry loops, capture the chat transcript and the prompt is tunable.
- **Long streams crackle / slow** — the SDK's stream events are forwarded over the SAME `/ws` that broadcasts board events. If thousands of `file.changed` events fire in parallel, the chat stream can stall briefly. Phase 2's debounce keeps this rare in practice.

## 8. Teardown

```bash
git add CLAUDE.md .claude/
git diff --staged --stat
```
