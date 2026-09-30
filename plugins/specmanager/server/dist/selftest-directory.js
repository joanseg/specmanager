// R8 conformance test — the plugin folder checked against the mechanically
// testable rules of the Anthropic plugin directory: README, file size and
// count limits, no binaries, no OS system files, no package-source config,
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
const abs = (f) => path.join(PLUGIN_ROOT, f);
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
// 8. No OS system files.
const systemFiles = entries.filter((f) => f.split("/").some((s) => SYSTEM_NAMES.includes(s)));
check(systemFiles.length === 0, `no OS system files${named(systemFiles)}`);
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
//# sourceMappingURL=selftest-directory.js.map