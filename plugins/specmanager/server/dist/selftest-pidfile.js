// Phase A smoke test — core/pidfile.ts in isolation (no Fastify, no MCP).
//
// Asserts: (1) pidFilePath() env resolution + tmpdir fallback;
// (2) reapStalePid is a no-op when no file exists;
// (3) writePidFile()/removePidFile() round-trips a file with the live PID,
//     and removePidFile() swallows ENOENT;
// (4) a spawned live child is detected alive and SIGTERM'd by reapStalePid,
//     while a dead PID is treated as "no live predecessor".
//
// Usage: node dist/selftest-pidfile.js
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pidFilePath, writePidFile, removePidFile, reapStalePid, isProcessAlive, } from "./core/index.js";
function assert(condition, message) {
    if (!condition)
        throw new Error(`FAIL: ${message}`);
    console.log(`ok — ${message}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Spawn a detached-from-stdio node process that sleeps, returning its pid. */
function spawnSleeper() {
    const child = spawn("node", ["-e", "setTimeout(() => {}, 60000)"], {
        stdio: "ignore",
    });
    return { pid: child.pid, kill: () => child.kill("SIGKILL") };
}
async function main() {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "specmanager-pidfile-"));
    console.log(`tmp dir: ${tmp}`);
    // 1. pidFilePath() env resolution + tmpdir fallback.
    process.env.CLAUDE_PLUGIN_DATA = tmp;
    assert(pidFilePath() === path.join(tmp, "board.pid"), "pidFilePath() resolves under ${CLAUDE_PLUGIN_DATA} when set");
    delete process.env.CLAUDE_PLUGIN_DATA;
    assert(pidFilePath() === path.join(os.tmpdir(), "board.pid"), "pidFilePath() falls back to os.tmpdir() when unset");
    // Point all file ops at our tmp dir for the remaining assertions.
    process.env.CLAUDE_PLUGIN_DATA = tmp;
    // 2. reapStalePid is a no-op when no file exists.
    await removePidFile(); // ensure clean slate (also exercises ENOENT swallow)
    await reapStalePid(4317);
    assert(true, "reapStalePid is a no-op when no pid file exists");
    // 3. write/remove round-trip with the live PID; removePidFile swallows ENOENT.
    await writePidFile();
    const written = await fs.readFile(pidFilePath(), "utf8");
    assert(Number.parseInt(written.trim(), 10) === process.pid, "writePidFile() writes the live process PID");
    await removePidFile();
    let stillThere = true;
    try {
        await fs.access(pidFilePath());
    }
    catch {
        stillThere = false;
    }
    assert(!stillThere, "removePidFile() unlinks the file");
    await removePidFile(); // second remove must not throw (ENOENT swallowed)
    assert(true, "removePidFile() swallows ENOENT on a missing file");
    // 4a. A spawned live child is detected alive and SIGTERM'd by reapStalePid.
    const sleeper = spawnSleeper();
    await fs.writeFile(pidFilePath(), String(sleeper.pid), "utf8");
    assert(isProcessAlive(sleeper.pid), "spawned child is detected alive via signal 0");
    await reapStalePid(4317);
    await sleep(50);
    assert(!isProcessAlive(sleeper.pid), "reapStalePid SIGTERM'd the live predecessor");
    sleeper.kill(); // belt-and-suspenders cleanup
    await removePidFile();
    // 4b. A dead PID is treated as "no live predecessor".
    const dead = spawnSleeper();
    const deadPid = dead.pid;
    dead.kill();
    await sleep(50);
    assert(!isProcessAlive(deadPid), "killed child is no longer alive");
    await fs.writeFile(pidFilePath(), String(deadPid), "utf8");
    await reapStalePid(4317); // must not throw and must not block on a dead PID
    assert(true, "reapStalePid treats a dead PID as no live predecessor");
    await removePidFile();
    delete process.env.CLAUDE_PLUGIN_DATA;
    console.log("\nAll Phase A pidfile assertions passed.");
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=selftest-pidfile.js.map