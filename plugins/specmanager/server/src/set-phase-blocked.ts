#!/usr/bin/env node
// CLI shim for the Stop-gate hook: at the iteration cap, block the ONE failing
// task and record a phase note that leads with its id (R4). Every other task
// keeps its status.
//
// Usage: set-phase-blocked.js <featureId> <phase> <taskId> <reason...>
//
// If the third argument is not a task id (the pre-R4 argv `<featureId> <phase>
// <reason...>`), only the phase note is recorded and no task is blocked — the
// shim never guesses a task.

import { setPhaseBlocked, updateTask } from "./core/index.js";

const TASK_ID = /^task-\d+$/;

const root =
  process.env.SPECMANAGER_PROJECT_DIR ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

const [, , featureId, phase, ...rest] = process.argv;
const taskId = rest[0] && TASK_ID.test(rest[0]) ? rest[0] : null;
const reason = (taskId ? rest.slice(1) : rest).join(" ") || "iteration cap reached";

if (!featureId || !phase) {
  process.stderr.write("set-phase-blocked: featureId and phase are required\n");
  process.exit(1);
}

(async () => {
  if (taskId) await updateTask({ id: taskId, featureId, status: "blocked" }, root);
  await setPhaseBlocked(featureId, phase, taskId ? `${taskId}: ${reason}` : reason, root);
})().catch((err) => {
  process.stderr.write(`set-phase-blocked: ${(err as Error).message}\n`);
  process.exit(1);
});
