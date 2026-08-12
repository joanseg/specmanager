// R6 smoke test — spec-slice assembly (core/spec-slice.ts).
//
// Two halves. The anchor-resolution rules are exercised directly against an
// in-memory Architecture fixture (`resolveArchitectureRefs` / `indexHeadings` /
// `matchHeadingsByPhaseName` are exported and pure); everything that depends on
// docs, tasks and meta on disk runs through `getSpecSlice` against a tmp project,
// in the style of `selftest-stopgate.ts`. No case reads a real repo spec, so
// editing a live architecture doc can never turn this suite red.
//
// Usage: node dist/selftest-specslice.js

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  initProject,
  createFeature,
  createDocument,
  createTask,
  setPhaseMeta,
  readTasksMeta,
  getSpecSlice,
  resolveArchitectureRefs,
  matchHeadingsByPhaseName,
  matchPhaseHeading,
  indexHeadings,
} from "./core/index.js";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`ok — ${msg}`);
}

// Architecture fixture. Shaped like a real architecture doc: `R<n> —` id-token
// headings, a prose heading addressed by kebab-slug, a `##` with `###` children,
// and a fenced block containing a `##` line (see case 12).
const ARCH = [
  "# Architecture",
  "",
  "## R6 — Spec-slice assembly moves to core",
  "",
  "R6 body: the parent assembles the slice.",
  "",
  "## R7 — Stop-gate probe branch",
  "",
  "R7 body: delete rung 3.",
  "",
  "## Core active-card resolver",
  "",
  "Resolver body.",
  "",
  "## core-spec-slice",
  "",
  "Module intro.",
  "",
  "### Anchor resolution rules (exact)",
  "",
  "Rules body.",
  "",
  "### Fallback behaviour",
  "",
  "Fallback body.",
  "",
  "## Conventions used",
  "",
  "```md",
  "## Fenced pseudo-heading",
  "```",
  "",
  "Conventions body.",
  "",
].join("\n");

// Plan fixture for case 10 — one phase terminated by `---`, one by the next
// `## Phase`, one by an ordinary `##`.
const PLAN = [
  "# Plan",
  "",
  "## Overview",
  "",
  "Overview body.",
  "",
  "## Phase core — Anchors",
  "",
  "Core phase body.",
  "",
  "---",
  "",
  "## Phase spec — Fallback tier two",
  "",
  "Spec phase body.",
  "## Phase orphan — No name match",
  "",
  "Orphan phase body.",
  "",
  "## Risk & sequencing notes",
  "",
  "Tail body.",
  "",
].join("\n");

// Architecture fixture for case 13 — a `###` subheading that merely *mentions* a
// single-letter phase in prose.
const ARCH_SINGLE_LETTER = [
  "# Architecture",
  "",
  "## Sequence / flow",
  "",
  "Flow body.",
  "",
  "### Unverified — heading indexing is untested (Phase A task 1)",
  "",
  "Unverified body.",
  "",
].join("\n");

