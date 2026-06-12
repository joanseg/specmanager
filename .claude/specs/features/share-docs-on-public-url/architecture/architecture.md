---
id: arch-share-docs-on-public-url-011
featureId: feat-share-docs-on-public-url
stage: architecture
status: approved
stale: false
title: Share docs on public URL architecture
dependsOn:
  - prd-share-docs-on-public-url-013
basedOn:
  prd-share-docs-on-public-url-013: 2
generatedBy: human
version: 2
createdAt: '2026-06-11T19:23:51.797Z'
updatedAt: '2026-06-11T19:34:08.147Z'
---
# Share docs on public URL — Architecture

Based on PRD `prd-share-docs-on-public-url-013` v2 (approved, human-edited). Interview artifact `prd-share-docs-on-public-url-014` read for rationale; the PRD wins where they differ. No design doc exists for this feature.

## 1. Summary

We add a **publish pipeline** to `@specmanager/server`: an explicit, user-initiated action that renders the current board + docs to a fully static HTML snapshot, zips it, and deploys it to hosting the publisher owns, behind a secret unguessable path. It is a pure outward export — it reads through the same `core/` functions the board uses (`buildManifest`, `listDocuments`, `listTasks`) and never writes into `.claude/specs/` except for one new state file, `publish.json`. Surface area: three new MCP tools in `server/src/mcp.ts`, one read-only REST endpoint in `server/src/board-server.ts`, one new slash command, and a new `server/src/publish/` module plus `core/publish-state.ts`.

**v1 hosting adapter decision: Netlify.** sprites.dev could not be verified (capabilities, unguessable-URL support, API, and terms — PRD Open Q3), so per the PRD it is rejected for v1. Among verified hosts: GitHub Pages is rejected (URLs are guessable `user.github.io/repo`, and Pages on private repos is plan-gated); Vercel's deploy API requires per-file uploads or shelling out to its CLI; **Netlify's deploy API is a single authenticated** **`POST`** **of a zip file** (`POST /api/v1/sites/:site_id/deploys`, `Content-Type: application/zip`, personal-access-token Bearer auth), deploys are atomic whole-site replacements, and free-tier sites get a randomizable subdomain. That is the smallest possible adapter. The `HostingAdapter` interface keeps Vercel et al. addable later without touching the renderer.

## 2. Affected components

New files (all under `plugins/specmanager/server/src/` unless noted):

| Path                                                  | Role                                                                                                                             |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `publish/index.ts`                                    | Orchestration: `publishSnapshot()`, `unpublishSnapshot()`, `publishStatus()`                                                     |
| `publish/render.ts`                                   | Renders the static snapshot (board index + doc pages) into a temp dir                                                            |
| `publish/templates.ts`                                | HTML shells + embedded CSS (token values lifted from `ui/src/tokens.css`)                                                        |
| `publish/adapter.ts`                                  | `HostingAdapter` interface + adapter lookup                                                                                      |
| `publish/netlify.ts`                                  | The one v1 adapter (site create, zip deploy, 404-only deploy for unpublish)                                                      |
| `publish/credentials.ts`                              | Read/write adapter token in `${SPECMANAGER_PLUGIN_DATA}/publish-credentials.json` (mode 0600)                                    |
| `core/publish-state.ts`                               | Read/write `.claude/specs/publish.json` (re-exported from `core/index.ts`)                                                       |
| `selftest-publish.ts`                                 | Self-test: render to tmp dir + state round-trip, adapter mocked (style of `selftest-board.ts`)                                   |
| `plugins/specmanager/commands/specmanager-publish.md` | Slash command (orchestration prompt; no new subagent — publish is procedural, like `specmanager-board.md`, not a drafting stage) |

Edited files:

- `server/src/core/index.ts` — re-export `publish-state.js`.

- `server/src/core/paths.ts` — add `publishStatePath()` (`<specs>/publish.json`).

- `server/src/core/events.ts` — add `snapshot.published` / `snapshot.unpublished` to the `SpecEvent` union (board clients get live publish status for free via the existing WS broadcast).

- `server/src/mcp.ts` — register `configure_publishing`, `publish_snapshot`, `unpublish_snapshot` (and fold status into `publish_snapshot`/a `publish_status` tool).

- `server/src/board-server.ts` — `GET /api/publish/status` (read-only; a board Publish button is a design-time decision the PRD defers, so no mutating REST route in v1).

- `plugins/specmanager/.mcp.json` — add `"SPECMANAGER_PLUGIN_DATA": "${CLAUDE_PLUGIN_DATA}"` to `env` (today only `NODE_PATH` is derived from it; the credentials store needs the path itself).

- `server/package.json` — add `remark-rehype`, `rehype-stringify` (the repo already ships `unified`, `remark-parse`, `remark-gfm`) and `fflate` (tiny, zero-dep zip). New `selftest-publish` script.

Rebuild both `server/dist` (and nothing in `ui/` changes in v1) before committing — committed `dist/` is what ships.

