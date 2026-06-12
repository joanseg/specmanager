---
id: prd-share-docs-on-public-url-013
featureId: feat-share-docs-on-public-url
stage: prd
status: approved
stale: false
title: Share docs on public URL PRD
dependsOn: []
basedOn: {}
generatedBy: human
version: 2
createdAt: '2026-06-11T18:16:23.715Z'
updatedAt: '2026-06-11T19:18:42.677Z'
---
## Problem

SpecManager's docs and board live inside the target project's repo (`.claude/specs/...`) and are viewed through a localhost board that only runs inside a Claude Code session. That is exactly right for the builder — and a wall for everyone else. Non-technical stakeholders (the people who review, comment on, and sign off specs) will not install Claude Code, clone a repo, or run a local server. Today they simply cannot see the work.

**Demand evidence (be honest about how thin it is):** we have exactly one reference case, second-hand. An AI-adoption lead the user demoed SpecManager to reported that his company's stakeholders rejected installing Claude Code; he solved the problem with a Linear integration that works fine at his company today. The public-URL idea is the user's own afterthought — it has never been shown to him or anyone else. This PRD exists to make the cheapest testable version of that idea concrete, not to assert validated demand. See Open Questions.

**Hard constraint that shapes everything:** the source of truth must remain the markdown in the repo, because that is what makes the docs useful to Claude Code. Moving docs into Linear/Confluence is ruled out; syncing outward to such tools later is not.

## Users & jobs-to-be-done

- **The publisher (primary)** — the SpecManager user, a developer or technical PM working in Claude Code. Job: "let my stakeholders read the current state of the specs without me exporting PDFs, pasting into Notion, or asking them to install anything."

