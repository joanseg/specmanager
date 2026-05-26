// Phase 7.A smoke test — phase rollup, Fibonacci complexity validation,
// and legacy fallback for tasks.json that pre-dates the phase field.
//
// Usage: node dist/selftest-phases.js

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  initProject,
  createFeature,
  createTask,
  updateTask,
  listPhases,
  getNextPhase,
  listTasks,
} from "./core/index.js";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`ok — ${message}`);
}

async function main(): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "specmanager-phases-"));
  console.log(`tmp project: ${root}`);

  await initProject(root);
  const feature = await createFeature("Phased build", root);

  // 1. Create tasks across two phases.
  const a1 = await createTask(
    { featureId: feature.id, title: "A1", phase: "A", complexity: 2 },
    root
  );
  const a2 = await createTask(
    { featureId: feature.id, title: "A2", phase: "A", complexity: 3, dependsOn: [a1.id] },
    root
  );
  const b1 = await createTask(
    { featureId: feature.id, title: "B1", phase: "B", complexity: 1 },
    root
  );
  assert(a1.phase === "A" && a1.complexity === 2, "task A1 persisted with phase + complexity");
  assert(b1.complexity === 1, "task B1 complexity stored");

  // 2. Reject complexity >= 5 with splitRequired.
  let rejected = false;
  try {
    await createTask(
      { featureId: feature.id, title: "too big", phase: "A", complexity: 5 },
      root
    );
  } catch (err) {
    rejected = true;
    const e = err as Error & { code?: string };
    assert(e.code === "splitRequired", "rejection carries splitRequired error code");
  }
  assert(rejected, "complexity 5 is rejected at create_task");

  // updateTask must reject too.
  let rejected2 = false;
  try {
    await updateTask({ id: a1.id, featureId: feature.id, complexity: 8 }, root);
  } catch {
    rejected2 = true;
  }
  assert(rejected2, "complexity 8 is rejected at update_task");

  // 3. Phase rollup in first-seen order.
  const phases = await listPhases(feature.id, root);
  assert(phases.length === 2, "two phases discovered");
  assert(phases[0]!.name === "A" && phases[0]!.order === 0, "phase A is first");
  assert(phases[1]!.name === "B" && phases[1]!.order === 1, "phase B is second");
  assert(phases[0]!.taskCount === 2 && phases[0]!.doneCount === 0, "phase A counts correct");

  // 4. getNextPhase returns A while A has open tasks.
  const next1 = await getNextPhase(feature.id, root);
  assert(next1?.name === "A", "next phase is A while A is incomplete");

  // 5. Complete phase A → next phase is B. (artifacts required for done transition.)
  await updateTask(
    { id: a1.id, featureId: feature.id, status: "done", artifacts: { files: ["src/a1.ts"] } },
    root
  );
  await updateTask(
    { id: a2.id, featureId: feature.id, status: "done", artifacts: { files: ["src/a2.ts"] } },
    root
  );
  const next2 = await getNextPhase(feature.id, root);
  assert(next2?.name === "B", "next phase advances to B once A is done");

  // 6. Complete B → no next phase.
  await updateTask(
    { id: b1.id, featureId: feature.id, status: "done", artifacts: { commits: ["b1abc"] } },
    root
  );
  const next3 = await getNextPhase(feature.id, root);
  assert(next3 === null, "no next phase when all phases done");

  // 7. Legacy fallback: hand-write a tasks.json without phase/complexity fields and read it back.
  const legacy = await createFeature("Legacy feature", root);
  const legacyTasksPath = path.join(
    root,
    ".claude/specs/features",
    legacy.slug,
    "plan",
    "tasks.json"
  );
  await fs.mkdir(path.dirname(legacyTasksPath), { recursive: true });
  const now = new Date().toISOString();
  await fs.writeFile(
    legacyTasksPath,
    JSON.stringify(
      {
        tasks: [
          {
            id: "task-1",
            featureId: legacy.id,
            title: "Pre-phase task",
            status: "todo",
            dependsOn: [],
            artifacts: { commits: [], files: [], pr: null },
            createdAt: now,
            updatedAt: now,
          },
        ],
      },
      null,
      2
    ),
    "utf8"
  );
  const legacyTasks = await listTasks(legacy.id, root);
  assert(legacyTasks.length === 1, "legacy tasks.json reads back");
  assert(legacyTasks[0]!.phase === "default", "legacy task defaults to phase 'default'");
  assert(legacyTasks[0]!.complexity === null, "legacy task defaults to complexity null");
  const legacyPhases = await listPhases(legacy.id, root);
  assert(
    legacyPhases.length === 1 && legacyPhases[0]!.name === "default",
    "legacy task surfaces under 'default' phase"
  );

  console.log("\nAll Phase 7.A assertions passed.");
  console.log(`Inspect the tmp project at: ${root}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
