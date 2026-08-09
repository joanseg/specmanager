# SpecManager prompt-surface review (Opus 5)

Assessment of the plugin's agents, commands, and hooks in light of Opus 5 and
current Claude Code subagent capabilities. Scope: `plugins/specmanager/agents/*`,
`plugins/specmanager/commands/*`, `plugins/specmanager/hooks/*`, and the prompt-adjacent
parts of `server/src/core/`. No code was changed — this is a decision document.

The plugin ships **no skills**; its prompt surface is 7 agents (7,178 words) and
9 commands (5,838 words). Measurements below are from the working tree at
`e61cd8c`.

---

## 1. Capability facts that changed the baseline

These are verified against the current Claude Code subagent docs, not assumed.
They matter most to anyone doing a model/tier update.

| Fact | Consequence |
|---|---|
| Subagent frontmatter supports `effort`: `low \| medium \| high \| xhigh \| max`, defaulting to inherit-from-session | Effort is now a real cost dial, orthogonal to model choice |
| **Per-invocation** dispatch accepts `model` but **not** `effort` | Effort can only be varied by authoring separate agent definitions — there is no `Task({ effort })` |
| `model` accepts `sonnet`, `opus`, `haiku`, `fable`, a full model ID, or `inherit`; defaults to `inherit` | `fable` is a new alias the tier table predates |
| There is no Haiku 5 — the current Haiku is 4.5 | The `cheap` tier routes a generation behind the other two |
| Subagents inherit the main conversation's extended-thinking setting (v2.1.198+); there is no per-subagent thinking toggle | Nothing to configure per-agent here |
| The `Task` tool was renamed `Agent` in v2.1.63; `Task(...)` still works as an alias | Every prompt in the plugin says `Task({...})`. Still valid, but dated naming |

---

## 2. Cleanup requiring no decision

Verified redundancies. None of these interact with the four recommendations below.

### 2.1 `sync_claude_md` is called redundantly in 6 commands

`startClaudeMdAutoSync` (`server/src/mcp.ts:554`) subscribes to the core event bus and
already schedules a debounced (150 ms) `syncClaudeMd` on `feature.created`,
`document.created`, `document.updated`, `status.changed`, `stale.flagged`, and
`stale.cleared`. Every drafting command ends with an explicit **"Sync CLAUDE.md — call
`sync_claude_md`"** step that fires *after* the subagent's `create_document` has already
triggered it.

Affects: `specmanager-prd.md` (step 4), `specmanager-architecture.md` (5),
`specmanager-design.md` (7), `specmanager-plan.md` (6), `specmanager-walkthrough.md` (7),
`specmanager-interview.md` (step 5 tail). Delete the step in all six.

**Keep** the `sync_claude_md` inside `specmanager-build.md` step 8's doc-sync branch — there
it is a user-chosen action with a reported outcome, not an implicit refresh.

### 2.2 The density contract is duplicated verbatim in 4 agents

