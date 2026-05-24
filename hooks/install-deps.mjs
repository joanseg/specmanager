#!/usr/bin/env node
// SessionStart hook: install server deps into ${CLAUDE_PLUGIN_DATA}
// so they survive plugin updates. Skips work when manifests already match.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.env.CLAUDE_PLUGIN_ROOT;
const data = process.env.CLAUDE_PLUGIN_DATA;

if (!root || !data) {
  console.error(
    "specmanager: CLAUDE_PLUGIN_ROOT or CLAUDE_PLUGIN_DATA not set; skipping dep install"
  );
  process.exit(0);
}

const src = path.join(root, "server", "package.json");
const dst = path.join(data, "package.json");
const nodeModules = path.join(data, "node_modules");

if (!fs.existsSync(src)) {
  console.error(`specmanager: missing ${src}; run \`cd server && npm install && npm run build\` in the plugin source`);
  process.exit(0);
}

fs.mkdirSync(data, { recursive: true });

let identical = false;
try {
  identical =
    fs.existsSync(dst) &&
    fs.readFileSync(src, "utf8") === fs.readFileSync(dst, "utf8") &&
    fs.existsSync(nodeModules);
} catch {
  identical = false;
}

if (identical) process.exit(0);

console.log("specmanager: installing server dependencies into CLAUDE_PLUGIN_DATA…");
fs.copyFileSync(src, dst);
try {
  execFileSync("npm", ["install", "--omit=dev", "--no-audit", "--no-fund"], {
    cwd: data,
    stdio: "inherit",
  });
} catch (err) {
  console.error("specmanager: npm install failed:", err?.message ?? err);
  process.exit(0); // never block the session
}
