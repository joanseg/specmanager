---
id: arch-research-loop-and-docs-032
featureId: feat-research-loop-and-docs
stage: architecture
status: approved
stale: false
title: Research loop and docs architecture
dependsOn:
  - prd-research-loop-and-docs-047
basedOn:
  prd-research-loop-and-docs-047: 2
generatedBy: agent
version: 3
createdAt: '2026-10-22T14:53:29.760Z'
updatedAt: '2026-10-22T17:34:43.707Z'
---
## Summary

Extends the shipped Researcher mode (`arch-researcher-mode-031`, branch `feat/researcher-mode`) per `prd-research-loop-and-docs-047`. It makes three changes, all reusing the existing `core/research.ts` CRUD, gates and flags, so no parallel machinery is added:

- **Two research doc kinds change.** A new single-per-study `brief` kind (markdown). The single `concepts` kind becomes a multi-per-study `doc` kind (HTML) that carries a `docType`.
- **Commands.** A new main-session command, `commands/specmanager-research-loop.md`, shaped like `commands/specmanager-loop.md`. It drives the existing `researcher` agent through brief → market → docs → user-research plan → marketing plan. `/specmanager-research` gains `brief` and `docs` steps.
- **Board.** The Researcher grid's Concepts column becomes a multi-card Docs column, and the study label shows its brief.

Existing `concepts.html` files are reinterpreted as wireframes Docs **at read time**. Their file and id do not change, and no migration action is needed. No new MCP tool, REST route, event or dependency is added. The plugin makes no model or API calls.

Decisions on the PRD's open questions (Q1–Q10) are recorded in `decisions-on-prd-open-questions`. Those left open are listed under `open-questions`.

## Affected components

All paths are under `plugins/specmanager/` unless noted.

| File | Change |
|---|---|
| `server/src/core/types.ts` | `RESEARCH_KIND` becomes `["brief", "market", "doc", "user-research", "marketing", "strategy"]`. `ResearchDocFrontmatterSchema` gains optional `docType`, a refine making `docType` required iff `kind === "doc"`, and a legacy preprocess (`concepts` → `doc` + `wireframes`). Adds `DOC_TYPE_PRESETS`. |
| `server/src/core/paths.ts` | Adds `studyDocsDir(slug, root)` → `research/<slug>/docs/`. |
| `server/src/core/research.ts` | Brief and doc kinds in the id/filename maps, `listResearchDocs` reads `docs/*.html` and the legacy `concepts.html`, doc-kind create path, `prepareBody` HTML branch keyed on `doc`, `assertSameStudy` built from the study's actual doc ids, step `concepts` → `docs`, and a `StudySummary` doc entry with `docType`. |
| `server/src/core/manifest.ts` | `StudyManifestEntry.documents[]` gains optional `docType`. It is still rebuilt from frontmatter. |
| `server/src/mcp.ts` | `create_research_doc` takes an optional `docType`. The kind enum follows `RESEARCH_KIND`. The descriptions of `create_research_doc` and `list_studies` are updated. Tool count is unchanged. |
| `server/src/board-server.ts` | No route change. `PUT /api/research/:id` already serves the brief (markdown) and HTML docs through `writeResearchDoc`. |
| `server/src/selftest-research.ts` | concepts cases → doc cases, plus the multi-doc, legacy, brief and docType cases (see `self-tests`). |
| `server/src/selftest-prompts.ts` | Part H rows updated and new rows for the loop command (see `prompt-invariants`). |
| `agents/researcher.md` | New `brief` job. The `concepts` job becomes the `docs` job with per-type guidance. Every job adds `brief-<slug>` to `dependsOn` when it exists. The user-research and strategy `dependsOn` lists name the wireframes docs. Job list and description updated. |
| `commands/specmanager-research.md` | `brief` and `docs` steps, with `concepts` kept as an alias of `docs`. The docs step uses the relevance filter and asks for confirmation. The "No loop support in v1" line is replaced by a pointer to the loop. |
| `ui/src/types.ts` | Mirror: `ResearchKind`, `ResearchStep` (`docs` replaces `concepts`), `docType?` on `StudyDocCard` / `ResearchDocFull`. |
| `ui/src/ResearchBoard.tsx` | Concepts column → Docs (stacked cards, one per doc). A brief chip in `StudyLabel`. A kind → step map for `stepCommand`. `kindLabel` covers `brief` and doc types. |
| `ui/src/ResearchDocPanel.tsx` | `isConcepts` → `isHtml` (`kind === "doc"`). The crumb uses the doc-type label. Brief edits and saves like the other markdown docs. |
| `ui/src/EmptyResearch.tsx` | `STEPS` uses `docs` in place of `concepts`. |
| `ui/src/panelParts.tsx` | The comment "concepts canvas" → "research Docs" (no logic change). |
| `ui/src/styles.css` | Stacked-card spacing in a Docs cell and the brief chip, using existing tokens only. |
| `server/src/core/claude-md.ts` | `renderBlock`'s `**Commands:**` line adds `/specmanager-research` · `/specmanager-research-loop` (owner decision). |
| `README.md` (plugin) | A short Researcher mode paragraph plus rows for the research commands (owner decision). |
| `CLAUDE.md` (repo root) | Adds a Layout line for `specmanager-research-loop.md` (runs in the main session). The `core/research.ts` note gets a sentence on the brief and multi-doc Docs. |
| `.claude-plugin/plugin.json` | Minor `version` bump at release (PRD constraint). |

