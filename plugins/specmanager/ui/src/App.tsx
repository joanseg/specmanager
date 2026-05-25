import { useEffect, useState } from "react";
import { fetchBoard, openWebSocket } from "./api";
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

function DocCellView({ doc }: { doc: DocCard }) {
  return (
    <article className={`card${doc.stale ? " card--stale" : ""}`}>
      <header className="card__title" title={doc.id}>
        {doc.title}
      </header>
      <footer className="card__badges">
        <span className={`badge badge--${doc.status}`}>{doc.status}</span>
        {doc.stale && <span className="badge badge--stale">⚠ stale</span>}
        <span className="badge badge--meta">v{doc.version}</span>
      </footer>
    </article>
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
  return (
    <div className={`card card--empty${ready ? " card--ready" : ""}`}>
      <span className="card__empty-label">{ready ? "Generate" : STAGE_LABEL[stage]}</span>
      <span className="card__empty-sub">
        {ready ? `/specmanager-${stage}` : "—"}
      </span>
    </div>
  );
}

function BuildCell({ tasks, row }: { tasks: TaskCounts; row: FeatureRow }) {
  if (tasks.total === 0) {
    const planApproved = findDoc(row, "plan")?.status === "approved";
    return (
      <div className={`card card--empty${planApproved ? " card--ready" : ""}`}>
        <span className="card__empty-label">Build</span>
        <span className="card__empty-sub">
          {planApproved ? "no tasks yet" : "plan not approved"}
        </span>
      </div>
    );
  }
  const donePct = Math.round((tasks.done / Math.max(1, tasks.total)) * 100);
  const inProgressPct = Math.round((tasks.in_progress / Math.max(1, tasks.total)) * 100);
  return (
    <article className="card card--build">
      <header className="card__title">Build</header>
      <div className="bar">
        <div className="bar__seg bar__seg--done" style={{ width: `${donePct}%` }} />
        <div className="bar__seg bar__seg--prog" style={{ width: `${inProgressPct}%` }} />
      </div>
      <footer className="card__build-counts">
        <span>{tasks.done}/{tasks.total} done</span>
        {tasks.in_progress > 0 && <span>· {tasks.in_progress} in progress</span>}
      </footer>
    </article>
  );
}

function Cell({ row, column }: { row: FeatureRow; column: Column }) {
  if (column === "build") return <BuildCell tasks={row.tasks} row={row} />;
  const stage: Stage = column;
  const doc = findDoc(row, stage);
  if (doc) return <DocCellView doc={doc} />;
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
                  <Cell row={row} column={c} />
                </div>
              ))}
            </div>
          ))}
        </section>
      )}

      <footer className="board__footer">
        <span>Last synced: {new Date(board.generatedAt).toLocaleString()}</span>
      </footer>
    </main>
  );
}
