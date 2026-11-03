#!/usr/bin/env bash
# Print the "Security" section for a release's notes, in Markdown.
# Usage: scripts/release-security.sh [tag]   (tag defaults to v<plugin.json version>)
# Run it from a checkout of the tag itself: the checks read the working tree.
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
plugin="$repo_root/plugins/specmanager"
version="$(node -p "require('$plugin/.claude-plugin/plugin.json').version")"
tag="${1:-v$version}"
blob="https://github.com/joanseg/specmanager/blob/$tag"

if [ "$(git -C "$repo_root" rev-parse HEAD)" != "$(git -C "$repo_root" rev-parse "$tag^{commit}")" ]; then
  echo "HEAD is not $tag: check out the tag (e.g. git worktree add /tmp/sm $tag) and run it there" >&2
  exit 1
fi

audit_json="$(cd "$plugin" && npm audit --omit=dev --package-lock-only --json 2>/dev/null || true)"
audit_line="$(node -e '
  const v = JSON.parse(process.argv[1]).metadata.vulnerabilities;
  const found = ["critical", "high", "moderate", "low"].filter((s) => v[s] > 0);
  console.log(found.length === 0
    ? "no known vulnerabilities"
    : found.map((s) => `${v[s]} ${s}`).join(", ") + ` (${v.total} total)`);
' "$audit_json")"

if (cd "$plugin/server" && npm run -s selftest-directory >/dev/null 2>&1); then
  readable="passed: every shipped file is readable source, no install scripts, no source maps"
else
  readable="**failed**"
fi

cat <<EOF
## Security

Checked for $tag on $(date -u +%Y-%m-%d):

- **Runtime dependencies (\`npm audit --omit=dev\`):** $audit_line.
- **Directory conformance (\`selftest-directory\`):** $readable.
- **What it does on your machine:** every process, file write and network use is listed in [What this plugin does on your machine]($blob/plugins/specmanager/README.md#what-this-plugin-does-on-your-machine).
- **Third-party signal:** [ClaudePluginHub safety signals](https://www.claudepluginhub.com/plugins/joanseg-specmanager-plugins-specmanager) (static checks of hooks, MCP servers and commands; not an audit).
EOF
