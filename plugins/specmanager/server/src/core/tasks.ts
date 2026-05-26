import fs from "node:fs/promises";
import path from "node:path";
import {
  DEFAULT_PHASE,
  MAX_TASK_COMPLEXITY,
  Task,
  TaskArtifacts,
  TaskComplexity,
  TaskStatus,
  TasksFile,
  TasksFileSchema,
} from "./types.js";
import { projectRoot, stageDir } from "./paths.js";
import { nowIso, taskId } from "./ids.js";
import { events } from "./events.js";
import { findFeatureById } from "./features.js";

export class SplitRequiredError extends Error {
  readonly code = "splitRequired";
  constructor(complexity: number) {
    super(
      `task complexity ${complexity} exceeds max ${MAX_TASK_COMPLEXITY} — split into smaller tasks before persisting`
    );
    this.name = "SplitRequiredError";
  }
}

export class MissingArtifactError extends Error {
  readonly code = "missingArtifact";
  constructor(taskId: string) {
    super(
      `task ${taskId} cannot transition to 'done' without at least one commit or file ref — record artifacts via update_task before marking done`
    );
    this.name = "MissingArtifactError";
  }
}

function assertSplittable(complexity: TaskComplexity | null | undefined): void {
  if (complexity != null && complexity > MAX_TASK_COMPLEXITY) {
    throw new SplitRequiredError(complexity);
  }
}

function hasArtifact(artifacts: TaskArtifacts): boolean {
  return artifacts.commits.length > 0 || artifacts.files.length > 0;
}

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
  phase?: string;
  complexity?: TaskComplexity | null;
  dependsOn?: string[];
}

export async function createTask(input: CreateTaskInput, root = projectRoot()): Promise<Task> {
  assertSplittable(input.complexity);
  const file = await readTasksFile(input.featureId, root);
  const now = nowIso();
  const task: Task = {
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

export interface UpdateTaskInput {
  id: string;
  featureId: string;
  status?: TaskStatus;
  title?: string;
  phase?: string;
  complexity?: TaskComplexity | null;
  artifacts?: Partial<TaskArtifacts>;
}

export async function updateTask(input: UpdateTaskInput, root = projectRoot()): Promise<Task> {
  if (input.complexity !== undefined) assertSplittable(input.complexity);
  const file = await readTasksFile(input.featureId, root);
  const idx = file.tasks.findIndex((t) => t.id === input.id);
  if (idx === -1) throw new Error(`task not found: ${input.id}`);
  const cur = file.tasks[idx]!;
  const merged: Task = {
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
