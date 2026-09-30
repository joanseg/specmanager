#!/usr/bin/env node
// Tiny CLI shim for the Stop-gate hook: prints the active card as JSON (or the
// literal `null`) so discovery stays in TS/core, not bash heuristics. Resolves
// the project root from SPECMANAGER_PROJECT_DIR ?? CLAUDE_PROJECT_DIR ?? cwd.
// Optional argv[2] is the stopping session's id (scopes the gate to its build).
import { resolveActiveCard } from "./core/index.js";
const root = process.env.SPECMANAGER_PROJECT_DIR ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const sessionId = process.argv[2] || null;
resolveActiveCard(root, sessionId)
    .then((card) => {
    process.stdout.write(JSON.stringify(card));
})
    .catch((err) => {
    // Never crash the hook: print null so the gate is a no-op pass.
    process.stderr.write(`resolve-active-card: ${err.message}\n`);
    process.stdout.write("null");
});
