---
id: plan-rename-execute-command-to-build-003
featureId: feat-rename-execute-command-to-build
stage: plan
status: approved
stale: false
title: Rename execute command to build plan
dependsOn:
  - arch-rename-execute-command-to-build-002
basedOn:
  arch-rename-execute-command-to-build-002: 1
generatedBy: human
version: 2
createdAt: '2026-05-29T10:38:00.912Z'
updatedAt: '2026-05-29T10:45:25.078Z'
---
## Overview

This is a pure naming refactor of SpecManager's own repo: rename the user-facing command `/specmanager-execute` → `/specmanager-build` and flip every surrounding "execute" reference (the command file itself, board UI copy strings, the managed-`CLAUDE.md` generator string, one MCP description, the internal self-test, and live docs) to "build", with **no behaviour change**. Because there is no data migration, no `@specmanager/core` logic, and no MCP tool-name change, the work is a single coordinated change set that must land together — so the plan is **one phase**. The phase split is trivial (one phase) precisely because the architecture establishes there is no working-software boundary to cross mid-rename: a half-applied rename would leave the board emitting a command that does not resolve. Tasks are ordered so the command-file rename lands first (closing the transition-window 404 risk the architecture flags) and verification lands last.

**Scale:** `1` trivial · `2` small · `3` moderate · `5` substantial · `8` large · `13`/`21` epic.

_Every task below is decomposed to **≤3 points**. This work is genuinely small — nothing here needed splitting from a 5/8; the items are naturally small string/file edits — and the single phase subtotal is unchanged by the granularity._

| Phase | Theme | Points |
|-------|-------|--------|
| Rename | Atomic `/specmanager-execute` → `/specmanager-build` rename + verification | 10 |
| **Total** | | **10** |

---

## Phase Rename — Atomic `/specmanager-execute` → `/specmanager-build` rename + verification

**Exit test:** After applying this phase, run `npm run build` (server + a fresh UI build), then `sync_claude_md`, then in a Claude session type `/specmanager-` and confirm `/specmanager-build` appears (and `/specmanager-execute` does not). Run `/specmanager-build <feature> next` against a feature with an approved plan and confirm it drives exactly one phase via the `builder` subagent and stops at the phase boundary — observably identical to the old command. Finally, `grep -rIn "specmanager-execute" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist . | grep -v "/.claude/specs/"` returns only the deliberately retained dated-walkthrough hits (zero if Open question 1 is resolved toward full rewrite), and `claude plugin validate` passes.

| # | Task | Pts | Notes |
|---|------|-----|-------|
| 1.1 | Rename `commands/specmanager-execute.md` → `specmanager-build.md` and flip its in-file copy | 2 | Land this FIRST to avoid the transition-window 404. `git mv` the file (renames command + derived skill), then update `description` frontmatter, body title, and in-prompt verbs ("nothing to build", "build it first", "build a phase out of order"). Keep `argument-hint`, the 8 steps, gate/order/idempotency checks, and the `Task({ subagent_type: "builder" })` call byte-identical apart from the verb. |
| 1.2 | Flip board UI slash strings + tooltips in `ui/src/App.tsx` and `ui/src/BuildPanel.tsx` | 2 | App.tsx lines 139 (comment), 144 (emitted slash), 178 (copy tooltip); BuildPanel.tsx lines 206 (emitted slash), 230 (copy tooltip). Both surfaces flip in lockstep so no UI emits the old command. |
| 1.3 | Update the managed-`CLAUDE.md` generator string in `server/src/core/claude-md.ts` | 1 | Line 86 hard-codes the command bullet list; swap `/specmanager-execute` → `/specmanager-build`. Do NOT hand-edit the rendered `CLAUDE.md`; it regenerates on `sync_claude_md` (task 1.6). |
| 1.4 | Update the `get_next_phase` description copy in `server/src/mcp.ts` | 1 | Line 362, "Used by /specmanager-execute." → "…/specmanager-build." Copy only — the MCP tool name `get_next_phase` is unchanged. |
| 1.5 | Rename the internal self-test to `selftest-build` | 2 | `git mv server/src/selftest-execute.ts → selftest-build.ts`; update temp-dir prefix `"specmanager-execute-"` (line 38) and header prose; update `server/package.json` script `selftest-execute` → `selftest-build` and its `dist/*.js` path. Per architecture Q4 recommendation (grep-clean). |
| 1.6 | Rewrite live docs (`README.md`) and regenerate `CLAUDE.md` | 1 | `README.md` lines 42, 61 (`/specmanager-execute`) and 116 (`npm run selftest-execute` → `selftest-build`). Run `sync_claude_md` so the managed `CLAUDE.md:15` region picks up task 1.3. Dated `docs/phase-7-*` / `docs/phase-design-*` walkthroughs are NOT rewritten (see Open questions). |
| 1.7 | Build, fresh UI bundle, and run the verification checklist | 1 | `npm run build` (server) + UI build so `ui/dist` no longer carries the old string; run the renamed `npm run selftest-build`; run the architecture's grep (excluding `node_modules`/`.git`/`dist`/`.claude/specs`); `claude plugin validate`. This is the per-phase verification task, not a separate phase. |

