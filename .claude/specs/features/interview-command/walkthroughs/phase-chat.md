---
id: wt-interview-command-010
featureId: feat-interview-command
stage: walkthrough
status: approved
stale: false
title: Interview command — Phase chat walkthrough
dependsOn:
  - plan-interview-command-009
basedOn:
  plan-interview-command-009: 1
generatedBy: agent
version: 1
phase: chat
createdAt: '2026-06-10T14:10:20.154Z'
updatedAt: '2026-06-10T14:13:57.551Z'
---
# Interview command — Phase chat walkthrough

This phase delivers exactly one artifact: `plugins/specmanager/commands/specmanager-interview.md`, the `/specmanager:specmanager-interview` slash command. It is a **prompt-only phase** — no core, MCP, server, or UI code changed, by Architecture mandate. The command runs a multi-turn pre-PRD interview in the main Claude Code session (no subagent — subagents are single-shot), embedding the office-hours forcing-question method credited to <https://github.com/garrytan/gstack/tree/main/office-hours>. Persistence is deliberately stubbed: the interview prints its synthesis and explicitly tells you nothing was written to disk.

> **Exit test:** Run `/specmanager:specmanager-interview "<feature>"` in a live Claude Code session and hold a real multi-turn interview. Verify: opening turn states the goal, prints the numbered interview plan, and states the exit phrase; one focused question per turn; plan revisions print as short `+ added / − dropped (reason)` diffs, never a full re-dump; startup↔builder mode switching when the conversation warrants it; "finish interview now" (and obvious paraphrases) goes straight to synthesis with no "are you sure"; synthesis prints the four sections (Extracted / Critique / Recommended wedge / Unresolved) matching design Screen 4. Nothing is written to disk — persistence is stubbed. The phase ends with the user's explicit go/no-go on conversation quality.

This is the feature's first phase, so there are no prior phases to assume. You do need a working SpecManager install (the command calls `list_features` / `create_feature` / `list_documents` over MCP).

Phase artifacts: commits `ba342d9` (scaffold: frontmatter, feature resolve/create, prior-material detection, stubbed storage step), `ad41c11` (interview protocol: opening turn, one-question loop, plan diffs, exit handling, synthesis format), `cc86ca5` (forcing-question method, startup/builder modes, mid-interview switching). All three touch only `plugins/specmanager/commands/specmanager-interview.md`.

## 0. Prerequisites

