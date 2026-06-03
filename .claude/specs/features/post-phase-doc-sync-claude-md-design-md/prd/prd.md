---
id: prd-post-phase-doc-sync-claude-md-design-md-009
featureId: feat-post-phase-doc-sync-claude-md-design-md
stage: prd
status: approved
stale: false
title: Post-phase doc sync (CLAUDE.md + DESIGN.md) PRD
dependsOn: []
basedOn: {}
generatedBy: human
version: 2
createdAt: '2026-06-02T11:59:28.735Z'
updatedAt: '2026-06-02T13:11:09.314Z'
---
## Problem

When a build phase of a feature completes, real code now exists but the project's documentation lags behind:

- **CLAUDE.md** still describes the pre-phase state of the codebase. SpecManager only ever refreshes its own _managed lifecycle block_ (between `<!-- specmanager:start -->` / `<!-- specmanager:end -->`) — it never regenerates the general codebase documentation that Claude Code's native `/init` writes _outside_ those markers. So the codebase-orientation part of CLAUDE.md drifts every phase.

- **DESIGN.md** is only refreshed on `feature.shipped` (via the server-side `startDesignMdAutoSync` listener in `mcp.ts`, which schedules `syncDesignMd({ mode: "refresh" })` on that event). A feature can land many phases before it ships, so the design spec is stale for the whole interim.

The drift is worst right after a phase lands — exactly when the next contributor (human or agent) reads the docs to orient. The user wants post-phase completion to optionally re-sync both docs, with the user controlling _when_ the sync happens.

## Users & jobs-to-be-done

- **The plugin author / solo maintainer (primary).** After finishing a phase, wants the docs to reflect what was just built, but doesn't always want to refresh _before_ they have manually verified the phase works. Job: "I just built a phase — keep my docs honest, but let me choose to do it now or after I've checked the work."

- **The next agent session.** Reads CLAUDE.md and DESIGN.md to orient before touching the code. Job: "Trust the docs as a current description of the codebase."

## Goals

1. After a phase is **fully done** in `/specmanager-build`, ask the user (via AskUserQuestion) how to sync docs, offering three choices: **full sync now** (recommended, pre-selected default), **managed blocks only**, or **wait**.
1. "Full sync now" runs three things from inside the interactive command: Claude Code's native `/init` (regenerates the codebase-doc region of CLAUDE.md), `sync_claude_md` (refreshes the managed lifecycle block), and `sync_design_md({ mode: "refresh" })` (refreshes the DESIGN.md managed block).
1. "Managed blocks only" is the lighter option — it runs `sync_claude_md` + `sync_design_md({ mode: "refresh" })` but **skips** the slow, verbose native `/init`. For when the codebase docs don't need regenerating but the managed blocks should stay current.
1. If the user chooses "wait", the command prints the **exact manual command** to run the same sync later.
1. `/specmanager-init` runs `/init` as part of init, so the user never has to run `/init` separately to get codebase docs.
1. The native `/init` region and SpecManager's managed blocks stay strictly non-overlapping — neither clobbers the other.

## Non-goals

- **No auto-running anything without asking.** The post-phase sync is always gated behind the AskUserQuestion prompt. We do not silently sync on phase completion.

- **No server-side** **`/init`.** `/init` is a native Claude Code slash command that only the agent can invoke inside an interactive session. The MCP server and board server cannot call it. We do **not** attempt to add `/init` to `startClaudeMdAutoSync` / `startDesignMdAutoSync` or any event hook. The existing server-side autosyncs (managed-block only) stay as they are.

- **No change to the** **`feature.shipped`** **DESIGN.md autosync.** That listener stays. This feature _adds_ a per-phase refresh path on top of it; it does not remove the on-ship refresh.

- **No new MCP tools, REST routes, or core functions.** The work is in the two command prompts plus reuse of existing tools (`sync_claude_md`, `sync_design_md`, `specmanager_init`).

- **No redesign of the marker scheme or the sync internals.**

## The two touchpoints

