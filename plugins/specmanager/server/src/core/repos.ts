import fs from "node:fs/promises";
import path from "node:path";

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
