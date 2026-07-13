import fs from "node:fs/promises";
import path from "node:path";
import { repoDir } from "./paths.js";

/**
 * core/repos.ts — declare sibling repos by path and mirror their docs into the
 * meta root. This first slice provides the safety-critical foundation only:
 * path validation, the write-containment guard, and the read seam. Seeding
 * (task-003) and the declare/scan orchestration + index re-export (task-004)
 * build on top of these.
 *
 * The load-bearing invariant: **read may leave the meta root; write never may.**
 * `validateRepoPath` resolves the user-granted sibling path for reading; every
 * write is built from `(root, name)` and passed through `assertInsideRoot`, so
 * no write can structurally escape the meta root.
 */

/** A validated sibling repo: an existing directory the user granted us to read. */
export interface ValidRepo {
  ok: true;
  /** Absolute path to the sibling repo (the read grant). */
  abs: string;
  /** `path.basename(abs)` — the flat `repos/<name>/` folder name. */
  name: string;
  /** Non-fatal advisories, e.g. `"notAGitRepo"`. */
  warnings: string[];
}

/** A rejected arg: missing, or not a directory. Never aborts the other repos. */
export interface InvalidRepo {
  ok: false;
  reason: string;
}

/** The sibling's own docs, read read-only. `null` = absent/unreadable. */
export interface RepoSourceDocs {
  claudeMd: string | null;
  designMd: string | null;
}

/**
 * Validate a user-supplied repo path (the read grant). Resolves relative args
 * against `cwd`; the arg must exist and be a directory. A missing `.git` (dir
 * OR file — worktrees/submodules use a `.git` file) is a *warning*, never a
 * gate: the path is the authorization, so we honour it.
 */
export async function validateRepoPath(
  arg: string,
  cwd: string
): Promise<ValidRepo | InvalidRepo> {
  const abs = path.resolve(cwd, arg);
  let stat;
  try {
    stat = await fs.stat(abs);
  } catch {
    return { ok: false, reason: "notFound" };
  }
  if (!stat.isDirectory()) {
    return { ok: false, reason: "notADirectory" };
  }
  const warnings: string[] = [];
  if (!(await hasGit(abs))) warnings.push("notAGitRepo");
  return { ok: true, abs, name: path.basename(abs), warnings };
}

/**
 * The write-containment guard. Throws unless `p` resolves to `root` itself or
 * sits strictly inside it (`root + path.sep` prefix). Every write in this
 * module passes through here — a traversal-laden name cannot escape the root.
 */
export function assertInsideRoot(p: string, root: string): void {
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
export async function readRepoSourceDocs(abs: string): Promise<RepoSourceDocs> {
  return {
    claudeMd: await readIfPresent(path.join(abs, "CLAUDE.md")),
    designMd: await readIfPresent(path.join(abs, "DESIGN.md")),
  };
}

async function readIfPresent(file: string): Promise<string | null> {
  try {
    return await fs.readFile(file, "utf8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "EACCES") return null;
    throw err;
  }
}

async function hasGit(abs: string): Promise<boolean> {
  try {
    await fs.stat(path.join(abs, ".git"));
    return true;
  } catch {
    return false;
  }
}

/**
 * The provenance sidecar written to `repos/<name>/.specmanager-repo.json`. This
 * — not the manifest — is the authoritative record of a declared repo. `sourcePath`
 * is stored *relative to the meta root's parent* so the committed sidecar is
 * portable across machines that keep the same workspace layout.
 */
export interface RepoSidecar {
  name: string;
  sourcePath: string;
  hasUi: boolean;
  seededAt: string;
  sourceHadClaudeMd: boolean;
  sourceHadDesignMd: boolean;
}

/** The outcome of seeding one repo: what name it got and what was written this run. */
export interface SeedResult {
  name: string;
  /** `path.relative(path.dirname(root), abs)` — portable, not machine-local. */
  sourcePath: string;
  /** Source had a `DESIGN.md`. */
  hasUi: boolean;
  /** `true` = `repos/<name>/` did not exist before this run (a fresh declaration). */
  added: boolean;
  /** Whether each nested file was actually written this run (write-if-absent). */
  seeded: { claudeMd: boolean; designMd: boolean };
}

/**
 * Resolve final `repos/<name>/` folder names for a declare set, disambiguating
 * same-set basename collisions: when two paths share a basename, **both** become
 * `<parent>__<basename>` (never a silent overwrite). Deeper paths keep their
 * basename, so `repos/` stays exactly one level deep regardless of source depth.
 */
export function disambiguateNames(absPaths: string[]): string[] {
  const counts = new Map<string, number>();
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
export async function seedRepo(
  root: string,
  name: string,
  abs: string,
  docs: RepoSourceDocs
): Promise<SeedResult> {
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

  const wroteClaude = await writeIfAbsent(
    claudeFile,
    docs.claudeMd !== null
      ? `${header}\n\n${docs.claudeMd}`
      : `${header}\n\n_No CLAUDE.md found in source._\n`
  );
  const wroteDesign = await writeIfAbsent(
    designFile,
    docs.designMd !== null
      ? `${header}\n\n${docs.designMd}`
      : `${header}\n\n_This repo has no design system / UI; placeholder kept so the nested tree is uniform._\n`
  );

  const sidecar: RepoSidecar = {
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
function seedHeader(sourcePath: string, iso: string): string {
  return `> Seeded by SpecManager from ${sourcePath} on ${iso}. Read-only mirror; edit the source repo, not this file.`;
}

/** Write only if the file doesn't already exist (`wx`); never clobbers. */
async function writeIfAbsent(file: string, content: string): Promise<boolean> {
  try {
    await fs.writeFile(file, content, { flag: "wx" });
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw err;
  }
}

async function isDirectory(p: string): Promise<boolean> {
  try {
    return (await fs.stat(p)).isDirectory();
  } catch {
    return false;
  }
}
