---
id: prd-stop-gate-active-card-scoping-fix-026
featureId: feat-stop-gate-active-card-scoping-fix
stage: prd
status: approved
stale: false
title: Stop-gate active-card scoping fix PRD
dependsOn: []
basedOn: {}
generatedBy: human
version: 2
createdAt: '2026-06-15T14:36:50.039Z'
updatedAt: '2026-06-15T14:56:22.727Z'
---
## Problem

`resolveActiveCard` in `plugins/specmanager/server/src/core/active-card.ts` (\~line 50) resolves the active card as **the first feature in the project with any non-done tasks**, via a project-wide `listFeatures` scan. It has no awareness of what the current session is actually doing.

Observed consequences in a live PRD-drafting session:

- The Stop hook fired on every session stop, including pure documentation work with no build in flight.

- The hook locked onto `feat-antigravity-plugin` phase A (15 open tasks) — unrelated to the session — and demanded the session keep building it.

- At the iteration cap (N=3) it would have called `set-phase-blocked.js`, falsely marking that phase `blocked` and corrupting board state.

**Interim hotfix (already shipped, commit 448610c / merge 12bd895):** the `Stop` entry was removed from `hooks/hooks.json` and `stop-gate.sh` early-exits with `exit 0`. The Stop-gate is currently disabled. This feature re-scopes and re-enables it.

---

## Users

Single primary user: the SpecManager plugin operator running `/specmanager-build` locally. The bug surfaces to everyone who has built the plugin and has any planned-but-unbuilt feature in their project — which is the normal state of any active project.

Job-to-be-done: run Claude Code sessions (PRD drafting, Q\&A, any non-build work) without the Stop-gate interfering; have the gate actually protect build sessions from premature stops.

---

## Goals / Non-goals

### In scope

1. Re-scope `resolveActiveCard` so it returns a result only when there is a **session-scoped in-flight build** — never a project-wide scan.
1. Preserve original intent: when a build IS in flight, the gate keeps the builder working until the current phase's tasks are done and its test command passes.
1. Re-enable the hook: restore the `Stop` entry in `hooks/hooks.json`; remove the `exit 0` from `stop-gate.sh` — only after scoping is correct and tested.
1. Regression test: extend `selftest-stopgate` to assert the gate is a no-op when no build is in flight with an unrelated feature holding open tasks (the exact scenario that broke).
1. Guard against false-block: never call `set-phase-blocked.js` on a phase that is not the session's actual in-flight build.

### Out of scope

- Redesigning the iteration cap, test-command discovery, or criteria-check logic — those are not broken.

- Changing tier-dispatch, the reviewer subagent, or any other build-leverage-primitives primitive.

- Multi-user or remote-session awareness.

---

## Success metrics

| Metric                                                | Target                                                |
| ----------------------------------------------------- | ----------------------------------------------------- |
| False-positive gate fires in non-build sessions       | 0                                                     |
| False-block (`set-phase-blocked`) on unrelated phases | 0                                                     |
| Gate fires correctly when build IS in flight          | Unchanged — gate holds until phase done + test passes |
| `selftest-stopgate` regression case                   | Green (no-op confirmed programmatically)              |

---

## Constraints & assumptions

| Item                        | Detail                                                                                                                                          |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Core logic location         | `resolveActiveCard` lives in `core/`; fix stays there. No bash heuristics for scoping.                                                          |
| Compiled artifact           | `server/dist/` must be rebuilt before commit.                                                                                                   |
| Plugin installation         | Directory-source marketplace — fix takes effect on reinstall/reload of working tree.                                                            |
| Single-user, single machine | No concurrent sessions to reason about.                                                                                                         |
| Assumption                  | The build command (`/specmanager-build`) is the only entry point that starts a build; it is the right place to write any "active build" marker. |

---

## High-level user flows

**Non-build session (must be a no-op):**

- User runs any non-build command (draft PRD, ask a question).

- Session stops. Stop hook fires.

- `resolveActiveCard` finds no active-build signal for this session → returns null.

- Hook exits 0 immediately. No gate, no iteration, no phase-blocked call.

**Build session (must gate correctly):**

- User runs `/specmanager-build`. Build command writes a session-scoped active-build marker (mechanism TBD by architect — options below).

- Session stops mid-build. Stop hook fires.

- `resolveActiveCard` reads the marker → resolves to the in-flight phase and feature.

- Gate evaluates tasks + test command. If incomplete, prompts continuation. At cap, marks only that phase blocked.

- When build phase completes, marker is cleared. Subsequent stops are no-ops.

---

## Active-card resolution options (architect to decide)

The following candidate signals are presented for the architect to evaluate — only one needs to be selected:

| Option                      | Mechanism                                                                                                                             | Trade-offs                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| A. In-progress phase status | `resolveActiveCard` filters to features/phases whose status is `in_progress`; build command sets this on phase start                  | Re-uses existing status field; requires phase status to be set reliably and cleared on completion |
| B. Session marker file      | Build command writes `.claude/specs/.cache/active-build.json` (`{featureId, phase, sessionId}`); hook reads it; cleared on phase done | Explicit and unambiguous; survives process crashes only if cleared on resume                      |
| C. Git branch correlation   | Convention: build branches named `build/<featureId>/<phase>`; hook reads `git branch --show-current`                                  | Zero new state; brittle if user doesn't follow branch convention                                  |
| D. Recent build commit tag  | Build command commits with a known tag; hook reads git log                                                                            | Complex; depends on git state                                                                     |

Preferred candidates: A or B — both are explicit, live in `core/`, and require no external convention.

---

## Open questions

1. **Marker lifecycle on crash:** if a build session crashes mid-phase without clearing the marker (options A or B), how should the next non-build session treat a stale marker? Should the gate check task states to detect "stale in-flight" vs. "genuinely in-flight"?\
   Answer: architect to decide
1. **Phase status vs. marker:** if option A is chosen, does `in_progress` phase status already exist in the schema, or does it need to be added?\
   Answer: architect to decide
1. **Selftest infrastructure:** does `selftest-stopgate` already exist as a file, or does it need to be created from scratch?\
   Answer: architect to check
