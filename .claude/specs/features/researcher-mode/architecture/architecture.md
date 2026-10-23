---
id: arch-researcher-mode-031
featureId: feat-researcher-mode
stage: architecture
status: approved
stale: false
title: Researcher mode architecture
dependsOn:
  - prd-researcher-mode-046
basedOn:
  prd-researcher-mode-046: 3
generatedBy: agent
version: 4
createdAt: '2026-10-21T12:56:21.141Z'
updatedAt: '2026-10-21T13:16:44.453Z'
---
## Summary

Researcher mode adds a **study** entity beside features: `.claude/specs/research/<slug>/` holds one study's five research docs (market research, concepts, user research, marketing plan, strategy) and a `notes/` drop folder. One new core module, `server/src/core/research.ts`, owns study and research-doc storage, the two ordering gates, the computed "outdated" and "new notes" flags, the strategy build-list parser and the handoff. It reuses the existing primitives instead of copying them: `frontmatter.ts` (read/write, given a schema), `ids.ts`, `events.ts`, `features.ts#createFeature`, `documents.ts#sanitizeDesignBriefBody` / `DESIGN_BRIEF_MAX_BYTES`, `spec-slice.ts#indexHeadings`, the board's chokidar watcher and WS broadcast, and `DocPanel`. Studies sit outside `features/`, so `listFeatures`, `listDocuments`, `checkGate`, staleness, the manifest's `features[]` and the Builder grid are not changed (PRD non-goal: changing Builder mode). Claude does every piece of drafting and web research in the session, through one new `researcher` agent and one `/specmanager-research` command. The plugin makes no model, web or API calls. The board gets a top-bar **Builder | Researcher** toggle and a Researcher grid with one row per study. Grounded in `prd-researcher-mode-046` v1. The UI below was first specified from the existing board's components; `design-researcher-mode-009` v1 now exists and is authoritative for the UI (tokens, hash values, states).

PRD goals → sections: G1 → `board-mode-toggle-and-researcher-view`. G2 → `study-storage-and-schema`. G3 → `researcher-agent-and-command` and `research-doc-shapes`. G4 → `findings-intake`. G5 → `ordering-gates-and-computed-flags` and `research-doc-shapes`. G6 → `handoff-to-builder`. G7 → `suggested-phase-cut`.

## Affected components

Existing files touched (all under `plugins/specmanager/`):

| File | Change |
|---|---|
| `server/src/core/types.ts` | Add `RESEARCH_KIND`, `StudySchema`, `ResearchDocFrontmatterSchema` and `FeatureOriginSchema`. Add optional `origin` to `FeatureSchema` (Zod optional, so no migration). |
| `server/src/core/paths.ts` | Add `researchDir(root)`, `studyDir(slug, root)` and `studyNotesDir(slug, root)`. |
| `server/src/core/frontmatter.ts` | `readDoc` / `writeDoc` take an optional Zod schema (default `DocFrontmatterSchema`), so research docs share one gray-matter path. |
| `server/src/core/features.ts` | `createFeature(title, root, opts?: { origin })` writes `origin` into `feature.json` when it is given. |
| `server/src/core/events.ts` | Add the `study.created`, `research.created` and `research.updated` variants to `SpecEvent`. |
| `server/src/core/manifest.ts` | Add an optional `studies[]` summary, emitted only when at least one study exists, so Builder-only manifests stay byte-identical. Add optional `origin` to each feature entry. |
| `server/src/core/claude-md.ts` | `renderBlock` adds one links-only "Research studies" line inside the markers, only when studies exist (PRD Q9). |
| `server/src/core/index.ts` | Re-export `research.js`. |
| `server/src/mcp.ts` | Register six tools (see `mcp-tools`). The CLAUDE.md auto-sync listener also schedules on `study.created` / `research.created`. |
| `server/src/board-server.ts` | Add the REST routes in `board-rest-api`. The watcher already covers `.claude/specs/**`, so `research/` changes broadcast `file.changed` with no change. |
| `server/src/smoke-mcp.ts` | Add the six tool names to `expected`. |
| `server/src/selftest-prompts.ts` | Add invariants for the new agent and command (see `prompt-invariants`). |
| `server/package.json` | Add the `selftest-research` script. |
| `agents/prd-writer.md` | Add a step: when the feature has `origin`, ground the PRD in the strategy and the research docs and cite them by id (PRD success metric "handoff fidelity"). |
| `ui/src/App.tsx` | Add the mode toggle in `board__header` and switch between the Builder grid and `ResearchBoard`. Show an origin chip on Builder rows that have `origin`. |
| `ui/src/DocPanel.tsx` | Add a `source: "feature" \| "research"` prop. Research docs use the research endpoints, hide Approve, Reopen and Gate, and render `concepts` in the existing sandboxed iframe. |
| `ui/src/api.ts`, `ui/src/types.ts` | Add study and research types and fetchers. |
| `ui/src/styles.css` | Add the toggle and Researcher-grid styles, using existing tokens only. |
| `docs/agent-snippets/lossless-carryover.md` | Add `agents/researcher.md` as a fifth carrier. Raise INV-13 / INV-29 counts to match. |
| `CLAUDE.md` (repo) | Update the self-test count and list, and add one Layout line each for the new command and agent. |
| `.claude-plugin/plugin.json` | Minor `version` bump at release. |