## 3. Data model changes

No changes to `DocFrontmatter`, `Feature`, `Task`, or `manifest.json`.

**New:** **`.claude/specs/publish.json`** — authoritative publish state, committed to the repo (zod-validated in `core/publish-state.ts`, same pattern as `TasksFileSchema` in `core/types.ts`):

```ts
const PublishStateSchema = z.object({
  adapter: z.literal("netlify"),
  siteId: z.string(),                    // adapter-side site identifier
  baseUrl: z.string(),                   // e.g. https://sm-x7k2….netlify.app
  board: z.object({ token: z.string(), publishedAt: z.string() }).nullable(),
  docs: z.record(z.string(),            // docId → individually-shared doc
    z.object({ token: z.string(), publishedAt: z.string(), version: z.number() })),
});
```

- Tokens are `crypto.randomBytes(16)` → base64url (22 chars, 128 bits) — the "unguessable" in the URL.

- The file holds the secret _paths_ but never the hosting credential. Repo collaborators seeing the share URL is acceptable (they already see the docs); stakeholder-facing secrecy is the requirement.

- This is **state, not cache** — unlike `manifest.json` it is not rebuildable, so it is never touched by `writeManifest`. Deleting it orphans the deployed site (documented; unpublish first).

**New:** **`${SPECMANAGER_PLUGIN_DATA}/publish-credentials.json`** — `{ "netlify": { "token": "…" } }`, mode 0600, outside the repo, survives plugin updates (same reasoning as the SessionStart dep install).

## 4. Interfaces

MCP tools (registered in `server/src/mcp.ts`, same `ok()`/`fail()` envelope and zod `inputSchema` style as the existing tools):

```ts
configure_publishing({ token: string })            // → { adapter, siteId, baseUrl } — validates token, creates the Netlify site on first run
publish_snapshot({ docId?: string })               // no docId → board snapshot; docId → individual-doc share. → { url, publishedAt, scope }
unpublish_snapshot({ docId?: string })             // no docId → remove everything; docId → remove that share. → { removed }
publish_status({})                                 // → PublishState | null (also GET /api/publish/status)
```

Core/publish functions (importable by both entry points, keeping the "all logic shared, never duplicated" invariant):

```ts
// server/src/publish/index.ts
export async function publishSnapshot(opts: { docId?: string }, root?: string): Promise<PublishResult>;
export async function unpublishSnapshot(opts: { docId?: string }, root?: string): Promise<PublishState>;

// server/src/publish/adapter.ts
export interface HostingAdapter {
  readonly name: "netlify";
  ensureSite(creds: Credentials): Promise<{ siteId: string; baseUrl: string }>;
  deployZip(creds: Credentials, siteId: string, zip: Uint8Array): Promise<void>; // atomic full-site replace
}
```

URL scheme (host-agnostic — secrecy lives in the path, not the hostname):

- Board snapshot: `<baseUrl>/s/<boardToken>/` (index) and `<baseUrl>/s/<boardToken>/docs/<docId>/` per doc.

- Individual doc share: `<baseUrl>/d/<docToken>/` — its own token, so handing out one doc does **not** reveal the board URL.

- Site root `/` and any unknown path: a blank 404 page. No sitemap, `X-Robots-Tag`-equivalent `<meta name="robots" content="noindex">` on every page.

## 5. Sequence / flow

**Publish** — `/specmanager-publish [docId]`:

1. Command calls `publish_status`; if no credentials/state, walks the user through first-run setup (`configure_publishing` with their Netlify PAT — credential collected in-session, stored via `publish/credentials.ts`, never echoed back).
1. `publish_snapshot({ docId? })` →
   a. Load `publish.json`; mint missing tokens (board or per-doc). Existing tokens are **reused — stable URL on re-publish** (PRD Q9 answer).
   b. Render the **union** of everything currently published (board snapshot if `board` is set or being set now, plus every entry in `docs`) into `os.tmpdir()`. Rendering the union is what lets atomic whole-site deploys coexist with per-doc shares: every deploy is a pure function of `publish.json`.
   c. Render details: board index from `buildManifest(root)` (feature cards, stage badges, task counts — the existing `Manifest` shape); each markdown doc through `unified().use(remarkParse).use(remarkGfm).use(remarkRehype).use(rehypeStringify)` (raw HTML in markdown is dropped by default — deliberate sanitization); design docs (`design/mockups.html`) are already self-contained HTML, so strip frontmatter via `core/frontmatter.ts` and ship the body verbatim as the doc page; docs with `kind: "interview"` are **excluded always** (internal pre-PRD artifact). All docs publish at their latest version regardless of draft/approved, with a status badge — PRD Q4 answer ("entire board with access to each document").
   d. Every page footer: `v<version> · <updatedAt> · snapshot published <timestamp>` (PRD Q5 answer: show the version being seen). Zero client-side JS in the output.
   e. Zip with `fflate`, `adapter.deployZip()`, then verify the snapshot index returns HTTP 200 before declaring success.
   f. Write `publish.json`, emit `snapshot.published`, return the URL for pasting.