New file:

- `commands/specmanager-research-loop.md`: the research loop (see `research-loop-command`).

No new agent: the loop dispatches the existing `researcher`. No change to `agents/prd-writer.md`, the Builder commands, gates or `/specmanager-loop` (PRD non-goal).

## Data model changes

Study folder after this feature. New and changed entries are marked.

```
.claude/specs/research/<slug>/
  study.json              # unchanged
  brief.md                # NEW kind "brief", id brief-<slug>
  market-research.md      # unchanged
  concepts.html           # LEGACY only: read as kind "doc", docType "wireframes", id concepts-<slug>
  docs/                   # NEW: one HTML file per Doc
    <doc-slug>.html       #   kind "doc", id doc-<study-slug>-<doc-slug>
  user-research.md · marketing-plan.md · strategy.md · notes/   # unchanged
```

Types (sketch, `core/types.ts`):

- `RESEARCH_KIND = z.enum(["brief", "market", "doc", "user-research", "marketing", "strategy"])`.
- `DOC_TYPE_PRESETS = ["wireframes", "client-presentation", "partner-presentation", "investor-deck", "one-pager"] as const`. Any other non-empty `docType` string is a **custom** type, and the string itself is its label (for example `"pilot proposal for a school"`). There is no separate `custom` flag: one field, one rule.
- `ResearchDocFrontmatterSchema` adds `docType: z.string().min(1).optional()`, with a refine that requires `docType` when `kind === "doc"` and rejects it on other kinds. This matches the existing `findings` refine.
- **Legacy preprocess:** a raw frontmatter with `kind: "concepts"` parses as `kind: "doc", docType: "wireframes"`. Its `id`, `version`, `dependsOn` and `basedOn` are untouched.

Ids and files:

| Kind | Id | File |
|---|---|---|
| brief | `brief-<slug>` | `brief.md` |
| doc | `doc-<study-slug>-<doc-slug>` | `docs/<doc-slug>.html` |
| doc (legacy) | `concepts-<slug>` (kept) | `concepts.html` (kept) |

- `doc-slug` = `uniqueSlug(slugify(docType), studyDocsDir)`, checked against the `.html` name. A second wireframes doc becomes `wireframes-2`.
- Id prefixes `brief-` and `doc-` do not collide with Builder ids (`prd-`, `arch-`, `design-`, `plan-`, `wt-`) or with existing research prefixes.
- `doc-<study>-<doc>` can be ambiguous across studies (study `a-b` doc `c` vs study `a` doc `b-c`). `createResearchDoc` therefore rejects a doc id that already exists in any study. It reuses `readResearchDocById`, which already scans every study.

**Migration** (resolves Q8): there is no migration step and nothing is moved on disk.

- `listResearchDocs` reads `concepts.html` when present, and the preprocess presents it as a wireframes Doc.
- The first `writeResearchDoc` to it persists the new frontmatter (`kind: doc`, `docType: wireframes`) to the same file.
- Existing `concepts-<slug>` ids stay valid in every user-research and strategy `dependsOn` and `basedOn`, so `outdatedUpstreams` and screen-letter references keep working unchanged.
- `manifest.json#studies` stays a rebuildable cache.

