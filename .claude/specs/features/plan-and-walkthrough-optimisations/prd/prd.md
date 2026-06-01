---
id: prd-plan-and-walkthrough-optimisations-007
featureId: feat-plan-and-walkthrough-optimisations
stage: prd
status: draft
stale: false
title: Plan and walkthrough optimisations PRD
dependsOn: []
basedOn: {}
generatedBy: agent
version: 1
createdAt: '2026-06-01T10:32:11.785Z'
updatedAt: '2026-06-01T10:32:11.785Z'
---
# Plan and walkthrough optimisations — PRD

## Problem

SpecManager's own pipeline has two stages whose defaults fight the way features actually get built:

1. **The planner over-phases.** `agents/planner.md` mandates phases on every plan — "A flat task list is not acceptable output — even a small feature has at least one phase." Most features are not big enough to justify a phase split, so users get artificial phase boundaries, extra ceremony, and mid-build stop points that buy them nothing.

2. **Walkthroughs are manual and structurally inconsistent.** A walkthrough only exists if the user remembers to run `/specmanager-walkthrough <feature> <phase>` after a phase finishes. And when it does run, `agents/walkthrough-writer.md` emits a loose 5-section document, so quality varies. We have three exemplar walkthroughs that demonstrate the structure we actually want — they aren't being matched.

This feature optimises both: plan in **one phase by default**, fire walkthroughs **automatically** when a phase is built, and make generated walkthroughs follow the **proven structure**.

## Goals

- A plan defaults to a **single phase**; the planner splits into multiple phases only for genuinely large features, and confirms the split with the user before committing.
- When a phase finishes building (all its tasks `done`), the corresponding phase walkthrough is **created automatically**, without the user invoking a command.
- Generated walkthroughs follow a **concrete, runnable, evidence-based structure** matching the exemplars — not the current loose schema.

## Non-goals

- No change to the PRD, Architecture, or Design stages.
- No change to the gate model (Build still has no doc; walkthroughs still gate on tasks `done`).
- No new board UI work beyond what these three changes require.
- Not removing the manual `/specmanager-walkthrough` command — it remains as an override/escape hatch.

## Requirements

### R1 — Plan in one phase by default

- **R1.1** The planner defaults to producing a **single-phase plan**. The current mandate ("even a small feature has at least one phase", "a flat task list is not acceptable") is replaced with: one phase is the norm; multiple phases are the exception.
- **R1.2** The planner splits into multiple phases **only when the feature is a genuinely big project** — i.e. when there is at least one real, testable working-software increment partway through where it makes sense to **stop and let the user test before continuing**.
- **R1.3** The split criterion is **minimum break points**: introduce a phase boundary only where a user could meaningfully install/run/test the partial result. Never manufacture phases for ceremony. Default to the fewest phases that makes sense.
- **R1.4** When the planner judges a multi-phase split is warranted, it **uses `AskUserQuestion` to confirm the phasing approach** with the user before persisting tasks — presenting the proposed phase boundaries and the reasoning.
- **R1.5** A single-phase plan must still satisfy every downstream contract that today assumes multi-phase:
  - the `## Phase <name> — <theme>` heading parse (builder reads it),
  - the phase summary table (`| Phase | Theme | Points |` + **Total** row),
  - dotted `<phase>.<index>` task numbering,
  - `list_phases` / `get_next_phase` / `check_gate({ stage: "walkthrough", phase })`.
  A single-phase plan should read cleanly as one phase, not as boilerplate scaffolding around a flat list. (Exactly how the conventions adapt for one phase is an open question for Architecture — see Q1.)

### R2 — Auto-fire the walkthrough when a phase is built

- **R2.1** When **every task in a phase reaches `done`** (the walkthrough gate for that phase opens), the phase walkthrough is **created automatically** by invoking the `walkthrough-writer` in per-phase mode for that phase.
- **R2.2** The auto-created walkthrough lands in `draft` (consistent with all generated docs). The user still reviews and approves it; we automate the *creation*, not the approval.
- **R2.3** Auto-fire is **idempotent**: if a walkthrough for that phase already exists, it is not duplicated (mirrors the existing "confirm no draft already exists" guard in the slash command).
- **R2.4** The manual `/specmanager-walkthrough` command continues to work unchanged, for re-runs or for phases the auto-trigger missed.
- **R2.5** The detection mechanism should build on existing precedent — `core` already emits `feature.shipped` on final-walkthrough approval and exposes `get_next_phase`. The exact wiring (a new "phase build complete" event in `core`, a builder hand-off, or a hook) is an open question (Q2); R2 specifies the *behavior*, not the mechanism.

