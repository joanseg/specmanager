# Invariant inventory — reconciled

**Feature:** `feat-opus-5-readiness` · **Task:** `task-002` (plan row 1.2) · **Date:** 2026-08-12

**Path choice.** Tracked path, same rationale as `task-001`'s output: this file feeds `task-011`
(1.8, encodes `selftest-prompts.ts`), `task-013` (1.9), and `task-035` (1.11), and must survive
a `git bisect` over `trim`. `docs/temp/` is gitignored, so it lives at
`docs/prompt-invariants-reconciled.md`.

**Inputs reconciled:** `docs/prompt-invariants-derived.md` (`D-01`…`D-88`, `task-001`) against
`arch-opus-5-readiness-023`'s `## invariant-inventory` section (`INV-1`…`INV-15`). Independently
re-verified before accepting any of `task-001`'s reclassifications — see **Verification** below.

---

## Verification (spot-checked myself, not taken on trust)

| Claim | Command | Result |
|---|---|---|
| `checkGate` has exactly one call site | `grep -rn "checkGate" core/*.ts mcp.ts` | Confirmed: `dependencies.ts:32` (comment), `:46` (definition), `mcp.ts:272` (the one call, inside the `check_gate` handler). `createDocument`/`createTask` never call it. |
| `writeDocument`'s version check is conditional on `baseVersion` being passed | `grep -n baseVersion core/documents.ts` | Confirmed: `typeof input.baseVersion === "number" && input.baseVersion !== current.frontmatter.version` — omit the field, no check runs. |
| Only `builder.md` and `reviewer.md` declare `tools:` | `grep -n "^tools:" agents/*.md` | Confirmed: exactly 2 of 7 files. `reviewer.md:5` = `Read, Glob, Grep, Bash` — `Bash` is a residual write path. |
| `createDocument` defaults `phase`/`dependsOn`/`basedOn` silently | Read `core/documents.ts:160–225` | Confirmed: `input.phase ?? DEFAULT_PHASE` (walkthrough stage only), `input.dependsOn ?? []`, `input.basedOn ?? {}`. No error path. |
| `D-31`'s 11-site / 9-file count for "Don't approve" | `grep -rn approve agents/*.md commands/*.md` | Confirmed: 11 sites across 9 files (`architect.md:87`, `builder.md:72`, `planner.md:108`, `designer.md:106`, `prd-writer.md:47`, `walkthrough-writer.md:83`, `specmanager-build.md:75`, `specmanager-walkthrough.md:32`, `specmanager-prd.md:38`+`:39`, `specmanager-interview.md:130`). |
| `D-16`'s 9-site count for `clear_active_build` in `specmanager-build.md` | `grep -n clear_active_build commands/specmanager-build.md` | Confirmed: 9 sites (`:20,:30,:41,:44,:47,:48,:67,:80,:91`), not the Architecture's 6. |
| `D-49`'s 5-bullet designer fallback | Read `designer.md:25–42` | Confirmed: exactly 5 named elements at `:33–:38` (colors, type roles, layout concept, signature element, genericness critique). |

`task-001`'s enforcement findings hold. Its reclassifications (`D-04`, `D-86`, half of `D-02` →
must-survive; the three silent-wrong siblings; the `tools:` asymmetry) are accepted as fact, not
opinion.

---

## Part A — `INV-1`…`INV-15` reconciled against `D-nn`

Verdict legend: **keep** = matches, no change · **keep, corrected** = same rule, wrong count/shape
in the Architecture · **split** = one Architecture entry conflated two rules.

