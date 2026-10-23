---
id: prd-marketing-phase-035
featureId: feat-marketing-phase
stage: prd
status: approved
stale: false
title: Marketing phase PRD
dependsOn: []
basedOn: {}
generatedBy: agent
version: 3
createdAt: '2026-08-03T16:04:34.067Z'
updatedAt: '2026-09-29T20:53:29.468Z'
---
## Problem

SpecManager drives features from idea to shipped code, but nowhere in the lifecycle do the human and agent think about *how the feature reaches users*. Positioning, channels, and launch timing surface late (post-ship) or not at all. For user-facing features on a new product, that means shipping without a go-to-market view, and adoption depends on luck rather than intent.

When marketing thinking *does* happen, it is usually uninformed by real demand: nobody checks whether people actually search for what the feature solves, in the region the product targets, how crowded that space is, or whether interest is growing or fading.

This feature adds marketing thinking **without adding a lifecycle stage**: the PRD gains a right-sized **Market & demand** section grounded in real **keyword demand data** (search volume, competition, trend from Google Ads Keyword Planner), and the Design gains a short **launch surface** note. A standalone command lets anyone check keyword demand ad hoc.

## Users & jobs-to-be-done

| User | Job |
|------|-----|
| Solo founder / indie hacker | Check whether there is real, growing search demand for the problem in my target country *while writing the PRD*, so positioning shapes scope and priority. |
| Product manager | Get positioning, a demand table, and channels in the PRD proportional to the feature's user-facing weight, without a separate tool or stage. Quickly check demand for a handful of keywords in a region. |
| Developer shipping internal tooling | Get no marketing overhead: a one-line changelog note at most, no keyword calls, never blocked by missing Google Ads credentials. |

## Goals

1. **No new stage.** Marketing lives inside existing docs: the PRD carries a **Market & demand** section; the Design carries a short **Launch surface** note. No stage enum, gate, board column, or new drafting agent.
2. **Tier-sized PRD section.** The prd-writer assesses the feature's user-facing weight and sizes the section to one of three tiers (see flows). An optional `--market-tier` override exists for when the assessment under-scopes.
3. **Keyword demand check.** Given keywords and a region, return for each keyword: average monthly search volume, competition (level + index), and a trend verdict: **increasing / stable / decreasing / insufficient_data**, computed year-over-year (see Constraints). Source: **Google Ads Keyword Planner** (Google Ads API).
4. **Two entry points.** (a) The prd-writer calls the keyword check automatically for Moderate/Full tiers and embeds a demand table in the PRD; (b) a standalone `/specmanager:specmanager-keywords` command for ad-hoc checks, writing nothing to the repo.
5. **Opt-in by credentials.** With no Google Ads credentials configured, everything works exactly as today: the PRD section states demand data was unavailable, and the standalone command explains how to get access. Numbers are never invented.

## Non-goals

- **A Marketing lifecycle stage, board column, or gate.** Explicitly dropped in favour of sections in existing docs.
- **Executing marketing tasks**: no emails, social posts, or marketing-platform integrations.
- **Writing to Google Ads**: no campaigns, bids, keyword plans, or any mutation. Read-only planning calls only.
- **Other demand sources**: no Google Trends scraping, SERP scraping, DataForSEO, or SEO-tool integrations. Google Ads Keyword Planner is the single source.
- **Related keyword ideas** (discovery beyond the given seeds) and **result caching**: out of v1.
- **Historical storage / tracking over time**: each check is a point-in-time snapshot.
- **Sub-country precision guarantees**: countries first; finer regions only where the API resolves them.

## Success metrics

| Metric | Target |
|--------|--------|
| Keyword check returns volume, competition, and trend verdict per requested keyword in the requested region | Ship |
| Trend verdict is deterministic: the same monthly volumes always yield the same verdict (computed in code, not by the model) | Ship |
| A backend/internal feature's PRD gets a Lightweight section (or none) and makes no keyword call; a user-facing feature's PRD gets a Moderate/Full section with a demand table | Ship |
| Every number in a PRD demand table is traceable to that run's keyword tool result | Ship |
| With no credentials configured, the tool reports "unavailable" with setup guidance and the PRD still generates | Ship (regression gate) |
| Features and docs created before this change behave identically (no new stage, no gate change) | Ship (regression gate) |
| Users who never use keywords are not blocked or confused by the credential fields (all clearly optional) | Ship |

## Constraints & assumptions

