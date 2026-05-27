import { useCallback, useEffect, useState } from "react";
import { fetchBoard, openWebSocket } from "./api";
import DocPanel from "./DocPanel";
import BuildPanel from "./BuildPanel";
import { Board, COLUMNS, Column, DocCard, FeatureRow, PhaseRollup, Stage, TaskCounts } from "./types";

const DEFAULT_PHASE = "default";
const FINAL_PHASE = "final";

const STAGE_LABEL: Record<Column, string> = {
  prd: "PRD",
  architecture: "Architecture",
  plan: "Plan",
  build: "Build",
  walkthrough: "Walkthroughs",
};

function findDoc(row: FeatureRow, stage: Stage): DocCard | undefined {
  return row.documents.find((d) => d.stage === stage);
}

function priorStageApproved(row: FeatureRow, stage: Stage): boolean {
  const priors: Partial<Record<Stage, Stage>> = {
    architecture: "prd",
    plan: "architecture",
  };
  if (stage === "prd") return true;
  const prior = priors[stage];
  if (!prior) return true;
  const doc = findDoc(row, prior);
  return doc?.status === "approved";
}

function DocCellView({ doc, onOpen }: { doc: DocCard; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"
      className={`card card--button${doc.stale ? " card--stale" : ""}`}
      onClick={() => onOpen(doc.id)}
      title={doc.id}
    >
      <span className="card__title">{doc.title}</span>
      <span className="card__badges">
        <span className={`badge badge--${doc.status}`}>{doc.status}</span>
        {doc.stale && <span className="badge badge--stale">⚠ stale</span>}
        <span className="badge badge--meta">v{doc.version}</span>
      </span>
    </button>
  );
}

function LockedCell({ stage }: { stage: Stage }) {
  return (
    <div className="card card--locked">
      <span className="card__locked-label">{STAGE_LABEL[stage]} locked</span>
      <span className="card__locked-sub">prior stage not approved</span>
    </div>
  );
}

function EmptyCell({ stage, ready }: { stage: Stage; ready: boolean }) {
  const slash = `/specmanager-${stage}`;
  const onCopy = (e: React.MouseEvent): void => {
    e.stopPropagation();
    void navigator.clipboard?.writeText(slash);
  };
  return (
    <div className={`card card--empty${ready ? " card--ready" : ""}`}>
      <span className="card__empty-label">{ready ? "Generate" : STAGE_LABEL[stage]}</span>
      {ready ? (
        <button type="button" className="card__empty-cmd" onClick={onCopy} title="copy to clipboard">
          {slash}
        </button>
      ) : (
        <span className="card__empty-sub">—</span>
      )}
    </div>
  );
}

function BuildCell({
  tasks,
  row,
  onOpen,
}: {
  tasks: TaskCounts;
  row: FeatureRow;
  onOpen: (featureId: string, title: string) => void;
}) {
  if (tasks.total === 0) {
    const planApproved = findDoc(row, "plan")?.status === "approved";
    return (
      <button
        type="button"
        className={`card card--empty${planApproved ? " card--ready" : ""}`}
        onClick={() => onOpen(row.id, row.title)}
      >
        <span className="card__empty-label">Build</span>
        <span className="card__empty-sub">
          {planApproved ? "no tasks yet · click to add" : "plan not approved"}
        </span>
      </button>
    );
  }
  const donePct = Math.round((tasks.done / Math.max(1, tasks.total)) * 100);
  const inProgressPct = Math.round((tasks.in_progress / Math.max(1, tasks.total)) * 100);
  // Find the next non-done phase to suggest /specmanager-execute.
  const nextPhase = row.phases?.find(
    (p) => p.status !== "done" && p.status !== "empty"
  );
  const slash = nextPhase
    ? `/specmanager-execute ${row.id} next`
    : null;
  const onCopy = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (slash) void navigator.clipboard?.writeText(slash);
  };
  const multiPhase =
    (row.phases?.length ?? 0) > 1 ||
    (row.phases?.[0]?.name && row.phases[0].name !== DEFAULT_PHASE);
  return (
    <button
      type="button"
      className="card card--build card--button"
      onClick={() => onOpen(row.id, row.title)}
    >
      <span className="card__title">Build</span>
      <div className="bar">
        <div className="bar__seg bar__seg--done" style={{ width: `${donePct}%` }} />
        <div className="bar__seg bar__seg--prog" style={{ width: `${inProgressPct}%` }} />
      </div>
      <span className="card__build-counts">
        <span>{tasks.done}/{tasks.total} done</span>
        {multiPhase && row.phases && (
          <span>
            · phases {row.phases.filter((p) => p.status === "done").length}/
            {row.phases.length}
          </span>
        )}
        {tasks.in_progress > 0 && <span>· {tasks.in_progress} in progress</span>}
      </span>
      {slash && (
        <span
          className="card__build-exec"
          onClick={onCopy}
          title="copy /specmanager-execute next slash command"
        >
          ▶ {slash}
        </span>
      )}
    </button>
  );
}

