// R8 conformance test — the plugin folder checked against the mechanically
// testable rules of the Anthropic plugin directory: README, file size and
// count limits, no binaries, the manifest, hook and MCP commands, MCP env, no
// OS system files, the root lockfile install, no package-source config,
// source maps, symlinks or bin/. It checks "what a commit of the current tree
// would ship" (tracked + new unignored files that exist on disk), so it needs
// a git checkout. Every assertion runs; the exit code is 1 if any failed.
//
// Usage: node dist/selftest-directory.js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
let failures = 0;
function check(cond, msg) {
    console.log(`${cond ? "ok —" : "FAIL:"} ${msg}`);
    if (!cond)
        failures++;
}
/** Appends the offending paths to a message, or nothing when the list is empty. */
function named(paths) {
    return paths.length ? `: ${paths.join(", ")}` : "";
}
// dist/selftest-directory.js → plugin root is two levels up from server/dist.
const here = path.dirname(fileURLToPath(import.meta.url)); // .../server/dist
const PLUGIN_ROOT = path.resolve(here, "..", ".."); // .../plugins/specmanager
const MAX_FILE_BYTES = 256 * 1024;
const MAX_FILES = 512;
const IMAGE_OR_FONT = /\.(png|jpe?g|gif|webp|woff2?|ttf|otf)$/i;
const SYSTEM_NAMES = [".DS_Store", "Thumbs.db", "desktop.ini", "__MACOSX"];
const CONFIG_NAMES = [".npmrc", "bunfig.toml", "uv.toml", ".gitattributes"];
const SHELL_SYNTAX = /[$`*?;&|<>]/;
const SHELL_WORDS = /(^|\s)(cd|-c|-e)(\s|$)/;
const LAUNCHERS = /\b(npx|bunx|pnpm|yarn|uvx|pipx|uv|npm|bun)\b/;
const PLUGIN_PATH = /\$\{CLAUDE_PLUGIN_ROOT\}\/([^\s"']+)/g;
const abs = (f) => path.join(PLUGIN_ROOT, f);
const readJson = (f) => JSON.parse(fs.readFileSync(abs(f), "utf8"));
const entries = spawnSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
    cwd: PLUGIN_ROOT,
    encoding: "utf8",
})
    .stdout.split("\0")
    .filter((f) => f && fs.lstatSync(abs(f), { throwIfNoEntry: false }));
const symlinks = entries.filter((f) => fs.lstatSync(abs(f)).isSymbolicLink());
const files = entries.filter((f) => !symlinks.includes(f));
const textFiles = files.filter((f) => !IMAGE_OR_FONT.test(f));
console.log(`plugin root: ${PLUGIN_ROOT}`);
// 1. README.md at the plugin root, with real prose in it.
const hasReadme = files.includes("README.md");
check(hasReadme, "README.md exists at the plugin root");
const words = (hasReadme ? fs.readFileSync(abs("README.md"), "utf8") : "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .split(/\s+/)
    .filter((w) => /\w/.test(w)).length;
check(words >= 40, `README.md has at least 40 words outside code (${words})`);
// 2. No text file over 256 KiB (images and fonts are exempt; SVG is text).
const oversized = textFiles.filter((f) => fs.statSync(abs(f)).size > MAX_FILE_BYTES);
check(oversized.length === 0, `no non-image/font file over 256 KiB${named(oversized)}`);
// 3. File count.
check(entries.length <= MAX_FILES, `plugin ships at most ${MAX_FILES} files (${entries.length})`);
// 4. No binary files other than images and fonts.
const binaries = textFiles.filter((f) => fs.readFileSync(abs(f)).subarray(0, 8000).includes(0));
check(binaries.length === 0, `no binary file other than images/fonts${named(binaries)}`);
// 5. plugin.json: semver version, a default board port, hooks left to hooks/hooks.json.
const manifest = readJson(".claude-plugin/plugin.json");
check(/^\d+\.\d+\.\d+$/.test(manifest.version ?? ""), `plugin.json version is semver (${manifest.version})`);
check(manifest.userConfig?.board_port?.default !== undefined, "plugin.json userConfig.board_port has a default");
check(!("hooks" in manifest), "plugin.json has no hooks key");
// 6. Hook and MCP commands: only ${CLAUDE_PLUGIN_ROOT} paths and plain arguments.
const hookGroups = Object.entries(readJson("hooks/hooks.json").hooks);
const mcpServers = Object.entries(readJson(".mcp.json").mcpServers);
const commandLine = (c) => [c.command, ...(c.args ?? [])].join(" ");
const commands = [
    ...hookGroups.flatMap(([event, groups]) => groups.flatMap((g) => g.hooks.map((h) => [`hooks.json ${event}`, commandLine(h)]))),
    ...mcpServers.map(([name, s]) => [`.mcp.json ${name}`, commandLine(s)]),
];
for (const [where, cmd] of commands) {
    const rest = cmd.replaceAll("${CLAUDE_PLUGIN_ROOT}", "");
    const plain = !SHELL_SYNTAX.test(rest) && !SHELL_WORDS.test(rest) && !LAUNCHERS.test(rest);
    check(plain, `${where}: command uses only \${CLAUDE_PLUGIN_ROOT} paths and plain arguments — ${cmd}`);
    const paths = [...cmd.matchAll(PLUGIN_PATH)].map((m) => m[1]);
    const shipped = paths.length > 0 && paths.every((p) => files.includes(p));
    check(shipped, `${where}: every referenced plugin path is a shipped file (${paths.join(", ") || "none"})`);
}
// 7. .mcp.json env: no NODE_PATH; values are literals or ${user_config.*}.
for (const [name, server] of mcpServers) {
    for (const [key, value] of Object.entries(server.env ?? {})) {
        const literal = !value.replace(/\$\{user_config\.[a-z_]+\}/g, "").includes("$");
        check(key !== "NODE_PATH" && literal, `.mcp.json ${name}.env.${key} is a literal or a \${user_config.*} reference — ${value}`);
    }
}
// 8. No OS system files.
const systemFiles = entries.filter((f) => f.split("/").some((s) => SYSTEM_NAMES.includes(s)));
check(systemFiles.length === 0, `no OS system files${named(systemFiles)}`);
// 9. Runtime dependencies install from a lockfile at the plugin root, with no scripts.
const hasPackageFiles = files.includes("package.json") && files.includes("package-lock.json");
check(hasPackageFiles, "package.json and package-lock.json exist at the plugin root");
if (hasPackageFiles) {
    const pkg = readJson("package.json");
    const lock = readJson("package-lock.json");
    check(JSON.stringify(pkg.dependencies) === JSON.stringify(lock.packages[""].dependencies), "package.json dependencies match the package-lock.json root entry");
    check(!pkg.devDependencies, "root package.json has no devDependencies");
    const scripted = Object.keys(lock.packages).filter((k) => lock.packages[k].hasInstallScript);
    check(scripted.length === 0, `no locked dependency has an install script${named(scripted)}`);
}
// 10. No package-source config, .gitattributes, source maps, symlinks or bin/.
const configFiles = entries.filter((f) => CONFIG_NAMES.includes(path.basename(f)));
check(configFiles.length === 0, `no .npmrc, bunfig.toml, uv.toml or .gitattributes${named(configFiles)}`);
const maps = entries.filter((f) => f.endsWith(".map"));
check(maps.length === 0, `no .map files${named(maps)}`);
check(symlinks.length === 0, `no symlinks${named(symlinks)}`);
const binFiles = entries.filter((f) => f.startsWith("bin/"));
check(binFiles.length === 0, `no top-level bin/ directory${named(binFiles)}`);
console.log(failures
    ? `\n${failures} directory-conformance assertion(s) failed.`
    : "\nAll directory-conformance assertions passed.");
process.exit(failures ? 1 : 0);
