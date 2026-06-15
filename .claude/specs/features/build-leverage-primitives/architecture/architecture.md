---
id: arch-build-leverage-primitives-016
featureId: feat-build-leverage-primitives
stage: architecture
status: approved
stale: false
title: Build leverage primitives architecture
dependsOn:
  - prd-build-leverage-primitives-024
basedOn:
  prd-build-leverage-primitives-024: 9
generatedBy: human
version: 5
createdAt: '2026-06-15T10:42:06.430Z'
updatedAt: '2026-06-15T12:09:05.638Z'
---
## Summary

Six independent build-time leverage primitives (R1–R6 of `prd-build-leverage-primitives-024`) bolted onto the _existing_ SpecManager plugin with minimal new machinery. Cleanly split by where they live: **R1** is a new pure-bash `Stop` hook + small deterministic core helpers; **R2** is per-session tier→model selection wired into `/specmanager-build` + the builder's `Task` dispatch; **R3** is a new read-only `reviewer` subagent the build command invokes between gate-pass and card-advance, fed a parent-assembled spec slice — enabled by two bounded upstream edits: stable named section anchors in `architect.md` (AC2a) and a per-phase `meta.architectureRefs` field emitted by `planner.md` (AC2b); **R4/R5/R6** are instruction-level detect-then-defer wiring inside the `builder`, `designer`, and `architect` agent prompts respectively (R5 also adds one small core merge helper + a new MCP write tool so synthesized tokens bootstrap back into `docs/DESIGN.md`). Every change honors the load-bearing invariants: deterministic gate logic stays in bash/core (R1), only the parent writes (R3 reviewer is read-only; R5 bootstrap-back goes through an MCP tool the parent calls), and the `docs/DESIGN.md` managed-marker line-anchored merge is reused unchanged (R5).

## Where each requirement lives (repo layout)

| Req | Kind                                    | Files touched / added                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | hook script + core helpers + planner    | **new** `plugins/specmanager/hooks/stop-gate.sh`; edit `plugins/specmanager/hooks/hooks.json`; **new** `plugins/specmanager/server/src/core/active-card.ts` + MCP tool `resolve_active_card`; edit `commands/specmanager-build.md` (publish gate context); edit `plugins/specmanager/agents/planner.md` (+ `commands/specmanager-plan.md` if relevant) — populate `meta.testCommand` per phase + the none-marker (AC5; bounded to that field) |
| R2  | tier selection (prompt + thin core map) | edit `commands/specmanager-build.md` (AskUserQuestion + pass tier per task to builder `Task`); edit `agents/builder.md`; **new** `plugins/specmanager/server/src/core/tiers.ts` (default complexity→tier→alias table, exported helper)                                                                                                                                                                                                        |
| R3  | new read-only subagent + 2 upstream-structure edits | **new** `plugins/specmanager/agents/reviewer.md`; edit `commands/specmanager-build.md` (parent assembles spec slice, invoke after R1 pass, before advance); edit `plugins/specmanager/agents/architect.md` (stable named section anchors — AC2a); edit `plugins/specmanager/agents/planner.md` (+ `commands/specmanager-plan.md` if relevant) — emit per-phase `meta.architectureRefs` (AC2b; bounded to that field). **`planner.md` is now touched by BOTH R1 (`meta.testCommand`) and R3 (`meta.architectureRefs`).** |
| R4  | prompt wiring                           | edit `agents/builder.md` (and one shared detect-then-defer line referenced by R5)                                                                                                                                                                                                                                                                                                                                                             |
| R5  | prompt wiring + core merge + MCP tool   | edit `agents/designer.md`, `agents/builder.md`; **new** core helper in `server/src/core/design-md.ts` (`mergeSynthesizedTokens`) + **new** MCP tool `bootstrap_design_tokens`; edit `commands/specmanager-design.md`                                                                                                                                                                                                                          |
| R6  | prompt wiring                           | edit `agents/architect.md`                                                                                                                                                                                                                                                                                                                                                                                                                    |

No change to `.mcp.json` (R6 AC3: no bundled MCP server). No new board chip, command, or artifact (R5 AC1).

---

## R1 — Stop-hook exit gate

### Components

- **`hooks/stop-gate.sh`** (new, pure bash): the `Stop` hook body. Reads the Claude Stop-hook JSON from stdin, resolves the active card + its test command + acceptance criteria, runs the tests, parses criteria, and signals via exit code. Zero model calls (AC3).

- **`hooks/hooks.json`** (edit): add a `Stop` entry alongside existing `SessionStart`/`FileChanged`, invoking `bash "${CLAUDE_PLUGIN_ROOT}/hooks/stop-gate.sh"`.