## G1 — Research loop command

See `research-loop-command`. A new `commands/specmanager-research-loop.md` runs in the main session. Order: brief → market → docs → user-research plan → marketing plan. It stops before findings, strategy and handoff.

## G2 — Business brief doc

- **Kind and file:** kind `brief`, single per study, markdown, id `brief-<slug>`, file `brief.md`.
- **Writer:** the `researcher` agent's new `brief` job, from the opening Q/A block passed in its prompt. The command never drafts inline (existing rule "Don't draft research docs inline").
- **Headings (exact, pinned):** `## Idea`, `## Market`, `## Audience`, `## Goals`, `## Constraints`, `## Assumptions`, `## Open questions`.
- **`dependsOn`:** `[]`.
- **Downstream:** every later job adds `brief-<slug>` to `dependsOn` / `basedOn` when the brief exists. That meets the "brief grounding" metric, and a later brief edit flags those docs outdated through the existing `outdatedUpstreams`.
- **No gate:** the brief is not a gate. `gateFor("brief")` is always open and market's gate stays open (Q2).
- **Not a rail step:** the brief sits outside `RESEARCH_STEPS`, so existing brief-less studies keep `nextStep` unchanged. It shows as a chip on the study label (see `board-docs-column-and-brief`).

## G3 — Concepts become Docs

- **Kind:** `doc`, many per study, each with a `docType` (presets plus custom; see `data-model-changes`).
- **HTML rules:** `prepareBody` applies `sanitizeDesignBriefBody` and the `DESIGN_BRIEF_MAX_BYTES` (5 MB) cap to every `doc`, as it does to concepts today (PRD constraint: every Doc type).
- **Creating:** `createResearchDoc` skips the "already exists" check for `doc` and requires `docType`.
- **Updating:** in place by id through `writeResearchDoc`.
- **Visual grounding:** Docs mock the study's product, never this repo's UI. No `docs/DESIGN.md` grounding (`arch-researcher-mode-031`).

## G4 — Relevance-filtered Doc selection

See `doc-relevance-and-dependencies`. Relevance is a **recommendation in the prompts**, not a core gate (Q3). Core keeps only the existing ordering gate (a doc needs market research). Both commands ask `AskUserQuestion` (multiSelect) before any Doc job is dispatched: the loop in its opening round 2, the docs step when it runs. The built-in "Other" free-text answer is the custom type.

## G5 — Docs command

`/specmanager-research <study> docs` (alias `concepts`, Q7) runs at any point after market research:

1. Read `list_studies`.
2. Apply the relevance filter.
3. Ask which Docs to make, including "update existing <doc>" options for Docs that already exist.
4. Dispatch one `researcher` `docs` job per confirmed Doc, in parallel in one message. Each job gets its docType, or the existing doc id for an update.
5. Report each doc id, version and path.

## G6 — Migration

Read-time normalization of `concepts.html` (see `data-model-changes`).

- User-research keeps referencing screens by letter.
- Findings, strategy and handoff are untouched: they read user-research `findings` and the strategy build list, and neither depends on the kind rename.
- The rail's `concepts` step becomes `docs`, and a legacy study's wireframes Doc marks it done.

## G7 — Board

See `board-docs-column-and-brief`.

## Research loop command

`commands/specmanager-research-loop.md`, argument `"<idea, or existing study id/slug>"`. It mirrors `commands/specmanager-loop.md` step for step, except that it **approves nothing** and has no `set_status` calls. It runs in the **main session**: questions, review and end questions are conversation, and drafting goes to `researcher` subagents.

1. **Parse.** No argument → ask for a one-line idea and stop. Otherwise hold `$ARGUMENTS` verbatim as the **Original idea**.
2. **Opening turn, before any write.** A one-line message covering three things:
   - the run order (brief → market → docs → user-research plan → marketing plan → one review → end questions → report);
   - that it **approves nothing** (research docs have no approval);
   - that it stops before findings.
3. **Resolve the study.** `list_studies`:
   - **Existing:** the first token matches an `id` or `slug`. Existing docs are **reused as upstream and their step is skipped**, like `/specmanager-loop` reusing approved docs (Q6). The opening round adds one question: reuse existing docs *(recommended)* / rewrite them in place with `write_research_doc`.
   - **New:** `create_study({ title, idea })` runs right after opening round 1, which proposes the title.
