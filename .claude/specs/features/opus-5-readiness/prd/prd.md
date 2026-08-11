---
id: prd-opus-5-readiness-036
featureId: feat-opus-5-readiness
stage: prd
status: approved
stale: false
title: Opus 5 readiness PRD
dependsOn: []
basedOn: {}
generatedBy: agent
version: 2
createdAt: '2026-08-03T16:08:51.136Z'
updatedAt: '2026-08-11T08:57:26.138Z'
---
## Problem

SpecManager's prompt surface — 7 agents (7,178 words) and 9 commands (5,838 words) — was calibrated for a **weaker, non-reasoning subagent** and for **Opus 4.x tier economics**. Both assumptions have since changed:

- Subagents now inherit the main session's extended-thinking configuration (Claude Code v2.1.198+). Before that they ran with thinking disabled unconditionally. Much of the procedural micro-stepping in the prompts (planner's "Self-check before persisting", builder's "verify with a topological pass", architect's numbered research ladder) exists to compensate for a model that could not reason.
- `core/tiers.ts` routes complexity 1 → `cheap` → `haiku`. **There is no Haiku 5** — that alias now resolves to Haiku 4.5, a full generation behind Opus 5 / Sonnet 5. Since complexity 3 and anything >3/unscored both route to `strong`, and the planner caps tasks at ≤3, most tasks already land on opus regardless.

The cost is paid twice:

