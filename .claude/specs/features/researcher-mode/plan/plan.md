---
id: plan-researcher-mode-025
featureId: feat-researcher-mode
stage: plan
status: approved
stale: false
title: Researcher mode plan
dependsOn:
  - arch-researcher-mode-031
  - design-researcher-mode-009
basedOn:
  arch-researcher-mode-031: 4
  design-researcher-mode-009: 2
generatedBy: agent
version: 3
createdAt: '2026-10-21T13:06:40.747Z'
updatedAt: '2026-10-21T13:16:44.644Z'
---
## Overview

Researcher mode adds research **studies** beside features: core storage under `.claude/specs/research/<slug>/`, gates and computed flags in a new `core/research.ts`, six MCP tools, a `researcher` agent and `/specmanager-research` command, a prd-writer origin step, and a Builder | Researcher board toggle with a Researcher grid, handoff cell, research drawer and origin chip, as specified in `arch-researcher-mode-031` v1 and `design-researcher-mode-009` v1 (screens 1–7), laddering to `prd-researcher-mode-046` v1 goals G1–G7. **One phase.** Neither split trigger applies: the decomposed total is 62 points (under the ≈100 soft size threshold), and the Architecture's open questions are resolved by recorded decisions below, so no unknown changes *what* tasks exist (no spike). The Architecture's three-phase cut (Core + MCP · Agent + command · Board) and the PRD's "phased plan expected" are kept as the **task order** inside the phase, not as phases; the alternative not taken is under Open questions.

**Scale:** `1` trivial · `2` small · `3` moderate · `5` substantial · `8` large · `13`/`21` epic.

*Every task below is decomposed to ≤3 points; the work was sized at that granularity from the start, so no subtotal changed by splitting.*

| Phase | Theme | Points |
|---|---|---|
| research | Researcher mode end to end | 62 |
| **Total** | | **62** |

---

## Phase research — Researcher mode end to end

