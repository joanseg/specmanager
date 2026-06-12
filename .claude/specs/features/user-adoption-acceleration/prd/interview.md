---
id: prd-user-adoption-acceleration-019
featureId: feat-user-adoption-acceleration
stage: prd
status: draft
stale: false
title: User adoption acceleration interview
dependsOn: []
basedOn: {}
generatedBy: agent
version: 1
kind: interview
createdAt: '2026-06-12T08:38:46.789Z'
updatedAt: '2026-06-12T08:38:46.789Z'
---
**Mode:** startup interrogation (demand-risk focus), using the office-hours forcing-question method ([gstack](https://github.com/garrytan/gstack/tree/main/office-hours)).

## Extracted

- **Goal:** organic growth toward PMF; when forced to choose, 100 anonymous installs beats 5 documented case studies. Underlying motive: a portfolio project that opens career doors and spreads the methodology.
- **Track record:** 2 demos, 2 retained users — a 100% rate, but both friends and both hand-held in 1:1s.
- **Who sticks:** product-minded people, not pure devs — a PM (ex-Antigravity, terminal-averse) and a backend dev transitioning to product owner. Both value the *lifecycle structure*, not coding speed.
- **Surface matters:** the PM only succeeded after a mid-session switch to the VS Code extension; he'd have bounced off the CLI.
- **Model matters:** on Sonnet the interview phase re-asked answered questions — a quality variable not controlled in the wild.
- **Distribution so far:** public repo; posts to vibe-coding subreddits and X produced 5 likes and zero downstream signal (no stars, issues, or known installs).
- **Market signal:** Google Ads *forecast* for "spec-driven development for product managers": ~4.2K impressions / ~143 clicks per month (UK, £4.35 CPC). Niche but real, and product-skewed. No ad spend planned.
- **Constraint:** 8h/week for adoption work.
- **Decisions made:** two-week wedge = prove the self-serve install path; test persona = product-minded people already in Claude Code (CLI or VS Code); pass bar = unaided install + ship one feature on a real repo.

## Critique

- **Zero self-serve evidence.** Every successful user was hand-walked; no one has ever installed alone. The 100-installs goal rests entirely on an untested funnel.
- **Channel mismatch, not product falsification.** The dead posts pitched a process-heavy tool to anti-process vibe-coding audiences. No signal there tells you little — but it also means *no channel has actually been validated*.
- **Scope-expansion reflex.** The test audience tripled mid-answer (non-Claude-Code users, Desktop/cowork users — the latter likely a build project, not a test). It was cut, but the instinct will recur.
- **The keyword data is a forecast, not observed demand** — a planning-tool estimate, treated in conversation as a growth trend.
- **Goal tension survives:** "100 anonymous installs" was chosen decisively, yet the stated motive (portfolio, doors, methodology adoption) is arguably better served by named users at real companies. Unexamined.
- **Sonnet interview degradation is an adoption risk** — frustrated first sessions the maintainer will never hear about.

## Recommended wedge

A two-week self-serve funnel test: recruit 3–5 product-minded strangers who already use Claude Code, have them install and ship one feature **completely unaided**, observe where they fail, fix the top frictions. Explicitly cut: Claude Desktop/cowork support, non-Claude-Code users, content marketing, paid ads, and channel building — all deferred until the funnel converts.

## Unresolved

- Where to recruit the 3–5 strangers (Slack groups proposed, untested; referrals from the two existing users are the warmest option).
- Whether the unaided install path works at all — including whether README/onboarding steers terminal-averse users to the VS Code surface.
- Root cause and fix for Sonnet's repeated interview questions.
- Whether anonymous installs actually serve the career-door goal better than documented case studies.
- Whether "spec-driven development" search demand converts to plugin installs (forecast only).
- Status quo never examined: what product-minded Claude Code users do today instead of SpecManager.