- **The stakeholder (consumer)** — a non-technical reviewer (manager, client, AI-adoption lead's leadership). Job: "open a link in my browser and understand what is being built and where it stands." In the one real-world reference case, the stakeholder's job was actually read + comment + sign-off that gated work; v1 deliberately serves only the _read_ part (see Open Questions — this is the biggest validity risk).

## Goals / non-goals

### Goals (v1)

1. A **publish action** that renders the current board and docs to **static HTML pages** — a snapshot, frozen until the next publish.
1. The snapshot is deployed to hosting **the publisher already owns** (their Vercel/Netlify/GitHub Pages account or similar), via **exactly one hosting adapter** in v1.
1. The published site is reachable at a **secret, unguessable URL** — "anyone with the link" semantics, no login.
1. Stakeholders can read the board overview and the individual stage docs in a clean, browser-native rendering with zero installation. Can read the hole board overview and click every document to see in detail. Alternatively user can share only individual documents.
1. The repo stays the single source of truth; publishing is a pure outward export and never writes back into `.claude/specs/`.

### Non-goals (explicitly cut from v1)

- **Live serving** from the user's machine (no tunnels, no always-on server).

- **Comments / annotations** on published docs.

- **Stakeholder sign-off / approval** flows on the public site.

- **Login, SSO, or any real auth** — secret link only; real access control is deferred.

- **Linear / Confluence / Jira integrations** (deferred, not killed — see Open Questions).

- **Multiple hosting adapters** — v1 ships one; the adapter boundary should not preclude more, but building more is out of scope.

- SpecManager operating hosting on other people's behalf. We do not run a service that stores third parties' confidential specs.

## Success metrics

These are soft and should be treated as risks, not guarantees:

- **Qualitative gate:** the original demo contact (the AI-adoption lead) reacts positively when shown a published snapshot — ideally answering "would your stakeholders have accepted this _without_ sign-off?" with a yes. A no is a strong signal to pivot toward the sync-outward wedge instead.

- **Behavioral:** at least some interviewed/early users actually publish and share a link with a real stakeholder (not just try the feature once on their own).

- **Friction proxy:** a publisher with an existing hosting account goes from "never published" to "stakeholder reading the page" in one sitting, without leaving Claude Code for anything other than hosting-account credentials.

There is no quantitative adoption target for v1; the feature is a demand probe.

## Constraints & assumptions

### Constraints

- Source of truth stays in `.claude/specs/` in the repo (hard constraint from the interview).

- Publisher brings their own hosting; SpecManager never holds third-party spec content on infrastructure it operates.

- The board server is local-only by design (`127.0.0.1`, no auth) — the public snapshot must not change that posture. Publishing is a separate, explicit, user-initiated action.

- Static output only in v1: no server-side code on the hosting target, which keeps the single adapter simple and the attack surface minimal.

- One hosting adapter in v1. sprites.dev was suggested as a possible default for users with no hosting account, but its capabilities, unguessable-URL support, API, and terms are **unverified** (Open Questions). The v1 adapter choice is an architecture decision, made after that verification.

### Assumptions (made by the author, flagged as such)

- A snapshot (point-in-time, possibly stale) is acceptable to stakeholders; they do not need live state. The interview decided this for v1 but it is untested with a real stakeholder.

- Secret-link confidentiality is acceptable for typical spec content. Companies with stricter policies are out of v1's target.

- The publisher is comfortable that anything published is, technically, on the public internet behind an unguessable path.

- The existing board/doc rendering can be reused or adapted for static output (to be confirmed at the architecture stage; this PRD does not prescribe how).

## High-level user flows

### Publish (publisher)

- From a Claude Code session (command or board action — to be decided at design time), the user triggers "publish".

- First run: a one-time hosting setup (credentials/target for the single supported host).

- SpecManager renders the current board + selected docs to static HTML and deploys them to the user's hosting under a secret unguessable URL.

- The user gets the URL back, ready to paste into an email or chat.

### Re-publish (publisher)

- The user triggers publish again after specs change; the snapshot at the same (or a fresh — open question) secret URL is replaced. Nothing updates automatically between publishes.

### Read (stakeholder)

- The stakeholder opens the link in any browser. No install, no login.

- They see a board-like overview of features and stages and can click through to read individual docs (which docs are included is an open question).

- Read-only: no editing, commenting, or approving anywhere on the published site.

## Open questions

Carried verbatim from the pre-PRD interview; none are resolved here.

1. **Zero first-party demand.** Nobody has asked for this; it is unvalidated even with the one named contact. Cheapest next step before heavy investment: show the demo contact a mocked snapshot and ask whether his stakeholders would have accepted it **without** sign-off.\
   Answer: accepted
1. **Is read-only useful to approvers?** In the reference case, stakeholder review meant read + comment + sign-off that gated work. A read-only page may miss the actual job. This is the central product risk of the v1 cut.\
   Answer: ok for v1
1. **sprites.dev as default host** — capabilities, unguessable-URL support, API, and terms are all unverified. Verify before choosing it as the v1 adapter; otherwise pick a verified host (e.g. Vercel/Netlify/GitHub Pages) instead.
1. **Which docs get published?** Approved only? Drafts too? Walkthroughs? Undecided; v1 needs a default and possibly a picker.\
   Answer: user can share entire board with access to each document AND ?OR individual documents.
1. **Snapshot staleness.** Should published pages show their publish date and/or an "outdated" marker when the repo has moved on?\
   Answer: should show latest version, with the reference to the version being seen.
1. **Is outbound sync the better wedge?** Syncing docs outward to Linear/Confluence (where the reference contact already solved this) may beat a public URL. Deferred, not killed.\
   Answer: architect to check and recommend.
1. **Cowork spin-up as a competing shape** — unexamined alternative.
1. **"PMs are moving into Claude Code"** — an imagined trend with no observation attached; do not let it justify scope.
1. **URL lifecycle** (minor, surfaced while drafting): does re-publish keep the same secret URL or rotate it? Is there an "unpublish"? Needs a decision by architecture time.\
   Answer: keeps same url, there is an unpublish action.
