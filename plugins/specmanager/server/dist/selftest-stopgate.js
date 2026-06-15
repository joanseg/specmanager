// R1 smoke test — the Stop-gate hook (hooks/stop-gate.sh) driven end-to-end with
// the marker-first resolveActiveCard: no marker ⇒ no-op (the bug fix), an
// explicit active-build marker pins the gate to one {featureId, phase}, exit 2
// on a failing command / open tasks, the "none" marker skips the run, a
// stale/finished marker auto-clears, and the N=3 iteration cap surfaces the
// phase as blocked + exits 0.
//
// Usage: node dist/selftest-stopgate.js
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { initProject, createFeature, createDocument, setStatus, createTask, updateTask, setPhaseMeta, readTasksMeta, setActiveBuild, clearActiveBuild, readActiveBuild, } from "./core/index.js";
function assert(cond, msg) {
    if (!cond)
        throw new Error(`FAIL: ${msg}`);
    console.log(`ok — ${msg}`);
}
// dist/selftest-stopgate.js → plugin root is two levels up from server/dist.
const here = path.dirname(fileURLToPath(import.meta.url)); // .../server/dist
const PLUGIN_ROOT = path.resolve(here, "..", ".."); // .../plugins/specmanager
const HOOK = path.join(PLUGIN_ROOT, "hooks", "stop-gate.sh");
function runHook(root) {
    const r = spawnSync("bash", [HOOK], {
        input: "{}",
        env: { ...process.env, CLAUDE_PLUGIN_ROOT: PLUGIN_ROOT, SPECMANAGER_PROJECT_DIR: root },
        encoding: "utf8",
    });
    return { code: r.status ?? -1, stderr: r.stderr ?? "" };
}
async function main() {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "specmanager-stopgate-"));
    console.log(`tmp project: ${root}`);
    console.log(`hook: ${HOOK}`);
    // 1. No marker → no-op pass (exit 0) even with an unrelated open-task feature.
    //    This is the exact shipped bug: a project-wide scan would lock onto this
    //    feature and demand a build. The marker-first resolver returns null.
    await initProject(root);
    const unrelated = await createFeature("Unrelated feature", root);
    const unrelatedPlan = await createDocument({
        featureId: unrelated.id,
        stage: "plan",
        title: "Unrelated plan",
        body: "# Plan\n\n## Phase core — x\n**Exit test:** echo ok\n",
    }, root);
    await setStatus(unrelatedPlan.frontmatter.id, "approved", root);
    await createTask({ featureId: unrelated.id, title: "U1", phase: "core", complexity: 2 }, root);
    await setPhaseMeta(unrelated.id, "core", { testCommand: "true", architectureRefs: [] }, root);
    assert((await readActiveBuild(root)) === null, "no active-build marker exists initially");
    const noMarker = runHook(root);
    assert(noMarker.code === 0, "no-op pass when no marker exists despite an unrelated open-task feature");
    assert(noMarker.stderr.trim() === "", "no-marker no-op writes no stderr");
    // Set up the in-flight feature with an approved plan + one open core task.
    const feature = await createFeature("Gate feature", root);
    const plan = await createDocument({
        featureId: feature.id,
        stage: "plan",
        title: "Gate plan",
        body: "# Plan\n\n## Phase core — x\n**Exit test:** echo ok\n",
    }, root);
    await setStatus(plan.frontmatter.id, "approved", root);
    const t1 = await createTask({ featureId: feature.id, title: "T1", phase: "core", complexity: 2 }, root);
    // 2. Marker pins the gate. Passing command but open task → exit 2.
    await setActiveBuild({ featureId: feature.id, phase: "core" }, root);
    await setPhaseMeta(feature.id, "core", { testCommand: "true", architectureRefs: [] }, root);
    const openFail = runHook(root);
    assert(openFail.code === 2, "exit 2 when the pinned phase has open tasks");
    assert(openFail.stderr.includes("not done"), "stderr names the open task");
    // 3. Passing command + task done → false-in-flight guard clears the marker, exit 0.
    await updateTask({ id: t1.id, featureId: feature.id, status: "done", artifacts: { files: ["x.ts"] } }, root);
    const pass = runHook(root);
    assert(pass.code === 0, "exit 0 when command passes and all pinned-phase tasks done");
    assert((await readActiveBuild(root)) === null, "finished phase auto-clears the marker (false-in-flight guard)");
    // 4. "none" marker → skip the run, verify criteria only. Re-pin the marker and
    //    add a second open task so the phase is in flight again; none-marker must
    //    not fabricate a test failure, but the open task still fails criteria.
    const t2 = await createTask({ featureId: feature.id, title: "T2", phase: "core", complexity: 1 }, root);
    await setActiveBuild({ featureId: feature.id, phase: "core" }, root);
    await setPhaseMeta(feature.id, "core", { testCommand: "none", architectureRefs: [] }, root);
    const noneOpen = runHook(root);
    assert(noneOpen.code === 2, "none-marker still fails on open tasks (criteria only)");
    assert(!noneOpen.stderr.includes("tests failing"), "none-marker never reports a test failure");
    // 4b. Clear-on-done: mark the task done + clearActiveBuild → next stop no-ops.
    await updateTask({ id: t2.id, featureId: feature.id, status: "done", artifacts: { files: ["y.ts"] } }, root);
    await clearActiveBuild(root);
    const cleared = runHook(root);
    assert(cleared.code === 0, "clear-on-done: no marker after clearActiveBuild → exit 0");
    // 4c. Stale-marker guard: pin a marker on a phase whose tasks are all done →
    //     guard returns null, exit 0, and the marker is auto-cleared.
    await setActiveBuild({ featureId: feature.id, phase: "core" }, root);
    const stale = runHook(root);
    assert(stale.code === 0, "stale marker (phase all done) → exit 0");
    assert((await readActiveBuild(root)) === null, "stale marker auto-cleared after the guard fires");
    // 5. Iteration cap: failing command + open task, pinned via its own marker.
    const cap = await createFeature("Cap feature", root);
    const capPlan = await createDocument({ featureId: cap.id, stage: "plan", title: "Cap plan", body: "# Plan\n\n## Phase core — x\n**Exit test:** n/a\n" }, root);
    await setStatus(capPlan.frontmatter.id, "approved", root);
    await createTask({ featureId: cap.id, title: "C1", phase: "core", complexity: 2 }, root);
    // Pin the marker to the cap feature explicitly — resolution never scans.
    await setActiveBuild({ featureId: cap.id, phase: "core" }, root);
    await setPhaseMeta(cap.id, "core", { testCommand: "false", architectureRefs: [] }, root);
    const a1 = runHook(root);
    assert(a1.code === 2, "cap attempt 1 → exit 2");
    const a2 = runHook(root);
    assert(a2.code === 2, "cap attempt 2 → exit 2");
    const a3 = runHook(root);
    assert(a3.code === 0, "cap attempt 3 → exit 0 (blocked, no infinite loop)");
    assert(a3.stderr.includes("BLOCKED"), "cap attempt 3 stderr announces BLOCKED");
    const meta = await readTasksMeta(cap.id, root);
    assert(typeof meta.blocked["core"] === "string", "blocked note recorded for the phase");
    // Counter reset after cap: a fresh fail starts the budget over (exit 2 again).
    // The cap phase still has its open task and the marker is still pinned.
    const a4 = runHook(root);
    assert(a4.code === 2, "counter reset after cap → next fail is exit 2 again");
    console.log("\nAll R1 Stop-gate assertions passed.");
    console.log(`Inspect the tmp project at: ${root}`);
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=selftest-stopgate.js.map