### R3 — Walkthroughs follow the proven structure

The `walkthrough-writer` per-phase prompt is rewritten so generated walkthroughs match the structure demonstrated by the exemplars:

- `docs/temp/original-specs/phase-design-A-test-walkthrough.md`
- `docs/temp/original-specs/phase-design-B-test-walkthrough.md`
- `docs/temp/original-specs/phase-7-A-test-walkthrough.md`

- **R3.1** The required section skeleton:
  1. Title + one-paragraph framing that **quotes the phase's exit criterion verbatim** (blockquote).
  2. `## 0. Prerequisites`.
  3. `## 1. Build` — the exact build/test commands and the **new** assertions this phase adds.
  4. Install / reload section — how to get the built phase running, plus a troubleshooting block for the reload path.
  5. `## <n>. <Phase> exit checks` — numbered, with `### n.1`, `### n.2`, … each a concrete user-runnable step with **expected output** (shell, `curl`/`jq`, MCP calls, expected JSON).
  6. `## <n>. Pass criteria` — a `- [ ]` checklist, all required.
  7. **Deferred / Out of scope** — what intentionally does NOT work yet.
  8. **Troubleshooting** — symptom → cause → fix.
  9. **What ships next (preview)**.
- **R3.2** Every exit check is **concrete and runnable** with explicit expected output — no vague "verify it works".
- **R3.3** The structure must **generalise beyond SpecManager's own plugin**. The exemplars are test-walkthroughs for the plugin itself, so "Build (contributors only)" and the reinstall dance are plugin-specific. For a general feature, the prompt must adapt these to **project-appropriate build/test commands** rather than hard-coding the plugin's npm scripts. (How far to generalise vs. keep SpecManager-tuned is open — see Q3.)
- **R3.4** The `final` roll-up mode is out of structural scope here unless trivially affected; R3 targets the per-phase mode the exemplars represent.

## Success criteria

- **SC1** Running `/specmanager-plan` on a typical (non-large) approved architecture produces a plan with **exactly one** `## Phase` section and no mid-build stop points; downstream parsers (`list_phases`, builder, walkthrough gate) all still work against it.
- **SC2** Running `/specmanager-plan` on a deliberately large feature triggers an `AskUserQuestion` confirming the proposed multi-phase split before any task is persisted.
- **SC3** Marking the last task of a phase `done` results in a `draft` phase walkthrough appearing for that phase **without any manual command**, and re-triggering does not create a duplicate.
- **SC4** A generated phase walkthrough contains all nine R3.1 sections, quotes the exit criterion verbatim, and every exit check has explicit expected output and a pass-criteria checklist — verifiable by diffing the section skeleton against the exemplars.
- **SC5** `/specmanager-walkthrough <feature> <phase>` still works after the auto-trigger lands.

## Open questions

- **Q1** How do the plan-doc parsing conventions (phase heading, summary table + **Total** row, dotted task numbering, `Scale`/`Notes on estimates` sections) adapt for a single-phase plan so it reads cleanly rather than as scaffolding around a flat list — while keeping the builder/walkthrough/`list_phases` parsers happy? Architecture decides.
- **Q2** What is the auto-fire mechanism — a new "phase build complete" event emitted from `core` on the `done`-transition that closes a phase, a hand-off from the `builder` subagent at the phase boundary, or a hook? Each has different reliability and coupling trade-offs.
- **Q3** How SpecManager-specific should the walkthrough structure stay? The exemplars assume the plugin's own build + reinstall flow; a general feature needs project-appropriate commands. Does the prompt detect project type, or stay tuned to SpecManager's self-development use case (which is the dominant current use)?
- **Q4** When a multi-phase split is declined by the user in the `AskUserQuestion`, does the planner fall back to a single phase or to the user's preferred boundaries?