New files:

- `server/src/core/research.ts`: study and research-doc CRUD, gates, computed flags, `parseBuildList`, `handoffStudyItems`.
- `server/src/selftest-research.ts`: hand-rolled self-test in the same style as `selftest-repos.ts`.
- `ui/src/ResearchBoard.tsx`: the Researcher grid, the start-study form and the handoff picker.
- `agents/researcher.md`: drafts every research doc kind.
- `commands/specmanager-research.md`: step-based orchestration.

## Study storage and schema

Resolves PRD Q1: a study is its own top-level entity, not a variant of a feature, and research docs get their own `kind` enum rather than reusing `STAGE`.

```
.claude/specs/research/<slug>/
  study.json              # StudySchema
  market-research.md      # kind "market"
  concepts.html           # kind "concepts" (self-contained HTML, gray-matter frontmatter like design/mockups.html)
  user-research.md        # kind "user-research"
  marketing-plan.md       # kind "marketing"
  strategy.md             # kind "strategy"
  notes/                  # raw interview notes; tracked in git, personal data masked on ingest (see findings-intake)
```

Types (sketch, in `core/types.ts`):

- `RESEARCH_KIND = z.enum(["market", "concepts", "user-research", "marketing", "strategy"])`.
- `StudySchema = { id: "study-<slug>", slug, title, idea: string, createdAt }`.
- `ResearchDocFrontmatterSchema = { id, studyId, kind: RESEARCH_KIND, title, dependsOn: string[] = [], basedOn: Record<string, number> = {}, generatedBy, version, findings?: string[], createdAt, updatedAt }`. It has **no `status` or `stale`** (see `ordering-gates-and-computed-flags`). `findings` is valid only on `user-research`, and core rejects it on any other kind.
- `FeatureOriginSchema = { studyId, strategyId, strategyVersion: number, rank: number, itemId: string, item: string }`. It is optional on `FeatureSchema`.

Ids are deterministic, because a study has exactly one doc per kind: `market-<slug>`, `concepts-<slug>`, `ur-<slug>`, `mktg-<slug>`, `strategy-<slug>`. These prefixes never collide with Builder ids (`prd-`, `arch-`, `design-`, `plan-`, `wt-`). Study slugs reuse `slugify` and get a `uniqueSlug`-style `-2` suffix in `research/`. Many studies per project (G2) need nothing extra: each study is independent, and no research doc lists another study's doc in `dependsOn`. Core rejects a cross-study `dependsOn` or `basedOn` id.

Frontmatter is authoritative. `manifest.json#studies` is a rebuildable cache: deleting it loses nothing, and `buildManifest` re-derives it from `research/*/study.json` plus each doc's frontmatter.

## Research doc shapes

The agent writes the section headings exactly as below, so PRD success metric "doc shape parity" can be checked by headings. `selftest-prompts` pins the heading lists in `agents/researcher.md`. The oposiciones study defines only the shape (PRD non-goal).

