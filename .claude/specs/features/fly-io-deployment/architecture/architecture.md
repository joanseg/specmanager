## Summary

This feature adds a remote Fly.io deployment path for the SpecManager board server, enabling spec viewing, doc approval, inline commenting with Claude-powered review, and git push from any device over HTTPS. It introduces a standalone server entry point (`fly-server.ts`) that wraps the existing `startBoardServer` with host binding to `0.0.0.0`, shared-token auth middleware, background git-sync, and auto-commit on write. A new MCP tool generates the deployment artifacts (Dockerfile, `fly.toml`, entrypoint script). The local `localhost` board is unchanged. Phases: P1 deploys the board with auth + sync; P2 adds inline comments and a "review" ChatMode; P3 adds a manual push panel.

## Affected components

| File | Change | Phase |
|---|---|---|
| `server/src/board-server.ts` | Add `host`, `bearerToken` options to `startBoardServer`; add `/healthz` route; WS `verifyClient` for token auth | P1 |
| `server/src/fly-server.ts` | **New.** Standalone entry point for Fly: env config, git clone init, auto-commit listener, git-sync interval | P1 |
| `server/src/git-sync.ts` | **New.** `startGitSync(root, interval)` — background `git pull --ff-only`, divergence detection | P1 |
| `server/src/git-ops.ts` | **New.** Shared async wrappers around `execFile` for git commands (`gitPull`, `gitPush`, `gitLog`, `gitStatus`) | P1 |
| `server/src/fly-templates.ts` | **New.** Generates Dockerfile, `fly.toml`, `entrypoint.sh` into `.specmanager/fly/` and copies dist artifacts | P1 |
| `server/src/mcp.ts` | Register `generate_fly_config` tool | P1 |
| `server/src/core/events.ts` | Add `git.synced`, `git.pushed`, `comment.created`, `comment.resolved` event types | P1+P2 |
| `server/src/core/comments.ts` | **New.** Comment CRUD: `createComment`, `listComments`, `resolveComment`, `deleteComment` | P2 |
| `server/src/agent-chat.ts` | Add `ChatMode = "review"`; build review system prompt that includes unresolved comments | P2 |
| `server/src/board-server.ts` | Add comment REST routes (`/api/documents/:id/comments`); add `GET /api/git/status`, `POST /api/git/push` | P2+P3 |
| `ui/src/api.ts` | Add `authFetch` wrapper with Bearer token from localStorage; add token query param to WS; add comment + git API functions | P1+P2+P3 |
| `ui/src/AuthGate.tsx` | **New.** Token input modal, shown on 401; stores token in localStorage | P1 |
| `ui/src/CommentSidebar.tsx` | **New.** Comment list sidebar with anchor text quotes, "Request Review" button | P2 |
| `ui/src/SyncPanel.tsx` | **New.** Unpushed commit list + diff viewer + "Push to remote" button | P3 |
| `ui/src/DocPanel.tsx` | Wire CommentSidebar into the panel layout; text selection -> "Add comment" affordance | P2 |
| `ui/src/types.ts` | Add `Comment`, `GitStatus`, `GitSyncEvent` types; extend `WsEvent` union | P1+P2+P3 |
| `ui/src/App.tsx` | Wrap in AuthGate; add SyncPanel route/toggle; show git-sync status banner | P1+P3 |
| `ui/src/styles.css` | Auth modal styles; comment sidebar styles; sync panel styles | P1+P2+P3 |
| `server/package.json` | No new runtime deps (git ops via `node:child_process`) | -- |

## Data model changes

### comment-schema

Comments are stored as sidecar JSON files alongside their parent document.

**Storage path:** `.claude/specs/features/<slug>/<stage>/<docname>.comments.json`
Example: `.claude/specs/features/fly-io-deployment/prd/prd.comments.json`

```ts
interface Comment {
  id: string;                // nano-id (same generator as core/ids.ts)
  docId: string;             // parent document id
  docVersion: number;        // version of doc body when comment was created
  anchor: {
    from: number;            // char offset in markdown body (hint)
    to: number;
    text: string;            // selected text (for fuzzy re-anchoring if offsets drift)
  } | null;                  // null = doc-level comment (no selection)
  body: string;              // comment text
  resolved: boolean;
  createdAt: string;         // ISO 8601
}

interface CommentsFile {
  comments: Comment[];
}
```

