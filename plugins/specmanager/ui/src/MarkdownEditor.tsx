import { useEffect, useRef } from "react";
import {
  Editor,
  rootCtx,
  defaultValueCtx,
  editorViewOptionsCtx,
  remarkStringifyOptionsCtx,
} from "@milkdown/core";
import { commonmark } from "@milkdown/preset-commonmark";
import { gfm } from "@milkdown/preset-gfm";
import { listener, listenerCtx } from "@milkdown/plugin-listener";

interface MarkdownEditorProps {
  value: string;
  readOnly: boolean;
  onChange: (next: string) => void;
}

/**
 * WYSIWYG markdown surface (Milkdown + remark/remark-gfm). Drop-in shape match
 * with Editor.tsx (`{ value, readOnly, onChange }`) so DocPanel's state wiring
 * is unchanged. The document model IS markdown — the remark serializer emits
 * byte-clean markdown matching the corpus conventions (`-` bullets, fenced
 * code, GFM tables), which is what selftest-roundtrip guards.
 */
export default function MarkdownEditor({ value, readOnly, onChange }: MarkdownEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const readOnlyRef = useRef(readOnly);
  readOnlyRef.current = readOnly;

  useEffect(() => {
    if (!hostRef.current) return;
    const host = hostRef.current;
    let editor: Editor | null = null;
    let destroyed = false;

    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, host);
        ctx.set(defaultValueCtx, value);
        // Serializer conventions tuned to the repo corpus so parse→serialize is
        // byte-clean (no churned bullet glyphs / emphasis markers in the diff).
        ctx.set(remarkStringifyOptionsCtx, {
          bullet: "-",
          fences: true,
          listItemIndent: "one",
          rule: "-",
          ruleSpaces: false,
          emphasis: "_",
          strong: "*",
          incrementListMarker: false,
        });
        ctx.update(editorViewOptionsCtx, (prev) => ({
          ...prev,
          editable: () => !readOnlyRef.current,
        }));
        ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
          onChangeRef.current(markdown);
        });
      })
      .use(commonmark)
      .use(gfm)
      .use(listener)
      .create()
      .then((made) => {
        if (destroyed) {
          made.destroy();
          return;
        }
        editor = made;
        editorRef.current = made;
      });

    return () => {
      destroyed = true;
      editor?.destroy();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={hostRef} className="md-surface" />;
}
