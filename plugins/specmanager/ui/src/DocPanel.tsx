import { useEffect, useMemo, useState } from "react";
import MarkdownEditor from "./MarkdownEditor";
import { fetchDoc, fetchGate, postDocStatus, putDoc } from "./api";
import { HtmlPreview, PanelMessage, SaveBanners, SaveState, useEscClose } from "./panelParts";
import ResearchDocPanel from "./ResearchDocPanel";
import { DocFull, Stage } from "./types";

interface DocPanelProps {
  docId: string;
  /** "research" opens a study doc (no lifecycle); default "feature". */
  source?: "feature" | "research";
  onClose: () => void;
  onJumpTo: (docId: string) => void;
}

// DocFull carries no feature title, only the id. Derive a human label by
// stripping the `feat-` prefix and title-casing the slug (e.g.
// `feat-redesign` → "Redesign"). No new fetch/endpoint.
function featureTitle(featureId: string): string {
  return featureId
    .replace(/^feat-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const STAGE_LABEL: Record<Stage, string> = {
  prd: "PRD",
  architecture: "Architecture",
  design: "Design",
  plan: "Plan",
  walkthrough: "Walkthrough",
};

export default function DocPanel({ source = "feature", ...props }: DocPanelProps) {
  return source === "research" ? <ResearchDocPanel {...props} /> : <FeatureDocPanel {...props} />;
}

function FeatureDocPanel({ docId, onClose, onJumpTo }: Omit<DocPanelProps, "source">) {
  const [doc, setDoc] = useState<DocFull | null>(null);
  const [body, setBody] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [depVersions, setDepVersions] = useState<Record<string, number>>({});

  // Initial load
  useEffect(() => {
    let cancelled = false;
    setDoc(null);
    setError(null);
    setSave({ kind: "idle" });
    fetchDoc(docId)
      .then((d) => {
        if (cancelled) return;
        setDoc(d);
        setBody(d.body);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [docId]);

  // Look up current version of each dependency (for "what changed" view)
  useEffect(() => {
    if (!doc || doc.dependsOn.length === 0) return;
    let cancelled = false;
    Promise.all(
      doc.dependsOn.map((id) =>
        fetchDoc(id).then(
          (d) => [id, d.version] as const,
          () => [id, -1] as const
        )
      )
    ).then((pairs) => {
      if (cancelled) return;
      setDepVersions(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [doc?.id, doc?.dependsOn.join(",")]);

  useEscClose(onClose);

  const dirty = useMemo(() => doc !== null && body !== doc.body, [doc, body]);
  // Interviews have no lifecycle: stay editable forever (status is frozen at
  // draft by contract; an accidental API approve must not lock the editor).
  const isInterview = doc?.kind === "interview";
  const readOnly = doc?.status === "approved" && !isInterview;
  const isDesign = doc?.stage === "design";

  const reload = async (): Promise<void> => {
    const d = await fetchDoc(docId);
    setDoc(d);
    setBody(d.body);
    setSave({ kind: "idle" });
  };

  const onSave = async (): Promise<void> => {
    if (!doc || readOnly) return;
    setSave({ kind: "saving" });
    const res = await putDoc(doc.id, body, doc.version);
    if (res.ok) {
      setDoc(res.doc);
      setBody(res.doc.body);
      setSave({ kind: "saved", at: Date.now() });
    } else if (res.status === 409) {
      const current = await fetchDoc(doc.id);
      setSave({ kind: "conflict", serverVersion: current.version });
    } else {
      setSave({ kind: "error", message: res.error });
    }
  };

  const onApprove = async (): Promise<void> => {
    if (!doc) return;
    try {
      const updated = await postDocStatus(doc.id, "approved");
      setDoc(updated);
      setBody(updated.body);
    } catch (e) {
      setSave({ kind: "error", message: (e as Error).message });
    }
  };

  const onReopen = async (): Promise<void> => {
    if (!doc) return;
    try {
      const updated = await postDocStatus(doc.id, "draft");
      setDoc(updated);
      setBody(updated.body);
    } catch (e) {
      setSave({ kind: "error", message: (e as Error).message });
    }
  };

  const onShowGate = async (): Promise<void> => {
    if (!doc) return;
    const gate = await fetchGate(doc.featureId, doc.stage);
    alert(gate.ok ? "Gate is open." : `Gate closed: ${gate.reason}`);
  };

  if (error || !doc) return <PanelMessage error={error} onClose={onClose} />;

  return (
    <div className="panel-backdrop" onClick={onClose}>
      <aside className="panel" onClick={(e) => e.stopPropagation()}>
        <header className="panel__header">
          <div className="panel__header-main">
            <nav className="panel__crumb">
              {featureTitle(doc.featureId)} <span className="panel__crumb-sep">›</span> {STAGE_LABEL[doc.stage]}
            </nav>
            <div className="panel__title-row">
              <h2 className="panel__title">{doc.title}</h2>
              <span className="panel__meta">
                {STAGE_LABEL[doc.stage]} · <span className="panel__version">v{doc.version}</span>
              </span>
            </div>
            <div className="panel__badges">
              {isInterview ? (
                <span className="badge badge--interview">interview</span>
              ) : (
                <span className={`badge badge--${doc.status}`}>{doc.status}</span>
              )}
              {doc.stale && <span className="badge badge--stale">⚠ stale</span>}
              <span className="badge badge--meta" title={doc.id}>{doc.id}</span>
              <span className="badge badge--meta">{doc.generatedBy}</span>
            </div>
          </div>
          <div className="panel__header-actions">
            <button
              className="btn"
              disabled={!dirty || save.kind === "saving" || readOnly}
              onClick={onSave}
            >
              {save.kind === "saving" ? "Saving…" : dirty ? "Save" : "Saved"}
            </button>
            {/* Interviews have no approval lifecycle and no gate — Save +
                close only (design Screen 3, resolved decisions). */}
            {!isInterview && (
              <>
                {doc.status === "draft" ? (
                  <button
                    className="btn btn--primary"
                    disabled={dirty}
                    title={dirty ? "save your changes first" : ""}
                    onClick={onApprove}
                  >
                    Approve
                  </button>
                ) : (
                  <button
                    className="btn"
                    onClick={onReopen}
                    title="Editing an approved doc reopens it as a draft"
                  >
                    Edit
                  </button>
                )}
                <button className="btn btn--ghost" onClick={onShowGate}>
                  Gate?
                </button>
              </>
            )}
            <button className="panel__close" onClick={onClose}>×</button>
          </div>
        </header>

        {doc.stale && doc.dependsOn.length > 0 && (
          <section className="panel__stale">
            <strong>This doc is stale.</strong> Dependencies have changed since it was based on them.
            <ul className="stale-list">
              {doc.dependsOn.map((depId) => {
                const based = doc.basedOn[depId];
                const current = depVersions[depId];
                const drift = current !== undefined && current !== -1 && based !== undefined && current !== based;
                return (
                  <li key={depId} className={drift ? "stale-list__item stale-list__item--drift" : "stale-list__item"}>
                    <button className="link" onClick={() => onJumpTo(depId)}>{depId}</button>
                    {based !== undefined && (
                      <span> · based on v{based}</span>
                    )}
                    {current !== undefined && current !== -1 && (
                      <span> · now v{current}</span>
                    )}
                    {drift && <span className="drift-tag"> drift</span>}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <SaveBanners
          save={save}
          version={doc.version}
          onReload={reload}
          onDismiss={() => setSave({ kind: "idle" })}
        />

        <div className="panel__body panel__body--cols-1">
          {isDesign ? (
            <HtmlPreview title="design brief preview" body={body} />
          ) : (
            <div className="panel__editor">
              <MarkdownEditor
                key={doc.id}
                value={body}
                readOnly={!!readOnly}
                onChange={setBody}
              />
            </div>
          )}
        </div>

        <footer className="panel__footer">
          <span>{doc.filePath}</span>
        </footer>
      </aside>
    </div>
  );
}
