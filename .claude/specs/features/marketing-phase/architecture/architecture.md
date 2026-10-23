---
id: arch-marketing-phase-025
featureId: feat-marketing-phase
stage: architecture
status: approved
stale: false
title: Marketing phase architecture
dependsOn:
  - prd-marketing-phase-035
basedOn:
  prd-marketing-phase-035: 3
generatedBy: agent
version: 2
createdAt: '2026-09-29T11:50:00.352Z'
updatedAt: '2026-09-29T20:58:10.648Z'
---
## Summary

This implements PRD `prd-marketing-phase-035` v3. Marketing thinking lives inside the existing docs, and **no lifecycle stage is added**:

- The `prd-writer` adds a tier-sized `## Market & demand` section to the PRD.
- The `designer` adds a short **Launch surface** note to the mockups.
- One new read-only MCP tool, `check_keyword_demand`, fetches keyword demand from the Google Ads Keyword Planner. The `prd-writer` calls it for the Moderate and Full tiers.
- The new `/specmanager:specmanager-keywords` command calls the same tool for ad-hoc checks.
- The server-side logic is three short `core` modules: a plain-`fetch` REST client, a hard-coded language table, and a pure year-over-year trend rule.

The tool is opt-in by credentials. With no credentials configured it returns `status: "unavailable"`, and it never fabricates numbers.

## R1 — No lifecycle change

Nothing touches any of the following:

- the `STAGE` enum (`core/types.ts`) or `STAGES` (`core/paths.ts`)
- `PRIOR_STAGE` or `checkGate` (`core/dependencies.ts`)
- `propagateStale` (`core/status.ts`)
- the manifest, the `claude-md.ts` stage labels, or the board UI columns

The only core change is the set of new modules in R7–R11. The existing selftests (`selftest`, `selftest-board`, `selftest-build`, `selftest-roundtrip`) are the regression gate that shows pre-existing features and docs behave identically. PRDs without the new section stay valid because the section is additive prose, and no parser depends on it.

## R2 — prd-writer: Market & demand section

**Tool grants (verified).** `agents/prd-writer.md` frontmatter has only `name`, `description` and `model: inherit`, with **no `tools:` line**. An agent without a `tools:` line inherits every tool in the session. That includes this plugin's MCP tools (`check_keyword_demand` included, once it is registered) and `WebSearch`/`WebFetch`. So no grant change is needed. Do **not** add a `tools:` allowlist, because that would silently drop the other tools the prd-writer already uses (`list_features`, `list_documents`, `read_document`, `create_document`).

**Prompt changes in `agents/prd-writer.md`:**

- **Inputs.** Add optional `region`, `keywords` and `marketTier` values, forwarded from the command.
- **"What a good PRD contains".** Add item 8, **Market & demand (tier-sized)**, placed after High-level user flows and before Open questions.
- **"How to write it".** A new step between drafting and persisting:
  1. Pick a tier. Use `marketTier` if given; otherwise infer it from the PRD's own content using the tier table in the PRD, Flow 1.
  2. For **Moderate or Full only**, make **one** `check_keyword_demand` call. Seeds come from `keywords` if given; otherwise derive at most 20 from the idea. The region comes from `region`, else from context, else an assumption the doc states.
  3. **Full only.** `WebSearch`/`WebFetch` may be used for competitive context, and every competitive claim carries its URL.

**Section format**, which the prompt specifies:

```
## Market & demand
**Tier:** <Lightweight|Moderate|Full> — <one-line rationale>
Lightweight: one changelog/announcement line. Nothing else, no keyword call.
Moderate/Full:
### Positioning
### Demand
| Keyword | Avg monthly searches (12 mo) | Competition (index) | Trend YoY (Δ%) |
Source: Google Ads API <apiVersion> · <region.name> (<countryCode>) / <language.code> · fetched <fetchedAt> · rule: <trend.rule>
### Channels
Full adds: ### What demand implies · ### Competitive context (cited) · ### Launch checklist (- [ ] items)
```

**Hard rules**, guarded by `selftest-prompts` (R14):

- **Numbers.** Every number in `### Demand` is copied verbatim from that run's tool result, and none is invented or re-rounded.
- **Trend wording.** The trend cell comes from `trend.verdict` and `trend.pctChange`, never the model's own judgement.
- **Unavailable or error.** On `status: "unavailable"` or `"error"`, the table is replaced by exactly one line: `Demand data unavailable — <reason or missing-settings summary>`. The PRD still gets written.
- **Unmatched and low-signal keywords.** `unmatched` keywords are listed under the table, never zero-filled. An `insufficient_data` trend is shown as-is.

