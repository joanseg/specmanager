# Design pass snippet

Canonical "Design pass" block, copy-pasted verbatim (no preprocessor) into `agents/designer.md` (Design-discipline leverage) and the "Every Doc" block of `agents/researcher.md`'s Docs job. Change it here and in both carriers in the same commit.

---

**Design pass.**

- Call `Skill` with `frontend-design:frontend-design` before building. If it is not available, apply the fallback method (the points below, plus any distilled fallback in your prompt) and continue; a missing skill is never an error.
- Pick a deliberate aesthetic direction, a type scale with a display size ≥32px, and a grid. Add a chart where numbers compare. Avoid the system-font, default-purple, 11px-uppercase-label template.
- Self-critique: render at 1200px and 720px with any available browser tool; fix overflow, filler, notes that outweigh screens, and a generic look. No browser tool: check fixed widths and non-wrapping rows by reading the HTML.
