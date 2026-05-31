import { ReactNode, useEffect, useRef, useState } from "react";

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
 * four (list / link / table / code-block) follow. Buttons dispatch
 * `ToolbarAction` commands via `onAction` against the current selection.
 * `disabled` mirrors `readOnly`. The Heading button opens an H1/H2/H3
 * level-picker popover (not a click-cycle).
 */
export default function MarkdownToolbar({ onAction, disabled, active }: MarkdownToolbarProps) {
  const [headingOpen, setHeadingOpen] = useState(false);
  const headingRef = useRef<HTMLDivElement | null>(null);

  // Close the heading popover on any outside click.
  useEffect(() => {
    if (!headingOpen) return;
    const onDown = (e: MouseEvent): void => {
      if (!headingRef.current?.contains(e.target as Node)) setHeadingOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [headingOpen]);

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

  const pickHeading = (level: number): void => {
    setHeadingOpen(false);
    onAction("heading", level);
  };

  return (
    <div className="md-toolbar" role="toolbar" aria-label="Formatting">
      {btn("bold", "Bold (⌘B)", <b>B</b>)}
      {btn("italic", "Italic (⌘I)", <i>I</i>)}

      <div className="tb-pop-wrap" ref={headingRef}>
        <button
          type="button"
          className={`tb-btn${isActive("heading") ? " tb-btn--active" : ""}`}
          title="Heading"
          aria-label="Heading"
          aria-haspopup="menu"
          aria-expanded={headingOpen}
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setHeadingOpen((o) => !o)}
        >
          <span>H</span>
          <span className="caret">▾</span>
        </button>
        {headingOpen && (
          <div className="tb-menu" role="menu" aria-label="Heading level">
            {[1, 2, 3].map((level) => (
              <button
                key={level}
                type="button"
                role="menuitem"
                className="tb-menu__item"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickHeading(level)}
              >
                Heading {level}
              </button>
            ))}
          </div>
        )}
      </div>

      <span className="tb-sep" />
      {btn("bulletList", "Bullet list", "☰")}
      {btn("link", "Link", "🔗")}
      {btn("table", "Table", "▦")}
      {btn("codeBlock", "Code block", <span className="mono">&lt;/&gt;</span>)}
    </div>
  );
}