## R3 — /specmanager-prd flags

`commands/specmanager-prd.md` changes as follows:

- **Argument hint.** It becomes `"<feature title, or existing featureId/slug> [--region <country>] [--keywords \"a, b\"] [--market-tier lightweight|moderate|full]"`.
- **Step 0 (new): parse the flags.** Strip `--region`, `--keywords` and `--market-tier` (with their values) out of `$ARGUMENTS` **before** step 1 resolves or creates the feature. Otherwise flags would leak into the `create_feature({ title })` slug.
- **Validate the tier.** Reject a `--market-tier` value that isn't one of the three tiers by asking once and stopping.
- **Step 3.** Forward `region`, `keywords` and `marketTier` in the prd-writer `Task` prompt.

The other steps don't change. The command stays a single-shot delegation.

## R4 — designer: Launch surface note

`agents/designer.md` changes as follows:

- **Required research, step 1** gains one sentence: if the PRD body contains a `## Market & demand` heading, note its tier, its `### Positioning` line and its `### Channels` entries.
- **"Produce the file"** gains one optional element, `<section class="sm-note sm-launch-surface">`, placed immediately before the Open questions note. It is emitted **only when the PRD has that heading**. It says:
  - where users first meet the feature (landing, onboarding, changelog, in-app announcement);
  - which PRD positioning line each surface carries;
  - for a Lightweight tier, simply "changelog only".
- **Don't list:** the designer never calls `check_keyword_demand`.
- **No new persistence.** The design doc already `dependsOn` the PRD, so staleness is unchanged.

## R5 — Credentials via plugin userConfig

**Evidence.**

- **Plugin config.** Claude Code plugin reference, https://code.claude.com/docs/en/plugins-reference#user-configuration:
  - `sensitive: true` masks the input and stores the value in the OS credential store.
  - `${user_config.KEY}` is substituted into an MCP stdio server's `env`, the same path `board_port` → `SPECMANAGER_BOARD_PORT` already uses in `.mcp.json`.
  - In agent, command and skill Markdown, a sensitive value becomes a placeholder.
