import fs from "node:fs/promises";
import path from "node:path";
import { Task, TaskArtifacts, TaskStatus, TasksFile, TasksFileSchema } from "./types.js";
import { projectRoot, stageDir } from "./paths.js";
import { nowIso, taskId } from "./ids.js";
import { events } from "./events.js";
import { findFeatureById } from "./features.js";

async function tasksFilePath(featureId: string, root: string): Promise<string> {
  const feature = await findFeatureById(featureId, root);
  if (!feature) throw new Error(`feature not found: ${featureId}`);
  await fs.mkdir(stageDir(feature.slug, "plan", root), { recursive: true });
  return path.join(stageDir(feature.slug, "plan", root), "tasks.json");
}

async function readTasksFile(featureId: string, root: string): Promise<TasksFile> {
  const p = await tasksFilePath(featureId, root);
  try {
    const raw = await fs.readFile(p, "utf8");
    return TasksFileSchema.parse(JSON.parse(raw));
  } catch {
    return { tasks: [] };
  }
}

async function writeTasksFile(
  featureId: string,
  file: TasksFile,
  root: string
): Promise<void> {
  const p = await tasksFilePath(featureId, root);
  await fs.writeFile(p, JSON.stringify(file, null, 2), "utf8");
}

export async function listTasks(featureId: string, root = projectRoot()): Promise<Task[]> {
  const file = await readTasksFile(featureId, root);
  return file.tasks;
}

export interface CreateTaskInput {
  featureId: string;
  title: string;
  stageRef?: string;
  dependsOn?: string[];
}

export async function createTask(input: CreateTaskInput, root = projectRoot()): Promise<Task> {
  const file = await readTasksFile(input.featureId, root);
  const now = nowIso();
  const task: Task = {
    id: taskId(file.tasks.length + 1),
    featureId: input.featureId,
    title: input.title,
    status: "todo",
    stageRef: input.stageRef,
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

export interface UpdateTaskInput {
  id: string;
  featureId: string;
  status?: TaskStatus;
  title?: string;
  artifacts?: Partial<TaskArtifacts>;
}

export async function updateTask(input: UpdateTaskInput, root = projectRoot()): Promise<Task> {
  const file = await readTasksFile(input.featureId, root);
  const idx = file.tasks.findIndex((t) => t.id === input.id);
  if (idx === -1) throw new Error(`task not found: ${input.id}`);
  const cur = file.tasks[idx]!;
  const merged: Task = {
    ...cur,
    status: input.status ?? cur.status,
    title: input.title ?? cur.title,
    artifacts: { ...cur.artifacts, ...(input.artifacts ?? {}) },
    updatedAt: nowIso(),
  };
  file.tasks[idx] = merged;
  await writeTasksFile(input.featureId, file, root);
  events.emit({ type: "task.updated", taskId: merged.id, featureId: input.featureId });
  return merged;
}
