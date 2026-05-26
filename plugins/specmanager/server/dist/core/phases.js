import { projectRoot } from "./paths.js";
import { listTasks } from "./tasks.js";
import { DEFAULT_PHASE } from "./types.js";
function statusOf(taskCount, counts) {
    if (taskCount === 0)
        return "empty";
    if (counts.done === taskCount)
        return "done";
    if (counts.in_progress > 0 || counts.done > 0)
        return "in_progress";
    return "todo";
}
export function rollupPhases(tasks) {
    const order = new Map();
    const counts = new Map();
    for (const t of tasks) {
        const name = t.phase || DEFAULT_PHASE;
        if (!order.has(name))
            order.set(name, order.size);
        const c = counts.get(name) ?? { total: 0, done: 0, in_progress: 0, todo: 0 };
        c.total++;
        c[t.status]++;
        counts.set(name, c);
    }
    return [...order.entries()]
        .sort((a, b) => a[1] - b[1])
        .map(([name, idx]) => {
        const c = counts.get(name);
        return {
            name,
            order: idx,
            taskCount: c.total,
            doneCount: c.done,
            inProgressCount: c.in_progress,
            status: statusOf(c.total, { todo: c.todo, in_progress: c.in_progress, done: c.done }),
        };
    });
}
export async function listPhases(featureId, root = projectRoot()) {
    const tasks = await listTasks(featureId, root);
    return rollupPhases(tasks);
}
export async function getNextPhase(featureId, root = projectRoot()) {
    const phases = await listPhases(featureId, root);
    return phases.find((p) => p.status !== "done" && p.status !== "empty") ?? null;
}
//# sourceMappingURL=phases.js.map