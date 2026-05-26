// Phase 7.B smoke test — phased build loop:
//   plan (phased) → execute phase A → walkthrough phase A
//   → execute phase B → walkthrough phase B.
//
// Exercises core directly (no subagent spawn) — it simulates what the builder
// would do via the same MCP tools: update_task with artifacts, then check_gate,
// then create_document with `phase`. The agent prompt is the orthogonal half.
//
// Usage: node dist/selftest-execute.js
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildManifest, checkGate, createDocument, createFeature, createTask, FINAL_PHASE, initProject, listDocuments, getNextPhase, migrateWalkthroughs, setStatus, updateTask, walkthroughFilename, } from "./core/index.js";
function assert(cond, msg) {
    if (!cond)
        throw new Error(`FAIL: ${msg}`);
    console.log(`ok — ${msg}`);
}
async function main() {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "specmanager-execute-"));
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
    // ----- 7.B.3: 'final' walkthrough gate refused (reserved for 7.C) ---------
    const gateFinal = await checkGate(feature.id, "walkthrough", root, { phase: "final" });
    assert(gateFinal.ok === false, "final walkthrough is reserved for Phase 7.C");
    assert(walkthroughFilename(FINAL_PHASE) === "feature.md", "feature.md filename reserved for final");
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
    console.log("\nAll Phase 7.B assertions passed.");
    console.log(`Inspect the tmp project at: ${root}`);
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=selftest-execute.js.map