// Phase A smoke test — core/pidfile.ts in isolation (no Fastify, no MCP).
//
// Asserts: (1) pidFilePath(root) env resolution + tmpdir fallback, per-project
//     hashed filename;
// (2) two distinct roots yield two distinct pidfile paths;
// (3) reapStalePid is a no-op when no file exists;
// (4) writePidFile(root)/removePidFile(root) round-trips a file with the live
//     PID, and removePidFile() swallows ENOENT;
// (5) a spawned live child is detected alive and SIGTERM'd by reapStalePid,
//     while a dead PID is treated as "no live predecessor";
// (6) reapStalePid(port, rootB) never touches rootA's pidfile or process —
//     the R3 cross-project safety property.
//
// Usage: node dist/selftest-pidfile.js
import { createHash } from "node:crypto";
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
/** Mirrors pidFilePath()'s hashing scheme so the test can predict the filename. */
function hash8(root) {
    return createHash("sha1").update(root).digest("hex").slice(0, 8);
}
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
    const rootA = path.join(tmp, "project-a");
    const rootB = path.join(tmp, "project-b");
    // 1. pidFilePath(root) env resolution + tmpdir fallback, per-root hashed filename.
    process.env.CLAUDE_PLUGIN_DATA = tmp;
    assert(pidFilePath(rootA) === path.join(tmp, `board-${hash8(rootA)}.pid`), "pidFilePath(root) resolves under ${CLAUDE_PLUGIN_DATA} with a board-<hash8>.pid filename");
    delete process.env.CLAUDE_PLUGIN_DATA;
    assert(pidFilePath(rootA) === path.join(os.tmpdir(), `board-${hash8(rootA)}.pid`), "pidFilePath(root) falls back to os.tmpdir() when unset");
    // Point all file ops at our tmp dir for the remaining assertions.
    process.env.CLAUDE_PLUGIN_DATA = tmp;
    // 2. Distinct roots yield distinct pidfile paths.
    assert(pidFilePath(rootA) !== pidFilePath(rootB), "pidFilePath() yields distinct paths for distinct project roots");
    // 3. reapStalePid is a no-op when no file exists.
    await removePidFile(rootA); // ensure clean slate (also exercises ENOENT swallow)
    await reapStalePid(4317, rootA);
    assert(true, "reapStalePid(port, root) is a no-op when no pid file exists");
    // 4. write/remove round-trip with the live PID; removePidFile swallows ENOENT.
    await writePidFile(rootA);
    const written = await fs.readFile(pidFilePath(rootA), "utf8");
    assert(Number.parseInt(written.trim(), 10) === process.pid, "writePidFile(root) writes the live process PID");
    await removePidFile(rootA);
    let stillThere = true;
    try {
        await fs.access(pidFilePath(rootA));
    }
    catch {
        stillThere = false;
    }
    assert(!stillThere, "removePidFile(root) unlinks the file");
    await removePidFile(rootA); // second remove must not throw (ENOENT swallowed)
    assert(true, "removePidFile(root) swallows ENOENT on a missing file");
    // 5a. A spawned live child is detected alive and SIGTERM'd by reapStalePid.
    const sleeper = spawnSleeper();
    await fs.writeFile(pidFilePath(rootA), String(sleeper.pid), "utf8");
    assert(isProcessAlive(sleeper.pid), "spawned child is detected alive via signal 0");
    await reapStalePid(4317, rootA);
    await sleep(50);
    assert(!isProcessAlive(sleeper.pid), "reapStalePid(port, root) SIGTERM'd the live predecessor");
    sleeper.kill(); // belt-and-suspenders cleanup
    await removePidFile(rootA);
    // 5b. A dead PID is treated as "no live predecessor".
    const dead = spawnSleeper();
    const deadPid = dead.pid;
    dead.kill();
    await sleep(50);
    assert(!isProcessAlive(deadPid), "killed child is no longer alive");
    await fs.writeFile(pidFilePath(rootA), String(deadPid), "utf8");
    await reapStalePid(4317, rootA); // must not throw and must not block on a dead PID
    assert(true, "reapStalePid(port, root) treats a dead PID as no live predecessor");
    await removePidFile(rootA);
    // 6. Cross-project safety (R3): reaping project B must never touch project A.
    const sleeperA = spawnSleeper();
    await fs.writeFile(pidFilePath(rootA), String(sleeperA.pid), "utf8");
    await removePidFile(rootB); // ensure B starts with no pidfile of its own
    await reapStalePid(4317, rootB);
    assert(isProcessAlive(sleeperA.pid), "reapStalePid(port, rootB) does not kill rootA's live process");
    const stillA = await fs.readFile(pidFilePath(rootA), "utf8");
    assert(Number.parseInt(stillA.trim(), 10) === sleeperA.pid, "reapStalePid(port, rootB) leaves rootA's pidfile untouched");
    sleeperA.kill();
    await removePidFile(rootA);
    delete process.env.CLAUDE_PLUGIN_DATA;
    console.log("\nAll Phase A pidfile assertions passed.");
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=selftest-pidfile.js.map