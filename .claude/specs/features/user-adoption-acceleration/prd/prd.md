---
id: prd-user-adoption-acceleration-020
featureId: feat-user-adoption-acceleration
stage: prd
status: draft
stale: false
title: User adoption acceleration PRD
dependsOn: []
basedOn: {}
generatedBy: agent
version: 1
createdAt: '2026-06-12T08:42:17.095Z'
updatedAt: '2026-06-12T08:42:17.095Z'
---
_Grounded in the pre-PRD interview (`prd/interview.md`). Decisions recorded there are treated as settled and are not re-litigated here._

## Problem

SpecManager has never been installed by a stranger. Both retained users (2 demos, 2 retained — a 100% rate) were friends, hand-walked through install and first feature in 1:1 sessions. The stated growth goal — **100 anonymous installs**, chosen decisively over documented case studies — rests entirely on a self-serve funnel that has zero evidence of working.

Distribution attempts so far (public repo, posts to vibe-coding subreddits and X) produced 5 likes and no downstream signal. Per the interview critique this was a channel mismatch (process-heavy tool pitched to anti-process audiences), not product falsification — but it means **no acquisition channel has been validated either**.

The bottleneck is not awareness; it is that we don't know whether someone who finds SpecManager can get from README to a shipped feature without the maintainer in the room. Until that converts, every awareness investment is wasted spend.

## Users & jobs-to-be-done

**Test persona (settled in interview):** product-minded people who *already use Claude Code* — CLI or VS Code extension. Evidence: both retained users fit this profile (a terminal-averse ex-Antigravity PM, and a backend dev transitioning to product owner). Both value the **lifecycle structure** (PRD → Architecture → Plan → Build → Walkthrough), not coding speed.

Jobs-to-be-done:
- Bring product discipline to AI-assisted building: turn a fuzzy idea into reviewed, approved specs before code exists.
- Keep an auditable, human-approved trail of what was decided and built.
- Do this without becoming a terminal expert — the PM persona only succeeded after a mid-session switch to the VS Code extension; he would have bounced off the CLI.

**Explicitly not the user for this feature:** non-Claude-Code users, Claude Desktop/cowork users (likely a build project, not a test), and pure devs optimizing for speed.

## Goals / non-goals

### Goals
1. **Run a two-week self-serve funnel test:** 3–5 product-minded strangers who already use Claude Code install SpecManager and ship one feature on a real repo, **completely unaided**.
2. **Instrument the funnel observationally:** for each tester, capture where they stall, what they misread, and whether they finish — via async check-ins and/or screen recordings, not live hand-holding.
3. **Fix the top frictions surfaced**, in priority order, within the maintainer's time budget. Expected (to be confirmed by observation, not assumed) repo-changing work includes:
   - README / onboarding rewrite so a first-time visitor can reach "plugin installed, board open" without prior context — including explicitly steering terminal-averse users to the VS Code extension surface rather than the CLI.
   - Install-path fixes for whatever actually breaks unaided (marketplace add → install → reload → MCP reconnect is a known multi-step sequence with a documented "restart Claude" fallback).
   - First-run guidance toward the first success moment (e.g. `/specmanager-init` → first PRD → board open).
4. **Produce a falsifiable verdict:** does the self-serve funnel convert, yes or no, with named failure points.

### Non-goals (explicitly cut in the interview — do not creep back)
- Claude Desktop / cowork support.
- Supporting non-Claude-Code users.
- Content marketing, paid ads, channel building, SEO — all deferred until the funnel converts.
- Building analytics/telemetry infrastructure into the plugin (observation is manual for 3–5 testers; the tool stays fully local).
- Fixing Sonnet interview-quality degradation as part of this feature (tracked as an open question / candidate separate feature unless it proves to be a top-3 funnel blocker).

## Success metrics

