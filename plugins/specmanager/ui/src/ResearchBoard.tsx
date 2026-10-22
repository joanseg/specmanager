import { useState } from "react";
import { postHandoff } from "./api";
import EmptyResearch from "./EmptyResearch";
import {
  BuildItem,
  Handoff,
  HandoffResult,
  ResearchKind,
  ResearchStep,
  StepStatus,
  StudyDocCard,
  StudySummary,
} from "./types";

const COLUMNS: { kind: ResearchKind; label: string }[] = [
  { kind: "market", label: "Market research" },
  { kind: "doc", label: "Docs" },
  { kind: "user-research", label: "User research" },
  { kind: "marketing", label: "Marketing plan" },
  { kind: "strategy", label: "Strategy" },
];

/** Display label of a research doc kind (column header, drawer crumb). */
export function kindLabel(kind: ResearchKind): string {
  if (kind === "brief") return "Brief";
  return COLUMNS.find((c) => c.kind === kind)?.label ?? kind;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  wireframes: "Wireframes",
  "client-presentation": "Client presentation",
  "partner-presentation": "Partner presentation",
  "investor-deck": "Investor deck",
  "one-pager": "One-pager",
};

/** True when a Doc's type is one of the presets (else it is a custom string). */
export function isPresetDocType(docType: string | undefined): boolean {
  return docType === undefined || docType in DOC_TYPE_LABELS;
}

/** Label of a Doc's type: the preset label, else the custom string verbatim (legacy docs read as wireframes). */
export function docTypeLabel(docType: string | undefined): string {
  if (docType === undefined) return "Wireframes";
  return DOC_TYPE_LABELS[docType] ?? docType;
}

const STEP_ARGS: Partial<Record<ResearchStep | ResearchKind, string>> = {
  doc: "docs",
  "user-research": "plan",
};

/** Step name as `/specmanager-research` takes it, from a step or a doc kind (`doc` → `docs`, `user-research` → `plan`). */
function stepArg(step: ResearchStep | ResearchKind): string {
  return STEP_ARGS[step] ?? step;
}

export function stepCommand(slug: string, step: ResearchStep | ResearchKind): string {
  return `/specmanager-research ${slug} ${stepArg(step)}`;
}

function copy(text: string) {
  return (e: React.MouseEvent): void => {
    e.stopPropagation();
    void navigator.clipboard?.writeText(text);
  };
}

/** Step a doc kind belongs to (`doc` files under `docs`; the brief is not a rail step). */
export function kindStep(kind: ResearchKind): ResearchStep | "brief" {
  return kind === "doc" ? "docs" : kind;
}