- **`server/src/core/active-card.ts`** (new) + MCP tool **`resolve_active_card`**: deterministic active-phase/task + verification-target resolution, reused by the hook so the discovery logic lives in core, not bash heuristics.

### How the hook discovers the active card + test command (PRD AC5 — decided)

The hook must work across _target_ projects with zero per-project config. **Primary source is the per-phase** **`meta.testCommand`** **the planner emits** (AC5); convention-probing is fallback only, for the case where the field is somehow missing. Resolution, deterministic, in this order:

1. **Project root** from `$CLAUDE_PROJECT_DIR` (the hook's env; the MCP server already resolves `SPECMANAGER_PROJECT_DIR ?? CLAUDE_PROJECT_DIR` — `paths.ts:projectRoot`). Never assume cwd.
1. **Active feature + phase** via `resolve_active_card`, which wraps `getNextPhase` (`core/phases.ts` — first phase whose status ≠ `done`/`empty`) over the feature whose plan has open tasks. The builder runs one phase and stops at its boundary (AC4), so the active verification target = the active phase's tasks + that phase's `meta.testCommand`.
1. **Test command — read the active phase's** **`meta.testCommand`** **first** (see Data model). Three cases:

   - a **runnable command string** → run it; its exit code is the test result.

   - the **explicit none/manual marker** (`meta.testCommand: "none"`) → the phase has no automated test by design; **skip the test run and verify acceptance criteria only** (all phase tasks `done` with artifacts). Do **not** treat the none-marker as a failure.

   - **field absent** (a plan that predates AC5, or a planner gap) → **fall back** to the old discovery ladder: the phase's `**Exit test:**` line in `plan.md` if it is a runnable shell command, else a repo-level convention probe — `package.json` `scripts.test` → `npm test`; `pyproject.toml`/`uv` → `uv run pytest`; `Cargo.toml` → `cargo test` (mirrors the language detection `architect.md` already does). If the fallback also resolves nothing, the gate **passes** (exit 0) rather than blocking — never invent a failure — recording "no test command discovered" to stderr-context for the builder. (Absence-of-command is never a failure; only a present command exiting non-zero, or unmet criteria, fails the gate.)

### Acceptance criteria parsing (AC1)

Criteria are the phase **exit test** line + any task done-conditions. Today `tasks.json` carries no `acceptanceCriteria` field (only `title/phase/complexity/dependsOn/artifacts` — `core/types.ts`); the deterministic criteria the hook can check are: (a) the resolved `meta.testCommand` exits 0 when it is a runnable command (skipped when the marker is `"none"`), (b) every task in the active phase is `status: "done"` with artifacts (the `MissingArtifactError` discipline already guarantees a commit/file ref). On failure → **exit 2** with actionable stderr (`tests failing: <last N lines>` / `phase <name> has tasks not done: <ids>`); stderr is the only channel back to Claude (AC1).

### Iteration cap (AC2; PRD open questions 2 & 3)

- Cap **N = 3** (PRD-confirmed default).

- Temp file **scoped per-feature-phase**, keyed `${feature-slug}__${phase}`, under a project-local dir `.claude/specs/.cache/stop-gate/` (PRD answer: "maybe per project, architect to review" → resolved to per-feature-phase under the project cache so two concurrent features/phases don't share a counter). Rationale: the builder works one phase to its boundary; the retry budget belongs to that phase's gate, and resets when the phase changes.

- **Reset** when: the resolved active phase key changes (new phase ⇒ fresh budget), or the gate passes (exit 0 deletes the counter). A stale counter from an abandoned phase is harmless — it's keyed and reset on next entry.

- On the Nth failure: write `blocked: <reason>` so the card surfaces **blocked** on the board, then **exit 0** (stop allowed — no infinite loop). "Blocked" is recorded via `resolve_active_card`'s companion write path rather than free-text into `plan.md`: the hook calls the MCP `update_task` is not available to a bash hook, so the hook writes a marker the build command reads (see Sequence) — _and_ appends a one-line `blocked:` note to the phase's `tasks.json` meta so the board badge logic (a thin UI/board-server read) can color it. **Open question** flagged below: exact board surfacing of `blocked` (no `blocked` value exists in `TASK_STATUS` today).

### Interfaces (R1)

```
// core/active-card.ts
resolveActiveCard(root?): Promise<{
  featureId: string; slug: string; phase: string;
  testCommand: string | null;   // active phase's meta.testCommand: command | "none" | null(absent→fallback)
  exitTest: string | null;       // plan.md **Exit test:** line, fallback only
  openTaskIds: string[];
} | null>            // null = nothing in flight → gate is a no-op pass
```

MCP tool `resolve_active_card({})` → returns the same shape (so the bash hook gets it via a one-shot `node dist/...` call or a tiny CLI shim; keeps discovery in TS/core, not bash).

---

## R2 — Route model by Fibonacci complexity → tier → alias

### Components

- **`server/src/core/tiers.ts`** (new): the canonical default table and a pure helper. No persistence — selection is per-session (AC3), so the _table_ is a constant and the _active mapping_ is held in the build command's session state and passed into each builder `Task`.

- **`commands/specmanager-build.md`** (edit): at build start, `AskUserQuestion` to confirm/remap tier→alias for the session (AC3), AC1 defaults pre-filled. Per task, read `complexity`, map via the session table, pass the resolved alias to the builder's `Task` invocation.

- **`agents/builder.md`** (edit): document that the per-task model is supplied by the parent; the builder itself stays `model: inherit` as a frontmatter default (AC4 fallback).

### Mapping (AC1, AC2, AC4)

```
// core/tiers.ts
type Tier = "cheap" | "standard" | "strong";
DEFAULT_COMPLEXITY_TO_TIER:  1→cheap, 2→standard, 3→strong, (>3 / null)→strong   // AC1
DEFAULT_TIER_TO_ALIAS:       cheap→"haiku", standard→"sonnet", strong→"opus"      // AC2 — aliases, never dated ids
tierForComplexity(c): Tier
aliasForTier(tier, sessionTable): string   // sessionTable overrides defaults
```

- Tiers map to Claude Code **aliases** (`haiku`/`sonnet`/`opus`), never pinned dated ids, so a model version change in a tier is automatic and add/remove is a config edit (AC2).

- **Where the model is selected given the builder is a subagent:** the _parent_ (`/specmanager-build`) is the only place that can set a subagent's model per dispatch. It selects the alias per task from `complexity` and passes it in the `Task(subagent_type:"builder", model:<alias>, …)` call. The builder frontmatter stays `model: inherit` (AC4 graceful default: no score / unknown tier / unavailable alias → omit override → session default). This is the first place SpecManager selects a model — today everything is `inherit` (`agents/*.md`).

- Since R2's builder runs per-phase (not per-task) today, the parent picks the alias for the **phase** as `max(tier of its tasks)` when dispatching one builder for the phase, OR dispatches per-task if the plan benefits — see Open questions.

---

## R3 — Spec-compliance reviewer agent

### Components

- **`agents/reviewer.md`** (new): read-only subagent. Frontmatter `tools:` limited to `Read, Glob, Grep, Bash` (for `git diff`) — **no** **`Write`/`Edit`/`update_task`** and **no Architecture-doc read tools** (it receives the assembled slice as input rather than reading the whole Architecture doc; AC1, AC2 — no-permission-prompt model). Frontmatter pins the strong tier (AC6); but since alias is set per-dispatch, the _parent_ always invokes the reviewer with `model:<strong alias>` regardless of the card's build tier.

- **`commands/specmanager-build.md`** (edit): after R1 gate passes (exit 0) and before advancing the card, the parent **assembles the spec slice** (below) and passes it to the reviewer; branch on its verdict.

- **`agents/architect.md`** (edit, AC2a — in scope, bounded to section-anchoring): the architect must write the Architecture with **stable, named, addressable section anchors** (one per requirement R1, R2, … or per component) so any section can be referenced by name. Formalizes structure the architect already produces.

- **`agents/planner.md`** (+ `commands/specmanager-plan.md` if relevant) (edit, AC2b — bounded to that one field, exactly like `meta.testCommand`): emit a per-phase **`meta.architectureRefs`** — the named Architecture anchor(s) that phase implements.

### Spec-slice contract (AC2 — decided)

The reviewer's compliance contract is a **deterministic slice the parent assembles** from three sources (the reviewer does **not** read the whole Architecture doc — it stays focused and read-only):

> **slice = the phase's `plan.md` section + its task titles/notes (from `tasks.json`) + the Architecture section(s) named in the phase's `meta.architectureRefs`**

- **Primary:** `meta.architectureRefs` (per-phase) names the Architecture anchor(s); the parent resolves each anchor to its section text and concatenates with the phase's `plan.md` section + task titles/notes.
- **Fallback** (when `meta.architectureRefs` is absent): match by the requirement id/name shared between the plan phase and the Architecture heading (e.g. a phase named/tagged `R3` → the `R3` section). Primary-then-fallback, the **same shape as R1's `meta.testCommand`** discovery (R1/AC5).
- Composes with AC5/AC6 (below) and runs as the parent step **after the R1 Stop hook exits 0** (see "Where R3 runs relative to R1").

### Architecture section-anchor scheme (resolves AC2a + the open-question representation sub-point)

**Anchor = the requirement id** (`R1`, `R2`, …) for requirement-scoped sections, or a **kebab-slug of the section heading** for component-scoped sections (e.g. `core-active-card`). `meta.architectureRefs` stores that anchor string (an array, since a phase may implement parts of several requirements). The architect writes each requirement/component section under a stable heading whose leading token is the anchor (this doc already does — `## R3 — …`, `## R1 — …`), so the slug derives deterministically from the heading and resolution is unambiguous. The parent resolves an anchor by locating the heading whose id-token (or kebab-slug) equals the ref, and slicing to the next same-level heading.

### Output (AC3, AC4)

- **Output (AC3):** structured verdict `{ verdict: "pass" | "fail", reasons: string[] }`. The **parent decides advancement** — the reviewer never writes.

- **Escalate-on-failure (AC5):** on `fail`, the parent re-dispatches the _fix_ one R2 tier higher than the card's current build tier (cheap→standard→strong, capped at strong). This is the same retry budget as R1 (AC5: "bounded by R1's max-iteration cap … no second independent loop") — the reviewer-driven re-dispatch counts against the same N=3 phase counter; repeated fails even at strong surface the card as **blocked**.

- **Two-stage seam (AC4):** spec-compliance is stage one; a future code-quality reviewer slots in as stage two without changing this contract.

### Where R3 runs relative to R1 (PRD open question 4 — resolved)

**Separate parent-invoked step after the Stop hook exits 0**, not inside the hook loop. Rationale: the Stop hook is pure bash / zero model calls (R1 AC3) and a subagent dispatch is a model call — putting the reviewer inside the hook would violate AC3 and the hook's deterministic contract. So: R1 hook (bash, deterministic) gates _stopping_; once stopped clean, the parent build command invokes the R3 reviewer (semantic) before advancing the board card. Both share the one iteration cap.

---

## R4 — Superpowers TDD / review wiring

Instruction-level only, in **`agents/builder.md`** (and possibly a line in `commands/specmanager-build.md`). No server/core code, no vendoring (AC4).

- **Detect-then-defer (AC1):** same detection pattern used elsewhere — check whether the Superpowers skills are installed/available in-session; if present, defer to its TDD (red→green→refactor), systematic-debugging (root-cause-before-fix), and two-stage review skills, feeding each the task's spec section as the compliance contract.

- **Graceful degradation (AC2):** absent → the builder's current plain execution loop runs unchanged, no error.

- **De-dup line (AC3):** one instruction — _"if Superpowers is installed, defer to its skills and skip the built-in equivalents"_ — shared with R5's frontend-design wiring so the two skill sets never double-trigger. Note this composes with R3: Superpowers' two-stage review is execution-discipline inside the build; R3's reviewer is the parent's pre-advance gate. They are complementary, not duplicate (the de-dup line scopes Superpowers to _in-build_ discipline).

- **Scope guard (AC4):** execution-discipline skills only — never brainstorming/planning (SpecManager owns the "what").

---

## R5 — `frontend-design` skill wiring + new-project robustness

### Components

- **`agents/designer.md`** (edit): detect-then-defer to the `frontend-design` skill, grounded in `docs/DESIGN.md` tokens; add the 3-tier distilled fallback, grounding ladder, optional-example prompt, and bootstrap-back instruction.

- **`agents/builder.md`** (edit): UI-touching build tasks do the same detect-then-defer (AC2), colors/type still tracing to `docs/DESIGN.md`.

- **`commands/specmanager-design.md`** (edit): note the optional design-reference invitation (reuses the existing screenshot-attachment path, AC7).

- **`server/src/core/design-md.ts`** (edit, new helper `mergeSynthesizedTokens`) + **new MCP tool** **`bootstrap_design_tokens`**: the only write path for AC8 (only the parent writes; the read-only-ish designer persists synthesized tokens through this tool, mirroring how it already persists mockups only via `create_design_brief`).

### Behaviour (AC1–AC8)

- **No new surface (AC1):** no command, doc, artifact, or board chip — wiring inside the existing `/specmanager-design` stage + builder.

- **Detect-then-defer (AC2)** + **grounded in DESIGN.md (AC3):** skill applied _on top of_ tokens; it informs taste/composition, never overrides the token system.

- **Graceful degradation (AC4):** absent skill → designer's current self-contained behaviour, no error.

- **3-tier distilled fallback (AC5):** (1) real skill when installed; (2) always-present baked-in design-discipline method in `designer.md` (compact token system: 4–6 named colors, 2+ type roles, a layout concept, one signature element; self-critique for genericness before building — the designer already has a partial "avoid AI slop" version); (3) optionally suggest installing the official skill. **Do not vendor** the skill verbatim — encode the method only (license + drift).

- **Grounding ladder (AC6):** (1) real `docs/DESIGN.md` tokens when populated → (2) optional user-provided example/screenshot → (3) synthesize from scratch.

- **Optional example prompt (AC7):** when tokens are thin/placeholder, the designer invites an optional reference via the existing screenshot path — always optional, no error if omitted.

- **Bootstrap-back (AC8):** synthesized starter tokens are written back into `docs/DESIGN.md` via `bootstrap_design_tokens` so the durable source of truth is seeded rather than trapped in `mockups.html`.

### How synthesized tokens merge with the auto-inferred managed block (PRD open question 5 — resolved)

The managed block between `<!-- specmanager:design:start/end -->` is rewritten wholesale by `syncDesignMd` from a `UiDigest` scan; on a new project it holds **placeholder TODO tokens** (`primary: "#1A1C1E" # TODO`, etc. — `design-md.ts:yamlBlock`). Resolution: **fill only empty/placeholder fields; never clobber real values; respect the line-anchored marker merge.**

- `mergeSynthesizedTokens(existingManagedBlock, synthesized)` parses the YAML frontmatter inside the managed block and overlays synthesized values **only where the existing value is a placeholder/TODO or absent** (detected by the `# TODO` comment or the known default sentinels). Real harvested CSS-var colors are left untouched.

- It rewrites **only the region between the markers** (reusing the exact `START`/`END` literals and slice logic already in `design-md.ts:syncDesignMd`), so native/hand-written content outside the markers is never touched — same invariant as `claude-md.ts`.

- Ordering against the auto-refresh: `bootstrap_design_tokens` merges into the _current on-disk_ managed block; a later `syncDesignMd` refresh (e.g. on `feature.shipped`) re-scans UI sources — by then the bootstrapped tokens may also exist as real CSS vars, and the harvest path takes over. The merge is therefore "seed the placeholder once," not an authority fight.

### Interfaces (R5)

```
// core/design-md.ts
mergeSynthesizedTokens(root, synthesized: {
  colors?: Record<string,string>; typography?: ...; rounded?: ...;
  spacing?: ...; components?: ...;
}): Promise<SyncDesignMdResult>   // fills placeholders only, marker-anchored

// MCP tool
bootstrap_design_tokens({ tokens })  // parent/designer-invoked write path; emits design.synced
```

---

## R6 — Architect Context7 doc-lookup

Instruction-level only, in **`agents/architect.md`**. No `.mcp.json` change (AC3: no bundled server, no forced API-key step).

- **On-demand, architect-only (AC1):** lookup fires only while drafting Architecture and only on an unfamiliar/version-sensitive library. Not wired into PRD/design/plan/build.

- **Detect-then-use ladder (AC2):** prefer Context7 **MCP tools** if already in-session (`resolve-library-id` / `query-docs`); else **curl the Context7 REST API on demand** (no persistent MCP overhead).

- **Graceful degradation (AC4):** lookup fails / returns nothing / needs an unconfigured key → architect _suggests installing Context7 and proceeds without it_; never blocks or delays the draft.

- **Grounded use (AC5):** when fetched docs inform a decision, note the library/version consulted so the choice is traceable (supports the repo "latest APIs" value).

---

## Data model changes

- **`tasks.json`** **`meta.testCommand`** **(R1, AC5):** a **per-phase** test command the planner emits for **every** phase, read by the R1 hook as its **primary** source. `TasksFileSchema` (`core/types.ts`) is today a flat `{ tasks: Task[] }`; add a `meta.phases` map keyed by phase name: `meta: z.object({ phases: z.record(z.object({ testCommand: z.string() })).default({}) }).optional()`. The string is either a **runnable shell command** or the literal **`"none"`** none/manual marker (intentionally test-less phase — distinguished from a missing field, which means "planner didn't declare one"). The gate interprets: command ⇒ run it; `"none"` ⇒ skip the run, verify criteria only; **absent** ⇒ fall back to the convention probe (back-compat for pre-AC5 plans). Migration: none — Zod defaults tolerate absent `meta`; `resolve_active_card` returns `testCommand` from the active phase's entry. **Planner change (in scope, bounded):** `planner.md` (and `commands/specmanager-plan.md` if relevant) must populate `meta.phases[<phase>].testCommand` for every phase it emits — a real command where the phase has an automated test, the `"none"` marker for prompt-wiring/manual phases — and nothing else about planner behaviour changes.

- **`tasks.json`** **`meta.architectureRefs`** **(R3, AC2b):** a **per-phase** array of Architecture anchors (see anchor scheme above) the phase implements, modeled **on the same `meta.phases[<phase>]` map** as `meta.testCommand`: extend that entry to `meta.phases[<phase>]: { testCommand: string; architectureRefs: string[] }` — i.e. `meta: z.object({ phases: z.record(z.object({ testCommand: z.string(), architectureRefs: z.array(z.string()).default([]) })).default({}) }).optional()`. The parent reads it to assemble the reviewer's spec slice (primary); **absent ⇒ name/id-match fallback** (match requirement id/name shared between plan phase and Architecture heading). Migration: **none** — Zod `.default([])` tolerates plans that predate AC2b, consistent with the `meta.testCommand` decision. **Planner change (in scope, bounded to that field):** `planner.md` populates `meta.phases[<phase>].architectureRefs` per phase; nothing else about planner behaviour changes.

- **`blocked`** **surfacing (R1 AC2):** `TASK_STATUS` is `todo|in_progress|done` only (`core/types.ts`) — there is **no** **`blocked`** **state**. R1 records blocked as a `tasks.json` meta note + a marker the build command reads, _not_ a new status value (avoids a board-wide status-enum migration). Whether `blocked` becomes a first-class status is an Open question.

- **No new doc stages, no** **`STAGE`/frontmatter changes.** R5 reuses the existing design stage and `create_design_brief`; bootstrap-back writes the `docs/DESIGN.md` managed block, not a spec doc.

- **R2:** no persisted model field on `Task` — tier selection is per-session in the build command and passed at dispatch; `complexity` (already on `Task`) is the sole input.

## Interfaces (new public surface, consolidated)

| Surface                                                    | Signature / shape                                                                                                                 | Req |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --- |
| `hooks/stop-gate.sh`                                       | `Stop` hook; stdin JSON → exit 0 (allow stop) / exit 2 (force continue, stderr steers)                                            | R1  |
| `resolve_active_card` (MCP) + `core/active-card.ts`        | `() → {featureId,slug,phase,testCommand,exitTest,openTaskIds} \| null` (testCommand = active phase's `meta.testCommand`, primary) | R1  |
| `core/tiers.ts`                                            | `tierForComplexity(c)`, `aliasForTier(tier, table)`, `DEFAULT_*` consts                                                           | R2  |
| `agents/reviewer.md`                                       | read-only subagent; input = parent-assembled spec slice (`plan.md` section + task titles/notes + `meta.architectureRefs` sections) → `{verdict, reasons[]}` | R3  |
| `bootstrap_design_tokens` (MCP) + `mergeSynthesizedTokens` | fill-placeholder, marker-anchored token merge into `docs/DESIGN.md`                                                               | R5  |

## Sequence / flow

**Build with gate (R1+R2+R3+R4):**

1. `/specmanager-build` → `AskUserQuestion` confirms session tier→alias table (R2 AC3, defaults pre-filled).
1. For the target phase, the command picks the alias from task `complexity` via `core/tiers.ts` and dispatches `Task(builder, model:<alias>)`.
1. Builder executes (R4: defers to Superpowers TDD/debug if installed, else plain loop), marks tasks `done` with artifacts, tries to stop.
1. **Stop hook** (`stop-gate.sh`, bash, zero model calls) resolves the active card via `resolve_active_card`, reads the active phase's `meta.testCommand` (primary): runnable command ⇒ run it; `"none"` ⇒ skip run, verify criteria only; absent ⇒ fall back to exit-test line / convention probe. Then checks all phase tasks `done`. Fail → exit 2 with actionable stderr; builder fixes; re-gate. Counter (keyed `slug__phase`, cap 3) increments each fail; at 3 → write `blocked`, exit 0.
1. Pass → exit 0. Parent **assembles the spec slice** (phase's `plan.md` section + task titles/notes + the Architecture section(s) named in `meta.architectureRefs`, name/id-match fallback if absent) and invokes **R3 reviewer** (strong alias) with that slice as input; verdict `pass` → advance card; `fail` → re-dispatch fix one tier higher (capped strong), counting against the same N=3 counter; persistent fail → `blocked`.

**UI design + build (R5):** `/specmanager-design` → designer reads `docs/DESIGN.md` tokens → grounding ladder (real tokens → optional example/screenshot → synthesize) → if `frontend-design` installed, apply on top for taste/composition (else 3-tier distilled fallback) → produce `mockups.html` via `create_design_brief`; if synthesized, `bootstrap_design_tokens` seeds `docs/DESIGN.md` placeholders. UI build tasks do the same detect-then-defer.

**Architecture draft with doc-lookup (R6):** `/specmanager-architecture` → architect drafts vs PRD + repo → hits unfamiliar/version-sensitive library → tries Context7 MCP tools, else curls REST → success: ground decision + note library/version; failure/unconfigured: suggest install + proceed. Draft completes either way.

## Failure & edge cases

| Case                                            | Handling                                                                             |
| ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| Hook can't resolve a test command (R1)          | gate passes (exit 0), records "no test command discovered" — never invents a failure |
| Nothing in flight when Stop fires (R1)          | `resolve_active_card` → `null` ⇒ hook is a no-op pass                                |
| Impossible task loops (R1 AC2)                  | N=3 cap → `blocked` + exit 0; no infinite loop                                       |
| Concurrent features/phases share a counter (R1) | counter keyed `slug__phase`; reset on phase change / pass                            |
| Unknown/unavailable alias or no score (R2 AC4)  | omit `model` override → `inherit`; never error/block                                 |
| Reviewer wrong verdict cost (R3 AC6)            | reviewer pinned to strong alias regardless of card tier                              |
| Reviewer repeated fail even at strong (R3 AC5)  | bounded by R1's N=3 — surfaces `blocked`, not a second loop                          |
| Reviewer missing `meta.architectureRefs` (R3 AC2) | parent falls back to name/id-match between plan phase and Architecture heading      |
| Superpowers + built-in double-trigger (R4 AC3)  | single de-dup instruction; shared with R5                                            |
| New project, only placeholder tokens (R5)       | 3-tier fallback synthesizes; `bootstrap_design_tokens` fills placeholders only       |
| Synthesized tokens vs auto-inferred block (R5)  | fill empty/TODO fields only; never clobber real harvested values; marker-anchored    |
| Context7 unavailable/unconfigured (R6 AC4)      | suggest install + proceed; no block, no delay                                        |

## Conventions used

- TS strict, `"type": "module"`, Node 20+, Zod schemas (`core/types.ts`); errors via thrown typed `Error` subclasses with a `code` (`SplitRequiredError`/`MissingArtifactError` pattern) for new core helpers.

- **Deterministic gate logic in bash/core, not prompts** — R1 hook is pure bash + `core/active-card.ts`; the model cannot bypass it (mirrors `checkGate` invariant).

- **Only the parent writes** — R3 reviewer is read-only (no `Write`/`Edit`/`update_task` in its `tools:`); R5 bootstrap-back goes through `bootstrap_design_tokens`, never raw `Write`.

- **Line-anchored managed-marker merge** reused verbatim for R5 (`design-md.ts` `START`/`END` slice logic) — content outside markers never clobbered.

- **Resolve project root from env** (`SPECMANAGER_PROJECT_DIR ?? CLAUDE_PROJECT_DIR`) in the hook and `active-card.ts` — never cwd.

- **Hook env vars** `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_PROJECT_DIR}` (already used by `SessionStart`/`.mcp.json`).

- **Detect-then-defer + graceful degradation** shared idiom across R4/R5/R6.

- **Model aliases, never dated ids** (R2) — `model: inherit` is the existing baseline across all `agents/*.md`.

- **Optimistic concurrency** preserved — R5's `bootstrap_design_tokens` and the `meta.testCommand`/`meta.architectureRefs` writes don't touch versioned spec docs (`write_document`'s base-version check is unaffected).

- Self-test convention: add `selftest-stopgate` / `selftest-tiers` style hand-rolled scripts to `server/` (matching `npm run selftest-*`), and validate with `claude plugin validate plugins/specmanager` after the `hooks.json` edit.

## Open questions / risks

1. **`blocked`** **as a first-class state.** `TASK_STATUS` has no `blocked` today. R1 surfaces blocked via a `tasks.json` meta note + build-command marker to avoid a board-wide enum migration. Should the planner introduce a real `blocked` status (board column/badge + `phases.ts` rollup change), or is the meta-note marker sufficient for v1? (Affects R1 AC2 board surfacing + R3 AC5.)\
   Answer: Should the planner introduce a real `blocked` status. Yes and the reason, and a suggestion to remediate.
1. **Builder dispatch granularity for R2.** The builder runs _one phase_ per dispatch (not per task), but tier is derived per-task `complexity`. Pick: dispatch one builder per phase at `max(tier of its tasks)`, or change the build command to dispatch per-task. Per-phase is simpler and matches the current model; per-task is cheaper but more orchestration. Plan should choose (default: per-phase max-tier for v1).\
   Answer:  per-task&#x20;
1. **Test-command declaration ergonomics — decided (PRD AC5).** The planner **always** emits `meta.testCommand` per phase (an explicit `"none"` marker for test-less phases), and the gate reads it as its **primary** source with the convention probe as fallback; `planner.md` (+ `commands/specmanager-plan.md` if relevant) is updated to populate it — in scope, bounded to that field. Remaining sub-point: exact field **placement** — proposed `tasks.json` `meta.phases[<phase>].testCommand` (see Data model); plan to confirm the keying matches how `phases.ts`/`get_next_phase` names phases.
1. **Iteration-cap counter location.** Resolved to `.claude/specs/.cache/stop-gate/${slug}__${phase}` (per-feature-phase under project cache). Confirm this dir is git-ignored in target projects (add to the `.claude/specs/` ignore guidance, or the planner adds it to `.gitignore`).\
   Answer: as prefered by architect.
1. **Context7 REST endpoint + auth (R6).** Confirm the current Context7 REST API shape and whether an API key is ever required for the curl path; AC4 already covers the unconfigured case, but the architect prompt needs the concrete curl invocation (resolve at plan/build time; verify with a Context7 docs lookup before wiring).\
   Answer: **Endpoint shape (v2).** Two GET endpoints, both on `context7.com/api/v2`:

   - Resolve a library ID: `https://context7.com/api/v2/libs/search?query=nextjs` [Pravinkumar](https://www.pravinkumar.co/blog/cerebras-ipo-b2b-saas-inference-2026)
   - Fetch docs context: `https://context7.com/api/v2/context?libraryId=/vercel/next.js&query=How to implement authentication with middleware` [Nimbalyst](https://nimbalyst.com/blog/claude-code-plugins-guide/)\
     The `libraryId` is the URL path of the library on context7.com — `/owner/repo` for GitHub, or `/<source>/<id>` for other sources, optionally suffixed with `/<version>` or `@<version>` to pin a version. So both forms work: `/vercel/next.js/v15.1.8` or `/vercel/next.js@v15.1.8`. There's also an optional flag that, when true, skips LLM reranking and returns top vector-search results directly — trading relevance for lower latency, useful if you want the architect's lookups fast. [Morph + 2](https://www.morphllm.com/cerebras-pricing)

     **On the API key — this is the important nuance for AC4.** The key is **not strictly required** for the curl path, but the docs are written as if it is, and the practical answer is "you want one."
     - The official API guide states flatly that all API requests require authentication via an API key in the `Authorization` header, and the API reference shows the same `Authorization: Bearer <token>` header. [Nimbalyst](https://nimbalyst.com/blog/claude-code-plugins-guide/)[Morph](https://www.morphllm.com/cerebras-pricing)
     - But the actual runtime behavior is softer: authentication is optional for public documentation; unauthenticated requests share a global anonymous pool of 60 requests/hour, and a key gives you a dedicated quota, and Upstash maintainers confirm Context7 works without an API key. The free tier works without a key subject to rate limits; a free key from context7.com/dashboard raises them. [ClaudePluginHub + 2](https://www.claudepluginhub.com/blog/mcp-server-plugins-for-claude-code)
     So: keyless curl works for public libraries, but you're sharing a **60 req/hr global anonymous pool** — meaning your users compete with the entire internet's unauthenticated traffic, and a build phase that resolves several libraries can intermittently 429 through no fault of the user. That's exactly the failure mode AC4's unconfigured-case handling needs to tolerate gracefully (treat a 429 the same as "not configured" → fall back to training-data + the install suggestion).

     Key format if you do support one: `ctx7sk-<random>` (the secret-key prefix), revocable from the dashboard. [ClaudePluginHub](https://www.claudepluginhub.com/blog/mcp-server-plugins-for-claude-code)
1. **Reviewer spec-slice extraction (R3 AC2) — resolved.** Slice = the phase's `plan.md` section + task titles/notes (`tasks.json`) + the Architecture section(s) named in the phase's `meta.architectureRefs`; the **parent assembles it** and passes it to the read-only reviewer (which does not read the whole Architecture doc); name/id-match fallback when `meta.architectureRefs` is absent. The "exact representation of `meta.architectureRefs`" sub-point is **closed**: anchor = requirement id (`R1`, `R2`, …) for requirement sections or a kebab-slug of the heading for component sections, written by the architect (AC2a) and stored as a string array on `meta.phases[<phase>].architectureRefs` (AC2b). No residual representation choice remains open.