The same ~70-word "Density contract (lossless)" block appears in `architect.md`,
`planner.md`, `prd-writer.md`, and `walkthrough-writer.md`. Its instructions ("no
throat-clearing, transitions, or restating what a section just said") largely describe
current default behavior. The load-bearing half is the *lossless* clause — every fact
from the inputs must survive. Reduce to one sentence per agent, keeping the lossless
guarantee and dropping the style coaching.

The repo already has the right home for this: `docs/agent-snippets/` holds canonical
shared prompt fragments, copy-pasted into each agent because there is no install-time
preprocessor. The density contract should become `docs/agent-snippets/density-contract.md`
under the same convention.

### 2.7 The existing shared snippet has already drifted (defect, not just redundancy)

`docs/agent-snippets/design-grounding.md` is the canonical source for the design-grounding
fragment used by `architect.md`, `planner.md`, and `builder.md`, with the convention
*"If you change the fragment here, also update the three agent prompts."* That has not held:

- **Canonical snippet and `architect.md`** say to `read_document` the design doc.
- **`planner.md` and `builder.md`** say to read the HTML file directly with `Read` on the
  `filePath` from the listing — *"not `read_document`, which JSON-escapes the whole body."*

So the architect is currently instructed to use the exact method the other two agents
explicitly warn against, and the canonical snippet enshrines the stale version. Fix the
snippet to the `Read`-on-`filePath` form and propagate to `architect.md`.

This also argues for making the copy-paste convention checkable — a selftest that asserts
each agent's copy matches its snippet would have caught this. Worth considering alongside
2.2, since adding a second snippet doubles the surface that can drift.

### 2.3 `specmanager-build.md` restates its own rules 3–4×

2,338 words and **19** `Don't` bullets — more than the other 8 commands combined (24).
Several rules appear three or four times:

- `clear_active_build` pairing: step 4c, step 8, step 9, plus two `Don't` bullets.
- "Don't infer phase done from the builder returning": stated in step 8's body, then
  again as a `Don't`, with the "P1 fix" rationale repeated in both.
- The **"Retry-budget boundary"** paragraph exists solely to stop a reader conflating
  R=2 (transport retry) with N=3 (post-stop iteration cap), then a `Don't` bullet
  restates the same non-composition rule.

Cut to one statement per rule at its point of use. Target ~1,200 words with no rule lost.

### 2.4 Prompt restatements of core-enforced invariants

`CLAUDE.md` states the principle: *"Gate enforcement lives in `core`, not in prompts."*
Several prompt rules violate it by restating what the server already rejects:

- `builder.md`: "Don't mark a task `done` without at least one commit or file ref" — the
  same file already notes the server **rejects** this (`missingArtifact`).
- `reviewer.md`: "Don't write, edit, or change task status — you have no such tools" —
  enforced by its `tools:` frontmatter (`Read, Glob, Grep, Bash`).
- `planner.md`: "Don't persist a task with `complexity ≥ 5`" — server returns
  `splitRequired`; the prompt already says the planner should never see it.

Keep the ones that shape *behavior before* the call (the planner's self-check to split
first). Drop the ones that only restate a rejection the model will observe anyway.

### 2.5 Duplicate model pin on the reviewer

`agents/reviewer.md` frontmatter is `model: opus`; `specmanager-build.md` step 7b also
passes `model: "opus"` at dispatch. One of the two is enough — keep the frontmatter, drop
the dispatch override, so the reviewer's tier is defined in one place.

### 2.6 Spec-slice assembly is deterministic text processing described in prose

`specmanager-build.md` step 7b instructs the model to: locate the `## Phase <name> — …`
heading, slice to the next `## Phase`/`---`, resolve each `meta.architectureRefs` anchor
by finding the Architecture heading whose leading id-token (`R1`, `R2`, …) or kebab-slug
matches, slice to the next same-level heading, and fall back to name/id matching when
`architectureRefs` is empty.

That is a pure function over two markdown files. It belongs in `core` as e.g.
`getSpecSlice({ featureId, phase })` exposed as an MCP tool — consistent with the repo's
own "logic lives in core, not prompts" invariant, and it makes the reviewer's contract
reproducible and testable rather than re-derived per run. Removes ~10 lines of prose from
the build command.

**Size:** 2.1–2.5 are prompt-only edits, no rebuild needed. 2.6 is a new `core` module +
tool registration + a selftest, and requires `npm run build` in `server/`.

---

## 3. Recommendation 1 — Drop per-task tier dispatch

### Recommendation

Remove complexity → tier → model-alias routing. Run every builder at the session default.
Revisit effort-based tiering **only when per-invocation `effort` becomes available**.

### Rationale

The tell is inside the build command itself: on a reviewer `fail` it "re-dispatches a fix
to the builder one R2 tier higher." That is an explicit admission that the tier was too low
for the work. A substantial share of `specmanager-build.md`'s complexity — the R=2 transient
retry, the N=3 stop-gate cap, the reviewer-fail escalation ladder, the blocked-phase
surfacing — is scaffolding around the possibility that a cheap model botched a card.

Fibonacci `complexity` is a **sizing** score, not a **contextual risk** score. A 1-point task
touching `core/claude-md.ts` still has to preserve the line-anchored marker merge; a
1-pointer touching `core/documents.ts` still has to respect optimistic concurrency. Meanwhile
the builder must hold ~1,345 words of protocol, run a topological pass over `dependsOn`,
read the prior phase's walkthrough and any design mockups, and record artifacts in a shape
the server validates. Haiku 4.5 is the weak link in that chain, and a miss costs a stop-gate
iteration plus a re-dispatch — more than the routing saved.

The honest counterpoint: routing 3 of 10 cards away from Opus is real money, and "Token
usage optimisation" is an approved PRD on this board. So the recommendation is not "cost
doesn't matter" — it's that **the better dial isn't purchasable yet**. `effort` maps onto
complexity far more honestly than model swapping (same model, same instruction-following,
less thinking), but it only exists as frontmatter. Implementing complexity → effort today
means three `builder-cheap|standard|strong.md` files differing by a single frontmatter line.
`builder.md` is the most-edited agent in the plugin; triplicating it is a worse maintenance
tax than the one being removed.

### Files touched

| File | Change |
|---|---|
| `server/src/core/tiers.ts` | Delete (52 lines) |
| `server/src/core/index.ts` | Drop the re-export |
| `server/src/selftest-tiers.ts` | Delete (58 lines) |
| `server/package.json` | Remove the `selftest-tiers` script |
| `commands/specmanager-build.md` | Delete step 6b entirely; strip alias resolution from step 7; drop 2 `Don't` bullets about aliases |
| `agents/builder.md` | Delete the "Model is parent-supplied (R2)" note |
| `CLAUDE.md` | Rewrite the "Per-task tier dispatch" bullet under *Build leverage primitives* |

### Size

Medium. Net deletion (~150 lines across code + prompts), one module and one selftest
removed, requires a `server/` rebuild. Low risk — `tiers.ts` is pure and has no callers
outside the build command's prose and its own selftest.

### Risks / open questions

- **Cost regression is real and should be measured, not assumed away.** Worth capturing a
  before/after on one representative multi-task phase before committing to this.
- Per-task dispatch itself is *not* being removed — only the model routing. Note that
  per-task dispatch reloads `builder.md` once per card, so a 10-task phase pays ~13,450
  words of builder system prompt. Trimming `builder.md` is an additive token lever
  independent of this decision.
- **Open:** does `fable` change the calculus? Its positioning relative to the existing tiers
  wasn't established during this review. If a tier table is kept (see alternatives), `fable`
  should be evaluated before the table is finalized.
- **Alternatives considered:** (a) three effort-varied builder files — better dial, worse
  duplication, recommended *later*; (b) re-map the existing table — nearly a no-op since it
  already resolves to haiku/sonnet/opus; (d) move the table to `plugin.json` `userConfig`
  beside `board_port`, which at minimum kills step 6b's once-per-build `AskUserQuestion`
  friction. **(d) is the fallback if dropping tiering outright is judged too aggressive.**

---

## 4. Recommendation 2 — Compress the three third-party-skill blocks

### Recommendation

Reduce each to roughly one line. Keep the de-dup boundary; drop the graceful-degradation
ceremony and the Context7 transport details.

### Rationale

Three blocks of integration prose total ~55 lines:

- **Superpowers detect-then-defer** (~25 lines, `builder.md`) — TDD, systematic-debugging,
  two-stage review.
- **`frontend-design`** (~15 lines across `builder.md` and `designer.md`) — including a
  distilled built-in fallback method.
- **Context7 doc-lookup ladder** (~15 lines, `architect.md`) — MCP tools, then a raw
  `curl` REST fallback with `libraryId` path syntax, anonymous-pool rate limits, and
  `Authorization: Bearer ctx7sk-…` header instructions.

Skills auto-trigger from their own descriptions, so a large share of this is describing
machinery that operates without being described. And "graceful degradation: if the skill
isn't installed, proceed normally, no error" is default behavior — no current model errors
out because an optional skill is absent.

Context7's block is the weakest of the three: it hardcodes a URL shape, a query-parameter
scheme, and a rate-limit figure, all of which rot silently, and `WebFetch` already covers
the underlying need. Collapse to: *"For unfamiliar or version-sensitive libraries, look up
current docs (Context7 MCP if present, otherwise WebFetch). Never block the draft on a
lookup. Cite the library and version you consulted where it informed a decision."* That
preserves AC4 (graceful degradation) and AC5 (grounded, traceable use) in one sentence.

### What must survive

The **shared de-dup line** in `builder.md` is load-bearing and must be kept: it is the only
thing scoping Superpowers' two-stage review to *in-build* discipline so it doesn't collide
with the R3 reviewer's *pre-advance* gate. Also keep the "never Superpowers'
brainstorming/planning skills" boundary — SpecManager owns the *what*, Superpowers only
sharpens the *how* — and the no-vendoring rule.

### Files touched

`agents/builder.md` (two blocks), `agents/designer.md` (one block plus the 3-tier method),
`agents/architect.md` (the Context7 ladder). Prompt-only; no rebuild.

### Size

Small. ~50 lines removed, no behavior change, trivially reversible.

### Risks / open questions

- These blocks came from deliberate feature specs with numbered acceptance criteria
  (R4/R5/R6). **Compressing them may leave those ACs formally unsatisfied even though the
  behavior is preserved.** Someone should confirm whether the shipped ACs are treated as
  living contracts or as historical records before this lands.
- `designer.md`'s "distilled built-in fallback" (the 4–6 token colors, 2+ type roles,
  layout concept, signature element, genericness critique) is arguably the most valuable
  prose in that file and encodes real taste. **Recommend keeping that one in full** and
  compressing only the detect-then-defer wrapper around it.

