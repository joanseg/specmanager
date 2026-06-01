import { useEffect, useRef, useState } from "react";
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
  wrapInBulletListCommand,
  toggleLinkCommand,
  createCodeBlockCommand,
} from "@milkdown/preset-commonmark";
import { gfm, insertTableCommand } from "@milkdown/preset-gfm";
import { listener, listenerCtx } from "@milkdown/plugin-listener";
import { $prose, callCommand, replaceAll } from "@milkdown/utils";
import { Plugin } from "@milkdown/prose/state";
import type { EditorState } from "@milkdown/prose/state";
import MarkdownToolbar, { ToolbarAction } from "./MarkdownToolbar";

// Reads which toolbar actions are "on" for the current selection so the bar can
// light the matching button (design Screen 3 — active/selected state).
function activeActions(state: EditorState): Set<ToolbarAction> {
  const active = new Set<ToolbarAction>();
  const { schema, selection } = state;
  const { $from, from, to, empty } = selection;

  const markOn = (name: string): boolean => {
    const type = schema.marks[name];
    if (!type) return false;
    if (empty) return !!type.isInSet(state.storedMarks ?? $from.marks());
    return state.doc.rangeHasMark(from, to, type);
  };
  if (markOn("strong")) active.add("bold");
  if (markOn("emphasis")) active.add("italic");
  if (markOn("link")) active.add("link");

  // Walk the ancestor chain of the cursor for block context.
  for (let d = $from.depth; d > 0; d--) {
    const name = $from.node(d).type.name;
    if (name === "heading") active.add("heading");
    if (name === "bullet_list") active.add("bulletList");
    if (name === "code_block") active.add("codeBlock");
    if (name === "table") active.add("table");
  }
  return active;
}

interface MarkdownEditorProps {
  value: string;
  readOnly: boolean;
  onChange: (next: string) => void;
  /** Whether the chat column is attached (Chat toggle lives in the toolbar). */
  showChat: boolean;
  /** Toggle the chat column on/off. */
  onToggleChat: (next: boolean) => void;
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
      case "bulletList":
        callCommand(wrapInBulletListCommand.key)(ctx);
        break;
      case "link": {
        const href = (payload as string) ?? "";
        callCommand(toggleLinkCommand.key, { href })(ctx);
        break;
      }
      case "table":
        callCommand(insertTableCommand.key, { row: 3, col: 3 })(ctx);
        break;
      case "codeBlock":
        callCommand(createCodeBlockCommand.key)(ctx);
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
export default function MarkdownEditor({ value, readOnly, onChange, showChat, onToggleChat }: MarkdownEditorProps) {
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
  // Toolbar active state, recomputed from the selection on every transaction.
  const [active, setActive] = useState<ReadonlySet<ToolbarAction>>(new Set());
  const setActiveRef = useRef(setActive);
  setActiveRef.current = setActive;

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
          // The ProseMirror editor root carries the reading-column + markdown
          // classes so editing and reading share one set of `.prose`/`.markdown`
          // rules (design Screen 1/5 — "editing == reading").
          attributes: { class: "prose markdown" },
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
      // Recompute the toolbar's active set whenever the selection/doc changes.
      .use(
        $prose(
          () =>
            new Plugin({
              view: () => ({
                update: (view) => setActiveRef.current(activeActions(view.state)),
              }),
            })
        )
      )
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
    if (action === "link" && payload === undefined) {
      const href = window.prompt("Link URL");
      if (href === null) return; // cancelled
      runAction(editor, action, href);
      return;
    }
    runAction(editor, action, payload);
  };

  return (
    <div className="md-editor">
      {readOnly ? (
        <div className="ro-hint">
          <span className="dot" /> Approved — read-only. Choose <b>Edit</b> to reopen as a draft and format.
          <span className="tb-spacer" />
          <label className="tb-toggle">
            <input
              type="checkbox"
              checked={showChat}
              onChange={(e) => onToggleChat(e.target.checked)}
            />
            Chat
          </label>
        </div>
      ) : (
        <MarkdownToolbar
          onAction={onAction}
          disabled={readOnly}
          active={active}
          chatOn={showChat}
          onToggleChat={onToggleChat}
        />
      )}
      <div ref={hostRef} className={`md-surface${readOnly ? " md-surface--ro" : ""}`} />
    </div>
  );
}
