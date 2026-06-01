// Phase C selftest — MCP self-termination teardown paths (modelled on smoke-mcp.ts).
//
// Spawns dist/mcp.js on a non-default board port, completes the MCP handshake,
// then exercises three teardown paths, asserting a clean exit and a freed port
// after each:
//   1. stdin-EOF: child.stdin.end() with NO signal → child exits, port freed.
//   2. Idempotent teardown: SIGTERM + stdin EOF together → exactly one clean exit,
//      no double-close errors on stderr.
//   3. SIGHUP: same clean shutdown → child exits, port freed.
//
// Uses a non-default SPECMANAGER_BOARD_PORT so it never collides with a real
// board on 4317. Never leaves orphaned children — cleanup runs in a finally.
//
// Usage: node dist/selftest-shutdown.js
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const mcp = path.join(here, "mcp.js");
const TEST_PORT = Number(process.env.SPECMANAGER_BOARD_PORT ?? 4319);
function assert(condition, message) {
    if (!condition)
        throw new Error(`FAIL: ${message}`);
    console.log(`ok — ${message}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Resolves true if 127.0.0.1:port is bindable (i.e. nobody is listening). */
function portIsFree(port) {
    return new Promise((resolve) => {
        const probe = net.createServer();
        probe.once("error", () => resolve(false));
        probe.once("listening", () => probe.close(() => resolve(true)));
        probe.listen(port, "127.0.0.1");
    });
}
/** Spawn dist/mcp.js bound to TEST_PORT and complete the MCP handshake. */
async function spawnAndHandshake() {
    const child = spawn("node", [mcp], {
        env: {
            ...process.env,
            SPECMANAGER_PROJECT_DIR: process.env.SPECMANAGER_PROJECT_DIR ?? process.cwd(),
            SPECMANAGER_BOARD_PORT: String(TEST_PORT),
        },
        stdio: ["pipe", "pipe", "pipe"],
    });
    let stderrBuf = "";
    child.stderr.on("data", (c) => {
        stderrBuf += c.toString("utf8");
    });
    let buffer = "";
    const responses = [];
    child.stdout.on("data", (chunk) => {
        buffer += chunk.toString("utf8");
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
            if (!line.trim())
                continue;
            try {
                responses.push(JSON.parse(line));
            }
            catch {
                // ignore non-JSON lines
            }
        }
    });
    const waitFor = async (pred, ms = 3000) => {
        const start = Date.now();
        while (Date.now() - start < ms) {
            const hit = responses.find(pred);
            if (hit)
                return hit;
            await sleep(20);
        }
        throw new Error("timed out waiting for MCP response");
    };
    child.stdin.write(JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
            protocolVersion: "2025-06-18",
            capabilities: {},
            clientInfo: { name: "selftest-shutdown", version: "0.0.0" },
        },
    }) + "\n");
    await waitFor((r) => r.id === 1 && r.result);
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
    // Give the board server a moment to bind TEST_PORT before we tear down.
    await sleep(300);
    return { child, stderr: () => stderrBuf };
}
/** Wait for the child to exit, returning its exit code (or null on signal). */
function waitForExit(child, ms = 3000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("timed out waiting for child exit")), ms);
        child.once("exit", (code) => {
            clearTimeout(timer);
            resolve(code);
        });
    });
}
async function main() {
    const children = [];
    try {
        assert(await portIsFree(TEST_PORT), `port ${TEST_PORT} is free before the test`);
        // 1. stdin-EOF teardown: no signal, just close stdin.
        {
            const { child } = await spawnAndHandshake();
            children.push(child);
            assert(!(await portIsFree(TEST_PORT)), `board bound port ${TEST_PORT} after handshake`);
            child.stdin.end();
            const code = await waitForExit(child);
            assert(code === 0, "stdin-EOF: child exited cleanly (code 0)");
            await sleep(100);
            assert(await portIsFree(TEST_PORT), `stdin-EOF: port ${TEST_PORT} freed after exit`);
        }
        // 2. Idempotent teardown: SIGTERM + stdin EOF together → one clean exit.
        {
            const { child, stderr } = await spawnAndHandshake();
            children.push(child);
            assert(!(await portIsFree(TEST_PORT)), `board re-bound port ${TEST_PORT} for idempotency case`);
            child.kill("SIGTERM");
            child.stdin.end();
            const code = await waitForExit(child);
            assert(code === 0, "idempotent: child exited cleanly once (code 0)");
            await sleep(100);
            assert(await portIsFree(TEST_PORT), `idempotent: port ${TEST_PORT} freed after exit`);
            const errOut = stderr();
            const hasDoubleClose = /ERR_SERVER_NOT_RUNNING/.test(errOut) || /Server is not running/i.test(errOut);
            assert(!hasDoubleClose, "idempotent: no double-close errors on stderr");
        }
        // 3. SIGHUP path: same clean shutdown.
        {
            const { child } = await spawnAndHandshake();
            children.push(child);
            assert(!(await portIsFree(TEST_PORT)), `board re-bound port ${TEST_PORT} for SIGHUP case`);
            child.kill("SIGHUP");
            const code = await waitForExit(child);
            assert(code === 0, "SIGHUP: child exited cleanly (code 0)");
            await sleep(100);
            assert(await portIsFree(TEST_PORT), `SIGHUP: port ${TEST_PORT} freed after exit`);
        }
        console.log("\nAll Phase C shutdown assertions passed.");
    }
    finally {
        for (const child of children) {
            if (child.exitCode === null && child.signalCode === null)
                child.kill("SIGKILL");
        }
    }
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=selftest-shutdown.js.map