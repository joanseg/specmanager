// Autoport selftest — preferred-port fallback + two-session isolation.
// (Modelled on selftest-shutdown.ts: reuses its portIsFree() probe and its
// spawn-dist/mcp.js-on-a-non-default-SPECMANAGER_BOARD_PORT pattern.)
//
// Proves the multi-session auto-port win:
//   1. Fallback bind: occupy the preferred port with a plain `net` server, boot
//      ONE MCP child on that preferred port, assert its board bound `preferred+1`
//      and that `board_url` reports that real port with `available: true`.
//   2. Two-session isolation: boot TWO MCP children on the SAME preferred port
//      but in TWO DISTINCT temp project dirs → assert two DISTINCT bound ports
//      and BOTH stay alive (the per-project pidfile means neither reaps its peer).
//   3. Teardown: stop everything and assert both bound ports are freed.
//
// Uses a non-default preferred port so it never collides with a real board on
// 4317 (or selftest-shutdown's 4319). Never leaves orphaned children or the
// `net` occupier — all cleanup runs in a finally.
//
// Usage: node dist/selftest-autoport.js

import { spawn, ChildProcessWithoutNullStreams } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const mcp = path.join(here, "mcp.js");

// Resolved in main() before any assertion runs. A hard-coded default (this
// used to be 4321) is unsafe here for the same reason as selftest-shutdown,
// and doubly so: this suite asserts fall-forward to PREFERRED+1, so it needs
// a free *pair*. On a machine running several boards — which the auto-port
// feature under test exists to support — a fixed pair is routinely taken.
// An explicit SPECMANAGER_BOARD_PORT still wins.
let PREFERRED = Number(process.env.SPECMANAGER_BOARD_PORT ?? 0);

/** First p in [start, start+span) where both p and p+1 are unbound. */
async function findFreePair(start = 4500, span = 400): Promise<number> {
  for (let p = start; p < start + span; p++) {
    if ((await portIsFree(p)) && (await portIsFree(p + 1))) return p;
  }
  throw new Error(`FAIL: no free port pair in ${start}..${start + span - 1}`);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`ok — ${message}`);
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Resolves true if 127.0.0.1:port is bindable (i.e. nobody is listening). */
function portIsFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once("error", () => resolve(false));
    probe.once("listening", () => probe.close(() => resolve(true)));
    probe.listen(port, "127.0.0.1");
  });
}

/** Bind a plain TCP server to occupy a port for the duration of the test. */
function occupy(port: number): Promise<net.Server> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", reject);
    srv.listen(port, "127.0.0.1", () => resolve(srv));
  });
}

/** Extract the port from a `http://127.0.0.1:<port>` board URL. */
function portFromUrl(url: string): number {
  const port = Number(new URL(url).port);
  if (!Number.isInteger(port) || port <= 0) throw new Error(`bad board url: ${url}`);
  return port;
}

interface Session {
  child: ChildProcessWithoutNullStreams;
  /** Call an MCP tool over stdio and return its `data` payload. */
  callTool: (name: string) => Promise<any>;
}

/**
 * Spawn dist/mcp.js bound to `preferred` inside `projectDir`, complete the MCP
 * handshake, and return a handle that can call tools over stdio.
 */
async function spawnSession(preferred: number, projectDir: string): Promise<Session> {
  const child = spawn("node", [mcp], {
    env: {
      ...process.env,
      SPECMANAGER_PROJECT_DIR: projectDir,
      SPECMANAGER_BOARD_PORT: String(preferred),
    },
    stdio: ["pipe", "pipe", "pipe"],
  });

  const responses: any[] = [];
  let buffer = "";
  child.stdout.on("data", (chunk: Buffer) => {
    buffer += chunk.toString("utf8");
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        responses.push(JSON.parse(line));
      } catch {
        // ignore non-JSON lines
      }
    }
  });

  const waitFor = async (pred: (r: any) => boolean, ms = 3000): Promise<any> => {
    const start = Date.now();
    while (Date.now() - start < ms) {
      const hit = responses.find(pred);
      if (hit) return hit;
      await sleep(20);
    }
    throw new Error("timed out waiting for MCP response");
  };

  let nextId = 2;
  child.stdin.write(
    JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "selftest-autoport", version: "0.0.0" },
      },
    }) + "\n"
  );
  await waitFor((r) => r.id === 1 && r.result);
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

  // Give the board server a moment to finish binding before we probe it.
  await sleep(400);

  const callTool = async (name: string): Promise<any> => {
    const id = nextId++;
    child.stdin.write(
      JSON.stringify({ jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: {} } }) + "\n"
    );
    const res = await waitFor((r) => r.id === id && r.result);
    const payload = JSON.parse(res.result.content[0].text);
    if (!payload.ok) throw new Error(`tool ${name} failed: ${payload.error}`);
    return payload.data;
  };

  return { child, callTool };
}

