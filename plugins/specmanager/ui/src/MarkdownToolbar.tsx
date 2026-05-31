import { ReactNode } from "react";

export type ToolbarAction =
  | "bold"
  | "italic"
  | "heading"
  | "bulletList"
  | "link"
  | "table"
  | "codeBlock";

export interface MarkdownToolbarProps {
  /** Dispatch a Milkdown command against the current selection. */
  onAction: (action: ToolbarAction, payload?: unknown) => void;
  /** Mirrors DocPanel's readOnly — when true the bar is disabled. */
  disabled: boolean;
  /** Actions whose mark/node covers the current selection (active state). */
  active?: ReadonlySet<ToolbarAction>;
}

/**
 * Formatting bar above the WYSIWYG surface (design Screens 2–3, `.md-toolbar`).
 * Bold / Italic / Heading are the always-visible primary trio; the secondary
 * four (list / link / table / code-block) are added in task-008. Buttons
 * dispatch `ToolbarAction` commands via `onAction` against the current
 * selection. `disabled` mirrors `readOnly`.
 */
export default function MarkdownToolbar({ onAction, disabled, active }: MarkdownToolbarProps) {
  const isActive = (a: ToolbarAction): boolean => active?.has(a) ?? false;

  const btn = (
    action: ToolbarAction,
    title: string,
    label: ReactNode,
    payload?: unknown
  ): ReactNode => (
    <button
      type="button"
      className={`tb-btn${isActive(action) ? " tb-btn--active" : ""}`}
      title={title}
      aria-label={title}
      aria-pressed={isActive(action)}
      disabled={disabled}
      // Keep editor focus/selection — toolbar buttons must not steal it.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onAction(action, payload)}
    >
      {label}
    </button>
  );

  return (
    <div className="md-toolbar" role="toolbar" aria-label="Formatting">
      {btn("bold", "Bold (⌘B)", <b>B</b>)}
      {btn("italic", "Italic (⌘I)", <i>I</i>)}
      {btn(
        "heading",
        "Heading",
        <>
          <span>H</span>
          <span className="caret">▾</span>
        </>
      )}
      <span className="tb-sep" />
      {btn("bulletList", "Bullet list", "☰")}
      {btn("link", "Link", "🔗")}
      {btn("table", "Table", "▦")}
      {btn("codeBlock", "Code block", <span className="mono">&lt;/&gt;</span>)}
    </div>
  );
}
