---
id: wt-build-leverage-primitives-012
featureId: feat-build-leverage-primitives
stage: walkthrough
status: approved
stale: false
title: Build leverage primitives — Phase wiring walkthrough
dependsOn:
  - plan-build-leverage-primitives-012
basedOn:
  plan-build-leverage-primitives-012: 1
generatedBy: agent
version: 1
phase: wiring
createdAt: '2026-06-15T13:06:14.867Z'
updatedAt: '2026-06-15T13:10:58.293Z'
---
# Build leverage primitives — Phase wiring walkthrough

Phase `wiring` ships **pure prompt/instruction wiring** into three SpecManager agents and one command — no compiled code. It teaches the builder, designer, and architect agents to **detect-then-defer with graceful degradation** to three optional Claude Code dependencies (Superpowers, `frontend-design`, Context7), each behind the same three-tier pattern: real skill/tool if present → distilled built-in fallback → suggest install. It also adds the Architecture **anchor-scheme convention** (R3/AC2a) that the Phase-`core` slice-assembly (`meta.architectureRefs`) resolves against. Tasks 016–020 landed in `agents/builder.md`, `agents/designer.md`, `agents/architect.md`, and `commands/specmanager-design.md`.

> **Exit test (from plan.md):** `claude plugin validate plugins/specmanager` passes; manual dry-runs (a design with thin `docs/DESIGN.md` tokens; an architecture draft hitting a version-sensitive library).

This phase strictly depends on Phase `core`: tasks 017/018 call the core `bootstrap_design_tokens` MCP tool, task 016 composes with the core R3 reviewer, and task 020 is the convention that the core `meta.architectureRefs` (planner task 002) + slice-assembly (task 015) resolve against. You should already have Phase `core` built and its walkthrough reviewed — the deterministic spine (the `meta.phases` schema, `resolve_active_card`, `tiers.ts`, the Stop hook, `mergeSynthesizedTokens` + `bootstrap_design_tokens`, the reviewer agent) must be in place. The wiring layer is inert prose until that spine exists.

## 0. Prerequisites

- **Repo/branch:** this repo, `main`, with the wiring commits present:
  - `43fe8e9` — Superpowers TDD/debug/review + shared de-dup line → `agents/builder.md` (task-016)
  - `c76f97c` — `frontend-design` 3-tier + grounding ladder → `agents/designer.md` + `commands/specmanager-design.md` (task-017)
  - `91bf573` — `frontend-design` detect-then-defer for UI build tasks → `agents/builder.md` (task-018)
  - `2d4c224` — Context7 doc-lookup ladder → `agents/architect.md` (task-019)
  - `aceeed8` — Architecture anchor-scheme convention → `agents/architect.md` (task-020)
