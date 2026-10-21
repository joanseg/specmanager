---
id: plan-marketing-phase-019
featureId: feat-marketing-phase
stage: plan
status: draft
stale: true
title: Marketing phase plan
dependsOn:
  - arch-marketing-phase-025
  - design-marketing-phase-008
basedOn:
  arch-marketing-phase-025: 1
  design-marketing-phase-008: 1
generatedBy: agent
version: 1
createdAt: '2026-09-29T11:58:40.988Z'
updatedAt: '2026-09-29T21:01:42.377Z'
---
## Overview

Implements `arch-marketing-phase-025` v1 (for PRD `prd-marketing-phase-035` v2, screens from `design-marketing-phase-008` v1) in **two phases**. Phase `keywords` ships the read-only `check_keyword_demand` MCP tool (R6–R10) and the standalone `/specmanager:specmanager-keywords` command (R11). Phase `stage` then adds the optional Marketing stage: core, gate, UI column, and the `marketing-writer` agent that calls the tool (R1–R5).

**Why split here:** after `keywords` there is a real, testable stop point. The user can run `/specmanager-keywords` against their own Google Ads account and check the live v25 numbers, region/language resolution, the `unavailable` path, and the Q4 install behaviour, all before an agent is built that embeds those numbers in docs. This stage carries the highest external risk (credentials, developer-token access level, API shape). `stage` depends on it, not the other way round.

**Scale:** `1` trivial · `2` small · `3` moderate · `5` substantial · `8` large · `13`/`21` epic.

*Every task below is decomposed to **≤3 points**. The work split naturally at that size (R7/R8/R10 are already separate modules), so no phase subtotal changes.*

| Phase | Theme | Points |
|---|---|---|
| keywords | Keyword demand tool + `/specmanager-keywords` | 25 |
| stage | Optional Marketing stage + `marketing-writer` | 27 |
| **Total** | | **52** |

---

## Phase keywords — Keyword demand tool + /specmanager-keywords

**Exit test:** `cd plugins/specmanager/server && npm run build && npm run selftest-keywords && npm run smoke-mcp` passes and `claude plugin validate plugins/specmanager` is clean. After reinstalling:
- With no credentials, `/specmanager:specmanager-keywords "spec driven development" --region ES` prints the Design Screen 4 Case B output.
- With credentials, `--region Spain` prints the Case A table.
- Omitting `--region` gives Case D and makes no tool call.