/** Wait for the child to exit, returning its exit code (or null on signal). */
function waitForExit(child: ChildProcessWithoutNullStreams, ms = 3000): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timed out waiting for child exit")), ms);
    child.once("exit", (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });
}

async function main(): Promise<void> {
  const children: ChildProcessWithoutNullStreams[] = [];
  const tmpDirs: string[] = [];
  let occupier: net.Server | null = null;

  const mkProjectDir = (): string => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sm-autoport-"));
    tmpDirs.push(dir);
    return dir;
  };

  try {
    if (!PREFERRED) PREFERRED = await findFreePair();
    assert(await portIsFree(PREFERRED), `preferred port ${PREFERRED} is free before the test`);
    assert(
      await portIsFree(PREFERRED + 1),
      `fall-forward target ${PREFERRED + 1} is free before the test`
    );

    // 1. Fallback bind — preferred port occupied, board must land on preferred+1.
    {
      occupier = await occupy(PREFERRED);
      assert(!(await portIsFree(PREFERRED)), `preferred port ${PREFERRED} occupied by net server`);

      const session = await spawnSession(PREFERRED, mkProjectDir());
      children.push(session.child);

      const info = await session.callTool("board_url");
      assert(info.available === true, "board_url reports available:true");
      assert(info.preferredPort === PREFERRED, `board_url echoes preferredPort ${PREFERRED}`);
      const boundPort = portFromUrl(info.url);
      assert(boundPort === PREFERRED + 1, `board fell forward to preferred+1 (${PREFERRED + 1}), got ${boundPort}`);
      assert(!(await portIsFree(boundPort)), `board is actually listening on ${boundPort}`);

      // Tear this one down and free the occupier before the isolation case.
      session.child.stdin.end();
      await waitForExit(session.child);
      await sleep(150);
      assert(await portIsFree(boundPort), `fallback port ${boundPort} freed after exit`);

      await new Promise<void>((r) => occupier!.close(() => r()));
      occupier = null;
      assert(await portIsFree(PREFERRED), `preferred port ${PREFERRED} freed after occupier closed`);
    }

    // 2. Two-session isolation — two children, same preferred, distinct project
    //    dirs → two distinct bound ports, both alive (no peer-reap).
    let portA = 0;
    let portB = 0;
    {
      const sessionA = await spawnSession(PREFERRED, mkProjectDir());
      children.push(sessionA.child);
      const sessionB = await spawnSession(PREFERRED, mkProjectDir());
      children.push(sessionB.child);

      const infoA = await sessionA.callTool("board_url");
      const infoB = await sessionB.callTool("board_url");
      assert(infoA.available === true, "session A board_url available:true");
      assert(infoB.available === true, "session B board_url available:true");

      portA = portFromUrl(infoA.url);
      portB = portFromUrl(infoB.url);
      assert(portA !== portB, `two sessions got DISTINCT bound ports (A=${portA}, B=${portB})`);

      // The core win: booting B must not have reaped A (shared-global-pidfile bug).
      assert(sessionA.child.exitCode === null, "session A still alive after B booted (no peer-reap)");
      assert(sessionB.child.exitCode === null, "session B still alive");
      assert(!(await portIsFree(portA)), `session A still listening on ${portA}`);
      assert(!(await portIsFree(portB)), `session B still listening on ${portB}`);

      // 3. Teardown — stop both (sequentially, one board at a time) and assert
      //    both ports freed.
      sessionA.child.stdin.end();
      await waitForExit(sessionA.child);
      sessionB.child.stdin.end();
      await waitForExit(sessionB.child);
      await sleep(150);
      assert(await portIsFree(portA), `session A port ${portA} freed after teardown`);
      assert(await portIsFree(portB), `session B port ${portB} freed after teardown`);
    }

    console.log("\nAll autoport assertions passed.");
  } finally {
    for (const child of children) {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    }
    if (occupier) occupier.close();
    for (const dir of tmpDirs) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        // best-effort temp cleanup
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
