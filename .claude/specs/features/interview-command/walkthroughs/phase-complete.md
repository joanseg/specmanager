---
id: wt-interview-command-011
featureId: feat-interview-command
stage: walkthrough
status: draft
stale: false
title: Interview command — Phase complete walkthrough
dependsOn:
  - plan-interview-command-009
basedOn:
  plan-interview-command-009: 1
generatedBy: agent
version: 1
phase: complete
createdAt: '2026-06-10T14:42:23.451Z'
updatedAt: '2026-06-10T14:42:23.451Z'
---
# Interview command — Phase complete walkthrough

Phase `chat` proved the interview *conversation* was worth having; this phase makes its output real. It lands the `kind: "interview"` document type end to end: core schema + prd-only validation, the gate exclusion that keeps an interview from ever opening the Architecture gate, manifest/CLAUDE.md awareness, the `create_document` MCP surface, the board's Interview chip and neutral DocPanel mode, real persistence in `/specmanager-interview`, PRD grounding, 14 new selftest assertions, a README sweep, and rebuilt `dist/`. Commits, in order: `dee5a7d`, `f2e15da`, `4d483e7`, `608455b`, `cd0fd47`, `d6f588f`, `c9f3f18`, `1298053`, `05bcfb0`, `b872ba2`, `3cdd05b`, `96aae7f` (tasks `task-006`…`task-017`).

The plan's exit criterion, verbatim:

> Full end-to-end flow: run an interview → answer "yes" at the storage prompt → `interview.md` lands under `.claude/specs/features/<slug>/prd/` with `kind: interview`, `dependsOn: []` → the Interview chip (`.chip-interview` with hollow ring) appears beneath the PRD card (and beneath the generate affordance when no PRD exists) → clicking it opens the DocPanel with the neutral `.badge--interview` tag and **Save + close only** (no Approve/Edit/Gate?) → re-running the interview updates the doc in place (version bump) → `/specmanager-prd` grounds the PRD in the interview → approving the interview via the API does **not** open the Architecture gate → the CLAUDE.md feature table is unaffected by the interview → `npm run selftest` (with the new cases) and `npm run smoke-mcp` pass → manifest delete + rebuild preserves `kind`.

Assumes Phase `chat` passed (the interview conversation itself — protocol, plan diffs, mode switching, synthesis — was validated live there and is not re-tested here). The builder has already run the automated checks (§2); the live-board checks (§4) still need a human pass after reinstall.

## 0. Prerequisites

- Node 20+ and a Claude Code session in this repo (`specmanager`, branch `main` at or after `96aae7f` — the rebuilt `dist/` commit; the committed `dist/` is what ships, so earlier commits in this phase are *not* installable states).
- The SpecManager plugin installed from this repo's marketplace.
- A scratch feature idea you're willing to interview yourself about (the live checks create a real feature in this repo's `.claude/specs/` — pick something disposable, or be ready to delete its folder afterwards).

## 1. Build

```bash
cd plugins/specmanager/server
npm install
npm run build            # tsc → dist/

cd ../ui
npm install
npm run build            # tsc + vite → ui/dist
```

Both must complete with no TypeScript errors. Then the self-tests:

```bash
cd ../server
npm run selftest
npm run smoke-mcp
```

`npm run selftest` must end with `All Phase 1 assertions passed.` — and it now includes section 11 ("Interview artifacts"), 14 new assertions added in `b872ba2`. The ones that prove this phase, by message:

- `kind interview with non-prd stage is rejected`
- `interview kind stamped in frontmatter`
- `interview lands at prd/interview.md by default`
- `interview starts draft`
- `interview has no dependsOn`
- `approved interview alone does not open the architecture gate (no prd doc)`
- `approved interview does not open the gate while the PRD is draft`
- `CLAUDE.md stage label reflects the PRD, not the interview`
- `re-interview write bumps the interview version`
- `kind survives writeDocument`
- `rebuilt manifest contains the interview feature`
- `rebuilt manifest preserves kind on the interview`
- `prd entry carries no kind`

(Assertions only print when they *fail*; a clean run prints the final success line. To watch a specific case fail, temporarily flip its condition.)

`npm run smoke-mcp` must print `ok — initialize handshake`, `ok — tools/list returned 21 tools`, and `ok — all 21 tools registered`.

Optionally run the rest of the suite (`selftest-board`, `selftest-phases`, `selftest-build`, `selftest-roundtrip`, `selftest-pidfile`, `selftest-shutdown`) — all pass, with one environmental note: `selftest-roundtrip` needs `CLAUDE_PROJECT_DIR` set in the environment.

