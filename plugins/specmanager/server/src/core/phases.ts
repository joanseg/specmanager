import { projectRoot } from "./paths.js";
import { listTasks, readTasksMeta } from "./tasks.js";
import { DEFAULT_PHASE, PhaseKind, PhaseMeta, Prerequisite, Task, TaskStatus } from "./types.js";

export type PhaseStatus = "empty" | "todo" | "in_progress" | "done" | "blocked";

export interface PhaseDescriptor {
  name: string;
  order: number;
  taskCount: number;
  doneCount: number;
  inProgressCount: number;
  blockedCount: number;
  status: PhaseStatus;
  kind: PhaseKind;
  prerequisites: Prerequisite[];
}

function statusOf(taskCount: number, counts: Record<TaskStatus, number>): PhaseStatus {
  if (taskCount === 0) return "empty";
  // A blocked task dominates: the phase needs human attention before it can
  // advance (Stop-gate iteration cap). Cleared by re-entering + rebuilding.
  if (counts.blocked > 0) return "blocked";
  if (counts.done === taskCount) return "done";
  if (counts.in_progress > 0 || counts.done > 0) return "in_progress";
  return "todo";
}

/**
 * Roll tasks up into phases in first-appearance order, then append meta-only
 * `kind: "placeholder"` phases (no tasks yet) as `empty`. Meta-only keys of any
 * other kind are stale and ignored.
 */
export function rollupPhases(
  tasks: Task[],
  metaPhases: Record<string, PhaseMeta> = {}
): PhaseDescriptor[] {
  const order = new Map<string, number>();
  const counts = new Map<
    string,
    { total: number; done: number; in_progress: number; todo: number; blocked: number }
  >();
  for (const t of tasks) {
    const name = t.phase || DEFAULT_PHASE;
    if (!order.has(name)) order.set(name, order.size);
    const c = counts.get(name) ?? { total: 0, done: 0, in_progress: 0, todo: 0, blocked: 0 };
    c.total++;
    c[t.status]++;
    counts.set(name, c);
  }
  const fromTasks: PhaseDescriptor[] = [...order.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([name, idx]) => {
      const c = counts.get(name)!;
      return {
        name,
        order: idx,
        taskCount: c.total,
        doneCount: c.done,
        inProgressCount: c.in_progress,
        blockedCount: c.blocked,
        status: statusOf(c.total, {
          todo: c.todo,
          in_progress: c.in_progress,
          done: c.done,
          blocked: c.blocked,
        }),
        kind: metaPhases[name]?.kind ?? "build",
        prerequisites: metaPhases[name]?.prerequisites ?? [],
      };
    });
  const placeholders: PhaseDescriptor[] = Object.entries(metaPhases)
    .filter(([name, meta]) => !order.has(name) && meta.kind === "placeholder")
    .map(([name, meta], i) => ({
      name,
      order: fromTasks.length + i,
      taskCount: 0,
      doneCount: 0,
      inProgressCount: 0,
      blockedCount: 0,
      status: "empty",
      kind: meta.kind,
      prerequisites: meta.prerequisites,
    }));
  return [...fromTasks, ...placeholders];
}

export async function listPhases(
  featureId: string,
  root = projectRoot()
): Promise<PhaseDescriptor[]> {
  const tasks = await listTasks(featureId, root);
  const meta = await readTasksMeta(featureId, root);
  return rollupPhases(tasks, meta.phases);
}

export async function getNextPhase(
  featureId: string,
  root = projectRoot()
): Promise<PhaseDescriptor | null> {
  const phases = await listPhases(featureId, root);
  return phases.find((p) => p.status !== "done" && p.status !== "empty") ?? null;
}
