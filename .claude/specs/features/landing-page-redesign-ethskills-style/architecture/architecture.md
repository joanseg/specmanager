---
id: arch-landing-page-redesign-ethskills-style-022
featureId: feat-landing-page-redesign-ethskills-style
stage: architecture
status: approved
stale: false
title: Landing page redesign (ethskills style) Architecture
dependsOn:
  - prd-landing-page-redesign-ethskills-style-034
basedOn:
  prd-landing-page-redesign-ethskills-style-034: 5
generatedBy: agent
version: 2
createdAt: '2026-07-13T15:36:33.407Z'
updatedAt: '2026-07-13T15:52:43.520Z'
---
> Based on PRD `prd-landing-page-redesign-ethskills-style-034` (v5, approved) + interview `-033`. **No design doc exists** (design stage empty) — this doc is the visual/structural spec; PRD open questions Q1–Q6 are settled and carried below. **Grounded in the real site**, verified by reading `/Users/joan/Documents/projects/specmanager-site` (Next.js 15 + React 19 + Tailwind v4, static export → Vercel). The site source being unfound was resolved; this architecture is now unconditional.

## Summary

Two coordinated surfaces get a copy + information-architecture + formatting redesign into an ethskills-style **zero→hero guide**: (1) the **specmanager.org** Next.js app in the separate repo `/Users/joan/Documents/projects/specmanager-site`, and (2) the plugin repo's `README.md` at `/Users/joan/Documents/projects/specmanager/README.md`. No plugin/MCP/board-UI/workflow behaviour changes. Both surfaces share verbatim: tagline (**"Your AI agile team, …"**, not "product team"), the flat 7-stage spine, install sequence, meta-repo one-liner, escape-hatch link. **Because the site is content-as-typed-data and its home page has a build-time markdown twin (`scripts/agent-readiness.mts`), cutting/demoting sections is a code change, not just a copy edit** — the twin renderer and content exports move together or `pnpm build` (strict TS) fails. **Cross-repo:** two commits/PRs (site + README), kept in one logical change by a shared sync checklist.

## R1 — Overview & repo-grounding findings (verified) {#overview}

**Anchor:** `overview`.

| Fact | Finding (verified by reading files) |
|------|-------------------------------------|
| Site location | `/Users/joan/Documents/projects/specmanager-site` — sibling repo, **not** vendored in the plugin repo. |
| Stack | **Next.js 15 (App Router) + React 19 + Tailwind v4**, `output: "export"` + `trailingSlash: true` + unoptimized images (`next.config.ts`). Fully static, no server/API. `pnpm` (not npm/yarn). |
| Deploy | **Vercel** (`vercel.json`: `framework:nextjs`, `buildCommand: pnpm build`). `pnpm build` = `next build && tsx scripts/agent-readiness.mts`. Real gate = `pnpm typecheck` + `pnpm lint` + `pnpm build` clean; **no test runner**. |
| Content model | **Content-as-typed-data (load-bearing rule).** Components never hardcode copy — all copy/commands/board data live in typed `content/*.ts`; components import & render. Most copy changes land in `content/`, not JSX. |
| Home composition | `app/page.tsx` stacks 7 sections: `Hero → VibeVsSpec → HowItWorks → PlatformRoadmap → About → TutorialsTeaser → InstallCta`. |
| Board is rendered, not an image | `components/sections/HowItWorks.tsx` + `components/ui/PipelineStage.tsx` render the real kanban as a CSS-grid matrix (`158px repeat(6,1fr)`) from `content/pipeline.ts`. **"There is intentionally no `board.png`."** Cell kinds already include `build` (progress bar) and `walkthrough` (approved phase chips). |
| Agent-readiness coupling | `scripts/agent-readiness.mts` `renderHomeMarkdown()` renders `out/index.md` by **importing named exports** from `content/site.ts` (`compare`, `tutorialsSection`, `about`, `finalCta`, `platformsSection.notify`, …). Removing an export **breaks the strict-TS build** unless the twin is updated in lockstep. |
| Site is itself SpecManager-managed | `specmanager-site/.claude/specs/` has its own features (e.g. `specmanager-marketing-website`, SEO, AI-Agent-Readiness). `CLAUDE.md` there is the site's convention source; its managed block is between `<!-- specmanager:start/end -->`. |
| Design tokens | `app/globals.css` Tailwind v4 `@theme`: `--color-bg #0a0b0f`, `--color-surface #12141b`, `--color-accent #34d6b5` (teal), `--color-violet #9b8cff`, `--color-ink*`. System of record = `specmanager-site/docs/DESIGN.md`. Dark-only. Use token-backed Tailwind colors; no raw hex in components. |
| Reusable primitives present | `components/ui/`: `CommandBlock`, `CopyButton` (client; clipboard + insecure `execCommand` fallback + GA `install_copy`, never throws), `PipelineStage`, `Section`/`Wrap`/`SectionHead`, `Button`/`ButtonLink`, `TutorialCard`, `EmailCaptureForm`, `BrandGlyph`, `YouTubeEmbed`, `JsonLd`, `ContentPageParts`. |
| Plugin README today | Tagline L3 says **"AI product team"** (must become "agile"). Sections: intro → board image (`assets/spemanager-image.png`) → Your team → Good habits → Quick start (6-step install L46–63) → The workflow → The board → Where your work lives → Contributing → Troubleshooting → Links → License. **No `<!-- specmanager:start/end -->` markers in README** (they live in `CLAUDE.md`/`docs/DESIGN.md`); re-grep before editing anyway. |
| Existing README assets | `assets/Specmanager-board.png`, `assets/spemanager-image.png` (note misspelling) — both tracked & referenced. |

