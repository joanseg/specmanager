/** Drawer pieces shared by the feature and research doc panels. */
import { useEffect } from "react";

export type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "conflict"; serverVersion: number }
  | { kind: "error"; message: string };

// The design brief renders verbatim HTML in a sandboxed iframe; parent CSS
// (tokens.css / styles.css) cannot reach inside it, so the reset + custom
// scrollbar must be injected. Prepend (not onLoad-write) so it lands before
// the body paints. html,body{margin:0} removes the default 8px margin that
// fights the canvas; the scrollbar rules mirror .md-surface for parity, with
// the thumb border tracking the iframe's own surface (--surface-container-lowest
// = #0e0e10). Values are inlined literals because the iframe document has no
// access to the parent ':root' custom properties.
export const PREVIEW_STYLE = `<style>
  html, body { margin: 0; }
  html { scrollbar-width: thin; scrollbar-color: #464554 transparent; }
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #464554; border-radius: 999px; border: 2px solid #0e0e10; }
  ::-webkit-scrollbar-thumb:hover { background: #908fa0; }
</style>`;

/** Read-only HTML preview (design brief, research Docs) in the sandboxed iframe. */
export function HtmlPreview({ title, body }: { title: string; body: string }) {
  return (
    <iframe
      className="panel__preview panel__preview--iframe"
      title={title}
      sandbox="allow-same-origin"
      srcDoc={PREVIEW_STYLE + body}
    />
  );
}

/** The 409 conflict, error and saved banners under the drawer header. */
export function SaveBanners({
  save,
  version,
  onReload,
  onDismiss,
}: {
  save: SaveState;
  version: number;
  onReload: () => void;
  onDismiss: () => void;
}) {
  if (save.kind === "conflict") {
    return (
      <div className="banner banner--warn">
        File changed on disk (now v{save.serverVersion}). Your edits weren't saved.
        <button className="link" onClick={onReload}>Reload from disk</button> to merge by hand.
      </div>
    );
  }
  if (save.kind === "error") {
    return (
      <div className="banner banner--error">
        {save.message}
        <button className="link" onClick={onDismiss}>dismiss</button>
      </div>
    );
  }
  if (save.kind === "saved") {
    return <div className="banner banner--ok">Saved · now v{version}</div>;
  }
  return null;
}

/** Drawer shell for the load-error and loading states. */
export function PanelMessage({ error, onClose }: { error: string | null; onClose: () => void }) {
  return (
    <div className="panel-backdrop" onClick={onClose}>
      <aside className="panel" onClick={(e) => e.stopPropagation()}>
        {error ? (
          <>
            <header className="panel__header">
              <button className="panel__close" onClick={onClose}>×</button>
              <h2>Could not load document</h2>
            </header>
            <p className="panel__error">{error}</p>
          </>
        ) : (
          <p style={{ padding: "2rem", color: "var(--text-dim)" }}>Loading…</p>
        )}
      </aside>
    </div>
  );
}

/** Close the drawer on Escape. */
export function useEscClose(onClose: () => void): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
}
