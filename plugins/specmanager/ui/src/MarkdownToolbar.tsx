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
  /** Whether the chat column is attached (the right-most Chat toggle). */
  chatOn: boolean;
  /** Toggle the chat column on/off (design Screen 2 `.tb-toggle`). */
  onToggleChat: (next: boolean) => void;
}

// Below this toolbar width the secondary four collapse into a `⋯` menu.
const NARROW_PX = 340;

const SECONDARY: { action: ToolbarAction; title: string; glyph: ReactNode }[] = [
  { action: "bulletList", title: "Bullet list", glyph: "☰" },
  { action: "link", title: "Link", glyph: "🔗" },
  { action: "table", title: "Table", glyph: "▦" },
  { action: "codeBlock", title: "Code block", glyph: <span className="mono">&lt;/&gt;</span> },
];

/**
 * Formatting bar above the WYSIWYG surface (design Screens 2–3, `.md-toolbar`).
 * Bold / Italic / Heading are the always-visible primary trio; the secondary
 * four (list / link / table / code-block) collapse into a `⋯` overflow menu at
 * narrow panel widths. Buttons dispatch `ToolbarAction` commands via `onAction`
 * against the current selection. `disabled` mirrors `readOnly`. The Heading
 * button opens an H1/H2/H3 level-picker popover (not a click-cycle).
 */
export default function MarkdownToolbar({ onAction, disabled, active, chatOn, onToggleChat }: MarkdownToolbarProps) {
  const [headingOpen, setHeadingOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const headingRef = useRef<HTMLDivElement | null>(null);
  const overflowRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);

  // Collapse the secondary actions when the bar gets narrow.
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setNarrow(entry.contentRect.width < NARROW_PX);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Close either popover on an outside click.
  useEffect(() => {
    if (!headingOpen && !overflowOpen) return;
    const onDown = (e: MouseEvent): void => {
      const t = e.target as Node;
      if (!headingRef.current?.contains(t)) setHeadingOpen(false);
      if (!overflowRef.current?.contains(t)) setOverflowOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [headingOpen, overflowOpen]);

  const isActive = (a: ToolbarAction): boolean => active?.has(a) ?? false;

  const btn = (action: ToolbarAction, title: string, label: ReactNode): ReactNode => (
    <button
      type="button"
      className={`tb-btn${isActive(action) ? " tb-btn--active" : ""}`}
      title={title}
      aria-label={title}
      aria-pressed={isActive(action)}
      disabled={disabled}
      // Keep editor focus/selection — toolbar buttons must not steal it.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onAction(action)}
    >
      {label}
    </button>
  );

  const pickHeading = (level: number): void => {
    setHeadingOpen(false);
    onAction("heading", level);
  };

  return (
    <div className="md-toolbar" role="toolbar" aria-label="Formatting" ref={barRef}>
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

      {narrow ? (
        <div className="tb-pop-wrap" ref={overflowRef}>
          <button
            type="button"
            className="tb-btn"
            title="More formatting"
            aria-label="More formatting"
            aria-haspopup="menu"
            aria-expanded={overflowOpen}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setOverflowOpen((o) => !o)}
          >
            ⋯
          </button>
          {overflowOpen && (
            <div className="tb-menu" role="menu" aria-label="More formatting">
              {SECONDARY.map(({ action, title, glyph }) => (
                <button
                  key={action}
                  type="button"
                  role="menuitem"
                  className={`tb-menu__item${isActive(action) ? " tb-menu__item--active" : ""}`}
                  aria-pressed={isActive(action)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setOverflowOpen(false);
                    onAction(action);
                  }}
                >
                  <span className="tb-menu__glyph">{glyph}</span> {title}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        SECONDARY.map(({ action, title, glyph }) => (
          <span key={action}>{btn(action, title, glyph)}</span>
        ))
      )}

      <span className="tb-spacer" />
      <label className="tb-toggle">
        <input
          type="checkbox"
          checked={chatOn}
          onChange={(e) => onToggleChat(e.target.checked)}
        />
        Chat
      </label>
    </div>
  );
}
