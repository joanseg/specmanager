import { useCallback, useEffect, useState } from "react";
import { fetchBoard, openWebSocket } from "./api";
import DocPanel from "./DocPanel";
import BuildPanel from "./BuildPanel";
import { Board, COLUMNS, Column, DocCard, FeatureRow, Stage, TaskCounts } from "./types";

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
        {tasks.in_progress > 0 && <span>· {tasks.in_progress} in progress</span>}
      </span>
    </button>
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
  const stage: Stage = column;
  const doc = findDoc(row, stage);
  if (doc) return <DocCellView doc={doc} onOpen={onOpenDoc} />;
  if (!priorStageApproved(row, stage)) return <LockedCell stage={stage} />;
  if (stage === "walkthrough") {
    const ready = row.tasks.total > 0 && row.tasks.done === row.tasks.total;
    return <EmptyCell stage={stage} ready={ready} />;
  }
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
