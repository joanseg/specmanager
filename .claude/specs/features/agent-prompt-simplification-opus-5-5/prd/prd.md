---
id: prd-agent-prompt-simplification-opus-5-5-044
featureId: feat-agent-prompt-simplification-opus-5-5
stage: prd
status: approved
stale: false
title: Agent prompt simplification (Opus 5.5) PRD
dependsOn: []
basedOn: {}
generatedBy: agent
version: 2
createdAt: '2026-10-20T13:45:16.868Z'
updatedAt: '2026-10-20T14:02:44.552Z'
---
## Problem

SpecManager's prompt surface was last trimmed by `feat-opus-5-readiness` (`prd-opus-5-readiness-036`, roll-up `wt-opus-5-readiness-022`), which targeted Opus 5. The model is now **Opus 5.5**, and the surface has **grown back** since that trim:

| Surface | Post-readiness trim (`wt-opus-5-readiness-022` §4) | Now (2026-10-20, `wc -w`, branch `feat/planner-rewrite`) |
|---|---|---|
| `agents/` (7 files) | 6,678 | **7,673** |
| `commands/` | 5,785 (9 files) | **8,209** (10 files; `specmanager-loop.md` added) |
| `commands/specmanager-build.md` | 2,025 | **2,683** |
| `Don't`/`Never` bullets, all files | 62 | **70** |

Much of this prose spells out behaviour Opus 5.5 does by default (thoroughness, self-checking, structured output, reading before writing) or states the same rule in several files. Every redundant word is paid per dispatch (per-task builder dispatch reloads `builder.md` once per card) and in drift (a rule stated N times must be edited N times).

The ask: **a simpler plugin that works the same or better** — conservative, low-risk changes only.

## Baseline (per-file word counts, measured 2026-10-20)

| File | Words | File | Words |
|---|---|---|---|
| `agents/planner.md` | 1,905 | `commands/specmanager-build.md` | 2,683 |
| `agents/walkthrough-writer.md` | 1,508 | `commands/specmanager-loop.md` | 1,501 |
| `agents/designer.md` | 1,195 | `commands/specmanager-interview.md` | 1,031 |
| `agents/builder.md` | 1,173 | `commands/specmanager-init.md` | 884 |
| `agents/architect.md` | 892 | `commands/specmanager-plan.md` | 633 |
| `agents/reviewer.md` | 552 | `commands/specmanager-walkthrough.md` | 459 |
| `agents/prd-writer.md` | 448 | `commands/specmanager-design.md` | 416 |
| `docs/agent-snippets/lossless-carryover.md` | 193 | `commands/specmanager-prd.md` | 304 |
| `docs/agent-snippets/design-grounding.md` | 173 | `commands/specmanager-architecture.md` | 188 |
| | | `commands/specmanager-board.md` | 110 |

Total 16,248 words (agents 7,673 · commands 8,209 · snippets 366). Other facts at baseline: `Task(` still appears on 6 lines; the "Density contract" block remains in 4 agents (architect, planner, prd-writer, walkthrough-writer); no agent sets `effort`; `reviewer.md` pins `model: opus`, all others `model: inherit`; `selftest-prompts.ts` is 966 lines with 40 distinct `INV-*` ids. The Plan re-pins the baseline at a commit sha before any edit (lesson from `wt-opus-5-readiness-022` §4, whose PRD baseline had drifted).

## Users

| User | Job-to-be-done | Pain today |
|---|---|---|
| **Maintainer (primary, dogfooding)** | Change one rule in one place; read a prompt and see what is load-bearing | Rules restated across files; prose written for weaker models hides the real constraints |
| **SpecManager end users** | Run the lifecycle cheaply and reliably | Pay tokens for dead prose on every dispatch |
| **The agents themselves (Opus 5.5)** | Follow the few rules that matter | Over-specified procedure competes with judgement and can over-trigger caution |

## Goals

1. **G1 — Trim redundancy, keep every rule.** Remove (a) prose describing behaviour Opus 5.5 does by default and (b) rules duplicated within or across files. Every enforced behaviour and every `selftest-prompts` invariant keeps at least one carrier.
2. **G2 — Review frontmatter** of all 7 agents (`model`, `tools`/`disallowedTools`, `effort`, description) against the current Claude Code contract; change only with stated evidence.
3. **G3 — Keep `docs/agent-snippets/` in parity** — any edited fragment is updated in every carrier in the same commit (repo rule; `selftest-prompts` enforces).
4. **G4 — Same or better outputs**, demonstrated by a before/after dogfood run.

## Non-goals

- **No lifecycle/gate change.** Gates, staleness, phases, walkthrough semantics, the loop's approval rights (only `/specmanager-loop` approves; INV-25, INV-42), Stop-gate behaviour — unchanged.
- **No merging, removing or renaming** of any command or agent file (10 commands, 7 agents stay).
- **No `server/` or `core/` code changes** beyond updating `selftest-prompts` patterns to match moved/trimmed text. No `ui/` change.
- **No overlap with `feat-specmanager-simplification-cleanup`** (`prd-specmanager-simplification-cleanup-039`, Plan draft, 11 todo tasks). It owns: tier-dispatch removal (R1: `core/tiers.ts`, build step 6b, builder model paragraph, INV-6/7/21), the `selftest-prompts` redesign (optional `max`, 42 → ~14 rows, carrier-sensitivity pass removal), the de-dup of three `core`-enforced rules to one carrier each (artifact-on-done, version conflict, complexity ≤3), deleting abandoned `docs/` measurement files, `docs/temp/original-specs/`, and the `opus-5-readiness`/`dummy-feature` dirs. This feature references that scope, never duplicates it.
- **Not re-proposing done work** from `feat-opus-5-readiness`: R1 (dead `sync_claude_md` steps), R2 (reviewer double-pin at dispatch), R3 (density block → two sentences + `lossless-carryover` snippet), R4, R5 (`build.md` rule de-dup), R6 (`get_spec_slice`), R8 (design-grounding fix), R9, Q2 (skill-integration prose compressed), Q3 (five drafting commands shrunk, branchy steps kept verbatim). Only **regrowth** since those landed is in scope.
- **No change to the shape of generated docs** (PRD/Architecture/Plan/Walkthrough outputs).
- **No work on `main`** — 1.0.3 is under directory review; work stays on a branch.

