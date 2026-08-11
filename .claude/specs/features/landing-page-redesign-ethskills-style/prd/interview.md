---
id: prd-landing-page-redesign-ethskills-style-033
featureId: feat-landing-page-redesign-ethskills-style
stage: prd
status: draft
stale: false
title: Landing page redesign (ethskills style) interview
dependsOn: []
basedOn: {}
generatedBy: agent
version: 1
kind: interview
createdAt: '2026-07-13T15:02:32.934Z'
updatedAt: '2026-07-13T15:02:32.934Z'
---
_Mode: builder / design-thinking. Forcing questions via the [gstack office-hours](https://github.com/garrytan/gstack/tree/main/office-hours) method._

## Extracted

- **Page's job:** a _guide_, not a pitch. Genre change: conversion funnel → zero-to-hero guide.
- **Audience:** cold arrivals from YouTube / LinkedIn / Reddit / HN posts.
- **Zero:** visitor already has Claude Code installed and working (page may assume this).
- **Hero (success):** visitor has installed the plugin **and** shipped their first feature through the full SpecManager workflow — on a new or existing project. Page's responsibility ends there.
- **Borrow from ethskills:** structure and tone (single page, verb-led card list, copy-paste-first, terminal register) — **not** the skin. SpecManager keeps its own palette/type, and the kanban **board screenshot is in** (the one deliberate image ethskills' format wouldn't allow).
- **Spine:** the **7 workflow stages** in order (Interview → PRD → Architecture → Design → Plan → Build → Walkthrough), as the ethskills-style card list. Reads as the journey itself.
- **Stage card =** stage name + 1–2 lines + a **copyable slash-command chip** + a one-line "**you approve:** …" — so each card teaches the loop (Claude drafts → you approve → next unlocks).
- **Hero action box:** a **self-installing init prompt** the visitor pastes into Claude Code. It opens with the install steps (checks for the plugin, walks the human through install if missing), _then_ runs `specmanager-init` with their placeholders. Full install details referenced, deferred lower down (ethskills "Persistent Setup" pattern).
- **Hero toggle — two genuinely different modes:**
  - **New repo** — `init` inside a fresh/single repo.
  - **Existing / multi-repo workspace = meta-repo mode** — a workspace folder holds sibling git repos; one is the meta repo that runs SpecManager and orchestrates cross-repo changes. Placeholder is the sibling repo paths: `/specmanager:specmanager-init /path-to/repo-1 /path-to/repo-2`. SpecManager reads the siblings read-only and keeps one orchestration home. The guide names this in one line near the hero prompt.
- **Tagline:** _"Your AI agile team, as a Claude Code plugin. From vibe coding to spec'ing and shipping production-ready features."_
- **Roadmap / testimonial:** **demoted** to a slim strip near the bottom (keep a platforms line + the testimonial for credibility); **drop both email-capture walls.**

## Critique

- **The self-installing prompt is the riskiest single element.** `/specmanager:specmanager-init` fails for the not-yet-installed visitor — which is _everyone_ arriving cold. The whole hero rests on a pasted prompt reliably making Claude (a) detect the missing plugin, (b) run the 4-step install _including the `/mcp` reconnect, which needs a session restart_, then (c) run init. That reconnect/restart step may not survive a single paste — load-bearing and currently **unverified**.
- **"Assume Claude Code installed" narrows the funnel** the README deliberately widens. The README courts _non-technical founders_; "zero = Claude Code already working" quietly excludes the least technical arrivals. Fine as a scoping call, but it's a call.
- **7 cards may over-segment.** Interview and Design are both _optional_ stages; giving them equal card weight to PRD/Plan/Build could make the guide read as 7 mandatory steps when the real spine is 5.
- **Two success events, one page.** "Installed" and "shipped first feature" are very different scroll-depths of commitment. Build/Walkthrough are the hardest stages to convey statically, so the "hero" half risks being gestured at, not delivered.

## Recommended wedge

The narrowest page that still delivers zero→hero:

- Hero: tagline + self-installing init prompt (new-repo / meta-repo toggle) + board screenshot.
- One card row: the **7 stages**, each with command chip + "you approve" line.
- One line near the hero naming the **meta-repo** concept.
- One slim "install / requirements" strip (the deferred detail) + one slim credibility strip (testimonial + platforms-as-direction).
- GitHub link as the only CTA.

Explicitly **cut** vs. today's page: both email-capture walls, the two "coming soon" tutorial cards, the before/after "The Shift" comparison table, the final conversion CTA section.

## Unresolved

- Does a single pasted prompt reliably drive install through the **`/mcp` reconnect + session restart**? If not, the hero needs a fallback (caveat line, or install-box-first ordering). **Test before committing the hero.**
- Do the 7 cards visually distinguish **optional** stages (Interview, Design) from the core 5, or present flat?
- How does a static page convey the **Build + Walkthrough** half of "hero" (shipping is execution, not documents)? Screenshot? Terminal cast? Open.
- Is "assume Claude Code installed" final, or does the page need a one-line "don't have Claude Code? →" escape hatch?
- Does the page show the meta-repo **workspace layout** (the `A/` folder with siblings + `repos/<name>/` nested docs) as a diagram, or just the one-line prompt? A diagram teaches it but adds weight to a lean guide.