## R2 — Tech stack & where it lives {#tech-stack-and-location}

**Anchor:** `tech-stack-and-location`. **Unconditional:** the redesign is an **edit to the existing Next.js app**, not a greenfield build and not a new `site/` dir. No new framework, no new runtime dep is required (the whole redesign reuses existing primitives). Keep `output:"export"`, `trailingSlash:true`, `force-static` on `app/sitemap.ts`/`app/robots.ts`, and the `@/*` path alias. Client-only interactivity stays in `"use client"` components; everything else stays a server component.

Every "add X" below names a real path under `/Users/joan/Documents/projects/specmanager-site` (site) or `/Users/joan/Documents/projects/specmanager` (README).

## R3 — Component & section breakdown (file-by-file) {#page-section-breakdown}

**Anchor:** `page-section-breakdown`. New home composition in `app/page.tsx`: **Hero → HowItWorks (7-stage spine + rendered shipping board + build terminal) → Credibility strip → GitHub CTA.** Removed from composition: `VibeVsSpec`, `PlatformRoadmap`, `About`, `TutorialsTeaser`, `InstallCta` (as standalone sections).

### Hero {#hero}
File: `components/sections/Hero.tsx`, copy in `content/site.ts` (`hero`, and new `heroInstall`/toggle copy). Changes:
- **Tagline** verbatim: *"Your AI agile team, as a Claude Code plugin. From vibe coding to spec'ing and shipping production-ready features."* Replaces the current `hero.headlineLead/Rest/Emphasis` "Stop vibe coding / Start spec driven development".
- **Self-installing init prompt** — paste-into-Claude-Code action box, rendered with the existing `CommandBlock` + `CopyButton` (reuse; already GA-instrumented). Prompt text: check for plugin → walk human through install if missing → run `specmanager-init` with the mode-appropriate placeholder. New copy in `content/install.ts` (e.g. `selfInstallPrompt`).
- **Compact expandable install box above the fold** — `install-box`; the reliable path.
- **New-repo / meta-repo toggle** — `hero-mode-toggle`.
- **Escape-hatch link** — one line *"Don't have Claude Code? →"* → `https://code.claude.com/docs/en/quickstart` (Q4). New copy in `content/site.ts`.
- **Board** — reuse the **rendered** PipelineBoard (see `shipping-half`); a static screenshot is **not** needed on the site (it renders the board deliberately). The current `HeroTerminal` (mini `hero.terminal`) can be kept as flavour or replaced by the install box — design call.