Finally:

```bash
claude plugin validate plugins/specmanager
```

Expect a pass; a pre-existing "no version" warning is known and not from this phase.

**If any of these fail, stop here.**

## 2. Install the rebuilt plugin

The live checks in §4 run against the *installed* plugin, not the working tree. After the build:

1. `/plugin marketplace update specmanager`
2. `/plugin install specmanager@specmanager`
3. `/reload-plugins`
4. `/mcp` → reconnect the `specmanager` server.

**Troubleshooting the reload:** if `/specmanager-interview` still shows the old (stubbed-persistence) behaviour, or the board doesn't render the chip, the reload didn't take — a full Claude Code restart is the reliable fix (see README Troubleshooting). Verify the board is the new build by hard-refreshing the browser tab (the UI is served from `ui/dist`, which `96aae7f` rebuilt).

## 3. Automated exit checks (already verified by the builder)

These three claims from the exit criterion are proven by `npm run selftest` (§1) rather than by hand — listed here so the mapping is explicit:

### 3.1 Gate exclusion

`core/dependencies.ts` (`4d483e7`) filters `kind === "interview"` out of `checkGate`'s prior-stage lookup *and* its emptiness check. Selftest 11.3 approves an interview via the API (`setStatus`) and asserts the Architecture gate stays closed both with no PRD (`no prd document for feature …`) and with a draft PRD (`… not approved`).

### 3.2 Re-interview version bump

Selftest 11.5: `writeDocument` with `baseVersion` on an existing interview bumps `version` 1 → 2 and `kind` survives the write (`f2e15da` made kind creation-only; `writeDocument` never touches it).

### 3.3 Manifest delete + rebuild preserves `kind`

Selftest 11.6 deletes `manifest.json` and rebuilds: the interview entry keeps `kind: "interview"`, the PRD entry carries no `kind`. (Frontmatter is authoritative; the manifest passthrough is `608455b`.) To reproduce by hand in this repo: delete `.claude/specs/manifest.json`, let the watcher/server rebuild it, then `grep -A2 '"kind"' .claude/specs/manifest.json` — every `kind` is `"interview"` and sits on an `interview.md` entry.

## 4. Live exit checks (human, after §2 reinstall)

### 4.1 Interview → "yes" → `interview.md` on disk

