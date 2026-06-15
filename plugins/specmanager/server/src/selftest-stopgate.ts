// R1 smoke test — the Stop-gate hook (hooks/stop-gate.sh) driven end-to-end:
// no-op when nothing is in flight, exit 2 on a failing command / open tasks,
// "none" marker skips the run and verifies criteria only, and the N=3 iteration
// cap surfaces the phase as blocked + exits 0.
//
// Usage: node dist/selftest-stopgate.js

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import {
  initProject,
  createFeature,
  createDocument,
  setStatus,
  createTask,
  updateTask,
  setPhaseMeta,
  readTasksMeta,
} from "./core/index.js";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`ok — ${msg}`);
}

// dist/selftest-stopgate.js → plugin root is two levels up from server/dist.
const here = path.dirname(fileURLToPath(import.meta.url)); // .../server/dist
const PLUGIN_ROOT = path.resolve(here, "..", ".."); // .../plugins/specmanager
const HOOK = path.join(PLUGIN_ROOT, "hooks", "stop-gate.sh");

function runHook(root: string): { code: number; stderr: string } {
  const r = spawnSync("bash", [HOOK], {
    input: "{}",
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: PLUGIN_ROOT, SPECMANAGER_PROJECT_DIR: root },
    encoding: "utf8",
  });
  return { code: r.status ?? -1, stderr: r.stderr ?? "" };
}

async function main(): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "specmanager-stopgate-"));
  console.log(`tmp project: ${root}`);
  console.log(`hook: ${HOOK}`);

  // 1. Nothing in flight → no-op pass (exit 0).
  await initProject(root);
  const empty = runHook(root);
  assert(empty.code === 0, "no-op pass when nothing is in flight");

  // Set up a feature with an approved plan + one open core task.
  const feature = await createFeature("Gate feature", root);
  const plan = await createDocument(
    {
      featureId: feature.id,
      stage: "plan",
      title: "Gate plan",
      body: "# Plan\n\n## Phase core — x\n**Exit test:** echo ok\n",
    },
    root
  );
  await setStatus(plan.frontmatter.id, "approved", root);
  const t1 = await createTask({ featureId: feature.id, title: "T1", phase: "core", complexity: 2 }, root);

  // 2. Passing command but open task → exit 2 (tasks not done).
  await setPhaseMeta(feature.id, "core", { testCommand: "true", architectureRefs: [] }, root);
  const openFail = runHook(root);
  assert(openFail.code === 2, "exit 2 when phase has open tasks");
  assert(openFail.stderr.includes("not done"), "stderr names the open task");

  // 3. Passing command + task done → exit 0 pass.
  await updateTask({ id: t1.id, featureId: feature.id, status: "done", artifacts: { files: ["x.ts"] } }, root);
  const pass = runHook(root);
  assert(pass.code === 0, "exit 0 when command passes and all tasks done");

  // 4. "none" marker → skip the run, verify criteria only. Add a second open
  //    task so the phase is in flight again; none-marker must not fabricate a
  //    test failure, but the open task still fails the criteria check.
  const t2 = await createTask({ featureId: feature.id, title: "T2", phase: "core", complexity: 1 }, root);
  await setPhaseMeta(feature.id, "core", { testCommand: "none", architectureRefs: [] }, root);
  const noneOpen = runHook(root);
  assert(noneOpen.code === 2, "none-marker still fails on open tasks (criteria only)");
  assert(!noneOpen.stderr.includes("tests failing"), "none-marker never reports a test failure");
  await updateTask({ id: t2.id, featureId: feature.id, status: "done", artifacts: { files: ["y.ts"] } }, root);
  const nonePass = runHook(root);
  assert(nonePass.code === 0, "none-marker passes once criteria met (no run)");

  // 5. Iteration cap: failing command + open task, three attempts.
  const cap = await createFeature("Cap feature", root);
  const capPlan = await createDocument(
    { featureId: cap.id, stage: "plan", title: "Cap plan", body: "# Plan\n\n## Phase core — x\n**Exit test:** n/a\n" },
    root
  );
  await setStatus(capPlan.frontmatter.id, "approved", root);
  await createTask({ featureId: cap.id, title: "C1", phase: "core", complexity: 2 }, root);
  // Gate feature is fully done, so resolveActiveCard now targets the cap feature.
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
  const a4 = runHook(root);
  assert(a4.code === 2, "counter reset after cap → next fail is exit 2 again");

  console.log("\nAll R1 Stop-gate assertions passed.");
  console.log(`Inspect the tmp project at: ${root}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
