---
id: prd-security-review-stage-028
featureId: feat-security-review-stage
stage: prd
status: draft
stale: false
title: Security review stage interview
dependsOn: []
basedOn: {}
generatedBy: agent
version: 1
kind: interview
createdAt: '2026-06-26T09:58:23.693Z'
updatedAt: '2026-06-26T09:58:23.693Z'
---
_Mode: startup-interrogation → builder. Forcing questions via the gstack office-hours method (github.com/garrytan/gstack/tree/main/office-hours)._

## Extracted
- **Problem:** SpecManager's own architect/planner/builder agents are shipping code with security vulnerabilities. Concrete instance: the x402 payment-acceptance feature in **sprintcheckout-core**, built with the plugin.
- **The vulns were real and fund-losing** (surfaced June 17 via a one-off Claude chat against the published docs): payTo MITM → agent pays attacker's wallet; agent private key in an env var; `sessionId` with no payer binding + idempotent access → a leaked id = free content. Plus replay, blind trust in the Coinbase facilitator, enumerable ids, no rate limiting, unauthenticated `orderId`. Real USDC on Base mainnet.
- **No security competence in the loop:** user has no security expertise; there is *no* systematic check; the June 17 chat was incidental, not a process.
- **Decisions agreed:**
  - Two checkpoints: **(1)** an architecture-stage security pass (catch design-level vulns before code exists) and **(2)** a build-time auto-fix loop.
  - Build-time behaviour = **(b) auto-fix**: findings go back to the builder → patch → re-review until clean.
  - **Failure tail:** when the loop hits its retry cap with an unresolved critical → mark the phase **`blocked`** and **escalate to a human** (surface on the board).

## Critique
- **Same model writes and reviews.** The agent that introduced the vuln is the one fixing and re-judging it. The June 17 review only worked because it pulled domain attack-vectors from **web search** (x402, replay, Base). A diff-only reviewer with no tool access may quietly under-perform. Unverified.
- **Blind auto-fix on payment code is high-stakes.** A non-expert can't confirm a patch is correct *or* non-breaking — auto-patching could break payments or add new bugs. No verification mechanism was discussed.
- **The escalation target is the weakest link.** "Escalate to a human" — but the human is the user, with no security expertise. Who actually adjudicates an unfixed critical is undefined.
- **The architectural criticals depend entirely on checkpoint (1) landing.** KMS/MPC, independent on-chain verification, one-time tokens — none are build-loop-patchable. If the architecture pass is advisory and ungradeable, those worst-three slip through anyway.
- **Overlap with the existing `reviewer` subagent** (read-only, post-phase spec-compliance) was never resolved: new agent, or a security lens on the existing one?
- **n = 1, and it's the densest possible domain.** One feature, crypto payments — unusually security-rich. Whether ordinary SpecManager features carry comparable surface is unverified.

## Recommended wedge
Ship the **build-time security auto-fix loop only**, reusing the proven Stop-gate machinery: a security-lens reviewer reads the phase diff → returns findings → builder patches → re-review, capped at N retries → unresolved criticals mark the phase `blocked` and surface on the board for human escalation.
- **Sequenced second (explicitly cut from v1):** the architecture-stage pass — even though the user wants both. Reason: prove the loop where code actually exists and the machinery already exists, then add the earlier pass.
- **Also cut from v1:** web-search-enabled reviewer, false-positive tuning, any auto-grading of severity.

## Unresolved
- Does the security reviewer need web-search/tooling for domain-specific attack vectors, or is diff + spec context enough?
- How is an auto-fix patch verified correct and non-breaking, when the user can't review it? (Phase tests? A second independent reviewer?)
- Who is "the human" in escalate-to-human, and what do they actually do?
- Extend the existing `reviewer` subagent with a security lens, or a separate agent?
- Architecture-stage pass: advisory or gating? (User rejected a hard *build* gate, but Architecture is already a doc-approval gate.)
- Does this generalise beyond crypto-payment features, or is the value concentrated in high-risk domains?