| Type | Detail |
|------|--------|
| No lifecycle change | No change to the stage enum, `STAGES`, `checkGate`, staleness graph, or board columns. The work is prompt changes (prd-writer, designer), one new MCP tool, one new command, and `core` helpers. |
| New MCP tool | One new read-only tool for keyword demand. It writes nothing to disk. |
| Data source | Google Ads API, Keyword Planner historical metrics, at the latest stable API version at build time. |
| Access requirement | Keyword Planner requires **Basic (or Standard) access on the user's Google Cloud project**. Explorer, the default after brand verification, blocks `KeywordPlanIdeaService`. This is stated up front in setup docs and in error messages. |
| Credentials | **Developer tokens were retired by Google on 2026-09-09** and are not used. The user supplies: OAuth client ID + secret (from the Cloud project with Basic access), a refresh token, a customer ID, and optionally a login (manager) customer ID. Stored as plugin user config; secrets marked sensitive; every field titled as optional ("keyword demand only"). Never written to the repo or spec docs. |
| Secret containment | Credentials must reach only the process that calls Google Ads. Child processes the server spawns (e.g. the board's chat agent) must not inherit them. |
| OAuth token lifetime | Setup docs tell users to publish their OAuth consent screen to Production (Testing-mode refresh tokens expire after 7 days); an expired token yields a readable "re-mint your refresh token" reason. |
| Trend rule | **Year-over-year**: compare the mean of the last 3 complete months with the mean of the same 3 months one year earlier (15 months fetched in the same single request). A documented ±threshold decides increasing/decreasing; a low-volume floor and any missing compared month yield `insufficient_data`. Months aligned by (year, month), not array position. |
| Region input | Plain terms (country name or ISO code, e.g. "Spain" / "ES"), resolved to a geo target in code. Language defaults from the region and can be overridden; the language used is always shown. |
| Input limits | A single check is capped at a small documented number of keywords; each keyword is validated against the API's length/word limits before any call. |
| Tier inference | Inferred from PRD content; no new metadata field on the feature record. |
| Web research | For the Full tier, the prd-writer may use web search for competitive context; every competitive claim cites a URL. |
| Backward compatibility | Existing PRDs without a Market & demand section stay valid. The section is additive. |

**Assumption:** The Google Ads API can be called from the Node MCP server with plain `fetch` + OAuth refresh (no heavy SDK). Architecture validates this.

## High-level user flows

### Flow 1: PRD with a Market & demand section (happy path)

1. User runs `/specmanager:specmanager-prd` (optionally `--region`, `--keywords`, `--market-tier`).
2. prd-writer drafts the PRD as today, then assesses user-facing weight and picks a tier:

| Tier | Trigger signals | Market & demand section |
|------|-----------------|-------------------------|
| **Lightweight** | Backend-only, internal tooling, infrastructure | One-line changelog/announcement note. No keyword call. |
| **Moderate** | Enhancement to an existing user-facing feature | Positioning statement, keyword demand table, target channels. |
| **Full** | New core feature, new product, competitive landscape in play | Positioning, keyword demand analysis (what volume/competition/trend imply), cited competitive context, channel strategy, launch checklist. |

3. For Moderate/Full: prd-writer derives seed keywords from the idea (or uses `--keywords`), picks the region (from `--region`, else from context, else states the assumption), and calls the keyword tool.
4. The demand table is embedded verbatim from the tool result; the PRD is saved as a draft as today.

### Flow 2: Design carries a Launch surface note

1. User runs `/specmanager:specmanager-design` on a feature whose PRD has a Market & demand section.
2. The designer adds a short **Launch surface** note to the mockups doc: where the feature is first seen by users (landing, onboarding, changelog, in-app announcement), and which positioning line from the PRD each surface carries. No keyword calls from the designer.
3. If the PRD has no Market & demand section, the designer omits the note.

### Flow 3: Ad-hoc keyword demand check

1. User runs `/specmanager:specmanager-keywords "spec driven development, ai coding workflow" --region Spain`.
2. User sees per keyword: avg monthly searches, competition (level + index), trend verdict with the % change that drove it, and the region/language actually used.
3. Nothing is written to the repo.

### Flow 4: No Google Ads credentials

1. The tool returns "unavailable", naming which settings are missing (never their values) and linking setup docs (including the Basic-access requirement). No network call is made.
2. `/specmanager-keywords` prints the guidance. The PRD section replaces the table with a one-line "Demand data unavailable" note; the PRD still generates.

### Flow 5: API error

1. Google rejects the call (project lacks Basic access, expired refresh token, quota, unknown region, invalid keyword).
2. The tool returns a user-readable reason (no stack trace, no secrets). The PRD notes the reason in place of the table; the command prints it.

## Resolved decisions

| # | Decision |
|---|----------|
| 1 | Marketing is **not** a lifecycle stage; it is a PRD section plus a Design note. |
| 2 | Google Ads Keyword Planner is the single source, despite the Basic-access requirement; users without it take the "unavailable" path. |
| 3 | No developer token (retired by Google). |
| 4 | Year-over-year trend rule with low-volume floor; `insufficient_data` is an official fourth verdict. |
| 5 | Credentials via plugin user config, every field marked optional. |
| 6 | Full tier may use cited web search. Tier override via `--market-tier`. |
| 7 | No caching and no related keyword ideas in v1. |

## Open questions

None blocking. Architecture confirms the exact threshold and low-volume floor values, the keyword cap, and the region/language resolution approach.
