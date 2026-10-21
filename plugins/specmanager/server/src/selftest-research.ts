// Researcher mode self-test — runs entirely against @specmanager/core in a throwaway
// temp root. Exits non-zero on the first failure.
//
// Usage: node dist/selftest-research.js
//
// Covers: two independent studies, every gate's reason, duplicate kind, cross-study
// rejection, findings-kind rule, version conflict, `outdated`, `newNotes`, `steps[]`,
// build-list parsing, idempotent handoff by itemId (survives rename/re-rank) + origin,
// Builder-only manifest unchanged, and the "Research studies" CLAUDE.md line.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  buildManifest,
  checkResearchStep,
  createFeature,
  createResearchDoc,
  createStudy,
  handoffStudyItems,
  initProject,
  listFeatures,
  listStudySummaries,
  parseBuildList,
  renderBlock,
  studyNotesDir,
  studySummary,
  writeResearchDoc,
  type StepState,
  type StudySummary,
} from "./core/index.js";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`ok — ${message}`);
}

/** Assert `fn` rejects with an error whose message contains `fragment`. */
async function rejects(fn: () => Promise<unknown>, fragment: string, message: string): Promise<void> {
  try {
    await fn();
  } catch (err) {
    const text = (err as Error).message;
    assert(text.includes(fragment), `${message} (got: ${text})`);
    return;
  }
  throw new Error(`FAIL: ${message} — expected a rejection containing "${fragment}"`);
}

/** Step name → state, for compact rail assertions. */
function rail(s: StudySummary): Record<string, StepState> {
  return Object.fromEntries(s.steps.map((st) => [st.step, st.state]));
}

function reasonOf(s: StudySummary, step: string): string | undefined {
  return s.steps.find((st) => st.step === step)?.reason;
}

function strategyBody(items: string[]): string {
  return [
    "## Summary",
    "",
    "1. [S9] **Not an item** — outside the build list section",
    "",
    "## What to build",
    "",
    ...items,
    "",
    "## Sources",
    "",
    "1. [S8] **Also not an item** — after the section ends",
    "",
  ].join("\n");
}

