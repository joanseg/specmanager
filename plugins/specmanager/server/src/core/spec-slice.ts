// R6 — spec-slice assembly for the build pipeline's reviewer hand-off.
//
// This module owns the one parser for plan.md `## Phase <name>` headings.
// `core/active-card.ts` (and through it the Stop-gate) imports `matchPhaseHeading`
// from here rather than keeping a second copy — one parser, one place, so a fix
// to the heading grammar can never apply to only half the callers.
//
// `getSpecSlice` itself lands in follow-up tasks; this file currently ships the
// shared matcher only.

/**
 * Match a plan.md phase heading and return the phase name it declares.
 *
 * Recognises `## Phase <name>`, case-insensitively, where `<name>` is the first
 * run of characters up to whitespace or a dash — so `## Phase core — theme` and
 * `## Phase core` both yield `core`. Returns the name **as written**; callers
 * compare case-insensitively. Any other line ⇒ `null`.
 */
export function matchPhaseHeading(line: string): string | null {
  const m = line.match(/^##\s+Phase\s+([^\s—-]+)/i);
  return m ? m[1]! : null;
}