- **market** (`## TL;DR`, `## Market size`, `## Competitor landscape`, `## Gaps & opportunity`, `## What to build`, `## Revenue model & forecast`, `## Next steps`, `## Sources`).
  - Market size is a table with a source column.
  - The competitor landscape has `### Direct`, `### AI newcomers`, `### Generic substitutes` and `### Indirect`.
  - What to build covers positioning, MVP, V2, moat and risks.
  - The revenue model has base, conservative and upside scenarios by year, plus unit economics.
  - Sources are links.
- **concepts**: one self-contained HTML canvas of labelled concept screens (A, B, C, …), including a pricing screen. Resolves Q8:
  - Phone frames by default. Desktop or web frames are allowed when the study's idea is a web product.
  - The screen count is not fixed. Six (A–F) is the default the agent aims for.
  - Concepts are **not** grounded in `docs/DESIGN.md`. They mock the study's product, not this repo's UI.
  - The body goes through `sanitizeDesignBriefBody` and the 5 MB `DESIGN_BRIEF_MAX_BYTES` cap.
- **user-research** (`## Research questions`, `## Method`, `## Screener survey`, `## Interview guide`, `## Expert interviews`, `## Scoring sheets`, `## V1 decision rules`, `## Synthesis output`, `## Findings`).
  - Method covers the screener survey, interviews with a concept test, expert interviews, the fake-door smoke test, the concierge test, timeline, recruit mix and where to recruit.
  - The interview guide covers context, a competitor teardown, a concept test with Utility, Confidence and Intent scores (1–5), forced ranking, a 100 € split, and pricing with Van Westendorp.
  - The scoring sheets are a per-participant concept-score table and a competitor scorecard, empty until findings are captured.
  - The plan references concepts by letter.
  - `## Findings` holds quotes per participant. The findings step fills it, together with the scoring sheets.
- **marketing** (`## Positioning`, `## Launch segments`, `## Channels`, `## Launch plan`, `## Calendar hooks`, `## Budget`, `## Funnel KPIs`, `## To revisit after research`). Channels is a table with KPIs.
- **strategy** (`## Learnings`, `## Decision-rule outcomes`, `## What to build`, `## Marketing alignment`, `## Sources`).
  - `## What to build` is an **ordered list**, one item per line: `1. [S<n>] **<Item title>** — <rationale, marketing tie-in>`. `S<n>` is a stable item id: re-synthesis keeps an item's id even when it is renamed or re-ranked, new items get the next unused number, and ids are never reused. `parseBuildList` reads this list, so it is the handoff contract.
  - Sources cite the research doc ids and versions it was built from.

`dependsOn` / `basedOn` conventions, which the agent sets and core validates as same-study ids:

| Doc | dependsOn |
|---|---|
| market | `[]` |
| concepts | `[market]` |
| user-research | `[market, concepts]` (concepts only if it exists) |
| marketing | `[market]` |
| strategy | `[market, concepts?, user-research, marketing]` |

## Ordering gates and computed flags

Resolves PRD Q2. Research docs are **free-form drafts with no approve or stale states**:

- The board shows no Approve button.
- `set_status` and `propagateStale` never see research docs, because those docs are not in `listDocuments`.
- INV-25 ("Don't approve") is untouched, and the new agent and command still state it.

Ordering is enforced **in core** (the PRD constraint), by one function that `create_research_doc` and handoff call:

- `checkResearchStep(studyId, kind | "handoff", root): { ok: boolean; reason?: string }`
  - `concepts`, `user-research`, `marketing` → require the `market` doc to exist.
  - `strategy` → requires the `user-research` doc to exist with `findings.length > 0`.
  - `handoff` → requires the `strategy` doc to exist and `parseBuildList(body).length > 0`.

Computed flags. These are pure functions, never written to disk, and play the same role as the non-blocking stale badge:

- `outdatedUpstreams(doc, studyDocs): string[]` returns each `dependsOn` id whose current `version` is greater than `basedOn[id]`. Its main use is "strategy is behind the user research or the marketing plan" (Q5).
- `newNotes(study): string[]` returns the files in `notes/` that are not listed in the user-research doc's `findings`.
- `nextResearchStep(study): RESEARCH_KIND | "findings" | "handoff" | null` returns the first missing step, in the order market → concepts → user-research → marketing → findings → strategy → handoff. A study with new notes after a strategy exists gets `"findings"` again.

