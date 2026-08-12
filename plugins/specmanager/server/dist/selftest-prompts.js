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
// The INVARIANTS table encodes `docs/prompt-invariants-reconciled.md`
// (task-002): Part A's corrected INV-1…INV-15 and Part B's added
// INV-16…INV-37 — 37 reconciled entries. A few are encoded as lettered
// rows (INV-14a…e, INV-27a…c, INV-36a/b, and the pre-existing INV-15a/b)
// because the reconciliation calls for one pattern per independently
// deletable clause: a single whole-block pattern stays green when all but
// one clause is cut, which is the exact failure the entry exists to catch.
//
// Two rules govern every pattern here:
//
//   1. `min` is the reconciliation's floor (4, 5, 8 … — not 1). A `min: 1`
//      pattern passes while the rule is lost from every actor that matters.
//   2. Patterns anchor on STRUCTURE, never on a value this feature is
//      scheduled to change. In particular no pattern pins a model alias
//      (`haiku`/`sonnet`/`opus`): task-007 re-maps the cheap tier in the
//      next phase, and a value-pinned pattern would go red there and read
//      as a false over-trim. See INV-6 and INV-21.
//
// `max` is set at today's (pre-trim) counts, so a duplication trips the
// gate too; the trim phase lowers each `max` to its post-trim count and
// never touches a `min`.
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
const INVARIANTS = [
    // ---- Part A — INV-1…INV-15, reconciled against the derived D-nn table ----
    {
        id: "INV-1",
        what: "single-phase features never produce a `final` walkthrough — 4 independent actors (builder, walkthrough-writer, build cmd, walkthrough cmd) each reach the rule alone",
        // Line-scoped, and requires BOTH halves on the line (the subject and
        // the final/terminal consequence) so the legacy "single-phase features
        // that pre-date phased plans" pointer doesn't count as a statement.
        pattern: /^(?=.*(?:single-phase|isSinglePhase))(?=.*(?:final|terminal)).*$/gim,
        files: [
            "agents/builder.md",
            "agents/walkthrough-writer.md",
            "commands/specmanager-build.md",
            "commands/specmanager-walkthrough.md",
        ],
        min: 4,
        max: 8,
    },
    {
        id: "INV-2",
        what: "`clear_active_build` fires only on terminal paths, never mid-phase — 3 distinct statements survive (pairing obligation, mid-phase exception, the Don't)",
        pattern: /^.*clear_active_build.*$/gm,
        files: ["commands/specmanager-build.md"],
        min: 2,
        max: 4,
    },
    {
        id: "INV-3",
        what: "the de-dup boundary: Superpowers' two-stage review is in-build discipline, the R3 reviewer is the parent's pre-advance gate — must survive as one sentence, not zero",
        pattern: "Superpowers' two-stage review is discipline *inside* your build of a task; the parent's R3 reviewer is a separate pre-advance gate",
        files: ["agents/builder.md"],
        min: 1,
        max: 1,
    },
    {
        id: "INV-4",
        what: "per-task dispatch is the enforced default; whole-phase fires only behind `--bulk` (the `argument-hint` site is machine-surfaced, not prose)",
        pattern: /^.*--bulk.*$/gm,
        files: ["commands/specmanager-build.md"],
        min: 2,
        max: 7,
    },
    {
        id: "INV-5",
        what: "never infer \"phase done\" from the builder returning — always re-resolve via `get_phase_completion`",
        pattern: /^.*infer "phase done".*$/gm,
        files: ["commands/specmanager-build.md"],
        min: 1,
        max: 1,
    },
    {
        id: "INV-6",
        what: "tier routing names Claude Code aliases, never dated model ids — value-agnostic: matches the *routing claim*, never an alias value (task-007 re-maps the cheap tier)",
        pattern: /^.*(dated model ids?|Claude Code (model )?\*{0,2}alias).*$/gim,
        files: ["agents/builder.md", "commands/specmanager-build.md"],
        min: 2,
        max: 2,
    },
    {
        id: "INV-7",
        what: "an unknown/unavailable alias ⇒ omit `model:` and inherit the session default — never error or block (AC4)",
        pattern: /^.*unknown\/unavailable.*$/gim,
        files: ["commands/specmanager-build.md", "agents/builder.md"],
        min: 2,
        max: 3,
    },
    {
        id: "INV-8",
        what: "the reviewer returns a verdict; the parent alone advances the card (split out of the Architecture's conflated INV-8 — the read-only half is INV-22)",
        pattern: /^.*(parent decides|parent alone|you alone advance).*$/gm,
        files: ["agents/reviewer.md", "commands/specmanager-build.md"],
        min: 2,
        max: 3,
    },
    {
        id: "INV-9",
        what: "R=2 (transport retry) and the Stop-gate's N=3 (post-stop cap) do not nest — anchored on the non-composition claim so the paragraph→parenthetical rewrite still matches",
        pattern: /^.*(not nested|never nest|do not nest|don't compose).*$/gim,
        files: ["commands/specmanager-build.md"],
        min: 1,
        max: 1,
    },
    {
        id: "INV-10",
        what: "`set_phase_meta` for EVERY phase; `testCommand` is never left absent (emit the literal \"none\" instead)",
        // Anchored on the never-omit obligation, not on its justification
        // clause — task-008 deletes the convention probe that clause cites, so
        // the wording there is scheduled to change (adjudication #6).
        pattern: /^.*never (omit|leave the field absent).*$/gm,
        files: ["agents/planner.md"],
        min: 1,
        max: 2,
    },
    {
        id: "INV-11",
        what: "never omit `dependsOn`/`basedOn` — staleness is a silent no-op without them; one survivor per persisting agent (4)",
        pattern: /^.*basedOn.*$/gm,
        files: [
            "agents/architect.md",
            "agents/planner.md",
            "agents/designer.md",
            "agents/walkthrough-writer.md",
        ],
        min: 4,
        max: 9,
    },
    {
        id: "INV-12",
        what: "the Wait-branch manual re-sync block prints verbatim — the only literal output string in the prompt surface, so this is the one entry where byte equality (spacing included) is correct",
        pattern: "Docs not synced. After you've verified this phase, re-sync manually:\n       /init   (then)   sync_claude_md   +   sync_design_md(refresh)",
        files: ["commands/specmanager-build.md"],
        min: 1,
        max: 1,
    },
    {
        id: "INV-13",
        what: "density contract — lossless carry-over, byte-identical at all 4 drafting agents (min == max)",
        pattern: "Every fact, number, constraint, decision, and open question from your inputs must survive into your output — merging duplicates is condensing; dropping information is a defect.",
        files: [
            "agents/architect.md",
            "agents/planner.md",
            "agents/prd-writer.md",
            "agents/walkthrough-writer.md",
        ],
        min: 4,
        max: 4,
    },
    // INV-14 — the designer's distilled built-in fallback method. The
    // Architecture framed this as one block with `max: 1`; that is unsafe —
    // the five elements are independently deletable and a whole-block pattern
    // stays green with four of five cut. One pattern per named element.
    {
        id: "INV-14a",
        what: "designer fallback element 1/5 — a token system of 4–6 named colors, traced to DESIGN.md",
        pattern: "token system of 4–6 named colors",
        files: ["agents/designer.md"],
        min: 1,
        max: 1,
    },
    {
        id: "INV-14b",
        what: "designer fallback element 2/5 — 2+ type roles with real sizes/weights",
        pattern: "2+ type roles",
        files: ["agents/designer.md"],
        min: 1,
        max: 1,
    },
    {
        id: "INV-14c",
        what: "designer fallback element 3/5 — commit to a layout concept",
        pattern: "layout concept",
        files: ["agents/designer.md"],
        min: 1,
        max: 1,
    },
    {
        id: "INV-14d",
        what: "designer fallback element 4/5 — one signature element",
        pattern: "one signature element",
        files: ["agents/designer.md"],
        min: 1,
        max: 1,
    },
    {
        id: "INV-14e",
        what: "designer fallback element 5/5 — critique for genericness before building",
        pattern: "Critique for genericness",
        files: ["agents/designer.md"],
        min: 1,
        max: 1,
    },
    // INV-15 — snippet parity (R8). `docs/agent-snippets/design-grounding.md`
    // is the canonical source for a fragment copy-pasted into three agents
    // (no include mechanism exists for agent prompts). The R8 defect was the
    // canonical text and `architect.md` saying `read_document` for the design
    // doc while `planner.md`/`builder.md` correctly said "read the HTML file
    // directly with `Read` on the `filePath`". This is a pattern *pair*, not
    // byte equality of the whole fragment — the agents legitimately adapt
    // their framing sentences around the shared method clause.
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
        negativeSample: "Call `list_documents({ featureId, stage: \"design\" })`. If a design doc exists, `read_document` it and build to what it specifies.",
    },
    // ---- Part B — INV-16…INV-37: must-survive rules with no INV coverage ----
    {
        id: "INV-16",
        what: "`check_gate` is actually called — it has exactly one call site in core and is never consulted on a write path, so the call in each gated command IS the enforcement",
        // Anchored on the call, not the Don't bullet: the call is the behaviour.
        pattern: "check_gate",
        files: [
            "commands/specmanager-architecture.md",
            "commands/specmanager-design.md",
            "commands/specmanager-plan.md",
            "commands/specmanager-build.md",
            "commands/specmanager-walkthrough.md",
        ],
        min: 4,
        max: 5,
    },
    {
        id: "INV-17",
        what: "a `done` transition records real artifacts — the actionable survivor, not the collapsible `missingArtifact` restatements around it",
        pattern: "You must record real artifacts.",
        files: ["agents/builder.md"],
        min: 1,
        max: 1,
    },
    {
        id: "INV-18",
        what: "mark `in_progress` BEFORE doing the work — `updateTask` accepts a direct todo→done jump, so the board's live signal is prompt-only",
        pattern: "Do this BEFORE you write code so the board reflects live state.",
        files: ["agents/builder.md"],
        min: 1,
        max: 1,
    },
    {
        id: "INV-19",
        what: "the builder stops at the phase boundary and never starts the next phase — two actors (the agent, the orchestrator); no core phase scoping exists",
        pattern: /^.*(next phase|two phases back-to-back).*$/gm,
        files: ["agents/builder.md", "commands/specmanager-build.md"],
        min: 2,
        max: 5,
    },
    {
        id: "INV-20",
        what: "escalate rather than re-size a task inside the builder (distinct from the planner's ≤3 split rule, which core enforces loudly)",
        pattern: /^.*(re-sizing inside the builder|escalate instead|planning bug).*$/gm,
        files: ["agents/builder.md"],
        min: 1,
        max: 1,
    },
    {
        id: "INV-21",
        what: "the default complexity → tier → alias table's SHAPE (three tiers named, >3/unscored ⇒ strong) is stated and agrees with `core/tiers.ts` at all 3 sites",
        // Deliberately value-agnostic: matches the three tier NAMES co-occurring
        // with the complexity mapping, never an alias value. task-007 re-maps
        // cheap in the next phase; a pattern pinning `haiku` would go red there
        // and present as a false over-trim. The `complexity` term also excludes
        // the reviewer's cheap→standard→strong fix-escalation ladder, which is a
        // different rule.
        pattern: /^.*complexity.*cheap.*standard.*strong.*$/gim,
        files: ["agents/builder.md", "commands/specmanager-build.md"],
        min: 3,
        max: 3,
    },
    {
        id: "INV-22",
        what: "the reviewer's stated read-only claim survives in its description. Residual, recorded not fixed: `tools:` narrows it to Read/Glob/Grep/Bash and Bash can write — no regex closes that gap",
        pattern: "Never writes.",
        files: ["agents/reviewer.md"],
        min: 1,
        max: 1,
    },
    {
        id: "INV-23",
        what: "the reviewer gets an assembled slice, never the whole Architecture — the token budget AND the false-fail guard; two actors (the contract, the parent's obligation)",
        pattern: /^.*(Treat this slice as the contract|not in the slice|the slice is your scope|whole Architecture doc|full Architecture doc).*$/gim,
        files: ["agents/reviewer.md", "commands/specmanager-build.md"],
        min: 2,
        max: 4,
    },
    {
        id: "INV-24",
        what: "the reviewer judges spec compliance only, never style or taste — a taste-grading reviewer never returns `pass` and silently escalates every phase to blocked",
        pattern: /^.*(style|taste).*$/gim,
        files: ["agents/reviewer.md"],
        min: 1,
        max: 1,
    },
    {
        id: "INV-25",
        what: "never approve a document — five toolless agents plus the command files each need their own statement; `min: 1` here would be actively wrong, `min: 8` is the whole guard",
        pattern: /Don'?t approve/gi,
        files: [
            "agents/prd-writer.md",
            "agents/architect.md",
            "agents/designer.md",
            "agents/planner.md",
            "agents/builder.md",
            "agents/walkthrough-writer.md",
            "commands/specmanager-build.md",
            "commands/specmanager-walkthrough.md",
            "commands/specmanager-prd.md",
        ],
        min: 8,
        max: 10,
    },
    {
        id: "INV-26",
        what: "Superpowers is execution-discipline only — never its brainstorming/planning skills; SpecManager owns the *what*",
        pattern: "brainstorming/planning skills",
        files: ["agents/builder.md"],
        min: 1,
        max: 1,
    },
    {
        id: "INV-27a",
        what: "Context7 lookup is architect-only and on-demand — never in PRD/design/plan/build",
        pattern: "architect-only and on-demand",
        files: ["agents/architect.md"],
        min: 1,
        max: 1,
    },
    {
        id: "INV-27b",
        what: "a failed/empty/429/unconfigured doc lookup is never a blocker — proceed from training knowledge",
        pattern: "Never block, delay, or fail the draft",
        files: ["agents/architect.md"],
        min: 1,
        max: 1,
    },
    {
        id: "INV-27c",
        what: "never add Context7 to `.mcp.json` — repo policy, and its survivor sits INSIDE the block the trim compresses",
        pattern: "add a Context7 entry to `.mcp.json`",
        files: ["agents/architect.md"],
        min: 1,
        max: 1,
    },
    {
        id: "INV-28",
        what: "note the library + version consulted when fetched docs inform a decision — the only audit trail for a version choice",
        // Flagged in the reconciliation (adjudication #3): this clause sits in a
        // range the trim compresses and is not named among that row's survivors,
        // so it is expected to fail there until the Plan's survivor sentence is
        // widened. That failure is the guard working, not a harness bug.
        pattern: "note the library and version you consulted",
        files: ["agents/architect.md"],
        min: 1,
        max: 1,
    },
    {
        id: "INV-29",
        what: "density contract — reference upstream docs by id, never restate their content (the token-budget rule, not a style preference); 4 sites, min == max",
        // Contingent per adjudication #2: the trim as currently planned drops
        // this sentence, which has no other statement site. `min: 4` failing
        // there is the designed signal to widen the survivor to two sentences.
        pattern: "Reference upstream docs by id — never restate their content.",
        files: [
            "agents/architect.md",
            "agents/planner.md",
            "agents/prd-writer.md",
            "agents/walkthrough-writer.md",
        ],
        min: 4,
        max: 4,
    },
    {
        id: "INV-30",
        what: "drafting agents write nothing OUTSIDE `.claude/specs/` — polarity opposite of INV-31; a de-dup keyed on the shared substring would invert whichever rule loses",
        pattern: "outside `.claude/specs/`",
        files: ["agents/prd-writer.md", "agents/architect.md"],
        min: 2,
        max: 2,
    },
    {
        id: "INV-31",
        what: "the builder writes nothing INSIDE `.claude/specs/` — MCP tools only; a hand-edited tasks.json bypasses both loud core guards",
        pattern: "go through MCP tools only",
        files: ["agents/builder.md"],
        min: 1,
        max: 1,
    },
    {
        id: "INV-32",
        what: "the plan-approved check is compound: gate ok AND an approved plan doc exists — `checkGate(stage:\"plan\")` only verifies the Architecture, nothing in core checks a Plan doc exists",
        pattern: /^.*(plan-approved check|AND an approved `plan` doc).*$/gm,
        files: ["commands/specmanager-build.md"],
        min: 1,
        max: 2,
    },
    {
        id: "INV-33",
        what: "task state is owned by the builder; the build command never writes it — already single-sited, the trim must not touch it",
        pattern: "the builder owns task state",
        files: ["commands/specmanager-build.md"],
        min: 1,
        max: 1,
    },
    {
        id: "INV-34",
        what: "`set_active_build` arms the Stop-gate — without the marker the gate is a permanent no-op, silently, on every feature; nothing else states the caller's obligation",
        pattern: "without it the gate is a no-op",
        files: ["commands/specmanager-build.md"],
        min: 1,
        max: 1,
    },
    {
        id: "INV-35",
        what: "the section-anchor convention — the emitter's half of the contract `getSpecSlice` consumes; lost, every future `architectureRefs` silently degrades to name-matching",
        pattern: "do not reuse an anchor for two sections",
        files: ["agents/architect.md"],
        min: 1,
        max: 1,
    },
    {
        id: "INV-36a",
        what: "no vendoring — invoke the installed skill, never copy its text into this repo (one survivor per skill-using agent)",
        pattern: "No vendoring",
        files: ["agents/builder.md", "agents/designer.md"],
        min: 2,
        max: 2,
    },
    {
        id: "INV-36b",
        what: "graceful degradation — a missing skill is never an error; the compression must not keep \"defer to the skill\" while dropping \"never error if absent\"",
        pattern: /graceful degradation/gi,
        files: ["agents/builder.md", "agents/designer.md"],
        min: 2,
        max: 2,
    },
    {
        id: "INV-37",
        what: "DESIGN.md tokens stay the source of truth; the skill informs composition and never overrides them — the grounding constraint is the whole point of the design-grounding section",
        pattern: /^.*(source of truth|trace to a DESIGN\.md token|traces to `docs\/DESIGN\.md`).*$/gim,
        files: ["agents/designer.md", "agents/builder.md"],
        min: 2,
        max: 4,
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
async function loadContents(inv) {
    const contents = new Map();
    for (const relPath of inv.files) {
        contents.set(relPath, await readPromptFile(relPath));
    }
    return contents;
}
function evaluate(inv, contents) {
    const perFile = inv.files.map((relPath) => [
        relPath,
        countMatches(contents.get(relPath) ?? "", inv.pattern),
    ]);
    return {
        total: perFile.reduce((sum, [, c]) => sum + c, 0),
        breakdown: perFile.map(([f, c]) => `${f}:${c}`).join(", "),
    };
}
function passes(inv, total) {
    return total >= inv.min && total <= inv.max;
}
async function checkInvariant(inv) {
    const { total, breakdown } = evaluate(inv, await loadContents(inv));
    assert(passes(inv, total), `${inv.id} — ${inv.what} (want ${inv.min}..${inv.max}, got ${total}) [${breakdown}]`);
}
// ---- Mutation pass -------------------------------------------------------
//
// The match pass above proves the patterns match TODAY. It cannot distinguish
// a pattern that guards its statement from one loose enough to also match
// neighbouring prose that survives the trim regardless — the latter reports
// green while guarding nothing, and its `min` never fires.
//
// The mutation pass closes that: for each positive entry it strips the matched
// text from an in-memory copy and asserts the check now FAILS; for each
// negative entry (`max: 0`) it injects the forbidden text and asserts the same.
// A mutation that leaves the check green is a real finding — the pattern is
// satisfied by text other than the statement it is supposed to guard.
/** All occurrences of `pattern` deleted from `content`. */
function removeMatches(content, pattern) {
    if (typeof pattern === "string")
        return content.split(pattern).join("");
    const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
    return content.replace(new RegExp(pattern.source, flags), "");
}
function mutate(contents, relPaths, fn) {
    const copy = new Map(contents);
    for (const relPath of relPaths)
        copy.set(relPath, fn(copy.get(relPath) ?? ""));
    return copy;
}
/** Removing every match, everywhere, must turn the check red. */
async function mutatePositive(inv) {
    const contents = await loadContents(inv);
    const stripped = mutate(contents, inv.files, (c) => removeMatches(c, inv.pattern));
    const { total, breakdown } = evaluate(inv, stripped);
    assert(!passes(inv, total), `${inv.id} mutation — stripping the matched text turns the check red ` +
        `(want ${inv.min}..${inv.max}, got ${total} after removal) [${breakdown}]`);
}
/** Injecting the forbidden text must turn the check red. */
async function mutateNegative(inv) {
    const sample = inv.negativeSample ?? (typeof inv.pattern === "string" ? inv.pattern : undefined);
    const target = inv.files[0];
    assert(sample !== undefined && target !== undefined, `${inv.id} mutation — negative entry supplies a sample and a target file`);
    const contents = await loadContents(inv);
    const injected = mutate(contents, [target], (c) => `${c}\n\n${sample}\n`);
    const { total, breakdown } = evaluate(inv, injected);
    assert(!passes(inv, total), `${inv.id} mutation — injecting the forbidden text into ${target} turns the ` +
        `check red (want ${inv.min}..${inv.max}, got ${total} after injection) [${breakdown}]`);
}
/** Carrier sensitivity: for a multi-file invariant whose `min` is a sum across
 * actors, losing ONE carrier entirely can still leave the total above `min` —
 * the rule goes silent at that actor while the gate stays green. Not an
 * assertion (several entries are deliberately budgeted that way); reported so
 * the reconciliation can revisit the floors. */
async function carrierSensitivity(inv) {
    if (inv.files.length < 2 || inv.min < 1)
        return [];
    const contents = await loadContents(inv);
    const blind = [];
    for (const relPath of inv.files) {
        if (countMatches(contents.get(relPath) ?? "", inv.pattern) === 0)
            continue;
        const stripped = mutate(contents, [relPath], (c) => removeMatches(c, inv.pattern));
        const { total } = evaluate(inv, stripped);
        if (passes(inv, total))
            blind.push(`${relPath} (total would be ${total})`);
    }
    return blind;
}
async function main() {
    assert(Array.isArray(INVARIANTS), "INVARIANTS is an array");
    console.log("— match pass —");
    for (const inv of INVARIANTS) {
        await checkInvariant(inv);
    }
    console.log("\n— mutation pass —");
    const blindSpots = [];
    for (const inv of INVARIANTS) {
        if (inv.max === 0)
            await mutateNegative(inv);
        else
            await mutatePositive(inv);
        for (const carrier of await carrierSensitivity(inv)) {
            blindSpots.push(`${inv.id}: losing ${carrier} keeps the check green`);
        }
    }
    if (blindSpots.length > 0) {
        console.log(`\nCarrier blind spots (${blindSpots.length}) — reported, not failed; the ` +
            `rule can go silent at one actor while the summed floor holds:`);
        for (const line of blindSpots)
            console.log(`  ! ${line}`);
    }
    console.log(`\nAll prompt invariant assertions passed (${INVARIANTS.length} invariant${INVARIANTS.length === 1 ? "" : "s"} checked: match + mutation).`);
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=selftest-prompts.js.map