### Hero mode toggle {#hero-mode-toggle}
New client component `components/ui/HeroModeToggle.tsx` (`"use client"`). Two states (New repo / Existing · multi-repo); swaps the visible init command + prompt placeholder:
- **New repo:** `/specmanager:specmanager-init`
- **Meta-repo:** `/specmanager:specmanager-init /path-to/repo-1 /path-to/repo-2`
One prose line beside it (in `content/`): workspace folder holds sibling git repos; one meta repo runs SpecManager and orchestrates cross-repo changes; siblings passed to `init` as paths are **read-only** (never written outside the meta root). **No workspace-layout diagram** (Q5).

### Compact install box {#install-box}
New client component `components/ui/InstallBox.tsx` — a small, collapsed-by-default disclosure (native `<details>` is simplest; accordion vs "show steps" is the residual-1 design call), above the fold. Body = the explicit reliable sequence sourced from **`content/install.ts` `installSteps`** (already the single-sourced verbatim commands, mirrored from the plugin README by an explicit honesty constraint). Current `installSteps` = 6 rows (`marketplace add` → `install` → `reload-plugins` → `/mcp` → `init` → `board`); the `/mcp` step needs reconnect + session restart. This box is the guaranteed path so the hero never bets solely on the pasted prompt surviving that restart. Reuse `CommandBlock`/`CopyButton` per row.

### 7-stage guided spine {#stage-cards}
New typed content module `content/stages.ts` (mirrors the content-as-data rule) + a new/extended renderer in `components/sections/HowItWorks.tsx` (or a new `components/ui/StageCard.tsx`). **Flat** list of 7 cards, no optional-stage distinction (Q2), order **Interview → PRD → Architecture → Design → Plan → Build → Walkthrough**. Each card: stage name + 1–2 lines + copyable command chip (`CommandBlock`/`CopyButton`) + a one-line **"you approve: …"**. Commands verbatim (README L79–87): `/specmanager:specmanager-interview`, `-prd`, `-architecture`, `-design`, `-plan`, `-build … next`, `-walkthrough … <phase>`. Card copy keeps the loop legible so "flat" ≠ "7 mandatory before shipping". Note: `content/pipeline.ts` is the **board matrix** (feature rows × stage columns), a *different* artifact from these guide cards — don't conflate; `stages.ts` is net-new.

### Shipping-half treatment {#shipping-half}
Delivers the "shipped" half (Q3) with **the already-rendered board**, not a new image: `content/pipeline.ts` already encodes a feature mid-ship — row **"Checkout corridor"** has `build percent:100, meta:"28/28 · 6 phases"` and a `walkthrough` cell with Phase A/B `approved`; **"Search ranking"** has `build percent:50`. `PipelineStage.tsx` renders build progress bars + approved walkthrough chips. Action: keep this rendered board as the shipping evidence (optionally retune one row's copy so Build-progress + approved-Walkthrough reads unmistakably as "a feature shipping"). Plus add a short **build terminal snippet** of `/specmanager:specmanager-build <feature> next` output near the Build/Walkthrough columns — reuse the hero terminal-line pattern (`hero.terminal` shape in `content/site.ts`) or a small new terminal block; snippet source is residual-2 (real captured vs trimmed representative). **README** (which can't render) uses a static screenshot from `assets/` instead — see `assets-and-data`.

### Credibility strip {#credibility-strip}
New `components/sections/Credibility.tsx` merging today's `PlatformRoadmap.tsx` + `About.tsx` into ONE slim strip: keep the testimonial (`content/site.ts` `about.quote`/author) + a platforms-as-direction line (`content/platforms.ts` + `platformsSection.lede`). **Drop the `EmailCaptureForm`** and `platformsSection.notify`. `content/platforms.ts` data is retained (feeds the direction line); `about.stats` optional.

### GitHub CTA {#github-cta}
The **only** CTA — `ButtonLink` to `content/site.ts` `githubUrl` (`https://github.com/joanseg/specmanager`). No email fields anywhere.

