---
id: prd-landing-page-redesign-ethskills-style-034
featureId: feat-landing-page-redesign-ethskills-style
stage: prd
status: approved
stale: false
title: Landing page redesign (ethskills style) PRD
dependsOn: []
basedOn: {}
generatedBy: human
version: 5
createdAt: '2026-07-13T15:04:43.787Z'
updatedAt: '2026-07-13T15:31:58.874Z'
---
## Problem

Today's specmanager.org is a **conversion funnel**: Hero → terminal demo → "The Shift" before/after → six-stages board mockup → Platforms roadmap (email capture) → testimonial → two "coming soon" tutorials (email capture) → install buried at section 8 → final CTA → footer. It is built to *capture*, not to *activate*. A cold arrival (YouTube / LinkedIn / Reddit / HN) can't get from "I have Claude Code" to "I've installed the plugin and shipped a feature" without hunting past two email walls for an install block that sits eighth on the page.

This redesign changes the page's **genre** from pitch to **zero-to-hero guide** — a single-page, verb-led, copy-paste-first walkthrough in the structural/tonal register of ethskills.com, keeping SpecManager's own palette/type and the kanban board screenshot. **Scope is copy, information architecture, and formatting of the marketing/guide site only** — not a plugin rebuild. A secondary problem: the site and the repo **README.md** must not diverge — both surfaces should independently take a visitor zero→hero with the same tagline, the same stage framing, and the same install path. Overlap between them is intentional; the requirement is consistency, not non-duplication.

## Users & jobs-to-be-done

| User | Job |
|------|-----|
| Cold arrival from a YouTube / LinkedIn / Reddit / HN post, Claude Code already installed | "Show me exactly what to paste to install this and start, then walk me through the loop until I've shipped a feature." |
| Same visitor, existing/multi-repo workspace | "I don't have one clean repo — tell me how to point SpecManager at my sibling repos and orchestrate from a meta repo." |
| Arrival via the GitHub README | "Take me from nothing to shipped without leaving GitHub — same story as the site, no click-through required." |
| Arrival without Claude Code yet | "I don't have Claude Code — point me to how to get it, then bring me back." |

**Zero** (starting state, assumed): visitor already has Claude Code installed and working.
**Hero** (success): visitor has installed the plugin **and** shipped their first feature through the full workflow, on a new *or* existing project. The page's responsibility ends there.

## Goals / non-goals

**Goals**

- The page reads as a **guide, not a pitch**: single page, ethskills-style verb-led card list, copy-paste-first, terminal register.

- **Hero** carries: the tagline, a **self-installing init prompt** (paste-into-Claude-Code action box), a **compact expandable install box above the fold**, the **board screenshot**, and a one-line **escape-hatch link** for visitors without Claude Code.
  - Tagline, verbatim (normalise spelling): *"Your AI agile team, as a Claude Code plugin. From vibe coding to spec'ing and shipping production-ready features."*
  - **Two install paths, both above the fold (resolves Q1):**
    1. The **self-installing init prompt** — pasted into Claude Code, it opens with install steps (checks for the plugin, walks the human through install if missing), *then* runs `specmanager-init` with placeholders.
    2. A **compact, expandable/collapsible install box** carrying the explicit install sequence (add marketplace → install → `/reload-plugins` → `/mcp` reconnect + session restart → `specmanager-init`). It is small/collapsed by default so it doesn't dominate the hero, but present above the fold as the **reliable** path — the hero never bets solely on the pasted prompt surviving the `/mcp` reconnect + restart.
  - **Hero mode toggle — two modes:** (1) **New repo** — `init` in a fresh/single repo; (2) **Existing / multi-repo workspace (meta-repo mode)** — placeholder is sibling repo paths passed to init: `/specmanager:specmanager-init /path-to/repo-1 /path-to/repo-2`. The meta-repo concept is conveyed by **this one-liner prompt plus one line of prose** near the hero — **no workspace-layout diagram** (resolves Q5).
  - **Escape hatch (resolves Q4):** a one-line *"Don't have Claude Code? →"* link to `https://code.claude.com/docs/en/quickstart`, present on **both** the site and the README.

- **Spine = the 7 workflow stages in order** (Interview → PRD → Architecture → Design → Plan → Build → Walkthrough) as the ethskills-style card list — the journey itself. **All 7 cards are presented flat** — no visual distinction for the optional Interview/Design stages (resolves Q2). The README uses the same flat 7-stage framing.
  - **Each stage card:** stage name + 1–2 lines + a **copyable slash-command chip** + a one-line "**you approve:** …" that teaches the loop (Claude drafts → you approve → next unlocks).