## Findings intake

Resolves PRD Q4 and keeps G4 (no board form in v1):

- **Drop folder:** `.claude/specs/research/<slug>/notes/`.
- **Accepted formats:** `.md` and `.txt`, plus `.pdf`, which Claude reads with `Read`. Audio is not accepted: users drop a transcript instead. The command reports skipped files by name.
- **Pasted notes:** the command, running in the main session, first saves pasted text as `notes/<yyyy-mm-dd>-<participant-code>.md` with `Write`. This stays inside `.claude/specs/`, and from then on pasted and dropped notes follow one path.
- **PII (owner decision):** notes are tracked in git with personal data masked. The findings step first rewrites each new note file in place, replacing names with the participant code and emails, phones, addresses and other identifying details with `[redacted]`, then ingests it. Pasted notes are saved already masked. Files dropped but not yet ingested are unmasked, so the board's new-notes banner warns not to commit them before findings runs. The agent refers to participants only by code (`P1`, `P2`, …), never by name or contact detail. Masking is Claude's job in the session; the plugin makes no model calls.
- **Fill:** the researcher agent reads every file in `newNotes`. It then writes the user-research doc with `write_research_doc({ id, body, baseVersion, findings: [...previous, ...ingested] })`, which fills the scoring sheets, `## Findings` quotes and the competitor scorecard.
- **Missing scores are never invented.** A participant whose notes lack a score gets `missing` in that cell. Every participant in the notes appears in the sheet (PRD success metric "findings fill"). `selftest-prompts` pins this rule.

## Researcher agent and command

`agents/researcher.md` follows the style of `agents/prd-writer.md`:

- `model: inherit` and no `tools:` allowlist, so it inherits WebSearch and WebFetch.
- It has one section per job: `market`, `concepts`, `user-research`, `marketing`, `findings`, `strategy`. Each job lists its inputs (the study plus the upstream research docs by id), the required headings from `research-doc-shapes`, and the persist call.
- It carries the lossless-carryover snippet and states "Don't approve".
- **No web search tool** (resolves Q10): the agent still drafts the market research. Every number it cannot source becomes `n/a (unsourced)`, and the doc opens with a one-line `Unsourced draft` notice. Numbers are never invented.
- **Synthesis** (G5) updates the research docs in place before writing the strategy: it resolves the marketing plan's `## To revisit after research` items and adds what was learned to market. Each write bumps `version`, and strategy's `basedOn` records the versions it read.

`commands/specmanager-research.md` (`argument-hint: "<study> [new|market|concepts|plan|marketing|findings|strategy|handoff]"`) runs as a thin orchestrator:

1. Resolve the study through `list_studies`. Offer `new` when the study is unknown: `create_study({ title, idea })`.
2. With no step given, use `nextResearchStep`, which is returned in `list_studies`.
3. Read the gate from `list_studies` (per-study `steps[]` / `nextStep`); there is no separate `check_research_step` tool. `create_research_doc` and the handoff enforce the gate in core anyway.
4. For a drafting step, dispatch `Agent({ subagent_type: "researcher", prompt: <studyId, step, doc ids> })`. `market` dispatches three `researcher` section jobs in parallel (size, competitors, revenue), each returning its sections as text without writing, then one `researcher` merge job writes the single doc via `create_research_doc` (owner decision, 2026-10-21).
5. For `handoff`, show the parsed build list, ask the user which items to hand off, then call `handoff_study_items`.

The command states "Don't approve", and it never dispatches the builder.

Loop support (Q3) is not in v1. Running the command repeatedly with no step argument walks the study, and it stops at findings, which needs the human to run the interviews.

## Handoff to Builder

`handoffStudyItems({ studyId, itemIds: string[] }, root): { created: Feature[]; skipped: { itemId; featureId }[] }`:

1. `checkResearchStep(studyId, "handoff")`.
2. `parseBuildList(strategy.body)`. This locates `## What to build` with `indexHeadings` (anchor `what-to-build`) and returns `{ rank, itemId, title, rationale }[]` from the ordered-list lines. The title is the bold text if there is any, otherwise the text before ` — `. A line without an `[S<n>]` id is not a build item, so handoff never keys on titles.
3. For each requested item id:
   - If a feature already has the same `origin.studyId` and `origin.itemId`, skip it and report the existing id. This makes the call idempotent.
   - Otherwise call `createFeature(title, root, { origin: { studyId, strategyId, strategyVersion, rank, itemId, item: title } })`.

