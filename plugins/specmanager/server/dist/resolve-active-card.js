#!/usr/bin/env node
// CLI shim for the Stop-gate hook: reads the hook JSON on stdin and prints the
// GateCard as JSON, or the literal `null`. Never crashes: empty or garbage
// stdin, or any internal error, prints `null` and exits 0. Resolves the project
// root from SPECMANAGER_PROJECT_DIR ?? CLAUDE_PROJECT_DIR ?? cwd.
import { resolveGateCard } from "./core/index.js";
const root = process.env.SPECMANAGER_PROJECT_DIR ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
async function readStdin() {
    let s = "";
    for await (const chunk of process.stdin)
        s += chunk;
    return s;
}
/** The hook JSON, or null when stdin is not a JSON object. */
function parseHook(raw) {
    try {
        const v = JSON.parse(raw);
        return v && typeof v === "object" && !Array.isArray(v) ? v : null;
    }
    catch {
        return null;
    }
}
async function resolve() {
    const hook = parseHook(await readStdin());
    return hook ? resolveGateCard(hook, root) : null;
}
resolve()
    .then((card) => {
    process.stdout.write(JSON.stringify(card ?? null));
})
    .catch((err) => {
    process.stderr.write(`resolve-active-card: ${err.message}\n`);
    process.stdout.write("null");
});
