import { useEffect, useRef, useState } from "react";

export type Mode = "builder" | "researcher";

const MODES: { id: Mode; label: string; glyph: string }[] = [
  { id: "builder", label: "Builder", glyph: "▦" },
  { id: "researcher", label: "Researcher", glyph: "◎" },
];
const STORAGE_KEY = "specmanager.mode";

function parseMode(value: string | null | undefined): Mode | null {
  return value === "builder" || value === "researcher" ? value : null;
}

function readStoredMode(): Mode | null {
  try {
    return parseMode(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function storeMode(mode: Mode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Storage unavailable: the hash still carries the mode.
  }
}

function initialMode(): Mode {
  return parseMode(window.location.hash.slice(1)) ?? readStoredMode() ?? "builder";
}

/** Board mode held in the URL hash (#builder / #researcher), mirrored to localStorage. */
export function useMode(): [Mode, (mode: Mode) => void] {
  const [mode, setMode] = useState<Mode>(initialMode);

  useEffect(() => {
    if (window.location.hash !== `#${mode}`) {
      window.history.replaceState(null, "", `#${mode}`);
    }
    storeMode(mode);
  }, [mode]);

  useEffect(() => {
    const onHash = (): void => {
      const next = parseMode(window.location.hash.slice(1));
      if (next) setMode(next);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return [mode, setMode];
}

/** Two-segment Builder | Researcher tablist with Left/Right arrow navigation. */
export default function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  const refs = useRef<Record<Mode, HTMLButtonElement | null>>({ builder: null, researcher: null });

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const index = MODES.findIndex((m) => m.id === mode);
    const step = e.key === "ArrowRight" ? 1 : -1;
    const next = MODES[(index + step + MODES.length) % MODES.length]!.id;
    onChange(next);
    refs.current[next]?.focus();
  };

  return (
    <div className="mode-toggle" role="tablist" aria-label="Board mode" onKeyDown={onKeyDown}>
      {MODES.map((m) => {
        const active = m.id === mode;
        return (
          <button
            key={m.id}
            ref={(el) => {
              refs.current[m.id] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            className={`mode-toggle__seg${active ? " mode-toggle__seg--active" : ""}`}
            onClick={() => onChange(m.id)}
          >
            <span className="glyph" aria-hidden="true">{m.glyph}</span>
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
