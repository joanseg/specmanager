---
id: prd-security-review-stage-029
featureId: feat-security-review-stage
stage: prd
status: approved
stale: false
title: Security review stage PRD
dependsOn: []
basedOn: {}
generatedBy: human
version: 2
createdAt: '2026-06-26T09:59:52.920Z'
updatedAt: '2026-07-06T10:23:36.927Z'
---
## Problem

SpecManager's own drafting agents (architect → planner → builder) ship code with real, fund-losing security vulnerabilities, and nothing in the lifecycle catches them. Concrete instance: the **x402 payment-acceptance feature in sprintcheckout-core**, built entirely with this plugin, shipped against real USDC on Base mainnet with at least these defects (surfaced June 17 2026 by a one-off Claude chat against the published docs — incidental, not a process):

| Vuln                                             | Effect                               |
| ------------------------------------------------ | ------------------------------------ |
| `payTo` MITM                                     | agent pays attacker's wallet         |
| agent private key in an env var                  | key exfiltration → drained funds     |
| `sessionId` no payer binding + idempotent access | leaked id = free content             |
| replay (no nonce/expiry)                         | a captured payment proof reused      |
| blind trust in Coinbase facilitator              | no independent on-chain verification |
| enumerable `sessionId`/`orderId`                 | id guessing                          |
| no rate limiting                                 | abuse / brute force                  |
| unauthenticated `orderId`                        | order tampering                      |

The plugin owner has **no security expertise** and runs **no systematic security check** today — every feature ships blind. The June 17 review only happened by luck and only worked because it pulled domain attack-vectors (x402, replay, Base) from web search.

## Users & jobs-to-be-done

- **Solo builder using SpecManager** (the plugin owner; non-security-expert): JTBD — "ship a feature without unknowingly introducing a fund-losing or data-leaking vuln, given I can't review security myself."

- **Build pipeline (machine user)**: JTBD — "when a phase's code lands, get a security verdict and fix loop without a separate manual step, reusing the existing post-phase machinery."

## Goals / non-goals

**Goals (v1):**

- A **build-time security auto-fix loop**: a security-lens reviewer reads the phase diff → returns findings → the builder patches → re-review until clean, capped at N retries.

- On retry-cap exhaustion with an unresolved critical: mark the phase **`blocked`** and **escalate to a human** by surfacing the unfixed finding on the board — same shape and state as the existing Stop-gate `blocked` path.

- Reuse the proven Stop-gate / active-build machinery rather than inventing a new control flow (see "Builds on").

**Non-goals (explicitly cut from v1, per interview wedge):**

- **Architecture-stage security pass** — deferred to a later version, **not dropped** (the owner wants both eventually; see "Later, not dropped").

- Web-search-enabled / tool-augmented reviewer.

- False-positive tuning.

- Auto-grading of severity.

**Later, not dropped (v2+):**

- **Architecture-stage security pass** — catch design-level vulns (KMS/MPC key custody, independent on-chain verification, one-time tokens) _before code exists_. These worst-three are **not build-loop-patchable**, so the build loop alone cannot reach them. Sequenced second deliberately: prove the loop where code and machinery already exist, then add the earlier pass. **Open question:** advisory or gating (see Open questions).

## Success metrics

- The known sprintcheckout-core vuln class is **caught and patched by the loop** when re-run against equivalent diffs (regression target — does the loop see what the June 17 chat saw?).

- A phase with an unresolved critical reliably lands in **`blocked`** **+ visible-on-board**, never silently passes.

- Zero false `blocked` states on features with no real findings (the loop must be a no-op when clean).

- Adoption proxy: the owner runs builds **without** a separate manual security step and trusts the result.

## Constraints & assumptions

- **Reuse, don't reinvent:** the loop must reuse the Stop-gate retry shape (cap N, currently 3, keyed per feature-phase), the `blocked` surfacing path (`set-phase-blocked`), the active-build marker (`active-build.json`), and the resilient `get_phase_completion` finalize path. Control logic lives in `core/`, not in prompts (gate-enforcement invariant).

- **Single-user, fully local, no auth** — at most one build in flight; the board is the only escalation surface.

- **Builds-on dependency:** this feature depends on the build pipeline / reviewer / Stop-gate primitives already shipped.

- **Assumption (marked):** diff + spec context _may_ be sufficient reviewer input; the June 17 evidence suggests it may not (web search was load-bearing) — unverified, carried as risk.

- **Assumption (marked):** the value generalises beyond crypto-payment features; current evidence is **n=1** in the densest possible domain — unverified.

## High-level user flows

**Build-time security auto-fix loop (v1):**

- `/specmanager-build` builds a phase; the active-build marker is set as today.

- After the phase's code lands (builder returns _or_ errors — finalize must not depend on the builder's exit path, mirroring `get_phase_completion`), invoke the **security-lens reviewer** on the phase diff + spec slice.

- Reviewer returns findings (read-only, like the existing `reviewer`).

- If findings: dispatch them back to the builder → patch → re-review. Repeat under a retry cap.

- Clean → phase proceeds (walkthrough / doc-sync as today).

- Cap exhausted with an unresolved critical → `set-phase-blocked` + surface the unfixed finding on the board for human escalation; clear the loop budget.

**Architecture-stage security pass (v2+, deferred):**

- During/after the Architecture stage, a design-level security pass flags vulns that have no code yet (key custody, on-chain verification, token design) and writes them where the human approves the Architecture doc.

## Open questions

These were flagged unresolved in the interview and must not be papered over — several gate the design:

1. **Reviewer tooling.** The same model writes and reviews; the agent that introduced a vuln judges its own fix. The June 17 review leaned on **web search** for domain attack-vectors. Does the security reviewer need web-search/tooling, or is **diff + spec context** enough? (v1 cuts web search — risk that a diff-only reviewer quietly under-performs.)
1. **Patch verification.** Blind auto-fix on payment code is high-stakes; a non-expert can confirm neither correctness nor non-breakage. How is a patch verified — **phase tests**? a **second independent reviewer**? No mechanism was decided.
1. **Escalation target.** "Escalate to a human" — but the human is the owner, with no security expertise. **Who actually adjudicates** an unfixed critical, and **what do they do** with it?. Answer: human will decide to go deeper or skip.
1. **Agent topology.** Extend the existing read-only `reviewer` subagent with a **security lens**, or build a **separate security-reviewer** agent? (Overlap unresolved.). Answer: separate security reviewr agent
1. **Architecture pass posture (v2+).** **Advisory or gating?** The owner rejected a hard _build_ gate, but Architecture is already a doc-approval gate — so an Arch-stage pass _could_ gate without contradicting that decision.
1. **Generalisation.** Does the value generalise beyond crypto-payment features, or is it concentrated in high-risk domains? **n=1** so far, and it's the densest possible domain. Answer: its a general seurity review on high risk domians
