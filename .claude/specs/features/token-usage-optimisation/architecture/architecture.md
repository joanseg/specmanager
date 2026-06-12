---
id: arch-token-usage-optimisation-014
featureId: feat-token-usage-optimisation
stage: architecture
status: approved
stale: false
title: Token usage optimisation architecture
dependsOn:
  - prd-token-usage-optimisation-018
basedOn:
  prd-token-usage-optimisation-018: 2
generatedBy: agent
version: 3
createdAt: '2026-06-12T08:57:48.397Z'
updatedAt: '2026-06-12T12:47:52.285Z'
---
## Summary

SpecManager's lifecycle burns its 5-hour Pro window on Opus before build starts. v1 attacks this without instrumentation, on two levers grounded in researched best practice and a file-by-file audit of the actual surface: (1) **MCP output economy** — compact JSON, slimmer list projections, and minimal mutation acks in `server/src/mcp.ts`, since every tool result lands in some context window on every call; (2) **prompt + doc-flow trims** — the four largest prompts (`specmanager-interview.md`, `planner.md`, `walkthrough-writer.md`, `specmanager-build.md`) carry heavy internal duplication, and two subagents read upstream docs they don't need. A shared "density contract" block added to the drafting agents makes artifacts losslessly denser, shrinking every downstream stage's read set. Per-stage model tiering was considered and **dropped by scope decision** (see D1) — model choice stays with the user's session `/model`; the plugin hardcodes no model names. No lifecycle semantics change: gates, staleness, frontmatter authority, optimistic concurrency, and the marker-anchored CLAUDE.md merge are untouched.

## Researched best practices (inputs to the audit)

Findings from current official docs, fetched 2026-06-12. Two items unverifiable from live sources are flagged.

| # | Finding | Source |
|---|---------|--------|
| B1 | Subagents run in isolated context windows; only the final message returns to the main session. Verbose reading belongs in subagents. | code.claude.com/docs/en/subagents-and-plugins |
| B2 | Agent frontmatter supports `model: sonnet\|opus\|haiku\|inherit` (default `inherit`). Slash commands do **not** support a `model` frontmatter field. (Recorded for completeness; unused — see D1.) | code.claude.com/docs/en/subagents-and-plugins |
| B3 | Command *descriptions* are context-resident from session start; keep them one-line. Command *bodies* load on invocation. (Body-load timing: UNVERIFIED from live docs; treated as on-invocation.) | code.claude.com/docs/en/slash-commands |
| B4 | CLAUDE.md target: under ~200 lines; longer files cost context in **every** session (main and subagents) and reduce adherence. | code.claude.com/docs/en/memory |
| B5 | MCP tool definitions cost ~100–500 tokens each, but Claude Code defers MCP tool loading by default (names only until used). Tool **outputs** always land in the calling context. | code.claude.com/docs/en/costs |
| B6 | Prompt caching is automatic; cache reads cost ~10% of input rate. The 5-hour window counts input+output across the session; Opus draws it down far faster than Sonnet per token. Exact window weighting per model: UNVERIFIED. | code.claude.com/docs/en/prompt-caching |
| B7 | Lazy reading: use `Read` with offset/limit, read only what the task needs, never re-read. | code.claude.com/docs/en/costs |

## Audit: the six surfaces

Byte counts measured in this repo. ~4 bytes/token rule of thumb; prompt total today is **71,348 bytes (~18k tokens)** across `commands/*.md` + `agents/*.md`.