- **Runtime:** the Claude CLI with `claude plugin validate` available; Node 20+ (only to satisfy the plugin's `.mcp.json` boot — no rebuild needed this phase).
- **No build step.** These commits touch only `*.md` under `plugins/specmanager/`. Nothing in `server/src`, `ui/src`, or the committed `dist/` changed, so there is **no `npm run build` to run** for this phase — confirmed below in check 1.4.
- **Optional, for the dry-runs only:** a target project where you can run `/specmanager-design` and `/specmanager-architecture`. The dry-runs work the same whether or not Superpowers/`frontend-design`/Context7 are installed — that is the point of graceful degradation.

## 1. Build

This phase has **no automated test surface**. The plan marks its `meta.testCommand` as the literal `"none"` (R1/AC5) — prompt wiring has no unit tests — so the Phase-`core` Stop hook skips a command run for this phase and verifies criteria only. Verification is therefore:

1. **Plugin validate** — the manifest + every command/agent markdown still parses:
   ```bash
   claude plugin validate plugins/specmanager
   ```
   Expected (the only acceptable output):
   ```
   ⚠ Found 1 warning:
     ❯ version: No version specified. Consider adding a version following semver (e.g., "1.0.0")
   ✔ Validation passed with warnings
   ```
   The "No version specified" warning is **pre-existing** (the plugin manifest carries no `version` by design) — it is not introduced by this phase. Any *new* warning or a validation **failure** means a malformed agent/command frontmatter; stop here.

2. **Consistency read-through** — the assertions this phase adds are prose, verified by reading the five files in checks 2.x below.

If validate fails or shows any warning other than the pre-existing "no version" one, stop here.

## 2. Install / run

This feature under build *is* a Claude Code plugin, so to exercise the wired prompts live (the optional dry-runs in checks 2.5–2.6) reinstall the plugin and reload:

```
/plugin marketplace update specmanager
/plugin install specmanager@specmanager
/reload-plugins
```

Then reconnect the MCP server via `/mcp`.

**Reload troubleshooting:** if `/reload-plugins` does not pick up the edited agent/command markdown, or `/mcp` shows the server disconnected, a **full Claude restart** is the reliable fix (see README Troubleshooting). Because this phase changed only prompts (not the MCP server), you do *not* need to rebuild `dist/` before reloading — a stale `dist/` is not the cause of a missed prompt edit.

For checks 2.1–2.4 (static prose assertions) no reinstall is needed — they read the committed files directly.

## 3. Phase wiring exit checks

Each check is grounded in the actual file that shipped. The dry-runs (2.5, 2.6) are the manual verification the exit test names; the static checks (2.1–2.4) confirm the prose that drives them.

### 3.1 Superpowers execution discipline + shared de-dup line (task-016, `43fe8e9`)

`agents/builder.md` gained a **Skill leverage (detect-then-defer)** section. Verify it:

```bash
grep -n "Shared de-dup line\|Superpowers\|systematic-debugging\|two-stage review\|No vendoring\|Graceful degradation" plugins/specmanager/agents/builder.md
```
Expected — the section asserts all of:
- A **shared de-dup line** (quoted): *"If Superpowers is installed, defer to its skills and skip the built-in equivalents below."* The two skill sets cover different surfaces (Superpowers = execution discipline, `frontend-design` = visual discipline) and **never double-trigger**.
- Three Superpowers skills wired, each fed **the task's spec slice** (its `plan.md` phase section + task title/notes) as the contract: **TDD** (red → green → refactor, used instead of writing code directly), **systematic-debugging** (root-cause-before-fix), **two-stage review** (in-build discipline before commit).
- **Execution-discipline only** — never Superpowers' brainstorming/planning skills; SpecManager owns the *what*, Superpowers sharpens the *how*. **No vendoring** — invoke the installed skill, never copy its text in.
- **Composes with the R3 reviewer, not duplicate:** Superpowers' two-stage review is discipline *inside* building a task; the parent's R3 reviewer (Phase `core`) is a separate pre-advance gate after the Stop hook passes.
- **Graceful degradation (R4/AC2):** Superpowers absent ⇒ plain execution loop unchanged, no error, no install-blocking.

### 3.2 frontend-design 3-tier + grounding ladder in the designer (task-017, `c76f97c`)

`agents/designer.md` gained a **Design-discipline leverage (R5)** section; `commands/specmanager-design.md` gained the optional design-reference note.

```bash
grep -n "frontend-design\|3-tier\|Distilled built-in fallback\|Grounding ladder\|bootstrap_design_tokens\|No vendoring" plugins/specmanager/agents/designer.md
grep -n "Optional design reference\|placeholder\|attachment path" plugins/specmanager/commands/specmanager-design.md
```
Expected — `designer.md` asserts the full three-tier pattern, applied *on top of* `docs/DESIGN.md` tokens (which stay the source of truth for colors/type/radii/spacing):
1. **Real skill (preferred):** if `frontend-design` is installed, defer to it for visual judgment/layout/component taste, grounded in the DESIGN.md tokens.
2. **Distilled built-in fallback (always present):** if absent, apply a compact method — pin a 4–6 named-color token system traced to DESIGN.md, 2+ type roles, one shared layout concept, one signature element, and a genericness critique (reject centered-everything / default purple gradients / filler).
3. **Suggest the skill (optional, never required):** on fallback, may note once that installing `frontend-design` would sharpen future designs — never block.

Plus the **grounding ladder (AC6)**: real DESIGN.md tokens → optional user example/screenshot → synthesize from scratch (only when tokens are thin/placeholder and no reference given); the **invite-a-reference (AC7)** clause when tokens are thin; **bootstrap-back (AC8)** — when the designer *synthesizes* starter tokens it calls the Phase-`core` **`bootstrap_design_tokens({ tokens })`** MCP tool (the only seed write path, marker-anchored fill-placeholder-only merge), never raw-`Write` to DESIGN.md; and **No vendoring (AC5)** — encode the method, never copy the skill's text.

`specmanager-design.md` (step 5) asserts the optional design-reference invitation reusing the existing screenshot attachment path, always optional.

### 3.3 frontend-design detect-then-defer for UI build tasks (task-018, `91bf573`)

`agents/builder.md` gained a **frontend-design — visual discipline (R5/AC2)** sub-section under the same Skill-leverage block.

```bash
grep -n "frontend-design — visual discipline\|UI-touching build tasks\|traces to .docs/DESIGN.md\|shared de-dup line" plugins/specmanager/agents/builder.md
```
Expected — for **UI-touching build tasks** (creates/changes screens/components/styles), the builder does the same detect-then-defer: defer to `frontend-design` for layout/component taste if installed, else build plain — but **every color and type choice still traces to `docs/DESIGN.md`** and any feature `mockups.html` is the screen spec. It explicitly **reuses the 3.1 shared de-dup line** so Superpowers (execution surface) and `frontend-design` (visual surface) never double-trigger. Graceful degradation: skill absent ⇒ build from DESIGN.md tokens + mockups directly, no error.

### 3.4 Context7 doc-lookup ladder in the architect (task-019, `2d4c224`)

`agents/architect.md` gained a **Library doc-lookup (Context7, on demand — R6)** section.

```bash
grep -n "Context7\|resolve-library-id\|query-docs\|api/v2/libs/search\|api/v2/context\|60 req/hr\|429\|.mcp.json" plugins/specmanager/agents/architect.md
```
Expected — fires **architect-only, on-demand**, only when drafting hits an unfamiliar/version-sensitive library, never in PRD/design/plan/build. The **ladder** (stop at first that works):
1. **Context7 MCP tools** if a Context7 server is already in-session: `resolve-library-id` → `query-docs` (a.k.a. `get-library-docs`).
2. **Context7 REST API** via `curl`: `GET https://context7.com/api/v2/libs/search?query=<library>` to resolve the id, then `GET https://context7.com/api/v2/context?libraryId=/<owner>/<repo>&query=<question>`; `libraryId` is the context7.com path, optionally version-pinned (`/v15.1.8` or `@v15.1.8`). **Keyless works** (shared 60 req/hr anonymous pool); a key goes via `-H "Authorization: Bearer ctx7sk-…"`.
3. **Suggest install + proceed** if neither path works.

**Graceful degradation (AC4):** a failed lookup, empty result, `429` (anonymous-pool limit), or unconfigured key are **all treated the same as "not configured"** — note once, then proceed from training-data knowledge; never block/delay/fail the draft. **No `.mcp.json` change (AC3)** — no bundled server, no forced key step. **Grounded use (AC5):** when fetched docs inform a decision, note the library + version consulted.

### 3.5 Manual dry-run — design with thin DESIGN.md tokens (exit-test dry-run #1)

In a target project whose `docs/DESIGN.md` holds only placeholder / `# TODO` tokens, run:
```
/specmanager-design <feature> some screens
```
Expected behaviour, demonstrating the ladder + bootstrap-back:
- The designer **invites an optional design reference** (AC7) because tokens are thin — but proceeds without one if you give none.
- It **synthesizes** a starter token system (ladder tier 3), critiquing for genericness.
- It calls **`bootstrap_design_tokens`** to fill the placeholder fields in `docs/DESIGN.md` (fill-only merge — pre-populated real tokens, if any, are untouched), then persists the mockups via `create_design_brief` to `design/mockups.html`.
- With `frontend-design` **installed**, composition defers to the skill; **absent**, it uses the distilled built-in method — either way the run completes with no error.

### 3.6 Manual dry-run — architecture draft hitting a version-sensitive library (exit-test dry-run #2)

Run `/specmanager-architecture <feature>` for a feature whose design touches a version-sensitive library. Expected:
- With Context7 **available** (MCP server or reachable REST), the architect looks up the real docs via the ladder and **notes the library + version consulted** in the relevant section (AC5).
- With Context7 **unavailable / rate-limited / keyless-exhausted (`429`)**, it treats that identically to "not configured": notes once that Context7 would help, then **proceeds from training-data knowledge** — the draft still completes, never blocks. `.mcp.json` is unchanged either way.

### 3.7 Architecture anchor-scheme convention (task-020, `aceeed8`)

`agents/architect.md` gained a **Section-anchor convention (R3/AC2a — required)** sub-section.

```bash
grep -n "Section-anchor convention\|leading token is its anchor\|kebab-slug\|meta.architectureRefs" plugins/specmanager/agents/architect.md
```
Expected — the architect must write each requirement-/component-scoped section under a heading whose **leading token is its anchor**:
- **Requirement sections:** anchor = requirement id — `## R1 — …`, `## R2 — …` (anchor `R1`, `R2`, …).
- **Component sections:** anchor = **kebab-slug** of the heading (e.g. `## Core active-card resolver` → `core-active-card-resolver`).

This makes the planner's per-phase **`meta.architectureRefs`** (Phase-`core` task-002) resolve unambiguously: the Phase-`core` build command (task-015 slice-assembly) locates the heading whose id-token/kebab-slug equals the ref and slices to the next same-level heading to build the reviewer's spec slice. One stable anchor per section, never reused.

## 4. Pass criteria

All required, each independently verifiable:

- [ ] `claude plugin validate plugins/specmanager` passes with **only** the pre-existing "No version specified" warning (check 1.1).
- [ ] No `server/src`, `ui/src`, or `dist/` file changed across the wiring commits — `git diff --name-only 43fe8e9~1 aceeed8 | grep -E 'dist/|server/src|ui/src'` returns nothing (check 1, prerequisites).
- [ ] `agents/builder.md` carries the shared de-dup line + the three Superpowers execution-discipline skills with graceful degradation (check 3.1).
- [ ] `agents/designer.md` carries the `frontend-design` 3-tier method, grounding ladder, invite-on-thin-tokens, and the `bootstrap_design_tokens` bootstrap-back; `commands/specmanager-design.md` notes the optional design reference (check 3.2).
- [ ] `agents/builder.md` applies `frontend-design` detect-then-defer to UI build tasks reusing the shared de-dup line, tokens still tracing to `docs/DESIGN.md` (check 3.3).
- [ ] `agents/architect.md` carries the Context7 on-demand ladder (MCP → REST → suggest), keyless 60 req/hr, `429`-as-not-configured graceful degradation, and no `.mcp.json` change (check 3.4).
- [ ] Dry-run #1: `/specmanager-design` on thin DESIGN.md tokens synthesizes and calls `bootstrap_design_tokens`, completing with no error whether or not `frontend-design` is installed (check 3.5).
- [ ] Dry-run #2: `/specmanager-architecture` on a version-sensitive library either consults Context7 (noting library+version) or degrades gracefully to training-data knowledge, never blocking (check 3.6).
- [ ] `agents/architect.md` carries the section-anchor convention (requirement-id / kebab-slug anchors) for `meta.architectureRefs` resolution (check 3.7).

## 5. Deferred / Out of scope

Expected, not a bug:

- **No automated test for this phase.** `meta.testCommand` is the literal `"none"` — the Stop hook verifies criteria only, never runs a command. There is intentionally no unit surface for prompt wiring.
- **No `dist/` rebuild.** Prompt-only edits; the committed compiled artifacts are unchanged by design.
- **Detection happens at agent runtime, not install time.** SpecManager does not bundle, vendor, or install Superpowers, `frontend-design`, or Context7. If none are installed, every path degrades to the plain built-in flow — that absence is the designed behaviour, not a failure.
- **No `.mcp.json` entry for Context7** (R6/AC3) — no bundled server, no forced API-key step.
- Carried PRD non-goals (not in this feature at all): per-card orchestration / worktree isolation, GitHub issue/PR sync, headless overnight board-drain, preference-learning, Cerebras, wiring Superpowers' brainstorming/planning skills, a `design-brief.md` artifact.

## 6. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `claude plugin validate` fails or shows a *new* warning | Malformed frontmatter in an edited agent/command `.md` | Diff the offending file against its wiring commit; agent frontmatter must keep its `name`/`description`; restore valid YAML. |
| Edited agent prompt not taking effect in a live run | Plugin not reloaded | `/plugin marketplace update specmanager` → `/plugin install specmanager@specmanager` → `/reload-plugins`; if still stale, full Claude restart (README Troubleshooting). |
| Designer raw-writes `docs/DESIGN.md` instead of merging | Bypassed `bootstrap_design_tokens` | The agent prompt forbids raw `Write`; the only seed path is `bootstrap_design_tokens` (fill-placeholder-only). Ensure Phase `core` shipped that tool. |
| Architect blocks/hangs on a library lookup | Treating a Context7 failure as fatal | By design `429` / empty / unconfigured = "not configured" — note once, proceed from training data. Re-read the AC4 clause in `architect.md`. |
| Superpowers + `frontend-design` both fire on one task | De-dup line ignored | They cover different surfaces (execution vs. visual) and must not double-trigger — the shared de-dup line in `builder.md` scopes each; confirm both sub-sections reference it. |
| `meta.architectureRefs` fails to resolve a section | Architecture section heading lacks a stable anchor token | Section heading's leading token must be the requirement id (`R1`) or the kebab-slug; one anchor per section, never reused (check 3.7). |

## 7. What ships next (preview)

`wiring` is the **last phase** of Build leverage primitives (Phase `core` + Phase `wiring` complete all six primitives R1–R6). Nothing builds after it. Once this walkthrough is approved, the next step is the **feature roll-up** walkthrough (`phase: "final"`), which links both phase walkthroughs and verifies the PRD's success metrics end-to-end — run `/specmanager-walkthrough <feature> final` after both per-phase walkthroughs are approved.
