# Prompt-surface invariant inventory — independently re-derived

**Feature:** `feat-opus-5-readiness` · **Task:** `task-001` (plan row 1.1) · **Date:** 2026-08-11

**Path choice.** The plan's row 1.1 names no output path. `docs/temp/` is gitignored
(`.gitignore:11`), and this file is the input to rows 1.2, 1.8, 1.9 and 3.12 and must survive
a `git bisect` over the `trim` phase, so it lives at a **tracked** path: `docs/prompt-invariants-derived.md`.

---

## Method (and its one hard constraint)

Derived **forward from the source files only**. The Architecture's `INV-1…INV-15` table was
deliberately **not** read — Architecture open question 3 requires this enumeration to be
independent, because a transcription reproduces the table's blind spots and `selftest-prompts`
cannot catch an invariant nobody enumerated. Reconciling the two lists is `task-002`.

**Read:** 7 files in `plugins/specmanager/agents/`, 9 in `plugins/specmanager/commands/`,
`docs/agent-snippets/design-grounding.md`, `plugins/specmanager/hooks/stop-gate.sh`, and the
enforcement points in `plugins/specmanager/server/src/core/` (`tasks.ts`, `dependencies.ts`,
`documents.ts`, `status.ts`, `phases.ts`, `phase-completion.ts`, `shipped.ts`, `tiers.ts`,
`active-build.ts`, `active-card.ts`, `types.ts`) plus `server/src/mcp.ts` tool registrations.

Ids are `D-nn` (**D**erived), deliberately *not* `INV-n`, so `task-002` reconciles two lists
rather than silently assuming a 1:1 correspondence.

### Definitions used

| Term | Meaning here |
|---|---|
| **Load-bearing** | Removing the sentence changes agent behaviour or loses a guarantee. Not "true" — *consequential*. |
| **Core-enforced** | `core/` (or a frontmatter `tools:` allowlist) makes the violation **impossible or loud**. A rule `core/` merely *supports* is not enforced. |
| **Survivor** | When a rule is stated N times, the one statement the trim keeps and `selftest-prompts` anchors its pattern to. |
| **Trim risk** | **Direct** = a `trim`-phase task edits the region containing this rule. **Indirect** = adjacent prose is edited. **None** = outside the trim surface. |

### The enforcement finding that changes the picture

**`checkGate` is never called on a write path.** `grep -n "checkGate" server/src/core/*.ts
server/src/mcp.ts` returns exactly one call site: `mcp.ts:272`, inside the `check_gate` tool
handler. `createDocument` (`core/documents.ts:161–221`) consults no gate; `createTask`
(`core/tasks.ts:156`) consults no gate. **Gates are advisory queries that the prompts choose to
honour.** Every "check the gate / don't bypass the gate" line is therefore prompt-only and
load-bearing — the opposite of how it reads. This single fact reclassifies **D-04**, **D-86**,
and half of **D-02** from "safe restatement" to "must survive".

The same shape recurs three more times, and each is a place where a rule *looks* backstopped:

- **Optimistic concurrency (D-33)** — `writeDocument` (`documents.ts:238`) only enforces the
  version check when the caller actually passes `baseVersion`
  (`typeof input.baseVersion === "number"`). Omit it and the guard silently does not exist.
- **Walkthrough `phase` (D-44)** — `createDocument:184` *defaults* a missing `phase` to
  `DEFAULT_PHASE`. Omitting it files the doc under `default` with no error.
- **`dependsOn`/`basedOn` (D-32)** — `createDocument:205–206` defaults both to empty. A doc with
  no links is structurally valid and silently outside the staleness graph.

All four are **silent-wrong**, not loud-fail. They are the highest-value entries in the table.

### Second structural finding: only two agents have a `tools:` allowlist

`builder.md:5` and `reviewer.md:5` declare `tools:`; `architect`, `designer`, `planner`,
`prd-writer`, and `walkthrough-writer` declare none and therefore inherit **all** tools,
including `set_status`. So "Don't approve the doc" is **structurally enforced for the builder
only** (its allowlist omits `set_status`) and **prompt-only for the other five** — the same
sentence has a different load-bearing status depending on which file it sits in. A trim that
treats the nine `Don't approve` bullets as one interchangeable family will delete the five that
matter and keep one that doesn't. See **D-31**.

Caveat on the reviewer: its allowlist is `Read, Glob, Grep, Bash`. **`Bash` can write.** The
"read-only" claim is *narrowed* by the frontmatter, not *enforced* by it. See **D-26**.

---

## A. Lifecycle & gate semantics

### D-01 — Single-phase features never produce a `final` walkthrough

**Sites (10 across 5 files):** `agents/builder.md:82` · `agents/walkthrough-writer.md:11`,
`:42`, `:86` · `commands/specmanager-build.md:49`, `:68`, `:81` ·
`commands/specmanager-walkthrough.md:16`, `:19`, `:34`

**Must survive (quoted):**
> "For a **single-phase feature** the per-phase (or `"default"`) walkthrough is the **terminal**
> artifact — approving it ships the feature (`isFeatureShipped`); no `"final"` roll-up is ever
> written."  — `walkthrough-writer.md:11`

> "Single-phase feature: the per-phase walkthrough is terminal; there is no `final` roll-up."
> — `specmanager-walkthrough.md:16`

**Core enforcement — partial, and the gap is the point.** `isFeatureShipped`
(`core/shipped.ts:13–26`) enforces the *shipping consequence*: a single-phase feature ships when
its only phase's walkthrough is approved. `getPhaseCompletion` exposes `isSinglePhase`
(`core/phase-completion.ts:44`). But **`checkGate` does not refuse `final` on a single-phase
feature** — `dependencies.ts:68–93` opens the `final` gate as soon as every phase has an approved
walkthrough, which for a one-phase feature is satisfied by that one walkthrough. A `final`
roll-up on a single-phase feature is fully creatable; nothing in `core/` stops it.

**Why loss matters:** the feature would ship (event fires, DESIGN.md refreshes) and then a
redundant `final` doc could still be drafted and approved, re-firing `feature.shipped` and
producing a walkthrough that links exactly one phase. Purely prompt-prevented.

**Multi-site collapse — four survivors, one per actor.** These are four *independent* prompt
contexts; a single survivor cannot cover them because each actor reaches the rule alone:

| Actor | Survivor | Reason |
|---|---|---|
| `specmanager-walkthrough.md` | **`:16` (step 3), verbatim** | The only *executable* refusal — a user typing `final` directly. Plan 3.8 already pins it verbatim. Drop `:34`; `:19`'s parenthetical is a pointer, not a statement. |
| `walkthrough-writer.md` | **`:11`** | The agent can be dispatched with `phase: "final"` by the parent without the command. Drop `:42`'s repeat and `:86`'s Don't; keep `:42`'s *refusal string* only. |
| `specmanager-build.md` | **`:49` (step 8.3)** | The auto-fire path. Drop `:68`, `:81`. Matches plan 3.9's "3 → 1". |
| `builder.md` | **`:82`** | The suggestion path; the builder returns to the user, not to the command. |

**Proposed `selftest-prompts`:** `min: 4`, `max: 10` → post-trim `max: 4`. **`min` must be 4,
not 1** — a pattern with `min: 1` stays green if three of the four actors lose the rule.

---

### D-02 — Walkthrough gates are completion-based (per-phase) / all-approved (`final`)

**Sites:** `walkthrough-writer.md:16`, `:44` · `specmanager-walkthrough.md:17–19`

**Must survive:**
> "**Gate:** opens only when every task in the phase is `done` … If you arrive with undone
> tasks, refuse and report which." — `walkthrough-writer.md:16`

**Core enforcement — yes, in `checkGate`** (`core/dependencies.ts:64–114` for a phase name,
`:68–93` for `final`). *But* per the finding above, `checkGate` runs only when someone calls
`check_gate`. The slash command calls it (`specmanager-walkthrough.md:17`); the **agent** can be
dispatched directly by `/specmanager-build` step 8.3 without any gate call — so
`walkthrough-writer.md:16`'s self-refusal is the only guard on that path.

