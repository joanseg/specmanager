// Spawns dist/mcp.js, performs the MCP handshake over stdio, and lists tools.
// Verifies the wire protocol is wired up correctly without needing a real client.

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const mcp = path.join(here, "mcp.js");

const child = spawn("node", [mcp], {
  env: {
    ...process.env,
    SPECMANAGER_PROJECT_DIR: process.env.SPECMANAGER_PROJECT_DIR ?? process.cwd(),
  },
  stdio: ["pipe", "pipe", "inherit"],
});

let buffer = "";
const responses: unknown[] = [];

child.stdout.on("data", (chunk: Buffer) => {
  buffer += chunk.toString("utf8");
  const lines = buffer.split("\n");
  buffer = lines.pop() ?? "";
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      responses.push(JSON.parse(line));
    } catch {
      // ignore non-JSON lines (server may emit nothing else, but be tolerant)
    }
  }
});

function send(obj: unknown): void {
  child.stdin.write(JSON.stringify(obj) + "\n");
}

async function waitFor(predicate: (r: any) => boolean, ms = 3000): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const hit = responses.find(predicate);
    if (hit) return hit;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error("timed out waiting for response");
}

async function main(): Promise<void> {
  send({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "smoke", version: "0.0.0" },
    },
  });
  await waitFor((r: any) => r.id === 1 && r.result);
  console.log("ok — initialize handshake");

  send({ jsonrpc: "2.0", method: "notifications/initialized" });
  send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
  const listing = await waitFor((r: any) => r.id === 2 && r.result);
  const names = (listing.result.tools as Array<{ name: string }>).map((t) => t.name).sort();
  console.log(`ok — tools/list returned ${names.length} tools`);
  const expected = [
    "board_url",
    "check_gate",
    "create_document",
    "create_feature",
    "create_task",
    "link_documents",
    "list_documents",
    "list_features",
    "list_stale",
    "list_tasks",
    "open_board",
    "read_document",
    "set_status",
    "specmanager_init",
    "sync_claude_md",
    "update_task",
    "write_document",
  ];
  const missing = expected.filter((n) => !names.includes(n));
  if (missing.length > 0) throw new Error(`missing tools: ${missing.join(", ")}`);
  console.log(`ok — all ${expected.length} tools registered`);

  child.kill("SIGTERM");
}

main()
  .catch((err) => {
    console.error(err);
    child.kill("SIGKILL");
    process.exit(1);
  })
  .finally(() => {
    setTimeout(() => process.exit(0), 100);
  });
