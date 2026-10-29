#!/usr/bin/env node
// CLI shim for the Stop-gate hook: at the iteration cap, block the ONE failing
// task and record a phase note that leads with its id (R4). Every other task
// keeps its status.
//
// Usage: set-phase-blocked.js <featureId> <phase> <taskId> <reason...>
//
// A third argument that is not a task id is refused (exit 1, nothing written):
// the hook always passes the card's blockTaskId, so a malformed call is a bug to
// surface, never a reason to guess a task or write a phase-only note.

import { setPhaseBlocked, updateTask } from "./core/index.js";

const TASK_ID = /^task-\d+$/;

const root =
  process.env.SPECMANAGER_PROJECT_DIR ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

const [, , featureId, phase, taskId, ...rest] = process.argv;
const reason = rest.join(" ") || "iteration cap reached";

if (!featureId || !phase || !taskId || !TASK_ID.test(taskId)) {
  process.stderr.write("usage: set-phase-blocked.js <featureId> <phase> <taskId> <reason...>\n");
  process.exit(1);
}

(async () => {
  await updateTask({ id: taskId, featureId, status: "blocked" }, root);
  await setPhaseBlocked(featureId, phase, `${taskId}: ${reason}`, root);
})().catch((err) => {
  process.stderr.write(`set-phase-blocked: ${(err as Error).message}\n`);
  process.exit(1);
});
