# Installing SpecManager from a git branch

Claude Code has no `--branch` flag for marketplaces: it clones them **shallow and
single-branch**, so a fresh marketplace clone can only ever see the default branch.
To test a feature branch you widen that clone's refspec once, then check it out.

Substitute your branch for `feat/opus-5-readiness` throughout.

## 1. Point the marketplace clone at your branch

Run in a terminal (not in Claude):

```bash
M=~/.claude/plugins/marketplaces/specmanager

git -C $M config remote.origin.fetch '+refs/heads/*:refs/remotes/origin/*'
git -C $M fetch --depth 1 origin feat/opus-5-readiness
git -C $M checkout -B feat/opus-5-readiness FETCH_HEAD
git -C $M branch --set-upstream-to=origin/feat/opus-5-readiness
```

The `config` line is the load-bearing one — without it `fetch` cannot resolve any
ref outside the default branch. It only needs running once per machine.

If the marketplace isn't registered yet, add it first with
`claude plugin marketplace add joanseg/specmanager`, then run the block above.

## 2. Verify the branch content landed

```bash
git -C $M branch --show-current    # your branch
git -C $M rev-parse --short HEAD   # matches the branch head on GitHub
```

The plugin ships compiled `server/dist` and `ui/dist`, so there is **no build step** —
if those directories are present, the branch is installable as-is. A branch whose
`dist/` wasn't rebuilt before the commit will install stale code silently; compare
against your working tree if in doubt:

```bash
shasum $M/plugins/specmanager/server/dist/mcp.js
shasum <your-repo>/plugins/specmanager/server/dist/mcp.js
```

## 3. Reinstall the plugin

In Claude:

```
/plugin uninstall specmanager@specmanager
/plugin install specmanager@specmanager
/reload-plugins
```

**Skip `/plugin marketplace update`** — step 1 already fetched the exact head, and
the update path is not verified to preserve a non-default branch.

## 4. Restart Claude

`/reload-plugins` does not rebind the MCP server, so newly registered tools stay
invisible until the process restarts. Quit and relaunch `claude`, then check `/mcp`.

## Refreshing after new commits

```bash
git -C $M pull
```

Then repeat steps 3–4.

## Going back to main

```bash
git -C $M checkout main
```

Then repeat steps 3–4.