- **Developer tokens.** Google sunset them on **2026-09-09**; the header is "optional and ignored", and access comes from the Cloud project that owns the OAuth client (https://developers.google.com/google-ads/api/docs/api-policy/developer-token). **No developer token is used anywhere.**

**New `userConfig` entries in `plugins/specmanager/.claude-plugin/plugin.json`:**

- Each entry is `type: "string"`, `default: ""`, and not `required`.
- Each `title` ends with **"(optional — keyword demand only)"**, for example `"Google Ads OAuth client secret (optional — keyword demand only)"`.

| Key | sensitive | Required for the tool | `.mcp.json` env |
|---|---|---|---|
| `google_ads_client_id` | yes | yes | `SPECMANAGER_GADS_CLIENT_ID` |
| `google_ads_client_secret` | yes | yes | `SPECMANAGER_GADS_CLIENT_SECRET` |
| `google_ads_refresh_token` | yes | yes | `SPECMANAGER_GADS_REFRESH_TOKEN` |
| `google_ads_customer_id` | no | yes | `SPECMANAGER_GADS_CUSTOMER_ID` |
| `google_ads_login_customer_id` | no | no (manager accounts only) | `SPECMANAGER_GADS_LOGIN_CUSTOMER_ID` |

The customer IDs are identifiers, not secrets. Leaving them non-sensitive keeps them editable in `/config`.

**`googleAdsConfigFromEnv(env)`:**

- It treats an empty value, or one starting with `${`, as missing.
- It strips `-` from customer IDs.
- It returns `{ ok: false, missing: [<userConfig key names>] }` and never includes values.

## R6 — Secret containment

The `SPECMANAGER_GADS_*` variables must reach only the MCP server process (PRD constraint). The server spawns two child processes today, and both would inherit them:

| Spawn site | Fix |
|---|---|
| `server/src/agent-chat.ts` `query({ options })` (board chat) | Pass `env: withoutAdsSecrets(process.env)`. In the TypeScript Agent SDK, `env` **replaces** the subprocess environment; it defaults to `process.env` and does not merge (https://code.claude.com/docs/en/agent-sdk/typescript, Options → `env`). So the filtered copy keeps `PATH`, `ANTHROPIC_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN` and the rest, and drops only the Google Ads keys. |
| `server/src/mcp.ts` `open_board` → `spawn(cmd, args, { detached: true, stdio: "ignore" })` | Add `env: withoutAdsSecrets(process.env)`. |

`export function withoutAdsSecrets(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv` lives in `core/google-ads.ts`. It returns a copy without any key that starts with `SPECMANAGER_GADS_`.

Error reasons (R7) are built only from fields in Google's responses, never from the request, so no secret can appear in tool output.

## R7 — Google Ads REST client (core/google-ads.ts)

**Why plain `fetch`, with no SDK:**

- Node 20 provides a global `fetch`.
- Google publishes no official Node client library; the official ones are Java, .NET, PHP, Python, Ruby and Perl.
- The unofficial Opteo `google-ads-api` package pulls in gRPC and protobuf code, which is too heavy for the `${CLAUDE_PLUGIN_DATA}` install.

This validates the PRD's assumption.

**Constants:**

- `GOOGLE_ADS_API_VERSION = "v25"`. The latest release is v25.2 (2026-09-23), and REST paths carry the major version (https://developers.google.com/google-ads/api/docs/release-notes). Releases are now monthly, so bumping this is a one-line change.
- `TOKEN_URL = "https://oauth2.googleapis.com/token"`.
- `BASE = "https://googleads.googleapis.com"`.

**Evidence consulted (2026-09-29).** Pulled via WebFetch and Context7 (`/websites/developers_google_google-ads_api`):

- https://developers.google.com/google-ads/api/rest/auth
- https://developers.google.com/google-ads/api/docs/keyword-planning/generate-historical-metrics
- https://developers.google.com/google-ads/api/docs/targeting/location-targeting
- https://developers.google.com/google-ads/api/docs/productionize/rate-limits: `KeywordPlanIdeaService` allows about 1 request per second per customer ID and returns `RESOURCE_EXHAUSTED` beyond that.
- https://developers.google.com/google-ads/api/docs/api-policy/access-levels

| Purpose | Request | Body | Fields read |
|---|---|---|---|
| Refresh → access token | `POST {TOKEN_URL}` (form-encoded) | `grant_type=refresh_token`, `client_id`, `client_secret`, `refresh_token` | `access_token`; on failure `error` and `error_description` only |
| Historical metrics | `POST {BASE}/v25/customers/{cid}:generateKeywordHistoricalMetrics` | `{ keywords, geoTargetConstants: [geo], language: "languageConstants/<id>", keywordPlanNetwork: "GOOGLE_SEARCH", includeAdultKeywords: false, historicalMetricsOptions: { yearMonthRange: { start: { year, month: "<MONTH>" }, end: { year, month: "<MONTH>" } } } }` | `results[].text`, `closeVariants[]`, and from `keywordMetrics`: `competition`, `competitionIndex`, `monthlySearchVolumes[]` of `{ year, month: "JANUARY"…, monthlySearches }` |
| Region by name | `POST {BASE}/v25/geoTargetConstants:suggest` | `{ locale: "en", locationNames: { names: [region] } }` | `geoTargetConstantSuggestions[].geoTargetConstant.{ resourceName, name, countryCode, targetType, status }` |
| Region by ISO code | `POST {BASE}/v25/customers/{cid}/googleAds:search` | `{ query }` (GAQL, R8) | `results[].geoTargetConstant.*` |

**Headers:**

- `Authorization: Bearer <token>` and `Content-Type: application/json`.
- `login-customer-id` only when configured.
- **No `developer-token` header.**

**Parsing notes:**

- Proto3 JSON sends int64 values (`monthlySearches`, `year`, `competitionIndex`) as strings, so they are parsed with `Number()`.
- An absent value means `null`, not `0`.
- `keywordMetrics.avgMonthlySearches` is **ignored**. With a custom 16-month range it no longer means a 12-month average, so R10 computes that average itself.

**Date range.** `end` is the previous calendar month in UTC, which is complete, and `start = end − 15 months`. That is 16 months in **one** call: enough for the year-over-year comparison, plus one month of slack if Google hasn't published last month yet.

**Interfaces (sketch):**

```ts
export interface GoogleAdsConfig { clientId: string; clientSecret: string; refreshToken: string; customerId: string; loginCustomerId?: string }
export function googleAdsConfigFromEnv(env: NodeJS.ProcessEnv): { ok: true; config: GoogleAdsConfig } | { ok: false; missing: string[] };
export function withoutAdsSecrets(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv;
export async function getAccessToken(cfg: GoogleAdsConfig, f?: typeof fetch): Promise<string>;           // throws GoogleAdsError
export async function adsPost<T>(cfg: GoogleAdsConfig, token: string, path: string, body: unknown, f?: typeof fetch): Promise<T>; // throws GoogleAdsError
export class GoogleAdsError extends Error { status: number; code?: string; requestId?: string }
```

**Error handling:**

- `adsPost` parses Google's error envelope `{ error: { code, message, status, details: [{ errors: [{ errorCode: { <kind>: "<CODE>" }, message }], requestId }] } }` into `code = "<Kind>.<CODE>"` plus the first error message. `requestId` comes from the `request-id` response header.
- `getAccessToken` builds its error from the response's `error` field and the HTTP status only. **It never echoes the form body.**
- Each fetch uses `AbortSignal.timeout(20_000)`.
- There are no retries and no token caching; the token is exchanged fresh for each check.

**Readable reasons.** Mapping from a Google error to the `reason` string is in `keywords.ts` `explain(err)`:

| Google error | `reason` |
|---|---|
| token `invalid_grant` | `refresh token expired or revoked — re-mint it; publish your OAuth consent screen to Production (Testing tokens expire in 7 days)` |
| other token error | `OAuth token exchange failed: <error> (HTTP <status>)` |
| `AuthorizationError.CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION` | `your Google Cloud project has Test access only — apply for Basic access (see README: Keyword demand)` |
| HTTP 403 / `PERMISSION_DENIED` from `generateKeywordHistoricalMetrics` (any other AuthorizationError code) | `Keyword Planner needs Basic access on the Cloud project that owns your OAuth client — Explorer access blocks KeywordPlanIdeaService (<Google message>)` |
| `AuthorizationError.USER_PERMISSION_DENIED` | `the OAuth user can't access customer <customerId> — set login_customer_id if it sits under a manager account` |
| HTTP 429 / `RESOURCE_EXHAUSTED` | `quota exceeded — Keyword Planner allows ~1 request/second per account; retry in a minute` |
| timeout | `Google Ads API timed out` |
| anything else | `<code>: <Google message>` |

## R8 — Region and language resolution

**New file: `server/src/core/languages.ts`.** It contains two hard-coded tables and no GAQL.

- **`LANGUAGE_CONSTANTS: Record<string, number>`.** This is the **full official table**, 51 rows, from https://developers.google.com/static/google-ads/api/data/tables/languagecodes.csv (fetched 2026-09-29). Examples: `en: 1000`, `de: 1001`, `fr: 1002`, `es: 1003`, `it: 1004`, `ja: 1005`, `nl: 1010`, `pt: 1014`, `sv: 1015`, `pl: 1030`, `ca: 1038`, `zh_CN: 1017`, `zh_TW: 1018`, `iw: 1027` (Hebrew).
  - It replaces the v1 GAQL language lookup. That removes one HTTP call and removes any interpolation of the language input.
- **`DEFAULT_LANGUAGE_BY_COUNTRY: Record<string, string>`.** ES/MX/AR/CO/CL/PE→es, US/GB/IE/CA/AU/NZ/IN→en, FR/BE→fr, DE/AT/CH→de, IT→it, PT/BR→pt, NL→nl, PL→pl, SE→sv, JP→ja. Any other country falls back to `en`.
- **Resolution.** The language is the input `language`, else the country default, and the one used is always echoed in the result.
  - It must be a key of `LANGUAGE_CONSTANTS`, which is stricter than the regex `/^[a-z]{2}(_[A-Z]{2})?$/`.
  - Otherwise the result is `error: unknown language "<code>"`, returned before any network call.

**Region resolution in `keywords.ts`:**

- **ISO path.** If `region.trim()` matches `/^[A-Za-z]{2}$/`, uppercase it (so it matches `^[A-Z]{2}$` before being interpolated) and run GAQL: `SELECT geo_target_constant.resource_name, geo_target_constant.name, geo_target_constant.country_code FROM geo_target_constant WHERE geo_target_constant.country_code = '<CC>' AND geo_target_constant.target_type = 'Country' AND geo_target_constant.status = 'ENABLED'`.
- **Name path.** Anything else (≤ 100 chars) goes to `geoTargetConstants:suggest`, with the name carried in the JSON body so nothing is interpolated.
  - Pick the first suggestion whose `targetType` is `"Country"`, else the first `ENABLED` suggestion. Finer regions are allowed but not guaranteed (PRD non-goal).
- **No match.** The result is `error: unknown region "<input>"`, and **no metrics call** is made.

## R9 — Input validation

These checks run in `keywords.ts` before any network call, and any failure returns `status: "error"`.

**Keywords:**

- Trim each one; drop empty ones and case-insensitive duplicates.
- After de-duplication there must be between 1 and **`MAX_KEYWORDS = 20`**. That is one call; the API allows 10,000, but 20 keeps output PRD-sized.
- Each keyword must be **≤ 80 characters and ≤ 10 words** (split on whitespace). Sources:
  - The 80-character limit is from https://developers.google.com/google-ads/api/docs/best-practices/system-limits ("Keyword text is limited to 80 characters").
  - The 10-word limit is Google's `CriterionError.KEYWORD_HAS_TOO_MANY_WORDS` (https://developers.google.com/google-ads/api/reference/rpc/v25/CriterionErrorEnum.CriterionError).
  - The error names the offending keyword.

**Region:** non-empty, at most 100 characters.

**Language:** must be a key of `LANGUAGE_CONSTANTS` (R8).

**At the MCP boundary**, Zod enforces only types and the array's length bounds. The content rules live in core, so selftests exercise them.

## R10 — Trend rule, year-over-year (core/trend.ts)

**New file: `server/src/core/trend.ts`.** It is pure, with no I/O, and is the only place a verdict is computed.

```ts
export type TrendVerdict = "increasing" | "stable" | "decreasing" | "insufficient_data";
export interface MonthlyVolume { year: number; month: number /* 1–12 */; searches: number | null }
export interface Trend { verdict: TrendVerdict; pctChange: number | null; recent: string; prior: string; rule: string } // recent/prior like "2026-06..2026-08"
export const TREND_THRESHOLD = 0.25;
export const LOW_VOLUME_FLOOR = 50;
export const TREND_RULE = "YoY: mean of last 3 complete months vs same 3 months a year earlier, ±25%, floor 50/mo";
export function computeTrend(volumes: MonthlyVolume[]): Trend;
export function avgLast12(volumes: MonthlyVolume[]): number | null;
```

**Rule (exact):**

1. Index the volumes by the key `year*12 + (month−1)`. This aligns months by (year, month), never by array position.
2. `L` is the largest key present.
3. The recent months are `L−2`, `L−1` and `L`. The prior months are the same keys minus 12.
4. If any of these six months is absent or has `searches === null`, the result is `insufficient_data` with `pctChange: null`.
5. Compute `r = mean(recent)` and `p = mean(prior)`.
6. If `max(r, p) < LOW_VOLUME_FLOOR`, the result is `insufficient_data`.
7. If `p === 0`, then `r ≥ 50` (because of step 6), so the result is `increasing` with `pctChange: null`.
8. Otherwise `pct = (r − p) / p`:
   - `pct ≥ +0.25` → `increasing`
   - `pct ≤ −0.25` → `decreasing`
   - otherwise → `stable`
9. `pctChange = Math.round(pct * 1000) / 10`.

**`avgLast12`** returns `Math.round` of the mean of the present, non-null values at keys `L−11` to `L`, or `null` if there are none. It is used instead of the API's `avgMonthlySearches` (R7).

**Why these values:**

- **Year-over-year cancels seasonality.** Comparing a quarter with the same quarter a year earlier removes the seasonal bias that a first-3 vs last-3 comparison within one 12-month window has.
- **`LOW_VOLUME_FLOOR = 50`.** Google reports low volumes in coarse rounded steps (10, 20, 30, 40, 50, then 70, 90, …). Below about 50, a single step is a 20–100% swing, so a verdict would be noise.
- **`TREND_THRESHOLD = 0.25`.** Above the floor, adjacent rounding steps are roughly 20–30% apart. With 3-month averaging, a 25% bar keeps a one-step wobble from flipping the verdict in most cases.
- The step values are community-observed rather than officially documented; see Q3.

## R11 — check_keyword_demand tool (core/keywords.ts + mcp.ts)

**`server/src/core/keywords.ts`:**

```ts
export const MAX_KEYWORDS = 20;
export interface KeywordDemandInput { keywords: string[]; region: string; language?: string }
export interface KeywordDemand { keyword: string; closeVariants: string[]; avgMonthlySearches12: number | null; competition: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN"; competitionIndex: number | null; monthly: MonthlyVolume[]; trend: Trend }
export type KeywordDemandResult =
  | { status: "ok"; apiVersion: string; fetchedAt: string; region: { input: string; name: string; countryCode: string; geoTargetConstant: string }; language: { code: string; languageConstant: string }; keywords: KeywordDemand[]; unmatched: string[] }
  | { status: "unavailable"; missing: string[]; setup: string }
  | { status: "error"; reason: string; requestId?: string };
export async function checkKeywordDemand(input: KeywordDemandInput, deps?: { env?: NodeJS.ProcessEnv; fetch?: typeof fetch; now?: Date }): Promise<KeywordDemandResult>;
```

**Order of operations:**

1. **Config.** A missing config returns `unavailable` with **no fetch** (PRD Flow 4). `setup` points to the README anchor and mentions the Basic-access requirement.
2. **Validate** the input (R9).
3. **Get an access token.**
4. **Resolve the region** (R8).
5. **Make one metrics call.**
6. **Map the results:**
   - `competition` values `UNSPECIFIED` and absent both become `UNKNOWN`.
   - Month names map to 1–12.
   - Compute `avgLast12` and `computeTrend` for each keyword.
   - `unmatched` lists input keywords that match no result `text` and no `closeVariants` entry.
7. **Errors.** Any `GoogleAdsError` becomes `status: "error"` through `explain()` (R7). Stack traces are never returned.

The `deps` parameter (`fetch`, `env`, `now`) exists only so the selftest can run without the network.

**`server/src/mcp.ts`** registers the tool:

```ts
server.registerTool("check_keyword_demand", {
  description: "Read-only Google Ads Keyword Planner lookup: 12-month avg searches, competition, and a deterministic year-over-year trend verdict per keyword for a region. Returns status ok | unavailable (no credentials) | error. Writes nothing.",
  inputSchema: z.object({ keywords: z.array(z.string()).min(1).max(MAX_KEYWORDS), region: z.string().min(1).max(100), language: z.string().optional() }),
}, async (input) => ok(await checkKeywordDemand(input)));
```

- **Response shape.** All three outcomes return through `ok()`, and callers branch on `data.status`.
- **Where `fail()` is used.** Only for Zod violations.
- **Nothing is written to disk.** Per the PRD there is no caching and no related keyword ideas in v1.
- **Not on the board.** The tool is not exposed on the board REST API, and the chat agent's in-process MCP server (`agent-chat.ts` `makeMcpServer`) does not get it.
- **Exports.** `core/index.ts` re-exports `trend.ts`, `languages.ts`, `google-ads.ts` and `keywords.ts`.

## R12 — /specmanager:specmanager-keywords command

**New file: `plugins/specmanager/commands/specmanager-keywords.md`.** Its argument hint is `"<kw1, kw2, …>" --region <country> [--language <code>]`. It runs in the main session with no subagent. Steps:

1. **Parse the arguments.** Split the keywords on commas. If `--region` is missing, ask once and stop.
2. **Call** `check_keyword_demand`.
3. **Render the result by status:**
   - **`ok`:** a table with columns Keyword · Avg monthly searches (12 mo) · Competition (index) · Trend YoY (Δ%), then close variants, `unmatched`, the region, language and API version used, and `trend.rule`.
   - **`unavailable`:** the missing setting names and the setup pointer, including Basic access.
   - **`error`:** the reason, plus the request id if present.
4. **Write nothing.** The Don't list forbids `create_document` and `write_document`.

## R13 — README setup section

Add `## Keyword demand (Google Ads, optional)` to the repo `README.md`, in this order:

1. **Access requirement, first.** Keyword Planner needs **Basic (or Standard) access on the Google Cloud project that owns your OAuth client**.
   - Explorer, the default after brand verification, blocks `KeywordPlanIdeaService`.
   - To apply: Cloud console → Google Ads API overview → "Upgrade access level" → apply for Basic. Brand verification is a prerequisite (source: api-policy/access-levels).
   - Developer tokens are no longer needed; they were sunset on 2026-09-09.
2. **Create an OAuth client** in that project. Use the Desktop type.
3. **Publish the consent screen to Production.** Testing-mode refresh tokens expire after 7 days.
4. **Mint a refresh token** with scope `https://www.googleapis.com/auth/adwords`.
5. **Enter the values** under `/plugin` → SpecManager → configure. All fields are optional; `login_customer_id` is only for manager accounts.
6. **Try it:** `/specmanager:specmanager-keywords "…" --region ES`.

## R14 — Selftests

| Test | Covers |
|---|---|
| New `server/src/selftest-keywords.ts` (`npm run selftest-keywords`) | See the list below this table. |
| `server/src/selftest-prompts.ts` | New invariant rows. **`agents/prd-writer.md`** must contain `## Market & demand`, `check_keyword_demand`, the verbatim/no-invented-numbers rule, `Demand data unavailable`, and no keyword call for the Lightweight tier. **`commands/specmanager-prd.md`** must name `--region`, `--keywords` and `--market-tier`, and strip the flags before `create_feature`. **`agents/designer.md`** must contain `Launch surface` and the condition that the PRD has a `## Market & demand` section. A negative row checks that `designer.md` never instructs a `check_keyword_demand` call. |
| `server/src/smoke-mcp.ts` | Asserts `check_keyword_demand` is registered. |
| `server/package.json`, repo `CLAUDE.md` | Add the `selftest-keywords` script. The self-test count goes from 14 to 15. |

`selftest-keywords` checks, all with stub `fetch` fixtures and no network:

- **(a) `computeTrend` table:**
  - ±30% gives increasing/decreasing; +10% gives stable; exactly ±25% hits the boundary.
  - A missing compared month gives `insufficient_data`, and so does `max(r, p) < 50`.
  - `p = 0` with `r ≥ 50` gives increasing with a null percentage.
  - Shuffled input gives the same verdict, and a one-month publication lag shifts `L` correctly.
  - `avgLast12` ignores nulls.
- **(b) Unavailable.** With an empty env the result is `unavailable`, listing 4 keys, with zero fetch calls. An env with only `login_customer_id` set still gives 4 missing keys.
- **(c) Validation.** An 81-character keyword, an 11-word keyword, 21 keywords, or `language: "xx"` each give `error` with zero fetch calls.
- **(d) ISO path.** `region: "es"` issues token → GAQL (asserts the query contains `'ES'`) → metrics. It checks the request body carries `yearMonthRange` and has **no** `developer-token` header, then maps volumes, `avgMonthlySearches12`, trend, close variants and `unmatched`.
- **(e) Name path.** `region: "Spain"` issues token → suggest (picks the Country row) → metrics.
- **(f) Unknown region.** Suggest returns an empty list, giving `error: unknown region` with no metrics call.
- **(g) Error mapping:**
  - `invalid_grant` gives the exact reason text, and the reason contains neither the client secret nor the refresh token.
  - `CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION`, a 403 on the metrics call (Basic access), and a 429 (quota) each map to their reasons.
- **(h) Env scrubbing.** `withoutAdsSecrets` drops `SPECMANAGER_GADS_*` and keeps `PATH` and `ANTHROPIC_API_KEY`.

## Data model changes

- **None to the specs:** no stage, frontmatter field, manifest entry or persisted keyword file.
- **Plugin config:** 5 `userConfig` options and 5 `.mcp.json` `env` entries (R5).
- **PRD docs:** they may carry a `## Market & demand` section. **Design docs** may carry an `sm-launch-surface` note. Both are additive prose.

## Sequence / flow

1. **PRD (Moderate/Full).**
   - `/specmanager-prd "<title>" --region ES` strips the flags, then runs `list_features`/`create_feature`, then launches the prd-writer `Task` with the forwarded values.
   - The prd-writer drafts the PRD and picks a tier. It then calls `check_keyword_demand`, which runs `googleAdsConfigFromEnv` → validation → token → region (GAQL or suggest) → `generateKeywordHistoricalMetrics` over the 16-month range → map, `avgLast12` and `computeTrend`.
   - Finally it calls `create_document(prd)`. The existing events handle the manifest, CLAUDE.md and board refresh.
2. **No credentials.** The tool returns `unavailable` and the PRD section carries the one-line note.
3. **Design.** The designer reads the PRD and, if it has a `## Market & demand` section, adds the Launch surface note via `create_design_brief`.
4. **Ad-hoc.** `/specmanager-keywords` calls the tool and renders a table in chat. No writes.

## Failure & edge cases

| Case | Handling |
|---|---|
| No credentials, or only some | `unavailable`, listing the missing key names; no fetch. |
| The Cloud project has Explorer access | 403 on the metrics call → Basic-access reason (R7). The README leads with this requirement. |
| The Cloud project has Test access | `CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION` → apply-for-Basic reason. |
| Refresh token expired (Testing consent screen, 7 days) | `invalid_grant` → re-mint and publish-to-Production reason. |
| Customer sits under a manager account without `login_customer_id` | `USER_PERMISSION_DENIED` → set-`login_customer_id` reason. |
| Quota | 429 → one-request-per-second reason. No retry. |
| Unknown region or language, or an invalid keyword | `error` before any metrics call. |
| Google hasn't published last month yet | The 16-month window gives one month of slack, because `L` is the latest month present. |
| Keyword merged into a close variant, or dropped by the API | Shown in `closeVariants`, or listed in `unmatched`; never zero-filled. |
| Low volume or missing months | `insufficient_data`, shown as-is in the PRD. |
| Credential leak | Env is scrubbed for both child spawns (R6). Sensitive values never reach Markdown. Reasons come only from response fields. |
| An existing PRD or design without the new section | No change in behaviour (R1). |
| API version sunset | Surfaces as an HTTP 4xx `error` result; the fix is bumping the constant (Q4). |

## Conventions used

- **One shared `core`.** `mcp.ts` is a thin Zod wrapper returning `ok()`/`fail()`.
- **Code style.** TypeScript ESM with `.js` import suffixes, Node ≥ 20 global `fetch` and `AbortSignal.timeout`, Zod 4, and `registerTool` from `@modelcontextprotocol/sdk`.
- **Short, pure modules where possible.** `trend.ts` and `languages.ts` follow `tiers.ts`: tables plus pure functions. `google-ads.ts` is transport and `keywords.ts` is domain.
- **Configuration.** `SPECMANAGER_*` env vars are wired through `.mcp.json` `${user_config.*}`, like `SPECMANAGER_BOARD_PORT`.
- **Tests.** Hand-rolled `selftest-*.ts` scripts with `assert(cond, msg)`. Prompt rules are guarded by `selftest-prompts` positive and negative patterns.
- **Agents.** They inherit tools unless a `tools:` line narrows them, as with `prd-writer` and `designer`.
- **Release hygiene.** Rebuild `server/dist` before committing, and run `claude plugin validate plugins/specmanager`, which also checks `${user_config.KEY}` references against declared options.
- **Latest APIs.** Google Ads REST `v25`, with no developer token, following Google's 2026-09-09 sunset.

## Q1 — Exact error code for Explorer access

The access-levels page says Explorer cannot call `KeywordPlanIdeaService`, but it doesn't name the error code. R7 therefore maps **any 403 or `PERMISSION_DENIED` from the metrics call** (other than the specific codes above) to the Basic-access reason, appending Google's own message. When a real Explorer-access failure is observed during build, record the code and narrow the mapping.

## Q2 — userConfig prompting on fresh install and on update

It is unverified whether adding five optional `userConfig` fields prompts users:

- on a **fresh install**;
- on an **update** of an existing install;
- and whether `default: ""` on a `sensitive` field substitutes cleanly into `env`.

**The plan must include a manual check of both paths.** In each, confirm three things:

1. The fields read as optional.
2. Skipping them doesn't block the plugin.
3. The MCP server boots, and `check_keyword_demand` returns `unavailable`.

## Q3 — Rounding steps behind the floor and threshold

`LOW_VOLUME_FLOOR = 50` and `TREND_THRESHOLD = 0.25` rest on community-observed rounding steps for Keyword Planner volumes, not official documentation. Keep both as named constants, and revisit them after real checks. Changing either is a one-line edit plus the selftest table.

## Q4 — Monthly API versions

Google now releases monthly, and majors sunset on a schedule, so `GOOGLE_ADS_API_VERSION = "v25"` will need periodic bumps. When a version is sunset, the tool returns a readable 4xx `error` result rather than crashing.
