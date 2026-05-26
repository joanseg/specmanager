import { projectRoot } from "./paths.js";
import { listTasks } from "./tasks.js";
import { DEFAULT_PHASE, Task, TaskStatus } from "./types.js";

export type PhaseStatus = "empty" | "todo" | "in_progress" | "done";

export interface PhaseDescriptor {
  name: string;
  order: number;
  taskCount: number;
  doneCount: number;
  inProgressCount: number;
  status: PhaseStatus;
}

function statusOf(taskCount: number, counts: Record<TaskStatus, number>): PhaseStatus {
  if (taskCount === 0) return "empty";
  if (counts.done === taskCount) return "done";
  if (counts.in_progress > 0 || counts.done > 0) return "in_progress";
  return "todo";
}

export function rollupPhases(tasks: Task[]): PhaseDescriptor[] {
  const order = new Map<string, number>();
  const counts = new Map<string, { total: number; done: number; in_progress: number; todo: number }>();
  for (const t of tasks) {
    const name = t.phase || DEFAULT_PHASE;
    if (!order.has(name)) order.set(name, order.size);
    const c = counts.get(name) ?? { total: 0, done: 0, in_progress: 0, todo: 0 };
    c.total++;
    c[t.status]++;
    counts.set(name, c);
  }
  return [...order.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([name, idx]) => {
      const c = counts.get(name)!;
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

export async function listPhases(
  featureId: string,
  root = projectRoot()
): Promise<PhaseDescriptor[]> {
  const tasks = await listTasks(featureId, root);
  return rollupPhases(tasks);
}

export async function getNextPhase(
  featureId: string,
  root = projectRoot()
): Promise<PhaseDescriptor | null> {
  const phases = await listPhases(featureId, root);
  return phases.find((p) => p.status !== "done" && p.status !== "empty") ?? null;
}