---

## 5. Recommendation 3 — Keep five drafting commands, shrink each

### Recommendation

Keep `/specmanager-prd`, `-architecture`, `-design`, `-plan`, `-walkthrough` as five
commands. Strip each to its genuinely stage-specific content. Do **not** collapse them into
one parameterized command, and do **not** move the shared steps into an MCP tool.

### Rationale

All five follow one shape: resolve feature → `check_gate` → confirm no draft exists → look
up upstream doc ids → `Task(subagent)` → sync → report. The duplication is real, but the
two "principled" fixes are both worse than they look.

**Against a `prepare_stage_draft` MCP tool:** what's duplicated isn't *logic*, it's
orchestration with a human in the loop. `specmanager-prd.md` step 2 asks the user whether to
iterate or start over when a PRD already exists. `specmanager-design.md` step 5 harvests
screenshot paths the user pasted into the conversation *before* invoking the command —
a tool cannot see that. `specmanager-walkthrough.md` step 3 short-circuits single-phase
`final` before touching the gate. A tool would cover the three mechanical calls (gate,
draft-check, id lookup) while the commands still handled the interactive parts, netting a
few saved round-trips in exchange for indirection plus a selftest.

**Against `/specmanager-draft <stage>`:** breaks command names users have memorized and that
appear in `CLAUDE.md`'s managed block, the README, and every shipped walkthrough, for zero
functional gain.

