// R8/inventory — selftest-prompts.ts harness.
//
// A PromptInvariant asserts that some statement (a fact, a rule, a
// prohibition — something other code already enforces) appears the right
// number of times across a set of prompt files. `min` proves a required
// statement survives a prompt trim; `max` proves a forbidden or duplicated
// one hasn't crept back in. Both directions matter: a check with no `max`
// would pass by never trimming anything, and one with no `min` would pass
// by deleting the statement outright.
//
// The INVARIANTS table is populated incrementally by inventory tasks. The
// reconciled INV-1…INV-14 entries land separately (task-011); this file
// currently carries only the INV-15 snippet-parity pair, added additively
// so a concurrent edit to the array merges cleanly.
//
// Usage: node dist/selftest-prompts.js
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
function assert(cond, msg) {
    if (!cond)
        throw new Error(`FAIL: ${msg}`);
    console.log(`ok — ${msg}`);
}
// dist/selftest-prompts.js → plugin root is two levels up from server/dist.
const here = path.dirname(fileURLToPath(import.meta.url)); // .../server/dist
const PLUGIN_ROOT = path.resolve(here, "..", ".."); // .../plugins/specmanager
// Populated by later inventory tasks (the reconciled INV-1…INV-15 table and
// the INV-15 snippet-parity pair). Mostly empty for now — the loop below is
// close to a no-op against a near-empty table, which is the point: the
// harness must be provably green before anything relies on it.
//
// INV-15 — snippet parity (R8). `docs/agent-snippets/design-grounding.md`
// is the canonical source for a fragment copy-pasted into three agents
// (no include mechanism exists for agent prompts). The R8 defect was the
// canonical text and `architect.md` saying `read_document` for the design
// doc while `planner.md`/`builder.md` correctly said "read the HTML file
// directly with `Read` on the `filePath`". This is a pattern *pair*, not
// byte equality of the whole fragment — the agents legitimately adapt
// their framing sentences around the shared method clause.
const INVARIANTS = [
    {
        id: "INV-15a",
        what: "design grounding reads the HTML via `Read` on the listing's `filePath`, never `read_document` (R8) — positive half, 3 carriers",
        pattern: "read the HTML file directly with `Read` on the `filePath` the listing returns (chunked with offset/limit for large files) — not `read_document`, which JSON-escapes the whole body.",
        files: ["agents/architect.md", "agents/planner.md", "agents/builder.md"],
        min: 3,
        max: 3,
    },
    {
        id: "INV-15b",
        what: "design grounding never reverts to the superseded `read_document`-for-the-design-doc wording (R8) — negative half",
        // Anchored on the design-doc context specifically (`design doc exists,
        // \`read_document\` it`), not a bare `read_document` — architect.md
        // legitimately uses `read_document` for the PRD elsewhere.
        pattern: /design doc exists,\s*`read_document`\s*it\b/gi,
        files: [
            "../../docs/agent-snippets/design-grounding.md",
            "agents/architect.md",
            "agents/planner.md",
            "agents/builder.md",
        ],
        min: 0,
        max: 0,
    },
];
const fileCache = new Map();
async function readPromptFile(relPath) {
    const cached = fileCache.get(relPath);
    if (cached !== undefined)
        return cached;
    const abs = path.join(PLUGIN_ROOT, relPath);
    const content = await fs.readFile(abs, "utf8");
    fileCache.set(relPath, content);
    return content;
}
function countMatches(content, pattern) {
    if (typeof pattern === "string") {
        if (pattern === "")
            return 0;
        let count = 0;
        let idx = 0;
        while ((idx = content.indexOf(pattern, idx)) !== -1) {
            count++;
            idx += pattern.length;
        }
        return count;
    }
    const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
    const global = new RegExp(pattern.source, flags);
    return content.match(global)?.length ?? 0;
}
async function checkInvariant(inv) {
    const perFile = {};
    let total = 0;
    for (const relPath of inv.files) {
        const content = await readPromptFile(relPath);
        const count = countMatches(content, inv.pattern);
        perFile[relPath] = count;
        total += count;
    }
    const breakdown = Object.entries(perFile)
        .map(([f, c]) => `${f}:${c}`)
        .join(", ");
    assert(total >= inv.min && total <= inv.max, `${inv.id} — ${inv.what} (want ${inv.min}..${inv.max}, got ${total}) [${breakdown}]`);
}
async function main() {
    assert(Array.isArray(INVARIANTS), "INVARIANTS is an array");
    for (const inv of INVARIANTS) {
        await checkInvariant(inv);
    }
    console.log(`\nAll prompt invariant assertions passed (${INVARIANTS.length} invariant${INVARIANTS.length === 1 ? "" : "s"} checked).`);
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=selftest-prompts.js.map