*(The live-data leg needs the user's own Basic/Standard developer token. Without one, only the `unavailable` path can be demoed.)*

| # | Task | Pts | Notes |
|---|---|---|---|
| 1.1 | `core/trend.ts`: `computeTrend` + `TREND_RULE`/`TREND_THRESHOLD` | 2 | R9 exact rule. Pure, no I/O. Four verdicts. `pctChange` is one decimal, `null` for from-zero and for insufficient data. |
| 1.2 | `selftest-keywords.ts` trend table (a) + `selftest-keywords` script in `package.json` | 2 | R12 (a) cases: ±25%, +10%, exactly ±20%, 0→0, 0→N, null edge quarter, <12 months, unsorted input. Validate with `npm run selftest-keywords`. |
| 1.3 | `core/google-ads.ts`: `googleAdsConfigFromEnv`, `GoogleAdsError`, `getAccessToken`, `adsPost` | 3 | R7. Plain `fetch`, no SDK. `GOOGLE_ADS_API_VERSION="v25"`. Values that are empty or start with `${` count as missing (R6). Strip `-` from customer ids. Set `login-customer-id` only when configured. `AbortSignal.timeout(20_000)`, no retries, no token cache. Parse the error envelope and read `request-id` from the response header. |
| 1.4 | `core/keywords.ts`: region + language resolution | 3 | R8. ISO-2 goes through GAQL `geo_target_constant`; a name goes through `geoTargetConstants:suggest` (prefer Country). Add a `DEFAULT_LANGUAGE_BY_COUNTRY` table falling back to `en`. Resolve languages via GAQL `language_constant`, with no hard-coded ids. Unknown region or language returns an `error` that names the input. |
| 1.5 | `core/keywords.ts`: `checkKeywordDemand` + `MAX_KEYWORDS` + result types; re-export trend/google-ads/keywords from `core/index.ts` | 3 | R10. Normalise input (trim, drop empty entries and case-insensitive duplicates). Return `unavailable` before any fetch, with key names only. Make one `generateKeywordHistoricalMetrics` call. Map int64 strings with `Number()`; absent values become `null`. `UNSPECIFIED`/absent become `UNKNOWN`. Map month names to numbers. Fill `closeVariants` and `unmatched`, and never zero-fill. Use the readable error reasons from R10 and never return a stack (D1: no cache; D2: no ideas call). |
| 1.6 | `selftest-keywords` (b)–(d) with a stub `fetch` | 3 | R12. (b) An empty env gives `unavailable` listing all 5 required keys, and asserts no fetch call. (c) Token → search → search → metrics fixture with string int64s. (d) A 429 envelope gives `error` with the request id and no stack. |
| 1.7 | Register `check_keyword_demand` in `mcp.ts` + assert in `smoke-mcp.ts` | 2 | R10 `registerTool` snippet. All three statuses return via `ok()`; `fail()` only for the Zod boundary (>20 keywords). No REST route, no disk writes. |
| 1.8 | `plugin.json` 6 `userConfig` options + 6 `.mcp.json` env entries | 1 | R6 table: all are `type:"string"`, `default:""`, not required. The 4 secrets are `sensitive:true`; both customer ids are non-sensitive (Q5). Validate with `claude plugin validate plugins/specmanager`. |
| 1.9 | `commands/specmanager-keywords.md` | 2 | R11 and Design Screen 4 Cases A–D. Parse commas and ask once if `--region` is missing. Use the four-column table with the same cell formats as Screen 2 (no thousands separators). For `unavailable`: key names + 4 setup steps + README anchor. For `error`: reason + request id. Forbid `create_document`/`write_document`. |
| 1.10 | Docs: README `## Keyword demand (Google Ads)` + repo `CLAUDE.md` selftest list (14→15) and commands line | 2 | R6 setup docs: Basic/Standard token (test tokens give placeholder data), OAuth desktop client, refresh token with scope `https://www.googleapis.com/auth/adwords`, `/plugin` → SpecManager → configure. Q6: README walkthrough only. |
| 1.11 | Rebuild `server/dist` + manual Q4 install check | 2 | Q4: with no credentials, update the plugin via the reinstall steps and record whether it re-prompts. Confirm the MCP server boots, `/mcp` is connected, and the tool returns `unavailable`. Record the result in the task notes; if it re-prompts or fails to boot, stop and raise it. |

---

## Phase stage — Optional Marketing stage + marketing-writer

**Exit test:** `cd plugins/specmanager/server && npm run build && npm run selftest && npm run selftest-marketing && npm run selftest-prompts && npm run selftest-board && npm run smoke-mcp && cd ../ui && npm run build` passes. After reinstalling, on a throwaway feature with an approved PRD:
- The board shows the Marketing column after Design, in the Design Screen 1 states.
- `/specmanager:specmanager-marketing` writes `marketing/marketing.md` with a `## Demand` table (or the Screen 3 fallback).
- The Plan cell reads "Marketing draft not approved" until the doc is approved.

| # | Task | Pts | Notes |
|---|---|---|---|
| 2.1 | Core stage enum: `types.ts` `STAGE`, `paths.ts` `STAGES` + `stageDir`, `documents.ts` `DEFAULT_FILENAMES.marketing` | 2 | R1. Marketing goes right after design. The enum only widens, so no migration. `features.ts` needs no change. |
| 2.2 | `dependencies.ts`: `PRIOR_STAGE.marketing="prd"` + `OPTIONAL_PLAN_STAGES` loop | 2 | R1 and Q1 (PRD-gated). The first failing leg wins, design first. The design reason string stays byte-identical. |
| 2.3 | `claude-md.ts` `stageLabel` + commands line; `agent-chat.ts` `STAGE_PERSONA.marketing` + `STAGE.optional()`; `board-server.ts` gate cast | 2 | R3/R4. The persona says demand numbers come only from `check_keyword_demand`. The inline enum at `agent-chat.ts:155` is replaced. tsc is the check (`Record<Stage,…>`). |
| 2.4 | `selftest-marketing.ts` (a)–(h) + script | 3 | R12. Covers the regression gate, the exact reason string, design/marketing leg order, the PRD-only gate, doc path, the staleness chain PRD→Marketing→Plan, and a legacy folder with no `marketing/`. |
| 2.5 | UI plumbing: `ui/src/types.ts` `Stage`/`STAGES`, `STAGE_LABEL` in `App.tsx` + `DocPanel.tsx`, `priorStageApproved` marketing/plan legs, `--grid-cols` `repeat(5…)` + tablet `repeat(6…)` in `styles.css:1464` | 2 | R3. Keep the "mirrors core/dependencies.ts" comment. Validate with `cd ui && npm run build`. |
| 2.6 | `OptionalDesignCell` → `OptionalCell({ stage, ready })`, routed for design + marketing | 2 | R3, Design Screen 1 pins 1 and 5. Reuses the `card--optional*` classes, no new CSS. |
| 2.7 | Plan-cell gate reason: `planBlocker(row)` + `LockedCell` optional `reason` + `.card--gated`/`.card__gate-reason`/`.card__gate-hint` | 1 | Design Screen 1 pin 3. Display-only mirror; design first. The title tooltip shows the full core reason. Existing tokens only. Kept because it is cheap. |
| 2.8 | Verify Milkdown numeric column alignment | 1 | `styles.css:960-963` sets `.markdown th, td { text-align:left }`, which may override GFM `--:`. Open a doc with a `--:` table in the panel. If it is right-aligned, keep `--:`; otherwise the convention in 2.9 uses `---` (left-align). Record the outcome in the task notes. |
| 2.9 | `agents/marketing-writer.md` | 3 | R5 protocol, tier table, and doc sections. Make one `check_keyword_demand` call (5–15 seeds, ≤20). The `## Demand` convention follows Design Screens 2–3: 4 columns, verbatim integers with **no thousands separators**, `—` for null, glyph + `trend.verdict` + signed one-decimal pct, a provenance line, close-variants/unmatched lines only when non-empty, the seasonality blockquote once, and the "**Demand data unavailable** — …" fallback blockquote. Lightweight has no Demand section. `dependsOn`/`basedOn` point at PRD (+ Architecture). |
| 2.10 | `commands/specmanager-marketing.md` | 2 | R5 steps 1–7, modelled on `specmanager-design.md`. Flags: `--tier`/`--region`/`--keywords`. Single-shot, no-duplicate guard, `sync_claude_md`. |
| 2.11 | Plan wiring: `agents/planner.md` marketing grounding + `dependsOn`/`basedOn` leg; `commands/specmanager-plan.md` steps 1/2b/3 | 2 | R2. The planner reads marketing via `read_document` (Markdown) and does not turn GTM checklist items into build tasks unless they need code. |
| 2.12 | `selftest-prompts` INV rows | 2 | R12. `marketing-writer.md` must name the tool, forbid invented numbers, and require the unavailable note. `specmanager-marketing.md` must call `check_gate` with `marketing`. `planner.md` must carry the marketing leg. |
| 2.13 | Docs + rebuild: repo `CLAUDE.md` (selftests 15→16, stage lists, commands), README commands; rebuild `server/dist` + `ui/dist`; `claude plugin validate` | 2 | Committed `dist/` is what ships. |
| 2.14 | Manual dogfood on a throwaway feature | 1 | Walk Design Screen 1 states 1–5 (optional → draft → gated Plan → approve → reopen PRD shows stale) and delete the feature afterwards. |

---

## Risk & sequencing notes

- **`keywords` first:** it is independent of the stage enum, and `marketing-writer` (2.9) calls the tool.
- **Within `keywords`:**
  - 1.1 → 1.2 lock the pure rule before any I/O.
  - 1.3 → 1.4 → 1.5 → 1.6 build transport, then resolution, then domain, then stub tests.
  - 1.7 depends on 1.5.
  - 1.9 depends on 1.7.
  - 1.11 comes last because it needs the built dist and 1.8.
- **Within `stage`:**
  - 2.1 blocks everything else, because tsc fails on `Record<Stage,…>` until 2.3 lands. Land 2.1–2.3 together before the build is green.
  - 2.8 must come before 2.9.
  - 2.12 comes after 2.9–2.11.
- **Tricky rollbacks:**
  - The stage enum widening is safe forward. Rolling back after marketing docs exist would leave unparseable frontmatter, so remove those docs first.
  - `userConfig` additions can't be un-prompted on installs (Q4, checked in 1.11).
- **External risks:**
  - Google Ads v25 sunsets on a schedule (Q3: one-constant bump).
  - Test-access tokens return placeholder data.
  - ~1 QPS per customer on keyword planning, so errors are reported and never retried.

## Test strategy

- **Hand-rolled `selftest-*.ts`**, following repo convention: an `assert` helper, run with `node dist/<name>.js`.
  - `keywords` adds `selftest-keywords` (1.2, 1.6) and a `smoke-mcp` assertion (1.7).
  - `stage` adds `selftest-marketing` (2.4) and new `selftest-prompts` INV rows (2.12). Existing `selftest`/`selftest-board` guard the no-marketing regression gate.
- **No live-API test in CI:** 1.6 stubs `fetch`. Live verification is the `keywords` exit test plus 1.11.
- **UI:** checked by `ui` `npm run build` plus manual dogfood (2.8, 2.14). There is no UI test runner.

## Out of scope

- Keyword ideas / `generateKeywordIdeas` (D2).
- Result caching (D1).
- Year-over-year trend (Q2).
- An in-plugin OAuth helper (Q6).
- A REST/board endpoint for the tool.
- Executing marketing tasks.
- Writing to Google Ads.
- Other demand sources.
- Sub-country precision guarantees.
- Historical storage.
- A new `docs/agent-snippets/` fragment.
- Marketing affecting `docs/DESIGN.md`.

## Open questions

- **Q1:** follows the Architecture default, PRD-gated (2.2). If Architecture-gated is wanted instead, it is a one-line change in `PRIOR_STAGE` plus the UI mirror.
- **Q4:** unverified until 1.11. A re-prompt or boot failure blocks shipping `keywords`.
- **Architecture drift:** `agent-chat.ts:155`'s inline enum is also missing `"design"` today. Task 2.3's `STAGE.optional()` fixes both.
- **Milkdown alignment (designer flag 2):** decided by 2.8. The stylesheet's left-align rule may win over `--:`.
- **Q-anchors:** Q1–Q6 are table rows, not headings, so the phase `architectureRefs` cite the R/D headings plus `failure-and-edge-cases` rather than Q ids.

## Notes on estimates

- Points measure relative complexity, not hours. Recalibrate after the first phase, which is mostly network/proto parsing, where 3s may run long.
- Every task is ≤3 points.
- Docs, rebuild and manual checks are separate tasks in each phase, so "installable & testable" stays a real gate: 1.10–1.11 and 2.13–2.14.