4. **Opening questions.** At most 2 `AskUserQuestion` rounds of up to 4 questions each, recommended option first:
   - Round 1: idea (confirm or edit), market, audience, goals, plus the title for a new study.
   - Round 2: constraints and **which Docs to make** (relevance-filtered multiSelect per `doc-relevance-and-dependencies`; pre-interview this typically offers wireframes, one-pager and client presentation; "Other" = custom), plus any round-1 gap. Owner decision: every question is asked up front, so the drafting run never pauses.
   - Every question offers "decide for me", and gaps become Assumptions.
   - The answers form the **brief block**: Original idea, Q/A lines, Assumptions.
5. **Brief.** One `researcher` `brief` job with the study id and the brief block. On an existing study with a brief, the reuse answer applies: write in place or skip.
6. **Market.** The same as `/specmanager-research` today: three section jobs in parallel (`market-size`, `market-competitors`, `market-revenue`), then one `market-merge`. Each prompt names `brief-<slug>`.
7. **Docs.** One `docs` job per Doc confirmed in opening round 2, different types in parallel, same type sequential. No Doc is drafted without confirmation in this run.
8. **User-research plan**, then **marketing plan**. One job each, sequential in PRD order.
9. **Per-step check.** After each dispatch, `list_studies` must show the doc. If it is missing, take the failure stop.
   - **Transient retry R=2** on `529` / Overloaded, as in `/specmanager-loop`: check first whether the doc landed. Genuine failures are not retried.
   - **Progress line** per step, e.g. `market drafted — market-<slug> v1`.
10. **One cross-doc review, inline, single pass.** Read every doc with `read_research_doc`; for HTML Docs, use `Read` on `filePath` in offset/limit chunks. Check:
    - contradictions between docs and the brief;
    - every doc lists `brief-<slug>` in `dependsOn`;
    - user-research screen letters exist in the wireframes Doc(s);
    - figures are sourced or marked `n/a (unsourced)` (presentations and decks included);
    - pinned heading shapes;
    - drift from the Original idea.

    Fix what is clear-cut with `write_research_doc({ id, body, baseVersion, basedOn })`. HTML Docs get small textual edits only. A version conflict is not retried; it becomes an end question. No re-review.
11. **End questions.** Gather each doc's open questions, unresolved review findings and brief Assumptions. Ask them with `AskUserQuestion` in batches of up to 4, recommended option first.
    - Apply answers in **one final update per affected doc**, the brief included, with the same write rules.
    - Skipped questions are recorded in the brief's `## Open questions`.
12. **Final report.**
    - study id and slug;
    - each doc: id, version, path;
    - review fixes applied;
    - questions answered vs still open;
    - a note that nothing was approved;
    - next step: run interviews, drop notes in `notes/`, then `/specmanager-research <slug> findings`.
13. **Failure stop.** Stop on a closed gate, a subagent error after retries, a missing doc, or any `ok: false`. Report the last drafted step, the failed step, the reason verbatim, and the resume command (`/specmanager-research <slug> <step>`).

**Don't:**

- approve anything;
- draft inline;
- dispatch the builder or a `findings`, `strategy` or handoff step;
- invent numbers.

## Doc relevance and dependencies

Resolves Q3 (a recommendation, not a core rule), Q4 and Q5. The table lives once, in `commands/specmanager-research.md` (docs step). The loop file points to that section instead of copying it, so no new snippet is needed.

| docType | Offered when (recommended) | dependsOn (only ids that exist) |
|---|---|---|
| wireframes | market exists and user-research has no findings yet (pre-interview) | brief, market |
| client-presentation | market exists | brief, market, strategy |
| partner-presentation | market exists | brief, market, marketing, strategy |
| investor-deck | strategy exists (offered earlier only as "after strategy is better") | brief, market, marketing, strategy |
| one-pager | any time after market | brief, market, strategy |
| custom (free text) | always, via "Other" | brief, market, plus any other existing doc the agent judges relevant |