**Multi-site:** survivor = `walkthrough-writer.md:16` (the agent's own refusal) **and**
`specmanager-walkthrough.md:17` (the command's gate call). Different mechanisms, not duplicates.
`walkthrough-writer.md:44` (final-mode gate) may collapse into `:42`.

**Proposed:** `min: 2`, `max: 4`.

---

### D-03 — The interview sits outside the staleness graph and has no lifecycle

**Sites:** `agents/prd-writer.md:29` · `commands/specmanager-interview.md:35–37`, `:130–131`

**Must survive:**
> "`dependsOn: []` / `basedOn: {}` is a hard contract — the interview sits outside the staleness
> graph; never link it." — `specmanager-interview.md:36–38`

> "Don't give the interview `dependsOn`/`basedOn` links or approve it — no lifecycle; it stays a
> `draft` reference doc forever." — `specmanager-interview.md:130–131`

**Core enforcement — partial.** `checkGate` filters `kind !== "interview"`
(`dependencies.ts:118–121`) so an interview can never open a downstream gate, and
`claude-md.ts:59–62` filters it from the stage-label table so it can't shadow the PRD. **But
nothing prevents `create_document({ kind: "interview", dependsOn: [...] })` from carrying links,
and nothing prevents `setStatus(interviewId, "approved")`** — `status.ts:10` has no `kind` check.

**Why loss matters:** a linked interview injects a node into `propagateStale`'s `dependsOn` walk
(`status.ts:66–77`), so reopening a PRD would flag the interview stale — a badge on a doc that
by contract has no lifecycle. An *approved* interview additionally satisfies nothing but renders
wrongly on the board.

**Multi-site:** survivor = `specmanager-interview.md:36–38` (the persistence site — this is where
the violation would actually be written). `prd-writer.md:29`'s clause is a **separate** rule
(don't link the interview *from the PRD*) and stays. `:130–131`'s Don't is the collapsible one.

**Proposed:** `min: 2`, `max: 3`.

---

### D-04 — `check_gate` must be called; never generate around a closed gate

**Sites:** `specmanager-architecture.md:11`, `:23` · `specmanager-design.md:11`, `:27` ·
`specmanager-plan.md:11` · `specmanager-build.md:18`, `:73` · `specmanager-walkthrough.md:17`

**Must survive:**
> "Don't bypass `check_gate`. The gate is the contract." — `specmanager-architecture.md:23`

**Core enforcement — NO.** See the finding above: `checkGate` has exactly one call site,
`mcp.ts:272`, the tool handler. `createDocument` never consults it. An agent that skips the
call can persist an Architecture doc with no approved PRD, and nothing errors.

**Why loss matters:** the entire stage-gating guarantee — the property CLAUDE.md advertises as
"Gate enforcement lives in `core`, not in prompts" — is, at the *write* path, prompt-honoured.
Losing the instruction silently converts the lifecycle into a suggestion.

**Multi-site:** survivor **per command file** — four independent entry points
(`-architecture`, `-design`, `-plan`, `-build`). Plan 3.8 compresses steps 1–3 of the drafting
commands into one line each; the gate call must survive that compression as an *imperative*, and
the `Don't bypass` bullet can go where the step retains the call.

**Proposed:** `min: 4` (one per gated command), `max: 8`. Anchor on the `check_gate(` call, not
on the Don't bullet — the call is the behaviour.

---

### D-05 — Design is optional; the Plan gate refuses only on a *draft* design

**Sites:** `specmanager-plan.md:11` · `architect.md:16` · `planner.md:29` · `builder.md:23` ·
`specmanager-init.md:89–96`

**Must survive:**
> "if none exists, proceed as before (design is optional)." — `builder.md:23`

**Core enforcement — yes**, `checkGate` stage `plan` (`dependencies.ts:132–146`) with the reason
string `"design stage is not approved (design is optional — delete the draft to skip)"`.

**Why the prompt copies still matter:** the *gate* half is enforced; the *agent-behaviour* half
("no design doc ⇒ proceed, don't block") is not. An agent that treats a missing design doc as an
error stalls with no gate involved.

**Multi-site:** survivor = one clause per design-reading agent (`architect`, `planner`,
`builder`). `specmanager-plan.md:11`'s user-facing explanation is a fourth, different audience.

**Proposed:** `min: 3`, `max: 5`. **Overlaps D-50/INV-15's snippet-parity pair (row 1.9)** — the
same paragraph carries both rules; the two patterns must not double-count. Flagged for 1.9.

---

## B. Task & artifact discipline

### D-06 — Every persisted task scores ≤3; split anything ≥5 first

**Sites:** `planner.md:3` (description), `:22`, `:24`, `:105` · `specmanager-plan.md:2`, `:21` ·
`builder.md:8`, `:67`

**Must survive:**
> "**Every task you persist must score ≤3.** Anything that would score 5+ must be split before
> calling `create_task`." — `planner.md:24`

**Core enforcement — YES, loud.** `MAX_TASK_COMPLEXITY = 3` (`core/types.ts:27`),
`assertSplittable` → `SplitRequiredError` (`core/tasks.ts:19–27`, `:39–43`), called from
`createTask` (`:157`) and `updateTask` (`:190`).

**Multi-site:** survivor = `planner.md:24`'s **first sentence only** (the actionable
self-check). The trailing "The server rejects `complexity ≥ 5` with `splitRequired`" and
`planner.md:105`'s Don't are pure restatements of a loud error — safe. Plan 3.4 removes one of
the two; **it must remove the error-name restatement, not the ≤3 rule**, because splitting
*before* persisting is the behaviour and the error is only the backstop.

`builder.md:67`'s `splitRequired` mention is a *different* rule (escalate rather than re-size
inside the builder) — see D-09b below; do not collapse it into this family.

**Proposed:** `min: 1` (in `planner.md`), `max: 8` → post-trim `max: 4`.

---

### D-07 — A `done` transition requires ≥1 commit or file artifact

**Sites:** `builder.md:32`, `:65`, `:67`, `:71`

**Must survive:**
> "You must record real artifacts." — `builder.md:32`

**Core enforcement — YES, loud.** `MissingArtifactError` (`core/tasks.ts:29–37`) thrown at
`tasks.ts:207`. Note the *exact* edge: enforced only on `todo|in_progress → done`; idempotent
`done → done` writes are exempt (`tasks.ts:204–209`). **No prompt states that exemption**, so
the trim loses nothing by collapsing here.

**Multi-site:** survivor = `builder.md:32` (actionable: *record* artifacts). `:71`'s Don't and
`:65`/`:67`'s error-name restatements are collapsible — matching plan 3.4's "L67 + L71 go;
L32's 'record real artifacts' stays".

**Proposed:** `min: 1`, `max: 4` → post-trim `max: 1`.

---

### D-08 — Mark `in_progress` **before** doing the work

**Sites:** `builder.md:29`, `:74`

**Must survive:**
> "Do this BEFORE you write code so the board reflects live state." — `builder.md:29`

**Core enforcement — NO.** `updateTask` (`core/tasks.ts:189–214`) accepts a direct
`todo → done` transition provided artifacts are present. Nothing requires the intermediate edge.

**Why loss matters:** the board's live-state signal is the entire reason the kanban exists during
a build. A builder that only writes `done` produces a board that jumps from empty to complete —
invisible progress, and `resolveActiveCard`'s `openTaskIds` (`active-card.ts:68`) still works,
so nothing fails loudly.

**Multi-site:** survivor = `builder.md:29`. `:74`'s Don't is collapsible. **Proposed:**
`min: 1`, `max: 2` → post-trim `max: 1`.

---

### D-09 — The builder stops at the phase boundary and never starts the next phase

**Sites:** `builder.md:3` (description), `:8`, `:64`, `:70` · `specmanager-build.md:2`
(description), `:74`

**Must survive:**
> "Do not look at the next phase. Do not start tasks from the next phase even if they look
> small." — `builder.md:64`

> "Don't run two phases back-to-back; the user reviews each one." — `specmanager-build.md:74`

**Core enforcement — NO.** The builder's `tools:` allowlist includes `update_task` with no phase
scoping; `listTasks` returns every task in the feature. Nothing prevents cross-phase writes.

**Why loss matters:** the phase boundary *is* the human review point. This is the single rule
whose loss would let a run consume a whole multi-phase plan unsupervised.

**Multi-site:** **two survivors, different actors** — `builder.md:64` (the agent) and
`specmanager-build.md:74` (the orchestrator). Plan 3.11 keeps the build.md bullet explicitly.

**Proposed:** `min: 2`, `max: 6`.

#### D-09b — Escalate rather than re-size a task inside the builder

**Site:** `builder.md:67` (second half) · `:75`

**Must survive:** "the task should never need re-sizing inside the builder — escalate instead."

**Core enforcement — NO** (the builder holds `update_task`, which accepts `complexity`).
Distinct from D-06. Plan 3.4 deletes `builder.md:67`; **the `splitRequired` half is a safe
restatement, the escalate half is not.** Flagged for 3.4 — this row risks over-cutting.
Related: `builder.md:75` ("if the work overflows the task, that's a planning bug; surface it").

---

### D-10 — Task state is owned by the builder; the build command never writes it

**Site:** `specmanager-build.md:76` (sole statement)

**Must survive:** "Don't mark tasks `done` from this command — the builder owns task state."

**Core enforcement — NO.** The main session holds the same MCP tools.

**Why loss matters:** the command marking tasks `done` bypasses the builder's artifact recording
and would satisfy `MissingArtifactError` only if it invented artifacts.

**Proposed:** `min: 1`, `max: 1` — already single-sited; the trim must not touch it. Plan 3.11
keeps it.

---

## C. Model & tier dispatch

### D-11 — Model is parent-supplied; the builder never self-selects or pins one

**Sites:** `builder.md:4` (frontmatter `model: inherit`) · `builder.md:15` (the contract prose)

**Must survive:**
> "This agent's frontmatter stays `model: inherit` … never select or pin a model yourself."
> — `builder.md:15`

**Core enforcement — NO.** `core/tiers.ts` computes the mapping but cannot police who calls it.

**Note the asymmetry:** `builder.md:4` is the *mechanism* (machine-read frontmatter);
`builder.md:15` is the *contract* that stops a future edit from changing line 4. Deleting the
prose leaves the mechanism working but undefended. **`reviewer.md:4`'s `model: opus` is the
agent's own default and is a different thing** — plan 3.2 deletes build.md's `model: "opus"`
override at `:38` while keeping `reviewer.md:4`. A pattern matching bare `model:` would conflate
all three.

**Proposed:** `min: 1`, `max: 2` (frontmatter + prose). Anchor on "never select or pin a model
yourself", not on `model:`.

---

### D-12 — Tier routing uses Claude Code **aliases**, never dated model ids

**Sites:** `specmanager-build.md:23`, `:26`, `:86` · `builder.md:15` · (`core/tiers.ts:4–5`,
`:9` as comments)

**Must survive:**
> "Don't pin dated model ids in the tier table — always use Claude Code aliases
> (`haiku`/`sonnet`/`opus`) so a model version bump in a tier is automatic."
> — `specmanager-build.md:86`

**Core enforcement — NO.** `type Alias = string` (`core/tiers.ts:10`) is a documentation type
with no runtime narrowing; `DEFAULT_TIER_TO_ALIAS` (`:20–24`) holds aliases by convention only.

**Why loss matters:** this is the property that makes the plugin survive a model generation with
no update — the feature's own premise.

**Multi-site:** survivor = **`specmanager-build.md`, folded into step 7** per plan 3.9's
"aliases-not-dated-ids 4 → folded into step 7". `builder.md:15` is a separate actor and stays.

**Proposed:** `min: 2`, `max: 4`.

---

### D-13 — Unknown/unavailable alias ⇒ omit `model:`, never error or block

**Sites:** `specmanager-build.md:26`, `:87` · `builder.md:15`

**Must survive:**
> "If the resolved alias is unknown/unavailable, **omit `model:`** so the builder runs at the
> session default (`inherit`) — never error or block (AC4)." — `specmanager-build.md:26`

**Core enforcement — partial.** `aliasForTier` returns the `INHERIT` sentinel for an unknown
**tier** (`core/tiers.ts:39–44`), but the unavailable-**alias** case is entirely the parent's.

**Multi-site:** survivor = `specmanager-build.md:26` (step 7, where the dispatch happens);
`builder.md:15`'s receiving half is a separate actor. `:87`'s Don't is collapsible.

**Proposed:** `min: 2`, `max: 3`.

---

### D-14 — The default complexity → tier → alias table

**Sites:** `builder.md:15` · `specmanager-build.md:23`, `:26`

**Core:** `DEFAULT_COMPLEXITY_TO_TIER` (`core/tiers.ts:13–17`), `DEFAULT_TIER_TO_ALIAS`
(`:20–24`), `tierForComplexity` >3/null ⇒ `strong` (`:30–33`).

> ### ⚠️ Hazard for `task-011` — this entry is a **value**, and `task-007` changes it.
> Row 2.7 re-maps `DEFAULT_TIER_TO_ALIAS.cheap` from `"haiku"` to `"sonnet"`. Any
> `selftest-prompts` pattern that pins the literal string `haiku` will go **red at `task-007`**,
> in the `core` phase, before any prose is trimmed — and the failure will look like an
> over-trim. The pattern for D-14 must anchor on the **structure** ("cheap → \<alias\>",
> three tiers named, `>3`/unscored ⇒ strong) and **never on the alias values**.
>
> Three prompt sites carry the literal `haiku` today (`builder.md:15`,
> `specmanager-build.md:23`, `:26`) and **all three must be updated by `task-031`** to stay
> consistent with `core/tiers.ts`. That consistency is itself worth an invariant: the prompts'
> stated defaults must match `core/tiers.ts`. Recommend `task-002` add it as a new entry.

**Proposed:** `min: 3` (structure), `max: 3`. Value-agnostic pattern, mandatory.

---

## D. Build orchestration

### D-15 — `set_active_build` arms the Stop-gate; without the marker the gate is a no-op

**Site:** `specmanager-build.md:20` (step 4c — sole statement)

**Must survive:**
> "This writes the `.cache/active-build.json` marker that pins the Stop-gate to this exact
> phase; without it the gate is a no-op."

**Core enforcement — the *consequence* is structural, the *obligation* is not.**
`resolveActiveCard` returns `null` with no marker (`core/active-card.ts:56–57`), so the gate is
correctly inert. Nothing makes the command write the marker.

**Why loss matters — this is the most silent failure in the inventory.** If the command stops
calling `set_active_build`, the Stop-gate never fires again, on any feature, forever, with **no
error, no log, and every build appearing to succeed**. There is no test that would notice.

**Proposed:** `min: 1`, `max: 1`. Do not touch. `selftest-stopgate` covers the resolver, not the
caller.

---

### D-16 — `clear_active_build` fires only on terminal paths; never mid-phase

**Sites (9):** `specmanager-build.md:20`, `:30`, `:41`, `:44`, `:47`, `:48`, `:67`, `:80`, `:91`

**Must survive:**
> "Don't `clear_active_build()` on `complete === false` — the build is in flight; only clear on
> the terminal `complete === true` (done) or `blocked` paths." — `specmanager-build.md:80`

**Core enforcement — partial, and it self-heals only the *opposite* error.**
`resolveActiveCard` clears a marker whose pinned phase has no open tasks
(`active-card.ts:73–76`) and one pointing at a deleted feature (`:61–64`). So a **stale** marker
heals. A **prematurely cleared** marker does not — nothing recreates it, and a re-entered session
resumes with the gate disarmed.

**Multi-site:** survivor = **`:44` (the mid-phase branch, where the decision is made) + `:80`
(the Don't)**. Plan 3.9's "6 sites → 1 (step 4c) + 1 Don't" places the survivor at 4c; **4c is
the wrong home for the negative half** — 4c states the pairing obligation (D-15's neighbour),
`:44` states the mid-phase exception. Recommend: keep the pairing at 4c, keep the exception at
`:44`, one Don't at `:80`. Flagged for `task-002` and 3.9.

**Proposed:** `min: 2`, `max: 9` → post-trim `max: 3`.

---

### D-17 — Never infer "phase done" from the builder returning

**Sites:** `specmanager-build.md:42`, `:79`

**Must survive:**
> "**always** call `get_phase_completion({ featureId, phase })` … never infer 'phase done' from
> the fact that the builder returned." — `specmanager-build.md:42`

**Core enforcement — the predicate exists, the obligation does not.**
`getPhaseCompletion` (`core/phase-completion.ts:22–46`) is a pure read; nothing invokes it.

**Why loss matters:** this is the shipped P1 resilience fix. Losing it re-opens the exact bug
`feat-build-pipeline-resilience` closed — a 529 *after* the last task lands strands the phase
with no walkthrough and no doc sync, and the work looks lost when it isn't.

**Multi-site:** survivor = `:42` (step 8, the imperative). `:79`'s Don't is collapsible but plan
3.11 keeps a related bullet — verify no double-count with D-22.

**Proposed:** `min: 1`, `max: 2`.

---

### D-18 — R=2 retries transient overload only; a genuine failure is never retried

**Sites:** `specmanager-build.md:30`, `:32`, `:84`

**Must survive:**
> "A **genuine** task failure (a test won't pass, a missing dependency) is the builder's own stop
> condition and is **not** retried — re-running it would just re-fail; surface it verbatim and
> stop." — `specmanager-build.md:30`

**Core enforcement — NO.** Prompt-only.

**Multi-site:** survivor = `:30` (where the retry is defined). **Proposed:** `min: 1`, `max: 3`.

---

### D-19 — R=2 and the Stop-gate's N=3 do not nest

**Sites:** `specmanager-build.md:32` (whole "Retry-budget boundary" paragraph), `:85`

**Must survive (plan 3.9's chosen parenthetical):**
> "R=2 is a pre-completion transport retry; the Stop-gate's N=3 is a post-stop cap. They do not
> nest."

**Core enforcement — split.** `MAX_ITERATIONS=3` is real (`hooks/stop-gate.sh:62`, counter at
`:134–154`). R=2 is prompt-only. The **non-composition** is prompt-only.

**Why loss matters (weak but real):** composed, the budgets multiply to 9 attempts before a phase
surfaces as blocked.

**Proposed:** `min: 1`, `max: 2`. Pattern must tolerate the paragraph→parenthetical rewrite —
anchor on "do not nest" / "don't compose", not on the paragraph heading.

---

### D-20 — Reviewer fails share the Stop-gate's N=3 budget; no second loop

**Sites:** `specmanager-build.md:41`, `:89`

**Must survive:**
> "This counts against the **same** N=3 Stop-gate iteration budget for the phase — it is **not**
> a second independent loop." — `specmanager-build.md:41`

**Core enforcement — NO.** The Stop-gate counter (`stop-gate.sh:66`) is keyed on
`<slug>__<phase>` and increments per *stop*, not per reviewer verdict; nothing links the two.

**Why loss matters:** an independent reviewer loop is unbounded — the classic infinite re-review.

**Multi-site:** survivor = `:41`. **Proposed:** `min: 1`, `max: 2`.

---

### D-21 — Per-task dispatch is the default; whole-phase only behind `--bulk`

**Sites:** `specmanager-build.md:3` (argument-hint), `:8`, `:12`, `:16`, `:24`, `:28`, `:83`

**Must survive:**
> "Don't make whole-phase dispatch the default — per-task (step 7) is the enforced default; the
> single whole-phase Task fires **only** behind an explicit `--bulk`, which re-accepts a 529's
> blast radius by user choice." — `specmanager-build.md:83`

**Core enforcement — NO.**

**Why loss matters:** bulk-by-default re-accepts the whole-phase blast radius that
`feat-build-pipeline-resilience` removed, and discards per-task tier savings — this feature's
own cost premise.

**Multi-site:** survivor = **step 7's header + the `argument-hint`** (plan 3.9: "5 → 1 (step 7
header) + argument-hint"). The `argument-hint` at `:3` is machine-surfaced in the slash menu and
is not prose — **do not count it as a duplicate**. Flagged.

**Proposed:** `min: 2`, `max: 7`.

---

### D-22 — The sync prompt fires **only** on `complete === true`

**Sites:** `specmanager-build.md:50`, `:70`, `:78`

**Must survive:**
> "the sync `AskUserQuestion` fires **only** on the `complete === true` path; a
> `complete === false` (mid-phase) stop stays prompt-free and syncs nothing."
> — `specmanager-build.md:78`

**Core enforcement — NO.**

**Why loss matters:** syncing CLAUDE.md/DESIGN.md off a half-built phase writes a managed block
describing state that does not exist, and the user is prompted at a moment they have nothing to
verify.

**Proposed:** `min: 1`, `max: 3`.

---

### D-23 — The three sync steps defer together; never a half-synced state

**Sites:** `specmanager-build.md:50` (the three-row table), `:82`

**Must survive:**
> "Don't run `/init` on **Managed blocks only**, and don't refresh any managed block on
> **Wait** — all three sync steps defer together. Never leave a half-synced state."
> — `specmanager-build.md:82`

**Core enforcement — NO.** `sync_claude_md` and `sync_design_md` are independent tools.

**Proposed:** `min: 1`, `max: 2`. Plan 3.11 keeps this bullet.

---

### D-24 — The Wait-branch manual re-sync block prints **verbatim**

**Site:** `specmanager-build.md:59–64`

**Must survive — literally, including spacing:**
> "print this block **exactly as written** — do not paraphrase, reword, or change the spacing"
>
> ```
> Docs not synced. After you've verified this phase, re-sync manually:
>   /init   (then)   sync_claude_md   +   sync_design_md(refresh)
> ```

**Core enforcement — NO.**

**Why loss matters:** this is the **only literal output string** in the prompt surface. It is
the single highest-risk item in the trim, because a compression pass naturally rewords fenced
prose. Plan 3.10 names it explicitly as untouchable.

**Proposed:** `min: 1`, `max: 1`, and the pattern should match the **fenced block's two lines
byte-for-byte**, not the surrounding instruction. This is the one entry where byte equality is
correct.

---

### D-25 — `/init` is a native in-session slash command, not a server/MCP call

**Sites:** `specmanager-build.md:50` · `specmanager-init.md:69–71`, `:86`

**Must survive:**
> "`/init` is a native interactive command the agent runs in-session — it is not a server/MCP
> call." — `specmanager-init.md:70–71`

**Core enforcement — NO.** No `init`-named MCP tool exists to fall back on
(`specmanager_init` is a different tool with different semantics).

**Why loss matters:** an agent that looks for an MCP `/init` finds `specmanager_init`, calls it,
and reports a codebase-doc regeneration that never happened.

**Multi-site:** survivor = `specmanager-init.md:70–71`; build.md's parenthetical at `:50` is a
second actor. **Proposed:** `min: 2`, `max: 3`.

---

### D-30 — The reviewer runs only when every task in the phase is `done`

**Site:** `specmanager-build.md:33` (sole statement)

**Must survive:** "Only do this when every task in the phase is `done` (a mid-phase stop skips
review)."

**Core enforcement — NO.**

**Why loss matters:** reviewing a partial phase produces a `fail` on work that was never
attempted, which then burns the shared N=3 budget (D-20) and blocks a healthy phase.

**Proposed:** `min: 1`, `max: 1`.

---

### D-84 / D-85 / D-86 — Build preconditions

| Id | Rule | Sites | Core? | Proposed |
|---|---|---|---|---|
| **D-84** | Refuse a phase already `done` (idempotency) | `-build.md:22`, `:77` | No | `min: 1`, `max: 2` |
| **D-85** | Refuse out-of-order phases unless `--force` | `-build.md:21` | No — `getNextPhase` (`core/phases.ts:70–76`) *computes* the next phase but refuses nothing | `min: 1`, `max: 1` |
| **D-86** | Plan check is **compound**: gate ok **AND** an approved `plan` doc exists | `-build.md:18`, `:73` | **No, and the second half has no core analogue** — `checkGate(stage:"plan")` verifies the *Architecture* is approved (`dependencies.ts:116–128`); it never checks a plan doc exists. Building a feature with an approved Architecture and no Plan would pass the gate. | `min: 1`, `max: 2` |

**D-86 is a sharp one.** The sentence reads like a restatement of `check_gate` and is not.
Plan 3.11 keeps the `Don't bypass the plan-approved check` bullet; the **compound** clause lives
in step 3 at `:18` and must survive 3.8/3.9's compression.

---

## E. Reviewer contract

### D-26 — The reviewer is read-only

**Sites:** `reviewer.md:3` (description), `:5` (`tools:`), `:8`, `:40`, `:42` ·
`specmanager-build.md:88`

**Must survive:** "you have no such tools and must never request them." — `reviewer.md:40`

**Core enforcement — narrowed, not eliminated.** `reviewer.md:5` is
`tools: Read, Glob, Grep, Bash`. No MCP write tools, no `Edit`/`Write` — **but `Bash` can
write**, and the reviewer is instructed to use it for `git diff`/`git log` (`:22`).

**Why this matters to plan 3.4:** that row collapses `reviewer.md:40–43`'s four bullets into one
line that is *deliberately not about writes*, on the stated ground that "Read-only is enforced by
`tools:` frontmatter". **That ground is ~90% true, not 100%** — the residual is `Bash`.
Recommendation for `task-002`: accept 3.4's collapse (the risk is small and the description at
`:3` still says "Never writes"), but record the residual explicitly so it is a decision rather
than an oversight. Add `reviewer.md:3`'s "Never writes." to the pattern's site list so the
guarantee has a named survivor.

**Proposed:** `min: 1` (anchored on `reviewer.md:3`'s description), `max: 6` → post-trim
`max: 3`.

---

### D-27 — The reviewer returns a verdict; the parent alone advances the card

**Sites:** `reviewer.md:8`, `:42` · `specmanager-build.md:88`

**Must survive (plan 3.4's chosen replacement line):**
> "You return a verdict; the parent alone advances the card."

**Core enforcement — NO.**

**Multi-site:** survivor = the collapsed `reviewer.md` line **and** `specmanager-build.md:88`
(different actor). Plan 3.11 keeps the build.md bullet ("reviewer read-only").

**Proposed:** `min: 2`, `max: 3`.

---

### D-28 — The reviewer gets an assembled **slice**, never the whole Architecture

**Sites:** `reviewer.md:3`, `:12`, `:18`, `:41`, `:43` · `specmanager-build.md:34`, `:90`

**Must survive:**
> "Treat this slice as the contract. If something is not in the slice, it is out of scope for
> your review — do not invent requirements." — `reviewer.md:18`

> "Don't hand the reviewer the whole Architecture doc — pass only the assembled slice"
> — `specmanager-build.md:90`

**Core enforcement — NO** (the reviewer holds `Read`). **R6 changes the *assembly*, not the
*contract*:** rows 2.1–2.6 replace build.md's seven prose steps with one `get_spec_slice` call,
but `reviewer.md`'s scope contract is untouched by that and must not be trimmed alongside it.

**Why loss matters:** two guarantees at once — the token budget (the whole point of slicing) and
the **false-fail guard**. A reviewer that reads the full Architecture fails phases for
requirements assigned to a *different* phase, which then burns the N=3 budget (D-20).

**Multi-site:** survivor = `reviewer.md:18` (the contract) + `specmanager-build.md:90` (the
obligation). Plan 3.11 does **not** list `:90` among the ≤10 keepers — flagged for `task-002`:
if `:90` goes, `reviewer.md:18` becomes the sole statement and the parent side is unstated.

**Proposed:** `min: 2`, `max: 7`.

---

### D-29 — Spec compliance only; never grade style or taste

**Sites:** `reviewer.md:25`, `:43`

**Must survive:**
> "A clean miss of a spec point is a `fail`; a stylistic preference is not." — `reviewer.md:25`

**Core enforcement — NO.**

**Why loss matters:** a taste-grading reviewer never returns `pass`, so every phase escalates
through the tier ladder to `strong` and then to `blocked`. Silent, expensive, and looks like a
model regression rather than a prompt regression.

**Proposed:** `min: 1`, `max: 2`.

---

## F. Document & persistence contracts

### D-31 — Never approve a document (approval is the user's)

**Sites (11 across 9 files):** `prd-writer.md:47` · `architect.md:87` · `designer.md:106` ·
`planner.md:108` · `builder.md:72` · `walkthrough-writer.md:83` · `reviewer.md` (n/a, no MCP
tools) · `specmanager-build.md:75` · `specmanager-walkthrough.md:32` ·
`specmanager-prd.md:38`, `:39` · `specmanager-interview.md:130`

**Must survive:** "Don't approve the doc — the user owns approval." (`prd-writer.md:47`)

**Core enforcement — split, and the split is invisible in the text.** Per the structural finding:

| File | Has `tools:` allowlist? | `set_status` reachable? | Load-bearing? |
|---|---|---|---|
| `builder.md` | yes (`:5`) | **no** | **restatement — safe to cut** |
| `reviewer.md` | yes (`:5`) | no | n/a |
| `architect`, `designer`, `planner`, `prd-writer`, `walkthrough-writer` | **no** | **yes** | **load-bearing** |
| the 4 command files | n/a — main session | **yes** | **load-bearing** |

`setStatus` (`core/status.ts:10–53`) has no caller check.

**Why loss matters:** an agent-approved doc opens the next gate with no human review — the
approval loop is the product.

**Multi-site:** **survivor per file, and the five toolless agents cannot share one.**
`builder.md:72` is the *only* one of the eleven that is genuinely redundant.

**Proposed:** `min: 8`, `max: 11`. **`min: 1` would be actively wrong here** — a high `min` is the
whole guard.

---

### D-32 — Never omit `dependsOn`/`basedOn`; staleness depends on them

**Sites:** `architect.md:82`, `:77–78` · `planner.md:109`, `:75–76` · `designer.md:105`,
`:94–95` · `walkthrough-writer.md:67–68`

**Must survive:**
> "`dependsOn` + `basedOn` are how SpecManager flags this doc stale if the PRD (or the design
> mockups, when present) is reopened — never omit them." — `architect.md:82`

**Core enforcement — NO, and silently.** `createDocument` defaults both to `[]`/`{}`
(`core/documents.ts:205–206`). A doc with no links is structurally valid and simply never gets
flagged by `propagateStale`'s `dependsOn` walk (`status.ts:66–77`).

**Why loss matters:** staleness is the only signal that an approved downstream doc no longer
matches its upstream. A missing link doesn't error — it just makes the badge never appear.

**Multi-site:** survivor = one per persisting agent (4 agents, 4 different `create_document`
call shapes). `walkthrough-writer.md` has the call block but **no Don't bullet** — an existing
asymmetry worth recording.

**Proposed:** `min: 4`, `max: 7`.

---

### D-33 — Pass `baseVersion` on `write_document`; on conflict re-read, merge, retry

**Site:** `specmanager-interview.md:40–42` (sole statement)

**Must survive:**
> "`write_document({ id: <existing interview id>, body, baseVersion: <version from step 2> })`.
> On `version conflict`, `read_document` again, merge, retry with the fresh version."

**Core enforcement — conditional, which is the trap.** `writeDocument`
(`core/documents.ts:238–245`) throws `version conflict` **only when the caller passes
`baseVersion`**: `typeof input.baseVersion === "number" && input.baseVersion !== current…`.
Omit the field and the optimistic-concurrency guard does not exist for that call.

**Why loss matters:** CLAUDE.md lists optimistic concurrency as a load-bearing invariant
("mismatched versions are rejected so manual edits aren't clobbered"). It holds only because the
one prompt that re-writes an existing doc says to pass the field. A re-interview would silently
overwrite the user's hand-edits.

**Proposed:** `min: 1`, `max: 1`. Single-sited and the guard is opt-in — **highest
consequence-per-word entry in the table.** `specmanager-interview.md` is not in the trim's
listed scope, so risk is **Indirect**; encode it anyway.

---

### D-34 — `create_design_brief` is the designer's only write path

**Sites:** `designer.md:83`, `:107` · `specmanager-design.md:29`

**Must survive:**
> "Never use `Write`/`Edit` to create the file yourself — that bypasses the frontmatter the
> system needs and will make the doc invisible/crash the board." — `designer.md:83`

**Core enforcement — NO.** `designer.md` has no `tools:` allowlist, so it holds `Write`/`Edit`.

**Why loss matters:** the stated failure mode is concrete and bad — a frontmatter-less
`mockups.html` is invisible to `listDocuments` and crashes the board panel.

**Multi-site:** survivor = `designer.md:83` (states the *consequence*, which is the persuasive
part). `:107` and `specmanager-design.md:29` are collapsible; `-design.md:29` also carries the
distinct `---`-escape/5MB rationale (see D-52).

**Proposed:** `min: 1`, `max: 3`.

---

### D-35 — `bootstrap_design_tokens` is the only write path into `docs/DESIGN.md`

**Site:** `designer.md:55` (sole statement)

**Must survive:** "This is the only write path for seeding tokens … Never raw-`Write` to
`docs/DESIGN.md`."

**Core enforcement — NO** for the designer. The marker-anchored merge in `core/design-md.ts`
protects the *managed region* only when the write goes through the tool.

**Why loss matters:** a raw write destroys the `<!-- specmanager:design:start/end -->` markers,
after which every future `sync_design_md` and the `feature.shipped` auto-refresh mis-merge.

**Proposed:** `min: 1`, `max: 1`.

---

### D-36 — Filesystem scope — **note the polarity flip**

Two rules that look identical and are opposites:

| Id | Rule | Sites | Core? |
|---|---|---|---|
| **D-36a** | Drafting agents write **nothing outside** `.claude/specs/` | `prd-writer.md:48`, `architect.md:88` | No — neither has a `tools:` allowlist |
| **D-36b** | The builder writes **nothing inside** `.claude/specs/` — MCP tools only | `builder.md:73` | No — the builder holds `Edit`/`Write` |

> "Don't edit `plan.md`, `tasks.json` directly, or any file under `.claude/specs/` — go through
> MCP tools only." — `builder.md:73`

**Why the flip matters to the trim:** a de-dup pass that keys on the literal `.claude/specs/`
will see three bullets and keep one — collapsing a *prohibition on writing into* the spec tree
with a *prohibition on writing outside* it. Either survivor leaves the other rule inverted.
**These must be two separate `selftest-prompts` entries**, not one with `min: 1`.

**Why D-36b's loss matters specifically:** a builder editing `tasks.json` by hand bypasses
`assertSplittable` and `MissingArtifactError` entirely — the two loud guards in `core/tasks.ts`
become unreachable.

**Proposed:** D-36a `min: 2`, `max: 2`; D-36b `min: 1`, `max: 1`.

---

### D-43 / D-44 — Walkthrough filename derivation

| Id | Rule | Site | Core? | Why loss matters |
|---|---|---|---|---|
| **D-43** | Never pass `filename` — the doc layer derives it from `phase` | `walkthrough-writer.md:75` (+ the call block at `:66`) | **No** — `createDocument:186` honours an explicit `input.filename`, overriding `defaultFilename` | The walkthrough lands off-convention; `list_documents` still finds it but every `walkthroughs/<slug>/phase-<name>.md` reference in reports and prior walkthroughs breaks |
| **D-44** | `phase` is **REQUIRED** on a walkthrough `create_document` | `walkthrough-writer.md:66` | **Partial, silently** — `createDocument:184` defaults a missing `phase` to `DEFAULT_PHASE` | Omitting it files the doc under `default` with **no error**, so `getPhaseCompletion`'s `hasWalkthrough` (`phase-completion.ts:32–34`) stays `false` and the build command re-fires the walkthrough forever |

**Proposed:** each `min: 1`, `max: 1`. Both single-sited; risk **None** (outside the trim
surface) — encode as cheap insurance.

---

## G. Parsed-artifact shapes (machine contracts the planner must emit)

These are the entries where a prompt is the *producer* for a `core/` *consumer*. `core/` can
only fail to parse; it can never make the planner emit the shape.

### D-37 — `## Phase <name> — <theme>` heading shape

**Sites:** `planner.md:45`, `:63`, `:84`, `:94` · `specmanager-plan.md:21` ·
`specmanager-build.md:10`, `:19`, `:35` · `specmanager-walkthrough.md:9`

**Must survive:**
> "`## Phase <name> — <theme>` heading (exactly this shape — downstream tools parse it)."
> — `planner.md:45`

**Consumed by:** `exitTestForPhase`'s `/^##\s+Phase\s+([^\s—-]+)/i`
(`core/active-card.ts:31–46`, regex at `:33`) — **and this regex is moved to
`core/spec-slice.ts` by row 2.1**, then re-imported. Also `getSpecSlice`'s `planSection` slicing
(row 2.3) and build.md's step 7b slice assembly (`:35`).

**Why loss matters:** the Stop-gate's rung-2 exit-test fallback (`stop-gate.sh:100–102`) reads
the `**Exit test:**` line by first locating this heading. A malformed heading ⇒ `exitTest: null`
⇒ with rung 3 deleted by row 2.8, **no command runs at all** and the gate degrades to a
tasks-done check only.

**Multi-site:** survivor = `planner.md:45` (the emitter — the only site that *causes* the shape).
The rest are consumers describing it.

**Proposed:** `min: 1` (emitter) `max: 9`. Encode with a note that the pattern must survive row
2.1's regex move.

---

### D-38 — `**Exit test:**` line per phase

**Sites:** `planner.md:46`, `:63` · `specmanager-build.md:26` ·
`walkthrough-writer.md:18`, `:26` · `specmanager-walkthrough.md:25`

**Must survive:**
> "`**Exit test:** …` — a concrete, user-runnable verification" — `planner.md:46`

**Consumed by:** `active-card.ts:41` (`/\*\*Exit test:\*\*\s*(.+)/i`) and `stop-gate.sh:100`.
Also quoted verbatim as a blockquote by every per-phase walkthrough
(`walkthrough-writer.md:26`).

**Escalating risk:** row 2.8 deletes rung 3 (`probe_test_command`), making rung 2 — this line —
the **last** fallback when `meta.testCommand` is absent. The plan notes 12 of 16 existing plans
have no `meta.phases`, so this line is load-bearing *today* for most features.

**Proposed:** `min: 1` (emitter), `max: 6`.

---

### D-39 — `set_phase_meta` for **every** phase, `testCommand` never absent

**Sites:** `planner.md:64`, `:90–100`

**Must survive:**
> "emit for EVERY phase, never omit … When a phase has no automated test by design … emit the
> literal string `"none"` — never leave the field absent. … an absent field forces a brittle
> convention probe, so always declare it." — `planner.md:95`, `:99`

**Core enforcement — NO.** `setPhaseMeta` (`core/tasks.ts:94–107`) writes whatever it is given;
nothing requires it be called. `resolveActiveCard` degrades to `testCommand: null`
(`active-card.ts:80`).

**⚠️ Row 2.8 raises this rule's stakes and its wording goes stale.** The quoted justification —
"an absent field forces a brittle convention probe" — describes rung 3, which row 2.8 **deletes**.
After 2.8 the true consequence is worse: absent `testCommand` + a prose-only `**Exit test:**` ⇒
**no command runs at all**. Recommend `task-002` flag `planner.md:99`'s justification clause for
a factual update in the `trim` phase, *not* a deletion. It is the only prompt sentence this
feature makes false.

**Proposed:** `min: 1`, `max: 2`.

---

### D-40 — The **Total** row lives only in the phase-summary table

**Site:** `planner.md:43` (sole statement)

**Must survive:** "The **Total** row lives *only* here — never in a per-phase task table, or a
parser will misread it as a task."

**Core enforcement — NO.** No parser reads plan tables into tasks today (tasks come from
`create_task`), so the stated failure is *latent* rather than live.

**Proposed:** `min: 1`, `max: 1`. Risk **Direct** — `planner.md`'s "What a good Plan doc
contains" is dense prose of exactly the kind a compression pass eats.

---

### D-41 — Phase names are real theme names; never `default`

**Sites:** `planner.md:45` · `specmanager-walkthrough.md:9` · `walkthrough-writer.md:11`

**Must survive:** "Use a real name from the theme (`core`, `api`, `ui`…) — never `default`
(reserved for legacy pre-phase features)." — `planner.md:45`

**Core enforcement — NO, and `default` is load-bearing elsewhere.** `DEFAULT_PHASE = "default"`
(`core/types.ts:28`) is the fallback for untagged tasks at `tasks.ts:166`, `phases.ts:34`,
`phase-completion.ts:33`, `documents.ts:184`, `dependencies.ts:65`/`:81`/`:98`,
`shipped.ts:23`. A deliberately-named `default` phase is indistinguishable from a legacy
untagged one.

**Proposed:** `min: 1`, `max: 3`.

---

### D-42 — Dotted `<phase>.<index>` row numbering *(weak — flagged)*

**Site:** `planner.md:47`

**Core enforcement — none, and no consumer.** Nothing parses the `#` column.

**Honest assessment:** this is the one candidate in the inventory whose removal changes **no**
machine behaviour. Its value is human citation — this plan's own rows are cited as `1.1`, `3.9`,
`2.8` throughout, and this very document does the same. Recommend keeping it but classifying it
as **convention, not invariant**, and *not* encoding it in `selftest-prompts`. Recorded here so
`task-002` can adjudicate rather than rediscover.

---

### D-53 — Section-anchor convention (the upstream half of `architectureRefs`)

**Site:** `architect.md:56–63`

**Must survive:**
> "**Requirement sections:** the anchor is the **requirement id** — `## R1 — …` … **Component
> sections:** the anchor is the **kebab-slug of the heading** … Keep one anchor per section,
> stable across edits; do not reuse an anchor for two sections."

**Core enforcement — NO on emission.** The *consumer* is being built right now:
`getSpecSlice`'s id-token / kebab-slug resolution (rows 2.2, 2.4). Today the consumer is prose
at `specmanager-build.md:37`.

**Why loss matters:** `architectureRefs` resolution has an emitter (architect), a recorder
(planner's `set_phase_meta`), and a resolver (`getSpecSlice`). D-53 is the **only** statement of
the emitter's contract. Without it, refs silently miss and `getSpecSlice` falls back to
name-matching (row 2.4) — degrading to `architecture: []`, a reviewer with a thinner slice, and
no error anywhere.

**Proposed:** `min: 1`, `max: 1`. Risk **Direct** — `architect.md` is trimmed by rows 1.5, 3.3,
3.7 and this section sits between two of them (`:41` Context7, `:65` density).

---

## H. Skill leverage (Superpowers / frontend-design)

### D-45 — Superpowers' two-stage review ≠ the R3 reviewer *(the de-dup boundary)*

**Site:** `builder.md:50` (with the shared de-dup line at `:38`, restated `:58`)

**Must survive:**
> "Superpowers' two-stage review is discipline *inside* your build of a task; the parent's R3
> reviewer is a separate pre-advance gate after the phase's Stop-hook passes."

**Core enforcement — NO.**

**Why loss matters:** without the boundary the builder reads two "review before advancing"
instructions and rationally concludes one satisfies the other — either skipping its own
pre-commit discipline or attempting to self-review as the phase gate. Plan 3.5 states the
requirement precisely: **"INV-3 must survive as one sentence, not zero."**

**Proposed:** `min: 1`, `max: 1`. Risk **Direct** (row 3.5 compresses `builder.md:34–52` to two
lines). **Highest-risk compression in the trim** — 19 lines → 2 with a named survivor inside.

---

### D-46 — Superpowers is execution-discipline only; SpecManager owns the *what*

**Site:** `builder.md:48`

**Must survive:**
> "These are **execution-discipline skills only** — never Superpowers' brainstorming/planning
> skills. SpecManager owns the *what* (the PRD/Architecture/Plan/tasks); Superpowers only
> sharpens the *how*."

**Core enforcement — NO.**

**Why loss matters:** a builder that reaches for a brainstorming skill re-plans the feature
mid-task — the exact authority collision the whole lifecycle exists to prevent.

**Proposed:** `min: 1`, `max: 1`. Risk **Direct** (row 3.5).

---

### D-47 — Detect-then-defer with graceful degradation; a missing skill is never an error

**Sites:** `builder.md:36`, `:52`, `:58` · `designer.md:28`, `:39`

**Must survive:**
> "if Superpowers is **not** installed, run the plain execution loop above unchanged … No error,
> no install-blocking." — `builder.md:52`

**Core enforcement — NO.**

**Why loss matters:** the plugin must run for users who have neither skill. Losing the fallback
turns an optional enhancement into a hard dependency.

**Multi-site:** survivor = one per agent (`builder.md`, `designer.md` — different skills,
different fallbacks). **Proposed:** `min: 2`, `max: 5`.

---

### D-48 — No vendoring: invoke the installed skill, never copy its text into this repo

**Sites:** `builder.md:48` · `designer.md:41`

**Must survive:** "**No vendoring** — invoke the installed skill; do not copy its content into
this repo." — `builder.md:48`

**Core enforcement — NO.** **Proposed:** `min: 2`, `max: 2` (one per agent; `min == max`).

---

### D-49 — The designer's distilled built-in fallback method

**Site:** `designer.md:33–38` (5 bullets)

**Must survive — the five named elements:**
> "Pin a **token system of 4–6 named colors** … traced to DESIGN.md" · "Define **2+ type
> roles**" · "Commit to a **layout concept**" · "Add **one signature element**" ·
> "**Critique for genericness** before building"

**Core enforcement — NO.**

**Why loss matters:** this is the designer's **only** design method when `frontend-design` is
absent. Deleting it is a capability regression, not a trim — plan 3.6 says exactly this and
keeps the bullets in compact form.

**Proposed:** `min: 5` (one per named element), `max: 5`. **`min: 1` would pass with four of the
five deleted** — this entry needs per-element patterns or a 5-count.

---

### D-50 — DESIGN.md tokens are the source of truth; the skill never overrides them

**Sites:** `designer.md:28`, `:47`, `:82` · `builder.md:23`, `:56`

**Must survive:**
> "every color and type choice still traces to `docs/DESIGN.md` — the skill informs composition,
> the tokens remain the source of truth" — `builder.md:56`

> "Grounded: every color/size should trace to a DESIGN.md token." — `designer.md:82`

**Core enforcement — NO.**

**Multi-site:** survivor = `designer.md:82` (the hard-constraint list, the enforcement point at
authoring time) + `builder.md:56` (the build-time half). Two actors.

**Proposed:** `min: 2`, `max: 5`.

---

### D-51 — The mockups file is self-contained; no external assets, no JS

**Sites:** `designer.md:79`, `:80`, `:103`

**Must survive:**
> "a single `<!doctype html>` document with all CSS in one inline `<style>` block. No external
> stylesheets, fonts, scripts, or image URLs — the preview renders in a sandboxed `<iframe>`
> (`sandbox="allow-same-origin"`, **scripts disabled**)" — `designer.md:79`

**Core enforcement — NO.** `create_design_brief` only defangs a leading `---` and caps at 5MB
(`mcp.ts:178`); it does not inspect the HTML.

**Why loss matters:** the board silently renders a broken screen — no error, and the designer
has no feedback loop to notice.

**Proposed:** `min: 1`, `max: 3`.

---

### D-52 — `create_design_brief` defangs `---` and rejects >5MB *(restatement)*

**Sites:** `designer.md:99` · `specmanager-design.md:29`

**Core enforcement — YES**, `mcp.ts:178`. **Safe to trim.** Recorded so `task-002` doesn't
mistake it for D-34/D-51.

---

## I. Architect-specific

| Id | Rule | Site | Core? | Why loss matters | Proposed |
|---|---|---|---|---|---|
| **D-54** | Context7 lookup is **architect-only, on-demand** — "never in PRD/design/plan/build" | `architect.md:27` | No | Scope creep puts a network round-trip in every stage | `min: 1`, `max: 1` |
| **D-55** | **Do not** add Context7 to `.mcp.json` — no bundled server, no forced API-key step | `architect.md:39` | No | Repo policy. Plan 3.7 keeps it explicitly while deleting the lookup mechanics around it — the survivor is *inside* a deleted block | `min: 1`, `max: 1` ⚠️ **Direct risk** |
| **D-56** | A failed/empty/`429`/unconfigured lookup is **never** a blocker — proceed from training knowledge | `architect.md:37` | No | Without it a rate-limited anonymous pool stalls the draft | `min: 1`, `max: 1` |
| **D-57** | When fetched docs inform a decision, **note the library + version** consulted | `architect.md:41` | No | Traceability for the repo's "latest APIs" value; the only audit trail for a version choice | `min: 1`, `max: 1` |
| **D-58** | Repo-grounded: every "we will add X" references a real path; don't invent files | `architect.md:54`, `:85` · `-architecture.md:24` | No | Hallucinated paths propagate into the Plan's task rows and are only caught at build | `min: 2`, `max: 3` |

**D-55 is the sharp one.** Plan 3.7 compresses `architect.md:25–41` (17 lines) to one sentence
and names `:39` as a keeper. Three of the five rules above (**D-55, D-56, D-57**) live inside
that deleted range; 3.7's one-sentence replacement covers D-56 and D-55 but **not D-57**
(note the library + version). Flagged for `task-002`: either extend 3.7's survivor sentence or
accept the loss deliberately.

---

## J. Density contract

### D-59 — Lossless carry-over

**Sites (exactly 4, byte-identical):** `architect.md:65` · `planner.md:56` ·
`prd-writer.md:24` · `walkthrough-writer.md:77`

**Must survive — verbatim:**
> "Every fact, number, constraint, decision, and open question from your inputs must survive into
> your output — merging duplicates is condensing; dropping information is a defect."

**Core enforcement — NO.**

**Why loss matters:** this is the rule that stops each stage from quietly shedding the previous
stage's open questions. Its absence is undetectable by any test.

**Multi-site:** **all four survive** — four different agents, four different outputs. Row 3.3
keeps exactly this sentence at all four sites. **Proposed: `min: 4`, `max: 4`** (`min == max`).
Row 1.6 gives it a canonical `docs/agent-snippets/` home, so INV-15-style parity applies here
too.

### D-59b — "Reference upstream docs by id — never restate their content" ⚠️

**Same four sites** (the density block's first sentence).

**Core enforcement — NO.**

**⚠️ Flagged as a probable over-cut in row 3.3.** That row reduces ~90 w to ~25 w, keeping only
the lossless clause and discarding the rest as "default Opus 5 behaviour". "No throat-clearing /
no transitions / prefer tables" is a fair call — those *are* default behaviour. **"Reference by
id, never restate" is not a style rule, it is the token-budget rule**, and it has **no other
statement site** in any of the four agents (verified: `planner.md` says "phases and tasks ladder
up to PRD goals" at `:28`, which is not the same instruction). Dropping it invites a Plan that
inlines the Architecture — which would then *also* satisfy D-59, since nothing was lost.

Recommendation for `task-002`: extend 3.3's survivor to two sentences. Recorded as a distinct id
so the decision is explicit.

**Proposed (if kept):** `min: 4`, `max: 4`.

---

## K. Walkthrough scope & shape

| Id | Rule | Sites | Core? | Why loss matters | Proposed |
|---|---|---|---|---|---|
| **D-60** | Per-phase mode documents **only this phase's** artifacts; empty artifacts ⇒ refuse | `walkthrough-writer.md:20`, `:84` | No | The per-phase walkthrough becomes a whole-feature tour; each phase's doc re-explains the last | `min: 1`, `max: 2` |
| **D-61** | Final mode **links, doesn't re-explain**; no new code tour; reads walkthroughs, not code | `walkthrough-writer.md:46`, `:48`, `:82` | No | Doubles the roll-up's token cost and creates a second, drifting description of the same code | `min: 1`, `max: 3` |
| **D-62** | A per-phase walkthrough is a **runnable test script**, not prose — every check carries a command **and its expected output**; never "verify it works" | `walkthrough-writer.md:24` | No | This *is* the artifact's value. Prose walkthroughs are unverifiable and the whole gate becomes ceremonial | `min: 1`, `max: 1` |
| **D-63** | **Adapt to the project** — detect real commands; never hard-code SpecManager's `npm run …` set; include the plugin reinstall dance only for a plugin | `walkthrough-writer.md:36–38` | No | The single most likely failure when dogfooding: SpecManager's own commands leak into another project's walkthrough | `min: 1`, `max: 1` |

---

## L. PRD & interview

| Id | Rule | Sites | Core? | Why loss matters | Proposed |
|---|---|---|---|---|---|
| **D-64** | No top-level `# title` line in the PRD body — the frontmatter carries it | `prd-writer.md:31` | No — `writeDoc` writes the body verbatim | A duplicated H1 on every board card and in every rendered doc | `min: 1`, `max: 1` |
| **D-65** | Ground the PRD in an existing `kind: "interview"` doc — **required** input when present; contradict only with stated reasons | `prd-writer.md:29` | No | The interview's whole purpose. A PRD that ignores it discards the extracted wedge and critiques | `min: 1`, `max: 1` |
| **D-66** | `/specmanager-prd` **ignores** `kind: "interview"` in the "does a PRD exist?" check | `-prd.md:22` | **No** — `listDocuments({stage:"prd"})` returns interviews; `checkGate`'s filter (`dependencies.ts:121`) and `claude-md.ts:62`'s filter don't apply here | An interview-first flow is reported as "a PRD already exists" and the PRD is never drafted | `min: 1`, `max: 1` — plan 3.8 pins step 2 verbatim |
| **D-67** | Ask **at most one** clarifying question, only if a critical input is missing | `prd-writer.md:30` | No | Turns a single-shot drafting agent into an interrogation | `min: 1`, `max: 1` |
| **D-73** | The interview runs **in the main session** — never a subagent (single-shot, cannot hold a conversation) | `-interview.md:8–10`, `:132` | No | The documented exception to the delegation pattern. Delegating produces a one-turn "interview" | `min: 1`, `max: 2` |
| **D-74** | Write **nothing** before the user says yes at the storage prompt; persist only via `create_document`/`write_document` | `-interview.md:127–129` | No | An unconsented file, and a direct write bypasses frontmatter (cf. D-34) | `min: 1`, `max: 1` |
| **D-75** | Exit is **instant and unconditional** — no "are you sure?", no "one more question" | `-interview.md:75–79`, `:135` | No | A user-facing promise; violating it is the most annoying possible regression | `min: 1`, `max: 2` |
| **D-76** | Plan revisions print as **diffs**, never a full re-dump | `-interview.md:65–73`, `:134` | No | Re-dumping an 8-item plan every turn floods the conversation | `min: 1`, `max: 2` |
| **D-77** | Chat synthesis and stored artifact are **identical** (four sections, same order) | `-interview.md:31`, `:82–83` | No | The user approves what they read in chat; a divergent artifact is unreviewed content | `min: 1`, `max: 2` |
| **D-78** | The office-hours forcing-question method is **credited** to gstack, embedded, no skill install | `-interview.md:94–99` | No | Attribution | `min: 1`, `max: 1` |

---

## M. Orchestration-command delegation

| Id | Rule | Sites | Core? | Why loss matters | Proposed |
|---|---|---|---|---|---|
| **D-79** | Drafting commands **never draft inline** — always via the subagent, "so the system prompt + tool boundaries apply" | `-prd.md:40–41` · `-architecture.md:24` · `-design.md:28` · `-plan.md:26` | No | The stated reason is the load-bearing part: inline drafting loses the agent's system prompt *and* its `tools:` allowlist — which is how D-31 is enforced for the builder | `min: 4`, `max: 4` (one per command) |
| **D-80** | `/specmanager-plan` never calls `create_task` itself — the subagent does, so plan body + tasks stay consistent | `-plan.md:27` | No | Split authorship drifts `plan.md`'s rows from `tasks.json` — the exact coupling the one-step Plan stage exists to guarantee | `min: 1`, `max: 1` |
| **D-81** | Never accept a flat plan with no `## Phase` heading; **a single named phase is correct** — don't push for more | `-plan.md:28` · `planner.md:16`, `:104` | No | Both halves matter: no-heading breaks D-37's parsers; "don't manufacture phases" prevents ceremony splits that each demand a review stop | `min: 2`, `max: 3` |
| **D-82** | Confirm a multi-phase split via `AskUserQuestion` **before persisting any task**; never ask for a single-phase plan | `planner.md:18`, `:62` | No | Ordering is the rule — tasks persisted first make the question rhetorical | `min: 1`, `max: 2` |
| **D-83** | `/specmanager-board`: never start a process or use `Bash` to open a browser — `open_board` handles the platform | `-board.md:12–14` | No | Cross-platform breakage | `min: 1`, `max: 1` |

**Note on `specmanager-board.md`:** it is the only command file with no rule the trim touches.
Useful as a **control** — if a `selftest-prompts` refactor ever makes its counts move, the
harness is broken, not the prompts.

---

## N. Init & managed blocks

| Id | Rule | Sites | Core? | Notes |
|---|---|---|---|---|
| **D-68** | Managed CLAUDE.md region is strictly between the markers; `/init` writes only outside; the merge is line-anchored so regions are disjoint | `-init.md:11–14`, `:69–75`, `:100–105` | **Yes** — line-anchored merge in `core/claude-md.ts` | Restatement **except** the *ordering* obligation at `:74` ("Running `specmanager_init` first means the markers already exist when `/init` fills the surrounding codebase docs") — that is prompt-only. Survivor = `:74`. `min: 1`, `max: 3` |
| **D-69** | Don't hand-edit between the markers (CLAUDE.md **or** DESIGN.md) | `-init.md:100`, `:106` | No — a hand edit is silently clobbered on next sync | Two markers, two rules; keep both. `min: 2`, `max: 2` |
| **D-70** | Declared sibling repos: **the paths ARE the read grant**; reads are read-only, every write stays inside the meta root | `-init.md:38–40`, `:109–112` | **Yes** — `assertInsideRoot` in `core/repos.ts` | Restatement of a structural guarantee. Safe. `min: 1`, `max: 2` |
| **D-71** | Re-run reconciles: existing mirrors kept **byte-for-byte** (write-if-absent); a name collision from a different source is reported and skipped | `-init.md:53–58`, `:110–112` | **Yes** — `repos.ts`; covered by `selftest-repos` | Restatement. Safe. `min: 1`, `max: 2` |
| **D-72** | Don't create features from `/specmanager-init` — point at `/specmanager-prd` | `-init.md:113` | No | Weak. `min: 1`, `max: 1` |

`specmanager-init.md` is **not** in the trim's file list (rows 3.1–3.11 name six drafting
commands + build.md), and row 3.1 explicitly says "**Do not touch** … `-init.md:102`". Risk
**None** for this whole section.

---

## O. Design-command specifics

| Id | Rule | Sites | Core? | Proposed |
|---|---|---|---|---|
| **D-87** | The design gate opens on an **approved PRD**; Architecture is **not** required — design runs in parallel | `-design.md:11`, `:13` | **Yes** — `PRIOR_STAGE.design = "prd"` (`dependencies.ts:36–40`) | Restatement. `min: 1`, `max: 2` |
| **D-88** | Attachment-path harvesting; when DESIGN.md is thin the designer may **invite** an optional reference — always optional, never required | `-design.md:14` · `designer.md:51` | No | `min: 2`, `max: 2`. Plan 3.8 pins `-design.md` step 5 verbatim |

---

## P. Summary — what `selftest-prompts` should encode

**88 candidate rules enumerated. Not all need a guard.** Encoding all 88 makes the harness a
second copy of the prompts and guarantees false failures. The filter is **trim risk × core
enforcement**:

| Bucket | Count | Encode? |
|---|---|---|
| Load-bearing **and** in the trim's direct edit path | **~24** | **Yes — mandatory** |
| Load-bearing, single-sited, cheap to guard, indirect risk | ~14 | Yes — cheap insurance |
| Load-bearing but outside the trim surface (`-init.md`, `-board.md`, most of `-interview.md`) | ~22 | Optional; recommend no |
| Genuine restatements of a **loud** `core/` guard (D-06 partial, D-07 partial, D-52, D-70, D-71, D-87) | ~9 | No — these are what the trim is *for* |
| Convention, no consumer (D-42) | 1 | No — record only |
| Duplicated across files but **one survivor suffices** | — | Encode the survivor's site, `max` = today's count |

### The ~24 mandatory entries (trim-risk **Direct**)

`D-01` · `D-04` · `D-07` · `D-08` · `D-09` · `D-09b` · `D-12` · `D-13` · `D-14` · `D-16` ·
`D-17` · `D-21` · `D-22` · `D-23` · **`D-24`** · `D-26` · `D-27` · `D-28` · `D-29` · `D-31` ·
`D-45` · `D-46` · `D-49` · `D-55` · `D-59`

### Entries where `min: 1` would be **wrong**

Row 1.8 proposes `min: 1` throughout. For these, a `min` of 1 passes while the rule is lost from
every actor that matters:

| Id | Required `min` | Because |
|---|---|---|
| **D-31** | **8** | Five toolless agents + four command files each need their own; only `builder.md:72` is redundant |
| **D-49** | **5** | One per named method element — four could be deleted and the fifth would satisfy `min: 1` |
| **D-59** | **4** | Four agents, four outputs; row 3.3 keeps all four (`min == max`) |
| **D-01** | **4** | Four independent actors reach the rule alone |
| **D-04** | **4** | Four gated commands |
| **D-32** | **4** | Four persisting agents |
| **D-14** | **3** | Three sites must agree with `core/tiers.ts` |
| **D-79** | **4** | One per drafting command |

### Six things `task-002` must adjudicate

1. **D-14's value hazard.** A pattern pinning the literal `haiku` goes red at `task-007`
   (`core` phase), before any trimming, and will look like an over-trim. Patterns must be
   value-agnostic. Consider a new invariant: *the prompts' stated tier defaults must match
   `core/tiers.ts`*.
2. **D-59b** — "reference upstream docs by id, never restate" has no other statement site and
   row 3.3 currently drops it. Recommend extending the survivor to two sentences.
3. **D-57** — "note the library + version consulted" sits inside the block row 3.7 deletes, and
   3.7's one-sentence survivor does not carry it.
4. **D-36a vs D-36b** — the `.claude/specs/` polarity flip. Two entries, never one.
5. **D-26** — plan 3.4's premise that `tools:` fully enforces reviewer read-only is ~90% true;
   `Bash` is the residual. Accept deliberately or keep a write clause.
6. **D-39** — row 2.8's rung-3 deletion makes `planner.md:99`'s "brittle convention probe"
   justification factually wrong. Needs a **factual update**, not a deletion. This is the only
   prompt sentence this feature makes false, and the one place `selftest-prompts` could enforce
   stale text.

### Scope limit, stated plainly

`selftest-prompts` is a **regression gate on this list**, not a proof of semantic equivalence.
It cannot catch an invariant this derivation missed. The four **silent-wrong** cases
(`checkGate` never called on a write path; conditional `baseVersion`; defaulted walkthrough
`phase`; defaulted `dependsOn`/`basedOn`) are the pattern most likely to hide another one:
a `core/` API that *looks* like it enforces a rule while the enforcement is opt-in at the call
site. Any future addition to this table should be checked against that shape first.
