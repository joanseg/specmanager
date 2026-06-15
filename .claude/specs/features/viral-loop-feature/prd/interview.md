---
id: prd-viral-loop-feature-021
featureId: feat-viral-loop-feature
stage: prd
status: draft
stale: false
title: Viral loop feature interview
dependsOn: []
basedOn: {}
generatedBy: agent
version: 1
kind: interview
createdAt: '2026-06-12T13:35:52.632Z'
updatedAt: '2026-06-12T13:35:52.632Z'
---
**Mode:** startup interrogation (demand-risk focus), using the office-hours forcing-question method ([gstack](https://github.com/garrytan/gstack/tree/main/office-hours)).

## Extracted

- **The idea evolved mid-interview** from abstract "viral loop" into a concrete feature: an optional **Prototype add-on to the design stage** — a chip on the board under the design card; clicking opens a working clickable HTML flow of the feature's screens in a new tab.
- **Loop shape:** user builds → prototype → shared public URL → stakeholder clicks through → discreet footer badge "built with ❤️ specmanager.org" → landing site → install funnel.
- **Recipients exist:** both current users have colleagues/stakeholders who would realistically view what they build.
- **But no observed sharing yet:** neither user (nor Joan) has ever actually needed to share a spec or doc for feedback/approval.
- **Decisions made:** ship as **one feature, two phases** — phase 1 local-only clickable prototype (chip → new tab on the user's machine); phase 2 public URL via Netlify or similar, carrying the badge. Buildable independently of the adoption work; the *viral payoff* still depends on the self-serve funnel converting.
- **Share docs on public URL** (approved PRD) is shelved for now — the prototype's publish path gets built first.
- **specmanager.org exists** (corrected during the interview — removes a build from the chain).
- **Measurement:** UTM parameters on the badge link + Google Analytics on specmanager.org.

## Critique

- **Solution-first origin:** the session started with a mechanism ("viral loop") hunting for a justification, and the loop's first link — a user wanting to share — has never been observed once.
- **The conversion link is the weakest:** prototype viewers are stakeholders/consumers, not necessarily people who can or will install a Claude Code plugin; "built with" badges convert at notoriously low rates everywhere.
- **The loop can't outrun the funnel:** badge-clickers land in the same self-serve install path that has never converted a stranger unaided. Independent build, dependent success.
- **At n=2 users, loop math is negligible** — the feature must justify itself on standalone product value (stakeholder-facing prototypes), with virality as upside, not rationale.
- **Attribution gap acknowledged:** GA sees badge → visit; the install itself is unmeasured.
- **Publishing-infra overlap:** phase 2 builds the codebase's first public-publishing layer while a shelved approved feature (doc sharing) covers adjacent ground — reuse must be deliberate.

## Recommended wedge

One feature, two phases as decided — but phase 1 (local clickable prototype chip in the design stage) is the real wedge: pure product value for the proven persona, zero viral dependencies. Phase 2 (public URL + badge + UTM) is deferred scope within the same feature, and its viral payoff is explicitly sequenced behind the self-serve funnel test. Cut: landing-site work (site exists), doc-sharing (stays in the shelved feature).

## Unresolved

- Whether users will actually share prototypes — zero observed instances; pure hypothesis until phase 2 meets reality.
- Whether prototype *viewers* overlap at all with people able to install a Claude Code plugin.
- Install attribution beyond GA site visits (the last mile is dark).
- Phase 2 mechanics: Netlify-style deploy from a local-first plugin (auth, account, secrets), URL lifecycle (expiry, revocation) — and **privacy**: prototypes of unreleased product work published to public URLs needs an explicit consent step.
- Reuse contract: the publish path should be designed so the shelved Share-docs-on-public-URL feature can ride it later.
- How prototype generation extends the existing designer-agent stacked-mockup output into a clickable flow.
- Badge conversion is imagined, not validated — no prior-art benchmark examined.
