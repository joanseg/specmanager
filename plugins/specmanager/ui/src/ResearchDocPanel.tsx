import { useEffect, useMemo, useState } from "react";
import MarkdownEditor from "./MarkdownEditor";
import { fetchResearchDoc, fetchStudies, putResearchDoc } from "./api";
import { HtmlPreview, PanelMessage, SaveBanners, SaveState, useEscClose } from "./panelParts";
import { docTypeLabel, isPresetDocType, kindLabel, kindStep, stepCommand } from "./ResearchBoard";
import { ResearchDocFull, StudySummary } from "./types";

interface ResearchDocPanelProps {
  docId: string;
  onClose: () => void;
  onJumpTo: (docId: string) => void;
}

/** Crumb, meta and lowercase badge text for a doc; Docs use their doc type (design Screen 2). */
function docLabels(doc: ResearchDocFull): { crumb: string; meta: string; docType: string | null } {
  if (doc.kind !== "doc") {
    const label = kindLabel(doc.kind);
    return { crumb: label, meta: label, docType: null };
  }
  const label = docTypeLabel(doc.docType);
  if (isPresetDocType(doc.docType)) {
    return { crumb: label, meta: label, docType: doc.docType ?? "wireframes" };
  }
  return { crumb: label.charAt(0).toUpperCase() + label.slice(1), meta: "Custom", docType: label };
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** A command the user copies into Claude; the board never runs it. */
function Cmd({ text, className }: { text: string; className: string }) {
  return (
    <button
      type="button"
      className={`link ${className}`}
      title="copy to clipboard"
      onClick={() => void navigator.clipboard?.writeText(text)}
    >
      {text}
    </button>
  );
}

/** Unread note files, with the findings command (design Screen 3). */
function NewNotesBanner({ study }: { study: StudySummary }) {
  return (
    <div className="banner banner--warn banner--notes">
      <span>
        <strong>{plural(study.newNotes.length, "new note", "new notes")}</strong>{" "}
        {study.newNotes.length === 1 ? "is" : "are"} not in Findings yet:
      </span>
      <span className="banner__files">{study.newNotes.join(" · ")}</span>
      <Cmd text={stepCommand(study.slug, "findings")} className="banner__cmd" />
      <span className="banner__note">
        They stay unmasked until findings runs, so don't commit them yet.
      </span>
    </div>
  );
}

/** Every upstream with based-on vs now; the moved ones carry the drift tag (design Screen 4). */
function OutdatedBlock({
  doc,
  study,
  onJumpTo,
}: {
  doc: ResearchDocFull;
  study: StudySummary;
  onJumpTo: (docId: string) => void;
}) {
  const isStrategy = doc.kind === "strategy";
  return (
    <section className="panel__stale">
      <strong>This {isStrategy ? "strategy" : "doc"} is behind its sources.</strong>{" "}
      {isStrategy ? "Re-run synthesis" : "Re-run this step"} to fold in what changed:{" "}
      <Cmd text={stepCommand(study.slug, kindStep(doc.kind))} className="stale-cmd" />
      <ul className="stale-list">
        {doc.dependsOn.map((depId) => {
          const based = doc.basedOn[depId];
          const current = study.docs.find((d) => d.id === depId)?.version;
          const drift = current !== undefined && current > (based ?? 0);
          return (
            <li key={depId} className={drift ? "stale-list__item stale-list__item--drift" : "stale-list__item"}>
              <button className="link" onClick={() => onJumpTo(depId)}>{depId}</button>
              {based !== undefined && <span> · based on v{based}</span>}
              {current !== undefined && <span> · now v{current}</span>}
              {drift && <span className="drift-tag"> drift</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** DocPanel for a study's research doc: Save + close only, no lifecycle (design Screens 3-4). */
export default function ResearchDocPanel({ docId, onClose, onJumpTo }: ResearchDocPanelProps) {
  const [doc, setDoc] = useState<ResearchDocFull | null>(null);
  const [study, setStudy] = useState<StudySummary | null>(null);
  const [body, setBody] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });

  useEffect(() => {
    let cancelled = false;
    setDoc(null);
    setError(null);
    setSave({ kind: "idle" });
    fetchResearchDoc(docId)
      .then(async (d) => {
        const [s] = await fetchStudies(d.studyId);
        if (cancelled) return;
        setDoc(d);
        setBody(d.body);
        setStudy(s ?? null);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [docId]);

  useEscClose(onClose);

  const dirty = useMemo(() => doc !== null && body !== doc.body, [doc, body]);
  const isHtml = doc?.kind === "doc";

  const reload = async (): Promise<void> => {
    const d = await fetchResearchDoc(docId);
    setDoc(d);
    setBody(d.body);
    setSave({ kind: "idle" });
  };

  const onSave = async (): Promise<void> => {
    if (!doc || isHtml) return;
    setSave({ kind: "saving" });
    const res = await putResearchDoc(doc.id, body, doc.version);
    if (res.ok) {
      setDoc(res.doc);
      setBody(res.doc.body);
      setSave({ kind: "saved", at: Date.now() });
    } else if (res.status === 409) {
      const current = await fetchResearchDoc(doc.id);
      setSave({ kind: "conflict", serverVersion: current.version });
    } else {
      setSave({ kind: "error", message: res.error });
    }
  };

  if (error || !doc) return <PanelMessage error={error} onClose={onClose} />;

  const labels = docLabels(doc);
  const outdated = study?.docs.find((d) => d.id === doc.id)?.outdated ?? [];
  const newNotes = doc.kind === "user-research" ? study?.newNotes ?? [] : [];

  return (
    <div className="panel-backdrop" onClick={onClose}>
      <aside className="panel" onClick={(e) => e.stopPropagation()}>
        <header className="panel__header">
          <div className="panel__header-main">
            <nav className="panel__crumb">
              {study?.title ?? doc.studyId} <span className="panel__crumb-sep">›</span> {labels.crumb}
            </nav>
            <div className="panel__title-row">
              <h2 className="panel__title">{doc.title}</h2>
              <span className="panel__meta">
                {labels.meta} · <span className="panel__version">v{doc.version}</span>
              </span>
            </div>
            <div className="panel__badges">
              <span className="badge badge--interview">research</span>
              {labels.docType && (
                <span className={`badge badge--doctype${labels.meta === "Custom" ? " badge--doctype-custom" : ""}`}>
                  {labels.docType}
                </span>
              )}
              {isHtml && <span className="badge badge--kind">html</span>}
              {outdated.length > 0 && <span className="badge badge--outdated">⚠ outdated</span>}
              {newNotes.length > 0 && (
                <span className="badge badge--notes">● {plural(newNotes.length, "new note", "new notes")}</span>
              )}
              <span className="badge badge--meta" title={doc.id}>{doc.id}</span>
              <span className="badge badge--meta">{doc.generatedBy}</span>
              {doc.kind === "user-research" && (
                <span className="badge badge--meta">
                  {plural(doc.findings?.length ?? 0, "note", "notes")} ingested
                </span>
              )}
              {doc.kind === "strategy" && study && study.handedOff.length > 0 && (
                <span className="badge badge--meta">
                  {plural(study.handedOff.length, "feature", "features")} handed off
                </span>
              )}
            </div>
          </div>
          <div className="panel__header-actions">
            {isHtml ? (
              <button className="btn btn--readonly" disabled>Read-only</button>
            ) : (
              <button className="btn" disabled={!dirty || save.kind === "saving"} onClick={onSave}>
                {save.kind === "saving" ? "Saving…" : dirty ? "Save" : "Saved"}
              </button>
            )}
            <button className="panel__close" onClick={onClose}>×</button>
          </div>
        </header>

        {study && newNotes.length > 0 && <NewNotesBanner study={study} />}
        {study && outdated.length > 0 && <OutdatedBlock doc={doc} study={study} onJumpTo={onJumpTo} />}

        <SaveBanners
          save={save}
          version={doc.version}
          onReload={reload}
          onDismiss={() => setSave({ kind: "idle" })}
        />

        <div className="panel__body panel__body--cols-1">
          {isHtml ? (
            <HtmlPreview title={`${labels.crumb} preview`} body={body} />
          ) : (
            <div className="panel__editor">
              <MarkdownEditor key={doc.id} value={body} readOnly={false} markMissing onChange={setBody} />
            </div>
          )}
        </div>

        <footer className="panel__footer">
          <span>{doc.filePath}</span>
          {isHtml && <span className="panel__hint">sandboxed · scripts off</span>}
          {doc.kind === "brief" && (
            <span className="panel__hint">saving marks docs that read the brief as outdated</span>
          )}
        </footer>
      </aside>
    </div>
  );
}
