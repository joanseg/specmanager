---
id: prd-fly-io-deployment-038
featureId: feat-fly-io-deployment
stage: prd
status: approved
stale: false
title: Fly.io deployment PRD
dependsOn: []
basedOn: {}
generatedBy: human
version: 3
createdAt: '2026-08-04T09:36:55.254Z'
updatedAt: '2026-08-04T09:43:03.712Z'
---
## Problem

SpecManager's board and Claude Code session are locked to the dev machine. There is no way to view specs, approve documents, or trigger work from a phone, tablet, or second computer. The Claude mobile app provides generic Claude, not the project-aware Claude Code environment with plugins, MCP tools, and the specmanager workflow. This means:

- **No mobile oversight.** Progress checks, doc approvals, and quick reviews require being at the dev machine.

- **No teammate access.** Collaborators cannot view the board, leave comments, or trigger builds without physical access to the running session.

- **Workflow is single-session.** The board dies when the terminal session ends; there is no persistent, always-available project dashboard.

## Users and jobs-to-be-done

| User                            | Job                                                                                                                           |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Solo developer (primary)        | View specs, approve docs, and monitor build progress from any device (phone, tablet, laptop) without being at the dev machine |
| Teammate / reviewer             | Read specs, leave inline comments on documents, approve or request changes, track feature progress                            |
| Solo developer triggering work  | Kick off Claude Code commands (PRD drafting, builds, architecture) from the board without a terminal                          |
| Solo developer reviewing output | Review diffs and commits Claude produced, then explicitly push to the remote when satisfied                                   |

## Goals

| #  | Goal                                                                               | Scope    |
| -- | ---------------------------------------------------------------------------------- | -------- |
| G1 | Deploy the existing board to Fly.io so it is accessible from any device over HTTPS | Wedge    |
| G2 | Authenticate access with a shared bearer token                                     | Wedge    |
| G3 | Keep the Fly-hosted board in sync with the repo via a git-cloned volume            | Wedge    |
| G4 | Enable inline comments on documents with Claude-powered review/rewrite             | Wedge    |
| G5 | Allow manual push of the Fly clone's commits to the remote from the board UI       | Wedge    |
| G6 | On-demand Claude Code runner containers for triggering commands from the board     | Deferred |
| G7 | Shared/resumable sessions between terminal Claude Code and the Fly board           | Deferred |
| G8 | Diff review surface in the board UI                                                | Deferred |
| G9 | Per-user authentication and audit trail                                            | Deferred |

## Non-goals

- **Not a hosted SaaS.** This is a self-deploy feature for users who run their own Fly.io account; SpecManager does not operate shared infrastructure.

- **Not a replacement for the local board.** The local `localhost` board continues to work unchanged; Fly deployment is additive.

- **No CI/CD integration.** The Fly deployment does not hook into GitHub Actions or other CI pipelines (that is `feat-github-spec-sync-issues-prs`).

- **No real-time collaborative editing.** Multiple users can view and comment, but simultaneous document editing is out of scope.

## Success metrics

| Metric                                                              | Target                                                          |
| ------------------------------------------------------------------- | --------------------------------------------------------------- |
| Board accessible from a phone browser over HTTPS                    | Works on first deploy                                           |
| Time from `fly deploy` to board serving requests                    | Under 60 seconds                                                |
| Git sync latency (commit on dev machine to visibility on Fly board) | Configurable polling interval; default 5 minutes                |
| Auth: unauthenticated requests rejected                             | 100% of API/WS/UI routes                                        |
| Manual push from board UI succeeds                                  | Pushes to configured remote without data loss                   |
| Inline comment triggers Claude rewrite via agent-chat               | Response returned within the existing agent-chat latency bounds |

## Constraints and assumptions

### Constraints

- **Fly.io account required.** The user must have a Fly.io account and `flyctl` installed. SpecManager provides the Dockerfile and `fly.toml`; the user runs `fly deploy`.

- **`ANTHROPIC_API_KEY`** **on Fly.** Inline comments/review (G4) call the Anthropic API directly from the board server. The key must be set as a Fly secret.

- **Volume persistence.** The repo clone lives on a Fly volume. Fly volumes are pinned to a single region and a single machine; this limits scale-to-zero to stopping (not destroying) the machine.

- **HTTPS via Fly.** Fly provides automatic TLS termination on `*.fly.dev` domains. No custom cert management needed for v1.

- **Port 8080.** Fly's default HTTP handler expects port 8080 internally (configurable in `fly.toml`).

### Assumptions

- The board server's existing Fastify + WS + chokidar stack runs unmodified in an Alpine container with the repo clone as the project root.

- `git pull --ff-only` on a cron/interval is sufficient for sync in the wedge; webhook-triggered sync is deferred.

- The shared bearer token is set via `fly secrets set BOARD_TOKEN=<value>` and checked as a middleware on every HTTP/WS request.

- The existing board UI works on mobile viewports (responsive); if not, mobile layout fixes are in scope for the wedge.

## High-level user flows

### Deploy to Fly.io (one-time setup)

1. User runs a SpecManager command or script that generates `Dockerfile` + `fly.toml` for their project.
1. User runs `fly launch` / `fly deploy` from the project root.
1. Fly builds the Alpine container (board server + UI dist + repo clone tooling), creates a volume, clones the repo onto it.
1. Board starts on port 8080, Fly assigns `<app-name>.fly.dev` with TLS.
1. User sets `BOARD_TOKEN` and `ANTHROPIC_API_KEY` via `fly secrets set`.