Run `/specmanager-interview "<scratch feature>"` and hold a short interview (two or three turns is enough — the conversation itself was Phase `chat`'s gate). Say "finish interview now", then answer **yes** at the storage prompt.

Expected: the command reports a doc id and path, then check the file —

```bash
SLUG=<scratch-slug>
head -20 .claude/specs/features/$SLUG/prd/interview.md
```

Frontmatter must contain `kind: interview`, `status: draft`, `dependsOn: []`, `version: 1`, `generatedBy: agent`. The body is the synthesis: a mode note, then `## Extracted`, `## Critique`, `## Recommended wedge`, `## Unresolved`.

### 4.2 Interview chip on the board

Open the board (`/specmanager-board`). On the scratch feature's row, PRD column:

- **No PRD yet:** the generate affordance renders with the Interview chip *beneath* it.
- The chip is a pill (`.chip-interview`): hollow `--primary` ring (not the filled status dot), label `Interview · v1`, mono font.

Create/approve a PRD later and re-check: the chip sits beneath the PRD card (`.cell-stack` keeps the card at its normal 5.5rem height), and the PRD card — not the interview — is the column's primary card.

### 4.3 DocPanel: neutral tag, Save + close only

Click the chip. Expected:

- Badge row shows a ghost-outline `interview` tag (`.badge--interview`) instead of a draft/approved status badge.
- Footer has **Save** and the **×** close button only — no Approve, no Edit, no Gate? (`c9f3f18` hides all three for `kind === "interview"`).
- The editor is writable (interviews never go read-only).

### 4.4 Re-interview updates in place

Run `/specmanager-interview` again on the same feature. The command detects the existing interview, and after "yes" it calls `write_document` with the `baseVersion` it read — no second file. Expected: the chip now reads `Interview · v2`, and `ls .claude/specs/features/$SLUG/prd/` still shows exactly one `interview.md`.

### 4.5 `/specmanager-prd` grounds the PRD in the interview

Run `/specmanager-prd <scratch feature>`. Two things to verify (`1298053`):

- The command does **not** report "a PRD already exists" because of the interview (the duplicate check ignores `kind: "interview"`).
- The drafted PRD visibly reflects the interview's extracted context/wedge, and its frontmatter `dependsOn` does **not** list the interview id (interviews sit outside the staleness graph by contract).

### 4.6 CLAUDE.md feature table unaffected

```bash
grep "<scratch feature title>" CLAUDE.md
```

Expected: the row reads `PRD (draft)` (or whatever the *PRD's* real status is) — never the interview's status, even though `readdir` puts `interview.md` before `prd.md` (`608455b`'s `currentStageLabel` filter). Also check the managed block's **Commands** line now ends with `` `/specmanager-interview` (optional, pre-PRD)``.

## 5. Pass criteria

All required:

- [ ] Server and UI build clean; `npm run selftest` ends `All Phase 1 assertions passed.` including the 14 section-11 interview assertions
- [ ] `npm run smoke-mcp` reports all 21 tools registered
- [ ] `claude plugin validate plugins/specmanager` passes (pre-existing no-version warning only)
- [ ] Live interview + "yes" produces `prd/interview.md` with `kind: interview`, `status: draft`, `dependsOn: []` (4.1)
- [ ] Interview chip with hollow ring renders beneath the generate affordance (no PRD) and beneath the PRD card (PRD present) (4.2)
- [ ] DocPanel shows the neutral `interview` tag and Save + close only — no Approve/Edit/Gate? (4.3)
- [ ] Re-interview bumps the same doc to v2; still exactly one `interview.md` (4.4)
- [ ] `/specmanager-prd` ignores the interview in its duplicate check and grounds the PRD in it without linking it in `dependsOn` (4.5)
- [ ] Approved interview does not open the Architecture gate (selftest 11.3 / §3.1)
- [ ] CLAUDE.md feature table shows the PRD's stage label, not the interview's; Commands line lists `/specmanager-interview` (4.6)
- [ ] Manifest delete + rebuild preserves `kind` (selftest 11.6 / §3.3)

## 6. Deferred / out of scope (expected, not bugs)

- **No new lifecycle stage, gate, event, or MCP tool** — the interview rides `create_document`/`write_document` inside the prd stage.
- **No board-side interview UX** — the conversation happens only in the Claude session; the board shows the stored artifact.
- **No staleness wiring** — editing an interview never flags the PRD stale; `dependsOn: []` is a prompt-level contract, not enforced by `propagateStale`.
- **No multi-session resume** of an in-progress interview (the update path softens restarts).
- **No Option B stacked sub-card** — Option A (chip) was the approved design; B was explicitly rejected.
- **Interviews never become read-only or approved on the board** — by design they stay editable draft reference docs forever; the API technically allows `set_status`, but it changes nothing (no gate opens, the DocPanel ignores it).
- `docs/architecture-and-spec.md` was not updated in task-016: it had already been archived to `docs/temp/original-specs/` in `61f908f`, so only the README's pointer to it was fixed.

## 7. Troubleshooting

- **`/specmanager-interview` still says "persistence isn't wired up yet"** → you're running the Phase `chat` stub; the reinstall didn't take. Full Claude Code restart, then `/mcp` reconnect.
- **Chip doesn't appear after storing an interview** → hard-refresh the board tab (stale `ui/dist` bundle in the browser); if it persists, confirm `interview.md`'s frontmatter actually carries `kind: interview` and that `manifest.json`'s entry for it has `"kind": "interview"`.
- **`create_document` rejects with `kind "interview" requires stage "prd"`** → working as designed; the kind is prd-only.
- **Re-interview errors with a version conflict** → the doc was edited on the board mid-session; the command is specified to re-read, merge, and retry — if it doesn't, that's a prompt regression in `commands/specmanager-interview.md` (task-014).
- **`selftest-roundtrip` fails locally** → environmental: it needs `CLAUDE_PROJECT_DIR` set; run it as `CLAUDE_PROJECT_DIR=$(pwd) npm run selftest-roundtrip` from the repo root context.
- **CLAUDE.md row shows the interview's status** → the managed block was rendered by an old server build; rebuild `dist/`, reinstall, then `sync_claude_md`.

## 8. What ships next

This is the feature's final phase. Once this walkthrough is approved (alongside Phase `chat`'s), the `phase: "final"` feature roll-up walkthrough closes out the feature — approving *that* fires `feature.shipped` and refreshes `docs/DESIGN.md`.