- **Primary (pass bar, settled):** ≥3 of the recruited strangers complete *unaided install + ship one feature on a real repo* by end of the two-week window. "Unaided" means no synchronous help from the maintainer; published docs only.
- **Funnel visibility:** every tester's outcome is classified at a named funnel step — found repo → installed plugin → MCP connected → init ran → first PRD drafted → feature shipped — so failures are diagnosable, not anecdotal.
- **Friction burn-down:** the top 3 observed frictions have shipped fixes (or written wontfix rationale) by end of window.
- **Counter-metric:** maintainer adoption time stays within **8h/week**; if observation alone consumes the budget, the test is over-designed.

A failed pass bar with clearly identified failure points is a *successful test* (the wedge is information), but an unsuccessful feature outcome — it gates further adoption investment.

## Constraints & assumptions

**Constraints**
- Maintainer has **8h/week** for adoption work — recruiting, observing, and fixing all come out of this budget.
- Two-week test window once testers are recruited.
- No ad spend. No new infrastructure; fixes land in the existing repo (README, onboarding docs, plugin install flow).
- Testers must be strangers (or at most second-degree referrals) — friends contaminate the "unaided" signal.

**Assumptions (marked, per interview critique)**
- *Assumption:* 3–5 qualifying strangers are recruitable within ~1 week. Warmest path is referrals from the two existing users; Slack groups are proposed but untested.
- *Assumption:* the ~4.2K impressions/month keyword forecast for "spec-driven development for product managers" indicates a real niche. It is a **forecast, not observed demand** — this feature does not bet on it, but a converting funnel is the prerequisite for ever testing it.
- *Assumption:* the VS Code extension surface is good enough for terminal-averse testers if docs route them there. Unverified.
- *Known risk:* interview-quality degradation on Sonnet may produce frustrated first sessions the maintainer never hears about; the test design should ask testers which model they used.

## High-level user flows

**Tester funnel (the thing under test)**
- Stranger receives repo link with a short ask ("install, ship one feature on a real repo, tell us where you got stuck") — no other coaching.
- Lands on README → understands what SpecManager is and which surface (CLI vs VS Code) fits them → follows install steps (marketplace → install → reload → MCP connect).
- Runs `/specmanager-init` on a real repo → drafts a first PRD (optionally via interview) → approves on the board → continues through the lifecycle until one feature ships.
- Reports back async (short form or recording); maintainer never intervenes synchronously.

**Maintainer loop**
- Week 0: recruit 3–5 testers (referrals first, then Slack groups); prepare observation kit (intro message, check-in template, funnel-step checklist).
- Weeks 1–2: collect outcomes, classify each tester against funnel steps, rank frictions by frequency × severity.
- Continuously: ship fixes for top frictions (README/onboarding/install-path), re-verify with later testers where timing allows.
- End of window: write the verdict — converts / doesn't, with named failure points and the recommended next wedge.

## Open questions

Carried from the interview's Unresolved list, plus test-design specifics:

1. **Recruiting source:** where do the 3–5 strangers come from? Referrals from the two existing users are warmest; Slack groups are proposed and untested. What's the fallback if neither yields enough testers in week 1?
2. **Terminal-averse routing:** can README/onboarding reliably steer terminal-averse users to the VS Code extension surface before they bounce off CLI instructions? What does that routing look like in a single README?
3. **Sonnet interview degradation:** root cause and fix for the interview phase re-asking answered questions on Sonnet. Out of scope to fix here unless it's a top-3 observed friction — but is it a funnel blocker?
4. **Search-demand conversion:** does "spec-driven development" search interest convert to plugin installs at all? Forecast-only today; untestable until the funnel converts.
5. **Goal tension (flagged in critique, unexamined):** does 100 anonymous installs actually serve the career-door/portfolio motive better than named case studies? The wedge defers this, but the verdict write-up should revisit it.
6. **Status quo:** what do product-minded Claude Code users do *today* instead of SpecManager (plain prompting, plan mode, other spec tools)? Never examined; tester intake should ask.
7. **Observation mechanics:** async check-ins vs screen recordings vs a short exit interview — which fits inside 8h/week for 5 testers?