### View and approve from phone

1. User opens `https://<app-name>.fly.dev` on their phone.
1. Browser prompts for token (stored in localStorage after first entry).
1. Board renders the kanban with all features, docs, and statuses -- identical to the local board.
1. User taps a document, reads it, taps "Approve."
1. Board server writes the status change to the repo clone's `.claude/specs/`, commits.

### Inline comment and review

1. User opens a document on the board, highlights a section, leaves a comment: "This constraint is too vague -- tighten it."
1. User clicks "Request Review."
1. Board server sends the document + comments to the Anthropic API via the existing agent-chat pattern (no Claude Code process needed).
1. Claude returns a revised document; board displays the diff.
1. User accepts or rejects the revision. Accepted revisions are committed to the clone.

### Manual push

1. User navigates to a "Sync" panel on the board showing unpushed commits.
1. User reviews the commit list and diffs.
1. User clicks "Push to remote."
1. Board server runs `git push` on the clone. Success/failure is displayed.

### Git sync (background)

1. A background interval (default 5 min, configurable via env var) runs `git fetch && git pull --ff-only` on the clone.
1. If pull succeeds, chokidar picks up file changes and pushes WebSocket updates to connected clients.
1. If pull fails (diverged history), the board displays a warning banner; no automatic force-pull.

## Phasing

The interview's recommended wedge defines the phasing. Each phase builds on the previous.

### Phase 1 -- Board on Fly.io (wedge)

- Dockerfile: Alpine + Node 20, copies `server/dist` + `ui/dist`, installs runtime deps.

- `fly.toml`: `shared-cpu-1x`, 512MB RAM, port 8080, `/healthz` health check, volume mount at `/data/repo`.

- Init script: clones repo from configured remote into the volume (skip if already present), starts board server with `SPECMANAGER_PROJECT_DIR=/data/repo`.

- Shared bearer token middleware on all HTTP routes and WS upgrade.

- Background git-pull on configurable interval.

- Mobile-responsive board UI (fix any viewport issues).

### Phase 2 -- Inline comments + review

- Comment model in the board server (stored alongside docs or in a sidecar file).

- "Request Review" button that sends doc + comments to Anthropic API via agent-chat.

- Diff display for Claude's proposed revision.

- Accept/reject flow that commits accepted revisions.

### Phase 3 -- Manual push

- "Sync" panel showing `git log origin/main..HEAD` (unpushed commits).

- Diff viewer for each commit.

- "Push to remote" button executing `git push`.

- Success/failure feedback in the UI.

### Deferred phases (full vision, not in current scope)

| Phase                     | Description                                                                                                                                                    |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 -- Claude Code runner  | On-demand Fly machines (`fly machines run`) that spin up a Claude Code container, execute a command, stream output back to the board, and shut down when idle. |
| D2 -- Session continuity  | Sync `~/.claude/` conversation history between dev machine and Fly instance so `/resume` works cross-device.                                                   |
| D3 -- Diff review surface | Rich diff viewer in the board UI for reviewing Claude's code changes before push.                                                                              |
| D4 -- Per-user auth       | Replace shared token with per-user identity (OAuth or similar), enabling audit trails (who approved, who triggered).                                           |

## Open questions

Carried from the interview, plus additional questions surfaced during PRD drafting.

| #   | Question                                                                                                                                                                          | Impact                                                               |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Q1  | How does session history sync between the dev machine and the Fly instance for `/resume` to work?                                                                                 | Blocks D2 (deferred, not wedge)                                      |
| Q2  | What Fly machine API or orchestration is used to spin up/down Claude Code runners on demand? Is `fly machines run` sufficient or does it need a queue?                            | Blocks D1 (deferred)                                                 |
| Q3  | What is the expected latency for git-sync? Is 5-minute polling acceptable or do teammates need near-instant visibility? Answer: manual sync is ok                                 | Affects Phase 1 UX; default proposed at 5 min, needs user validation |
| Q4  | How does the board handle concurrent Claude Code runners (two teammates trigger builds simultaneously)?                                                                           | Blocks D1 (deferred)                                                 |
| Q5  | What is the cost budget for Fly machines + Anthropic API usage? Answer: fly should be near free or free                                                                           | Affects Phase 2 (agent-chat calls) and D1                            |
| Q6  | Does the Claude Code runner container need the full plugin ecosystem installed, or just core Claude Code?                                                                         | Blocks D1 (deferred)                                                 |
| Q7  | Should the `Dockerfile` and `fly.toml` be generated by a SpecManager command, or shipped as static templates the user copies? Answer: specmanager command seems more userfriendly | Affects Phase 1 DX                                                   |
| Q8  | What happens when `git pull --ff-only` fails due to diverged history? Warning banner only, or should the board offer conflict resolution? Answer: offer conflict resolution       | Affects Phase 1 robustness                                           |
| Q9  | How is the git remote URL + credentials configured for the Fly clone? SSH key as Fly secret, or HTTPS + PAT? Answer: architect to recommend                                       | Affects Phase 1 setup flow                                           |
| Q10 | Does the board server need any code changes to run with `SPECMANAGER_PROJECT_DIR` pointing at the Fly volume clone, or does it work as-is?                                        | Determines Phase 1 scope                                             |