The handoff goes through the existing feature-creation path, so normal Builder gates apply from then on (PRD assumption). Resolves Q7:

- Provenance is stored as `feature.json#origin`, **not** `dependsOn`, so research never enters the Builder staleness graph or `checkGate`.
- A strategy change does **not** mark handed-off PRDs stale. Instead, the board computes "strategy updated since handoff" when the strategy's current `version` is greater than `origin.strategyVersion`, and shows it on the Builder origin chip.

Resolves Q5: re-synthesis updates `strategy.md` in place, bumping its version, and git keeps the history. Features already handed off are left alone, apart from that computed chip.

`agents/prd-writer.md` gets a new step after step 2: "If the feature has `origin`, `read_research_doc` the strategy and the docs in its `dependsOn`. Ground the PRD in them and cite them by id. Do not add them to `dependsOn`/`basedOn`." This mirrors the interview rule. `/specmanager-loop` gets the behaviour for free, because it dispatches the prd-writer.

## MCP tools

Six tools are registered in `server/src/mcp.ts`. They follow the existing `registerTool` + `ok`/`fail` pattern, and every write is followed by `writeManifest`.

| Tool | Input | Notes |
|---|---|---|
| `create_study` | `{ title, idea }` | Creates `study.json` and the `notes/` folder, plus a `.gitignore` if absent. Emits `study.created`. |
| `list_studies` | `{ studyId? }` | Returns each study with its doc summaries (id, kind, version, `outdated[]`), `newNotes[]`, `nextStep`, `buildList[]` and `handedOff[]` (features whose `origin.studyId` matches). |
| `read_research_doc` | `{ id }` | Returns frontmatter, body and filePath. |
| `create_research_doc` | `{ studyId, kind, title, body, dependsOn?, basedOn? }` | Runs `checkResearchStep`. If a doc of that kind already exists it fails with "use write_research_doc". For `concepts` it sanitises the body and applies the cap. Emits `research.created`. |
| `write_research_doc` | `{ id, body?, title?, baseVersion?, dependsOn?, basedOn?, findings? }` | Optimistic concurrency, same as `writeDocument`. Emits `research.updated`. |
| `handoff_study_items` | `{ studyId, itemIds: string[] }` | Calls `handoffStudyItems`. Each created feature emits the existing `feature.created`. |

Core signatures, all in `core/research.ts`, all taking `root = projectRoot()` last like the rest of core:

- `createStudy`, `listStudies`, `readStudy`
- `createResearchDoc`, `writeResearchDoc`, `readResearchDocById`, `listResearchDocs(studyId)`
- `checkResearchStep`, `outdatedUpstreams`, `newNotes`, `nextResearchStep`
- `parseBuildList`, `handoffStudyItems`

## Board REST API

These routes are added in `board-server.ts`. They call the same core functions and so emit the same events as the MCP tools (the architecture invariant). Errors map the same way the `/api/documents/:id` handlers do: 409 for a version conflict, 404 for not found, 400 otherwise.

- `GET /api/studies` returns the `list_studies` payload.
- `POST /api/studies` with `{ title, idea }` starts a study from the board (PRD flow 2).
- `GET /api/research/:id` and `PUT /api/research/:id` with `{ body, title?, baseVersion }`. The PUT is the board edit, with `generatedBy: "human"`.
- `POST /api/studies/:id/handoff` with `{ itemIds }`.

## Board mode toggle and researcher view

These sections use existing tokens only: `--surface-2`, `--border`, `--accent`, `--text-dim`, `--draft`, `--stale`, plus `rounded.md` and `spacing.*` from `docs/DESIGN.md`.

