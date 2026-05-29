import { useEffect, useMemo, useState } from "react";
import { createTaskApi, fetchTasks, openWebSocket, patchTask } from "./api";
import { Task, TaskStatus } from "./types";

const DEFAULT_PHASE = "default";

interface BuildPanelProps {
  featureId: string;
  featureTitle: string;
  onClose: () => void;
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "Todo",
  in_progress: "In progress",
  done: "Done",
};
const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "done"];

export default function BuildPanel({ featureId, featureTitle, onClose }: BuildPanelProps) {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);

  const reload = (): void => {
    fetchTasks(featureId)
      .then((t) => {
        setTasks(t);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  };

  useEffect(() => {
    reload();
    let pending = 0;
    const close = openWebSocket((event) => {
      if (event.type === "task.updated" && event.featureId === featureId) {
        window.clearTimeout(pending);
        pending = window.setTimeout(reload, 80);
      }
    });
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(pending);
      close();
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featureId]);

  const counts = useMemo(() => {
    const c: Record<TaskStatus, number> = { todo: 0, in_progress: 0, done: 0 };
    for (const t of tasks ?? []) c[t.status]++;
    return c;
  }, [tasks]);
  const total = (tasks ?? []).length;
  const donePct = total === 0 ? 0 : Math.round((counts.done / total) * 100);
  const progPct = total === 0 ? 0 : Math.round((counts.in_progress / total) * 100);

  // Group tasks by phase, preserving first-seen order (matches core/phases.ts rollup).
  const phaseGroups = useMemo(() => {
    const order: string[] = [];
    const byPhase = new Map<string, Task[]>();
    for (const t of tasks ?? []) {
      const name = t.phase || DEFAULT_PHASE;
      if (!byPhase.has(name)) {
        byPhase.set(name, []);
        order.push(name);
      }
      byPhase.get(name)!.push(t);
    }
    return order.map((name) => {
      const items = byPhase.get(name)!;
      const c: Record<TaskStatus, number> = { todo: 0, in_progress: 0, done: 0 };
      for (const t of items) c[t.status]++;
      return { name, tasks: items, counts: c, total: items.length };
    });
  }, [tasks]);
  const multiPhase = phaseGroups.length > 1 || (phaseGroups[0]?.name && phaseGroups[0].name !== DEFAULT_PHASE);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (name: string): void =>
    setCollapsed((m) => ({ ...m, [name]: !m[name] }));

  const setStatus = async (task: Task, status: TaskStatus): Promise<void> => {
    setBusy(task.id);
    try {
      await patchTask(featureId, task.id, { status });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const addArtifact = async (
    task: Task,
    kind: "commits" | "files",
    value: string
  ): Promise<void> => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setBusy(task.id);
    try {
      const next = Array.from(new Set([...task.artifacts[kind], trimmed]));
      await patchTask(featureId, task.id, { artifacts: { [kind]: next } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const removeArtifact = async (
    task: Task,
    kind: "commits" | "files",
    value: string
  ): Promise<void> => {
    setBusy(task.id);
    try {
      const next = task.artifacts[kind].filter((v) => v !== value);
      await patchTask(featureId, task.id, { artifacts: { [kind]: next } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const setPr = async (task: Task, value: string): Promise<void> => {
    const trimmed = value.trim();
    setBusy(task.id);
    try {
      await patchTask(featureId, task.id, {
        artifacts: { pr: trimmed === "" ? null : trimmed },
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const createTask = async (): Promise<void> => {
    if (!newTitle.trim()) return;
    setBusy("__new");
    try {
      await createTaskApi(featureId, newTitle.trim());
      setNewTitle("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="panel-backdrop" onClick={onClose}>
      <aside className="panel" onClick={(e) => e.stopPropagation()}>
        <header className="panel__header">
          <button className="panel__close" onClick={onClose}>×</button>
          <div className="panel__title-row">
            <h2 className="panel__title">{featureTitle} · Build</h2>
            <span className="panel__meta">
              {counts.done}/{total} done
              {counts.in_progress > 0 && ` · ${counts.in_progress} in progress`}
            </span>
          </div>
          {total > 0 && (
            <div className="bar" style={{ marginTop: "0.6rem" }}>
              <div className="bar__seg bar__seg--done" style={{ width: `${donePct}%` }} />
              <div className="bar__seg bar__seg--prog" style={{ width: `${progPct}%` }} />
            </div>
          )}
        </header>

        {error && (
          <div className="banner banner--error">
            {error}
            <button className="link" onClick={() => setError(null)}>dismiss</button>
          </div>
        )}

        <div className="panel__tasks">
          {tasks === null ? (
            <p style={{ padding: "2rem", color: "var(--text-dim)" }}>Loading…</p>
          ) : tasks.length === 0 ? (
            <p style={{ padding: "1.5rem", color: "var(--text-dim)" }}>
              No tasks yet. The planner subagent (Phase 4) emits these from <code>/specmanager-plan</code>.
              You can also add ad-hoc tasks below.
            </p>
          ) : multiPhase ? (
            <div className="phase-groups">
              {phaseGroups.map((g) => {
                const phaseDonePct =
                  g.total === 0 ? 0 : Math.round((g.counts.done / g.total) * 100);
                const phaseProgPct =
                  g.total === 0 ? 0 : Math.round((g.counts.in_progress / g.total) * 100);
                const allDone = g.total > 0 && g.counts.done === g.total;
                const isCollapsed = collapsed[g.name] ?? false;
                const slash = `/specmanager-build ${featureId} ${g.name}`;
                const copySlash = (e: React.MouseEvent): void => {
                  e.stopPropagation();
                  void navigator.clipboard?.writeText(slash);
                };
                return (
                  <section key={g.name} className={`phase-group${allDone ? " phase-group--done" : ""}`}>
                    <header className="phase-group__head">
                      <button
                        type="button"
                        className="phase-group__toggle"
                        onClick={() => toggle(g.name)}
                        aria-expanded={!isCollapsed}
                      >
                        <span className="phase-group__caret">{isCollapsed ? "▸" : "▾"}</span>
                        <span className="phase-group__name">Phase {g.name}</span>
                        <span className="phase-group__count">
                          {g.counts.done}/{g.total} done
                          {g.counts.in_progress > 0 && ` · ${g.counts.in_progress} in progress`}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="phase-group__cmd"
                        title="copy /specmanager-build slash command"
                        onClick={copySlash}
                      >
                        {slash}
                      </button>
                    </header>
                    <div className="bar phase-group__bar">
                      <div className="bar__seg bar__seg--done" style={{ width: `${phaseDonePct}%` }} />
                      <div className="bar__seg bar__seg--prog" style={{ width: `${phaseProgPct}%` }} />
                    </div>
                    {!isCollapsed && (
                      <ul className="task-list task-list--in-phase">
                        {g.tasks.map((t) => (
                          <TaskRow
                            key={t.id}
                            task={t}
                            busy={busy === t.id}
                            onStatus={(s) => setStatus(t, s)}
                            onAddArtifact={(kind, v) => addArtifact(t, kind, v)}
                            onRemoveArtifact={(kind, v) => removeArtifact(t, kind, v)}
                            onSetPr={(v) => setPr(t, v)}
                          />
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          ) : (
            <ul className="task-list">
              {tasks.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  busy={busy === t.id}
                  onStatus={(s) => setStatus(t, s)}
                  onAddArtifact={(kind, v) => addArtifact(t, kind, v)}
                  onRemoveArtifact={(kind, v) => removeArtifact(t, kind, v)}
                  onSetPr={(v) => setPr(t, v)}
                />
              ))}
            </ul>
          )}
        </div>

        <footer className="panel__footer panel__footer--actions">
          <input
            type="text"
            placeholder="New task title…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void createTask();
            }}
            className="input"
          />
          <button
            className="btn btn--primary"
            disabled={!newTitle.trim() || busy === "__new"}
            onClick={createTask}
          >
            Add task
          </button>
        </footer>
      </aside>
    </div>
  );
}

function TaskRow({
  task,
  busy,
  onStatus,
  onAddArtifact,
  onRemoveArtifact,
  onSetPr,
}: {
  task: Task;
  busy: boolean;
  onStatus: (s: TaskStatus) => void;
  onAddArtifact: (kind: "commits" | "files", value: string) => void;
  onRemoveArtifact: (kind: "commits" | "files", value: string) => void;
  onSetPr: (value: string) => void;
}) {
  const [showArtifacts, setShowArtifacts] = useState(
    task.artifacts.commits.length + task.artifacts.files.length > 0 || task.artifacts.pr !== null
  );
  const [commitInput, setCommitInput] = useState("");
  const [fileInput, setFileInput] = useState("");

  return (
    <li className={`task task--${task.status}${busy ? " task--busy" : ""}`}>
      <div className="task__head">
        <span className="task__id">{task.id}</span>
        <span className="task__title">{task.title}</span>
        <div className="task__status">
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              className={`status-pill${task.status === s ? " status-pill--on" : ""} status-pill--${s}`}
              disabled={busy}
              onClick={() => onStatus(s)}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="task__toggle"
        onClick={() => setShowArtifacts((v) => !v)}
      >
        {showArtifacts ? "▾" : "▸"} artifacts
        {(task.artifacts.commits.length > 0 || task.artifacts.files.length > 0 || task.artifacts.pr) && (
          <span className="task__artifact-count">
            {" "}
            ({task.artifacts.commits.length + task.artifacts.files.length + (task.artifacts.pr ? 1 : 0)})
          </span>
        )}
      </button>
      {showArtifacts && (
        <div className="task__artifacts">
          <div className="task__artifact-group">
            <label>Commits</label>
            <ul>
              {task.artifacts.commits.map((c) => (
                <li key={c}>
                  <code>{c}</code>
                  <button className="link link--small" onClick={() => onRemoveArtifact("commits", c)}>×</button>
                </li>
              ))}
            </ul>
            <input
              className="input input--small"
              placeholder="abc1234 or full sha"
              value={commitInput}
              onChange={(e) => setCommitInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onAddArtifact("commits", commitInput);
                  setCommitInput("");
                }
              }}
            />
          </div>
          <div className="task__artifact-group">
            <label>Files</label>
            <ul>
              {task.artifacts.files.map((f) => (
                <li key={f}>
                  <code>{f}</code>
                  <button className="link link--small" onClick={() => onRemoveArtifact("files", f)}>×</button>
                </li>
              ))}
            </ul>
            <input
              className="input input--small"
              placeholder="src/path/to/file.ts"
              value={fileInput}
              onChange={(e) => setFileInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onAddArtifact("files", fileInput);
                  setFileInput("");
                }
              }}
            />
          </div>
          <div className="task__artifact-group">
            <label>PR</label>
            <input
              className="input input--small"
              placeholder="https://github.com/.../pull/123"
              defaultValue={task.artifacts.pr ?? ""}
              onBlur={(e) => {
                const v = e.currentTarget.value;
                if ((task.artifacts.pr ?? "") !== v) onSetPr(v);
              }}
            />
          </div>
        </div>
      )}
    </li>
  );
}
