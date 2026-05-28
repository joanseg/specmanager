import { useEffect, useRef } from "react";
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { history, defaultKeymap, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { html } from "@codemirror/lang-html";
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from "@codemirror/language";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";

interface EditorProps {
  value: string;
  readOnly: boolean;
  onChange: (next: string) => void;
  language?: "markdown" | "html";
}

export default function Editor({ value, readOnly, onChange, language = "markdown" }: EditorProps) {
  const languageExt = language === "html" ? html() : markdown();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const readOnlyComp = useRef(new Compartment()).current;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!hostRef.current) return;
    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          history(),
          languageExt,
          bracketMatching(),
          highlightActiveLine(),
          highlightSelectionMatches(),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
          readOnlyComp.of(EditorState.readOnly.of(readOnly)),
          EditorView.lineWrapping,
          // Obsidian Flux editor theme — reads the same CSS custom properties
          // as styles.css so the editor never drifts from the rest of the UI.
          EditorView.theme({
            "&": {
              height: "100%",
              fontSize: "0.85rem",
              background: "var(--surface)",
              color: "var(--on-surface)",
            },
            ".cm-scroller": { fontFamily: "var(--font-mono)" },
            ".cm-content": { padding: "0.6rem 0", caretColor: "var(--primary)" },
            ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--primary)" },
            ".cm-gutters": {
              background: "transparent",
              borderRight: "1px solid var(--outline-variant)",
              color: "var(--on-surface-variant)",
            },
            "&.cm-focused": { outline: "none" },
            ".cm-activeLine": { background: "var(--surface-container)" },
            ".cm-activeLineGutter": { background: "transparent", color: "var(--on-surface)" },
            "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
              background: "var(--surface-container-highest)",
            },
            ".cm-selectionMatch": { background: "var(--surface-container-high)" },
          }, { dark: true }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChangeRef.current(u.state.doc.toString());
          }),
        ],
      }),
      parent: hostRef.current,
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external doc changes (e.g. reload after save)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (view.state.doc.toString() === value) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
    });
  }, [value]);

  // Toggle read-only without rebuilding
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: readOnlyComp.reconfigure(EditorState.readOnly.of(readOnly)),
    });
  }, [readOnly, readOnlyComp]);

  return <div ref={hostRef} className="editor" />;
}