**Re-publish**: identical; same tokens → same URLs; old content is wholly replaced by the atomic deploy. Nothing updates between publishes.

**Unpublish** — `unpublish_snapshot`: remove the board entry and/or doc entry from the desired state, re-render the (possibly empty) union, deploy. An empty union deploys only the 404 page — content is gone but `siteId`/`baseUrl` are retained, so a later publish returns to the **same URL**. Emits `snapshot.unpublished`. (Deleting the Netlify site was considered and rejected: it breaks URL stability and adds API surface.)

**Rotation** (resolving the PRD's flagged lifecycle question end-to-end): not a v1 command. The decided lifecycle is _stable URL + explicit unpublish_. If a link leaks, the escape hatch is: unpublish the leaked scope, delete its token line in `publish.json`, publish again — a fresh token is minted and, because deploys are whole-site atomic, the leaked URL 404s immediately. A `--rotate` flag can later formalize exactly this.

## 6. Failure & edge cases

- **No credentials / 401 from Netlify**: `fail()` with instructions to run setup again; nothing deployed, state untouched.

- **Deploy fails mid-flight**: rendering completes locally _before_ any network call; the zip deploy is one request and Netlify deploys are atomic, so the live site is never half-updated. `publish.json` is written only after the post-deploy 200 check.

- **Unparseable doc**: `listDocuments` already skips and warns (see `core/documents.ts`); the snapshot mirrors the board's view.

- **Huge design docs**: bounded by the existing `DESIGN_BRIEF_MAX_BYTES` (5MB) cap; well inside Netlify zip limits.

- **`publish.json`** **deleted or corrupted**: fail loudly and ask the user — never silently mint new tokens (that would rotate the URL behind their back) and never auto-create a second site.

- **Concurrent publishes**: single-user tool; last write wins, acceptable. The chokidar watcher will emit `file.changed` for `publish.json` writes — harmless, same as any spec write.

- **Board server down**: irrelevant — publish runs in the MCP process and reads core directly; it does not depend on `startBoardServer` having bound its port.

- **Local-only posture preserved**: the board server stays bound to `127.0.0.1` and is untouched; publishing opens no inbound surface on the user's machine.

## 7. Conventions used

- ESM (`"type": "module"`, Node ≥20), explicit `.js` import suffixes, TS strict via `tsc -p tsconfig.json` → committed `dist/`.

- zod schemas beside the types (`core/types.ts` pattern); MCP tools use `inputSchema: z.object(...)` and the `ok()`/`fail()` text envelope from `mcp.ts`.

- All shared logic lives in `core/` / shared modules imported by both `mcp.ts` and `board-server.ts`; project root resolved via `projectRoot()` (`SPECMANAGER_PROJECT_DIR ?? CLAUDE_PROJECT_DIR`), never cwd.

- Events through the `TypedBus` in `core/events.ts`; errors as thrown `Error` with prefixed messages; logging via `console.error` to stderr.

- Latest current libs only; new deps kept minimal (`remark-rehype`, `rehype-stringify`, `fflate`) on top of the existing unified stack.

- Hand-rolled `selftest-*.ts` scripts against a tmp dir, run by name (`npm run selftest-publish`).

- Persistent user-level data in `${CLAUDE_PLUGIN_DATA}` (same home as the SessionStart dep install).

## 8. Open questions / risks

1. **Adapter confirmation**: Netlify is the architecture's pick on API-simplicity grounds. If the user prefers Vercel (a Vercel toolchain is present in their environment), the `HostingAdapter` seam makes the swap cheap, but v1 still ships exactly one — confirm before Plan.

   Answer: Netlify is fine
1. **Outbound sync vs. public URL (PRD Q6, "architect to check and recommend")**: recommendation — **proceed with the snapshot v1**. The demo contact already answered "accepted" to the read-only probe (PRD Q1), which is the strongest signal available; outbound Linear/Confluence sync needs per-tool OAuth, content mapping, and write-back semantics — an order of magnitude more surface. The design hedges deliberately: `publish/render.ts` separates _collect docs_ from _deliver snapshot_, so a future sync adapter reuses the collection layer. Deferred, not killed.
1. **Draft visibility**: v1 publishes drafts with a `draft` badge (per the PRD's "entire board" answer). If a publisher wants approved-only, that's a `publish_snapshot` filter flag — cheap to add, but cut from v1 unless the user objects now.
1. **Secret-path caveat to document**: anyone who can read the repo (or the published page's URL from browser history/referrers) has the link. Pages carry `noindex`, but this is "anyone with the link" by design — the command's output should say so once per publish.
1. **Netlify free-tier limits** (deploy counts, bandwidth) are assumed sufficient for spec-sized sites; verify during the first spike task.