- **Inside the loop**, the Docs step typically offers wireframes, one-pager and client presentation.
- **Outdated decks:** a deck drafted after the strategy records `strategy-<slug>` in `basedOn`. When the strategy changes, the deck is flagged outdated by the existing `outdatedUpstreams`, with no new code (Q4).
- **Multiple wireframes (Q5):** allowed. The docs step recommends updating an existing wireframes Doc over adding a second one.
  - user-research `dependsOn` lists **every** wireframes Doc. With more than one, screens are referenced as `<doc-slug> A`; with exactly one, as plain `A`.
  - strategy `dependsOn` lists market, every wireframes Doc, user-research and marketing.
- **Doc job guidance** in `agents/researcher.md`:
  - **wireframes:** the current concepts rules verbatim. Labelled screens A, B, C… (six is the default), a pricing screen grounded in market prices, phone frames by default (web frames for a web product), one caption line per screen.
  - **presentations / deck / one-pager:** slide or section structure suited to the audience. Figures only from upstream docs, otherwise `n/a (unsourced)` (PRD assumption).
  - **All types:** inline CSS, no external scripts or fonts, 5 MB cap.

## Core changes in research.ts

All signatures keep the current style: `root = projectRoot()` last, errors thrown as `Error` with the existing messages, events unchanged.

- `KIND_ID_PREFIX` / `KIND_FILENAME` cover the single kinds only: `brief`, `market`, `user-research`, `marketing`, `strategy`.
- `docId(studySlug: string, docSlug: string): string` → `doc-${studySlug}-${docSlug}`. `researchDocId(kind, slug)` stays for single kinds.
- `listResearchDocs(studyId, root)`: the single-kind files, then the legacy `concepts.html`, then `docs/*.html` sorted by name. A malformed file is skipped with a stderr warning (existing behaviour).
- `CreateResearchDocInput` gains `docType?: string`.
- `createResearchDoc(input, root)` for `kind === "doc"`:
  - requires `docType`;
  - computes the doc slug and id;
  - rejects an id that already exists project-wide;
  - writes `docs/<doc-slug>.html`, creating `docs/` if needed.

  Single kinds keep the "already exists — use write_research_doc" error.
- `prepareBody(kind, body)`: HTML branch when `kind === "doc"`. The error text says "doc body".
- `assertSameStudy(slug, studyDocs, dependsOn, basedOn)`: the allowed set is the ids of the study's listed docs. This replaces the derived `KIND_ID_PREFIX` set, which cannot know doc slugs. The study state is already read by the gate.
- `ResearchStep = "market" | "docs" | "user-research" | "marketing" | "findings" | "strategy" | "handoff"`, and `RESEARCH_STEPS` swaps `concepts` for `docs`.
  - `gateFor("docs")` requires market.
  - `checkResearchStep(studyId, kind | "handoff")` maps `doc` → `docs`, and `brief` is always open.
  - `isDone("docs")` = at least one `doc`. Flag = any `doc` outdated (reason lists them).
- `StudySummary.docs[]` gains `docType?: string`. The brief appears in `docs[]` as kind `brief`, and the UI picks it out.

## Board docs column and brief

`design-research-loop-and-docs-010` (approved) is authoritative for the UI; it extends the `design-researcher-mode-009` patterns and uses `ui/src/tokens.css` values.

- **Docs column (`ResearchBoard.tsx`):** the `COLUMNS` entry `{ kind: "doc", label: "Docs" }`.
  - The cell renders **every** doc of kind `doc` as a stacked `DocCell`, titled by the doc title with the `html` badge and the doc-type label (preset label, or the custom string).
  - With no docs, it shows `EmptyCell` for step `docs`.
  - With docs and the step open, a dim `… docs` copy-command card sits below the stack to add another.
  - The outdated badge is per card, as today.
- **Brief chip (`StudyLabel`):** one chip under the idea.
  - A brief exists → `Brief vN`, which opens the brief in `ResearchDocPanel` (editable, saved via `PUT /api/research/:id`, existing 409 banner).
  - No brief → a dim copy-command `/specmanager-research <slug> brief`.
  - Resolves Q1: the brief is editable in the board and has its own step.
- **`stepCommand`:** a kind → step map (`doc` → `docs`, `brief` → `brief`, `user-research` → `plan`), so the drawer's outdated block prints the right command.
- **`ResearchDocPanel.tsx`:** `isHtml` (kind `doc`) renders `HtmlPreview` read-only. The crumb is `<study> › <doc-type label>`.
- **`EmptyResearch.tsx`:** the steps rail shows `docs`.