**Exit test:** from the repo root, `cd plugins/specmanager/server && npm run build && npm run selftest-research && npm run selftest-board && npm run selftest-prompts && npm run smoke-mcp && npm run selftest && cd ../ui && npm run build` passes (two independent studies, gates, `outdated`, `newNotes`, build-list parse, idempotent handoff, Builder-only manifest unchanged, new REST routes, new prompt invariants, six tools registered, no Builder regression); then in the board the toggle switches to Researcher, a study started from the empty-state form appears as a row, and a handed-off item shows its origin chip in Builder. *(End-to-end on the real oposiciones study is the walkthrough's stakeholder test, not a task.)*
**UI check:** web — run `/specmanager-board` (or `board_url`) in a Claude session on this repo, open the URL with `#researcher`; for UI iteration `cd plugins/specmanager/ui && npm run dev` (Vite proxies the board API).

| # | Task | Pts | Notes |
|---|---|---|---|
| 1.1 | Add research types and paths | 2 | `core/types.ts`: `RESEARCH_KIND`, `StudySchema`, `ResearchDocFrontmatterSchema` (no `status`/`stale`; `findings?` only valid on `user-research`), `FeatureOriginSchema` (incl. `itemId`), optional `origin` on `FeatureSchema` (no migration). `core/paths.ts`: `researchDir`, `studyDir`, `studyNotesDir`. Arch §study-storage-and-schema. |
| 1.2 | Let readDoc/writeDoc take a Zod schema | 1 | `core/frontmatter.ts` optional schema param, default `DocFrontmatterSchema`; Builder callers unchanged. |
| 1.3 | Study CRUD in core/research.ts | 2 | `createStudy` (`study.json`, `notes/`; no `.gitignore` — notes are tracked, masked on ingest), `listStudies`, `readStudy`; id `study-<slug>`, `slugify` + `-2` suffix in `research/` (generalise the module-private `uniqueSlug` in `features.ts` to take a dir, don't copy it); malformed `study.json` skipped with stderr warning. Emits `study.created`. |
| 1.4 | Research doc CRUD in core/research.ts | 3 | `createResearchDoc` / `writeResearchDoc` / `readResearchDocById` / `listResearchDocs`; deterministic ids `market-`/`concepts-`/`ur-`/`mktg-`/`strategy-<slug>` and filenames per Arch tree; duplicate kind fails with "use write_research_doc"; cross-study `dependsOn`/`basedOn` rejected; `findings` rejected off `user-research`; `concepts` through `sanitizeDesignBriefBody` + `DESIGN_BRIEF_MAX_BYTES` (5 MB); optimistic concurrency via `baseVersion`; malformed docs skipped. Emits `research.created` / `research.updated`. |
| 1.5 | Gates and computed flags | 3 | `checkResearchStep` (concepts/user-research/marketing need market; strategy needs user-research with `findings.length > 0`; handoff needs strategy + non-empty build list, reason "no build items"), `outdatedUpstreams`, `newNotes` (`.md`/`.txt`/`.pdf` in `notes/` not in `findings`), `nextResearchStep` (market → concepts → user-research → marketing → findings → strategy → handoff; findings again on new notes), plus a per-step `steps[]` (done/next/flag/locked + reason) so the step rail and `nextResearchStep` cannot disagree. Arch §ordering-gates-and-computed-flags. |
| 1.6 | parseBuildList, feature origin and handoff | 3 | `parseBuildList` via `indexHeadings` anchor `what-to-build` → `{ rank, itemId, title, rationale }[]` from `1. [S<n>] **<title>** — …` lines (bold text, else text before ` — `; lines without an `S<n>` id are not items); `createFeature(title, root, { origin })` with `origin.itemId`; `handoffStudyItems({ studyId, itemIds })` idempotent per `(origin.studyId, origin.itemId)` returning `{ created, skipped }`. Arch §handoff-to-builder. |
| 1.7 | Events, manifest studies and re-export | 2 | `SpecEvent` adds `study.created`, `research.created`, `research.updated`; `manifest.json#studies[]` emitted only when a study exists (Builder-only manifest byte-identical) and rebuilt from frontmatter; optional `origin` on feature entries; `core/index.ts` re-exports `research.js`. |
| 1.8 | Research studies line in managed CLAUDE.md block | 1 | `renderBlock` adds one links-only "Research studies" line inside the markers only when studies exist (PRD Q9). |
| 1.9 | Register the six research MCP tools | 3 | `create_study`, `list_studies` (docs with id/kind/version/`outdated[]`, `newNotes[]`, `nextStep`, `steps[]`, `buildList[]`, `handedOff[]`), `read_research_doc`, `create_research_doc`, `write_research_doc`, `handoff_study_items`; `ok`/`fail` + `writeManifest` after each write; CLAUDE.md auto-sync also schedules on `study.created` / `research.created`; add names to `smoke-mcp.ts` `expected`. No `check_research_step` tool: the gate is exposed on `list_studies` and enforced by `create_research_doc` / handoff. |
| 1.10 | Write selftest-research | 3 | Hand-rolled like `selftest-repos.ts`, tmp root; npm script `selftest-research`. Covers two independent studies (multi-study metric), each gate's reason, `outdated`, `newNotes`, `steps[]`, build-list parse incl. empty list and lines without an `S<n>` id, idempotent handoff by `itemId` (survives rename/re-rank) + `origin`, cross-study rejection, duplicate kind, 409-style version conflict, Builder-only manifest unchanged. |
| 1.11 | Draft agents/researcher.md: market and concepts jobs | 3 | `model: inherit`, no `tools:` allowlist (inherits WebSearch/WebFetch); market headings per Arch §research-doc-shapes, `n/a (unsourced)` + one-line `Unsourced draft` notice when no web search, never invent numbers; concepts: labelled screens A… incl. pricing, phone frames default (desktop when web product), six default, not grounded in `docs/DESIGN.md`, images by path if over cap; lossless-carryover snippet; "Don't approve". Market drafting is split into parallel section jobs plus a merge job (1.28). |
| 1.12 | Add user-research, marketing, findings and strategy jobs to researcher.md | 3 | Exact heading lists; findings reads `newNotes`, first masks personal data in each note file in place (names → participant code; emails, phones, addresses → `[redacted]`), then writes via `write_research_doc` with `findings: [...previous, ...ingested]`, `missing` for absent scores, every participant listed, participants only by code (`P1`…), unreadable files reported and left out; strategy revises market/marketing in place first (resolves `## To revisit after research`), `## What to build` as `1. [S<n>] **<Item title>** — <rationale, marketing tie-in>` (keep existing `S<n>` ids on re-synthesis, next unused number for new items, never reuse), `basedOn` = current versions, sources cite ids + versions; `dependsOn` table per Arch. |
| 1.13 | Write commands/specmanager-research.md | 3 | `argument-hint: "<study> [new\|market\|concepts\|plan\|marketing\|findings\|strategy\|handoff]"` (`plan` = kind `user-research`); resolve via `list_studies`, offer `new` → `create_study`; no step → `nextStep`; gate read from `list_studies` (closed → report reason + missing step); pasted notes saved already masked as `notes/<yyyy-mm-dd>-<participant-code>.md` with `Write`; skipped formats (audio) reported by name; dispatch `researcher` (for `market`: three section jobs — size, competitors, revenue — in parallel, then one merge job, 1.28); handoff shows build list, asks which items (`S<n>`), calls `handoff_study_items`; "Don't approve"; never dispatches the builder; no loop support in v1. |
| 1.14 | Add origin grounding step to prd-writer | 1 | After step 2 in `agents/prd-writer.md`: if the feature has `origin`, `read_research_doc` the strategy and its `dependsOn` docs, ground and cite by id, not in `dependsOn`/`basedOn` (handoff fidelity metric). Must not shift counts of patterns already pinned on `prd-writer.md` (4 invariants). |
| 1.15 | Make researcher.md the fifth lossless-carryover carrier | 1 | `docs/agent-snippets/lossless-carryover.md` names five carriers; INV-13 and INV-29 file lists and min/max go 4 → 5; same commit as 1.11's copy. |
| 1.16 | Add research prompt invariants to selftest-prompts | 3 | New rows (min/max pinned): researcher-shapes (every heading list), no-invented-numbers (`never invent`, `missing`, `n/a (unsourced)` in agent + command), participant-codes + mask-before-ingest, "Don't approve" in `agents/researcher.md` and `commands/specmanager-research.md` (new rows; INV-25's list unchanged), no builder dispatch in the command, prd-writer origin grounding + "not in dependsOn". `commands/specmanager-build.md` is not edited (already at INV-4/INV-2 max). |
| 1.17 | Add research REST routes to board-server | 2 | `GET`/`POST /api/studies`, `GET`/`PUT /api/research/:id` (`{ body, title?, baseVersion }`, `generatedBy: "human"`), `POST /api/studies/:id/handoff` `{ itemIds }`; same core calls/events as MCP; 409 conflict / 404 not found / 400 otherwise. Watcher already covers `research/`. |
| 1.18 | Cover research routes in selftest-board | 2 | Create study over REST, read/save doc incl. 409, handoff created/skipped, WS event on `notes/` file drop. |
| 1.19 | Add study and research UI types and fetchers | 1 | `ui/src/types.ts`, `ui/src/api.ts` mirroring the `list_studies` payload (incl. `steps[]`). |
| 1.20 | Add the Builder / Researcher toggle | 2 | Design screen 1: two-segment `.mode-toggle` in `board__header` between title and `board__meta`; `role="tablist"`/`tab`, `aria-selected`, Left/Right arrows, 2px `--primary` focus ring; hash `#builder`/`#researcher` mirrored to `localStorage["specmanager.mode"]` in try/catch, fallback Builder; `board__meta` shows active mode's count only; no counts or dots on segments. |
| 1.21 | Build the ResearchBoard grid | 3 | Design screen 2: reuse `grid`/`row__label`/`row__cell`, 5.5rem cap; columns Market research · Concepts · User research · Marketing plan · Strategy · Handoff (Handoff in Build's reserved track); study label with idea (two-line clamp), `.study-rail` from `steps[]` (done `--primary`, next hollow, flag `--error`), `.study__next` copy-on-click command; doc cards with `vN`, no status badge, `html` `.badge--kind`, `.badge--outdated` (aliases `.badge--stale`), amber `--tertiary` `.badge--notes`, neutral `0 findings`; only next-step cell `card--ready`, other open cells dashed with dim command, locked cells `card--locked` with gate reason; existing breakpoints, Handoff wraps at tablet; WS reload refetches `/api/studies` in Researcher mode. |
| 1.22 | Build the handoff cell | 3 | Design screen 5: ranked build list with `S<n>` ids, checkboxes keyed by `itemId`, checked tint `--tb-active-bg`, `Create N features` (`btn--primary`, disabled at zero, no confirm); result strip (`banner--ok` look, "Open in Builder" → `#builder`), handed-off rows show success dot + slug linking to the PRD cell, next-command footer `/specmanager-prd <first slug>`; neutral skipped strip; locked (`card--locked` reason) and "no build items" (error dashed, names `## What to build`) states; strip is client state cleared on reload; cell opts out of the card cap. |
| 1.23 | Build the Researcher empty state and start-study form | 2 | Design screen 7: two-pane `.empty-research`; explanation, starting rail, copyable `.cmd`; form (Study name, Idea or market, client-side slug preview, server `uniqueSlug` wins), submit disabled until both filled, posts `POST /api/studies`, 400 → inline `--error` line; market research never started from the board. |
| 1.24 | Open research docs in DocPanel | 3 | Design screens 3–4: `source: "feature" \| "research"`; crumb `<study> › <kind label>`, meta `<kind label> · vN`, ghost `research` badge (`.badge--interview` style), id, `generatedBy`, `N new notes` + `N notes ingested` on user-research, `N features handed off` on strategy; Save + close only (no Approve/Reopen/Gate), `PUT /api/research/:id` with existing 409 banner; new-notes `banner--warn` listing files + findings command, noting they stay unmasked (don't commit) until findings runs; outdated block reusing `panel__stale`/`stale-list` ("behind its sources", `drift` tag, synthesis command); `concepts` read-only in the sandboxed iframe; `.prose td.miss` for `missing`. |
| 1.25 | Show the origin chip on Builder rows | 2 | Design screen 6: `.chip-origin` (sibling of `.chip-interview`) `from <study> · #rank`; "strategy updated · vA→vB" variant (`--error`, filled ring) when strategy version > `origin.strategyVersion`; tooltip (study, rank, strategy id, version); click opens the strategy in `DocPanel source="research"` without leaving Builder. Builder fetches `/api/studies` only when any feature has `origin`; `/api/board` unchanged. |
| 1.26 | Update repo CLAUDE.md for researcher mode | 1 | Self-test count 15 → 16 and list (`selftest-research`), Layout lines for `commands/specmanager-research.md` and `agents/researcher.md`, `core/research.ts` note. |
| 1.27 | Bump minor version and rebuild dists | 2 | `plugin.json` minor bump; `npm ci && npm run build` in `server/` and `ui/`, commit both `dist/`; `npm run selftest-directory` and `claude plugin validate plugins/specmanager` pass. No packaging change ⇒ no surface test; `ui/` changed ⇒ owner opens and saves a doc in the board at release. |
| 1.28 | Parallel market section jobs and merge job in researcher.md | 2 | Owner decision (end questions): `market` splits into three section jobs (`market-size`, `market-competitors`, `market-revenue`) that return their headings as text and never write, plus a `market-merge` job that dedupes sources, keeps the exact market headings and calls `create_research_doc` once; unsourced/never-invent rules apply to every job. Lands before 1.16 so its invariants cover the jobs; 1.27 runs after it. |

---

## Risk & sequencing notes

- **Order:** core (1.1–1.10) → prompts (1.11–1.16) → board (1.17–1.25) → docs/release (1.26–1.27). Core first because MCP tools, the command and the UI all consume `list_studies`; 1.5's `steps[]` must land before 1.21.
- **Builder regression** is the main risk: 1.2 (frontmatter schema param), 1.6 (`createFeature` signature), 1.7 (manifest) and 1.25 touch shared paths. Optional params + "emit `studies` only when present" keep Builder byte-identical; 1.10 asserts it and `selftest` / `selftest-board` stay in the phase test command.
- **selftest-prompts pins:** most entries pin exact min/max. 1.11 + 1.15 must land together (INV-13/INV-29 move 4 → 5 in one commit with the snippet). 1.14 adds a line to `prd-writer.md`, which already carries 4 pinned invariants: re-run `selftest-prompts` after it. `commands/specmanager-build.md` (at INV-4 and INV-2 max) and `specmanager-loop.md` are not edited.
- **Snippet parity:** `docs/agent-snippets/lossless-carryover.md` and all five carriers change in the same commit.
- **Rollback:** new code is additive (new dir, new module, new files); the only data-shape change is optional `origin` on `feature.json`, which older code ignores via Zod. Handed-off features are ordinary feature folders, revertible with git.
- **dist/** is committed and ships: 1.27 rebuilds both; a builder that edits `server/src` or `ui/src` earlier should still rebuild locally to run tests.

## Test strategy

- **Core:** `selftest-research` (1.10), hand-rolled in `server/src/selftest-research.ts`, npm script, tmp root — the project's self-test convention (no test runner).
- **MCP wire:** `smoke-mcp` expects the six new tool names (1.9).
- **REST + WS:** `selftest-board` extended (1.18).
- **Prompts:** `selftest-prompts` new invariants and INV-13/INV-29 at 5 carriers (1.15–1.16).
- **UI:** `ui` `npm run build` (tsc + vite) type-checks; the reviewer drives the UI check; no UI test runner exists in the repo.
- **Regression:** `selftest` stays in the phase command; the release (1.27) adds `selftest-directory` and `claude plugin validate`.

## Human prerequisites

None. The board is local with no auth (no test account); the build needs no account, credential or access. (At release the owner opens and saves a doc in the board — a release-check from `CLAUDE.md`, not a build prerequisite.)

## Open questions

Loop-mode decisions (recorded, alternative not taken) — **accepted by the owner on 2026-10-21**, except 3, which the owner changed:

1. **Phase split — resolved (owner, 2026-10-21): keep one phase.** One phase (60 pts, no trigger). *Alternative:* the Architecture's three phases (Core + MCP · Agent + command · Board) per PRD "phased plan expected"; kept as task order instead.
2. **No spike:** Architecture open questions are resolved by the decisions here. *Alternative:* a spike on parallel market sub-agents.
3. **Market drafting — changed by owner:** three parallel section jobs plus a merge job (1.28).
4. **Step-rail data (design OQ):** server returns `steps[]` from `list_studies`. *Alternative:* derive client-side from docs/`outdated[]`/`newNotes[]`/`nextStep`/`handedOff[]`.
5. **"Strategy updated" data (design OQ):** UI fetches `/api/studies` in Builder mode when a feature has `origin`; `/api/board` unchanged. *Alternative:* join study data into `/api/board`.
6. **Origin chip click (design OQ):** opens `DocPanel source="research"` from Builder mode. *Alternative:* link to `#researcher`.
7. **Handoff from the drawer (design OQ):** grid cell only in v1. *Alternative:* a "Hand off items…" footer action.
8. **Unsourced badge (design OQ):** not in v1 (needs a computed `list_studies` field the Architecture lacks). *Alternative:* add it.
9. **Gate-open, not-next cells (design OQ):** neutral with dim command, as designed. *Alternative:* equally loud cells.
10. **Responsive (design OQ):** follow existing `styles.css` breakpoints, Handoff wraps at tablet; step rail kept on mobile. *Alternative:* collapse the rail to its caption on mobile.
11. **Toggle activity dot (design OQ):** none. *Alternative:* a dot on the inactive segment for new activity.
12. **Result strip lifetime (design OQ):** cleared on reload. *Alternative:* persist until dismissed.
13. **`.badge--outdated` (design OQ):** alias `.badge--stale` styles. *Alternative:* a duplicate rule.
14. **Amber for "new notes" (design OQ):** keep `--tertiary`. *Alternative:* `--secondary`, since `--tertiary` means draft/in-progress in Builder.
15. **Toggle hash:** `#builder` / `#researcher` per design (Arch named only `#researcher`).

Still open for the owner (carried from upstream):

16. **Notes in git — resolved (owner):** tracked in git; the findings step masks personal data in place before ingest and pasted notes are saved masked (1.12, 1.13). Dropped-but-not-ingested files are unmasked; the new-notes banner says so (1.24).
17. **Loop for studies — resolved (owner): not in v1.** not in v1; a step-less command walks the study and stops at findings. Later auto-run of market → marketing?
18. **Marketing phase overlap — resolved (owner): ignored entirely; no link between the two features.** `prd-marketing-phase-035` (plan draft, stale); handed-off features inherit no Market & demand section; reconcile before Marketing phase builds?
19. **Lifecycle — resolved (owner):** no approval on research docs; the prd-writer (or loop) reads the strategy and research as they are at that moment.
20. **Item rename — resolved (owner):** stable `S<n>` item ids; handoff is idempotent on `itemId` (1.6, 1.12).
21. **DESIGN.md drift (design OQ):** `docs/DESIGN.md` stores `var(--…)` refs and one type role; `tokens.css` `--radius-lg` is 16px vs DESIGN.md 12px. Out of scope; a `sync_design_md` after ship should harvest real values.

Repo/spec drift found:

22. Arch §researcher-agent-and-command step 3 names a `check_research_step` tool that does not exist; the plan exposes the gate on `list_studies` and enforces it in `create_research_doc` / handoff (1.9, 1.13).
23. Arch §summary and OQ7 say no design doc exists; `design-researcher-mode-009` v1 now exists and the UI tasks follow it (OQ7 resolved).
24. `uniqueSlug` is module-private in `core/features.ts`; 1.3 generalises it rather than copying.
25. Repo `CLAUDE.md` lists 15 self-tests; becomes 16 (1.26).

## Out of scope

- Any Builder lifecycle change (gates, staleness, columns, commands) beyond the origin chip and prd-writer step.
- A board form for interview data; audio intake (transcripts only); automatic PII redaction.
- Running research from the plugin (no web/model/API calls — README and data-handling answers stay as they are).
- Recruiting, scheduling, survey/fake-door hosting, analytics.
- `/specmanager-loop` support for studies; approve/stale states for research docs.
- Market & demand inheritance into handed-off PRDs (Marketing phase).
- A stakeholder end-to-end run on the oposiciones study (walkthrough's job); oposiciones content itself.
- Editing concepts in the board; handoff from the drawer; unsourced badge.

## Notes on estimates

Points are relative complexity, not hours; recalibrate velocity after the first phase is built. The board and prompt work are each roughly the size of the core, which is why the 62-point total is honest as one increment: the prompt tasks are small text edits but tightly pinned by `selftest-prompts`, and the 3-point UI tasks each map to one design screen. Tests (1.10, 1.16, 1.18) and docs/release (1.26–1.27) are their own tasks so "installable and testable" stays a real gate.
