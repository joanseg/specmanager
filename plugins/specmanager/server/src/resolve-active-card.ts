#!/usr/bin/env node
// CLI shim for the Stop-gate hook: reads the hook JSON on stdin and prints the
// GateCard as JSON, or the literal `null`. Never crashes: empty or garbage
// stdin, or any internal error, prints `null` and exits 0. Resolves the project
// root from SPECMANAGER_PROJECT_DIR ?? CLAUDE_PROJECT_DIR ?? cwd.
//
// Transitional: an argv[2] (the stopping session's id, possibly empty) selects
// the legacy form, resolveActiveCard(root, sessionId), until the hook pipes the
// hook JSON on stdin instead (task-012).

import { resolveActiveCard, resolveGateCard, type GateHookInput } from "./core/index.js";

const root =
  process.env.SPECMANAGER_PROJECT_DIR ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

async function readStdin(): Promise<string> {
  let s = "";
  for await (const chunk of process.stdin) s += chunk;
  return s;
}

/** The hook JSON, or null when stdin is not a JSON object. */
function parseHook(raw: string): GateHookInput | null {
  try {
    const v: unknown = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as GateHookInput) : null;
  } catch {
    return null;
  }
}

async function resolve(): Promise<unknown> {
  if (process.argv.length > 2) return resolveActiveCard(root, process.argv[2] || null);
  const hook = parseHook(await readStdin());
  return hook ? resolveGateCard(hook, root) : null;
}

resolve()
  .then((card) => {
    process.stdout.write(JSON.stringify(card ?? null));
  })
  .catch((err) => {
    process.stderr.write(`resolve-active-card: ${(err as Error).message}\n`);
    process.stdout.write("null");
  });
