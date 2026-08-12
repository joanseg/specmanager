// R6 — spec-slice assembly for the build pipeline's reviewer hand-off.
//
// This module owns the one parser for plan.md `## Phase <name>` headings.
// `core/active-card.ts` (and through it the Stop-gate) imports `matchPhaseHeading`
// from here rather than keeping a second copy — one parser, one place, so a fix
// to the heading grammar can never apply to only half the callers.
//
// `getSpecSlice` itself lands in follow-up tasks; this file currently ships the
// shared matcher and Architecture anchor resolution.

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

/** One Architecture section, resolved from a `meta.architectureRefs` anchor. */
export interface SpecSliceSection {
  /** The ref as written in meta.architectureRefs (or the matched heading token on fallback). */
  ref: string;
  /** The heading line, verbatim, without the leading #s. */
  heading: string;
  /** Heading through to the next same-or-shallower heading, exclusive. */
  body: string;
}

/** A markdown heading with both anchor keys and its position in the source. */
export interface HeadingEntry {
  level: number;
  /** Heading text, without the leading #s. */
  text: string;
  /** First token, trailing `—`/`-`/`:`/`.` stripped. `## R1 — Delete …` ⇒ `R1`. */
  id: string;
  /** Lowercased, non-alphanumeric runs collapsed to `-`. `## Sequence / flow` ⇒ `sequence-flow`. */
  slug: string;
  /** Offset of the heading line's first character. */
  start: number;
}

const HEADING_RE = /^(#{2,6})[ \t]+(.+)$/gm;

/** First whitespace-delimited token of a heading, trailing punctuation stripped. */
export function idToken(headingText: string): string {
  const first = headingText.trim().split(/\s+/)[0] ?? "";
  return first.replace(/[—:.-]+$/, "");
}

/** Heading text lowercased with every non-alphanumeric run collapsed to a single `-`. */
export function kebabSlug(headingText: string): string {
  return headingText
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Index every `##`…`######` heading, in document order. */
export function indexHeadings(markdown: string): HeadingEntry[] {
  const out: HeadingEntry[] = [];
  for (const m of markdown.matchAll(HEADING_RE)) {
    const text = m[2]!.trim();
    out.push({
      level: m[1]!.length,
      text,
      id: idToken(text),
      slug: kebabSlug(text),
      start: m.index!,
    });
  }
  return out;
}

/**
 * Slice from `headings[i]` through to the next heading of level ≤ its own,
 * exclusive — so a `##` section swallows its `###` children and stops at the
 * next `##`. Runs to EOF when no such heading follows.
 */
function sliceAt(markdown: string, headings: HeadingEntry[], i: number): string {
  const here = headings[i]!;
  const next = headings.slice(i + 1).find((h) => h.level <= here.level);
  return markdown.slice(here.start, next ? next.start : markdown.length).trimEnd();
}

/**
 * Resolve `meta.architectureRefs` anchors against an Architecture document.
 *
 * A ref matches a heading when it equals that heading's id-token or kebab-slug,
 * compared case-insensitively; id-token is tried first, then kebab-slug, and the
 * first matching heading wins silently (two headings sharing an anchor is an
 * authoring defect `core` does not arbitrate).
 *
 * A ref that matches nothing is returned in `unresolvedRefs` and produces no
 * section — so an anchor that resolved to nothing is always distinguishable
 * from one that resolved to a short section. Never throws, never guesses.
 */
export function resolveArchitectureRefs(
  markdown: string,
  refs: string[]
): { sections: SpecSliceSection[]; unresolvedRefs: string[] } {
  const headings = indexHeadings(markdown);
  const sections: SpecSliceSection[] = [];
  const unresolvedRefs: string[] = [];

  for (const ref of refs) {
    const key = ref.trim().toLowerCase();
    let i = headings.findIndex((h) => h.id.toLowerCase() === key);
    if (i === -1) i = headings.findIndex((h) => h.slug === key);
    if (i === -1) {
      unresolvedRefs.push(ref);
      continue;
    }
    sections.push({ ref, heading: headings[i]!.text, body: sliceAt(markdown, headings, i) });
  }

  return { sections, unresolvedRefs };
}