### Cut list (verify removed) {#cuts}
- `components/sections/VibeVsSpec.tsx` (the "The Shift" before/after table) — **delete**; remove `compare` export from `content/site.ts`.
- `components/sections/TutorialsTeaser.tsx` (coming-soon cards on the home page) — **delete from `app/page.tsx`**; remove `tutorialsSection` export. **Keep** the `/tutorials` route (`app/tutorials/page.tsx`), `content/tutorials.ts`, and its `vercel.json` redirect + markdown twin — only the *homepage teaser section* is cut, not the route.
- Both `EmailCaptureForm` walls (in `PlatformRoadmap` and `platformsSection.notify`) — **removed**; `components/ui/EmailCaptureForm.tsx` becomes unused (leave in tree or delete; if deleted, note the `NEXT_PUBLIC_FORMSPREE_ID` path goes dead — harmless, it already no-ops when unset).
- `finalCta` band in `components/sections/InstallCta.tsx` — **delete**; remove `finalCta` export. Install moves above the fold (hero), so `InstallCta` as a standalone section is removed from composition (keep a slim `#install` anchor only if the hero "reliable path" wants a deep link — design call).

### Copy-to-clipboard {#clipboard-copy}
**Reuse `components/ui/CopyButton.tsx` as-is** — it already does `navigator.clipboard.writeText` in secure contexts, an `execCommand` textarea fallback otherwise, a transient Copied state, GA `install_copy`, and never throws. No new clipboard code needed. `CommandBlock` wraps it with the accent-colored leading slash-token — reuse for every command chip and install row.

## R4 — Data & assets {#assets-and-data}

**Anchor:** `assets-and-data`. No DB/schema. "Data" = typed content modules + static assets.

**Content modules (site repo `content/`):**
| Module | Change |
|--------|--------|
| `site.ts` | Replace `hero` copy → agile tagline; add hero install-box/toggle/escape-hatch copy; **remove** `compare`, `tutorialsSection`, `finalCta`, `platformsSection.notify`; keep `about` (testimonial) + `platformsSection.lede` for the strip; update `navLinks`/`footer.links` anchors (`#platforms`/`#about`/`#tutorials` sections change). Update `homeTitle`/`description` if hero messaging shifts (feeds `app/layout.tsx` metadata + `softwareApplicationLd`). |
| `install.ts` | Canonical install sequence (already README-mirrored). Add `selfInstallPrompt` + new-repo/meta-repo init variants. Keep the honesty-constraint comment. |
| `stages.ts` | **NEW** — typed 7-stage guide cards (name, blurb, command, youApprove). |
| `pipeline.ts` | Keep (rendered shipping board); optional row-copy retune for shipping legibility. |
| `platforms.ts` | Keep data (direction line). |
| `tutorials.ts` | Keep (used by `/tutorials` route); just not rendered on home. |

**Static assets:**
| Asset | Action |
|-------|--------|
| Site board | **No new screenshot** — the site renders the board from `pipeline.ts`. |
| README board screenshot | GitHub markdown can't render the CSS board, so the **README's** shipping evidence is a **static image**. Reuse `assets/Specmanager-board.png` if it already shows Build-progress + approved-Walkthrough; otherwise **capture a new one** (`/specmanager:specmanager-board` on a mid-ship feature) into `assets/` (e.g. `assets/board-shipping.png`). |
| `assets/spemanager-image.png` | Reuse as-is; do **not** rename (out of scope). |
| `public/llms.txt` (site) | Hand-maintained static asset — **update** to reflect the new copy/structure (it's not auto-generated). |

Palette/type source of truth = the site's own (`globals.css` `@theme` + `docs/DESIGN.md`). ethskills borrow is **structural/tonal only** (verb-led cards, terminal register), never the skin — already satisfied by the existing token system.

## R5 — README rewrite plan {#readme-rewrite-plan}

**Anchor:** `readme-rewrite-plan`. File: `/Users/joan/Documents/projects/specmanager/README.md` (prose only). Per PRD v5 the README is **self-sufficient** — a GitHub-only visitor goes zero→hero without leaving; overlap with the site is intentional.

**Hard rule:** re-grep for `<!-- specmanager:start/end -->` before editing; none exist in README today, but if any appear, leave the enclosed bytes untouched (auto-synced by `core/claude-md.ts`).

**First fix:** L3 **"AI product team" → "AI agile team"** and align the intro to the PRD tagline (the site uses the same).

**New section structure:**
| Section | Content | Shared vs README-only |
|---------|---------|-----------------------|
| Intro + tagline | agile tagline + one-line what-it-is | **shared** tagline |
| Escape hatch | "Don't have Claude Code? →" quickstart link | **shared** |
| Install path | self-installing prompt + explicit install sequence (current Quick start L46–63) | **shared** install sequence |
| Meta-repo one-liner | `init /path-to/repo-1 /path-to/repo-2` + one prose line | **shared** |
| Flat 7-stage guided walkthrough | 7 stages, each: name + 1–2 lines + command + "you approve:" line (same copy as `content/stages.ts`) | **shared** stage framing/commands |
| Shipping evidence | static board screenshot + short `build … next` terminal snippet | shared artifact |
| Where your work lives | in-repo vs meta-repo trees (current L127–171) | **README-only** |
| Contributing / build-from-source | current L175–210 | **README-only** |
| Troubleshooting | current L214–218 | **README-only** |
| Links / License | current L222–228 | **README-only** |

## R6 — Consistency mechanism (two repos) {#consistency-mechanism}

**Anchor:** `consistency-mechanism`. Resolves the PRD's binding constraint and residual-3. The shared copy lives in **two different repos** — site `content/*.ts` and plugin `README.md` — so a shared build-time import is **not** possible (a monorepo is out of scope; don't propose one).