Shrinking in place is free, reversible, and captures most of the benefit — these files load
one at a time, so the cost of duplication is maintenance, not tokens, and shorter files are
easier to keep in sync than fewer-but-parameterized ones.

### Files touched

`commands/specmanager-prd.md` (332 w), `-architecture.md` (224 w), `-design.md` (465 w),
`-plan.md` (451 w), `-walkthrough.md` (468 w). Prompt-only; no rebuild. Combines naturally
with §2.1 (deleting the redundant sync step from each).

### Size

Small. ~40% word reduction across five files, no UX change, no interface change.

### Risks / open questions

- Low risk overall. The main one: some of the prose reads as redundant but encodes a
  hard-won rule — e.g. `specmanager-prd.md` step 2's *"**Ignore docs with `kind: "interview"`**
  — an interview-first flow must not be reported as 'a PRD already exists'"*. That looks like
  padding and is not. **Trim by reading each `Don't` against `core/` to check whether it
  encodes a real invariant, rather than trimming by length.**
- **Revisit the MCP-tool option if a sixth drafting stage is added** (the board already
  carries a "Security review stage" PRD). At six, the arithmetic changes.

---

## 6. Recommendation 4 — Settle the reviewer shape, but in the PRDs, not in code

### Recommendation

Adopt a single reviewer with a `dimension` parameter (`spec` | `design-conformance` |
`security`) as the intended architecture — but **record it as a constraint in the two
PRD-stage features rather than refactoring `reviewer.md` now.**

