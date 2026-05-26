import fs from "node:fs/promises";
import path from "node:path";
import { DEFAULT_PHASE, MAX_TASK_COMPLEXITY, TasksFileSchema, } from "./types.js";
import { projectRoot, stageDir } from "./paths.js";
import { nowIso, taskId } from "./ids.js";
import { events } from "./events.js";
import { findFeatureById } from "./features.js";
export class SplitRequiredError extends Error {
    code = "splitRequired";
    constructor(complexity) {
        super(`task complexity ${complexity} exceeds max ${MAX_TASK_COMPLEXITY} — split into smaller tasks before persisting`);
        this.name = "SplitRequiredError";
    }
}
function assertSplittable(complexity) {
    if (complexity != null && complexity > MAX_TASK_COMPLEXITY) {
        throw new SplitRequiredError(complexity);
    }
}
async function tasksFilePath(featureId, root) {
    const feature = await findFeatureById(featureId, root);
    if (!feature)
        throw new Error(`feature not found: ${featureId}`);
    await fs.mkdir(stageDir(feature.slug, "plan", root), { recursive: true });
    return path.join(stageDir(feature.slug, "plan", root), "tasks.json");
}
async function readTasksFile(featureId, root) {
    const p = await tasksFilePath(featureId, root);
    try {
        const raw = await fs.readFile(p, "utf8");
        return TasksFileSchema.parse(JSON.parse(raw));
    }
    catch {
        return { tasks: [] };
    }
}
async function writeTasksFile(featureId, file, root) {
    const p = await tasksFilePath(featureId, root);
    await fs.writeFile(p, JSON.stringify(file, null, 2), "utf8");
}
export async function listTasks(featureId, root = projectRoot()) {
    const file = await readTasksFile(featureId, root);
    return file.tasks;
}
export async function createTask(input, root = projectRoot()) {
    assertSplittable(input.complexity);
    const file = await readTasksFile(input.featureId, root);
    const now = nowIso();
    const task = {
        id: taskId(file.tasks.length + 1),
        featureId: input.featureId,
        title: input.title,
        status: "todo",
        stageRef: input.stageRef,
        phase: input.phase ?? DEFAULT_PHASE,
        complexity: input.complexity ?? null,
        dependsOn: input.dependsOn ?? [],
        artifacts: { commits: [], files: [], pr: null },
        createdAt: now,
        updatedAt: now,
    };
    file.tasks.push(task);
    await writeTasksFile(input.featureId, file, root);
    events.emit({ type: "task.updated", taskId: task.id, featureId: input.featureId });
    return task;
}
export async function updateTask(input, root = projectRoot()) {
    if (input.complexity !== undefined)
        assertSplittable(input.complexity);
    const file = await readTasksFile(input.featureId, root);
    const idx = file.tasks.findIndex((t) => t.id === input.id);
    if (idx === -1)
        throw new Error(`task not found: ${input.id}`);
    const cur = file.tasks[idx];
    const merged = {
        ...cur,
        status: input.status ?? cur.status,
        title: input.title ?? cur.title,
        phase: input.phase ?? cur.phase,
        complexity: input.complexity !== undefined ? input.complexity : cur.complexity,
        artifacts: { ...cur.artifacts, ...(input.artifacts ?? {}) },
        updatedAt: nowIso(),
    };
    file.tasks[idx] = merged;
    await writeTasksFile(input.featureId, file, root);
    events.emit({ type: "task.updated", taskId: merged.id, featureId: input.featureId });
    return merged;
}
//# sourceMappingURL=tasks.js.map