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
export class MissingArtifactError extends Error {
    code = "missingArtifact";
    constructor(taskId) {
        super(`task ${taskId} cannot transition to 'done' without at least one commit or file ref — record artifacts via update_task before marking done`);
        this.name = "MissingArtifactError";
    }
}
function assertSplittable(complexity) {
    if (complexity != null && complexity > MAX_TASK_COMPLEXITY) {
        throw new SplitRequiredError(complexity);
    }
}
function hasArtifact(artifacts) {
    return artifacts.commits.length > 0 || artifacts.files.length > 0;
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
        return { tasks: [], meta: { phases: {}, blocked: {} } };
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
/** Per-phase planner metadata (testCommand / architectureRefs) + blocked notes. */
export async function readTasksMeta(featureId, root = projectRoot()) {
    const file = await readTasksFile(featureId, root);
    return file.meta;
}
/**
 * Set the planner-emitted metadata for a phase (R1 testCommand, R3
 * architectureRefs). `testCommand` is a runnable command or the literal "none".
 * Idempotent per phase; leaves other phases' meta untouched.
 */
export async function setPhaseMeta(featureId, phase, meta, root = projectRoot()) {
    const file = await readTasksFile(featureId, root);
    file.meta.phases[phase] = {
        testCommand: meta.testCommand,
        architectureRefs: meta.architectureRefs ?? [],
    };
    await writeTasksFile(featureId, file, root);
    events.emit({ type: "task.updated", taskId: `phase:${phase}`, featureId });
}
/**
 * Flip a phase's not-done tasks to the first-class `blocked` status so the board
 * surfaces it (R1 AC2). Idempotent. Cleared by re-entering the phase (the
 * builder re-marks tasks in_progress/done on rebuild).
 */
export async function blockPhaseTasks(featureId, phase, root = projectRoot()) {
    const file = await readTasksFile(featureId, root);
    let changed = false;
    for (const t of file.tasks) {
        if (t.phase === phase && t.status !== "done" && t.status !== "blocked") {
            t.status = "blocked";
            t.updatedAt = nowIso();
            changed = true;
        }
    }
    if (changed) {
        await writeTasksFile(featureId, file, root);
        events.emit({ type: "task.updated", taskId: `phase:${phase}`, featureId });
    }
}
/** Record a blocked note for a phase (R1 iteration-cap surfacing). */
export async function setPhaseBlocked(featureId, phase, reason, root = projectRoot()) {
    const file = await readTasksFile(featureId, root);
    file.meta.blocked[phase] = reason;
    await writeTasksFile(featureId, file, root);
    events.emit({ type: "task.updated", taskId: `phase:${phase}`, featureId });
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
    // Artifact discipline (Phase 7.B): every done transition must carry at least
    // one commit or file ref. Only enforced on the todo/in_progress → done edge,
    // not on idempotent done → done writes (no-op patches stay legal).
    if (merged.status === "done" && cur.status !== "done" && !hasArtifact(merged.artifacts)) {
        throw new MissingArtifactError(merged.id);
    }
    file.tasks[idx] = merged;
    await writeTasksFile(input.featureId, file, root);
    events.emit({ type: "task.updated", taskId: merged.id, featureId: input.featureId });
    return merged;
}
//# sourceMappingURL=tasks.js.map