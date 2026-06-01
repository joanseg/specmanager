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
export function pidFilePath() {
    const dir = process.env.CLAUDE_PLUGIN_DATA ?? os.tmpdir();
    return path.join(dir, "board.pid");
}
/**
 * Record the current process as the board owner by writing its PID.
 * Best-effort: write errors are swallowed per the teardown convention.
 */
export async function writePidFile() {
    try {
        await fs.writeFile(pidFilePath(), String(process.pid), "utf8");
    }
    catch {
        // best-effort — losing the pid file only weakens the reap backstop
    }
}
/**
 * Remove the board PID file. Ignores ENOENT (already gone) and swallows
 * any other unlink error per the best-effort teardown convention.
 */
export async function removePidFile() {
    try {
        await fs.unlink(pidFilePath());
    }
    catch (err) {
        if (err.code !== "ENOENT") {
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
export function isProcessAlive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    }
    catch (err) {
        return err.code === "EPERM";
    }
}
/** Read the PID file and parse its integer PID, or null if absent/unparsable. */
async function readPid() {
    let raw;
    try {
        raw = await fs.readFile(pidFilePath(), "utf8");
    }
    catch {
        return null;
    }
    const pid = Number.parseInt(raw.trim(), 10);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
}
/**
 * Reap a stale board predecessor recorded in the PID file.
 *
 * If the file names a live process, SIGTERM it and wait ~200ms for it to
 * release the port. A missing file, unparsable PID, or already-dead process
 * is a no-op. The `port` is accepted for caller symmetry with the bind that
 * follows. Never throws.
 */
export async function reapStalePid(port) {
    void port;
    const pid = await readPid();
    if (pid === null || !isProcessAlive(pid))
        return;
    try {
        process.kill(pid, "SIGTERM");
    }
    catch {
        // already gone between the probe and the signal — nothing to reap
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
}
//# sourceMappingURL=pidfile.js.map