---
id: prd-share-docs-on-public-url-014
featureId: feat-share-docs-on-public-url
stage: prd
status: draft
stale: false
title: 'Interview: Share docs on public URL'
dependsOn: []
basedOn: {}
generatedBy: agent
version: 1
kind: interview
createdAt: '2026-06-11T19:09:35.653Z'
updatedAt: '2026-06-11T19:09:35.653Z'
---
# Interview: Share docs on public URL

_Pre-PRD interview run 2026-06-10 via `/specmanager-interview` (startup-interrogation mode, office-hours forcing questions). Original working title: "publish board on public url". All eight planned areas were covered._

## Extracted

- **Problem:** non-technical stakeholders refuse to install Claude Code, so they can't review specs that live in the repo; they need a zero-friction way to read the board and docs.
- **Demand evidence:** exactly one instance, second-hand — an AI-adoption lead Joan demoed SpecManager to, whose stakeholders rejected Claude Code; he solved it with a Linear integration that works fine today. The public-URL idea was Joan's afterthought, never shown to him.
- **Hard constraint:** the source of truth must stay in the repo (`.claude/specs/...`) because that's what makes the docs useful to Claude Code. This rules out moving docs into Linear/Confluence, but not syncing outward to them.
- In the one real-world reference case, stakeholder review meant read **+ comment + sign-off that gated work**.
- **Decisions made in-session:** v1 is **read-only**; **snapshot publish** ("hit publish" → static pages), not a live server; **secret unguessable link** for v1, real login later; **bring-your-own hosting**, with sprites.dev as a suggested default for users without one.

## Critique

- Demand is a hypothesis, not a fact: one second-hand case, already solved, and nobody — including Joan — needs this today. The strongest version of this feature currently lives in one demo conversation.
- The only observed stakeholder behavior includes comment and sign-off; the v1 wedge cuts both. There's a real risk read-only snapshots are a toy that fails the stakeholder's actual job (gating work).
- Joan's own trend claim — PMs increasingly living in Claude Code, or spinning the board up via Cowork — *shrinks* the audience for a public URL over time. The feature may be solving last year's stakeholder.
- Three competing solution shapes surfaced (public URL, outbound Linear/Confluence/Jira sync, Cowork spin-up); the public URL won by default, not by evidence. Outbound sync actually matches the only validated behavior.
- Success criteria are soft (demo approval, interview sentiment) rather than usage events.

## Recommended wedge

A "publish snapshot" action: render the current board and docs to static HTML, deploy to the publisher's own hosting via **one** adapter, served behind an unguessable URL. Explicitly cut: live serving, comments, sign-off, login, Linear/Confluence/Jira integrations, multiple hosting adapters, any SpecManager-operated hosting. Before building even that, the cheapest next step is a 10-minute validation: show the demo contact a mocked snapshot and ask if his stakeholders would have accepted it *without* sign-off.

## Unresolved

- Zero first-party demand — no one has asked Joan for this; unvalidated with the one named person.
- Is read-only-without-sign-off actually useful to people whose role is approval?
- sprites.dev as default host: capabilities, unguessable-URL support, API, terms — all unverified.
- Which docs get published (approved only? drafts? walkthroughs?) — never discussed.
- Snapshot staleness: should published pages show their publish date / a "may be outdated" marker?
- Whether outbound sync to Linear/Confluence is the better first wedge — deferred, not killed.
- The Cowork spin-up alternative — unexamined competing shape.
- "PMs are moving into Claude Code" — imagined trend, no observation attached.