- **Toggle:** a two-segment control labelled `Builder | Researcher`, placed in `board__header` between the title block and `board__meta`. `board__meta` shows the count for the active mode (features or studies).
- **Toggle state** (resolves Q9): kept in the URL hash (`#researcher`), which makes it deep-linkable, and mirrored to `localStorage["specmanager.mode"]` with every read and write wrapped in try/catch. If storage is missing, the board falls back to Builder. The setting is per browser: no server state, nothing in git.
- **Builder mode** is today's grid unchanged. The only addition is an origin chip (`from <study title>`) on rows whose feature has `origin`, with the "strategy updated" variant using `--stale`.
- **Researcher grid** (`ResearchBoard.tsx`) reuses the `grid` / `row` / `row__cell` classes:
  - One row per study (title and idea).
  - Columns: Market research · Concepts · User research · Marketing plan · Strategy · Handoff.
  - Cells reuse the `DocCellView` card look, showing the version and an `outdated` badge (`--stale`).
  - The User research cell also shows a `N new notes` badge.
  - Empty cells show the command to run (`/specmanager-research <slug> market`), which follows the existing `EmptyCell` pattern.
- **Handoff cell:** the parsed build list with checkboxes. Items already handed off show their feature slug instead of a checkbox. A **Create features** button calls the handoff route.
- **Empty state:** "No studies yet". It offers the command plus an inline start-study form (title and idea), which posts to `POST /api/studies`.
- **Live updates:** the existing WS reload in `App.tsx` also refetches `/api/studies` when Researcher mode is active.
- **Doc panel:** `DocPanel source="research"`. The crumb reads `<study title> › <kind label>`. Save uses `PUT /api/research/:id` and keeps the existing 409 conflict flow. There is no Approve, Reopen or Gate button. `kind === "concepts"` renders in the existing sandboxed iframe (same CSS reset) and cannot be edited.

## Sequence flow

1. `/specmanager-research "Oposiciones" new` → `create_study` → `study.created` → the WS reload shows the row.
2. `market`: the command dispatches `researcher`. The agent runs WebSearch, then `create_research_doc(kind: market)` → `research.created` → the card appears.
3. `concepts`, `plan` (user-research) and `marketing`: same path. Each call runs `checkResearchStep`, which requires market.
4. The user runs the interviews outside the tool, then drops files in `notes/`. The watcher emits `file.changed` and the board shows `N new notes`.
5. `findings`: the agent reads `newNotes` and calls `write_research_doc(ur, findings: […])`. The badge clears.
6. `strategy`: the gate requires findings. The agent revises market and marketing (version bumps), then calls `create_research_doc(kind: strategy)`, or `write_research_doc` on re-synthesis, with `basedOn` set to the current versions.
7. `handoff`, from the board or the command, calls `handoffStudyItems` → `createFeature(…, { origin })` → `feature.created`. The Builder grid shows the feature with its origin chip.
8. `/specmanager-prd <slug>` → the prd-writer sees `origin`, reads the strategy and research, and cites them by id.

## Failure and edge cases

- **Version conflict** on a board save or an agent write: rejected with 409 or a tool error, same as Builder docs.
- **Duplicate kind:** `create_research_doc` fails, and the caller uses `write_research_doc`.
- **Gate closed:** the tool returns `reason`. The command reports it and names the missing step.
- **Malformed `study.json` or research doc:** skipped with a stderr warning, following the `listFeatures` / `listDocuments` pattern, so one bad file never breaks the board.
- **Strategy edited by hand** until `## What to build` has no ordered items: the handoff gate closes with the reason "no build items", and the Handoff cell shows that message.
- **Repeated handoff:** idempotent per `(studyId, itemId)`. Renaming or re-ranking an item keeps its `S<n>` id, so it is never handed off twice.
- **Concepts body too large or containing a `---` line:** the cap error tells the agent to reference images by path, and sanitising defangs the delimiter.
- **No web search:** the unsourced-draft rule in `researcher-agent-and-command` applies.
- **Notes with PII:** masked in place on ingest (tracked in git), and the doc uses participant codes. A transcript the agent cannot read (wrong format) is reported and left out of `findings`, so it stays in `newNotes`.
- **Study and feature with the same title:** no conflict, because they live under separate roots and use separate id prefixes.
- **Builder-only project:** no `research/` dir, no `studies` manifest key and no CLAUDE.md line. The board's only visible change is the toggle.

## Conventions used