Re-anchoring strategy: on load, try exact offset match first; fall back to substring search for `anchor.text`; if not found, render as orphaned (displayed at doc level with a "text not found" note).

### git-sync-state

No persistent data model. Sync state is in-memory in `fly-server.ts`:

```ts
interface GitSyncState {
  lastSync: string | null;    // ISO timestamp of last successful pull
  status: "ok" | "diverged" | "error" | "idle";
  message: string | null;     // error/divergence details
  unpushedCount: number;      // from `git rev-list --count origin/HEAD..HEAD`
}
```

Broadcast to UI clients via the `git.synced` event on each sync cycle.

## P1 -- Board on Fly.io

### fly-server-entry-point

**New file:** `server/src/fly-server.ts`

Standalone Node entry point for Fly.io (compiled to `dist/fly-server.js`). Not imported by `mcp.ts` — the two entry points are parallel consumers of the shared `core/` and `board-server.ts` modules.

```ts
// Environment (all via Fly secrets / fly.toml [env])
const root = process.env.SPECMANAGER_PROJECT_DIR ?? "/data/repo";
const port = Number(process.env.PORT ?? 8080);
const token = process.env.BOARD_TOKEN;            // required
const syncInterval = Number(process.env.GIT_SYNC_INTERVAL ?? 300) * 1000; // seconds -> ms

async function main(): Promise<void> {
  if (!token) throw new Error("BOARD_TOKEN is required");

  const board = await startBoardServer({
    root,
    port,
    host: "0.0.0.0",
    bearerToken: token,
  });
  if (!board) throw new Error("board server failed to bind");

  startAutoCommit(root);                 // debounced git-add+commit on core events
  startGitSync(root, syncInterval);      // background pull interval

  console.log(`board server up at ${board.url}`);
}
```

`startAutoCommit` subscribes to `events.on()` for write-producing event types (`document.created`, `document.updated`, `status.changed`, `task.updated`, `comment.created`, `comment.resolved`) and debounces (2 s) a `git add .claude/specs/ && git commit -m "Board: <summary>"`. Follows the same debounced-event-listener pattern as `startClaudeMdAutoSync` in `mcp.ts` (lines 554-581).

### board-server-host-and-auth

Expand `startBoardServer` options in `server/src/board-server.ts`:

```ts
export async function startBoardServer(opts: {
  root?: string;
  port?: number;
  host?: string;           // default "127.0.0.1" — preserves local behavior
  bearerToken?: string;    // if set, all routes except /healthz require auth
} = {}): Promise<BoardServer | null>
```

**HTTP auth** -- Fastify `onRequest` hook, registered before routes:

```ts
if (opts.bearerToken) {
  const expected = opts.bearerToken;
  app.addHook("onRequest", async (req, reply) => {
    if (req.url === "/healthz") return;
    const header = req.headers.authorization;
    if (!header || header !== `Bearer ${expected}`) {
      reply.code(401).send({ error: "unauthorized" });
    }
  });
}
```

**WS auth** -- `verifyClient` on `WebSocketServer`:

```ts
const wss = new WebSocketServer({
  server: app.server,
  path: "/ws",
  verifyClient: opts.bearerToken
    ? ({ req }, cb) => {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const tok = url.searchParams.get("token");
        cb(tok === opts.bearerToken);
      }
    : undefined,
});
```

Browsers cannot set headers on WebSocket; the token is passed as a query parameter `?token=<value>`. The UI reads it from localStorage.

**Host binding** -- change the `bindWithFallback` call (line 353) to use `opts.host ?? "127.0.0.1"`:

```ts
boundPort = await bindWithFallback(app, host, port, 20);
```

The `url` returned by `BoardServer` becomes `http://${host}:${boundPort}` (for logging; on Fly the public URL is `https://<app>.fly.dev`).

### health-endpoint

Add before the auth hook so it remains unauthenticated:

```ts
app.get("/healthz", async () => ({ status: "ok" }));
```

Fly's health check (configured in `fly.toml`) pings this endpoint. Returning 200 means the board is alive.

### git-sync-worker

**New file:** `server/src/git-sync.ts`

```ts
export function startGitSync(root: string, intervalMs: number): { stop: () => void }
```

Each tick:

1. `execFile("git", ["fetch", "--prune"], { cwd: root })`
2. `execFile("git", ["pull", "--ff-only"], { cwd: root })`
3. On success: `events.emit({ type: "git.synced", status: "ok" })`; chokidar picks up file changes and broadcasts `file.changed` events to connected clients.
4. On `--ff-only` failure (exit code 128, "Not possible to fast-forward"): emit `{ type: "git.synced", status: "diverged", message }`. UI shows a warning banner.
5. On other error: emit `{ type: "git.synced", status: "error", message }`.

`stop()` clears the interval timer.

### git-ops

**New file:** `server/src/git-ops.ts`

Thin `execFile` wrappers used by `git-sync.ts`, `fly-server.ts` (auto-commit), and P3's push endpoint:

```ts
export async function gitExec(args: string[], cwd: string): Promise<{ stdout: string; stderr: string }>
export async function gitFetchAndPull(cwd: string): Promise<{ ok: boolean; diverged: boolean; message?: string }>
export async function gitPush(cwd: string): Promise<{ ok: boolean; message?: string }>
export async function gitUnpushedLog(cwd: string): Promise<{ count: number; commits: Array<{ hash: string; subject: string; date: string }> }>
export async function gitAutoCommit(cwd: string, message: string): Promise<boolean>  // true if committed
```

No new npm dependencies -- uses `node:child_process.execFile` with `util.promisify`.

### fly-config-generator

New MCP tool registered in `mcp.ts`:

```ts
server.registerTool(
  "generate_fly_config",
  {
    description: "Generate Dockerfile, fly.toml, and entrypoint.sh for deploying the board to Fly.io.",
    inputSchema: z.object({
      appName: z.string().optional(),       // Fly app name; default derived from project dir basename
      region: z.string().default("mad"),    // Fly region code
    }),
  },
  async ({ appName, region }) => { ... }
);
```

Actions:

1. Resolve plugin root: `path.resolve(__dirname, "..", "..")` (same pattern as `UI_DIST` in `board-server.ts` line 38).
2. Create `.specmanager/fly/` in `PROJECT_DIR`.
3. Copy `<plugin>/server/dist/` -> `.specmanager/fly/server/dist/`.
4. Copy `<plugin>/server/package.json` -> `.specmanager/fly/server/package.json`.
5. Copy `<plugin>/ui/dist/` -> `.specmanager/fly/ui/dist/`.
6. Write `.specmanager/fly/Dockerfile`.
7. Write `.specmanager/fly/entrypoint.sh`.
8. Write `fly.toml` at `PROJECT_DIR` root.
9. Return `{ flyDir, flyToml, instructions }`.

The `.specmanager/fly/` directory should be added to `.gitignore` (build artifacts).

### deployment-templates

**Dockerfile** (`.specmanager/fly/Dockerfile`):

```dockerfile
FROM node:20-alpine
RUN apk add --no-cache git openssh-client
WORKDIR /app
COPY server/package.json server/
RUN cd server && npm install --omit=dev --no-audit --no-fund
COPY server/dist/ server/dist/
COPY ui/dist/ ui/dist/
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh
EXPOSE 8080
CMD ["sh", "entrypoint.sh"]
```

**entrypoint.sh** (`.specmanager/fly/entrypoint.sh`):

```sh
#!/bin/sh
set -e
REPO_DIR="${SPECMANAGER_PROJECT_DIR:-/data/repo}"

# Configure HTTPS git credentials
if [ -n "$GIT_TOKEN" ]; then
  git config --global credential.helper \
    "!f() { echo username=x-access-token; echo password=$GIT_TOKEN; }; f"
fi
git config --global user.name "SpecManager Board"
git config --global user.email "board@specmanager.local"

# Clone repo if volume is empty
if [ ! -d "$REPO_DIR/.git" ]; then
  if [ -z "$GIT_REMOTE_URL" ]; then
    echo "ERROR: GIT_REMOTE_URL not set and no repo at $REPO_DIR" >&2
    exit 1
  fi
  git clone "$GIT_REMOTE_URL" "$REPO_DIR"
fi

exec node /app/server/dist/fly-server.js
```

**fly.toml** (project root):

```toml
app = "<app-name>"
primary_region = "<region>"

[build]
  dockerfile = ".specmanager/fly/Dockerfile"
  [build.args]

[env]
  SPECMANAGER_PROJECT_DIR = "/data/repo"
  PORT = "8080"
  GIT_SYNC_INTERVAL = "300"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 0

[checks]
  [checks.health]
    port = 8080
    type = "http"
    interval = "30s"
    timeout = "5s"
    path = "/healthz"

[mounts]
  source = "specmanager_data"
  destination = "/data"

[[vm]]
  memory = "512mb"
  cpu_kind = "shared"
  cpus = 1
```

