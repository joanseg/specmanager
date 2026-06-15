---
id: prd-viral-loop-feature-022
featureId: feat-viral-loop-feature
stage: prd
status: approved
stale: false
title: Viral loop feature PRD
dependsOn: []
basedOn: {}
generatedBy: human
version: 2
createdAt: '2026-06-12T13:38:58.836Z'
updatedAt: '2026-06-12T13:49:13.613Z'
---
> Grounded in the pre-PRD interview (`interview.md`, this feature's prd folder). Per the interview's own critique, this feature is justified on **standalone product value** — clickable prototypes for stakeholder-facing users — with virality treated as upside, not rationale.

## Problem

SpecManager's design stage produces stacked high-fidelity HTML mockups. They show what screens look like, but a stakeholder cannot _walk through_ the feature: there is no way to click from screen to screen, feel the flow, and react to it as a product rather than a picture.

For product-minded users (PMs, founders, design-adjacent engineers), the moment that matters is showing someone else the feature before it is built. Today that means screen-sharing static mockups or narrating over them. A working clickable flow closes that gap with near-zero extra effort, since the design artifacts already exist.

Secondarily, every prototype that travels outside the user's machine is an organic exposure surface for SpecManager itself. The interview was explicit about the demand risk here: **no instance of a user wanting to share a spec or prototype has been observed yet** (n=2 users, zero observed shares). The viral loop is therefore a hypothesis the feature is structured to test cheaply — not the reason to build it.

## Users

- **Primary: the SpecManager user as presenter.** A PM or product-minded builder running the lifecycle on their own project. Job-to-be-done: _"Let me click through the feature myself, and show colleagues/stakeholders a working flow, so we can align on what we're building before any code exists."_ Both current users have real colleagues/stakeholders who would view what they build.

- **Secondary: the stakeholder as viewer.** A colleague, client, or decision-maker who receives a prototype. Job-to-be-done: _"Let me experience the proposed feature in 2 minutes without installing anything."_ They consume; they do not operate SpecManager. (Whether any of them overlap with potential installers is an open question, not an assumption.)

- **Tertiary (phase 2, hypothesis): the curious viewer.** A viewer who notices the footer badge, visits specmanager.org, and potentially enters the install funnel.

## Goals / non-goals

### Goals

1. **Prototype add-on to the design stage.** An optional, per-feature Prototype artifact rendered as a **chip on the board under the design card**. Clicking the chip opens a working clickable HTML flow of the feature's screens in a new browser tab.
1. **One feature, two phases** (settled in the interview):

   - **Phase 1 — local clickable prototype.** Generated from the feature's design-stage screens; opens locally on the user's machine. Pure product value, zero external dependencies. This is the wedge.

   - **Phase 2 — public URL.** One-action publish of the prototype to a public URL (Netlify or similar), carrying a discreet footer badge — "built with ❤️ specmanager.org" — whose link carries UTM parameters.
1. **Measurable exposure (phase 2).** Badge clicks land on specmanager.org and are visible in Google Analytics via the UTM parameters. The site already exists; no site work is in scope.
1. **Reusable publish path (design requirement, not implementation).** Phase 2's publish mechanism must be designed so the shelved "Share docs on public URL" feature (`feat-share-docs-on-public-url`, approved PRD) can ride the same path later. We are not building doc sharing now; we are avoiding a second, incompatible publishing layer later.
1. **Optionality preserved.** The prototype is an add-on: nothing in the lifecycle gates on it, and it gates nothing. A feature without a prototype behaves exactly as today.

### Non-goals

- **No landing-site work.** specmanager.org exists; this feature only points at it.

- **No doc sharing.** Publishing PRDs/architecture/plan docs stays inside the shelved Share-docs feature.

- **No dependency on the adoption/funnel work.** This feature builds and ships independently of `feat-user-adoption-acceleration`. The _viral payoff_ of phase 2 depends on the self-serve funnel converting, but the _build_ does not — and phase 1's value depends on neither.

- **No prototype editor.** The prototype is generated output; users iterate by iterating the design, not by editing the prototype.

- **No solution design here.** How generation, hosting, and the chip are implemented belongs to the Architecture stage.

## Success metrics

**Phase 1 (product value — primary):**

- The prototype chip is used: prototypes are generated for a meaningful share of features that reach the design stage (directional target: ≥ half, given the tiny user base — treat as signal, not statistics).

- Qualitative: at least one real instance of a user clicking through a prototype with a stakeholder and reporting it changed or accelerated a decision.

**Phase 2 (sharing + exposure — hypothesis test):**

- **The demand test:** at least one organic publish of a prototype to a public URL by a user who wasn't prompted to. Zero observed shares to date makes this the single most informative number.

- Badge-attributed sessions on specmanager.org (GA, via UTM) > 0; ratio of badge clicks to prototype views once view counts exist.

- Acknowledged gap: GA measures badge → site visit only. Visit → install is currently dark (open question below).

## Constraints & assumptions

- **Local-first plugin.** SpecManager runs entirely on localhost with no auth and no backend. Phase 1 must work fully offline. Phase 2 introduces the codebase's **first** outbound publishing capability — auth/tokens, secrets handling, and account linkage for the host are all new ground (open questions).

- **Builds on the designer agent's output.** Prototypes derive from the existing design-stage artifact: a single self-contained HTML file of stacked high-fi mockups. How that becomes a multi-screen clickable flow is unresolved (open question) and constrains feasibility.

- **Design stage is optional**, therefore the prototype is doubly optional: no design, no prototype chip.

- **Privacy is a hard constraint for phase 2.** Prototypes depict unreleased product work. Publishing must be deliberate and consented — never a side effect (open question on the exact consent mechanics; the requirement itself is settled).

- **Assumption (marked):** a self-contained static HTML artifact is sufficient for the clickable flow — no server-side rendering needed at view time. This makes static hosting (Netlify-class) viable for phase 2.

- **Assumption (marked):** the badge can be discreet enough not to embarrass a user in front of stakeholders while remaining noticeable. Badge conversion rates are imagined, not validated — no prior-art benchmark was examined in the interview.

- **Sequencing:** phase 1 ships first and stands alone. Phase 2's viral payoff is explicitly sequenced behind the self-serve funnel proving it can convert; shipping phase 2 before then tests sharing demand, not install conversion.

## High-level user flows

**Flow 1 — generate and view locally (phase 1):**

- Feature has an approved/working design with screens.

- User requests a prototype (command or board affordance — exact trigger TBD in architecture).

- A Prototype chip appears on the board under the feature's design card.

- Clicking the chip opens the clickable flow in a new tab; the user clicks through screens following the feature's intended navigation.

- Design changes → prototype regenerates (or is marked out of date — staleness behavior TBD).

**Flow 2 — show a stakeholder (phase 1):**

- User opens the prototype in a tab and walks a stakeholder through it (in person or screen-share).

- Stakeholder reacts to a working flow rather than static frames; feedback loops back into the design stage as usual.

**Flow 3 — publish to a public URL (phase 2):**

- From the prototype, user chooses to publish.

- An explicit consent step states that the prototype will become publicly reachable.

- The prototype deploys to a public URL; the user gets a shareable link.

- The published flow carries the discreet footer badge linking to specmanager.org with UTM parameters.

- The user can revoke/expire the URL (lifecycle mechanics TBD).

**Flow 4 — the loop (phase 2, hypothesis):**

- Stakeholder opens the shared URL, clicks through, notices the badge.

- Badge click → specmanager.org with UTM attribution → GA records the visit → (unmeasured) possible install.

## Open questions

Carried from the interview's Unresolved list; these are inputs to Architecture, not blockers for this PRD.

1. **Sharing demand is unproven.** Will users actually publish prototypes? Zero observed instances; phase 2 is the experiment that answers this.
1. **Privacy / consent.** What exactly does the consent step look like for publishing unreleased product work to a public URL? One-time per feature, per publish, or per project? Any need for access controls (e.g. unguessable URLs vs. real auth) on the published prototype?\
   Answer: ungesable url, with unpublish feature
1. **Publish mechanics from a local-first plugin.** Which host (Netlify or similar)? How are auth and secrets handled in a plugin with no backend of its own? Who owns the hosting account — the user or the project? URL lifecycle: expiry, revocation, re-publish overwriting.\
   Answer: the user of the project owns the hosting
1. **Install attribution.** GA covers badge → visit; visit → install is dark. Is there an acceptable lightweight attribution mechanism, or do we accept the gap?\
   Answer: gap is ok
1. **Viewer/installer overlap.** Are prototype viewers (stakeholders/consumers) plausibly able and motivated to install a Claude Code plugin at all? If not, the badge's real function is brand impressions, and metrics should be framed accordingly.
1. **Prototype generation.** How does generation extend the designer agent's single-file stacked-mockup HTML into a clickable multi-screen flow — transform the existing artifact, or have the designer emit a second, navigation-aware artifact? What defines the click targets and screen-to-screen wiring?\
   Answer: designer emit a second, navigation-aware artifact, defined by the context of the feature and executed by the designer.
1. **Reuse contract.** What minimal interface must the phase 2 publish path expose so Share-docs-on-public-URL can adopt it later without rework?\
   Answere: does not matter
1. **Staleness.** When the design changes after a prototype exists, does the prototype regenerate automatically, show a stale badge consistent with the doc-staleness model, or both?\
   Answer: new url needs to be shiped.
