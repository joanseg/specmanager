import fs from "node:fs/promises";
import path from "node:path";
import { repoDir, reposDir } from "./paths.js";
/**
 * Validate a user-supplied repo path (the read grant). Resolves relative args
 * against `cwd`; the arg must exist and be a directory. A missing `.git` (dir
 * OR file — worktrees/submodules use a `.git` file) is a *warning*, never a
 * gate: the path is the authorization, so we honour it.
 */
export async function validateRepoPath(arg, cwd) {
    const abs = path.resolve(cwd, arg);
    let stat;
    try {
        stat = await fs.stat(abs);
    }
    catch {
        return { ok: false, reason: "notFound" };
    }
    if (!stat.isDirectory()) {
        return { ok: false, reason: "notADirectory" };
    }
    const warnings = [];
    if (!(await hasGit(abs)))
        warnings.push("notAGitRepo");
    return { ok: true, abs, name: path.basename(abs), warnings };
}
/**
 * The write-containment guard. Throws unless `p` resolves to `root` itself or
 * sits strictly inside it (`root + path.sep` prefix). Every write in this
 * module passes through here — a traversal-laden name cannot escape the root.
 */
export function assertInsideRoot(p, root) {
    const resolved = path.resolve(p);
    const resolvedRoot = path.resolve(root);
    if (resolved !== resolvedRoot && !resolved.startsWith(resolvedRoot + path.sep)) {
        throw new Error(`Refusing to write outside the meta root: ${p} escapes ${root}`);
    }
}
/**
 * The read seam — the *only* reads outside the meta root. Reads the sibling's
 * `CLAUDE.md` and `DESIGN.md`; ENOENT/EACCES ⇒ absent (`null`), never throws.
 * No directory walk of the sibling: UI-detection uses `DESIGN.md` presence only.
 */
