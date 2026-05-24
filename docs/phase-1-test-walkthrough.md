# Phase 1 — Test walkthrough

End-to-end test of the SpecManager plugin against a **scratch repo**, exercising the Phase 1 exit criteria:

> install into a scratch repo → `/specmanager:init` scaffolds `.claude/specs/` + the `CLAUDE.md` block → create a feature, create a PRD doc, approve it, then reopen it and confirm a dependent is flagged `stale` — all from the Claude Code session, files visible in git.

## 0. Prerequisites

- macOS or Linux, Node ≥ 20, `npm`, `git`.
- Claude Code CLI (`claude`) installed and logged in.
- A working copy of this plugin repo. The instructions below assume it is at `~/Documents/projects/specmanager`.

> The exact plugin path doesn't matter — substitute yours into the `PLUGIN_DIR` variable below.

## 1. Build the plugin

```bash
PLUGIN_DIR=~/Documents/projects/specmanager
cd "$PLUGIN_DIR/server"
npm install            # installs into server/node_modules
npm run build          # writes server/dist/*.js
```

Sanity-check the build:

```bash
npm run selftest       # full core flow against a tmp dir; exits 0 on success
SPECMANAGER_PROJECT_DIR=$(mktemp -d) npm run smoke-mcp
                       # boots the MCP server, runs the handshake, lists all 16 tools
```

Expected last lines of each:

```
All Phase 1 assertions passed.
...
ok — all 16 Phase-1 tools registered
```

If either fails, **stop here** — the plugin won't work for the integration test below.

## 2. Create a scratch repo to install into

```bash
SCRATCH=$(mktemp -d -t specmanager-scratch.XXXX)
cd "$SCRATCH"
git init -q
echo "# Scratch project" > README.md
git add . && git commit -qm "init"
echo "scratch repo: $SCRATCH"
```

## 3. Install the plugin into the scratch repo

Claude Code installs plugins via marketplaces. This repo ships its own
`marketplace.json` at `.claude-plugin/marketplace.json`, so it doubles as a
single-plugin marketplace — pick whichever source matches where the plugin lives.

Open the scratch repo with Claude Code first:

```bash
cd "$SCRATCH"
claude
```

### Option A — Install from GitHub (after pushing)

Inside the Claude Code session:

```
/plugin marketplace add joanseg/specmanager
/plugin install specmanager@specmanager
```