function PhaseWalkthroughCard({
  phase,
  row,
  onOpen,
}: {
  phase: PhaseRollup;
  row: FeatureRow;
  onOpen: (id: string) => void;
}) {
  const doc = phase.walkthroughId
    ? row.documents.find((d) => d.id === phase.walkthroughId)
    : undefined;
  if (doc) {
    return (
      <button
        type="button"
        className={`card card--button card--sub${doc.stale ? " card--stale" : ""}`}
        onClick={() => onOpen(doc.id)}
        title={doc.id}
      >
        <span className="card__sub-label">Phase {phase.name}</span>
        <span className="card__badges">
          <span className={`badge badge--${doc.status}`}>{doc.status}</span>
          {doc.stale && <span className="badge badge--stale">⚠ stale</span>}
        </span>
      </button>
    );
  }
  const ready = phase.status === "done";
  const slash = `/specmanager-walkthrough ${row.id} ${phase.name}`;
  const onCopy = (e: React.MouseEvent): void => {
    e.stopPropagation();
    void navigator.clipboard?.writeText(slash);
  };
  return (
    <div className={`card card--sub card--empty${ready ? " card--ready" : " card--locked"}`}>
      <span className="card__sub-label">Phase {phase.name}</span>
      {ready ? (
        <button type="button" className="card__empty-cmd" onClick={onCopy} title="copy to clipboard">
          {slash}
        </button>
      ) : (
        <span className="card__locked-sub">
          {phase.doneCount}/{phase.taskCount} tasks done
        </span>
      )}
    </div>
  );
}

function FinalWalkthroughCard({
  row,
  onOpen,
}: {
  row: FeatureRow;
  onOpen: (id: string) => void;
}) {
  const phases = row.phases ?? [];
  const finalDoc = row.documents.find(
    (d) => d.stage === "walkthrough" && d.phase === FINAL_PHASE
  );
  if (finalDoc) {
    return (
      <button
        type="button"
        className={`card card--button card--sub card--final${finalDoc.stale ? " card--stale" : ""}`}
        onClick={() => onOpen(finalDoc.id)}
        title={finalDoc.id}
      >
        <span className="card__sub-label">★ Feature roll-up</span>
        <span className="card__badges">
          <span className={`badge badge--${finalDoc.status}`}>{finalDoc.status}</span>
          {finalDoc.stale && <span className="badge badge--stale">⚠ stale</span>}
        </span>
      </button>
    );
  }
  const missing = phases
    .filter((p) => p.walkthroughStatus !== "approved")
    .map((p) => p.name);
  const ready = phases.length > 0 && missing.length === 0;
  const slash = `/specmanager-walkthrough ${row.id} final`;
  const onCopy = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (ready) void navigator.clipboard?.writeText(slash);
  };
  const tooltip = ready
    ? "all phase walkthroughs approved — ready to draft"
    : missing.length > 0
    ? `awaiting approval: ${missing.map((m) => `phase ${m}`).join(", ")}`
    : "no phases yet";
  return (
    <div
      className={`card card--sub card--final card--empty${ready ? " card--ready" : " card--locked"}`}
      title={tooltip}
    >
      <span className="card__sub-label">★ Feature roll-up</span>
      {ready ? (
        <button type="button" className="card__empty-cmd" onClick={onCopy} title="copy to clipboard">
          {slash}
        </button>
      ) : (
        <span className="card__locked-sub">
          {missing.length > 0 ? `${missing.length} phase(s) pending` : "no phases yet"}
        </span>
      )}
    </div>
  );
}