async function main(): Promise<void> {
  // ── Anchor resolution (pure, in-memory) ─────────────────────────────────────

  // 1. Explicit `R1`-style id-token ref resolves; body stops at the next `##`.
  const r6 = resolveArchitectureRefs(ARCH, ["R6"]);
  assert(r6.sections.length === 1 && r6.unresolvedRefs.length === 0, "id-token ref R6 resolves to one section");
  assert(r6.sections[0]!.heading === "R6 — Spec-slice assembly moves to core", "section carries the verbatim heading text");
  assert(r6.sections[0]!.body.includes("R6 body"), "id-token section body starts at its own heading");
  assert(!r6.sections[0]!.body.includes("R7 body"), "id-token section body stops before the next `##`");

  // 2. Kebab-slug ref resolves (the heading's id-token is `Core`, not the slug).
  const slug = resolveArchitectureRefs(ARCH, ["core-active-card-resolver"]);
  assert(slug.sections.length === 1, "kebab-slug ref resolves when no id-token matches");
  assert(slug.sections[0]!.heading === "Core active-card resolver", "kebab-slug ref lands on the right heading");
  assert(slug.sections[0]!.body.includes("Resolver body."), "kebab-slug section body is sliced");

  // 3. A `##` section swallows its `###` children and stops at the next `##`.
  const nested = resolveArchitectureRefs(ARCH, ["core-spec-slice"]);
  const nestedBody = nested.sections[0]!.body;
  assert(nestedBody.includes("### Anchor resolution rules"), "`##` body swallows its first `###` child");
  assert(nestedBody.includes("Fallback body."), "`##` body swallows its later `###` children");
  assert(!nestedBody.includes("## Conventions used"), "`##` body stops at the next same-level heading");

  // 4. Case-insensitive on both key kinds.
  const ci = resolveArchitectureRefs(ARCH, ["r6", "CORE-ACTIVE-CARD-RESOLVER"]);
  assert(ci.sections.length === 2 && ci.unresolvedRefs.length === 0, "both key kinds match case-insensitively");
  assert(ci.sections[0]!.ref === "r6", "the section echoes the ref as written, not the heading token");

  // 5. Unknown ref lands in `unresolvedRefs`; the others still resolve; no throw.
  const mixed = resolveArchitectureRefs(ARCH, ["R6", "R99", "core-spec-slice"]);
  assert(mixed.sections.map((s) => s.ref).join(",") === "R6,core-spec-slice", "resolvable refs survive alongside an unknown one");
  assert(mixed.unresolvedRefs.join(",") === "R99", "the unknown ref is reported in unresolvedRefs");

  // Shared `## Phase` matcher — one parser, used by both plan slicing and the
  // Stop-gate's active-card resolver.
  assert(matchPhaseHeading("## Phase core — Anchors") === "core", "matchPhaseHeading tolerates the `— <theme>` suffix");
  assert(matchPhaseHeading("## Phase A") === "A", "matchPhaseHeading returns the name as written");
  assert(matchPhaseHeading("### Phase core") === null, "matchPhaseHeading ignores non-`##` lines");

  // 12. Heading indexing is deliberately NOT fence-aware. The Architecture's
  //     rule 2 specifies a bare `/^(#{2,6})\s+(.+)$/m` index, so a `##` line
  //     inside a fenced code block is indexed as a real heading — and therefore
  //     truncates the section that contains the fence. Pinned on purpose: no
  //     architecture doc in this repo hits it, and "fixing" it would be a
  //     deviation from the spec, not a bug fix.
  assert(
    indexHeadings(ARCH).some((h) => h.text === "Fenced pseudo-heading"),
    "a `##` line inside a fenced block is indexed as a heading (spec rule 2: not fence-aware)"
  );
  const fenced = resolveArchitectureRefs(ARCH, ["Conventions"]);
  assert(
    !fenced.sections[0]!.body.includes("Conventions body."),
    "a fenced `##` line truncates its enclosing section — the documented consequence of rule 2"
  );

  // ── Fallback name-matching (pure, in-memory) ────────────────────────────────

  // Tier 1: a heading whose id-token equals the phase name wins outright, and
  // suppresses the tier-2 segment matches entirely.
  const tier1 = matchHeadingsByPhaseName(ARCH, "core");
  assert(tier1.length === 1 && tier1[0]!.heading === "Core active-card resolver", "fallback tier 1 (exact key match) wins alone");

  // Tier 2: no exact key match, so every heading whose slug carries the phase
  // name as a whole segment matches — including ones that only mention it.
  const tier2 = matchHeadingsByPhaseName(ARCH, "spec");
  assert(tier2.map((s) => s.ref).join(",") === "R6,core-spec-slice", "fallback tier 2 matches every whole-segment slug hit");

  // 13. Single-letter phase names match noisily. `A` is a whole kebab segment of
  //     any heading that mentions "(Phase A task 1)", so a `###` subheading is
  //     pulled into the slice. This follows the spec's literal segment rule — a
  //     sharp edge to know about, not a bug.
  const single = matchHeadingsByPhaseName(ARCH_SINGLE_LETTER, "A");
  assert(
    single.length === 1 && single[0]!.heading.startsWith("Unverified —"),
    "a single-letter phase name matches any heading whose slug has it as a segment"
  );

  // ── getSpecSlice against a tmp project ──────────────────────────────────────

  const root = await fs.mkdtemp(path.join(os.tmpdir(), "specmanager-specslice-"));
  console.log(`tmp project: ${root}`);
  await initProject(root);

  // Feature 1 — explicit refs, one good and one mistyped.
  const refs = await createFeature("Refs feature", root);
  await createDocument({ featureId: refs.id, stage: "architecture", title: "Refs arch", body: ARCH }, root);
  const t1 = await createTask({ featureId: refs.id, title: "Resolve anchors", phase: "core", complexity: 2 }, root);
  await setPhaseMeta(refs.id, "core", { testCommand: "none", architectureRefs: ["R6", "R99"] }, root);

  const slice = (await getSpecSlice(refs.id, "core", root))!;
  assert(slice.featureId === refs.id && slice.phase === "core", "slice echoes the featureId and phase it was asked for");
  assert(slice.architecture.map((s) => s.ref).join(",") === "R6", "explicit refs resolve end-to-end through getSpecSlice");
  assert(slice.unresolvedRefs.join(",") === "R99", "an unresolved ref reaches the caller through the slice");
  assert(slice.fallbackUsed === false, "named refs never set fallbackUsed");
  assert(
    slice.tasks.length === 1 && slice.tasks[0]!.id === t1.id && slice.tasks[0]!.complexity === 2,
    "tasks[] carries the phase's tasks with their complexity"
  );
  assert(slice.tasks[0]!.notes === null, "notes is null until core/types.ts Task grows a notes field");

  // KNOWN DEVIATION from the Architecture's `### Fallback behaviour`, which says
  // the fallback also fires "when every listed ref is unresolved". It does not:
  // task-016 implemented only the empty/absent half deliberately, so a mistyped
  // ref surfaces in unresolvedRefs instead of being silently replaced by a
  // plausible-looking name match. This case pins the IMPLEMENTED behaviour; the
  // spec text and the code disagree, and the header comment in spec-slice.ts
  // records why. Do not "fix" one side without reconciling the other.
  await createTask({ featureId: refs.id, title: "Mistyped ref", phase: "typo", complexity: 1 }, root);
  await setPhaseMeta(refs.id, "typo", { testCommand: "none", architectureRefs: ["core-spec-slyce"] }, root);
  const typo = (await getSpecSlice(refs.id, "typo", root))!;
  assert(typo.fallbackUsed === false, "DEVIATION (spec says fallback): all-refs-unresolved does NOT trigger the fallback");
  assert(typo.architecture.length === 0, "DEVIATION: a mistyped ref yields no section rather than a name-matched guess");
  assert(typo.unresolvedRefs.join(",") === "core-spec-slyce", "DEVIATION: the mistyped ref is surfaced, not silently swallowed");

  // Feature 2 — no explicit refs anywhere: the fallback + plan-slicing feature.
  const fb = await createFeature("Fallback feature", root);
  await createDocument({ featureId: fb.id, stage: "architecture", title: "Fallback arch", body: ARCH }, root);
  await createDocument({ featureId: fb.id, stage: "plan", title: "Fallback plan", body: PLAN }, root);
  await createTask({ featureId: fb.id, title: "Core work", phase: "core", complexity: 3 }, root);
  await createTask({ featureId: fb.id, title: "Spec work", phase: "spec", complexity: 2 }, root);
  await createTask({ featureId: fb.id, title: "Orphan work", phase: "orphan", complexity: 1 }, root);
  // `core` gets no meta at all (case 11); the other two get an explicit empty list.
  await setPhaseMeta(fb.id, "spec", { testCommand: "none", architectureRefs: [] }, root);
  await setPhaseMeta(fb.id, "orphan", { testCommand: "none", architectureRefs: [] }, root);

  // 11. Legacy plan with no `meta.phases` entry → tasks populated, refs empty,
  //     fallback path — the shape 12 of 16 plans in this repo are still in.
  const fbMeta = await readTasksMeta(fb.id, root);
  assert(fbMeta.phases["core"] === undefined, "the legacy-shaped phase has no meta.phases entry");
  const legacy = (await getSpecSlice(fb.id, "core", root))!;
  assert(legacy.tasks.length === 1 && legacy.tasks[0]!.title === "Core work", "legacy phase still gets its tasks");
  assert(legacy.unresolvedRefs.length === 0, "absent meta.phases means no refs to leave unresolved");

  // 6. Empty `architectureRefs` → fallbackUsed, name-match hit.
  assert(legacy.fallbackUsed === true, "absent architectureRefs takes the fallback path");
  assert(
    legacy.architecture.length === 1 && legacy.architecture[0]!.heading === "Core active-card resolver",
    "the fallback name-match reaches the caller through the slice"
  );
  const spec = (await getSpecSlice(fb.id, "spec", root))!;
  assert(spec.fallbackUsed === true, "an explicitly empty architectureRefs list also takes the fallback path");
  assert(spec.architecture.length === 2, "tier-2 segment matches reach the caller through the slice");

  // 7. Empty refs, no name match → `architecture: []`, `fallbackUsed: true`, no throw.
  const orphan = (await getSpecSlice(fb.id, "orphan", root))!;
  assert(orphan.architecture.length === 0, "a fallback with zero matches degrades to an empty architecture[]");
  assert(orphan.fallbackUsed === true, "a zero-match fallback still reports fallbackUsed");
  assert(orphan.planSection !== null, "a zero-match fallback is still a valid slice (plan section intact)");

  // 10. planSection slices at `---` and at the next `## Phase`.
  assert(legacy.planSection!.startsWith("## Phase core — Anchors"), "planSection starts at the matched `## Phase` line");
  assert(legacy.planSection!.includes("Core phase body."), "planSection carries its own body");
  assert(!legacy.planSection!.includes("---"), "planSection stops at a bare `---` rule");
  assert(spec.planSection!.includes("Spec phase body."), "planSection resolves a phase that follows a `---`");
  assert(!spec.planSection!.includes("Orphan phase body."), "planSection stops at the next `## Phase` heading");
  assert(!orphan.planSection!.includes("Tail body."), "planSection stops at an ordinary `##` heading too");

  // 9. Unknown phase → null (mirrors getPhaseCompletion's phase-not-found branch).
  assert((await getSpecSlice(fb.id, "nope", root)) === null, "an unknown phase returns null, not an empty slice");
  assert((await getSpecSlice(fb.id, "Core", root)) === null, "phase lookup is exact — `Core` is not the `core` phase");

  // 8. Missing Architecture doc → `architecture: []`, refs all unresolved, no throw.
  const bare = await createFeature("No architecture feature", root);
  await createTask({ featureId: bare.id, title: "Bare work", phase: "core", complexity: 1 }, root);
  await setPhaseMeta(bare.id, "core", { testCommand: "none", architectureRefs: ["R6", "core-spec-slice"] }, root);
  const bareSlice = (await getSpecSlice(bare.id, "core", root))!;
  assert(bareSlice.architecture.length === 0, "a missing Architecture doc yields architecture: [] rather than throwing");
  assert(bareSlice.unresolvedRefs.join(",") === "R6,core-spec-slice", "a missing Architecture doc leaves the full ref list unresolved");
  assert(bareSlice.planSection === null, "a missing plan doc yields planSection: null");
  assert(bareSlice.tasks.length === 1, "tasks[] survives a missing Architecture doc");

  console.log("\nAll R6 spec-slice assertions passed.");
  console.log(`Inspect the tmp project at: ${root}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