### a) `/specmanager-build` — post-phase sync prompt

`commands/specmanager-build.md` already, at the **"phase fully done"** point (step 8, when the `walkthrough` gate is open), auto-fires the phase-walkthrough draft and then calls `sync_claude_md`. The new behavior hooks in at this _same_ point — never mid-phase. When the builder stops mid-phase (walkthrough gate closed), there is **no** sync prompt.

Desired flow once the phase is fully done:

- After the walkthrough draft is created, present an **AskUserQuestion** with three options. **"Full sync now" is the recommended, pre-selected default.**

  - **Full sync now** *(recommended, default)* — run, in order:

    1. `/init` (native — regenerates the codebase-doc region of CLAUDE.md, outside the managed markers)
    1. `sync_claude_md` (refresh the managed lifecycle block)
    1. `sync_design_md({ mode: "refresh" })` (refresh the DESIGN.md managed block)

  - **Managed blocks only** — run `sync_claude_md` + `sync_design_md({ mode: "refresh" })` and **skip** native `/init`. The fast path for when the codebase docs don't need regenerating but the managed blocks should reflect the new state.

  - **Wait until I've verified the phase** — do not sync. Print the exact manual command (below) so the user can run the identical sync later, after manual verification.

- The existing step-8 `sync_claude_md` call is **superseded** by this flow: the managed-block refresh now happens as part of "full sync now" / "managed blocks only", or is deferred entirely if the user chooses "wait". On "wait" all three steps defer together for a single clean choice — we do not refresh the managed block immediately while telling the user the rest is deferred, as that splits the sync into two confusing halves.

### b) `/specmanager-init` — include `/init`

`specmanager_init` (core `initProject`) already runs `syncClaudeMd` + `syncDesignMd({ mode: "init" })` for the managed blocks. It cannot run native `/init`. So `commands/specmanager-init.md` gains a step: after the `specmanager_init` MCP tool returns, the command also runs native `/init` so CLAUDE.md gets its codebase-doc region populated. Order: run `specmanager_init` first (creates the file / managed blocks), then `/init` (fills the surrounding codebase docs). Both regions are non-overlapping, so order is for clarity, not correctness.

## `/init` vs managed-block separation (must not clobber)

Two distinct, non-overlapping regions of CLAUDE.md:

- **Native** **`/init`** **region** — general codebase documentation, written by Claude Code's `/init`. Lives **outside** the SpecManager markers. SpecManager never writes here.

- **SpecManager managed block** — the lifecycle table, between `<!-- specmanager:start -->` / `<!-- specmanager:end -->`, written only by `syncClaudeMd`. `/init` must not touch inside these markers.

Likewise in DESIGN.md, `syncDesignMd` owns only the region between `<!-- specmanager:design:start -->` / `<!-- specmanager:design:end -->`. `/init` does not write DESIGN.md at all.

Because the two writers target disjoint regions, running them in sequence is safe. The PRD requires the implementation to preserve this invariant and to verify (in acceptance) that running `/init` then `sync_claude_md` leaves both regions intact.

## The exact manual-command text shown when the user chooses "wait"

When the user picks "wait", the command must print a line they can copy verbatim later. Proposed text (final wording is an open question, but it must be a single runnable instruction):

```
Docs not synced. After you've verified this phase, re-sync manually:
  /init   (then)   sync_claude_md   +   sync_design_md(refresh)
```

The intent: the user is told both how to re-trigger the prompt and what the three underlying steps are, so the deferred sync is reproducible without guessing.

## Success metrics

- After a phase completes, the user is always offered the sync choice (no silent sync, no skipped prompt), with "full sync now" pre-selected as the default — verifiable by walking the build command.

- Choosing "full sync now" produces a CLAUDE.md whose codebase-doc region reflects the just-built code AND a refreshed managed block AND a refreshed DESIGN.md managed block.

- Choosing "managed blocks only" refreshes both managed blocks but leaves the codebase-doc region untouched (no `/init`).