function WalkthroughCell({
  row,
  onOpenDoc,
}: {
  row: FeatureRow;
  onOpenDoc: (id: string) => void;
}) {
  // No tasks yet → the legacy "locked / generate" affordance.
  const phases = row.phases ?? [];
  if (phases.length === 0) {
    if (!priorStageApproved(row, "walkthrough")) return <LockedCell stage="walkthrough" />;
    return <EmptyCell stage="walkthrough" ready={false} />;
  }
  return (
    <div className="card card--walkthroughs">
      {phases.map((p) => (
        <PhaseWalkthroughCard key={p.name} phase={p} row={row} onOpen={onOpenDoc} />
      ))}
      <FinalWalkthroughCard row={row} onOpen={onOpenDoc} />
    </div>
  );
}

function Cell({
  row,
  column,
  onOpenDoc,
  onOpenBuild,
}: {
  row: FeatureRow;
  column: Column;
  onOpenDoc: (id: string) => void;
  onOpenBuild: (featureId: string, title: string) => void;
}) {
  if (column === "build") return <BuildCell tasks={row.tasks} row={row} onOpen={onOpenBuild} />;
  if (column === "walkthrough") return <WalkthroughCell row={row} onOpenDoc={onOpenDoc} />;
  const stage: Stage = column;
  const doc = findDoc(row, stage);
  if (doc) return <DocCellView doc={doc} onOpen={onOpenDoc} />;
  if (!priorStageApproved(row, stage)) return <LockedCell stage={stage} />;
  return <EmptyCell stage={stage} ready />;
}

export default function App() {
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [openDocId, setOpenDocId] = useState<string | null>(null);
  const [openBuild, setOpenBuild] = useState<{ featureId: string; title: string } | null>(null);

  const openDoc = useCallback((id: string) => setOpenDocId(id), []);
  const closeDoc = useCallback(() => setOpenDocId(null), []);
  const openBuildFor = useCallback((featureId: string, title: string) => {
    setOpenBuild({ featureId, title });
  }, []);
  const closeBuild = useCallback(() => setOpenBuild(null), []);

  const reload = (): void => {
    fetchBoard()
      .then((b) => {
        setBoard(b);
        setError(null);
      })
      .catch((err: Error) => setError(err.message));
  };

  useEffect(() => {
    reload();
    let pending = 0;
    const close = openWebSocket((event) => {
      setLastEvent(event.type);
      // Coalesce bursts of events into a single reload.
      window.clearTimeout(pending);
      pending = window.setTimeout(reload, 100);
    });
    return () => {
      window.clearTimeout(pending);
      close();
    };
  }, []);

  if (error) {
    return (
      <main className="state state--error">
        <h1>SpecManager</h1>
        <p>Could not reach the board API: {error}</p>
      </main>
    );
  }
  if (!board) return <main className="state">Loading…</main>;

  return (
    <main className="board">
      <header className="board__header">
        <h1>SpecManager</h1>
        <div className="board__meta">
          <span>{board.features.length} feature{board.features.length === 1 ? "" : "s"}</span>
          {lastEvent && <span className="board__pulse">· {lastEvent}</span>}
        </div>
      </header>

      {board.features.length === 0 ? (
        <section className="empty">
          <p>No features yet.</p>
          <pre>/specmanager-feature &lt;title&gt;</pre>
        </section>
      ) : (
        <section className="grid" style={{ gridTemplateColumns: `12rem repeat(${COLUMNS.length}, minmax(11rem, 1fr))` }}>
          <div className="grid__corner">Feature</div>
          {COLUMNS.map((c) => (
            <div key={c} className="grid__header">{STAGE_LABEL[c]}</div>
          ))}
          {board.features.map((row) => (
            <div key={row.id} className="row" style={{ display: "contents" }}>
              <div className="row__label">
                <strong>{row.title}</strong>
                <small>{row.slug}</small>
              </div>
              {COLUMNS.map((c) => (
                <div key={c} className="row__cell">
                  <Cell row={row} column={c} onOpenDoc={openDoc} onOpenBuild={openBuildFor} />
                </div>
              ))}
            </div>
          ))}
        </section>
      )}

      <footer className="board__footer">
        <span>Last synced: {new Date(board.generatedAt).toLocaleString()}</span>
      </footer>

      {openDocId && (
        <DocPanel docId={openDocId} onClose={closeDoc} onJumpTo={openDoc} />
      )}
      {openBuild && (
        <BuildPanel
          featureId={openBuild.featureId}
          featureTitle={openBuild.title}
          onClose={closeBuild}
        />
      )}
    </main>
  );
}