export async function readRepoSourceDocs(abs) {
    return {
        claudeMd: await readIfPresent(path.join(abs, "CLAUDE.md")),
        designMd: await readIfPresent(path.join(abs, "DESIGN.md")),
    };
}
async function readIfPresent(file) {
    try {
        return await fs.readFile(file, "utf8");
    }
    catch (err) {
        const code = err.code;
        if (code === "ENOENT" || code === "EACCES")
            return null;
        throw err;
    }
}
async function hasGit(abs) {
    try {
        await fs.stat(path.join(abs, ".git"));
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Resolve final `repos/<name>/` folder names for a declare set, disambiguating
 * same-set basename collisions: when two paths share a basename, **both** become
 * `<parent>__<basename>` (never a silent overwrite). Deeper paths keep their
 * basename, so `repos/` stays exactly one level deep regardless of source depth.
 */
export function disambiguateNames(absPaths) {
    const counts = new Map();
    for (const p of absPaths) {
        const base = path.basename(p);
        counts.set(base, (counts.get(base) ?? 0) + 1);
    }
    return absPaths.map((p) => {
        const base = path.basename(p);
        if ((counts.get(base) ?? 0) > 1) {
            return `${path.basename(path.dirname(p))}__${base}`;
        }
        return base;
    });
}
/**
 * Seed `repos/<name>/{CLAUDE.md, DESIGN.md, .specmanager-repo.json}` inside the
 * meta root. Reads are already done (`docs`); this only writes, and **every write
 * path passes through `assertInsideRoot`** so nothing can escape the root.
 *
 * Write-if-absent at the file level (`wx`): a re-declared repo keeps its nested
 * bodies byte-for-byte — the user may have annotated the mirror — while a missing
 * sidecar is regenerated. `sourcePath = path.relative(path.dirname(root), abs)`.
 */
export async function seedRepo(root, name, abs, docs) {
    const dir = repoDir(name, root);
    assertInsideRoot(dir, root);
    const sourcePath = path.relative(path.dirname(root), abs);
    const sourceHadClaudeMd = docs.claudeMd !== null;
    const sourceHadDesignMd = docs.designMd !== null;
    const hasUi = sourceHadDesignMd;
    const seededAt = new Date().toISOString();
    const header = seedHeader(sourcePath, seededAt);
    const existed = await isDirectory(dir);
    await fs.mkdir(dir, { recursive: true });
    const claudeFile = path.join(dir, "CLAUDE.md");
    const designFile = path.join(dir, "DESIGN.md");
    const sidecarFile = path.join(dir, ".specmanager-repo.json");
    assertInsideRoot(claudeFile, root);
    assertInsideRoot(designFile, root);
    assertInsideRoot(sidecarFile, root);
    const wroteClaude = await writeIfAbsent(claudeFile, docs.claudeMd !== null
        ? `${header}\n\n${docs.claudeMd}`
        : `${header}\n\n_No CLAUDE.md found in source._\n`);
    const wroteDesign = await writeIfAbsent(designFile, docs.designMd !== null
        ? `${header}\n\n${docs.designMd}`
        : `${header}\n\n_This repo has no design system / UI; placeholder kept so the nested tree is uniform._\n`);
    const sidecar = {
        name,
        sourcePath,
        hasUi,
        seededAt,
        sourceHadClaudeMd,
        sourceHadDesignMd,
    };
    await writeIfAbsent(sidecarFile, `${JSON.stringify(sidecar, null, 2)}\n`);
    return { name, sourcePath, hasUi, added: !existed, seeded: { claudeMd: wroteClaude, designMd: wroteDesign } };
}
/** The read-only-mirror banner prefixed to every seeded body/stub. */
function seedHeader(sourcePath, iso) {
    return `> Seeded by SpecManager from ${sourcePath} on ${iso}. Read-only mirror; edit the source repo, not this file.`;
}
/** Write only if the file doesn't already exist (`wx`); never clobbers. */
async function writeIfAbsent(file, content) {
    try {
        await fs.writeFile(file, content, { flag: "wx" });
        return true;
    }
    catch (err) {
        if (err.code === "EEXIST")
            return false;
        throw err;
    }
}
async function isDirectory(p) {
    try {
        return (await fs.stat(p)).isDirectory();
    }
    catch {
        return false;
    }
}
/**
 * Declare a set of sibling repos by path and seed each into the meta root.
 *
 * All args are validated first so same-set basename collisions can be
 * disambiguated across the *whole* valid set (`disambiguateNames`). **Partial
 * success:** a rejected arg (missing / not-a-directory / cross-run conflict) is
 * recorded in `rejected` and never aborts the others.
 *
 * Cross-run collision: an existing `repos/<name>/` whose sidecar `sourcePath`
 * differs from the incoming repo is reported as a conflict and skipped — never
 * overwritten. A re-declare from the same source seeds idempotently (seedRepo is
 * write-if-absent).
 */
export async function declareRepos(root, repoPaths, cwd = process.cwd()) {
    const outcomes = [];
    const rejected = [];
    const valid = [];
    for (const arg of repoPaths) {
        const res = await validateRepoPath(arg, cwd);
        if (res.ok)
            valid.push({ arg, repo: res });
        else
            rejected.push({ arg, reason: res.reason });
    }
    const names = disambiguateNames(valid.map((v) => v.repo.abs));
    for (const [i, { arg, repo }] of valid.entries()) {
        const name = names[i] ?? repo.name;
        const dir = repoDir(name, root);
        const sourcePath = path.relative(path.dirname(root), repo.abs);
        const existing = await readSidecar(dir);
        if (existing && existing.sourcePath !== sourcePath) {
            rejected.push({ arg, reason: "conflict" });
            continue;
        }
        const docs = await readRepoSourceDocs(repo.abs);
        const seed = await seedRepo(root, name, repo.abs, docs);
        outcomes.push({
            name: seed.name,
            sourcePath: seed.sourcePath,
            hasUi: seed.hasUi,
            added: seed.added,
            seeded: seed.seeded,
            warnings: repo.warnings,
        });
    }
    return { outcomes, rejected };
}
/**
 * Shallow-scan `repos/` and return each declared repo from its provenance
 * sidecar, sorted by `name`. A missing/unreadable sidecar degrades gracefully to
 * `{ name: <dir>, hasUi: <DESIGN.md present>, sourcePath: "", seededAt: "" }`.
 *
 * **No recursion** into `repos/<name>/` — this fires on the CLAUDE.md render hot
 * path, so it stays a single shallow `readdir` plus one sidecar read per entry.
 */
export async function scanDeclaredRepos(root) {
    const dir = reposDir(root);
    let entries;
    try {
        entries = await fs.readdir(dir, { withFileTypes: true });
    }
    catch {
        return [];
    }
    const repos = [];
    for (const entry of entries) {
        if (!entry.isDirectory())
            continue;
        const repoPath = path.join(dir, entry.name);
        const sidecar = await readSidecar(repoPath);
        if (sidecar) {
            repos.push({
                name: sidecar.name,
                sourcePath: sidecar.sourcePath,
                hasUi: sidecar.hasUi,
                seededAt: sidecar.seededAt,
            });
        }
        else {
            repos.push({
                name: entry.name,
                sourcePath: "",
                hasUi: await isFilePresent(path.join(repoPath, "DESIGN.md")),
                seededAt: "",
            });
        }
    }
    repos.sort((a, b) => a.name.localeCompare(b.name));
    return repos;
}
/** Read a repo's provenance sidecar; `null` when missing or unparseable. */
async function readSidecar(dir) {
    try {
        const raw = await fs.readFile(path.join(dir, ".specmanager-repo.json"), "utf8");
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
async function isFilePresent(p) {
    try {
        await fs.stat(p);
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=repos.js.map