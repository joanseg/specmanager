---
id: arch-interview-command-009
featureId: feat-interview-command
stage: architecture
status: approved
stale: false
title: Interview command architecture
dependsOn:
  - prd-interview-command-010
basedOn:
  prd-interview-command-010: 2
generatedBy: human
version: 3
createdAt: '2026-06-10T12:06:14.964Z'
updatedAt: '2026-06-10T12:44:08.651Z'
---
## Summary

`/specmanager:specmanager-interview` is a new optional pre-PRD command that runs a multi-turn, adaptive interview with the user **in the main Claude Code session** (no subagent — see "Conversation mechanics" below), weaving in the office-hours forcing-question method (from the gstack **office-hours** skill: <https://github.com/garrytan/gstack/tree/main/office-hours>) as an embedded technique, and optionally persisting the result as `interview.md` inside the feature's existing `prd/` stage directory. The artifact is a normal frontmatter-authoritative markdown document distinguished by a new optional `kind: "interview"` frontmatter field. It rides the existing `core` document machinery (`createDocument` / `writeDocument` / manifest / events / board) end-to-end; the only `core` changes are small _exclusion_ filters so the interview never participates in gating, stage labels, or the board's primary PRD card. No new stage, no new gate, no new events.

## Resolved PRD open questions (decisions)

| # | PRD question             | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| - | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | Artifact shape           | **Doc within stage** **`prd`**, filename `interview.md`, marked `kind: "interview"` in frontmatter. A new stage would ripple through `STAGE` in `core/types.ts`, `STAGES` in `core/paths.ts`, `PRIOR_STAGE` in `core/dependencies.ts`, `stageLabel` in `core/claude-md.ts`, and `STAGES`/`COLUMNS` in `ui/src/types.ts` — far heavier, and the PRD's human answer already prefers within-prd-stage. Frontmatter `kind` (not filename sniffing) keeps "frontmatter is authoritative" intact; precedent: `phase` is frontmatter-authoritative and _derives_ the filename (`walkthroughFilename` in `core/documents.ts`).                                                                                                                                                                                   |
| 2 | Feature creation         | The command mirrors `commands/specmanager-prd.md` step 1: `list_features` → match by id/slug → else `create_feature({ title })`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 3 | office-hours integration | **Embed the method, credit the source.** The method comes from the gstack **office-hours** skill — <https://github.com/garrytan/gstack/tree/main/office-hours> — and using it is a core requirement of this feature. The six forcing questions (demand reality, status quo, desperate specificity, narrowest wedge, observation, future-fit) and the builder/design-thinking mode are written directly into the command prompt, with the repo credited there. No `Skill` invocation, no install detection, no degradation path needed — the plugin stays self-contained for users without gstack. The interviewer picks startup vs. builder mode from the feature's nature and may switch mid-interview as the conversation reveals which frame fits.                                                    |
| 4 | Conversation mechanics   | **Main session, command-prompt-only — no** **`agents/interviewer.md`.** Subagents launched via the `Task` tool run autonomously: their intermediate turns are invisible to the user and they return a single result to the parent. A turn-by-turn human conversation is therefore structurally impossible inside the existing prd-writer/architect delegation pattern. The PRD's human answer said "similar to PRD and Architect" — we keep the similarity where it matters (a `commands/*.md` entry point, all persistence through MCP tools, `sync_claude_md` on success, report id + path) and deviate only on delegation, with this rationale. The full interview protocol lives in `commands/specmanager-interview.md`; an agent file that can never be invoked interactively would be dead weight. |
| 5 | Staleness wiring         | **The interview sits outside the** **`dependsOn`** **graph.** The interview doc is created with `dependsOn: []`, and the PRD does **not** list the interview in its `dependsOn`/`basedOn`. `propagateStale` (`core/status.ts`) only walks `dependsOn` edges, so editing or re-running an interview can never flag the PRD stale. No code change needed — this is purely a contract on what the command and prd-writer write into frontmatter.                                                                                                                                                                                                                                                                                                                                                            |
| 6 | Approval status          | **Easiest path: keep the standard status field, leave it** **`draft`** **forever.** `createDocument` already defaults `status: "draft"`; we add no special status machinery. Because gating explicitly excludes `kind: "interview"` docs (see below) and nothing `dependsOn` the interview, even an accidental approve via `PATCH /api/documents/:id/status` is inert. The UI renders a neutral "interview" tag instead of the draft/approved badge.                                                                                                                                                                                                                                                                                                                                                     |
| 7 | prd-writer contract      | **Required-if-present**, stated in `agents/prd-writer.md` (see Affected components).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 8 | Repeat interviews        | **Update in place.** `createDocument` throws `document file already exists` on a second `interview.md`, so the command checks `list_documents({ featureId, stage: "prd" })` first; if an interview exists it `read_document`s it, opens the session by summarising what's already captured, and persists via `write_document` with `baseVersion` (optimistic concurrency, version bump) instead of `create_document`.                                                                                                                                                                                                                                                                                                                                                                                    |

## Affected components

### New

- **`plugins/specmanager/commands/specmanager-interview.md`** — the command _and_ the interviewer prompt in one file (frontmatter `description` + `argument-hint`, like the other seven commands). Contains: feature resolve/create steps, existing-interview detection (update mode), the interview protocol (below), the embedded forcing-question method with mode selection/switching (credited to <https://github.com/garrytan/gstack/tree/main/office-hours>), the synthesis format, and the store/discard/update persistence steps.

### Modified — server (`plugins/specmanager/server/src/`)

- **`core/types.ts`** — `DocFrontmatterSchema` gains `kind: z.enum(["interview"]).optional()` (mirrors how `phase` is optional and stage-specific). Zod default-absent keeps every existing doc parsing unchanged; the manifest is a rebuildable cache so no migration is needed.

- **`core/documents.ts`** — `CreateDocInput` gains `kind?: "interview"`. `createDocument`: reject `kind: "interview"` with `stage !== "prd"`; when set, default filename is `interview.md`; stamp `kind` into frontmatter. `WriteDocInput`/`writeDocument` untouched (kind is immutable after creation).

- **`core/dependencies.ts`** — in `checkGate`, the prior-stage lookup (`docs.find((d) => d.frontmatter.status === "approved")`) must skip `kind === "interview"` docs, and the `docs.length === 0` emptiness check must count only non-interview docs. **Without this, approving an interview would falsely open the Architecture/Design gates** — today any approved prd-stage doc opens them. Note this is the _opposite_ of adding an interview dependency: it guarantees the PRD's "checkGate must not gain an interview dependency" constraint by construction. The Plan compound gate and walkthrough paths are unaffected.

- **`core/manifest.ts`** — document entries gain `...(d.frontmatter.kind ? { kind: d.frontmatter.kind } : {})`, same spread pattern as `phase`. The board (`GET /api/board` in `board-server.ts` serves `buildManifest` directly) picks this up with no board-server change.

- **`core/claude-md.ts`** — `currentStageLabel` currently does `f.documents.find((d) => d.stage === f.currentStage)`; since `readdir` order puts `interview.md` before `prd.md`, an interview would shadow the PRD's status in the feature table. Fix: skip `kind === "interview"` entries in that `find`. Also append `/specmanager-interview` (marked optional) to the rendered **Commands** line in `renderBlock`. `notesFor` needs no change (interviews are never stale — nothing depends on them and they depend on nothing).

- **`mcp.ts`** — `create_document` inputSchema gains `kind: z.enum(["interview"]).optional()` and a sentence in the description ("pass `kind: \"interview\"` with stage `prd` to store a pre-PRD interview artifact; filename defaults to `interview.md`"). No new tool — `create_design_brief` exists because design bodies need sanitization and a size cap; the interview needs neither.

### Modified — UI (`plugins/specmanager/ui/src/`)

- **`types.ts`** — `DocCard` gains `kind?: "interview"`.

- **`App.tsx`** — `findDoc(row, stage)` returns the first doc of a stage; it must skip `kind === "interview"` so (a) the PRD column's primary card stays the PRD and (b) `priorStageApproved` (which calls `findDoc(row, "prd")`) never reads the interview's status. Add `findInterview(row)`; the prd `Cell` renders, beneath the normal PRD card (or the `EmptyCell`), a compact "Interview" chip when one exists, wired to the existing `onOpenDoc(id)` so it opens in `DocPanel.tsx` → `MarkdownEditor.tsx` (Milkdown) like any markdown doc — satisfying the PRD's "same column, visibly distinct" requirement. The doc panel's status toggle shows a neutral "interview" tag for `kind: "interview"` instead of the approve affordance (cheap; per decision 6 an approve would be harmless anyway).

### Modified — prompts

- **`agents/prd-writer.md`** — new numbered step after the `list_features` check: "Call `list_documents({ featureId, stage: \"prd\" })`. If a doc with `kind: \"interview\"` exists, `read_document` it and ground the PRD in it — extracted context, agreed wedge/scope, and critiques are _required_ input when present; contradict them only with stated reasons."

- **`commands/specmanager-prd.md`** — step 2's duplicate check ("If a PRD already exists…") must ignore `kind: "interview"` docs, or an interview-first flow would wrongly report an existing PRD.

### Untouched on purpose

`core/status.ts` (no status special-casing), `core/events.ts` (existing `document.created`/`document.updated` cover the artifact; the websocket and `startClaudeMdAutoSync` listeners fire as-is), `core/paths.ts`, `core/features.ts`, `board-server.ts`, `hooks/hooks.json`.

## Data model changes

One optional frontmatter field, no migration:

```yaml
# .claude/specs/features/<slug>/prd/interview.md
id: prd-<slug>-NNN          # docId("prd", slug, seq) — shares the prd id space
featureId: feat-<slug>
stage: prd
kind: interview              # NEW — absent on all other docs
status: draft                # stays draft; never load-bearing
stale: false
dependsOn: []                # always empty — outside the staleness graph
basedOn: {}
generatedBy: agent
version: N                   # bumps on re-interview updates
```

Manifest document entries gain the optional `kind` passthrough. Deleting `manifest.json` and rebuilding reproduces it from frontmatter, per the existing invariant.

## Interfaces

```ts
// core/types.ts
export const DOC_KIND = z.enum(["interview"]);
export type DocKind = z.infer<typeof DOC_KIND>;
// DocFrontmatterSchema: kind: DOC_KIND.optional()

// core/documents.ts
export interface CreateDocInput {
  // ...existing fields...
  kind?: DocKind;            // only valid with stage "prd"; filename defaults to "interview.md"
}

// core/dependencies.ts (checkGate, prior-stage lookup)
const candidates = docs.filter((d) => d.frontmatter.kind !== "interview");

// ui/src/App.tsx
function findDoc(row: FeatureRow, stage: Stage): DocCard | undefined; // now skips kind === "interview"
function findInterview(row: FeatureRow): DocCard | undefined;
```

No new MCP tools, REST routes, or events.

## Sequence / flow

### Interview → store → PRD

1. User runs `/specmanager:specmanager-interview "<title or feature id/slug>"`.
1. Main session resolves the feature (`list_features` → `create_feature` if new), then `list_documents({ featureId, stage: "prd" })` to detect an existing interview (→ update mode) or an existing PRD (→ note it; interview proceeds anyway, since re-interviewing pre-PRD-rewrite is legitimate).
1. Opening turn: states the goal, prints the initial interview plan (5–8 one-line areas), states the exit phrase **"finish interview now"**.
1. Loop: one focused question per turn → probe/challenge using the embedded forcing questions (mode chosen from the feature; may switch mid-interview) → on any material plan revision, re-print the plan as a short diff ("Plan update: + X, − Y (covered)"). Re-state the exit phrase roughly every five turns.
1. User says "finish interview now" (matched as plain conversation — no tooling) or the plan is exhausted → synthesis: extracted context, key critiques, recommended wedge, unresolved risks.
1. "Store this interview as a markdown file for this feature?" → **yes, new**: `create_document({ featureId, stage: "prd", kind: "interview", title: "<Feature title> interview", body, generatedBy: "agent", dependsOn: [], basedOn: {} })`; **yes, existing**: `write_document({ id, body, baseVersion })`; **no**: stop, nothing written.
1. `create_document` (mcp.ts) → `core/createDocument` → `writeDoc` + `document.created` event → `writeManifest` → board websocket pushes; chokidar on `.claude/specs/**` covers the file-watch path. Command then calls `sync_claude_md` (filtered label keeps the table unchanged) and reports id + path.
1. Later, `/specmanager-prd` → prd-writer finds `kind: "interview"`, reads it, drafts a grounded PRD with `dependsOn: []` as today.

### Board display

`GET /api/board` → manifest with `kind` → PRD column cell renders PRD card (or empty/generate affordance) + "Interview" chip → click opens the markdown viewer. `priorStageApproved` ignores the interview, so Architecture/Design lock states render correctly whether or not an interview exists.

## Plan phasing (required)

The Plan for this feature **must be split into exactly two phases**:

1. **Phase 1 — validate the chat.** Build only `commands/specmanager-interview.md` with the interview protocol and the embedded office-hours method, and test the actual performance of the multi-turn chat in a real Claude Code session: question quality, adaptive plan updates with the printed plan diff, startup/builder mode switching, critique depth, and the "finish interview now" exit. No `core`, MCP, or UI changes in this phase — persistence may be stubbed (synthesis printed to the chat only). The phase boundary is an explicit go/no-go on conversation quality before the rest of the feature is built.
1. **Phase 2 — complete the feature.** Everything else: `kind: "interview"` in core (`types.ts`, `documents.ts`, `dependencies.ts`, `manifest.ts`, `claude-md.ts`, `mcp.ts`), the UI chip + exclusion filters, prompt updates (`agents/prd-writer.md`, `commands/specmanager-prd.md`), the command's persistence steps (create/update with `baseVersion`), self-test extensions, README/docs sweep, and rebuilt `dist/`.

## Failure & edge cases

- **Interview approved by accident (board or** **`set_status`)** — inert: excluded from `checkGate`, no dependents, and `feature.shipped` only fires for walkthroughs. UI hides the affordance but the API path is safe regardless.

- **Interview exists, PRD doesn't** — `currentStageLabel` finds no non-interview prd doc → falls back to plain "PRD" (no status suffix), correctly signalling "PRD not drafted". Board PRD cell shows the generate affordance + the interview chip.

- **Concurrent edit during re-interview** — user edits `interview.md` on the board mid-session → `write_document` with stale `baseVersion` rejects (`version conflict`); the command re-reads and re-applies, same recovery the other agents use.

- **`kind: "interview"`** **with non-prd stage** — `createDocument` rejects; backstop against prompt drift.

- **Hand-written** **`interview.md`** **without frontmatter** — `listDocuments` already skips unparseable docs with a console warning; the board stays up.

- **Session dies mid-interview** — nothing persisted until the storage step; per the PRD non-goal, no resume (the update path softens a restart for stored interviews).

- **Old plugin dist + new doc** — old code ignores the unknown `kind` field at the zod layer only if schemas are non-strict; `DocFrontmatterSchema` is a plain `z.object` (non-strict), so old readers pass it through harmlessly. Rebuild `server/dist` and `ui/dist` before committing, as always.

- **Manifest deleted** — `buildManifest` re-derives `kind` from frontmatter; nothing lost.

## Conventions used

- All writes through `core` via MCP tools; the command never touches files directly (`.claude/specs/` only, via tools).

- Frontmatter authoritative, manifest a rebuildable cache; `kind` lives in frontmatter, filename derived (precedent: `phase` → `walkthroughFilename`).

- Optional zod fields with spread-passthrough into the manifest (`...(x ? { x } : {})`), exactly as `phase` does today.

- Optimistic concurrency on agent writes (`baseVersion`).

- Gate logic in `core/dependencies.ts`, never in prompts; this feature only _narrows_ what a gate looks at.

- TS strict ESM (`"type": "module"`, Node 20+); UI React 18 + Vite; markdown docs open in Milkdown via the existing `DocPanel`.

- Self-test style: extend `server/src/selftest.ts` (compiled to `dist/selftest.js`, run via `npm run selftest`) with: interview creation defaults filename/kind; approved interview does **not** open the architecture gate; `currentStageLabel` unaffected by an interview; `write_document` update path bumps version.

- Ship compiled `dist/`; validate with `claude plugin validate plugins/specmanager`.

## Open questions / risks

1. **Interview chip vs. second card** — the grid renders one card per cell today; a chip under the PRD card is the smallest change, but if it crowds the cell the planner may prefer a stacked two-card cell. Visual call for the (optional) design stage or the planner; no `docs/DESIGN.md` design doc exists for this feature.\
   Answer: Designer to mcok a few options.
1. **Exit-phrase robustness** — "finish interview now" is matched conversationally by the model, not by tooling. The command prompt should also honour obvious paraphrases ("let's stop", "wrap it up") to avoid trapping users on exact wording; confirm this loosening is wanted.\
   Answer: agree
1. **`generatedBy`** **for a co-produced artifact** — the body is synthesised by the agent from human answers; `generatedBy: "agent"` matches the other drafters but slightly understates the human's role. Cosmetic; default to `agent`.
1. **Doc-id prefix** — the interview shares the `prd-<slug>-NNN` id space (`docId` in `core/ids.ts`). Acceptable since `kind` is the discriminator, but worth confirming nobody parses `prd-` ids as "is a PRD" anywhere beyond what this doc already audits (grep found no such use).
1. **README / docs sweep** — `README.md` and `docs/architecture-and-spec.md` list the command set; updating them is a small follow-on task the plan should include.