- macOS/Linux with Node 20+ and Claude Code installed.
- This repo at commit `cc86ca5` or later, with the `specmanager` marketplace already added (the repo root's `.claude-plugin/marketplace.json`).
- A scratch project (or this repo itself, which dogfoods the plugin) where SpecManager is initialised — `.claude/specs/` exists, MCP server connects. Run `/specmanager-init` first if not.
- A real feature idea to interview about. The checks below use a throwaway title like `"Test interview feature"`; the actual dogfood run (task-005) used a real idea ("share docs feature").

## 1. Build

There is nothing to compile — the phase ships a markdown prompt, not code. `server/dist` and `ui/dist` are untouched. The only machine check is the plugin validator:

```bash
cd /path/to/specmanager
claude plugin validate plugins/specmanager
```

Expected output ends with:

```
✔ Validation passed
```

This proves the new command's frontmatter (`description`, `argument-hint`) parses and the manifest still validates with the added file. There are no new selftest assertions in this phase — the plan's test strategy is explicit that a prompt-only phase is validated entirely by live dogfooding (task 1.5), which is why the phase gate is human judgement, not a test suite.

If validation fails, stop here.

## 2. Install / reload the plugin

The command file ships inside the plugin, so Claude Code must pick up the new version:

```
/plugin marketplace update specmanager
/plugin install specmanager@specmanager
/reload-plugins
```

Then `/mcp` to confirm the `specmanager` server is connected.

**Sanity check:** type `/specmanager` and confirm `specmanager:specmanager-interview` appears in the command list with the description "Optional pre-PRD interview for a SpecManager feature…".

**Troubleshooting the reload path:** if the new command does not appear after `/reload-plugins`, or `/mcp` shows the server disconnected, fully restart the Claude Code session — per the README, a full restart is the reliable fix when reconnect fails. The command is read at invocation time, so a stale cached plugin is the only way to see old behaviour.

## 3. Phase chat exit checks

Each check is a thing you do in a live session plus the response you must observe. The expected behaviours below are the literal contract written in `plugins/specmanager/commands/specmanager-interview.md` — quoted section names refer to that file.

### 3.1 Feature resolve/create + opening turn

Run:

```
/specmanager:specmanager-interview "Test interview feature"
```

Expected — a single opening message containing, in order (per "Opening turn"):

1. **The goal** in one or two sentences (pull context out of your head, stress-test the idea), with a parenthetical noting the feature was just created — including the new feature `id`, `slug`, and folder path (step 1 of the command requires reporting them inline).
2. **A numbered interview plan** of 5–8 one-line areas, derived from the idea — not a fixed template recital.
3. **The exit phrase**: an explicit statement that you can end at any time by saying "finish interview now" or any obvious version of it.

Then exactly one first question. Also verify a **mode** is named in the opening turn (startup interrogation or builder/design-thinking, per "Modes").

If you instead pass an existing feature's id/slug, the command must reuse it rather than create a duplicate; with no argument at all, it must ask for a short title and stop.

### 3.2 One focused question per turn

Answer a few questions. Expected on every turn: exactly one question — never two bundled, never a multi-part question (per "The loop"). Questions should push for concrete recent instances ("what actually happened") rather than general beliefs, and challenge hidden assumptions in the moment ("Hold on — …") using the six forcing questions (demand reality, status quo, desperate specificity, narrowest wedge, observation, future-fit) phrased in the conversation's own terms, not recited as a checklist.

### 3.3 Plan revisions print as diffs

Give an answer that materially changes scope — e.g. mention a second user type, or reveal that an area in the plan is already settled. Expected: a short diff block in this exact shape (per "Plan revisions print as diffs"), never a re-dump of the full numbered plan:

```
Plan update
+ multi-user / sharing reality check (you mentioned a teammate)
− demand evidence (covered: the post-build blindness is concrete)
```

Each `+` line carries a trailing parenthetical for why it was added; each `−` line carries the drop reason. If nothing material changed, no plan block prints at all.

### 3.4 Mode switching

Steer the conversation so the frame is wrong — e.g. in startup mode, reveal that the "demand" is your own daily workflow. Expected: a one-line announced switch, e.g.

```
Switching to builder mode — demand here is your own usage; the open question is shape
```

followed by a plan diff reflecting the new frame (per "Switching"). The reverse direction (builder → startup when a second user type appears) must work the same way.

### 3.5 Instant exit on paraphrase

Mid-interview — ideally with areas still uncovered — say a paraphrase of the exit phrase, e.g. `let's stop` or `that's enough` (not the literal phrase). Expected (per "Exit handling"):

- The interview ends **immediately**: no "are you sure?", no "just one more question".
- The very next output is the synthesis. If coverage was thin, the synthesis header says so (e.g. "ending immediately — 2 of 6 areas covered") and the gaps land in **Unresolved**.

### 3.6 Synthesis format matches design Screen 4

Expected: exactly four sections, in this order, tight bullets not prose pages:

- **Extracted** — facts pulled out: problem, who hits it, constraints, decisions agreed.
- **Critique** — the strongest surviving challenges: thin evidence, solution-first smells, contradictions. Honest, not polite.
- **Recommended wedge** — the narrowest version worth building first, with what was cut.
- **Unresolved** — open questions and unverified claims the PRD will have to carry.

### 3.7 Persistence is stubbed — nothing on disk

After the synthesis, expected: the command prints the stub notice verbatim from its "Storage (stubbed in this phase)" step —

> Persistence isn't wired up yet — nothing has been written to disk. When the feature is complete, this step will offer to store the interview as `interview.md` in the feature's PRD folder, visible on the board.

Then verify on disk that nothing was written to the feature's prd folder beyond what `create_feature` scaffolds:

```bash
ls .claude/specs/features/test-interview-feature/prd/
```

Expected: no `interview.md`, no new document files. `git status` on `.claude/specs/` shows only the feature-creation scaffolding from step 3.1 (manifest + folder), no interview artifact. The command also must not have called `sync_claude_md` for the interview itself.

### 3.8 Re-interview detection (prior-material path)

Step 2 of the command checks `list_documents({ featureId, stage: "prd" })`. With persistence stubbed, no `kind: "interview"` doc can exist yet, so the fully exercisable branch is the **existing-PRD** one: run the command against a feature that already has a PRD (this repo has several). Expected: a one-sentence note ("a PRD already exists; this interview can feed a rewrite") and the interview proceeds anyway. The `kind: "interview"` re-interview branch becomes testable in phase `complete`.

### 3.9 Human go/no-go recorded

This phase's gate is the user's explicit verdict on conversation quality, not a test. Verify task-005 is `done`: the dogfood run happened in a separate Claude Code session against a real feature idea ("share docs feature") and the user recorded an explicit **GO** — the interview behaved per the exit test. Check via `list_tasks({ featureId: "feat-interview-command" })`: all five `phase: "chat"` tasks show `status: "done"`, with artifacts pointing at `ba342d9`, `ad41c11`, `cc86ca5` and the single file `plugins/specmanager/commands/specmanager-interview.md`.

## 4. Pass criteria

All required:

- [ ] `claude plugin validate plugins/specmanager` passes with the new command file present.
- [ ] After reinstall + reload, `/specmanager:specmanager-interview` appears and runs in the main session (no subagent delegation).
- [ ] Opening turn contains goal + numbered 5–8 area plan + exit phrase, names a mode, then asks exactly one question; new features are created and reported with id/slug/path.
- [ ] Every turn asks exactly one focused question; challenges land in the moment using the forcing-question method.
- [ ] Plan changes print as `+ / −` diff blocks with reasons; the full plan is never re-dumped.
- [ ] Mode switches (startup↔builder) are announced in one line and accompanied by a plan diff.
- [ ] An exit paraphrase ("let's stop", "that's enough", …) triggers immediate, unconditional synthesis — no confirmation prompt.
- [ ] Synthesis is exactly four sections in order: Extracted / Critique / Recommended wedge / Unresolved.
- [ ] The stub notice prints after synthesis and nothing is written to disk — no `interview.md`, no `create_document`/`write_document`, no `sync_claude_md`.
- [ ] Running against a feature with an existing PRD notes it in one sentence and proceeds.
- [ ] All five `chat` tasks are `done` and the explicit GO on conversation quality is recorded (task-005).

## 5. Deferred / out of scope — expected, not bugs

Everything below is phase `complete` work (tasks 2.1–2.12) and intentionally absent now:

- **Answering "yes" to storage does nothing** — persistence is a printed stub. No `interview.md`, no `kind: "interview"` frontmatter, no `DOC_KIND` in core.
- **No Interview chip on the board** — the UI has no `.chip-interview`, no `.badge--interview` DocPanel treatment.
- **`/specmanager-prd` does not yet ground itself in an interview** — the prd-writer prompt update is task 2.13's sibling (2.8), unbuilt.
- **The re-interview branch for stored interviews** (step 2's `kind: "interview"` path) cannot fire — there is nothing stored to detect.
- **No selftest coverage** — there is nothing machine-testable in a prompt; interview selftest cases arrive with the core changes (task 2.15/2.10).
- **No multi-session resume** of an in-progress interview — a PRD non-goal for the whole feature, not just this phase.
- **No CLAUDE.md table entry driven by the interview** — interviews are designed to never affect the feature table.

## 6. Troubleshooting

- **Command missing after reload** → stale plugin install → `/plugin marketplace update specmanager`, reinstall, `/reload-plugins`; if still missing, restart Claude Code entirely (the reliable fix per README).
- **Opening turn asks for a title instead of starting** → you ran the command with no argument → that's the specified behaviour; re-run with a feature title or an existing id/slug.
- **A file appeared under the feature's prd folder after the interview** → the model violated the stub ("Don't write anything to disk") → this is a real phase failure, not a config issue; delete the file, report it, and treat the exit check 3.7 as failed.
- **Interview asks compound questions or re-dumps the plan** → prompt regression in `specmanager-interview.md` → diff the installed plugin's copy against `cc86ca5`; reinstall if they differ, iterate the prompt if they don't.
- **MCP calls fail at step 1 (`list_features`)** → MCP server not connected → `/mcp` to reconnect; ensure `SPECMANAGER_PROJECT_DIR` resolves to the project (the server resolves the project root from env, never cwd).

## 7. What ships next (preview)

Phase `complete` (23 points, tasks 2.1–2.12) turns the validated conversation into a stored, visible artifact:

- `kind: "interview"` in core (`DOC_KIND`, prd-only validation, `interview.md` filename) with the load-bearing `checkGate` exclusion so an approved interview never opens the Architecture gate.
- Real persistence in the command (create / update with `baseVersion` / discard) plus `sync_claude_md`.
- The board surface per the approved design Option A: `.chip-interview` pill under the PRD card, neutral `.badge--interview` DocPanel with Save + close only.
- prd-writer grounding in the stored interview, selftest cases, docs sweep, and rebuilt `dist/`.
