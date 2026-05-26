import { useEffect, useMemo, useState } from "react";
import { marked } from "marked";
import Editor from "./Editor";
import ChatPanel from "./ChatPanel";
import { fetchDoc, fetchGate, postDocStatus, putDoc } from "./api";
import { DocFull, Stage } from "./types";

interface DocPanelProps {
  docId: string;
  onClose: () => void;
  onJumpTo: (docId: string) => void;
}

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "conflict"; serverVersion: number }
  | { kind: "error"; message: string };

const STAGE_LABEL: Record<Stage, string> = {
  prd: "PRD",
  architecture: "Architecture",
  plan: "Plan",
  walkthrough: "Walkthrough",
};

export default function DocPanel({ docId, onClose, onJumpTo }: DocPanelProps) {
  const [doc, setDoc] = useState<DocFull | null>(null);
  const [body, setBody] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [showPreview, setShowPreview] = useState<boolean>(true);
  const [showChat, setShowChat] = useState<boolean>(false);
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

  // Esc closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const dirty = useMemo(() => doc !== null && body !== doc.body, [doc, body]);
  const readOnly = doc?.status === "approved";
  const renderedHtml = useMemo(() => marked.parse(body) as string, [body]);

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

  if (error) {
    return (
      <div className="panel-backdrop" onClick={onClose}>
        <aside className="panel" onClick={(e) => e.stopPropagation()}>
          <header className="panel__header">
            <button className="panel__close" onClick={onClose}>×</button>
            <h2>Could not load document</h2>
          </header>
          <p className="panel__error">{error}</p>
        </aside>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="panel-backdrop" onClick={onClose}>
        <aside className="panel" onClick={(e) => e.stopPropagation()}>
          <p style={{ padding: "2rem", color: "var(--text-dim)" }}>Loading…</p>
        </aside>
      </div>
    );
  }

  return (
    <div className="panel-backdrop" onClick={onClose}>
      <aside className="panel" onClick={(e) => e.stopPropagation()}>
        <header className="panel__header">
          <button className="panel__close" onClick={onClose}>×</button>
          <div className="panel__title-row">
            <h2 className="panel__title">{doc.title}</h2>
            <span className="panel__meta">
              {STAGE_LABEL[doc.stage]} · v{doc.version}
            </span>
          </div>
          <div className="panel__badges">
            <span className={`badge badge--${doc.status}`}>{doc.status}</span>
            {doc.stale && <span className="badge badge--stale">⚠ stale</span>}
            <span className="badge badge--meta" title={doc.id}>{doc.id}</span>
            <span className="badge badge--meta">{doc.generatedBy}</span>
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

        <div className="panel__toolbar">
          <button
            className="btn btn--primary"
            disabled={!dirty || save.kind === "saving" || readOnly}
            onClick={onSave}
          >
            {save.kind === "saving" ? "Saving…" : dirty ? "Save" : "Saved"}
          </button>
          {doc.status === "draft" ? (
            <button
              className="btn"
              disabled={dirty}
              title={dirty ? "save your changes first" : ""}
              onClick={onApprove}
            >
              Approve
            </button>
          ) : (
            <button className="btn" onClick={onReopen}>Reopen</button>
          )}
          <button className="btn btn--ghost" onClick={onShowGate}>
            Gate?
          </button>
          <div className="panel__toolbar-spacer" />
          <label className="panel__toggle">
            <input
              type="checkbox"
              checked={showPreview}
              onChange={(e) => setShowPreview(e.target.checked)}
            />
            Preview
          </label>
          <label className="panel__toggle">
            <input
              type="checkbox"
              checked={showChat}
              onChange={(e) => setShowChat(e.target.checked)}
            />
            Chat
          </label>
        </div>

        {save.kind === "conflict" && (
          <div className="banner banner--warn">
            File changed on disk (now v{save.serverVersion}). Your edits weren't saved.
            <button className="link" onClick={reload}>Reload from disk</button> to merge by hand.
          </div>
        )}
        {save.kind === "error" && (
          <div className="banner banner--error">
            {save.message}
            <button className="link" onClick={() => setSave({ kind: "idle" })}>dismiss</button>
          </div>
        )}
        {save.kind === "saved" && (
          <div className="banner banner--ok">
            Saved · now v{doc.version}
          </div>
        )}

        <div
          className={`panel__body panel__body--cols-${
            1 + (showPreview ? 1 : 0) + (showChat ? 1 : 0)
          }`}
        >
          <div className="panel__editor">
            <Editor value={body} readOnly={!!readOnly} onChange={setBody} />
          </div>
          {showPreview && (
            <div className="panel__preview markdown" dangerouslySetInnerHTML={{ __html: renderedHtml }} />
          )}
          {showChat && (
            <div className="panel__chat">
              <ChatPanel docId={doc.id} docStatus={doc.status} onDocChanged={reload} />
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
