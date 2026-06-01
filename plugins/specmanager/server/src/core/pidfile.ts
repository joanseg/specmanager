import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * Resolve the board-server PID file path.
 *
 * Prefers `${CLAUDE_PLUGIN_DATA}/board.pid` (the plugin's persistent data dir),
 * falling back to the OS temp dir when the env var is unset. Pure path
 * resolution — no filesystem side effects.
 */
export function pidFilePath(): string {
  const dir = process.env.CLAUDE_PLUGIN_DATA ?? os.tmpdir();
  return path.join(dir, "board.pid");
}

/**
 * Record the current process as the board owner by writing its PID.
 * Best-effort: write errors are swallowed per the teardown convention.
 */
export async function writePidFile(): Promise<void> {
  try {
    await fs.writeFile(pidFilePath(), String(process.pid), "utf8");
  } catch {
    // best-effort — losing the pid file only weakens the reap backstop
  }
}

/**
 * Remove the board PID file. Ignores ENOENT (already gone) and swallows
 * any other unlink error per the best-effort teardown convention.
 */
export async function removePidFile(): Promise<void> {
  try {
    await fs.unlink(pidFilePath());
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      // best-effort — a leftover pid file is reaped on next boot anyway
    }
  }
}
