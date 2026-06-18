// Phase 7.B smoke test — phased build loop:
//   plan (phased) → build phase A → walkthrough phase A
//   → build phase B → walkthrough phase B.
//
// Exercises core directly (no subagent spawn) — it simulates what the builder
// would do via the same MCP tools: update_task with artifacts, then check_gate,
// then create_document with `phase`. The agent prompt is the orthogonal half.
//
// Usage: node dist/selftest-build.js
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildManifest, checkGate, createDocument, createFeature, createTask, FINAL_PHASE, initProject, isFeatureShipped, listDocuments, getNextPhase, getPhaseCompletion, migrateWalkthroughs, setStatus, updateTask, walkthroughFilename, } from "./core/index.js";
function assert(cond, msg) {
    if (!cond)
        throw new Error(`FAIL: ${msg}`);
    console.log(`ok — ${msg}`);
}
async function main() {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "specmanager-build-"));
    console.log(`tmp project: ${root}`);
    await initProject(root);
    const feature = await createFeature("Phased loop", root);
    // Approved Plan doc + two-phase task list.
    const plan = await createDocument({
        featureId: feature.id,
        stage: "plan",
        title: "Phased loop plan",
        body: "# Plan\n\n## Phase A — Core\n**Exit test:** A1 + A2 ship.\n\n## Phase B — Polish\n**Exit test:** B1 ships.",
    }, root);
    await setStatus(plan.frontmatter.id, "approved", root);
    const a1 = await createTask({ featureId: feature.id, title: "A1", phase: "A", complexity: 2 }, root);
    const a2 = await createTask({ featureId: feature.id, title: "A2", phase: "A", complexity: 3, dependsOn: [a1.id] }, root);
    const b1 = await createTask({ featureId: feature.id, title: "B1", phase: "B", complexity: 1 }, root);
    // ----- Phase 7.B.3: per-phase gate ----------------------------------------
    const gateA0 = await checkGate(feature.id, "walkthrough", root, { phase: "A" });
    assert(gateA0.ok === false, "walkthrough gate A closed before A is done");
    // ----- Phase 7.B.9: missingArtifact rejection -----------------------------
    let missing = false;
    try {
        await updateTask({ id: a1.id, featureId: feature.id, status: "done" }, root);
    }
    catch (err) {
        missing = true;
        assert(err.code === "missingArtifact", "missingArtifact code");
    }
    assert(missing, "update_task refuses done transition without artifacts");
    // ----- Execute Phase A: mark in_progress then done with artifacts ---------
    await updateTask({ id: a1.id, featureId: feature.id, status: "in_progress" }, root);
    await updateTask({
        id: a1.id,
        featureId: feature.id,
        status: "done",
        artifacts: { commits: ["a1abc"], files: ["src/a1.ts"] },
    }, root);
    await updateTask({
        id: a2.id,
        featureId: feature.id,
        status: "done",
        artifacts: { files: ["src/a2.ts"] },
    }, root);
    // Phase A gate now opens; Phase B's stays closed.
    const gateA1 = await checkGate(feature.id, "walkthrough", root, { phase: "A" });
    assert(gateA1.ok === true, "walkthrough gate A opens once A's tasks done");
    const gateB0 = await checkGate(feature.id, "walkthrough", root, { phase: "B" });
    assert(gateB0.ok === false, "walkthrough gate B still closed");
    // get_next_phase advances.
    const next1 = await getNextPhase(feature.id, root);
    assert(next1?.name === "B", "next phase advances to B after A done");
    // ----- 7.B.1: phase-A walkthrough lands at phase-a.md ---------------------
    const wtA = await createDocument({
        featureId: feature.id,
        stage: "walkthrough",
        title: "Phased loop — Phase A walkthrough",
        body: "# Phase A\n\nA1 + A2 shipped.",
        generatedBy: "agent",
        phase: "A",
        dependsOn: [plan.frontmatter.id],
        basedOn: { [plan.frontmatter.id]: plan.frontmatter.version },
    }, root);
    assert(wtA.filePath.endsWith("phase-a.md"), `phase A walkthrough at phase-a.md (got ${wtA.filePath})`);
    assert(wtA.frontmatter.phase === "A", "phase A walkthrough carries phase=A in frontmatter");
    // Manifest rollup associates walkthrough with phase A.
    const manifest1 = await buildManifest(root);
    const featM1 = manifest1.features.find((f) => f.id === feature.id);
    const phaseA = featM1.phases.find((p) => p.name === "A");
    assert(phaseA.walkthroughId === wtA.frontmatter.id, "manifest phase A links walkthrough id");
    assert(phaseA.walkthroughStatus === "draft", "manifest phase A walkthrough is draft");
    // Cannot create a second walkthrough for the same phase (filename collision).
    let duped = false;
    try {
        await createDocument({
            featureId: feature.id,
            stage: "walkthrough",
            title: "dup",
            body: "x",
            phase: "A",
        }, root);
    }
    catch {
        duped = true;
    }
    assert(duped, "second phase-A walkthrough rejected (file already exists)");
    // ----- Execute Phase B ----------------------------------------------------
    await updateTask({
        id: b1.id,
        featureId: feature.id,
        status: "done",
        artifacts: { commits: ["b1xyz"] },
    }, root);
    const gateB1 = await checkGate(feature.id, "walkthrough", root, { phase: "B" });
    assert(gateB1.ok === true, "walkthrough gate B opens once B's tasks done");
    const wtB = await createDocument({
        featureId: feature.id,
        stage: "walkthrough",
        title: "Phased loop — Phase B walkthrough",
        body: "# Phase B\n\nB1 shipped.",
        generatedBy: "agent",
        phase: "B",
        dependsOn: [plan.frontmatter.id],
    }, root);
    assert(wtB.filePath.endsWith("phase-b.md"), "phase B walkthrough at phase-b.md");
    // Manifest now has both phase walkthroughs.
    const manifest2 = await buildManifest(root);
    const featM2 = manifest2.features.find((f) => f.id === feature.id);
    assert(featM2.phases.length === 2 &&
        featM2.phases.every((p) => p.walkthroughId !== null), "both phases have walkthrough ids in manifest");
    // get_next_phase null when everything done.
    const next2 = await getNextPhase(feature.id, root);
    assert(next2 === null, "no next phase once both done");
    // ----- 7.C.7: 'final' walkthrough gate ------------------------------------
    // Both phase walkthroughs exist but are still draft → final closed.
    const gateFinal0 = await checkGate(feature.id, "walkthrough", root, { phase: "final" });
    assert(gateFinal0.ok === false, "final gate closed while phase walkthroughs are draft");
    assert(gateFinal0.reason?.includes("A") && gateFinal0.reason?.includes("B"), "final gate reason lists missing phases");
    // Approve phase A walkthrough → final still closed (B still draft).
    await setStatus(wtA.frontmatter.id, "approved", root);
    const gateFinal1 = await checkGate(feature.id, "walkthrough", root, { phase: "final" });
    assert(gateFinal1.ok === false, "final still closed while B walkthrough is draft");
    assert(!gateFinal1.reason?.includes("A,") && gateFinal1.reason?.includes("B"), "final gate reason now only lists B");
    // Approve phase B walkthrough → final opens.
    await setStatus(wtB.frontmatter.id, "approved", root);
    const gateFinal2 = await checkGate(feature.id, "walkthrough", root, { phase: "final" });
    assert(gateFinal2.ok === true, "final gate opens once every phase walkthrough is approved");
    // Final walkthrough doc lands at feature.md.
    const wtFinal = await createDocument({
        featureId: feature.id,
        stage: "walkthrough",
        title: "Phased loop — feature walkthrough",
        body: "# Final\n\nLinks every phase.",
        generatedBy: "agent",
        phase: "final",
        dependsOn: [plan.frontmatter.id, wtA.frontmatter.id, wtB.frontmatter.id],
    }, root);
    assert(walkthroughFilename(FINAL_PHASE) === "feature.md", "feature.md filename reserved for final");
    assert(wtFinal.filePath.endsWith("feature.md"), "final walkthrough lands at feature.md");
    assert(wtFinal.frontmatter.phase === "final", "final walkthrough carries phase=final");
    // ----- 7.B.1: migrate legacy walkthrough ---------------------------------
    const legacy = await createFeature("Legacy feat", root);
    const legacyPlan = await createDocument({
        featureId: legacy.id,
        stage: "plan",
        title: "L plan",
        body: "# L",
    }, root);
    await setStatus(legacyPlan.frontmatter.id, "approved", root);
    const legacyTask = await createTask({ featureId: legacy.id, title: "L1" }, root);
    await updateTask({ id: legacyTask.id, featureId: legacy.id, status: "done", artifacts: { files: ["src/l.ts"] } }, root);
    // Hand-write a legacy non-phase walkthrough file directly.
    const legacyWtDir = path.join(root, ".claude/specs/features", legacy.slug, "walkthroughs");
    await fs.mkdir(legacyWtDir, { recursive: true });
    const legacyOldPath = path.join(legacyWtDir, "legacy-walkthrough.md");
    const now = new Date().toISOString();
    await fs.writeFile(legacyOldPath, `---\nid: wt-legacy-feat-001\nfeatureId: ${legacy.id}\nstage: walkthrough\nstatus: draft\nstale: false\ntitle: Legacy WT\ndependsOn: []\nbasedOn: {}\ngeneratedBy: human\nversion: 1\ncreatedAt: "${now}"\nupdatedAt: "${now}"\n---\n\n# Legacy\n`, "utf8");
    const migrated = await migrateWalkthroughs(root);
    assert(migrated.length === 1, "migrated 1 legacy walkthrough");
    assert(migrated[0].endsWith("phase-default.md"), `migration renames to phase-default.md (got ${migrated[0]})`);
    // Old path is gone; new path has phase:default in frontmatter.
    const oldGone = await fs
        .stat(legacyOldPath)
        .then(() => false)
        .catch(() => true);
    assert(oldGone, "legacy file removed after rename");
    const legacyDocs = await listDocuments({ featureId: legacy.id, stage: "walkthrough" }, root);
    assert(legacyDocs.length === 1, "legacy walkthrough still discoverable");
    assert(legacyDocs[0].frontmatter.phase === "default", "migrated legacy doc has phase=default in frontmatter");
    // Re-running migration is a no-op.
    const migratedAgain = await migrateWalkthroughs(root);
    assert(migratedAgain.length === 0, "second migration is a no-op");
    // Legacy gate uses synthetic 'default' phase.
    const legacyGate = await checkGate(feature.id, "walkthrough", root);
    assert(legacyGate.ok === false, "default-phase gate on multi-phase feature is closed (no default tasks)");
    // ----- 7.C.8: single-phase auto-ship (isFeatureShipped) -------------------
    // A one-phase feature ships when its only phase walkthrough is approved — no
    // separate "final" roll-up needed. Multi-phase still requires "final".
    assert(isFeatureShipped([{ stage: "walkthrough", status: "approved", phase: "core" }], [{ name: "core" }]) === true, "single-phase: approved phase walkthrough ships the feature");
    assert(isFeatureShipped([{ stage: "walkthrough", status: "draft", phase: "core" }], [{ name: "core" }]) === false, "single-phase: a draft phase walkthrough does not ship");
    assert(isFeatureShipped([{ stage: "walkthrough", status: "approved", phase: "A" }], [{ name: "A" }, { name: "B" }]) === false, "multi-phase: one approved phase walkthrough does not ship");
    assert(isFeatureShipped([{ stage: "walkthrough", status: "approved", phase: "final" }], [{ name: "A" }, { name: "B" }]) === true, "multi-phase: approved final roll-up ships");
    // ----- get_phase_completion: deterministic post-phase branch predicate ----
    // The build command calls this after the builder returns OR errors so the
    // post-phase pipeline (walkthrough + doc-sync) never depends on the exit path.
    // (a) Multi-phase feature, phase B all-done, no phase-B walkthrough yet
    //     (wtB above was approved earlier, so it DOES have one — use a fresh
    //     feature to get a clean all-done-no-walkthrough case).
    const pcFeat = await createFeature("Phase-completion feat", root);
    const pcPlan = await createDocument({ featureId: pcFeat.id, stage: "plan", title: "PC plan", body: "# PC" }, root);
    await setStatus(pcPlan.frontmatter.id, "approved", root);
    // Phase P1: two tasks; Phase P2: one task — multi-phase.
    const p1a = await createTask({ featureId: pcFeat.id, title: "P1A", phase: "P1", complexity: 1 }, root);
    const p1b = await createTask({ featureId: pcFeat.id, title: "P1B", phase: "P1", complexity: 1 }, root);
    await createTask({ featureId: pcFeat.id, title: "P2A", phase: "P2", complexity: 1 }, root);
    // Only P1A done so far → P1 incomplete (the errored-but-incomplete 18/21 case).
    await updateTask({ id: p1a.id, featureId: pcFeat.id, status: "done", artifacts: { files: ["p1a.ts"] } }, root);
    const pcIncomplete = await getPhaseCompletion(pcFeat.id, "P1", root);
    assert(pcIncomplete !== null && pcIncomplete.complete === false && pcIncomplete.needsWalkthrough === false, "get_phase_completion: 1/2 done ⇒ !complete && !needsWalkthrough");
    assert(pcIncomplete.isSinglePhase === false, "get_phase_completion: two phases ⇒ !isSinglePhase");
    // Finish P1 → all-done, no walkthrough ⇒ complete && needsWalkthrough.
    await updateTask({ id: p1b.id, featureId: pcFeat.id, status: "done", artifacts: { files: ["p1b.ts"] } }, root);
    const pcComplete = await getPhaseCompletion(pcFeat.id, "P1", root);
    assert(pcComplete !== null && pcComplete.complete === true && pcComplete.needsWalkthrough === true, "get_phase_completion: all-done + no walkthrough ⇒ complete && needsWalkthrough");
    assert(pcComplete.hasWalkthrough === false, "get_phase_completion: no walkthrough ⇒ hasWalkthrough false");
    // Add a draft walkthrough for P1 ⇒ dedupe: complete && !needsWalkthrough.
    await createDocument({
        featureId: pcFeat.id,
        stage: "walkthrough",
        title: "PC — P1 walkthrough",
        body: "# P1",
        generatedBy: "agent",
        phase: "P1",
    }, root);
    const pcDeduped = await getPhaseCompletion(pcFeat.id, "P1", root);
    assert(pcDeduped !== null && pcDeduped.complete === true && pcDeduped.needsWalkthrough === false, "get_phase_completion: all-done + existing draft walkthrough ⇒ complete && !needsWalkthrough (dedupe)");
    assert(pcDeduped.hasWalkthrough === true, "get_phase_completion: walkthrough present ⇒ hasWalkthrough true");
    // Unknown phase name ⇒ null.
    const pcUnknown = await getPhaseCompletion(pcFeat.id, "nope", root);
    assert(pcUnknown === null, "get_phase_completion: unknown phase ⇒ null");
    // (d) Single-phase feature all-done ⇒ isSinglePhase true.
    const spFeat = await createFeature("Single-phase PC", root);
    const spPlan = await createDocument({ featureId: spFeat.id, stage: "plan", title: "SP plan", body: "# SP" }, root);
    await setStatus(spPlan.frontmatter.id, "approved", root);
    const spTask = await createTask({ featureId: spFeat.id, title: "S1", phase: "core", complexity: 2 }, root);
    await updateTask({ id: spTask.id, featureId: spFeat.id, status: "done", artifacts: { files: ["s1.ts"] } }, root);
    const spPc = await getPhaseCompletion(spFeat.id, "core", root);
    assert(spPc !== null && spPc.isSinglePhase === true && spPc.complete === true && spPc.needsWalkthrough === true, "get_phase_completion: single-phase all-done ⇒ isSinglePhase && complete && needsWalkthrough");
    console.log("\nAll Phase 7.B assertions passed.");
    console.log(`Inspect the tmp project at: ${root}`);
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=selftest-build.js.map