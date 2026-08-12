// R6 — spec-slice assembly for the build pipeline's reviewer hand-off.
//
// This module owns the one parser for plan.md `## Phase <name>` headings.
// `core/active-card.ts` (and through it the Stop-gate) imports `matchPhaseHeading`
// from here rather than keeping a second copy — one parser, one place, so a fix
// to the heading grammar can never apply to only half the callers.

import fs from "node:fs/promises";
import { projectRoot } from "./paths.js";
import { listPhases } from "./phases.js";
import { listTasks, readTasksMeta } from "./tasks.js";
import { listDocuments } from "./documents.js";

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

/**
 * Fallback anchor resolution, used when `architectureRefs` is empty/absent
 * **or** when every listed ref failed to resolve. Matches headings against the
 * phase name itself rather than an explicit anchor:
 *
 * - Tier 1: heading id-token or kebab-slug equals the phase name exactly,
 *   case-insensitively.
 * - Tier 2 (only when tier 1 finds nothing): heading kebab-slug contains the
 *   phase name as a whole hyphen-delimited segment — so phase `core` matches
 *   `## core-spec-slice` (slug `core-spec-slice`, segment `core`).
 *
 * Every heading at the winning tier is kept, in document order. Zero matches
 * ⇒ `[]`. Never throws.
 */
export function matchHeadingsByPhaseName(markdown: string, phase: string): SpecSliceSection[] {
  const headings = indexHeadings(markdown);
  const phaseKey = phase.trim().toLowerCase();
  const phaseSlug = kebabSlug(phase);

  const tier1: number[] = [];
  const tier2: number[] = [];
  headings.forEach((h, i) => {
    if (h.id.toLowerCase() === phaseKey || h.slug === phaseSlug) {
      tier1.push(i);
    } else if (h.slug.split("-").includes(phaseSlug)) {
      tier2.push(i);
    }
  });

  const indices = tier1.length > 0 ? tier1 : tier2;
  return indices.map((i) => ({
    ref: headings[i]!.id,
    heading: headings[i]!.text,
    body: sliceAt(markdown, headings, i),
  }));
}

/**
 * Slice plan.md down to one `## Phase <name>` section: from the matched
 * heading line through to the next `^##\s` heading, or a line that is exactly
 * `---`, whichever comes first (or EOF). Phase name matched via
 * `matchPhaseHeading` — the shared parser, not a second copy — and compared
 * case-insensitively, so it tolerates the `— <theme>` suffix. No match ⇒ null.
 */
function planSectionFor(planBody: string, phase: string): string | null {
  const lines = planBody.split("\n");
  const key = phase.toLowerCase();
  let start = -1;
  let end = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (start === -1) {
      const heading = matchPhaseHeading(line);
      if (heading !== null && heading.toLowerCase() === key) start = i;
      continue;
    }
    if (/^##\s/.test(line) || line.trim() === "---") {
      end = i;
      break;
    }
  }

  if (start === -1) return null;
  return lines.slice(start, end).join("\n").trimEnd();
}

/** One task as it belongs in the reviewer's slice. */
export interface SpecSliceTask {
  id: string;
  title: string;
  // `Task` (core/types.ts) carries no notes field today — always null until
  // one is added upstream. Kept as its own field rather than dropped so the
  // envelope's shape doesn't have to change when that lands.
  notes: string | null;
  complexity: number | null;
}

/** The spec-compliance reviewer's assembled hand-off for one phase. */
export interface SpecSlice {
  featureId: string;
  phase: string;
  /** plan.md's `## Phase <name>` section, or null when the plan doc or heading is missing. */
  planSection: string | null;
  tasks: SpecSliceTask[];
  architecture: SpecSliceSection[];
  /** Refs named in meta.architectureRefs that matched no heading. Never throws. */
  unresolvedRefs: string[];
  /** True when architecture[] was assembled by name-matching rather than explicit refs. */
  fallbackUsed: boolean;
}

/**
 * Assemble the reviewer's spec slice for one phase: its plan.md section, its
 * task titles/notes, and the Architecture sections its `meta.architectureRefs`
 * resolve to. Returns null for an unknown phase — mirroring
 * `getPhaseCompletion`, so the build command's existing phase-not-found branch
 * is reused unchanged. Never throws: a missing Architecture doc or plan doc
 * degrades the corresponding field rather than erroring.
 */
export async function getSpecSlice(
  featureId: string,
  phase: string,
  root = projectRoot()
): Promise<SpecSlice | null> {
  const phases = await listPhases(featureId, root);
  if (!phases.some((p) => p.name === phase)) return null;

  const allTasks = await listTasks(featureId, root);
  const tasks: SpecSliceTask[] = allTasks
    .filter((t) => t.phase === phase)
    .map((t) => ({ id: t.id, title: t.title, notes: null, complexity: t.complexity }));

  const meta = await readTasksMeta(featureId, root);
  const refs = meta.phases[phase]?.architectureRefs ?? [];

  let architecture: SpecSliceSection[] = [];
  let unresolvedRefs: string[] = [...refs];
  let fallbackUsed = refs.length === 0;
  const [archDoc] = await listDocuments({ featureId, stage: "architecture" }, root);
  if (archDoc) {
    try {
      const archMarkdown = await fs.readFile(archDoc.filePath, "utf8");
      if (refs.length === 0) {
        architecture = matchHeadingsByPhaseName(archMarkdown, phase);
      } else {
        // Resolve first, then fall back when *every* named ref missed. The
        // unresolved list stays populated either way, so a caller can tell an
        // all-drifted ref list (fallbackUsed + unresolvedRefs) from a phase that
        // named no refs at all (fallbackUsed, unresolvedRefs empty).
        const resolved = resolveArchitectureRefs(archMarkdown, refs);
        unresolvedRefs = resolved.unresolvedRefs;
        fallbackUsed = unresolvedRefs.length === refs.length;
        architecture = fallbackUsed
          ? matchHeadingsByPhaseName(archMarkdown, phase)
          : resolved.sections;
      }
    } catch {
      // Architecture doc unreadable ⇒ treat as absent: no sections, and the full
      // ref list stays unresolved (empty when the phase named no refs). There is
      // no markdown to name-match against, so this branch never sets
      // fallbackUsed on its own — Architecture step 1 specifies exactly this.
    }
  }

  let planSection: string | null = null;
  const [planDoc] = await listDocuments({ featureId, stage: "plan" }, root);
  if (planDoc) {
    try {
      const planMarkdown = await fs.readFile(planDoc.filePath, "utf8");
      planSection = planSectionFor(planMarkdown, phase);
    } catch {
      // Plan doc unreadable ⇒ no plan section.
    }
  }

  return {
    featureId,
    phase,
    planSection,
    tasks,
    architecture,
    unresolvedRefs,
    fallbackUsed,
  };
}