async function main(): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "specmanager-research-"));
  console.log(`tmp root: ${root}`);
  await initProject(root);

  // 1. Builder-only baseline: no studies key, no Research studies line.
  const builder = await createFeature("Builder feature", root);
  assert(!("origin" in builder), "a Builder feature has no origin key");
  const m0 = await buildManifest(root);
  assert(!("studies" in m0), "Builder-only manifest has no studies key");
  assert(!(await renderBlock(root)).includes("Research studies"), "no Research studies line without studies");

  // 2. Two independent studies; same title gets a -2 slug.
  const a = await createStudy({ title: "Oposiciones", idea: "Exam prep app" }, root);
  const b = await createStudy({ title: "Oposiciones", idea: "Second take" }, root);
  assert(a.id === "study-oposiciones" && b.id === "study-oposiciones-2", "second study gets a -2 slug");

  // 3. Empty-study gates and rail.
  let sa = await studySummary(a.id, root);
  assert(sa.nextStep === "market", "empty study's next step is market");
  assert(rail(sa).market === "next" && rail(sa).concepts === "locked", "rail: market next, concepts locked");
  assert(reasonOf(sa, "findings") === "needs the user-research plan first", "findings locked reason");
  for (const kind of ["concepts", "user-research", "marketing"] as const) {
    const gate = await checkResearchStep(a.id, kind, root);
    assert(!gate.ok && gate.reason === "needs market research first", `${kind} gate needs market`);
  }
  const stratGate = await checkResearchStep(a.id, "strategy", root);
  assert(!stratGate.ok && stratGate.reason === "needs user-research findings first", "strategy gate needs findings");
  const handGate = await checkResearchStep(a.id, "handoff", root);
  assert(!handGate.ok && handGate.reason === "needs strategy first", "handoff gate needs strategy");
  await rejects(
    () => createResearchDoc({ studyId: a.id, kind: "concepts", title: "Concepts" }, root),
    "needs market research first",
    "createResearchDoc enforces the concepts gate"
  );

  // 4. Market in A only; B stays untouched.
  await createResearchDoc({ studyId: a.id, kind: "market", title: "Market", body: "## Size\n" }, root);
  let sb = await studySummary(b.id, root);
  assert(sb.docs.length === 0 && sb.nextStep === "market", "study B is independent of study A");
  sa = await studySummary(a.id, root);
  assert(sa.nextStep === "concepts" && rail(sa).market === "done", "A's next step moves to concepts");

  // 5. Manifest studies[] + CLAUDE.md line; Builder entries byte-identical.
  const m1 = await buildManifest(root);
  assert(m1.studies?.length === 2, "manifest lists both studies");
  assert(
    JSON.stringify(m1.features) === JSON.stringify(m0.features),
    "Builder feature entries unchanged once studies exist"
  );
  const block = await renderBlock(root);
  assert(
    block.includes("**Research studies:**") &&
      block.includes("(./.claude/specs/research/oposiciones/)") &&
      block.includes("(./.claude/specs/research/oposiciones-2/)"),
    "managed block carries one links-only Research studies line"
  );
  assert(block.split("Research studies").length === 2, "the Research studies line appears once");

  // 6. Write-side rejections.
  await rejects(
    () => createResearchDoc({ studyId: a.id, kind: "market", title: "Again" }, root),
    "use write_research_doc",
    "duplicate kind is rejected"
  );
  await rejects(
    () =>
      createResearchDoc(
        { studyId: a.id, kind: "concepts", title: "C", dependsOn: ["market-oposiciones-2"] },
        root
      ),
    "cross-study reference rejected",
    "cross-study dependsOn is rejected"
  );
  await rejects(
    () =>
      createResearchDoc(
        { studyId: a.id, kind: "marketing", title: "M", findings: ["x.md"] },
        root
      ),
    "findings is only valid on user-research",
    "findings off user-research is rejected"
  );

  // 7. Concepts, user-research plan, marketing.
  const dep = { dependsOn: ["market-oposiciones"], basedOn: { "market-oposiciones": 1 } };
  await createResearchDoc({ studyId: a.id, kind: "concepts", title: "Concepts", body: "<p>A</p>", ...dep }, root);
  await createResearchDoc({ studyId: a.id, kind: "user-research", title: "UR", ...dep }, root);
  await createResearchDoc({ studyId: a.id, kind: "marketing", title: "Marketing", ...dep }, root);
  sa = await studySummary(a.id, root);
  assert(sa.nextStep === "findings", "next step is findings once the plan exists");
  assert(rail(sa).strategy === "locked", "strategy locked without findings");

  // 8. newNotes: only .md/.txt/.pdf not yet in findings.
  const notes = studyNotesDir(a.slug, root);
  for (const f of ["2026-10-01-P1.md", "2026-10-02-P2.txt", "interview.m4a"]) {
    await fs.writeFile(path.join(notes, f), "note", "utf8");
  }
  sa = await studySummary(a.id, root);
  assert(
    JSON.stringify(sa.newNotes) === JSON.stringify(["2026-10-01-P1.md", "2026-10-02-P2.txt"]),
    "newNotes lists .md/.txt notes and skips audio"
  );

  // 9. Partial ingest, then a 409-style version conflict.
  await writeResearchDoc({ id: "ur-oposiciones", findings: ["2026-10-01-P1.md"], baseVersion: 1 }, root);
  sa = await studySummary(a.id, root);
  assert(JSON.stringify(sa.newNotes) === JSON.stringify(["2026-10-02-P2.txt"]), "ingested note leaves newNotes");
  assert(sa.nextStep === "findings", "findings stays next while new notes remain");
  await rejects(
    () => writeResearchDoc({ id: "ur-oposiciones", body: "stale", baseVersion: 1 }, root),
    "version conflict",
    "stale baseVersion is a version conflict"
  );
  await writeResearchDoc(
    { id: "ur-oposiciones", findings: ["2026-10-01-P1.md", "2026-10-02-P2.txt"], baseVersion: 2 },
    root
  );
  sa = await studySummary(a.id, root);
  assert(sa.newNotes.length === 0 && sa.nextStep === "strategy", "full ingest opens strategy");

  // 10. outdated: market moves ahead of concepts' basedOn.
  await writeResearchDoc({ id: "market-oposiciones", body: "## Size\nrevised\n" }, root);
  sa = await studySummary(a.id, root);
  const concepts = sa.docs.find((d) => d.kind === "concepts");
  assert(
    JSON.stringify(concepts?.outdated) === JSON.stringify(["market-oposiciones"]),
    "concepts is outdated behind market"
  );
  assert(rail(sa).concepts === "flag", "rail flags the outdated concepts step");

  // 11. parseBuildList.
  const parsed = parseBuildList(
    strategyBody([
      "1. [S1] **Mock exams** — the core loop, ties to launch post",
      "2. Unnumbered idea without an id",
      "3. [S2] Spaced repetition — retention",
    ])
  );
  assert(parsed.length === 2, "build list keeps only S<n> lines inside ## What to build");
  assert(
    parsed[0]!.itemId === "S1" && parsed[0]!.title === "Mock exams" && parsed[0]!.rank === 1,
    "bold text is the item title, rank by position"
  );
  assert(parsed[0]!.rationale === "the core loop, ties to launch post", "rationale follows ' — '");
  assert(parsed[1]!.title === "Spaced repetition" && parsed[1]!.rank === 2, "non-bold title is text before ' — '");
  assert(parseBuildList("## Summary\n\nNo list.\n").length === 0, "no What to build section → empty list");

  // 12. Strategy with an empty build list closes handoff.
  const stratDep = { dependsOn: ["ur-oposiciones"], basedOn: { "ur-oposiciones": 3 } };
  await createResearchDoc(
    { studyId: a.id, kind: "strategy", title: "Strategy", body: strategyBody(["1. Idea with no id"]), ...stratDep },
    root
  );
  const noItems = await checkResearchStep(a.id, "handoff", root);
  assert(!noItems.ok && noItems.reason === "no build items", "empty build list → handoff reason 'no build items'");
  await rejects(
    () => handoffStudyItems({ studyId: a.id, itemIds: ["S1"] }, root),
    "no build items",
    "handoff refuses an empty build list"
  );

  // 13. Handoff, unknown ids, idempotence.
  await writeResearchDoc(
    {
      id: "strategy-oposiciones",
      body: strategyBody(["1. [S1] **Mock exams** — core loop", "2. [S2] **Spaced repetition** — retention"]),
    },
    root
  );
  const before = (await listFeatures(root)).length;
  await rejects(
    () => handoffStudyItems({ studyId: a.id, itemIds: ["S1", "S7"] }, root),
    "unknown build item id(s): S7",
    "an unknown item id fails the whole call"
  );
  assert((await listFeatures(root)).length === before, "failed handoff creates no features");

  const first = await handoffStudyItems({ studyId: a.id, itemIds: ["S1"] }, root);
  assert(first.created.length === 1 && first.skipped.length === 0, "first handoff creates one feature");
  const origin = first.created[0]!.origin;
  assert(
    origin?.studyId === a.id &&
      origin.strategyId === "strategy-oposiciones" &&
      origin.strategyVersion === 2 &&
      origin.itemId === "S1" &&
      origin.rank === 1 &&
      origin.item === "Mock exams",
    "handed-off feature records origin (study, strategy, version, itemId, rank, item)"
  );
  const second = await handoffStudyItems({ studyId: a.id, itemIds: ["S1", "S2"] }, root);
  assert(
    second.created.length === 1 && second.skipped[0]?.itemId === "S1" &&
      second.skipped[0].featureId === first.created[0]!.id,
    "re-handoff skips S1 and creates S2"
  );

  // 14. Rename + re-rank: still skipped by itemId.
  await writeResearchDoc(
    {
      id: "strategy-oposiciones",
      body: strategyBody(["1. [S2] **SRS cards** — retention", "2. [S1] **Timed mock exams** — core loop"]),
    },
    root
  );
  const third = await handoffStudyItems({ studyId: a.id, itemIds: ["S1", "S2"] }, root);
  assert(third.created.length === 0 && third.skipped.length === 2, "handoff survives rename and re-rank");

  // 15. Final summaries.
  sa = await studySummary(a.id, root);
  assert(sa.handedOff.length === 2, "summary lists both handed-off features");
  const s1 = sa.handoffs.find((h) => h.itemId === "S1");
  assert(
    s1?.featureId === first.created[0]!.id && s1.slug === first.created[0]!.slug,
    "summary maps S1 to its feature id and slug"
  );
  assert(rail(sa).handoff === "done", "handoff step is done");
  assert(sa.nextStep === null, "no next step once everything is done (flags aside)");
  sb = await studySummary(b.id, root);
  assert(sb.docs.length === 0 && sb.handedOff.length === 0, "study B still untouched");
  assert((await listStudySummaries(undefined, root)).length === 2, "listStudySummaries returns both studies");

  const m2 = await buildManifest(root);
  const builderEntry = m2.features.find((f) => f.id === builder.id);
  assert(
    JSON.stringify(builderEntry) === JSON.stringify(m0.features[0]),
    "the Builder-only feature's manifest entry is unchanged"
  );
  assert(m2.features.filter((f) => f.origin).length === 2, "manifest carries origin on handed-off features");

  console.log("\nAll researcher-mode assertions passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
