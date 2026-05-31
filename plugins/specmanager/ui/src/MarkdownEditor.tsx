import { useEffect, useRef } from "react";
import {
  Editor,
  rootCtx,
  defaultValueCtx,
  editorViewOptionsCtx,
  editorViewCtx,
  serializerCtx,
  remarkStringifyOptionsCtx,
} from "@milkdown/core";
import {
  commonmark,
  toggleStrongCommand,
  toggleEmphasisCommand,
  wrapInHeadingCommand,
} from "@milkdown/preset-commonmark";
import { gfm } from "@milkdown/preset-gfm";
import { listener, listenerCtx } from "@milkdown/plugin-listener";
import { callCommand, replaceAll } from "@milkdown/utils";
import MarkdownToolbar, { ToolbarAction } from "./MarkdownToolbar";

interface MarkdownEditorProps {
  value: string;
  readOnly: boolean;
  onChange: (next: string) => void;
}

// Maps a toolbar action to the Milkdown command it dispatches. Secondary
// actions (bulletList/link/table/codeBlock) are wired in task-008.
function runAction(editor: Editor, action: ToolbarAction, payload?: unknown): void {
  editor.action((ctx) => {
    switch (action) {
      case "bold":
        callCommand(toggleStrongCommand.key)(ctx);
        break;
      case "italic":
        callCommand(toggleEmphasisCommand.key)(ctx);
        break;
      case "heading":
        callCommand(wrapInHeadingCommand.key, (payload as number) ?? 1)(ctx);
        break;
    }
  });
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
  // Guards an external replaceAll (the `value` sync effect) from echoing back
  // through the listener as a spurious onChange — same idiom as Editor.tsx.
  const settingExternal = useRef(false);
  // Last markdown we emitted/received, so the sync effect can skip a no-op
  // replaceAll when `value` just reflects our own onChange round-trip.
  const lastMarkdown = useRef(value);

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
          if (settingExternal.current) return;
          lastMarkdown.current = markdown;
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

  // Sync external doc changes (reload after save, chat co-write, 409 reload)
  // without firing a spurious onChange. Skip when `value` is just our own last
  // emitted markdown bouncing back through DocPanel state.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (value === lastMarkdown.current) return;
    editor.action((ctx) => {
      const serializer = ctx.get(serializerCtx);
      const view = ctx.get(editorViewCtx);
      if (serializer(view.state.doc) === value) return;
      settingExternal.current = true;
      try {
        replaceAll(value)(ctx);
        lastMarkdown.current = value;
      } finally {
        settingExternal.current = false;
      }
    });
  }, [value]);

  // Toggle read-only without rebuilding: editable() reads readOnlyRef, so just
  // nudge the view to re-evaluate its editable state.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      view.dispatch(view.state.tr);
    });
  }, [readOnly]);

  const onAction = (action: ToolbarAction, payload?: unknown): void => {
    const editor = editorRef.current;
    if (!editor || readOnly) return;
    runAction(editor, action, payload);
  };

  return (
    <div className="md-editor">
      <MarkdownToolbar onAction={onAction} disabled={readOnly} />
      <div ref={hostRef} className="md-surface" />
    </div>
  );
}