function stepOf(study: StudySummary, step: ResearchStep | "brief"): StepStatus | undefined {
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

/** Brief chip under the idea: opens the brief, or copies the brief command (dashed, never red). */
function BriefChip({ study, onOpen }: { study: StudySummary; onOpen?: (docId: string) => void }) {
  const brief = study.docs.find((d) => d.kind === "brief");
  if (brief) {
    return (
      <button type="button" className="chip-brief" onClick={() => onOpen?.(brief.id)} title={`open ${brief.id}`}>
        <span className="page" />
        Brief <span className="meta">v{brief.version}</span>
      </button>
    );
  }
  const cmd = stepCommand(study.slug, "brief");
  return (
    <button type="button" className="chip-brief chip-brief--missing" onClick={copy(cmd)} title={`copy ${cmd}`}>
      <span className="page" />
      no brief · <span className="meta">… brief</span>
    </button>
  );
}

function StudyLabel({ study, onOpen }: { study: StudySummary; onOpen?: (docId: string) => void }) {
  const next = study.nextStep;
  return (
    <div className="row__label">
      <strong>{study.title}</strong>
      <small>{study.slug}</small>
      <span className="study__idea" title={study.idea}>{study.idea}</span>
      <BriefChip study={study} onOpen={onOpen} />
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
        {notes > 0 && <span className="badge badge--notes">● {plural(notes, "new note", "new notes")}</span>}
        {noFindings && <span className="badge">0 findings</span>}
        {outdated && <span className="badge badge--outdated">⚠ outdated</span>}
        <span className="badge badge--meta">v{doc.version}</span>
      </span>
    </button>
  );
}

function DocTypeHead({ doc }: { doc: StudyDocCard }) {
  const label = docTypeLabel(doc.docType);
  const custom = !isPresetDocType(doc.docType);
  return (
    <span className="doc-card__head">
      <span className={`doc-card__type${custom ? " doc-card__type--custom" : ""}`} title={label}>
        {custom && <i>custom</i>}
        {label}
      </span>
      <span className="badge badge--meta">v{doc.version}</span>
    </span>
  );
}

/** One compact Doc card in the Docs stack: type head + vN, one-line title, per-card outdated. */
function DocCard({ doc, onOpen }: { doc: StudyDocCard; onOpen?: (docId: string) => void }) {
  const outdated = doc.outdated.length > 0;
  return (
    <button
      type="button"
      className={`card card--button doc-card${outdated ? " card--stale" : ""}`}
      onClick={() => onOpen?.(doc.id)}
      title={outdated ? `${doc.id} · behind ${doc.outdated.join(", ")}` : doc.id}
    >
      <DocTypeHead doc={doc} />
      <span className="card__title">{doc.title}</span>
      {outdated && <span className="badge badge--outdated">⚠ outdated</span>}
    </button>
  );
}

/** Docs cell: every Doc stacked in listing order, plus a dim add row while the step is open. */
function DocsCell({ study, onOpen }: { study: StudySummary; onOpen?: (docId: string) => void }) {
  const docs = study.docs.filter((d) => d.kind === "doc");
  if (docs.length === 0) return <EmptyCell study={study} kind="doc" label="Docs" />;
  const cmd = stepCommand(study.slug, "docs");
  const open = stepOf(study, "docs")?.state !== "locked";
  return (
    <div className="doc-stack">
      {docs.map((d) => (
        <DocCard key={d.id} doc={d} onOpen={onOpen} />
      ))}
      {open && (
        <button type="button" className="doc-add" onClick={copy(cmd)} title={`copy ${cmd}`}>
          <span>+ add<span className="doc-add__more"> a doc</span></span>
          <span>… docs</span>
        </button>
      )}
    </div>
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
  const step = kindStep(kind);
  const status = stepOf(study, step);
  if (status?.state === "locked") return <LockedCell label={label} reason={status.reason} />;
  const cmd = stepCommand(study.slug, step);
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
        … {stepArg(step)}
      </button>
    </div>
  );
}

function openBuilder(): void {
  window.location.hash = "#builder";
}

/** Success or neutral strip for the last handoff; component state, so a reload clears it. */
function HandoffStrips({ result, study }: { result: HandoffResult; study: StudySummary }) {
  const slugOf = (featureId: string) => study.handoffs.find((h) => h.featureId === featureId)?.slug ?? featureId;
  return (
    <>
      {result.created.length > 0 && (
        <div className="handoff__result" role="status">
          Created {plural(result.created.length, "Builder feature", "Builder features")}.{" "}
          <button type="button" className="link handoff__open" onClick={openBuilder}>Open in Builder</button>
        </div>
      )}
      {result.skipped.length > 0 && (
        <div className="handoff__result handoff__result--skip" role="status">
          {result.skipped.length} already handed off, skipped:{" "}
          <span className="mono">{result.skipped.map((s) => slugOf(s.featureId)).join(", ")}</span>
        </div>
      )}
    </>
  );
}

function HandoffRow({
  item,
  handoff,
  checked,
  onToggle,
  onShowFeature,
}: {
  item: BuildItem;
  handoff?: Handoff;
  checked: boolean;
  onToggle: () => void;
  onShowFeature?: (featureId: string) => void;
}) {
  if (handoff) {
    return (
      <div className="handoff-item handoff-item--handed" title={item.rationale}>
        <span className="handoff-item__rank">{item.rank}</span>
        <span className="handoff-item__done" aria-label="handed off" />
        <span className="handoff-item__title">
          <span>{item.title}</span>
          <a
            className="handoff-item__feat"
            href="#builder"
            title={handoff.featureId}
            onClick={(e) => {
              if (!onShowFeature) return;
              e.preventDefault();
              onShowFeature(handoff.featureId);
            }}
          >
            → {handoff.slug}
          </a>
        </span>
      </div>
    );
  }
  return (
    <label className={`handoff-item${checked ? " handoff-item--checked" : ""}`} title={`${item.itemId} · ${item.rationale}`}>
      <span className="handoff-item__rank">{item.rank}</span>
      <input type="checkbox" className="handoff-item__check" checked={checked} onChange={onToggle} />
      <span className="handoff-item__title">{item.title}</span>
    </label>
  );
}

/** Handoff: pick ranked build items (keyed by `S<n>`) and create one Builder feature each. */
function HandoffCell({
  study,
  onShowFeature,
}: {
  study: StudySummary;
  onShowFeature?: (featureId: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<HandoffResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const strategy = study.docs.find((d) => d.kind === "strategy");
  const status = stepOf(study, "handoff");

  if (strategy && study.buildList.length === 0) {
    return (
      <div className="card card--locked card--no-items">
        <span className="card__locked-label">No build items</span>
        <span className="card__locked-sub">
          strategy has no ordered list under <span className="mono">## What to build</span>
        </span>
      </div>
    );
  }
  if (!strategy || status?.state === "locked") return <LockedCell label="Handoff" reason={status?.reason} />;

  const toggle = (itemId: string) =>
    setSelected((cur) => (cur.includes(itemId) ? cur.filter((id) => id !== itemId) : [...cur, itemId]));
  const create = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      setResult(await postHandoff(study.id, selected));
      setSelected([]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const nextSlug = result?.created[0]?.slug;
  const n = selected.length;
  return (
    <div className="card card--build card--handoff">
      <div className="handoff__head">
        <span>Build list</span>
        <span>strategy v{strategy.version}</span>
      </div>
      {result && <HandoffStrips result={result} study={study} />}
      {error && <div className="handoff__result handoff__result--error" role="alert">{error}</div>}
      {study.buildList.map((item) => (
        <HandoffRow
          key={item.itemId}
          item={item}
          handoff={study.handoffs.find((h) => h.itemId === item.itemId)}
          checked={selected.includes(item.itemId)}
          onToggle={() => toggle(item.itemId)}
          onShowFeature={onShowFeature}
        />
      ))}
      <div className="handoff__actions">
        {n === 0 && nextSlug ? (
          <button
            type="button"
            className="handoff__next"
            onClick={copy(`/specmanager-prd ${nextSlug}`)}
            title="copy to clipboard"
          >
            next: /specmanager-prd {nextSlug}
          </button>
        ) : (
          <small>{n} selected</small>
        )}
        <button type="button" className="btn btn--sm btn--primary" disabled={n === 0 || busy} onClick={create}>
          {n === 0 ? "Create" : `Create ${plural(n, "feature", "features")}`}
        </button>
      </div>
    </div>
  );
}

/** Researcher mode: one row per study, one column per research doc, Handoff in the reserved track. */
export default function ResearchBoard({
  studies,
  onOpenDoc,
  onShowFeature,
}: {
  studies: StudySummary[];
  onOpenDoc?: (docId: string) => void;
  onShowFeature?: (featureId: string) => void;
}) {
  if (studies.length === 0) return <EmptyResearch />;
  return (
    <section className="grid grid--research">
      <div className="grid__corner">Study</div>
      {COLUMNS.map((c) => (
        <div key={c.kind} className={`grid__header${c.kind === "doc" ? " grid__header--docs" : ""}`}>{c.label}</div>
      ))}
      <div className="grid__header grid__header--build">Handoff</div>
      {studies.map((study) => (
        <div key={study.id} className="row" style={{ display: "contents" }}>
          <StudyLabel study={study} onOpen={onOpenDoc} />
          {COLUMNS.map((c) => {
            if (c.kind === "doc") {
              return (
                <div key={c.kind} className="row__cell row__cell--docs">
                  <DocsCell study={study} onOpen={onOpenDoc} />
                </div>
              );
            }
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
            <HandoffCell study={study} onShowFeature={onShowFeature} />
          </div>
        </div>
      ))}
    </section>
  );
}