| INV | Maps to | Verdict | Correction |
|---|---|---|---|
| INV-1 | D-01 | keep, corrected | Sites: **10** across 5 files (Architecture said 9/4 — missed `specmanager-walkthrough.md:19`, a pointer counted separately from the 4 survivor sites). `min` must be **4**, not 1 — a `min:1` pattern stays green if 3 of 4 independent actors lose the rule. |
| INV-2 | D-16 | keep, corrected | Sites: **9** in `specmanager-build.md` (verified above), not 6. Survivor is **3 lines, not 1**: `:20` (pairing obligation, 4c), `:44` (the mid-phase exception — a *different* statement from the pairing), `:80` (the Don't). Architecture's `max: 2` conflates two of these into one. `min:2, max:9 → post-trim max:3`. |
| INV-3 | D-45 | keep, corrected | Sites: **3** (`builder.md:38,:50,:58`), not 2 — Architecture missed the restatement at `:58`. `min:1, max:1` unaffected (single canonical survivor either way). |
| INV-4 | D-21 | keep, corrected | Sites: **7** (`:3,:8,:12,:16,:24,:28,:83`), not 5. `:3` is the `argument-hint` — **machine-surfaced in the slash menu, not prose**; do not count it as a duplicate to de-dup away. `min:2, max:7 → post-trim max:2`. |
| INV-5 | D-17 | keep | Matches exactly: 2 sites, `min:1, max:2`. |
| INV-6 | D-12 | keep, corrected | `min:2, max:4` (Architecture said `max:3`). Pattern must anchor on the **structure** ("route on aliases, never dated ids"), never on a literal alias string — see `INV-21` below for why. |
| INV-7 | D-13 | keep, corrected | `min:2, max:3` (Architecture said `max:2`) — 3 sites verified (`:26,:87`, `builder.md:15`). |
| INV-8 | D-27 | **split** | This is **not** one rule — it's two, and Architecture's "5 sites" count is `D-26`'s and `D-27`'s sites summed. `D-27` ("returns a verdict; parent alone advances") is **3** sites (`reviewer.md:8,:42`, `specmanager-build.md:88`), `min:2, max:3`. `D-26` ("read-only") is split out as its own entry — see `INV-22`. |
| INV-9 | D-19 | keep | Matches: `min:1, max:2`. Pattern must tolerate the paragraph→parenthetical rewrite (anchor on "do not nest", not the paragraph heading). |
| INV-10 | D-39 | keep, flagged | `min:1, max:2` unchanged. **Textual defect, not a count defect:** `planner.md:99`'s justification ("an absent field forces a brittle convention probe") describes rung 3, which `task-008`/row 2.8 deletes. After that row lands the sentence is **false** — this is the one prompt sentence this feature makes incorrect. Recorded as a **finding for the `trim` phase** (row 3.13's neighbourhood, or a new row): update the wording, don't delete the rule. Not a `selftest-prompts` change. |
| INV-11 | D-32 | keep, corrected | **Architecture's `min == max == 4` premise is wrong.** These are not single-sited: each of the 4 persisting agents carries both the mechanism call *and* a separate Don't bullet (`architect.md:77–78`+`:82`, `planner.md:75–76`+`:109`, `designer.md:94–95`+`:105`; `walkthrough-writer.md:67–68` has no Don't, an existing asymmetry). Current count ≈ **7**, not 4. `min:4` (structural floor, one per agent) `max:7 → post-trim max:4`. |
| INV-12 | D-24 | keep, corrected | **1 site** (`specmanager-build.md:59–64`), not 2. `min:1, max:1`, and — the one place byte equality is correct — the pattern must match the **fenced two-line block verbatim**, not the surrounding instruction prose. Highest single-item risk in the trim: it's the only literal output string in the whole prompt surface. |
| INV-13 | D-59 | keep | Confirmed exact: 4 byte-identical sites, `min:4, max:4`. |
| INV-14 | D-49 | **keep, major correction** | Architecture frames this as "1 block, `max:1`" (byte-block match). That is wrong in a way that matters: it's **5 independently-deletable named elements**, and a `min:1`/whole-block pattern stays green if 4 of 5 are cut. Re-encode as **`min:5, max:5`**, one pattern per named element (colors / type roles / layout concept / signature element / genericness critique), not one pattern for the paragraph. |
| INV-15 | — (R8 correction, no `D-nn`) | keep | Ratified as specified: `min:3` on the `Read`-on-`filePath` pattern, `max:0` on `read_document` inside the design-grounding paragraph. Not derived from `task-001`'s forward re-derivation since it describes a *post-correction* target state (rows 1.4/1.5 fix it); the parity mechanism is sound. |

---

## Part B — `D-nn` must-survive entries with no `INV` coverage

`task-001`'s own filter (`Load-bearing AND in the trim's direct edit path` → mandatory) named 25
ids (24 distinct + the `D-09`/`D-09b` pair). Of those, 12 already map to `INV-1`…`INV-15` above
(`D-01,12,13,16,17,21,24,27,45,49,59`, plus `D-14`'s *value* half informs `INV-6`'s note). The
rest have **no** entry in the Architecture's 15-row table and are added here, continuing the id
sequence. Each verdict is **add**, with the one-line reason task-001's own analysis already
supplies (verified, not re-derived from scratch).

| New id | Source | Verdict | `min`/`max` | Reason |
|---|---|---|---|---|
| INV-16 | D-04 | **add** | `min:4, max:8` | `checkGate` has exactly one call site (verified above) — every "don't bypass the gate" line *is* the entire write-path enforcement. Anchor on the `check_gate(` call, not the Don't bullet — the call is the behaviour. One survivor per gated command (`-architecture`, `-design`, `-plan`, `-build`). |
| INV-17 | D-07 | **add** | `min:1, max:1` (today 4) | Core-enforced loud (`MissingArtifactError`), so this is cheap insurance, not a missing guarantee — but row 3.4 directly edits this exact region (`builder.md:65–71`) and could delete the one actionable survivor (`:32`, "record real artifacts") along with the collapsible restatements it's meant to remove. |
| INV-18 | D-08 | **add** | `min:1, max:1` (today 2) | No core enforcement of the *ordering* (mark `in_progress` before doing work) — `updateTask` accepts a direct `todo→done` jump. The board's live-state signal during a build depends entirely on this prompt line. |
| INV-19 | D-09 | **add** | `min:2, max:6` | Two independent actors (`builder.md:64`, `specmanager-build.md:74`) state it; no core enforcement (`update_task` has no phase scoping). This is arguably the single most consequential unenforced rule in the inventory — its loss lets a run consume a whole multi-phase plan unsupervised. |
| INV-20 | D-09b | **add** | `min:1, max:2` | Distinct from `D-06`'s "≤3, split before persisting" rule — this is "escalate, don't re-size, inside the builder." Not core-enforced (`update_task` accepts a `complexity` write). Explicitly flagged by `task-001` as at risk of an accidental over-cut in row 3.4. |
| INV-21 | D-14 | **add** | `min:3, max:3` (structure, value-agnostic) | The default complexity→tier→alias table's **shape** (three tiers named, `>3`/unscored ⇒ `strong`) must be stated and must match `core/tiers.ts`. **Hazard, adjudicated below.** |
| INV-22 | D-26 | **add** | `min:1, max:3` (today 6) | Split out of Architecture's conflated `INV-8`. Anchor on `reviewer.md:3`'s "Never writes." description — that's the actual textual guard. **The `Bash` residual is recorded, not fixed**: `tools:` narrows the reviewer to `Read, Glob, Grep, Bash`, and `Bash` can write. No regex catches a runtime `git checkout -- .` misuse; this entry guards the *stated* claim only. Adjudicated below (#5). |
| INV-23 | D-28 | **add** | `min:2, max:7` | Reviewer-slice contract: `reviewer.md:18` (the contract) + `specmanager-build.md:90` (the obligation). **Flag for the Plan:** row 3.11's ≤10-bullet Don't-list for `build.md` does not name `:90` among its 8 explicit keepers — if it's cut, only `reviewer.md:18` states the rule and the parent-side "don't hand the reviewer the whole Architecture" obligation goes unstated. Recorded as a finding, not fixed here (out of scope — I don't edit the Plan). |
| INV-24 | D-29 | **add** | `min:1, max:2` | Not core-enforced. A taste-grading reviewer never returns `pass`, silently escalating every phase through the tier ladder to `strong` and then to `blocked` — looks like a model regression, is a prompt regression. |
| INV-25 | D-31 | **add** | `min:8, max:10` (today 11, post `builder.md:72` cut) | **The single highest-value addition in this reconciliation** — "never approve a document" has zero `INV` coverage today despite being the core of the human-approval loop. Five of nine actors hold `set_status` with no `tools:` allowlist (verified above); a shared `min:1` pattern would stay green while 4 of 5 losing the rule went unnoticed. `min:8` is the whole guard here. |
| INV-26 | D-46 | **add** | `min:1, max:1` | Distinct claim from `INV-3`'s de-dup boundary: Superpowers is *execution-discipline only*, never its brainstorming/planning skills. Loss lets a builder re-plan mid-task — the exact authority collision the PRD→Architecture→Plan→Build lifecycle exists to prevent. |
| INV-27 | D-54 + D-55 + D-56 | **add** (combined) | `min:3, max:3` (one clause each) | Three co-located clauses inside the exact 17-line block (`architect.md:25–41`) row 3.7 compresses to one sentence: Context7 is architect-only/on-demand (`D-54`), a failed/empty/`429` lookup is never a blocker (`D-56`), and — "the sharp one" per `task-001` — Context7 must never be added to `.mcp.json` (`D-55`, named explicitly as a row-3.7 survivor whose home is *inside* a deleted range). |
| INV-28 | D-57 | **add, flagged** | `min:1, max:1` | "Note the library + version consulted" (`architect.md:41`) sits in the same deleted range as `INV-27` but **is not named as a 3.7 survivor**. **This entry will fail at trim time unless row 3.7's one-sentence replacement is extended to carry it.** Adjudicated below (#3) — recorded as a Plan finding, not fixed here. |
| INV-29 | D-59b | **add, contingent** | `min:4, max:4` | Sibling to `INV-13` at the same 4 sites (the density block's first sentence: "reference upstream docs by id — never restate their content"). **Contingent on Plan row 3.3 keeping two sentences, not one** — as written today, 3.3 drops it. Adjudicated below (#2). |
| INV-30 | D-36a | **add** | `min:2, max:2` | "Drafting agents write nothing *outside* `.claude/specs/`" (`prd-writer.md:48`, `architect.md:88`). |
| INV-31 | D-36b | **add** | `min:1, max:1` | Opposite polarity: "the builder writes nothing *inside* `.claude/specs/` — MCP tools only" (`builder.md:73`). Adjudicated below (#4) — **must be two entries, not one**; a de-dup pass keying on the literal string `.claude/specs/` would collapse them and invert whichever rule loses. |
| INV-32 | D-86 | **add** | `min:1, max:2` | "The plan-approved check is compound: gate ok AND an approved plan doc exists" (`specmanager-build.md:18,:73`). Reads like a `check_gate` restatement and isn't — `checkGate(stage:"plan")` only verifies the Architecture is approved; nothing in `core/` checks a Plan doc exists. Named verbatim as one of Plan row 3.11's 8 explicit Don't-list survivors ("plan-approved check") — it must have textual coverage or the post-trim `max` recalculation in row 3.12 has nothing to anchor to. |
| INV-33 | D-10 | **add** | `min:1, max:1` | "Task state is owned by the builder; the build command never writes it" — already single-sited (`specmanager-build.md:76`); the trim must not touch it. Also named in row 3.11's 8 survivors ("builder owns task state"). |
| INV-34 | D-15 | **add, do-not-touch** | `min:1, max:1` | `set_active_build` arms the Stop-gate; without the marker the gate is a permanent no-op (`specmanager-build.md:20`). **The most silent possible failure in the inventory** — if the command stops calling it, the Stop-gate never fires again, on any feature, forever, with no error and nothing that would notice. `selftest-stopgate` covers the resolver's correctness, not the caller's obligation to invoke it — this is the only thing that does. |
| INV-35 | D-53 | **add** | `min:1, max:1` | The section-anchor convention (`architect.md:56–63`) is the *emitter's* half of the contract `getSpecSlice` (this feature's own new code, rows 2.1–2.4) consumes as the *resolver's* half. Sits between two ranges `architect.md` trims elsewhere (`:41` Context7, `:65` density) with no other statement site — if it's lost, `architectureRefs` resolution silently degrades to `getSpecSlice`'s name-matching fallback for every future feature, with no error anywhere. |
| INV-36 | D-47 + D-48 | **add** (combined) | `min:2, max:2` | "Graceful degradation — a missing skill is never an error" + "no vendoring — invoke the skill, never copy its text" (one survivor each in `builder.md` and `designer.md`). Both residual claims sit inside the exact blocks rows 3.5/3.6 compress to 1–2 lines; a compression could legitimately retain "defer to the skill if installed" while dropping "never error if it's absent" or "never copy its text," which are the load-bearing halves. |
| INV-37 | D-50 | **add** | `min:2, max:5` | "DESIGN.md tokens remain the source of truth; the skill only informs composition, never overrides them" (`designer.md:82`, `builder.md:56`). **`builder.md:56` sits inside the exact `L54–58` range row 3.5 compresses** — direct risk, not indirect. Without a guard, the compressed line could plausibly keep "defer to `frontend-design` for taste" while dropping the grounding constraint that's the entire point of the Design-grounding section (R5/AC2). |

**Definitive count for `task-011`:** 15 corrected (`INV-1`…`INV-15`) + 22 added (`INV-16`…`INV-37`)
= **37 entries.** Not 88 — see Part D for what was deliberately left out and why.

---

## Part C — The six adjudications

1. **`D-14`'s value hazard.** Resolved by making `INV-21` a **structural** pattern (three tiers
   named, `>3`/unscored ⇒ `strong`) with an explicit instruction: never pin a literal alias
   string. `task-007` (row 2.7) remaps `cheap: "haiku" → "sonnet"` in the `core` phase, before any
   prompt is trimmed — a value-pinned pattern would go red there and read as a false over-trim
   signal. `INV-6` (route on aliases, not dated ids) is unaffected by the same hazard since it
   already asserts a structural claim, not a value.

2. **`D-59b`.** Added as `INV-29`, contingent on Plan row 3.3 being widened from one sentence to
   two. As currently written, row 3.3 drops "reference upstream docs by id — never restate their
   content," which has no other statement site in any of the four agents and is the token-budget
   rule, not a style preference `task-001` is right that dropping it "invites a Plan that inlines
   the Architecture — which would then also satisfy `D-59` [`INV-13`], since nothing was lost."
   **Recommendation for the Plan** (not applied by me): extend row 3.3's survivor to two
   sentences. `INV-29`'s `min:4` will fail loudly at row 3.12 if the Plan isn't amended and the
   trim proceeds as currently worded — that's the guard doing its job, not a bug.

3. **`D-57`.** Added as `INV-28`, flagged the same way: Plan row 3.7's one-sentence replacement of
   `architect.md:25–41` covers `D-56` and `D-55` but not "note the library + version consulted."
   **Recommendation for the Plan:** extend 3.7's survivor sentence by one clause, or accept the
   loss explicitly and drop `INV-28` before `task-011` encodes it. I am not making that call
   unilaterally — it's a genuine trade (17 lines → 1 sentence vs. 17 lines → 1.5 sentences), and
   the Plan already made a deliberate compression choice here that a task-002 doc shouldn't
   silently overrule. Recorded, not applied.

4. **`D-36a` vs `D-36b`.** Resolved as two separate entries, `INV-30` and `INV-31`, matching
   `task-001`'s explicit warning: these are polarity opposites (drafting agents forbidden *outside*
   the spec tree; the builder forbidden *inside* it) that share the substring `.claude/specs/`. A
   single `min:1` pattern on that substring would let either rule silently invert while staying
   green.

5. **`D-26`.** Accepted the Plan's premise (`tools:` frontmatter enforces read-only) as ~90% true,
   per `task-001`'s own framing, and encoded the residual as an explicit, permanent limitation
   rather than pretending a regex closes it: `INV-22` guards the reviewer's **stated** claim
   (`reviewer.md:3`, "Never writes.") and its site count, not runtime `Bash` behaviour. Verified
   the `tools:` value myself (`Read, Glob, Grep, Bash`) — `Bash` genuinely can write, and no
   `selftest-prompts` pattern can close that gap; it would need a runtime reviewer-transcript
   check, which is out of this feature's scope. Recorded as a permanent residual, not a to-do.

6. **`D-39`.** Not a `selftest-prompts` change — `INV-10` is kept with its existing `min`/`max`.
   Flagged as a **textual accuracy** finding for the `trim` phase: row 2.8 deletes
   `hooks/stop-gate.sh`'s rung 3, which makes `planner.md:99`'s justification ("an absent
   `testCommand` forces a brittle convention probe") factually false the moment 2.8 lands. This
   is the one prompt sentence this feature itself makes incorrect. Recommend the `trim` phase
   (row 3.13's neighbourhood is the natural home, or a new task) **update the wording, not delete
   the rule** — the underlying rule ("always declare `testCommand`, never leave it absent") stays
   true and more important post-2.8, since rung 2 (`**Exit test:**`) becomes the last fallback.

---

## Part D — Considered, not added (avoiding the 88-candidate trap)

`task-001`'s own filter table puts ~22 entries "outside the trim surface" (optional) and ~9 as
"restatements of a loud core guard" (not needed — they're what the trim is *for*). Encoding all
88 would make `selftest-prompts` a second copy of the prompts with no corresponding trim risk to
justify most of it. Reviewed each remaining candidate against the actual `trim`-phase task list
(rows 3.1–3.15) rather than rubber-stamping the bucket:

| Id(s) | Reason not added |
|---|---|
| D-42 | No consumer parses the dotted row numbering — confirmed no machine behaviour depends on it. Convention, not invariant, per `task-001`'s own recommendation. |
| D-06 (error-name half), D-52, D-70, D-71, D-87 | Genuine restatements of a **loud** `core/` guard (`SplitRequiredError`, the 5MB/`---` cap, the marker-anchored merge, `selftest-repos`, `PRIOR_STAGE.design="prd"`). Guarding these would defeat the point of `R4`'s trim. |
| D-02, D-03, D-05, D-11, D-25, D-33, D-34, D-35, D-37, D-38, D-40, D-41, D-43, D-44 | Real, load-bearing, but their sites sit outside every row 3.1–3.15 edit range (`-interview.md`, `-init.md`, most of `-design.md`, `active-card.ts`'s already-isolated `matchPhaseHeading`, `walkthrough-writer.md`'s untouched sections). A regression here is a separate defect from this feature's trim, not a risk this feature introduces. |
| D-51, D-58 | `D-51` (self-contained mockups HTML) sits at `designer.md:79–103`, outside row 3.6's `:26–41` compression range. `D-58` (repo-grounded, don't invent files) sits at `:54,:85`, outside row 3.7's `:25–41` range. Neither is edited by this feature. |
| D-60…D-88 (walkthrough scope/shape, PRD/interview, orchestration delegation, init/managed blocks, design-command specifics) | Same reasoning at bucket scale — `specmanager-init.md`, `specmanager-board.md`, and most of `specmanager-interview.md` are explicitly out of the `trim` phase's file list (row 3.1 names six drafting commands + `build.md`; `-init.md` and `-board.md` aren't among them). `task-001` notes `specmanager-board.md` has zero trim-touched rules and recommends it as a **control** — if a future `selftest-prompts` refactor makes its counts move, the harness is broken, not the prompts. Left unguarded on purpose, for that reason. |

If a later phase's diff turns out to touch any of these files after all, the fix is to add the
entry then, against the actual edit — not to pre-emptively guard every candidate the enumeration
surfaced.

---

## Findings for the Architecture / Plan (recorded, not applied — I don't edit those docs)

1. **Architecture's `INV-1`, `INV-2`, `INV-4`, `INV-6`, `INV-7`, `INV-11` site counts are
   measured wrong** (verified above); `INV-8` conflates two distinct rules; `INV-14`'s `min:1`
   framing is actively unsafe (passes with 4 of 5 elements deleted). None of these are edits I'm
   making — `task-011` should encode the corrected counts from Part A, not the Architecture's
   original table.
2. **`D-04` and `D-31` have zero `INV` coverage** despite being, respectively, the entire
   write-path enforcement of the gate system and the entire enforcement of the human-approval
   loop. Recommend the Architecture's table be corrected in a future doc pass to include them
   (not urgent for this feature — `task-011` will encode `INV-16`/`INV-25` regardless of whether
   the Architecture doc itself is amended).
3. **Plan row 3.3 and row 3.7 each drop one clause with no other statement site** (`D-59b`,
   `D-57`) — see adjudications #2 and #3. Recommend widening both survivor sentences by one
   clause each when the `trim` phase actually executes those rows; until then, `INV-28`/`INV-29`
   will fail at row 3.12 exactly as designed, which is the correct signal, not a bug in the
   harness.
4. **Plan row 3.11's ≤10-bullet `build.md` Don't-list should explicitly include `specmanager-
   build.md:90`** ("don't hand the reviewer the whole Architecture") among its keepers — see
   `INV-23`. Its 8 named survivors already cover `D-86`/`D-09`/`D-31`/`D-10`/`D-23`/`D-26`/
   `D-16`/`D-01`; `D-28`'s parent-side half isn't among them and has no other site.
5. **`INV-10`'s justification text (`planner.md:99`) needs a factual update, not a deletion**,
   once row 2.8 lands — see adjudication #6.

---

## Scope note

This document is the reconciliation `task-011` encodes into `selftest-prompts.ts`. It does not
touch `server/src`, does not rebuild `dist/`, and approves nothing. The six adjudications name
three follow-on Plan/Architecture corrections (`D-59b`/row 3.3, `D-57`/row 3.7, `D-28`/row 3.11)
that are recorded as findings for the user to route to a Plan or Architecture revision — not
applied here, per this task's brief.
