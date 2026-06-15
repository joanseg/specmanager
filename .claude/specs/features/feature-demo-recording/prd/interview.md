---
id: prd-feature-demo-recording-023
featureId: feat-feature-demo-recording
stage: prd
status: draft
stale: false
title: Feature demo recording interview
dependsOn: []
basedOn: {}
generatedBy: agent
version: 1
kind: interview
createdAt: '2026-06-15T09:24:30.156Z'
updatedAt: '2026-06-15T09:24:30.156Z'
---
**Mode:** builder / design-thinking (shape-risk focus), with a startup-interrogation probe on demand, using the office-hours forcing-question method ([gstack](https://github.com/garrytan/gstack/tree/main/office-hours)).

## Extracted

- **Feature:** an optional **demo recording** delivery attached to the walkthrough stage — a chip on the board under the walkthrough card; clicking opens the produced **mp4** in the default video player.
- **Scope decided:** browser-only, Playwright-driven recording of the **shipped feature's web UI** (Playwright records video natively). Workflow/terminal capture was explicitly cut.
- **Automation level:** the agent does the whole chain — boot the app, seed believable data, handle auth, derive the click-path, drive the UI, record, (later) caption.
- **Approval flow (key addition):** the walkthrough doc summarises the *proposed* Playwright demo plan; the user reviews and gives feedback there before any recording runs. Converts "agent improvises" into "agent executes a human-approved script."
- **Sharing:** manual — the mp4 lives in the repo; the user shares it themselves. No badge, no public URL.
- **Token constraint:** the video must NOT be a doc-stage document; it's a file referenced by metadata so doc-reading agents never load it.
- **Phasing:** everything at once; captions may slip to phase 2.
- **Success bar:** produces a happy-path walkthrough video **in one shot**.

## Critique

- **The "viral loop" framing collapsed during the interview.** With manual sharing and no badge/URL, this is a *demo deliverable*, not a loop. Honest reframe; the viral label no longer fits.
- **The core capability has never been observed.** The user confirmed he's never watched an agent successfully boot + drive a new feature in a browser unattended. The feature's hardest claim is a pure hypothesis.
- **Multi-link reliability problem.** Boot → seed → auth → derive path → drive → record is 5–6 chained steps; per-link failure compounds. The output is a *video*, so any glitch is preserved and looks shipped — a half-broken artifact is worse than none.
- **One-shot success vs. unproven chain** is the central tension: a demanding bar set against a pipeline with no proven link.
- **Demand unexamined.** Nobody specific was named as wanting this; it's the third "viral/sharing" idea in a row, all resting on the still-unverified premise that users share artifacts at all.
- **Git bloat:** mp4s committed to the repo grow clone size; storage strategy (LFS vs gitignored vs external) is unresolved.

## Recommended wedge

Ship the **walkthrough-embedded demo plan + human approval** first, even before reliable recording: the agent proposes a concrete Playwright click-path (and seed/boot assumptions) inside the walkthrough doc, the user corrects it. That alone is low-risk and de-risks everything downstream. Then attempt the recording chain against that approved script for browser-UI features only, captions deferred to phase 2. Cut for v1: workflow/terminal capture, captions, any sharing/viral mechanics, non-web features.

## Unresolved

- Whether the agent can actually boot + seed + auth + drive an arbitrary user app unattended — never observed; this is the make-or-break.
- App runtime contract: who/what defines how to start the app, seed demo data, and authenticate (config file? convention? user-provided script?).
- Reliability/retry model and what happens to a partial/broken recording (discard, surface for retry, never auto-publish).
- Video storage strategy: git LFS vs gitignored local vs external — and how the chip references it without bloating the repo or being read as a doc.
- Non-web features (CLI/API/library) have no browser to record — explicit unsupported case.
- Demand: who watches these videos and shares them, given sharing is fully manual.
- Phase-2 captions: source of caption text (walkthrough prose? agent narration?) and timing/overlay mechanism.
- Possible reuse of the existing RecordStudio pipeline (cuts/captions/render) rather than building caption tooling from scratch.