**Recommendation — designated canonical source + honesty-constraint mirroring + a documented sync checklist (low-effort, cross-repo-safe):**
- **Canonical source = the plugin repo.** The plugin `README.md`/plugin itself is the authority for install commands, stage names, and command strings — the site **already** encodes this: `content/install.ts` carries an explicit *"must mirror the SpecManager plugin's README exactly … update this file if the plugin changes"* constraint. Extend that same pattern to the new `content/stages.ts` and the tagline in `content/site.ts` (a header comment naming the plugin README as source of truth).
- **Manual-sync checklist** authored into this feature's **walkthrough doc** (and referenced from both repos' feature notes): "when tagline / any of the 7 stage cards / install sequence / meta-repo one-liner changes, update *both* `specmanager-site/content/*.ts` and `specmanager/README.md` in the same logical change." Enumerate the exact shared strings.
- **Optional lightweight check (nice-to-have, not required):** a tiny `scripts/check-copy.mts` in the site repo (runs in `pnpm build`/CI there) that asserts the shared strings in `content/*.ts` match a checked-in snapshot of the README's shared spans (fetched/vendored) — flagged as optional because cross-repo it adds a vendoring step; the honesty-constraint + checklist is the realistic default.
- **Do not auto-generate the README** — it carries hand-authored depth sections; regeneration would clobber them.

## R7 — Build, deploy & cross-repo delivery {#build-and-deploy}

**Anchor:** `build-and-deploy`.
- **Site build/deploy:** `pnpm build` = `next build && tsx scripts/agent-readiness.mts` → static `out/` → **Vercel**. **Critical:** the redesign **must update `scripts/agent-readiness.mts` `renderHomeMarkdown()` in lockstep** — it imports `compare`, `tutorialsSection`, `about`, `finalCta`, `platformsSection.notify` from `content/site.ts`; removing those exports breaks the strict-TS `tsx` post-build (and the emitted `out/index.md` twin must stay faithful to the new page). Also verify the markdown twin, `Content-Signal` robots injection, `routeRenderers`, and the `vercel.json` Accept-conditioned redirects still pass (the `/tutorials/`, `/spec-driven-development/`, `/vibe-…/` routes and their twins **remain**). Keep `force-static` on `sitemap.ts`/`robots.ts`. Verify with `pnpm typecheck && pnpm lint && pnpm build` (the real gate) and confirm the change in `out/`, not just `pnpm dev`.
- **No new runtime deps** — the redesign reuses existing primitives (`CommandBlock`, `CopyButton`, `PipelineStage`, `Section`, `Button`). New files are the only additions (`InstallBox.tsx`, `HeroModeToggle.tsx`, `StageCard`/`Credibility.tsx`, `content/stages.ts`).
- **README:** no build; ships by merge. Fix tagline; keep managed markers untouched (none present).
- **Cross-repo delivery (state plainly):** **two commits/PRs** — the site half in `specmanager-site`, the README half in `specmanager` — there is no shared build boundary. They are kept in one logical change by (a) the shared feature slug, (b) the sync checklist in the walkthrough, (c) landing them together and cross-linking the two PRs.