- **Per dispatch.** Per-task builder dispatch reloads `builder.md`'s 1,345 words once per card. `commands/specmanager-build.md` is 2,338 words with 19 `Don't` bullets (80 across all 16 files).
- **In maintenance drift.** One rule stated in four places drifts. The `clear_active_build` pairing rule appears in build steps 4c, 8, 9, and twice more in Don'ts.

A completed audit against the Opus 5-era Claude Code contract verified a specific list of redundancies and platform changes (below). This feature acts on that audit.

## Users

| User | Job-to-be-done | Why they feel this |
|---|---|---|
| **Maintainer (primary, dogfooding)** | Change one lifecycle rule and have it stay changed | A rule stated in 4 places must be edited in 4 places, or it silently contradicts itself |
| **SpecManager end users** | Run the lifecycle without paying for dead prose | They pay the token cost of every shipped prompt on every dispatch, and inherit the tier-routing reliability profile they did not choose |
| **Future feature authors** | Add a review dimension without cloning an agent | Three structurally identical reviewers are converging with no shared shape |

## Goals

1. Remove verified-redundant prompt material without weakening any enforced gate.
2. Bring the prompt surface onto the current Claude Code contract (`Agent` tool name, `effort` frontmatter, `fable` alias, thinking-inheriting subagents).
3. Move deterministic text processing out of prose and into `core`, per the repo's own stated invariant.
4. Resolve — at Architecture stage — the four open decisions below, so they stop blocking cleanup.

## Non-goals

- **No lifecycle behaviour change.** Gates, staleness computation, phases, walkthrough semantics (including single-phase features never producing a `final` walkthrough) all stay exactly as they are.
- **No UI / board change.**
- **No `core` rewrite** beyond the specific `get_spec_slice` extraction.
- **No redesign of `hooks/stop-gate.sh`.** Its zero-model-call deterministic design is correct; only its dead `probe_test_command` branch is in question.
- **Not a doc-content change.** The PRD/Architecture/Plan *outputs* the agents produce keep their current shape.

## Verified findings (audit input — do not re-derive)

### Verified defects (no decision needed)

| # | Finding | Evidence |
|---|---|---|
| R1 | `sync_claude_md` is a dead round-trip in **6 commands** | `mcp.ts:554` registers `startClaudeMdAutoSync`, subscribing to `document.created`/`document.updated`/`status.changed`/`stale.flagged`/`stale.cleared` on a 150ms debounce. `-prd`, `-architecture`, `-design`, `-plan`, `-walkthrough`, `-interview` each still carry an explicit "call `sync_claude_md`" step the subagent's own `create_document` already fired |
| R2 | Reviewer model pinned **twice** | `agents/reviewer.md` frontmatter `model: opus` + build step 7b passing `model: "opus"` at dispatch |
| R3 | "Density contract" duplicated **verbatim in 4 agents** (~90 words each) | architect, planner, prd-writer, walkthrough-writer. Most of it ("no throat-clearing, no transitions, prefer tables") is default Opus 5 behaviour; only the lossless-carryover clause is still load-bearing |
| R4 | Prompts restate rules `core` already enforces — contradicting the repo invariant *"gate enforcement lives in core, not in prompts"* | `builder.md` forbids marking a task `done` without artifacts (server rejects with `missingArtifact` — and the same file says so two paragraphs earlier); `reviewer.md` spends 4 bullets forbidding writes its `tools:` frontmatter makes impossible; `planner.md` forbids `complexity >= 5` (server rejects with `splitRequired`) |
| R5 | `specmanager-build.md` states single rules 3–4× | `clear_active_build` pairing ×5; "don't infer phase-done from the builder returning" ×2; an entire "Retry-budget boundary" paragraph exists only to stop a weaker model conflating the R=2 transport retry with the N=3 Stop-gate cap |
| R6 | Spec-slice assembly is deterministic text processing written as prose | Build step 7b tells the model to locate `## Phase <name>`, slice to the next `## Phase`/`---`, resolve each `meta.architectureRefs` anchor by leading id-token or kebab-slug match, slice to the next same-level heading, fall back to name-matching — re-derived on *every* build. Belongs in `core` as `get_spec_slice({ featureId, phase })`, same argument as the gate/staleness invariants |
| R7 | Stop-gate's `probe_test_command` ladder is near-dead code | `hooks/stop-gate.sh` probes `package.json`/`pyproject.toml`/`Cargo.toml` only when `testCommand` is absent, but `planner.md` self-check step 5 now mandates a non-empty `testCommand` (real command or literal `"none"`) per phase. Fires only for phases planned before that rule |
| R8 | Shared `design-grounding` snippet has drifted into a live **contradiction** (not a redundancy) | `docs/agent-snippets/design-grounding.md:7` (the canonical fragment) and `agents/architect.md:16` both instruct `read_document` on the design doc. `agents/planner.md:29` and `agents/builder.md:23` instead instruct reading the HTML file directly with `Read` on the `filePath` the listing returns — explicitly *"not `read_document`, which JSON-escapes the whole body."* The snippet file carries the convention *"If you change the fragment here, also update the three agent prompts"*; it has not held. So the architect is told to use the exact method the other two agents warn against, and the canonical snippet enshrines the stale version. Fix: correct the snippet to the `Read`-on-`filePath` form and propagate to `architect.md`. Also argues for a snippet-parity selftest asserting each agent's copy matches its snippet — more valuable if R3 adds a second shared snippet, since a second snippet doubles the drift surface |
| R9 | `CLAUDE.md` misdescribes how staleness is computed | CLAUDE.md states staleness is computed by walking the `dependsOn` graph *"on any `approved→draft` transition **or write to an approved doc**."* In the code, `stale: true` is set in exactly one place — `core/status.ts:70`, inside `propagateStale` — and `propagateStale` has exactly one caller, `core/status.ts:49`, guarded by `prev === "approved" && next === "draft"`. Separately, `core/documents.ts:233 writeDocument` spreads `...current.frontmatter` and never touches `status` or `stale`, so writing an approved document bumps `version`, emits `document.updated`, and leaves the doc `approved` with no cascade. The documented invariant overstates the implementation; needs either a doc correction or a behaviour change — an approved doc can currently have its content replaced without anyone re-approving it |

### Platform changes (verified against current Claude Code docs)