Substitute `<owner>` with your GitHub user/org. To pin to a tag or branch,
use `<owner>/specmanager@<ref>`. Private repos work too — see the
[plugin-marketplaces docs](https://code.claude.com/docs/en/plugin-marketplaces#private-repositories)
for `GITHUB_TOKEN` setup.

### Option B — Install from your local checkout (no push needed)

```
/plugin marketplace add $PLUGIN_DIR
/plugin install specmanager@specmanager
```

(Substitute the absolute path to your local plugin checkout.)

### After install (either option)

When prompted for `board_port`, accept the default (`4317`).

Expected: `specmanager` is enabled. The MCP server auto-starts; the `SessionStart` hook copies `server/package.json` into `${CLAUDE_PLUGIN_DATA}` and runs `npm install --omit=dev` there (one-time, ~10s). The compiled JS at `server/dist/mcp.js` is **shipped in the repo** — no `tsc` step runs on the user's machine.

## 4. Run the Phase 1 exit test inside Claude Code

The slash commands below come from the plugin. After each one, Claude will call MCP tools — the **acceptance checks** are the on-disk artifacts and what `list_documents`/`list_stale` return.

### 4.1 Initialize

```
/specmanager:init
```

Verify:

```bash
ls "$SCRATCH/.claude/specs"                    # → features  manifest.json
grep -c "specmanager:start" "$SCRATCH/CLAUDE.md"   # → 1
grep -c "specmanager:end"   "$SCRATCH/CLAUDE.md"   # → 1
```

### 4.2 Create a feature

```
/specmanager:feature Checkout corridor
```

Verify:

```bash
ls "$SCRATCH/.claude/specs/features"           # → checkout-corridor
cat "$SCRATCH/.claude/specs/features/checkout-corridor/feature.json"
```

Expect `id: feat-checkout-corridor`, `slug: checkout-corridor`, `currentStage: prd`.

### 4.3 Create the PRD

There is no `/specmanager:prd` skill in Phase 1 — call the MCP tool directly via Claude. Ask Claude:

> Use the `create_document` tool to add a PRD draft for `feat-checkout-corridor` titled "Checkout corridor PRD" with body `# PRD\nDraft.`

Verify:

```bash
cat "$SCRATCH/.claude/specs/features/checkout-corridor/prd/prd.md"
```

Frontmatter should show `status: draft`, `version: 1`, `stale: false`.

### 4.4 Create a dependent Architecture doc

Ask Claude:

> Use `create_document` to add an Architecture draft for `feat-checkout-corridor` titled "Checkout corridor architecture" with `dependsOn: ["prd-checkout-corridor-001"]` and `basedOn: { "prd-checkout-corridor-001": 1 }`. Body: `# Architecture\nDraft.`

Verify the file exists at `.../architecture/architecture.md` and the frontmatter records the dependency.

### 4.5 Approve the PRD

Ask Claude:

> Set status `approved` on `prd-checkout-corridor-001`.

Verify:

```bash
grep "^status:" "$SCRATCH/.claude/specs/features/checkout-corridor/prd/prd.md"
# → status: approved
```

### 4.6 Reopen the PRD — Architecture must flip to `stale`

Ask Claude:

> Set status `draft` on `prd-checkout-corridor-001`, then call `list_stale`.

Verify:

```bash
grep "^stale:" "$SCRATCH/.claude/specs/features/checkout-corridor/architecture/architecture.md"
# → stale: true
```

And `list_stale` must include `arch-checkout-corridor-001`.

### 4.7 CLAUDE.md reflects the state

```bash
sed -n '/specmanager:start/,/specmanager:end/p' "$SCRATCH/CLAUDE.md"
```

You should see a row for *Checkout corridor* with Architecture flagged ⚠️ stale.

### 4.8 Commit the spec dir into git

```bash
cd "$SCRATCH"
git add CLAUDE.md .claude/
git status   # specs/ and CLAUDE.md should be the only changes
git commit -qm "specmanager: initial features"
git log --oneline
```

Confirming the spec artifacts travel with the code (a core Phase 1 promise).

## 5. Pass criteria (all required)

- [ ] `npm run selftest` exits 0.
- [ ] `npm run smoke-mcp` reports all 16 tools registered.
- [ ] After step 4.1, `.claude/specs/manifest.json` exists and `CLAUDE.md` contains both managed markers.
- [ ] After step 4.2, `feature.json` exists with the expected id/slug.
- [ ] After step 4.5, the PRD's frontmatter shows `status: approved`.
- [ ] After step 4.6, the Architecture doc's `stale: true` AND it appears in `list_stale`.
- [ ] `git status` shows changes only inside `.claude/specs/` and `CLAUDE.md` — nothing outside the managed scope was touched.

## 6. Teardown

```bash
rm -rf "$SCRATCH"
```

To remove the plugin from Claude Code:

```
/plugin uninstall specmanager
/plugin marketplace remove local
```

## Troubleshooting

- **`SessionStart` hook fails with "npm: not found"** — ensure `npm` is on the PATH of the shell Claude Code uses (`echo $PATH` from the session).
- **MCP server logs `SPECMANAGER_PROJECT_DIR is not set`** — the `.mcp.json` substitution failed. Confirm `${CLAUDE_PROJECT_DIR}` resolves by opening Claude Code inside the project root.
- **Tools missing from Claude's tool list** — restart the session after install; MCP servers are loaded once at session start.
- **You see edits outside the managed block in `CLAUDE.md`** — that's a bug. Capture the diff and the slash-command sequence; the writer is supposed to be idempotent between the markers only.