## Sequence flow

The research loop on a new idea:

1. The opening turn is shown; nothing is written.
2. 1–2 `AskUserQuestion` rounds are asked (brief questions plus the Doc selection).
3. `create_study` → `researcher brief` → `create_research_doc(kind brief)`.
4. Three parallel market section jobs (text only) → `market-merge` → `create_research_doc(kind market, dependsOn [brief])`.
5. N parallel `docs` jobs (types confirmed in the opening round) → `create_research_doc(kind doc, docType, dependsOn [brief, market])`. Each passes core's market gate, sanitiser and cap.
6. `user-research` job (dependsOn brief, market, wireframes docs) → `marketing` job (brief, market).
7. Inline review → `write_research_doc` fixes.
8. End questions → one final `write_research_doc` per affected doc → report.

Every write goes through `core/research.ts`, emits the existing `research.*` events, refreshes the managed CLAUDE.md block and manifest, and reaches the board through the `chokidar` watcher with no new wiring.

## Failure and edge cases

- **Docs before market:** `create_research_doc(kind doc)` fails with "needs market research first" (core gate). The command reports it.
- **Missing or invalid `docType`:** a doc without `docType`, or `docType` on a non-doc kind, is rejected by the schema refine and a thrown error.
- **Same type twice in one run:** `uniqueSlug` gives `wireframes-2`. Parallel jobs of the **same** type could race on the slug, so the command dispatches same-type Docs sequentially and different types in parallel.
- **Cross-study id collision:** the project-wide existence check rejects it. The agent retries with a different docType wording only if the user asks.
- **Legacy study:** `concepts.html` is listed as a wireframes Doc with id `concepts-<slug>`. A new wireframes Doc lands in `docs/`, and the docs step offers "update concepts-<slug>" first to avoid two.
- **Brief-less study:** fully usable. No gate, no rail change, and jobs simply omit `brief-<slug>`.
- **Oversized HTML:** the 5 MB cap error is returned verbatim, and the agent references images by path (existing rule).
- **Version conflict in review or end questions:** not retried; it becomes an open question in the report (loop rule).
- **Re-run on a complete pre-findings study:** every step is reused. Only the review and end questions run, unless the user picks "rewrite in place".
- **Subagent 529:** R=2 with a landed-doc check first.
- **No web search:** the existing unsourced-draft rule applies to every job, briefs excepted (they carry no figures).

## Self-tests

`selftest-research.ts` (same hand-rolled style):

- the brief is created, `brief-<slug>` resolves, no gate, and it is absent from `steps`;
- the doc gate needs market;
- two preset docs plus one custom doc in one study, with distinct ids and files under `docs/`;
- a doc without `docType` is rejected, and so is `docType` on `market`;
- the same type twice → `-2` slug;
- a project-wide duplicate doc id is rejected;
- a fixture `concepts.html` with `kind: concepts` frontmatter is listed as `kind: doc, docType: wireframes, id concepts-<slug>`, the user-research `dependsOn` on it still validates, and a write persists the new frontmatter in place;
- the rail `docs` step is done/flag;
- a deck is outdated after a strategy write;
- the existing findings, strategy and handoff assertions are kept with `concepts` → `doc`.

`selftest-board` needs no change: the research routes are unchanged. `smoke-mcp` needs no change: the tool set is unchanged.

## Prompt invariants

`selftest-prompts.ts` Part H edits. Each row pins min and max:

- **INV-56b:** re-targeted to the `docs` job's wireframes bullets. The labelled-screens + pricing-screen lines are kept verbatim, so the pattern holds; only `what` changes.
- **INV-56f (new):** the brief job's exact heading list, in order.
- **INV-57a/b:** counts re-pinned to the updated `agents/researcher.md` + `commands/specmanager-research.md`. The new loop command gets its own rows (below), so these file lists do not grow.
- **INV-64a–g (new, `commands/specmanager-research-loop.md`):**
  - a. `Don't approve`, 1–1, its own row: INV-25's list is unchanged (PRD).
  - b. no `set_status(`, negative.
  - c. no `subagent_type: "builder"`, negative.
  - d. "main session" present.
  - e. the opening turn comes "before any write".
  - f. "single pass" review.
  - g. `n/a (unsourced)` / "never invent" present.