- **`effort` frontmatter** (`low|medium|high|xhigh|max`) is supported — but is **frontmatter-only**. The per-invocation parameter list supports `model`, **not** `effort`. A complexity→effort mapping therefore cannot be a dispatch-time argument the way complexity→model is; it would require separate builder agent definitions.
- **`fable`** is a new `model` alias alongside `sonnet`/`opus`/`haiku`/`inherit`.
- **No Haiku 5** — see Problem.
- **Subagents inherit extended thinking** (v2.1.198+); previously disabled unconditionally.
- **`Task` was renamed `Agent`** in v2.1.63; `Task(...)` still works as an alias. Every prompt in the plugin says `Task({...})` — functional but dated.

### Aged integration prose

Skills now auto-trigger from their own descriptions and WebFetch covers doc lookup natively, but:

- `agents/builder.md` — ~25 lines of Superpowers detect-then-defer (TDD / systematic-debugging / two-stage review, a shared de-dup line, graceful-degradation clauses).
- `agents/designer.md` — ~15 lines on `frontend-design` with a 3-tier method plus a distilled built-in fallback.
- `agents/architect.md` — ~15 lines of a 3-tier Context7 ladder including raw `curl` REST endpoints, `libraryId` path syntax, Bearer-token instructions, 429 handling.

The one genuinely load-bearing part is the de-dup line that stops Superpowers' two-stage review colliding with the R3 reviewer.

### Structural duplication

**Five drafting commands express one identical algorithm.** `-prd`, `-architecture`, `-design`, `-plan`, `-walkthrough` all run: resolve feature → `check_gate` → confirm no draft exists → look up upstream doc ids → dispatch `Task(subagent)` → sync → report. Only the stage name, which upstream ids to pass, and which subagent differ. **~1,900 words for one shape, five times.**

### Forward-looking overlap

One shipped read-only reviewer (`agents/reviewer.md`, spec compliance) plus **two queued features still at PRD**: `feat-security-review-stage` (approved) and `feat-post-phase-design-conformance-check` (draft). All three are structurally identical — read-only, fed a parent-assembled spec slice, return a structured verdict, parent owns advancement. Without a decision they become 3 near-duplicate agent files that drift.

## Success metrics

| Metric | Target |
|---|---|
| `agents/` word count | Measurable reduction vs. 7,178 baseline; target set at Architecture once decisions Q1–Q2 land |
| `commands/` word count | Measurable reduction vs. 5,838 baseline; `specmanager-build.md` specifically down from 2,338 |
| `Don't` bullets | Down from 80 across 16 files (19 in build alone) |
| Duplicated invariants eliminated | Count of rules stated >1× that end stated exactly 1× (R1–R5 enumerate the known set) |
| Tier-related machinery removed | Files/lines deleted if Q1 resolves to (c): `core/tiers.ts`, build step 6b, build step 7 alias resolution, `builder.md` R2 note, `selftest-tiers` |
| **No-regression (hard gate)** | All existing selftests pass: `selftest`, `selftest-board`, `selftest-phases`, `selftest-build`, `selftest-tiers`, `selftest-stopgate`, `selftest-roundtrip`, `selftest-pidfile`, `selftest-shutdown`, `selftest-autoport`, `smoke-mcp` |

The no-regression metric is the binding one: prompt trimming must not weaken the enforced gates.

## Constraints & assumptions

- **Compiled artifacts ship.** The plugin ships compiled `server/dist` and `ui/dist` so end users install with no build step. Any `core` change (e.g. `get_spec_slice`) requires a rebuild before commit.
- **Route on aliases, never pinned dated model ids.** New model generations must need no plugin update; unknown/unavailable alias ⇒ omit `model:` (inherit session default), never error.
- **`effort` is frontmatter-only** — this constrains Q1's option (a) to agent-file triplication.
- **`Task` → `Agent`** is a rename with a working alias, so migration is cosmetic-priority, not urgent.
- **Assumption:** the audit's findings are current as of 2026-08-03 against the shipped Claude Code contract; a version bump before Architecture would warrant a re-check of the `effort` per-invocation limitation specifically.
- **Assumption:** no end user has forked or overridden the prompt files, so trimming has no downstream compatibility surface.