Secrets set by the user via `fly secrets set`: `BOARD_TOKEN`, `ANTHROPIC_API_KEY`, `GIT_REMOTE_URL`, `GIT_TOKEN`.

**Git credentials recommendation (Q9):** HTTPS + Personal Access Token. The `GIT_TOKEN` is set as a Fly secret; the entrypoint configures a git credential helper that returns it. This avoids SSH key management in containers. The `GIT_REMOTE_URL` uses plain HTTPS (e.g., `https://github.com/user/repo.git`).

### ui-auth-flow

**New file:** `ui/src/AuthGate.tsx`

Wraps `App` at the root (`main.tsx`). On mount, attempts a fetch to `/api/board`. On 401, renders a token input modal. On success, renders children.

Token lifecycle:
1. Stored in `localStorage` as `boardToken`.
2. All API calls go through a modified `authFetch` in `api.ts` that adds `Authorization: Bearer <token>`.
3. WS connections append `?token=<token>` to the URL.
4. A "Sign out" action clears localStorage and reloads.

**Changes to `ui/src/api.ts`:**

```ts
function getToken(): string | null {
  return localStorage.getItem("boardToken");
}

async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string>) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { ...init, headers });
  if (res.status === 401) {
    window.dispatchEvent(new Event("board:auth-required"));
    throw new Error("unauthorized");
  }
  return res;
}
```

Replace all `fetch(...)` calls in `api.ts` with `authFetch(...)`. Modify `openWebSocket` and `openChatSocket` to include the token query param.

When `BOARD_TOKEN` is not set (local mode), the server has no auth hook, so the `Authorization` header is ignored and plain `fetch` works unchanged. The `AuthGate` check to `/api/board` succeeds immediately, so the modal never appears.

## P2 -- Inline comments and review

### comment-storage

**New file:** `server/src/core/comments.ts`

Sidecar file stored at the same level as the document, named `<docbasename>.comments.json`.

```ts
export async function listComments(docId: string, root: string): Promise<Comment[]>
export async function createComment(input: {
  docId: string;
  docVersion: number;
  anchor: { from: number; to: number; text: string } | null;
  body: string;
}, root: string): Promise<Comment>
export async function resolveComment(docId: string, commentId: string, root: string): Promise<Comment>
export async function deleteComment(docId: string, commentId: string, root: string): Promise<void>
```

`createComment` resolves the doc's file path via `readDocumentById`, derives the sidecar path (`path.join(dir, basename + ".comments.json")`), reads or creates the sidecar, appends the comment, writes back. Emits `comment.created` event.

### comment-rest-api

Added to `board-server.ts`:

| Method | Path | Body | Response |
|---|---|---|---|
| `GET` | `/api/documents/:id/comments` | -- | `Comment[]` |
| `POST` | `/api/documents/:id/comments` | `{ docVersion, anchor?, body }` | `Comment` |
| `PATCH` | `/api/documents/:id/comments/:commentId` | `{ resolved: true }` | `Comment` |
| `DELETE` | `/api/documents/:id/comments/:commentId` | -- | `{ ok: true }` |

### review-chat-mode

Extend `ChatMode` in `server/src/agent-chat.ts`:

```ts
export type ChatMode = "interview" | "co-write" | "review";
```

New `STAGE_PERSONA` override for review mode is not stage-specific; instead, `buildSystemPrompt` adds a review-specific `modeLine`:

```ts
if (mode === "review") {
  modeLine = `The user has left inline comments on this document. Review each comment, address the feedback with specific improvements, and persist the revised document via write_document. Present proposed changes as a focused summary before writing.`;
}
```

The comments are appended to the system prompt as a structured block:

```ts
if (mode === "review" && comments.length > 0) {
  guardrails += `\n\nInline comments to address:\n`;
  for (const c of comments) {
    const anchor = c.anchor ? `> ${c.anchor.text}\n` : "";
    guardrails += `- [${c.id}] ${anchor}${c.body}\n`;
  }
}
```

The "Request Review" flow in the UI:

