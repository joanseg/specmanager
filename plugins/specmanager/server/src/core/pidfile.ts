import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { projectRoot } from "./paths.js";

/**
 * Resolve the board-server PID file path, scoped to a project `root`.
 *
 * Prefers `${CLAUDE_PLUGIN_DATA}/board-<hash8>.pid` (the plugin's persistent
 * data dir), falling back to the OS temp dir when the env var is unset. The
 * filename is keyed on a short sha1 of `root` so distinct projects never
 * share a PID file. Pure path resolution — no filesystem side effects.
 */
export function pidFilePath(root: string = projectRoot()): string {
  const dir = process.env.CLAUDE_PLUGIN_DATA ?? os.tmpdir();
  const hash = createHash("sha1").update(root).digest("hex").slice(0, 8);
  return path.join(dir, `board-${hash}.pid`);
}

/**
 * Record the current process as the board owner by writing its PID.
 * Best-effort: write errors are swallowed per the teardown convention.
 */
export async function writePidFile(root: string = projectRoot()): Promise<void> {
  try {
    await fs.writeFile(pidFilePath(root), String(process.pid), "utf8");
  } catch {
    // best-effort — losing the pid file only weakens the reap backstop
  }
}

/**
 * Remove the board PID file. Ignores ENOENT (already gone) and swallows
 * any other unlink error per the best-effort teardown convention.
 */
export async function removePidFile(root: string = projectRoot()): Promise<void> {
  try {
    await fs.unlink(pidFilePath(root));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      // best-effort — a leftover pid file is reaped on next boot anyway
    }
  }
}

/**
 * Probe whether `pid` names a live process via signal 0.
 *
 * Success and `EPERM` both mean the process exists (EPERM = it exists but we
 * lack permission to signal it). `ESRCH` means no such process. Any other
 * outcome is treated as not-live.
 */
export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** Read the PID file and parse its integer PID, or null if absent/unparsable. */
async function readPid(root: string): Promise<number | null> {
  let raw: string;
  try {
    raw = await fs.readFile(pidFilePath(root), "utf8");
  } catch {
    return null;
  }
  const pid = Number.parseInt(raw.trim(), 10);
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

/**
 * Reap a stale board predecessor recorded in the project-scoped PID file.
 *
 * If the file names a live process, SIGTERM it and wait ~200ms for it to
 * release the port. A missing file, unparsable PID, or already-dead process
 * is a no-op. The `port` is accepted for caller symmetry with the bind that
 * follows. Never throws.
 */
export async function reapStalePid(port: number, root: string = projectRoot()): Promise<void> {
  void port;
  const pid = await readPid(root);
  if (pid === null || !isProcessAlive(pid)) return;
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // already gone between the probe and the signal — nothing to reap
  }
  await new Promise((resolve) => setTimeout(resolve, 200));
}