## Risks

**Over-trimming is the primary risk.** Several verbose passages encode genuinely load-bearing invariants:

- single-phase features never get a `final` walkthrough;
- `clear_active_build` must not clear on a mid-phase stop;
- the Superpowers / R3-reviewer de-dup boundary.

The audit's claim is that these are stated **redundantly, not wrongly**. Losing one is a real regression. Mitigation: the Plan must specify **per-rule verification, not bulk deletion** — each removal traced to either a `core` enforcement point or a surviving single statement.

## High-level user flows

Nothing user-facing changes. The flows affected are internal dispatch paths:

- **Drafting a stage** (`/specmanager-prd|-architecture|-design|-plan|-walkthrough`) — same human-visible steps; the redundant `sync_claude_md` call disappears, and the shared preamble is either shrunk or relocated per Q3.
- **Building a phase** (`/specmanager-build`) — same phase-boundary semantics; spec-slice assembly becomes a `get_spec_slice` call instead of prose the model re-derives; tier dispatch changes shape or disappears per Q1.
- **Reviewing** — same pass/fail verdict contract; whether a `dimension` parameter appears depends on Q4.

## Open questions

The user has **not** chosen on any of these. Architecture stage resolves them.

### Q1 — Tier dispatch

| Option | Description |
|---|---|
| (a) | Replace model-tiering with effort-tiering via three builder variants |
| (b) | Re-map the model table |
| (c) | Drop tier dispatch entirely — delete `core/tiers.ts`, build step 6b, step 7's alias resolution, `builder.md`'s R2 note, `selftest-tiers` |
| (d) | Keep dispatch but move the tier table from build step 6b's per-session `AskUserQuestion` into `plugin.json` `userConfig` alongside `board_port` |

*Audit recommendation: **(c)**.* A meaningful share of the build command's machinery (R=2 retry, N=3 cap, reviewer-fail escalation "one R2 tier higher") is scaffolding around the risk that a cheap tier botched a card — and the better dial (`effort`) can't be bought at per-invocation granularity without triplicating the most-edited agent file. **Revisit (a) if per-invocation `effort` ships.**

### Q2 — Skill integration prose

Options: (a) compress all three blocks to one line each; (b) remove entirely; (c) keep as-is; (d) compress Context7 only.

*Audit recommendation: **(a)**, preserving the Superpowers/reviewer de-dup line.*

### Q3 — Command shape

Options: (a) keep 5 commands, shrink each; (b) collapse to one `/specmanager-draft <stage>`; (c) leave alone; (d) move the shared preamble into a `prepare_stage_draft({ featureId, stage })` MCP tool.

*Audit recommendation: **(a)**.* The duplicated material is orchestration **with a human in the loop** — prd step 3 asks the user about an existing draft, design step 5 harvests attachment paths from conversation context, walkthrough step 3 short-circuits single-phase `final` — none of which moves into a tool cleanly.

### Q4 — Reviewer consolidation

Options: (a) one reviewer with a `dimension` parameter; (b) separate agents per dimension; (c) defer; (d) reuse the built-in `/security-review` and `/code-review` skills.

*Audit recommendation: **(a)**, but recorded as a constraint in the two queued PRDs rather than refactored now* — refactoring a shipped agent to accommodate PRD-stage features pre-empts the lifecycle. **(d) is a poor fit:** those skills review a working diff and return prose, whereas the build command branches on a structured verdict against an assembled spec slice.

### Q5 — Stop-gate probe branch

R7 identifies `probe_test_command` as near-dead but does not settle whether to delete it (clean) or keep it as a compatibility path for phases planned before the mandatory-`testCommand` rule. The gate's *design* stays untouched either way; only the dead branch is in question.