- **INV-65 (new):** the Doc confirmation sentence ("No Doc is drafted without the user confirming") appears in both research command files, min = max = 2.
- **INV-61/62** for `commands/specmanager-research.md` are unchanged.

Snippet parity: no new shared fragment. The relevance table has one home, and the loop links to it.

## Conventions used

- One `core/` module; MCP and REST both call `createResearchDoc` / `writeResearchDoc`, so no logic is duplicated (repo CLAUDE.md invariant).
- Gates and flags are computed in core (`gateFor`, `outdatedUpstreams`). Relevance stays advisory because the user confirms it (PRD Q3 option b).
- Frontmatter is authoritative; `manifest.json` is a rebuildable cache.
- Zod schemas with `.refine` for kind-scoped fields (mirrors `findings`).
- TS strict, ESM, `root = projectRoot()` last parameter, thrown `Error` mapped to 400/404/409 by `researchError`.
- Optimistic concurrency via `baseVersion` on every agent write.
- Main-session orchestration for multi-turn commands. `AskUserQuestion` takes up to 4 questions, recommended option first.
- Hand-rolled self-tests in `server/dist`; prompt invariants pinned with exact min/max.
- Preact via the React API, and existing DESIGN.md tokens only.
- No model or API calls from the plugin, and no new runtime dependency.
- Rebuild and commit `server/dist` + `ui/dist`; minor version bump. No packaging change, so no surface test. Because `ui/` changes, the owner opens and saves a doc in the board.

## Decisions on PRD open questions

- **Q1 (resolved):** yes, `/specmanager-research <study> brief` is its own step: it asks the five questions in the main session, then dispatches the `brief` job. The brief is editable in the board like the other markdown docs.
- **Q2 (resolved):** the brief is **not** a gate for anyone, new studies included. Existing studies are not backfilled and simply stay brief-less. The loop always creates one.
- **Q3 (resolved):** relevance is a prompt-side recommendation (table in `doc-relevance-and-dependencies`), confirmed by the user. Core enforces only the market gate.
- **Q4 (resolved):** per-type `dependsOn` as tabled. A deck drafted after the strategy is flagged outdated when the strategy changes.
- **Q5 (resolved):** multiple wireframes are allowed. Letters are prefixed with the doc slug when there is more than one. Strategy lists every wireframes Doc.
- **Q6 (resolved):** reuse existing docs and skip their step by default; one opening question offers rewrite-in-place.
- **Q7 (resolved):** `concepts` is kept as an alias of `docs`.
- **Q8 (resolved):** lazy read-time normalization; ids `concepts-<slug>` are kept; nothing moves on disk.
- **Q9 (resolved):** a separate `/specmanager-research-loop` command (`commands/specmanager-research-loop.md`), not a mode of `/specmanager-loop`, which is unchanged (PRD non-goal).
- **Q10:** left open (below).

## Open questions

1. **Shared deck style (PRD Q10) — resolved (owner): share one style, as recommended below.** Should presentations and decks share one visual style per study? Recommendation: the `docs` job reuses the inline CSS palette of an existing presentation-type Doc in the same study when one exists, and otherwise styles from the brief. That needs no schema or core change. Confirm, or style each Doc independently.
2. **Managed CLAUDE.md commands line — resolved (owner): add both research commands to `renderBlock`'s Commands line.** `core/claude-md.ts` `renderBlock`'s `**Commands:**` line lists no research commands today. Should `/specmanager-research` and `/specmanager-research-loop` be added? Doing so changes the rendered block for every project. This design leaves it unchanged.
3. **Plugin README — resolved (owner): add Researcher mode and research command rows in this release.** `plugins/specmanager/README.md` does not mention researcher mode. Should this release add rows for the research commands? The directory listing reads that README.
4. **Doc-slug renames — resolved (owner): acceptable.** A Doc's slug derives from its first `docType` wording and never changes. Renaming a custom type later changes only the title. Acceptable?
5. **Loop Doc confirmation timing — resolved (owner): ask in opening round 2; the PRD flow is updated to match.** The PRD flow asks at the Docs step, mid-run. The alternative is asking in the opening round to keep all questions up front. This design follows the PRD (mid-run).
