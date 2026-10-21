import { ResearchKind, ResearchStep, StepStatus, StudyDocCard, StudySummary } from "./types";

const COLUMNS: { kind: ResearchKind; label: string }[] = [
  { kind: "market", label: "Market research" },
  { kind: "concepts", label: "Concepts" },
  { kind: "user-research", label: "User research" },
  { kind: "marketing", label: "Marketing plan" },
  { kind: "strategy", label: "Strategy" },
];

/** Step name as `/specmanager-research` takes it (`plan` is the user-research plan). */
function stepArg(step: ResearchStep): string {
  return step === "user-research" ? "plan" : step;
}

function stepCommand(slug: string, step: ResearchStep): string {
  return `/specmanager-research ${slug} ${stepArg(step)}`;
}

function copy(text: string) {
  return (e: React.MouseEvent): void => {
    e.stopPropagation();
    void navigator.clipboard?.writeText(text);
  };
}

function stepOf(study: StudySummary, step: ResearchStep): StepStatus | undefined {
  return study.steps.find((s) => s.step === step);
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Right side of the rail caption: the most urgent flag, else the done count. */
function railSummary(study: StudySummary): string {
  if (study.newNotes.length > 0) return plural(study.newNotes.length, "new note", "new notes");
  if (study.steps.some((s) => s.state === "flag")) return "outdated";
  const done = study.steps.filter((s) => s.state === "done").length;
  return `${done} / ${study.steps.length}`;
}

function StudyLabel({ study }: { study: StudySummary }) {
  const next = study.nextStep;
  return (
    <div className="row__label">
      <strong>{study.title}</strong>
      <small>{study.slug}</small>
      <span className="study__idea" title={study.idea}>{study.idea}</span>
      <div className="study-rail" title={study.steps.map((s) => stepArg(s.step)).join(" · ")}>
        {study.steps.map((s) => (
          <i
            key={s.step}
            className={s.state === "done" || s.state === "next" || s.state === "flag" ? s.state : ""}
            title={`${stepArg(s.step)}: ${s.state}${s.reason ? ` (${s.reason})` : ""}`}
          />
        ))}
      </div>
      <div className="study-rail__caption">
        <span>{next ? <>next <b>{stepArg(next)}</b></> : "complete"}</span>
        <span>{railSummary(study)}</span>
      </div>
      {next && (
        <button
          type="button"
          className="study__next"
          onClick={copy(stepCommand(study.slug, next))}
          title="copy to clipboard"
        >
          ▶ {stepCommand(study.slug, next)}
        </button>
      )}
    </div>
  );
}

function DocCell({
  doc,
  study,
  onOpen,
}: {
  doc: StudyDocCard;
  study: StudySummary;
  onOpen?: (docId: string) => void;
}) {
  const outdated = doc.outdated.length > 0;
  const isUserResearch = doc.kind === "user-research";
  const notes = isUserResearch ? study.newNotes.length : 0;
  const findingsState = stepOf(study, "findings")?.state;
  const noFindings = isUserResearch && notes === 0 && findingsState !== "done" && findingsState !== "flag";
  return (
    <button
      type="button"
      className={`card card--button${outdated ? " card--stale" : ""}`}
      onClick={() => onOpen?.(doc.id)}
      title={outdated ? `${doc.id} · behind ${doc.outdated.join(", ")}` : doc.id}
    >
      <span className="card__title">{doc.title}</span>
      <span className="card__badges">
        {doc.kind === "concepts" && <span className="badge badge--kind">html</span>}
        {notes > 0 && <span className="badge badge--notes">● {plural(notes, "new note", "new notes")}</span>}
        {noFindings && <span className="badge">0 findings</span>}
        {outdated && <span className="badge badge--outdated">⚠ outdated</span>}
        <span className="badge badge--meta">v{doc.version}</span>
      </span>
    </button>
  );
}

function LockedCell({ label, reason }: { label: string; reason?: string }) {
  return (
    <div className="card card--locked">
      <span className="card__locked-label">{label} locked</span>
      {reason && <span className="card__locked-sub">{reason}</span>}
    </div>
  );
}

/** A missing doc: `next` is the one call to action, `open` stays neutral, `locked` names its gate. */
function EmptyCell({ study, kind, label }: { study: StudySummary; kind: ResearchKind; label: string }) {
  const status = stepOf(study, kind);
  if (status?.state === "locked") return <LockedCell label={label} reason={status.reason} />;
  const cmd = stepCommand(study.slug, kind);
  if (status?.state === "next") {
    return (
      <div className="card card--empty card--ready">
        <span className="card__empty-label">Draft {label.toLowerCase()}</span>
        <button type="button" className="card__empty-cmd" onClick={copy(cmd)} title="copy to clipboard">
          {cmd}
        </button>
      </div>
    );
  }
  return (
    <div className="card card--empty">
      <span className="card__empty-label">{label}</span>
      <button
        type="button"
        className="card__empty-cmd card__empty-cmd--dim"
        onClick={copy(cmd)}
        title={`copy ${cmd}`}
      >
        … {stepArg(kind)}
      </button>
    </div>
  );
}

/** Placeholder until the handoff cell lands (task-022): gate state and build-list counts. */
function HandoffCell({ study }: { study: StudySummary }) {
  const status = stepOf(study, "handoff");
  if (status?.state === "locked") return <LockedCell label="Handoff" reason={status.reason} />;
  const cmd = stepCommand(study.slug, "handoff");
  return (
    <div className={`card card--build${status?.state === "next" ? " card--ready" : ""}`}>
      <span className="card__title">Build list</span>
      <span className="card__build-counts">
        {plural(study.buildList.length, "item", "items")} · {study.handedOff.length} handed off
      </span>
      <span className="card__build-exec" onClick={copy(cmd)} title={`copy ${cmd}`}>
        ▶ … handoff
      </span>
    </div>
  );
}

/** Researcher mode: one row per study, one column per research doc, Handoff in the reserved track. */
export default function ResearchBoard({
  studies,
  onOpenDoc,
}: {
  studies: StudySummary[];
  onOpenDoc?: (docId: string) => void;
}) {
  if (studies.length === 0) {
    // Placeholder until the empty state and start-study form land (task-023).
    return (
      <section className="empty">
        <p>No studies yet.</p>
        <pre>/specmanager-research &lt;idea&gt;</pre>
      </section>
    );
  }
  return (
    <section className="grid grid--research">
      <div className="grid__corner">Study</div>
      {COLUMNS.map((c) => (
        <div key={c.kind} className="grid__header">{c.label}</div>
      ))}
      <div className="grid__header grid__header--build">Handoff</div>
      {studies.map((study) => (
        <div key={study.id} className="row" style={{ display: "contents" }}>
          <StudyLabel study={study} />
          {COLUMNS.map((c) => {
            const doc = study.docs.find((d) => d.kind === c.kind);
            return (
              <div key={c.kind} className="row__cell">
                {doc ? (
                  <DocCell doc={doc} study={study} onOpen={onOpenDoc} />
                ) : (
                  <EmptyCell study={study} kind={c.kind} label={c.label} />
                )}
              </div>
            );
          })}
          <div className="row__cell row__cell--build">
            <HandoffCell study={study} />
          </div>
        </div>
      ))}
    </section>
  );
}