- **Conveying the shipping half (Build + Walkthrough) (resolves Q3):** deliver the "shipped" half of hero with two concrete artifacts, not prose gestures:
  1. The **board screenshot shows a feature mid-ship** — Build phases progressing (per-phase progress bars) and an **approved Walkthrough card** — so "shipped" is visible state, not a claim.
  2. A short **terminal snippet** of `/specmanager:specmanager-build <feature> next` output (a phase building → tasks done), in the page's terminal register, near the Build/Walkthrough cards.

- **Demote, don't delete:** roadmap + testimonial collapse into one slim credibility strip near the bottom (keep a platforms/direction line + the testimonial). GitHub link is the only CTA.

- **Visual borrow is structural/tonal only:** SpecManager keeps its own palette/type; board screenshot stays in.

- **Site and README both take a visitor zero→hero (coordinated goal, overlap intentional).** The repo `README.md` is reviewed and revised in the same pass so that **a visitor who never leaves GitHub can go zero→hero from the README alone.** The README carries the tagline, the install path (self-installing prompt / compact install box), the meta-repo one-liner, the escape-hatch link, **and the full flat 7-stage guided walkthrough** — the same drafts→approve→next-unlocks loop the site teaches. **Overlap with the site is deliberate, not drift:** the two surfaces share the walkthrough content; the constraint is that they stay *consistent* (identical tagline, identical stage names/framing, identical commands, identical install sequence, identical meta-repo one-liner), not that they avoid repeating each other. Division of what is *additionally* distinct:

  | Surface | Shared (both carry it) | Additionally owns |
  |---------|------------------------|-------------------|
  | **Site (specmanager.org)** — zero-to-hero guide | Tagline · install path · meta-repo one-liner · escape-hatch link · the flat 7-stage guided walkthrough (command chips + "you approve" lines) | The ethskills-style visual/formatting treatment (verb-led cards, terminal register, board screenshot, slim credibility strip) |
  | **README** — repo front door | Same tagline · same install path · same meta-repo one-liner · same escape-hatch link · the same flat 7-stage guided walkthrough | Repo-only depth: "where your work lives" (file layout) · contributing / build-from-source · troubleshooting · license |

  Any copy decision changed on the site in this feature — tagline wording, stage names, the meta-repo one-liner, the walkthrough copy — is reflected in the README in the same pass so the two stay consistent.

**Non-goals**

- Not a rebuild of the plugin, its server, UI, or any workflow behaviour — copy/IA/formatting of the site (and the aligning README prose) only.
- **Explicitly cut vs today's page:** both email-capture walls; the two "coming soon" tutorial cards; the before/after "The Shift" comparison table; the standalone final-CTA section.
- **No meta-repo workspace-layout diagram** — the one-liner prompt + one line of prose carries it (decided).
- Not changing the SpecManager-managed CLAUDE.md/README block **mechanics** — the README edit is prose only (see Constraints).

## Success metrics

Content/comprehension and activation, not plugin internals:

- **Install→ship activation:** a visitor who lands cold can, from the page alone, install the plugin and ship a first feature — measured by qualitative walkthrough with 3–5 target-profile testers completing zero→hero without leaving the page for external docs.
- **Install-box reliability:** a tester who cannot get the pasted prompt through the `/mcp` reconnect + restart still completes install via the compact install box — no dead end.
- **Comprehension:** a first-time reader can state, unprompted after one scroll, (a) what SpecManager is, (b) the drafts→approve→next-unlocks loop, and (c) which command starts them.
- **Time-to-first-paste:** the hero action box is the first actionable element; testers reach and paste it without scrolling past a wall.
- **Shipping legibility:** a tester can point to where the page shows a feature actually shipping (the board screenshot's Build progress + approved Walkthrough card, and the build terminal snippet).
- **Scope adherence:** zero email-capture fields on the page; install instructions above the fold, never buried at section 8.
- **Meta-repo recognition:** a multi-repo visitor identifies the meta-repo path prompt as their entry point.
- **Both surfaces independently ship a visitor zero→hero:** a tester handed *only* the README completes install→first-feature-shipped without visiting the site, and a tester handed *only* the site does the same — and the two carry identical tagline, identical flat 7-stage framing, identical commands, and identical install sequence, with no contradictory copy.

## High-level user flows

**New-repo visitor (primary):**
- Lands → reads tagline + sees board screenshot → hero toggle on "New repo" → **either** copies the self-installing init prompt **or** expands the compact install box for the explicit sequence → installs → `specmanager-init` runs → scrolls the flat 7-stage card list, copying each command chip and approving each stage in the board → sees the Build progress + approved Walkthrough (screenshot + build terminal snippet) → ships first feature.

**Meta-repo / multi-repo visitor:**
- Lands → reads the one-line meta-repo note near the hero → flips hero toggle to "Existing / multi-repo workspace" → copies the init prompt with sibling-path placeholders (`/path-to/repo-1 /path-to/repo-2`) → SpecManager reads siblings read-only, orchestrates from the meta repo → follows the same 7-stage spine.

**No-Claude-Code visitor:**
- Lands → clicks the "Don't have Claude Code? →" link to `https://code.claude.com/docs/en/quickstart` → installs Claude Code → returns → enters the new-repo flow.

**GitHub-first visitor:**
- Lands on the README → reads what SpecManager is + the shared tagline → follows the install path (self-installing prompt / install box, or the escape-hatch link) → works the same flat 7-stage walkthrough **without leaving GitHub** → ships first feature. (May visit specmanager.org for the richer visual treatment, but never has to.)

**Reference / credibility:**
- Any visitor scrolls to the slim credibility strip (testimonial + platforms-as-direction), then to the GitHub CTA.

## Constraints & assumptions

- **Scope = content/formatting**, not engineering. No plugin/server/UI code changes.

- **README edit is part of this feature's deliverable**, scoped to the README's **hand-written prose** (what-it-is, install, the full zero→hero walkthrough, run modes, where-your-work-lives, contributing, troubleshooting, links, escape hatch). **Do not touch the SpecManager-managed block mechanics** — the managed region between `<!-- specmanager:start -->` / `<!-- specmanager:end -->` is auto-synced by the plugin; edits stay in the human-authored prose outside/around those markers.

- **Zero-state assumption with escape hatch:** both surfaces assume the visitor has Claude Code installed and working. This narrows the funnel the README widens (non-technical founders); the accepted mitigation is the one-line *"Don't have Claude Code? →"* link to `https://code.claude.com/docs/en/quickstart` on both surfaces — the narrowing is deliberate and now has its escape hatch.

- **Install reliability handled by design (not deferred):** because the compact expandable install box carries the explicit sequence above the fold, the hero no longer bets on the self-installing prompt surviving the `/mcp` reconnect + session restart. The pasted prompt is the fast path; the install box is the guaranteed path. (This retires the earlier MUST-verify risk.)

- **Meta-repo model (from the meta-repo feature PRD):** a workspace folder holds sibling git repos; one is the meta repo that runs SpecManager and orchestrates cross-repo changes; siblings are declared by passing their paths to `specmanager-init` and are **read-only** (SpecManager never writes outside the meta root). Both the page and the README must represent this accurately and identically — via the one-liner prompt + one line of prose, no diagram.

- **7-stage spine is presented flat** on both surfaces (Interview and Design are optional stages but get equal card weight); the copy of each card should still make the loop legible so "flat" doesn't read as "all 7 are mandatory before you can ship."

- **Consistency is the binding constraint, not non-duplication.** The site and README intentionally repeat the walkthrough; the deliverable must keep the shared content (tagline, stage names/framing, commands, install sequence, meta-repo one-liner) byte-consistent across both so overlap never becomes divergence.

- **Assets:** the board screenshot is the one deliberate image and must show a feature with Build phases progressing + an approved Walkthrough card (so it doubles as the "shipped" evidence); SpecManager's existing palette/type are the source of truth.

## Open questions

*All six interview open questions are resolved into requirements above. Minor residuals to settle during design/build, none blocking:*

1. **Install-box affordance detail:** exact collapsed/expanded interaction for the compact install box (accordion vs "show steps" toggle) — a design-time call, constrained only by "small footprint, above the fold."
2. **Build terminal snippet source:** use a real captured `/specmanager:specmanager-build <feature> next` transcript vs a trimmed representative one — pick whichever reads cleanest without misrepresenting output.
3. **Walkthrough copy reuse mechanism:** since the site and README now carry the same 7-stage walkthrough, decide whether the copy is authored once and shared/generated into both, or maintained in parallel — a keep-consistent implementation detail, not a scope question.