- Choosing "wait" leaves all docs untouched and surfaces a copy-pasteable manual command.

- Running `/specmanager-init` on a fresh project yields a CLAUDE.md with both a populated codebase-doc region and the managed block, plus a DESIGN.md.

## Constraints & assumptions

- **`/init`** **is agent-only, interactive-only.** It cannot be invoked from the MCP or board servers. All `/init`-running behavior must live in the slash-command prompts. (Verified in the codebase.)

- The work is **prompt-level**: edits to two `.md` command files plus reuse of existing tools. No new tools/routes/core functions. This keeps it aligned with the "be simple, incremental, don't overengineer" rule.

- `sync_design_md` accepts `mode: "init" | "refresh"` (default `refresh`); `sync_claude_md` takes no args. Both are already registered MCP tools.

- The server-side `startClaudeMdAutoSync` / `startDesignMdAutoSync` listeners (managed-block-only refresh) remain unchanged.

- **Decision:** "full sync now" is the recommended, pre-selected default in the AskUserQuestion. The user can still choose "managed blocks only" or "wait", but the safe-and-current path is one keystroke away.

- **Assumption:** per-phase DESIGN.md refresh is acceptable even though DESIGN.md historically only refreshed on ship. This feature deliberately makes DESIGN.md refresh _per phase_ when the user opts in. The on-ship autosync stays as a backstop.

## High-level user flows

- **Phase finishes, full sync now (default):** builder returns → phase fully done → walkthrough draft created → AskUserQuestion (default "Full sync now") → `/init` → `sync_claude_md` → `sync_design_md(refresh)` → report includes what synced.

- **Phase finishes, managed blocks only:** same up to the question → user picks "Managed blocks only" → `sync_claude_md` → `sync_design_md(refresh)`, no `/init` → report notes the codebase-doc region was left as-is.

- **Phase finishes, wait:** same up to the question → user picks "Wait" → no sync → command prints the exact manual re-sync instruction → report notes docs were intentionally not synced.

- **Phase stops mid-way:** builder stops, walkthrough gate closed → no walkthrough, no sync prompt → report the stop only (unchanged from today).

- **Project init:** user runs `/specmanager-init` → `specmanager_init` (managed blocks + DESIGN.md) → native `/init` (codebase docs) → report both.

## Acceptance criteria

1. `/specmanager-build`, only when a phase is fully done (walkthrough gate open), presents an AskUserQuestion with exactly three choices — full sync now / managed blocks only / wait — with "full sync now" pre-selected as the default.
1. "Full sync now" runs `/init`, then `sync_claude_md`, then `sync_design_md({ mode: "refresh" })`, in that order.
1. "Managed blocks only" runs `sync_claude_md` then `sync_design_md({ mode: "refresh" })` and does **not** run `/init`.
1. "Wait" performs no sync and prints a single copy-pasteable manual re-sync instruction.
1. When the builder stops mid-phase, no sync prompt appears (behavior matches today's mid-phase stop).
1. `/specmanager-init` runs native `/init` in addition to the existing `specmanager_init` tool call, and reports that codebase docs were (re)generated.
1. After "sync now" or `/specmanager-init`, the SpecManager managed blocks in CLAUDE.md and DESIGN.md are intact and the native `/init` content lives outside the CLAUDE.md markers — neither region overwrites the other.
1. No new MCP tools, REST routes, or core functions are introduced; server-side autosync listeners are unchanged.

## Resolved decisions

All prior open questions are resolved and folded into the body above:

1. **Default option** — "Full sync now" is the recommended, pre-selected default in the AskUserQuestion.
1. **Managed-block timing on "wait"** — all three steps defer together; nothing syncs on "wait".
1. **Deferred manual-command wording** — finalized in *The exact manual-command text* section.
1. **DESIGN.md refresh cadence** — per-phase opt-in refresh is **additive** to the existing on-`feature.shipped` autosync, not a replacement.
1. **`/init` cost/noise** — addressed by offering the lighter "managed blocks only" option that skips `/init`.