1. User clicks "Request Review" in the CommentSidebar.
2. UI sends a `chat.send` WS message with `mode: "review"` and a message like `"Review this document and address all unresolved comments."`.
3. The board server's `handleClientMessage` passes the mode through to `runChat`.
4. `runChat` loads the doc AND its comments, builds the review system prompt, sends to the Anthropic API.
5. Claude's response streams back via WS events; if it calls `write_document`, the revision is persisted.
6. The UI shows the streamed response in the ChatPanel and refreshes the doc on `document.updated`.

To pass comments to `runChat`, extend `RunChatInput` with an optional `comments` field, or have `runChat` load them internally when `mode === "review"` (cleaner -- keeps the WS message protocol unchanged).

### comment-ui-overlay

**New file:** `ui/src/CommentSidebar.tsx`

Renders as a third column in the DocPanel layout (reuses the existing `panel__body--cols-3` grid, which already has a `panel__chat` slot at `1024px+` and stacks below at tablet widths).

Components:
- **CommentList** -- scrollable list of comments, each showing anchor text (quoted), body, and a "Resolve" button.
- **CommentInput** -- text input + "Add" button, wired to the current text selection in the Milkdown editor.
- **ReviewButton** -- "Request Review" button that triggers the review ChatMode.

Text selection -> comment creation:

1. DocPanel tracks the current ProseMirror selection (start/end offsets in the markdown body via Milkdown's serializer).
2. When the user clicks "Add comment" with a selection active, it calls `POST /api/documents/:id/comments` with `{ anchor: { from, to, text: selectedText }, body, docVersion }`.
3. The comment appears in the sidebar immediately (optimistic update).

Existing layout wiring: DocPanel already has a `showChat` toggle that switches between `cols-2` and `cols-3`. Extend this to also toggle the comment sidebar. The chat and comments could share the third column (tabbed) or stack vertically when both are open. The simplest approach for the wedge: a toggle between Chat and Comments in the third column, sharing the same grid slot.

## P3 -- Manual push

### git-status-api

Added to `board-server.ts`:

| Method | Path | Response |
|---|---|---|
| `GET` | `/api/git/status` | `{ unpushedCount, commits: [{ hash, subject, date }], diverged, lastSync }` |

Calls `gitUnpushedLog(root)` from `git-ops.ts`. The commit list comes from `git log --oneline origin/HEAD..HEAD`.

### push-endpoint

| Method | Path | Response |
|---|---|---|
| `POST` | `/api/git/push` | `{ ok, message? }` |

Calls `gitPush(root)` from `git-ops.ts`. On success: emits `{ type: "git.pushed", status: "ok" }`. On failure: returns 500 with the error message and emits `{ type: "git.pushed", status: "error", message }`.

### sync-panel-ui

**New file:** `ui/src/SyncPanel.tsx`

Accessible from a "Sync" button in the board header (next to the existing controls). Renders as a slide-over panel (reuses the `.panel` / `.panel-backdrop` CSS pattern from DocPanel).

Contents:
- **Sync status** -- last successful sync timestamp, current status badge (`ok`/`diverged`/`error`).
- **Unpushed commits** -- list of commits with hash, subject, date.
- **Push button** -- "Push to remote" with confirmation. Disabled when no unpushed commits or sync is diverged.
- **Force sync** -- when diverged, a "Reset to remote" button with a confirmation dialog that runs `git fetch && git reset --hard origin/HEAD`. This is safe because the user has explicitly confirmed they want to discard local-only changes.

The panel subscribes to `git.synced` and `git.pushed` WS events for real-time updates.

## Deferred capabilities

Brief sketch for planner awareness; not architecturally specified.

| Phase | Concept | Key considerations |
|---|---|---|
| D1 -- Claude Code runner | On-demand Fly machines via `fly machines run` with a Claude Code image. Board server would need a job queue (Redis or in-memory) and a `/api/runner/start` endpoint. Machine lifecycle: start on command trigger, stream stdout via WS, stop on idle timeout. | Requires `flyctl` or Fly Machines API (`POST /v1/apps/<app>/machines`) from the board server. Cost: ~$0.006/min for shared-cpu-1x. |
| D2 -- Session continuity | Sync `~/.claude/` conversation JSON between dev machine and Fly volume. Could use a shared git-tracked directory or an object store. Requires solving session identity (which session to resume). | Privacy concern: conversation history may contain sensitive data. |
| D3 -- Diff review surface | Rich diff viewer (e.g., `diff2html` or a ProseMirror diff plugin) for reviewing Claude's code changes before push. Would read `git diff HEAD~N..HEAD` from the Fly clone. | Mostly a UI concern; the git-ops layer from P3 provides the data. |
| D4 -- Per-user auth | Replace shared token with OAuth (GitHub OAuth App or Fly's built-in auth). Requires session management, user identity on comments/approvals, and an audit trail in the sidecar data. | Breaking change to the auth model; shared token becomes a fallback. |

## Sequence flows

### P1 -- Deploy and access

```
User                    CLI / MCP              Fly.io
 |-- /specmanager-deploy -->|                     |
 |                          |-- generate_fly_config
 |                          |   (writes .specmanager/fly/)
 |<-- instructions ---------|                     |
 |-- fly secrets set ------>|                     |
 |-- fly volumes create --->|                     |
 |-- fly deploy ----------->|                     |
 |                          |          Dockerfile builds image
 |                          |          entrypoint.sh clones repo
 |                          |          fly-server.ts starts board
 |                          |          Fly assigns <app>.fly.dev
 |                          |                     |
 |-- https://app.fly.dev -->|                     |
 |   (browser)              |         AuthGate -> 401 -> token modal
 |-- enter token ---------->|         localStorage -> authFetch
 |<-- board renders --------|                     |
```

### P1 -- Git sync cycle

```
fly-server.ts (interval)         git              board-server
      |-- gitFetchAndPull() -->   |                     |
      |                    fetch + pull --ff-only        |
      |<-- { ok: true } ------   |                     |
      |-- events.emit(git.synced) ------------------>   |
      |                                         chokidar detects changes
      |                                         events.emit(file.changed)
      |                                         WS broadcast to clients
```

### P2 -- Comment and review

```
User (browser)           board-server              agent-chat (Anthropic API)
 |-- select text -------->|                              |
 |-- POST /comments ----->|                              |
 |                        |-- createComment()            |
 |                        |-- events.emit(comment.created)
 |<-- comment rendered ---|                              |
 |-- "Request Review" --->|                              |
 |   (WS: chat.send,     |                              |
 |    mode: "review")     |-- runChat(mode: "review") -->|
 |                        |   (doc + comments in prompt) |
 |                        |<-- stream response --------- |
 |<-- chat.delta ---------|                              |
 |                        |   (agent calls write_document)
 |<-- document.updated ---|                              |
 |   (doc refreshes)      |                              |
```

### P3 -- Manual push

```
User (browser)           board-server                    git
 |-- open SyncPanel ----->|                               |
 |-- GET /api/git/status->|-- gitUnpushedLog() --------->|
 |<-- commit list --------|<-- log output ----------------|
 |-- "Push to remote" --->|                               |
 |-- POST /api/git/push ->|-- gitPush() ---------------->|
 |                        |<-- push result ---------------|
 |<-- { ok: true } -------|                               |
 |                        |-- events.emit(git.pushed) --->|
 |<-- git.pushed WS ------|                               |
```

## Failure and edge cases

| Scenario | Handling |
|---|---|
| `BOARD_TOKEN` not set on Fly | `fly-server.ts` throws at startup. Board does not start. Entrypoint exits with error. |
| `GIT_REMOTE_URL` not set and volume empty | Entrypoint exits with error before Node starts. |
| `git pull --ff-only` fails (diverged) | `git.synced` event with `status: "diverged"`. UI shows warning banner. User can push local changes first (P3) or force-reset via SyncPanel. |
| `git push` fails (no network / auth expired) | `POST /api/git/push` returns 500 with error message. `git.pushed` event with `status: "error"`. UI displays the error inline. |
| `git push` fails (rejected, remote has new commits) | Return 500 with "non-fast-forward" error. UI suggests pulling first (next sync cycle or manual "Sync now" button). |
| WS connection without token | `verifyClient` rejects the upgrade; client gets a close frame. UI detects disconnection and shows auth modal. |
| API request with expired/wrong token | 401 response. `authFetch` dispatches `board:auth-required` event; `AuthGate` shows token modal. |
| `ANTHROPIC_API_KEY` not set (P2 review) | `chatAvailable()` returns false (existing behavior). "Request Review" button disabled with tooltip. |
| Comment anchor text not found in updated doc | Comment renders as "orphaned" in sidebar -- full body shown, anchor displayed as stale quote with a warning. |
| Volume lost (Fly machine destroyed) | Repo re-cloned from remote on next boot. Comments and local-only changes lost if not pushed. This is documented in the setup instructions. |
| Concurrent writes (two users approve same doc) | Existing optimistic concurrency (`baseVersion` check in `writeDocument`) rejects the second write with 409. UI shows conflict. |
| Auto-commit races with git-sync pull | Debounce auto-commit (2s) reduces likelihood. If a pull lands mid-commit, git's own index lock serializes the operations. |
| Fly machine stops (scale to zero) | `auto_start_machines = true` in `fly.toml` restarts on next request. Boot time ~5-10s for Node + git pull. Health check at `/healthz` confirms readiness. |

## Conventions used

| Convention | How this design matches it |
|---|---|
| `"type": "module"`, Node 20+, TS strict | `fly-server.ts`, `git-sync.ts`, `git-ops.ts`, `comments.ts` all use ESM imports; compiled via `tsc -p tsconfig.json` to `dist/` |
| Errors via thrown `Error`, not `Result<T,E>` | All new functions throw on failure (matching `core/documents.ts`, `core/status.ts`) |
| Event-driven side effects via `core/events.ts` | New events (`git.synced`, `git.pushed`, `comment.created`, `comment.resolved`) follow the existing `SpecEvent` union pattern |
| Fastify routes in `board-server.ts`, no separate router files | Comment + git routes added inline (matching existing pattern of all routes in one file) |
| UI uses relative URLs, derives WS from `location.host` | No change needed for Fly -- relative URLs work on any host |
| React 18 functional components, no class components | `AuthGate`, `CommentSidebar`, `SyncPanel` are all function components |
| CSS in `styles.css` with token vars from `tokens.css` | New styles use existing token vars (`--surface-container-high`, `--outline-variant`, etc.) |
| Self-tests as hand-rolled scripts (`dist/selftest-*.js`) | New `selftest-fly.ts`: boots `fly-server.ts` with a temp dir, verifies auth, git-sync, comments CRUD |
| No new npm dependencies for server | Git ops via `node:child_process.execFile` (used in `mcp.ts` for `spawn`); comments use existing `core/ids.ts` for id generation |
| `SPECMANAGER_PROJECT_DIR` resolves the project root | Fly entry point sets this to `/data/repo` via `fly.toml [env]` |

## Open questions

| # | Question | Impact | Recommendation |
|---|---|---|---|
| Q1 | Should `.specmanager/fly/` be gitignored or committed? | Committed = reproducible deploys; ignored = no dist artifacts in repo | Recommend gitignored; the generate tool recreates it. Add `.specmanager/fly/` to `.gitignore` during generation. |
| Q2 | Should the comment sidebar replace the chat panel or share its column? | Affects DocPanel layout complexity | Recommend tabbed toggle in the third column (Chat / Comments tabs) — avoids layout changes and reuses existing `cols-3` grid. |
| Q3 | Should auto-commit group changes by type (e.g., "Board: approved prd-xxx") or use a generic message? | Affects commit readability when reviewing push candidates in P3 | Recommend typed messages: include event type and doc/task id in the commit message for traceability. |
| Q4 | What happens to comments when the parent document is edited (version changes)? | Anchor drift; stale comments | Comments persist with their `docVersion`. Re-anchoring is best-effort. A "Refresh anchors" action could re-map offsets to the latest body. |
| Q5 | Should the generate tool also run `fly launch` via `execFile`, or just generate files and instruct the user? | DX vs. safety | Recommend generate-only; the user runs `fly launch` / `fly deploy` themselves. Avoids needing `flyctl` on PATH and account auth in the MCP server. |
| Q6 | Should the force-reset flow in SyncPanel run `git stash` before `git reset --hard` to preserve local changes? | Data safety on divergence resolution | Recommend yes: `git stash -u` before reset, with a note in the UI that stashed changes can be recovered. |
| Q7 | The PRD mentions mobile-responsive fixes (P1). The UI already has 3 responsive breakpoints (desktop, tablet 1024px, mobile 639px). Are any additional mobile fixes needed? | Scope of P1 mobile work | Likely minimal. The existing `@media (max-width: 639px)` rules linearize the grid and go full-width on panels. Verify with a real phone during build; no architectural changes expected. |