- Every mutation goes through `core`, and MCP and REST call the same functions and emit the same events.
- Frontmatter is authoritative and `manifest.json` is a rebuildable cache.
- Zod schemas use defaults and optionals, so no migration is needed.
- TS ESM (`"type": "module"`, `.js` import suffixes) and `root = projectRoot()` as the last parameter.
- Optimistic concurrency through `baseVersion`.
- Tool results use the `ok`/`fail` helpers, and every write is followed by `writeManifest`.
- Hand-rolled self-tests in `server/src/selftest-*.ts` with an npm script each.
- Prompt fragments shared by more than one agent live in `docs/agent-snippets/`, and every carrier is updated in the same commit.
- Agents say "Don't approve". Only `/specmanager-loop` approves.
- No model or API calls from the plugin: web research happens in the session.
- The UI uses Preact via `preact/compat` with existing tokens, and browser storage is wrapped in try/catch.
- Short modules: `research.ts` stays single-purpose.
- `dist/` is rebuilt before committing, and the release is a minor bump.

## Prompt invariants

New `selftest-prompts` entries. Each pins min and max counts at its first carrier.

- **researcher-shapes:** every heading list in `research-doc-shapes` appears in `agents/researcher.md`.
- **no-invented-numbers:** "never invent" scores and numbers, plus the `missing` / `n/a (unsourced)` markers, appear in `agents/researcher.md` and `commands/specmanager-research.md`.
- **participant-codes:** participants are referred to only by code, and note files are masked in place before ingest.
- **Don't approve:** present in `agents/researcher.md` and `commands/specmanager-research.md`. These are new rows; INV-25's file list is not edited.
- **no builder dispatch** in `commands/specmanager-research.md`.
- **prd-writer origin grounding**, plus "not in dependsOn".
- INV-13 / INV-29 lossless carryover counts go from 4 to 5 carriers.

## Suggested phase cut

The planner decides the final cut. This is a proposal.

1. **Core + MCP.** Types, paths, the `frontmatter` schema parameter, `research.ts` (CRUD, gates, flags, `parseBuildList`, handoff), `createFeature` origin, events, manifest `studies`, the six tools, `smoke-mcp`, and `selftest-research`. The selftest covers two independent studies, gates, `outdated`, `newNotes`, build-list parse and idempotent handoff (PRD success metric "multi-study").
2. **Agent + command.** `researcher.md`, `specmanager-research.md`, the prd-writer origin step, the snippet carrier, the `selftest-prompts` entries, the CLAUDE.md block line, and the repo `CLAUDE.md` doc updates.
3. **Board.** Toggle, `ResearchBoard`, `DocPanel source`, REST routes, origin chip, and `selftest-board` coverage of the new routes.

End-to-end on a real study (re-running oposiciones) is the walkthrough's stakeholder test, not a builder task. Release: minor bump. Packaging does not change (no change to `plugin.json` beyond the version, `.mcp.json`, `hooks/` or root `package.json`), so no surface test is required. Because `ui/` changes, the owner opens and saves a doc in the board.

## Open questions

1. ~~**Notes in git (Q4)**~~ — resolved (owner, 2026-10-21): tracked in git, personal data masked on ingest (see `findings-intake`).
2. **Loop for studies (Q3) — resolved (owner): not in v1.** a step-less `/specmanager-research` walks the study. Is a `/specmanager-loop`-style auto-run of the pre-findings steps (market → marketing) wanted later?
3. **Marketing phase overlap (Q6) — resolved (owner): ignored entirely; no link between the two features.** `prd-marketing-phase-035` is still a draft plan. This design gives handed-off features no Market & demand inheritance. The prd-writer only reads the study's marketing plan as context. Should the two specs be reconciled before Marketing phase builds?
4. **Parallel market sub-agents — resolved (owner): parallel section jobs + merge in v1.** is the one-agent default enough for v1, or is a split-and-merge required for depth? Fixing this sets the cost of the `market` step.
5. ~~**Lifecycle (Q2)**~~ — resolved (owner): no approval. The prd-writer (directly or via `/specmanager-loop`) reads the strategy and research docs as they are at that moment.
6. ~~**Item rename after handoff**~~ — resolved (owner): build items carry stable `S<n>` ids and handoff is idempotent on them.
7. ~~**No design doc**~~ — resolved: `design-researcher-mode-009` v1 exists and the plan's UI tasks follow it.