## Success metrics

| Metric | Target | Binding? |
|---|---|---|
| All self-tests pass (`selftest-directory`, `selftest-prompts`, and every other suite) + `claude plugin validate plugins/specmanager` | Green | **Yes (hard gate)** |
| Before/after headless dogfood run on a scratch feature (same intent, PRD → Plan via `/specmanager-loop`, plus one build phase) | After-run outputs judged same-or-better: every gate honoured, docs carry the required sections, task records valid, no rule violated | **Yes (hard gate)** |
| Every rule removed from a site is traced to a surviving carrier or a `core` enforcement point | 100% of removals in a traceability table | **Yes** |
| Total prompt words (agents + commands + snippets) | Reduction vs 16,248 baseline; numeric target set at Architecture | No — directional |
| `Don't`/`Never` bullets | Reduction vs 70 | No — directional |

Per `wt-opus-5-readiness-022` §4: word targets are never binding; a floor-blocked target is adjusted, not over-cut.

## Constraints & assumptions

- **Conservative by mandate.** Trim only; when unsure whether prose is load-bearing, keep it.
- **`selftest-prompts` pins exact min/max counts** — an edit can fail by adding or removing a line. `min` failure ⇒ restore the statement, never lower the floor (`wt-opus-5-readiness-022` §2). `specmanager-build.md` is already at INV-4's max (`--bulk`) and INV-2's max (`clear_active_build`).
- **Known load-bearing invariants** that must survive (from `prd-opus-5-readiness-036` Risks + repo CLAUDE.md): single-phase features never get a `final` walkthrough; `clear_active_build` must not clear on a mid-phase stop; Superpowers / reviewer de-dup boundary; "Don't approve" in every agent and stage command; interview runs in main session; loop never dispatches the builder; `NEEDS_HUMAN` pauses without spending a retry; builders never switch branches or push; aliases not dated model ids.
- **Rebuild + release rules** apply if `plugins/specmanager/` changes are released: version bump, rebuild `dist/`, `selftest-directory`, `claude plugin validate` (repo CLAUDE.md "Releasing"). A packaging change (e.g. frontmatter is not packaging, `plugin.json` beyond version is) triggers the surface test.
- **Assumption:** sequencing with `feat-specmanager-simplification-cleanup` — since both edit `commands/specmanager-build.md`, `agents/builder.md` and `selftest-prompts.ts`, this feature's Build runs **after** cleanup's Build lands (or Architecture decides otherwise). See Q1.
- **Assumption:** branch base is the current stack (`feat/planner-rewrite`, 1.2.0), not `main`.
- **Assumption:** no end user has forked the prompt files, so there is no compatibility surface.
- **Assumption:** the dogfood comparison is a checklist over captured outputs, since model output is non-deterministic. The builder fills it; the maintainer reviews it in the phase walkthrough (owner, end questions).

## High-level user flows

Nothing user-facing changes; affected flows are internal:

- **Drafting a stage** (`/specmanager-prd|-architecture|-design|-plan|-walkthrough`, `/specmanager-loop`) — same steps and gates; shorter agent prompts.
- **Building a phase** (`/specmanager-build`) — same phase-boundary, Stop-gate, reviewer and git-strategy semantics; shorter command and builder prompt.
- **Validation flow (maintainer)** — pin baseline sha → capture "before" dogfood run → trim file-by-file with selftests green after each file → capture "after" run → compare against checklist.

## Open questions

- **Q1 — Ordering vs `feat-specmanager-simplification-cleanup`.** *Resolved (owner): cleanup's Build lands first; this feature rebases onto it.* Build after its 11 tasks land (assumed), or interleave? Its `selftest-prompts` redesign changes which invariants carry rules here.
- **Q2 — `effort` frontmatter.** Set `effort` per agent (e.g. lower for prd-writer, higher for planner/reviewer), or leave all to inherit? Conservative default: leave unset unless the dogfood run shows a benefit. `effort` is frontmatter-only (`prd-opus-5-readiness-036` Platform changes).
- **Q3 — Reviewer `model: opus` pin.** Keep, or switch to `inherit` like the other six agents? Conservative default: keep.
- **Q4 — `Task(` → `Agent(` rename** (6 lines remain; deferred in `wt-opus-5-readiness-022` §5 item 4). In scope here as cosmetic, or leave?
- **Q5 — Which `Don't` lists to target.** The four agent files untouched by the readiness trim (`wt-opus-5-readiness-022` §5 item 9) plus regrowth in `build.md` (12 bullets, cap was 10)?
- **Q6 — Dogfood harness.** Exact scratch intent, which stages to capture, and how outputs are compared (checklist owner = maintainer).
- **Q7 — Regrowth cause.** `build.md` (+658 words) and `planner.md` grew via later features (git strategy, planner rewrite, prerequisites, loop). Architecture should confirm the new prose is redundant rather than newly load-bearing before trimming it.
- **Q8 — Release.** *Resolved (owner): fold into the next release on the stack; patch bump 1.2.0 → 1.2.1 only if it ships alone. Never `main`.*