### Rationale

Today there is one read-only reviewer (`agents/reviewer.md`, 483 words, spec compliance).
Two board features imply more: **"Security review stage"** (PRD approved) and **"Post-phase
design conformance check"** (PRD draft). That trajectory ends at 3–4 near-identical
read-only agents.

Roughly 90% of `reviewer.md` is dimension-independent: read-only tool set, "the slice is
your entire contract, don't invent requirements", the `{ verdict, reasons }` return shape,
and "don't decide whether the card advances — the parent does." Only the *how to review*
section genuinely varies by dimension. If those two features are planned independently,
each re-derives that contract and they drift — precisely the failure this lifecycle exists
to catch.

But refactoring a shipped agent now to accommodate two features still at PRD is pre-empting
the process. The middle path costs nothing: add the constraint to both PRDs ("extends the
existing reviewer via a `dimension` parameter; does not introduce a new read-only agent")
and let each feature's Architecture stage honor it.

**Against reusing `/security-review` and `/code-review`:** wrong shape. Those review a
working diff or branch and return prose. The build command branches on a structured verdict
evaluated against an assembled spec slice scoped to one phase's commits. Adapting them
would cost more than parameterizing the reviewer.

### Files touched

Now: `.claude/specs/features/security-review-stage/prd/*` and
`.claude/specs/features/post-phase-design-conformance-check/prd/*` — a constraint line each.
Both are PRD-stage, so edits go through the board/`write_document`, not by hand.

Later, when those features build: `agents/reviewer.md` (parameterize), and
`commands/specmanager-build.md` step 7b (pass the dimension).

### Size

Negligible now (two PRD edits). Medium later, but owned by those features' own plans.

### Risks / open questions

- **Editing an approved PRD ("Security review stage") flips it back to `draft` and
  propagates staleness through its `dependsOn` graph.** Confirm that's acceptable, or defer
  the constraint to that feature's Architecture stage instead.
- **Open:** does the design-conformance reviewer actually fit the same contract? It compares
  built UI against `mockups.html` and `docs/DESIGN.md` tokens — plausibly a different slice
  shape (HTML mockups rather than markdown sections) even if the verdict shape matches.
  Worth confirming before hard-committing the two PRDs to a shared agent.

---

## 7. Suggested sequencing

1. **§2 cleanup** — independent of all four decisions, mechanical, mostly prompt-only.
   §2.6 is the only part needing a rebuild.
2. **Rec 3** (shrink commands) — combines with §2.1; touches the same five files.
3. **Rec 2** (compress skill blocks) — pending the AC-status question in §4 risks.
4. **Rec 4** (PRD constraint lines) — pending the approved-PRD staleness question.
5. **Rec 1** (drop tiering) — largest blast radius; sequence last, ideally after a
   before/after cost measurement on one representative phase.

Recommendations 1 and 4 both interact with a model/tier update and with any autopilot work
that dispatches builders — coordinate those before landing Rec 1.
