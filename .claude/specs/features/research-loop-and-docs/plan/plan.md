---
id: plan-research-loop-and-docs-026
featureId: feat-research-loop-and-docs
stage: plan
status: approved
stale: false
title: Research loop and docs plan
dependsOn:
  - arch-research-loop-and-docs-032
  - design-research-loop-and-docs-010
basedOn:
  arch-research-loop-and-docs-032: 3
  design-research-loop-and-docs-010: 1
generatedBy: agent
version: 2
createdAt: '2026-10-22T15:03:59.671Z'
updatedAt: '2026-10-22T17:34:43.905Z'
---
## Overview

Builds `prd-research-loop-and-docs-047` per `arch-research-loop-and-docs-032` and `design-research-loop-and-docs-010`, on top of the shipped Researcher mode (`feat-researcher-mode`, branch `feat/researcher-mode`). It ships the `brief` kind and the multi-per-study `doc` kind in `core/research.ts` (with read-time `concepts.html` → wireframes normalisation), the `brief` and `docs` steps in `/specmanager-research`, the new main-session `/specmanager-research-loop` command, and the board's Docs column, brief chip, drawer variants and empty state (design Screens 1–6). **One phase**: no spike trigger (every Architecture open question is a prompt or copy choice that does not change which tasks exist) and no size trigger (55 points, under the ≈100 soft limit).

**Scale:** `1` trivial · `2` small · `3` moderate · `5` substantial · `8` large · `13`/`21` epic.

*Every task below is decomposed to ≤3 points. The core, prompt and UI work splits naturally at that size; the phase subtotal is unchanged by the granularity.*

| Phase | Theme | Points |
|---|---|---|
| loop-docs | Research loop, brief and multi-doc Docs | 55 |
| **Total** | | **55** |

---

## Phase loop-docs — Research loop, brief and multi-doc Docs

**Exit test:** from the repo root, `cd plugins/specmanager/server && npm run build && npm run selftest && npm run selftest-research && npm run selftest-prompts && npm run smoke-mcp && npm run selftest-directory && cd ../ui && npm run build` all pass; `claude plugin validate plugins/specmanager` prints `✔ Validation passed`; and in a scratch project, `/specmanager-research-loop "<idea>"` produces a brief, market research, at least one confirmed Doc, a user-research plan and a marketing plan, each naming `brief-<slug>` in `dependsOn`, then reports ids, versions and paths with nothing approved. *(The loop run is a model-driven dry run; `selftest-prompts` is its automated proxy.)*

**UI check:** web — after rebuilding `ui/dist`, reconnect via `/mcp`, open `board_url` and switch to `#researcher`; use a scratch study with a legacy `concepts.html` fixture, a brief, two preset Docs and one custom Doc (design Screens 1–4), a project with no studies for Screen 5, and a 900px viewport for Screen 6.

