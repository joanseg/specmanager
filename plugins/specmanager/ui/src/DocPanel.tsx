import { useEffect, useMemo, useState } from "react";
import MarkdownEditor from "./MarkdownEditor";
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

// The design brief renders verbatim HTML in a sandboxed iframe; parent CSS
// (tokens.css / styles.css) cannot reach inside it, so the reset + custom
// scrollbar must be injected. Prepend (not onLoad-write) so it lands before
// the body paints. html,body{margin:0} removes the default 8px margin that
// fights the canvas; the scrollbar rules mirror .md-surface for parity, with
// the thumb border tracking the iframe's own surface (--surface-container-lowest
// = #0e0e10). Values are inlined literals because the iframe document has no
// access to the parent ':root' custom properties.
const PREVIEW_STYLE = `<style>
  html, body { margin: 0; }
  html { scrollbar-width: thin; scrollbar-color: #464554 transparent; }
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #464554; border-radius: 999px; border: 2px solid #0e0e10; }
  ::-webkit-scrollbar-thumb:hover { background: #908fa0; }
</style>`;

const STAGE_LABEL: Record<Stage, string> = {
  prd: "PRD",
  architecture: "Architecture",
  design: "Design",
  plan: "Plan",
  walkthrough: "Walkthrough",
};

export default function DocPanel({ docId, onClose, onJumpTo }: DocPanelProps) {
  const [doc, setDoc] = useState<DocFull | null>(null);
  const [body, setBody] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
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

        {isDesign && (
          <div className="panel__toolbar">
            <div className="panel__toolbar-spacer" />
            <label className="panel__toggle">
              <input
                type="checkbox"
                checked={showChat}
                onChange={(e) => setShowChat(e.target.checked)}
              />
              Chat
            </label>
          </div>
        )}

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
          className={`panel__body panel__body--cols-${1 + (showChat ? 1 : 0)}`}
        >
          {isDesign ? (
            <iframe
              className="panel__preview panel__preview--iframe"
              title="design brief preview"
              sandbox="allow-same-origin"
              srcDoc={PREVIEW_STYLE + body}
            />
          ) : (
            <div className="panel__editor">
              <MarkdownEditor
                key={doc.id}
                value={body}
                readOnly={!!readOnly}
                onChange={setBody}
                showChat={showChat}
                onToggleChat={setShowChat}
              />
            </div>
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