| Surface | Verdict | Evidence |
|---|---|---|
| 1. Command prompts (`plugins/specmanager/commands/*.md`) | **Trim 2 of 9** | `specmanager-interview.md` 10,817 B and `specmanager-build.md` 7,542 B dominate; both run **in the main session** (interview by design, build's orchestration steps too), so their bytes cost main-session-model tokens. Both contain prose/table duplication (build step 8 states each sync branch twice; interview restates protocol rules across sections). The other seven (692–3,535 B) are already lean. |
| 2. Agent prompts (`plugins/specmanager/agents/*.md`) | **Trim 2 of 6, light pass on rest** | `planner.md` 10,850 B states its formatting conventions in full twice (sections "What a good Plan doc contains" and "Self-check"); `walkthrough-writer.md` 8,469 B has a verbose structure spec. These load per invocation into a subagent context (B1 isolates them, but they still draw the window). `prd-writer.md` 2,669 B and `architect.md` 3,702 B already lean. |
| 3. Doc flow between stages | **Trim 3 paths** | (a) `walkthrough-writer.md` requires PRD + Architecture + Plan in *per-phase* mode — the per-phase script needs only the Plan's exit-test line + this phase's tasks/artifacts; PRD matters only in final mode. (b) `builder.md` step 4 reads *all* prior phase walkthroughs — only the immediately prior one is load-bearing. (c) Design mockups (HTML, capped 5 MB by `create_design_brief`) are read via `read_document`, which JSON-escapes the whole body (every quote/newline inflated); `list_documents` already returns `filePath`, so a direct `Read` is strictly cheaper. Planner reading Architecture + PRD + design stays — all three are load-bearing there. |
| 4. MCP tool output sizes (`server/src/mcp.ts`) | **Trim — biggest mechanical win** | `text()` (mcp.ts:43) pretty-prints **every** tool result with `JSON.stringify(payload, null, 2)` — pure indentation/newline overhead on every call, both directions of the lifecycle. `list_documents` returns full frontmatter (dependsOn, basedOn, createdAt, updatedAt, generatedBy) per doc; no prompt in this repo consumes those fields from a *list* (audited: callers use id/stage/kind/status/phase/version/filePath; `version` for `basedOn` comes from `read_document`). Mutation tools (`create_document`, `write_document`, `create_task`, `update_task`, `set_status`, `create_design_brief`) echo the full record — the planner calls `create_task` once per task, so a 20-task plan returns 20 full pretty-printed echoes. Tool *definitions* are already lean (B5: deferred loading; descriptions are tight). |
| 5. Managed CLAUDE.md block (`server/src/core/claude-md.ts`) | **Trim — unbounded growth** | The block itself is ~30 lines + **one table row per feature, forever** (this repo: 16 rows and counting). Per B4 it loads into every session of the target project, main and subagents alike. Shipped features carry no actionable signal in the table. |
| 6. Main-session interview (`commands/specmanager-interview.md`) | **Trim** | Largest single prompt (10,817 B) and the only one whose full body sits in the main session for a *multi-turn* conversation on the user's (often Opus) model. Caching (B6) softens repeat turns to ~10% but the first load and every synthesis turn pay full freight. The protocol's contracts are dense but its prose is duplicative (forcing questions explained twice, exit handling restated, storage branches verbose). |

## Design — v1 changes

### D1. Per-stage model tiering — DROPPED (decision record)

Originally this design's biggest lever: `model: sonnet` frontmatter defaults on all six agents plus a per-invocation `--model` upward override on the commands. **Removed by scope decision (2026-06-12, PRD v2 non-goal):** recommended-model defaults hardcode model names into shipped plugin files; every new model generation with new names would require a plugin update to stay current, and a stale default silently pins users to an old tier. Model selection stays entirely with the user via the session `/model` — subagents keep `model: inherit` (the existing default), so they always run on whatever the user chose, current or future. The plugin embeds **no model names anywhere** (frontmatter, command grammar, config, or prompts). B2's research is retained above for the record; nothing consumes it. User guidance (README-level, not machinery): run spec stages on a lighter session model if the window is tight.

### D2. MCP output economy (`server/src/mcp.ts` only — core untouched)

All changes live at the MCP projection layer; `core/` keeps returning full records because the board's REST path (`server/src/board-server.ts`, which does not use `text()`) needs them. This respects the "every mutation flows through core" invariant — only the *serialisation to Claude* changes.

- `text()` (mcp.ts:43): drop `null, 2` → compact `JSON.stringify(payload)`. Lossless; every tool call benefits.
- `list_documents` handler (mcp.ts:105): project to `{ id, featureId, stage, kind, status, stale, title, version, phase, filePath }` via a `docSummary(d)` helper. Full metadata remains on `read_document` (unchanged — the body is its purpose).
- Mutation acks: `create_document`, `create_design_brief`, `write_document` return `{ id, version, filePath }`; `set_status` returns `{ id, status, stale }`; `create_task` / `update_task` return `{ id, status, phase, complexity }`. `list_tasks`, `check_gate`, `list_phases`, `get_next_phase` are already small — unchanged.
- Self-test impact: `selftest.ts` / `smoke-mcp` may assert on payload shapes — update assertions in the same task as each projection change.

### D3. Prompt trims (no behavioural change)

Per-file targets; the planner sizes the tasks. Each trim is a rewrite-for-density of the named duplication, not a content cut:

- `commands/specmanager-interview.md` 10,817 B → ~6 KB: forcing questions to one line each; modes to two lines each; storage branches to one compact decision list; exit/loop rules deduplicated. **Invariant:** the four-section synthesis format, the `dependsOn: []`/`basedOn: {}` contract, `write_document` + `baseVersion` re-interview path, instant-exit semantics, one-question-per-turn, plan-diff format.
- `commands/specmanager-build.md` 7,542 B → ~4.5 KB: step 8's sync branches stated **once** (keep the table, cut the duplicate prose). **Invariant:** the manual re-sync block stays byte-identical; the three `AskUserQuestion` options and their exact action orders; mid-phase-stop = no sync prompt.
- `agents/planner.md` 10,850 B → ~6.5 KB: state house conventions once; self-check *references* the convention list instead of restating each item. **Invariant:** parsed constructs verbatim — `## Phase <name> — <theme>` headings, `**Exit test:**` lines, `# | Task | Pts | Notes` columns, the `**Scale:**` legend line, summary-table `| Phase | Theme | Points |` + **Total** row, dotted numbering, ≤3 splitting, AskUserQuestion-before-multi-phase.
- `agents/walkthrough-writer.md` 8,469 B → ~5.5 KB: compress the 9-section structure spec; plus the D4 doc-flow change below. **Invariant:** section order, exit-criterion blockquote, pass-criteria checklist, both modes' gates and filenames.
- `agents/builder.md`, `agents/designer.md`: light pass + D4 changes. `agents/prd-writer.md`, `agents/architect.md`, remaining commands: already lean — D5 block insertion only.

### D4. Doc-flow trims

- `agents/walkthrough-writer.md`: per-phase mode inputs become Plan doc + this phase's tasks/artifacts only; PRD read moves to final mode (where success metrics are verified); Architecture read becomes on-demand ("read it only if a phase artifact is unintelligible without it").
- `agents/builder.md` step 4: "read the immediately prior phase's walkthrough; older ones only if a task's artifacts reference them."
- `agents/{planner,builder}.md` design grounding: read mockups via `Read` on the `filePath` returned by `list_documents` (chunked with offset/limit per B7) instead of `read_document`, avoiding JSON-escaping the HTML body. `read_document` remains correct for markdown docs.

### D5. Lossless artifact condensing — the density contract

One shared ~8-line block, specified here once, inserted verbatim into `agents/{prd-writer,architect,planner,walkthrough-writer}.md` (designer excluded — HTML mockups don't condense this way):

> **Density contract (lossless).** Reference upstream docs by id — never restate their content. Prefer tables/lists where the content is structured. No throat-clearing, transitions, or restating what a section just said. Every fact, number, constraint, decision, and open question from your inputs must survive into your output — merging duplicates is condensing; dropping information is a defect. When a length range is given, justify exceeding its lower half.

Supporting tweak: `agents/prd-writer.md`'s "200–500 lines is normal" becomes "target ≤250 lines; longer must earn it". Downstream effect compounds: denser PRDs shrink the architect's read, denser architectures shrink the planner's, etc.

### D6. Managed CLAUDE.md block growth cap

`core/claude-md.ts` `renderBlock()`: table rows only for **in-flight** features; shipped features (an `approved` walkthrough doc with `phase: "final"` in the manifest's per-feature documents) collapse into one line: `_N features shipped — full history on the board._` Lossless by the PRD's definition: the block is a derived cache of `manifest.json`/frontmatter (authoritative, untouched); no artifact loses information. The line-anchored marker merge and all rendering invariants are untouched. Check at build time whether `buildManifest()`'s document entries already expose `phase` (they expose `kind` — see `currentStageLabel`); if not, add it — manifest is a rebuildable cache, so no migration.

## Scorecard — token impact vs quality risk

Each v1 change scored 1–5 on **token impact** (5 = largest expected window savings) and **quality risk** (5 = highest risk of degrading delivery quality). Scores are the audit's judgement — the PRD cut instrumentation, so impact is estimated, not measured (see Open question 1). D1 is excluded: dropped from scope.

| Change | Token impact | Quality risk | Why |
|---|:---:|:---:|---|
| D2 MCP output economy (compact JSON, list projections, slim acks) | **4** | **1** | Fires on *every* tool call in *every* session, both lifecycle directions; the 20-task-plan echo case alone is thousands of wasted tokens. Pure serialisation change, core untouched, board REST unaffected; only hazard is a missed field consumer, and the audit found none — `read_document` retains everything. |
| D3 Prompt trims (interview, build, planner, walkthrough-writer) | **3** | **3** | ~16 KB (~4k tokens) cut from the four heaviest prompts; interview/build bytes are main-session weight, agent bytes per-invocation. Trimming a behavioural prompt can silently regress behaviour; mitigated by per-file invariant checklists and selftests covering the parsed constructs. |
| D4 Doc-flow trims (fewer upstream reads; mockups via `Read` not JSON) | **3** | **2** | Removes whole-document reads per stage (PRD/Arch out of per-phase walkthroughs; only prior walkthrough for builder) and the JSON-escaping inflation on large HTML mockups. Small risk a stage occasionally lacks context; the "read on demand if unintelligible" escape hatch keeps it recoverable. |
| D5 Density contract (lossless artifact condensing) | **3** | **3** | Compounds across the whole lifecycle — every downstream stage reads denser inputs, and savings recur per feature forever. "Lossless" is only prompt-enforced ("dropping is a defect"); no fidelity metric exists (PRD Q2), so board approval is the sole check — quality loss would be silent until a human notices. |
| D6 CLAUDE.md growth cap (collapse shipped features) | **2** | **1** | Small per-session saving but levied on *every* session of the target project (B4), main and subagents, growing with each shipped feature — already 16 rows in this repo. Derived cache, self-healing on rebuild; misclassification flips back on next sync. |

Reading: D2 is the high-impact sure thing; D3–D5 are mid-impact with real-but-mitigated regression risk concentrated in prompt/artifact fidelity; D6 is cheap hygiene. With tiering dropped, these trims carry the entire window goal — if v1 had to shrink, cut from the bottom of the impact column, never the top.

## Affected components

| Path | Change |
|---|---|
| `plugins/specmanager/agents/*.md` (6 files) | D3/D4 trims; D5 density block (4 files). No frontmatter changes. |
| `plugins/specmanager/commands/specmanager-build.md` | D3 trim |
| `plugins/specmanager/commands/specmanager-interview.md` | D3 trim |
| `plugins/specmanager/server/src/mcp.ts` | D2: compact `text()`, `docSummary` projection, slim mutation acks |
| `plugins/specmanager/server/src/core/claude-md.ts` | D6 shipped-row collapse |
| `plugins/specmanager/server/src/core/manifest.ts` | possibly expose `phase` on document entries (D6) |
| `plugins/specmanager/server/dist/`, `ui/dist` | rebuild before commit (ships compiled) |
| `plugins/specmanager/server/src/selftest*.ts`, `smoke-mcp` | assertion updates for D2/D6 |

New files: none. `core/documents.ts`, `board-server.ts`, gates/staleness/status logic, the other seven command files: untouched.

## Data model changes

None. Frontmatter schema, `tasks.json`, `feature.json` unchanged. Manifest may gain a `phase` field on per-feature document entries — rebuildable cache, no migration, deleting it loses nothing (existing invariant).

## Interfaces

- `function text(payload: unknown)` — same signature, compact serialisation (mcp.ts:43).
- `function docSummary(d: DocumentRecord): { id; featureId; stage; kind?; status; stale; title; version; phase?; filePath }` — new, mcp.ts-local.
- Mutation ack shapes per D2 (mcp.ts-local projections; core return types unchanged).
- Density-contract block (D5) — prompt-level interface, specified once above.

## Sequence / flow (optimised lifecycle on a Pro session)

1. User picks the session model with `/model`; everything below inherits it. User runs a drafting command. Main session executes the lean orchestration body: `list_features` → `check_gate` → `list_documents`, each returning compact JSON (D2).
2. Command invokes `Task` with the subagent type and explicit doc ids.
3. The subagent does all heavy reading — upstream docs (fewer of them, per D4), repo files — inside its isolated window (B1). It persists via `create_document`/`create_task` and receives slim acks (a 20-task plan returns 20 one-line acks, not 20 full echoes).
4. Only the subagent's final report re-enters the main session. Command syncs CLAUDE.md (block now growth-capped, D6) and reports doc id + path.
5. Each stage's artifact is denser (D5), so stage N+1's subagent reads fewer tokens — savings compound through the lifecycle. Build/walkthrough repeat the pattern per phase.

## Failure & edge cases

- **Compact JSON breaks self-tests** that string-match pretty output → update assertions in the same task as each D2 change; `npm run selftest` + `smoke-mcp` are the gate.
- **A trimmed prompt regresses behaviour** → each D3 trim ships with its invariant checklist (above) reviewed against the diff; selftests cover parsed constructs (`selftest-phases` parses plan headings/tables). Full end-to-end re-runs are too expensive per the PRD — invariant review is the per-change check; the acceptance run is one final experiment.
- **A dropped `list_documents` field is needed later** → only this repo's prompts consume MCP output (board uses REST); audit found no consumer of the dropped fields; `read_document` retains everything.
- **D6 misclassifies a feature as shipped** → classification uses the same signal as `feature.shipped` (final walkthrough approved); reopening that walkthrough flips it back on next sync — self-healing via rebuild.
- **Trims alone don't fit Opus in the window** → with tiering dropped (D1) the machinery has no further lever; the user's remaining lever is running spec stages on a lighter session model via `/model` (documented guidance, not plugin behaviour). Carried as the feature's headline risk.
- **Interview still expensive on Opus** → trim is v1's ceiling here; same `/model` guidance applies. Carried as a risk.

## Conventions used

- Server is TS strict ESM, Node 20+, zod input schemas; `dist/` rebuilt and committed before shipping.
- Mutations flow through `core/`; D2 touches only the MCP serialisation layer, never duplicating core logic.
- Managed-block edits stay inside the line-anchored markers; frontmatter stays authoritative; manifest stays a rebuildable cache.
- Self-tests are hand-rolled scripts in `dist/` run by name; prompt-parsing contracts (`## Phase`, `**Exit test:**`, task tables) are load-bearing and preserved verbatim.
- Plugin validation via `claude plugin validate plugins/specmanager` after prompt changes.

## Open questions / risks

1. **Blind-trim risk** (PRD Q1): unmeasured burn. This audit's bet: per-call output overhead (D2) dominates, prompts second. If wrong, the failed acceptance run is the discovery cost — accepted in the PRD.
2. **Window accounting** (B6 UNVERIFIED): whether cache reads count toward the 5-hour window is not documented; affects how much the interview trim (D3) helps multi-turn sessions.
3. **Fidelity judgement** (PRD Q2): board approval remains the only lossless check; the density contract's "dropping is a defect" wording is the prompt-level guard. Unchanged from PRD.
4. **Reference feature for the acceptance test** (PRD Q4): recommend pinning a known medium feature (e.g. a future plugin-port feature, which must follow this one anyway) as the test vehicle — planner should schedule the acceptance run as the final task.
5. **Is trimming alone enough?** (PRD Q5): with tiering dropped, D2–D6 carry the entire window goal alone; if the acceptance run fails, the fallback is user-level `/model` guidance, not plugin machinery.
6. **Sequencing**: this feature's prompt files are the base the Cursor/Codex/Antigravity ports copy — their plans must not start until this feature's final walkthrough is approved.