---

## Risk & sequencing notes

- **Land 1.1 first.** The architecture's load-bearing failure case is the transition window: if the board UI (1.2) ships a `/specmanager-build` string while only `specmanager-execute.md` exists, the user pastes a command that does not resolve. Renaming the command file first closes that gap; treat 1.1–1.6 as a single change set landed together.
- **Generator-before-render ordering.** 1.3 edits the source-of-truth string; the rendered `CLAUDE.md` only updates when `sync_claude_md` runs in 1.6. Never hand-edit the managed region between the `specmanager:start`/`end` markers.
- **Stale build artifacts.** `ui/dist/assets/index-*.js` is a compiled bundle carrying the old string; the verification grep must exclude `dist/` or it false-positives, and a fresh UI build (1.7) is required so the served board emits the new string.
- **Rollback is trivial** — every change is a string/file rename with no data migration, fully reversible via git. No `@specmanager/core`, gate, staleness, or `builder`-agent state is touched.

## Test strategy

Follow the repo's existing self-test convention (`server/package.json` `selftest-*` scripts run compiled `dist/*.js`). No new test files are written for a behaviour-preserving rename; instead the existing `selftest-execute` self-test is renamed to `selftest-build` (1.5) and run as part of verification (1.7) to prove the build loop is unchanged. The phase's exit test is the authoritative gate: command discovery, a real one-phase `builder` run, the repo-wide grep, and `claude plugin validate`.

## Out of scope

- No behaviour, argument, gate, order-check, idempotency, or builder-invocation change.
- No `@specmanager/core` logic, MCP tool-name, staleness, or state-transition change.
- No rename of the `builder` agent (`agents/builder.md` carries no command string).
- No deprecated-alias command file (per architecture Q1 recommendation: hard removal).
- No new flags, features, or Build-panel UX redesign.

## Open questions

- **Dated walkthrough docs (architecture Q2).** `docs/phase-7-*-test-walkthrough.md`, `docs/phase-7-execute-and-phased-plans.md`, and `docs/phase-design-*-test-walkthrough.md` are dated records of what shipped. The plan follows the architecture's recommendation to **leave them as historical record** and scope the grep to tolerate those hits. If you prefer a fully zero grep, that adds a rewrite-all-docs task (and renaming `docs/phase-7-execute-and-phased-plans.md`, which risks breaking inbound links) — confirm before 1.6.

Answer: ok follow architectural recommendation
- **Deprecated alias (architecture Q1).** Plan assumes hard removal (no `specmanager-execute.md` forwarder), making the grep target zero. Confirm you do not want a back-compat alias for muscle memory.

Answer: ok

## Notes on estimates

Points here are relative complexity, not hours — and this is a deliberately small, low-variance change set, so calibrate sparingly after the phase ships if anything surprised you. Every task is **≤3 points**; nothing was split down from a 5/8 because no item was that large to begin with, so the single phase subtotal of 10 reflects genuine small work, not hidden decomposition. Verification and the doc/regenerate step are their own tasks (1.6, 1.7) rather than afterthoughts, so "installable, discoverable, and behaviourally identical" stays a real exit gate the phase must pass before it counts as shipped.