## Failure & edge cases

- **`/mcp` reconnect + restart eats the pasted prompt** — mitigated: the `install-box` reliable path is above the fold; the hero never depends solely on the prompt (retires the interview's load-bearing risk).
- **Removing `content/site.ts` exports breaks the build** — `agent-readiness.mts` imports them; update the twin renderer in the same commit or `pnpm build` fails (this is a feature, not a bug — the twin can't silently reference a cut section).
- **Clipboard in insecure context** — already handled by `CopyButton`'s `execCommand` fallback; specmanager.org is HTTPS regardless.
- **Board-data drift vs plugin reality** — `pipeline.ts` is illustrative; a plugin board redesign would stale it (existing accepted condition; honesty constraint already documented in the file).
- **README screenshot drift** — static image; re-capture when the board UI changes.
- **Copy divergence across repos** — the honesty-constraint comments + sync checklist (and optional `check-copy.mts`) guard it.
- **Cutting the homepage TutorialsTeaser must not break the `/tutorials` route** — verify `content/tutorials.ts`, `app/tutorials/page.tsx`, the `vercel.json` redirect, and the tutorials markdown twin still build.

## Conventions used

- **Content-as-typed-data** — all copy edits land in `content/*.ts`, not JSX (site's load-bearing rule).
- **Reuse over rebuild** — `CopyButton`/`CommandBlock`/`PipelineStage`/`Section` reused; no new clipboard or board code; no new deps (matches global "be simple, don't overengineer").
- **Static-export invariants** — keep `output:"export"`, `trailingSlash:true`, `force-static` metadata routes, unoptimized images, `pnpm`.
- **Token-backed colors only** — Tailwind v4 `@theme` tokens; no raw hex in components; dark-only.
- **Server components by default; `"use client"`** only for the new interactive `InstallBox`/`HeroModeToggle` (mirrors `CopyButton`/`EmailCaptureForm`).
- **Honesty constraint** — install commands mirror the plugin README verbatim (existing rule in `content/install.ts`), extended to stages/tagline.
- **Managed-marker discipline** — README `<!-- specmanager:start/end -->` never hand-edited (none present; re-grep).
- **Build-gated verification** — `pnpm typecheck && pnpm lint && pnpm build`, confirm in `out/` (no test runner).

## R8 — Open questions / risks {#open-questions}

**Anchor:** `open-questions`. (The two prior blockers — site location & stack — are **resolved**; none below is blocking.)
1. **`InstallCta` disposition** — delete the standalone install section entirely (install lives in hero) vs keep a slim `#install` deep-link anchor for the reliable path. Design call.
2. **HeroTerminal fate** — keep the existing mini terminal (`hero.terminal`) as flavour alongside the install box, or replace it. Design call.
3. **Install-box affordance** (residual 1) — native `<details>` vs accordion vs "show steps"; small-footprint constraint only.
4. **Build terminal snippet source** (residual 2) — real captured `build … next` transcript vs trimmed representative; reuse the `hero.terminal` line shape.
5. **README shipping screenshot** — is `assets/Specmanager-board.png` already a Build-progress + approved-Walkthrough shot, or is a new capture needed? Confirm/stage a mid-ship feature.
6. **Install sequence length** — `content/install.ts`/README show 6 steps (incl. `/mcp` + `board`); the coordinator brief said "4-step install." Reconcile the canonical count across hero box + README (assume the existing 6-step `installSteps` is authoritative unless told otherwise).
7. **Consistency check depth** — honesty-constraint + checklist (default) vs adding the optional cross-repo `scripts/check-copy.mts`. Confirm the lighter default is acceptable.
8. **Site's own SpecManager pipeline** — `specmanager-site` is itself SpecManager-managed with a `specmanager-marketing-website` feature; confirm this redesign is driven as a feature there (its own PRD/plan) or landed directly. Coordinate so the site repo's own lifecycle isn't bypassed.