| # | Task | Pts | Notes |
|---|---|---|---|
| 1.1 | Research kinds in `core/types.ts`: `brief` and `doc` kinds, `DOC_TYPE_PRESETS`, `docType` refine, legacy `concepts` preprocess | 2 | `RESEARCH_KIND = ["brief","market","doc","user-research","marketing","strategy"]`; presets `wireframes`, `client-presentation`, `partner-presentation`, `investor-deck`, `one-pager`, any other non-empty string is custom (no flag); refine: `docType` required iff `kind === "doc"`, rejected on other kinds (mirrors `findings`); raw `kind: concepts` parses as `doc` + `wireframes`, `id`/`version`/`dependsOn`/`basedOn` untouched. Arch `data-model-changes`. |
| 1.2 | Doc storage and listing: `studyDocsDir`, extension-aware `uniqueSlug`, single-kind id/filename maps with `brief`, `docId`, `listResearchDocs` over legacy + `docs/*.html` | 3 | `paths.ts` `studyDocsDir(slug, root)` → `research/<slug>/docs/`. `KIND_ID_PREFIX`/`KIND_FILENAME` cover `brief` (`brief-<slug>`, `brief.md`), `market`, `user-research`, `marketing`, `strategy` only. `docId(studySlug, docSlug)` → `doc-<study>-<doc>`. Listing order: single kinds, then legacy `concepts.html`, then `docs/*.html` by name; malformed file skipped with stderr warning. `uniqueSlug` (`core/features.ts`) stats the bare name, so it gains an optional extension to check `<slug>.html` (drift, see Open questions). |
| 1.3 | `createResearchDoc` doc branch and `prepareBody` HTML branch keyed on `doc` | 3 | `CreateResearchDocInput.docType?`; for `doc`: require `docType`, slug = `uniqueSlug(slugify(docType), studyDocsDir, ".html")` (second wireframes → `wireframes-2`), reject an id that already exists in any study via `readResearchDocById`, create `docs/` if needed, skip the single-kind "already exists — use write_research_doc" check. `prepareBody`: `sanitizeDesignBriefBody` + `DESIGN_BRIEF_MAX_BYTES` (5 MB) for every `doc`, error text "doc body". `writeResearchDoc` to legacy `concepts.html` persists `kind: doc`, `docType: wireframes` in place. |
| 1.4 | Steps, gates and summary: `docs` step, `brief` always open, `assertSameStudy` from listed doc ids, `StudySummary` `docType` | 3 | `ResearchStep`/`RESEARCH_STEPS` swap `concepts` → `docs`; `gateFor("docs")` needs market; `checkResearchStep` maps `doc` → `docs`, `brief` always open (not a gate, not a rail step, brief-less `nextStep` unchanged); `isDone("docs")` = ≥1 doc, flag = any doc outdated (reason lists them); `assertSameStudy(slug, studyDocs, dependsOn, basedOn)` allowed set = the study's listed doc ids; `StudySummary.docs[]` gains `docType?`, brief listed as kind `brief`. Arch `core-changes-in-research-ts`. |
| 1.5 | `manifest.ts` `docType` and `mcp.ts` `create_research_doc` `docType` input, kind enum, tool descriptions | 2 | `StudyManifestEntry.documents[]` gains optional `docType` (still rebuilt from frontmatter). Kind enum follows `RESEARCH_KIND`; update `create_research_doc` and `list_studies` descriptions; tool count unchanged, no new route/event/dependency (`board-server.ts` untouched). |
| 1.6 | `selftest-research`: brief, doc gate, multi-doc, `docType` rejections, `-2` slug, project-wide duplicate id | 3 | Brief created, `brief-<slug>` resolves, no gate, absent from `steps`; doc before market fails "needs market research first"; two presets + one custom in one study with distinct ids/files under `docs/`; doc without `docType` and `docType` on `market` both rejected; same type twice → `-2`; duplicate doc id across studies rejected. Arch `self-tests`. |
| 1.7 | `selftest-research`: legacy `concepts.html` fixture, rail `docs` done/flag, deck outdated after strategy write, existing findings/strategy/handoff with `concepts` → `doc` | 3 | Fixture with `kind: concepts` lists as `kind: doc`, `docType: wireframes`, id `concepts-<slug>`; user-research `dependsOn` on it validates; a write persists new frontmatter in place. Deck with `strategy-<slug>` in `basedOn` flagged after a strategy write. Existing assertions kept, renamed only. |
| 1.8 | `agents/researcher.md`: new `brief` job with the pinned heading list; every job adds `brief-<slug>` to `dependsOn`/`basedOn` when it exists | 2 | Headings exactly `## Idea`, `## Market`, `## Audience`, `## Goals`, `## Constraints`, `## Assumptions`, `## Open questions`; `dependsOn: []`; written from the Q/A block in its prompt; "decide for me" answers land under Assumptions; briefs carry no figures. |
| 1.9 | `agents/researcher.md`: `concepts` job becomes the `docs` job with per-type guidance and per-type `dependsOn` | 3 | wireframes = current concepts rules verbatim (labelled screens A, B, C…, six default, pricing screen from market prices, phone frames default / web frames for a web product, one caption line per screen); presentations/deck/one-pager: audience structure, figures only from upstream else `n/a (unsourced)`; all types inline CSS, no external scripts or fonts, 5 MB cap, mock the study's product (no `docs/DESIGN.md`). `dependsOn` per relevance table (only ids that exist). User-research `dependsOn` lists every wireframes Doc (`<doc-slug> A` when >1, plain `A` when 1); strategy lists market, every wireframes Doc, user-research, marketing. Shared deck style per study: reuse an existing presentation-type Doc's inline CSS palette, else style from the brief (Arch OQ1 recommendation). Job list + description updated. |
| 1.10 | `commands/specmanager-research.md`: `brief` and `docs` steps, `concepts` alias, the relevance table, Doc confirmation, loop pointer | 3 | `brief` step asks the five questions in the main session, then dispatches the `brief` job. `docs` step: `list_studies` → relevance filter (the table's single home) → `AskUserQuestion` multiSelect with "update existing <doc>" options (legacy `concepts-<slug>` offered first; updating preferred over a second wireframes) and "Other" = custom → one `docs` job per confirmed Doc, different types in parallel in one message, same type sequential → report id, version, path. Sentence "No Doc is drafted without the user confirming" (INV-65). Replace "No loop support in v1" with a pointer to `/specmanager-research-loop`. Keep INV-61/62 lines. |
| 1.11 | New `commands/specmanager-research-loop.md` part 1: parse, opening turn, study resolution, opening questions, brief → market → docs → user-research plan → marketing plan, per-step check | 3 | Main session; mirrors `commands/specmanager-loop.md` with no `set_status`. Opening turn "before any write" states order, approves nothing, stops before findings. Existing study by id/slug: reuse docs and skip their step (*recommended*) or rewrite in place; new: `create_study` after round 1. ≤2 rounds × ≤4 questions, recommended first, "decide for me" → Assumptions; round 2 also asks which Docs to make (relevance-filtered multiSelect, owner decision — drafting never pauses); brief block = Original idea + Q/A + Assumptions. Market = three parallel section jobs + `market-merge`, each naming `brief-<slug>`. Docs step drafts the Docs confirmed in round 2; the relevance table is read from the `/specmanager-research` docs section (no copy, no new snippet). Per-step `list_studies` check, R=2 transient retry on 529/Overloaded with landed-doc check first, progress line per step. Arch `research-loop-command` steps 1–9. |
| 1.12 | `commands/specmanager-research-loop.md` part 2: single-pass cross-doc review, end questions, final report, failure stop, Don't list | 2 | Review reads every doc (`read_research_doc`; HTML via `Read` on `filePath` in offset/limit chunks) for brief contradictions, missing `brief-<slug>` in `dependsOn`, screen letters vs wireframes, sourced figures or `n/a (unsourced)`, pinned headings, drift from the Original idea; clear-cut fixes via `write_research_doc({ id, body, baseVersion, basedOn })`, HTML textual edits only, conflicts → end questions, no re-review. End questions batched ≤4, one final update per affected doc, skipped → brief `## Open questions`. Report: study id/slug, each doc id/version/path, fixes, answered vs open, nothing approved, next step (interviews → `notes/` → `/specmanager-research <slug> findings`). Failure stop names last drafted step, failed step, reason verbatim, resume command. Don't approve, draft inline, dispatch builder/findings/strategy/handoff, or invent numbers. Arch steps 10–13. |
| 1.13 | `selftest-prompts` Part H: INV-56b retarget, INV-56f, INV-57a/b re-pin, INV-64a–g, INV-65 | 3 | INV-56b `what` → docs job's wireframes bullets (pattern unchanged); INV-56f brief heading list in order; INV-57a/b counts re-pinned for `agents/researcher.md` + `commands/specmanager-research.md` (file lists unchanged); INV-64a `Don't approve` 1–1, b no `set_status(`, c no `subagent_type: "builder"`, d "main session", e "before any write", f "single pass", g `n/a (unsourced)` / "never invent" in the loop file; INV-65 confirmation sentence min = max = 2. INV-25 list and INV-61/62 unchanged; no new snippet. Arch `prompt-invariants`. |
| 1.14 | `ui/src/types.ts` mirror and `panelParts.tsx` comment | 1 | `ResearchKind` (brief, doc), `ResearchStep` (`docs` replaces `concepts`), `docType?` on `StudyDocCard`/`ResearchDocFull`; comment "concepts canvas" → "research Docs". |
| 1.15 | `ResearchBoard.tsx` Docs column: stacked doc cards, `docTypeLabel`, add row, cell states A–E | 3 | Design Screens 1–2. `COLUMNS` `{ kind: "doc", label: "Docs" }`; every `doc` as a `.doc-card` in `.doc-stack` (type label head + vN, one-line title, no `html` badge in the column, per-card ⚠ outdated with `card--stale`, id in tooltip), opts out of the 5.5rem cap; listResearchDocs order; `.doc-add` copies `/specmanager-research <slug> docs` when ≥1 Doc and step open; `LockedCell` (A), `card--ready` "Draft docs" (B), dashed `… docs` (C); `docTypeLabel` maps presets, custom shows `custom` prefix + verbatim string (ellipsis, full tooltip); `kindLabel` covers `brief`. Click opens drawer. |
| 1.16 | Brief chip in `StudyLabel` and `stepCommand` kind → step map | 2 | Design Screen 1 brief chip: `Brief vN` opens the brief in `ResearchDocPanel`; no brief → dashed `no brief · … brief`, copies `/specmanager-research <slug> brief`, never red. Rail stays seven segments. `stepCommand` map: `doc` → `docs`, `brief` → `brief`, `user-research` → `plan`. |
| 1.17 | `ResearchDocPanel.tsx`: `isHtml` branch, per-type crumb/meta, `.badge--doctype`, Read-only button, brief header and footer hint | 3 | Design Screens 2–4. `isConcepts` → `isHtml` (`kind === "doc"`), `HtmlPreview` read-only; crumb `<study> › <doc-type label>` (custom capitalised), meta `<label> · vN` or `Custom · vN`; badges research, `.badge--doctype`, `html`, outdated, id, generatedBy; button "Read-only" (disabled) replaces "Saved"; outdated block via `panel__stale`/`stale-list` with docs command; footer path (`docs/<doc-slug>.html` or `concepts.html`) + "sandboxed · scripts off". Brief: crumb `<study> › Brief`, meta `Brief · vN`, Milkdown edit + Save + 409 banner (existing), static footer hint "saving marks docs that read the brief as outdated". |
| 1.18 | `EmptyResearch.tsx` empty state led by the research loop | 2 | Design Screen 5. `STEPS` uses `docs`; loop-covered steps get a faint `--primary` fill and a `.steps-bracket` "covered by /specmanager-research-loop · brief first"; primary `.cmd--loop` `/specmanager-research-loop "<idea>"` with caption (asks first · brief → market → docs → plan → marketing · one review · asks again · approves nothing); `/specmanager-research "<idea>" new` as dim secondary; idea hint about the brief; "then run /specmanager-research-loop <slug>". Form unchanged. |
| 1.19 | `styles.css` desktop styles for Docs column, doc cards, brief chip, doc-type badge, loop command and bracket | 2 | New classes `.doc-stack` (6px gap), `.doc-card` (2px `--secondary` spine, `--error` when outdated), `.doc-card__type` (mono uppercase 0.6rem `--secondary`), `.doc-add`, `.chip-brief` (matches `.chip-origin`), `.badge--doctype`, `.grid__header--docs` (`--secondary`), `.steps-bracket`, `.cmd--loop`; `.grid--research` `--grid-cols` with Docs `minmax(11.5rem, 1.35fr)` vs `minmax(8.5rem, 1fr)`. Existing tokens + `color-mix` only, no new tokens. |
| 1.20 | `styles.css` tablet overrides (640–1024px) for the Docs column | 2 | Design Screen 6. Docs track `minmax(9rem, 1.3fr)` vs `minmax(7rem, 1fr)`; add row shortens to `+ add`; `.study__idea` and `.study__next` hidden under 1024px, brief chip kept; mobile uses existing linearisation. |
| 1.21 | Repo `CLAUDE.md`: Layout line for `specmanager-research-loop.md` and the `core/research.ts` note on brief + multi-doc Docs | 1 | The command runs in the main session; note sentence on the `brief` kind and `doc` kind with `docType`, legacy `concepts.html` read as wireframes. Stage only this task's hunks (managed block left alone). |
| 1.22 | Release prep: bump `plugin.json` 1.4.0 → 1.5.0, rebuild `server/dist` + `ui/dist`, run `selftest-directory` and `claude plugin validate` | 2 | Per repo CLAUDE.md Releasing steps 1–4; no packaging change, so no surface test. Never push. |
| 1.23 | Managed CLAUDE.md Commands line lists the research commands | 1 | Owner decision (end questions): `renderBlock` in `core/claude-md.ts` appends `/specmanager-research` · `/specmanager-research-loop` to the `**Commands:**` line; update any `selftest` assertion on that line. Lands before 1.22. |
| 1.24 | Plugin README: Researcher mode and research command rows | 1 | Owner decision: `plugins/specmanager/README.md` gains a short Researcher mode paragraph (studies, brief, Docs, loop, handoff; local only, no model calls from the plugin) and rows for `/specmanager-research` and `/specmanager-research-loop`; keep `selftest-directory` green. Lands before 1.22. |

---

## Risk & sequencing notes

- **Core first (1.1–1.7).** The schema change (1.1) breaks every `concepts` reference at compile time; 1.2–1.5 must land before `npm run build` is green again, so the builder should treat 1.1–1.5 as one compile unit and only run self-tests after 1.5.
- **Legacy compatibility is the riskiest change.** Read-time normalisation keeps `concepts-<slug>` ids valid in existing `dependsOn`/`basedOn`; 1.7's fixture is the guard. Nothing moves on disk, so rollback is reverting the commits.
- **`uniqueSlug` drift (1.2).** The shared helper in `core/features.ts` checks the bare name; adding an optional extension must leave feature/study callers unchanged.
- **Prompts before the invariant net (1.8–1.12 → 1.13).** INV-57a/b pins depend on final line counts in the agent and command, so 1.13 goes last in the prompt block. INV-25's list and the `specmanager-build.md` pins are untouched.
- **UI after core types (1.14 → 1.15–1.20).** 1.15–1.18 add class names that 1.19–1.20 style; the board is unusable for the UI check until 1.19 lands.
- **Release last (1.22, after 1.23–1.24).** Rebuilt `dist/` must be committed after all source changes; the owner's open-and-save of a doc in the board (required because `ui/` changes) happens at walkthrough, not as a task.

## Test strategy

- **Self-tests (hand-rolled, `server/dist`):** `selftest-research` gains the cases in 1.6–1.7; `selftest-prompts` gains INV-56f, INV-64a–g, INV-65 and re-pins INV-56b/57a/57b in 1.13. `selftest`, `smoke-mcp` and `selftest-directory` run unchanged as regression checks; `selftest-board` needs no change (routes unchanged) and is run by hand because it can time out right after a build.
- **UI:** `npm run build` (tsc + vite) type-checks the mirror; the reviewer drives the UI check against design Screens 1–6.
- **Loop command:** no automated run (model-driven); `selftest-prompts` pins its load-bearing sentences, and the walkthrough records a dry run in a scratch project.

## Human prerequisites

None.

## Out of scope

- Findings, strategy and handoff inside the loop; any change to Builder mode, `/specmanager-loop`, Builder gates, INV-25's list or `agents/prd-writer.md`.
- Approval or stale states for research docs; editing Docs in the board; non-HTML Doc formats (.pptx, .pdf, .docx).
- A migration action or file moves for `concepts.html`; backfilling briefs for existing studies.
- New MCP tools, REST routes, events, runtime dependencies, a new agent, a new shared snippet, or model/API calls from the plugin.
- A "loop running" indicator on the board, a "+N more" collapse, a "read by N docs" count on the brief, and pushing or merging the branch.

## Open questions

Loop-mode decisions (applied without asking; alternative recorded):

1. **Phase split:** single phase (53 points < ≈100, no spike trigger). Alternative not taken: a core+prompts phase, then a UI phase.
2. **Spike:** none; every Architecture open question changes prompt text or copy only. Alternative: a spike on deck styling (Arch OQ1).
3. **Human setup / test account:** none needed; the board is local with no auth. Alternative: a reviewer test-account prerequisite.
4. **Shared deck style — confirmed by owner:** 1.9 adopts the Architecture recommendation (reuse an existing presentation-type Doc's inline CSS, else style from the brief). Alternative: style each Doc independently.

Carried from upstream, still open:

5. **Managed CLAUDE.md commands line — resolved (owner): add both commands (1.23).**
6. **Plugin README — resolved (owner): updated in this release (1.24).**
7. **Doc-slug renames — accepted by owner:** slug fixed at first `docType` wording; renaming a custom type changes only the title.
8. **Loop Doc confirmation timing — resolved (owner): ask in the opening round (1.11).**
9. **Design planner questions — accepted by owner (2026-10-22), built as designed:** `--secondary` for Docs (vs `--primary`); widened Docs track (vs equal tracks and heavier truncation); no "+N more" collapse; `listResearchDocs` order (vs by type or recency, which needs a sort rule in core or UI); one outdated Doc flags the rail's docs segment; "Read-only" button copy; static brief footer hint (vs a count, which needs `dependsOn` on `StudyDocCard`); custom `docType` casing stored as typed (vs normalised by the docs step); no loop-progress indicator; idea/next lines hidden at tablet; iframe content colors outside the token system; `docs/DESIGN.md` thin, values from `ui/src/tokens.css`.

Repo drift:

10. **`uniqueSlug` has no extension check:** `core/features.ts` `uniqueSlug(base, parentDir)` stats `parentDir/<slug>`, so checking `docs/<slug>.html` needs an extension parameter (folded into 1.2). The Architecture says "checked against the `.html` name" without naming the change.
11. **Architecture says "No design doc exists"** in `board-docs-column-and-brief`; `design-research-loop-and-docs-010` now exists and is approved, and the UI tasks follow it.
12. `commands/specmanager-research-loop.md` and INV-64/INV-65 do not exist yet (expected); every other path the Architecture names exists.

## Notes on estimates

Points are relative complexity, not hours; calibrate after the first phase. Every task is ≤3, and splits such as the two self-test tasks or the two loop-command halves are granularity only. Self-tests, prompt invariants and the CLAUDE.md / release steps are their own tasks so "installable and testable" stays a real gate rather than an afterthought.
