import fs from "node:fs/promises";
import path from "node:path";
import {
  Feature,
  ResearchDocFrontmatter,
  ResearchDocFrontmatterSchema,
  ResearchDocRecord,
  ResearchKind,
  Study,
  StudySchema,
} from "./types.js";
import { projectRoot, researchDir, studyDir, studyNotesDir } from "./paths.js";
import { nowIso, slugify } from "./ids.js";
import { createFeature, ensureSpecsRoot, listFeatures, uniqueSlug } from "./features.js";
import { indexHeadings } from "./spec-slice.js";
import { events } from "./events.js";
import { readDoc, writeDoc } from "./frontmatter.js";
import { DESIGN_BRIEF_MAX_BYTES, sanitizeDesignBriefBody } from "./documents.js";

/** Study id for a research slug. */
export function studyId(slug: string): string {
  return `study-${slug}`;
}

function studyFile(slug: string, root: string): string {
  return path.join(studyDir(slug, root), "study.json");
}

/** Create `research/<slug>/study.json` and an empty `notes/` (notes are tracked in git). */
export async function createStudy(
  input: { title: string; idea: string },
  root = projectRoot()
): Promise<Study> {
  await ensureSpecsRoot(root);
  await fs.mkdir(researchDir(root), { recursive: true });
  const slug = await uniqueSlug(slugify(input.title), researchDir(root));
  await fs.mkdir(studyNotesDir(slug, root), { recursive: true });
  const study = StudySchema.parse({
    id: studyId(slug),
    slug,
    title: input.title,
    idea: input.idea,
    createdAt: nowIso(),
  });
  await fs.writeFile(studyFile(slug, root), JSON.stringify(study, null, 2), "utf8");
  events.emit({ type: "study.created", studyId: study.id });
  return study;
}

/** All studies, oldest first; a malformed study.json is skipped with a stderr warning. */
export async function listStudies(root = projectRoot()): Promise<Study[]> {
  const slugs = await fs.readdir(researchDir(root)).catch(() => [] as string[]);
  const studies: Study[] = [];
  for (const slug of slugs) {
    const file = studyFile(slug, root);
    const raw = await fs.readFile(file, "utf8").catch(() => null);
    if (raw === null) continue;
    try {
      studies.push(StudySchema.parse(JSON.parse(raw)));
    } catch (err) {
      console.error(`specmanager: skipping malformed ${file}: ${(err as Error).message}`);
    }
  }
  studies.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return studies;
}

/** Read one study by slug. */
export async function readStudy(slug: string, root = projectRoot()): Promise<Study> {
  const raw = await fs.readFile(studyFile(slug, root), "utf8");
  return StudySchema.parse(JSON.parse(raw));
}

const KIND_ID_PREFIX: Record<ResearchKind, string> = {
  market: "market",
  concepts: "concepts",
  "user-research": "ur",
  marketing: "mktg",
  strategy: "strategy",
};

const KIND_FILENAME: Record<ResearchKind, string> = {
  market: "market-research.md",
  concepts: "concepts.html",
  "user-research": "user-research.md",
  marketing: "marketing-plan.md",
  strategy: "strategy.md",
};

/** Deterministic research doc id: one doc per kind per study. */
export function researchDocId(kind: ResearchKind, slug: string): string {
  return `${KIND_ID_PREFIX[kind]}-${slug}`;
}

function slugOfStudyId(id: string): string {
  if (!id.startsWith("study-")) throw new Error(`not a study id: ${id}`);
  return id.slice("study-".length);
}

/** Concepts bodies are HTML: defang `---` lines and enforce the design-brief size cap. */
function prepareBody(kind: ResearchKind, body: string): string {
  if (kind !== "concepts") return body;
  const bytes = Buffer.byteLength(body, "utf8");
  if (bytes > DESIGN_BRIEF_MAX_BYTES) {
    throw new Error(
      `concepts body is ${bytes} bytes — cap is ${DESIGN_BRIEF_MAX_BYTES}. Refer to large images by repo-relative path instead of inlining them.`
    );
  }
  return sanitizeDesignBriefBody(body);
}

/** Reject `dependsOn` / `basedOn` ids that are not this study's research doc ids. */
function assertSameStudy(slug: string, dependsOn: string[], basedOn: Record<string, number>): void {
  const own = new Set(Object.keys(KIND_ID_PREFIX).map((k) => researchDocId(k as ResearchKind, slug)));
  const foreign = [...dependsOn, ...Object.keys(basedOn)].filter((id) => !own.has(id));
  if (foreign.length > 0) {
    throw new Error(`cross-study reference rejected: ${foreign.join(", ")} not in study-${slug}`);
  }
}

function assertFindingsKind(kind: ResearchKind, findings: string[] | undefined): void {
  if (findings !== undefined && kind !== "user-research") {
    throw new Error(`findings is only valid on user-research docs (got kind "${kind}")`);
  }
}

/** All research docs of one study; a malformed doc is skipped with a stderr warning. */
export async function listResearchDocs(
  studyId: string,
  root = projectRoot()
): Promise<ResearchDocRecord[]> {
  const slug = slugOfStudyId(studyId);
  const docs: ResearchDocRecord[] = [];
  for (const name of Object.values(KIND_FILENAME)) {
    const file = path.join(studyDir(slug, root), name);
    try {
      docs.push(await readDoc(file, ResearchDocFrontmatterSchema));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") continue;
      console.error(`specmanager: skipping malformed ${file}: ${(err as Error).message}`);
    }
  }
  return docs;
}

/** Find a research doc by id across all studies. */
export async function readResearchDocById(
  id: string,
  root = projectRoot()
): Promise<ResearchDocRecord> {
  for (const study of await listStudies(root)) {
    const hit = (await listResearchDocs(study.id, root)).find((d) => d.frontmatter.id === id);
    if (hit) return hit;
  }
  throw new Error(`research doc not found: ${id}`);
}

export interface CreateResearchDocInput {
  studyId: string;
  kind: ResearchKind;
  title: string;
  body?: string;
  generatedBy?: "agent" | "human";
  dependsOn?: string[];
  basedOn?: Record<string, number>;
  findings?: string[];
}

/** Create the study's single doc of `kind`; fails if one already exists. */
export async function createResearchDoc(
  input: CreateResearchDocInput,
  root = projectRoot()
): Promise<ResearchDocRecord> {
  const study = await readStudy(slugOfStudyId(input.studyId), root);
  const dependsOn = input.dependsOn ?? [];
  const basedOn = input.basedOn ?? {};
  assertSameStudy(study.slug, dependsOn, basedOn);
  assertFindingsKind(input.kind, input.findings);
  const gate = await checkResearchStep(study.id, input.kind, root);
  if (!gate.ok) throw new Error(`gate closed for ${input.kind} on ${study.id}: ${gate.reason}`);
  const filePath = path.join(studyDir(study.slug, root), KIND_FILENAME[input.kind]);
  const exists = await fs.stat(filePath).then(() => true, () => false);
  if (exists) {
    throw new Error(`a ${input.kind} doc already exists for ${study.id} — use write_research_doc`);
  }
  const body = prepareBody(input.kind, input.body ?? "");
  const now = nowIso();
  const frontmatter: ResearchDocFrontmatter = ResearchDocFrontmatterSchema.parse({
    id: researchDocId(input.kind, study.slug),
    studyId: study.id,
    kind: input.kind,
    title: input.title,
    dependsOn,
    basedOn,
    generatedBy: input.generatedBy ?? "human",
    version: 1,
    ...(input.findings !== undefined ? { findings: input.findings } : {}),
    createdAt: now,
    updatedAt: now,
  });
  await writeDoc(filePath, frontmatter, body, ResearchDocFrontmatterSchema);
  events.emit({ type: "research.created", documentId: frontmatter.id, studyId: study.id });
  return { frontmatter, body, filePath };
}

export interface WriteResearchDocInput {
  id: string;
  body?: string;
  title?: string;
  generatedBy?: "agent" | "human";
  baseVersion?: number;
  dependsOn?: string[];
  basedOn?: Record<string, number>;
  findings?: string[];
}

/** Update a research doc in place, bumping `version`; `baseVersion` mismatch is a conflict. */
export async function writeResearchDoc(
  input: WriteResearchDocInput,
  root = projectRoot()
): Promise<ResearchDocRecord> {
  const current = await readResearchDocById(input.id, root);
  const fm = current.frontmatter;
  if (typeof input.baseVersion === "number" && input.baseVersion !== fm.version) {
    throw new Error(
      `version conflict: doc ${input.id} is at v${fm.version}, write expected v${input.baseVersion}`
    );
  }
  const dependsOn = input.dependsOn ?? fm.dependsOn;
  const basedOn = input.basedOn ?? fm.basedOn;
  assertSameStudy(slugOfStudyId(fm.studyId), dependsOn, basedOn);
  assertFindingsKind(fm.kind, input.findings);
  const updated: ResearchDocFrontmatter = ResearchDocFrontmatterSchema.parse({
    ...fm,
    title: input.title ?? fm.title,
    generatedBy: input.generatedBy ?? fm.generatedBy,
    dependsOn,
    basedOn,
    ...(input.findings !== undefined ? { findings: input.findings } : {}),
    version: fm.version + 1,
    updatedAt: nowIso(),
  });
  const body = input.body !== undefined ? prepareBody(fm.kind, input.body) : current.body;
  await writeDoc(current.filePath, updated, body, ResearchDocFrontmatterSchema);
  events.emit({
    type: "research.updated",
    documentId: updated.id,
    studyId: updated.studyId,
    version: updated.version,
  });
  return { frontmatter: updated, body, filePath: current.filePath };
}

// ---- Ordering gates and computed flags (Arch §ordering-gates-and-computed-flags) ----

export type ResearchStep = ResearchKind | "findings" | "handoff";

/** Step order shared by the step rail and `nextResearchStep`. */
export const RESEARCH_STEPS: ResearchStep[] = [
  "market",
  "concepts",
  "user-research",
  "marketing",
  "findings",
  "strategy",
  "handoff",
];

export interface BuildItem {
  rank: number;
  itemId: string;
  title: string;
  rationale: string;
}

const BUILD_ITEM_RE = /^\s*\d+\.\s+\[(S\d+)\]\s+(.*)$/;

/** Parse one `1. [S<n>] **<title>** — <rationale>` line; null when it has no `S<n>` id. */
function parseBuildLine(line: string): Omit<BuildItem, "rank"> | null {
  const m = line.match(BUILD_ITEM_RE);
  if (!m) return null;
  const rest = m[2]!.trim();
  const dash = rest.indexOf(" — ");
  const head = dash >= 0 ? rest.slice(0, dash) : rest;
  const rationale = dash >= 0 ? rest.slice(dash + 3).trim() : "";
  const bold = head.match(/\*\*(.+?)\*\*/);
  return { itemId: m[1]!, title: (bold ? bold[1]! : head).trim(), rationale };
}

/** Build items from the strategy body's `## What to build` ordered list, ranked by position. */
export function parseBuildList(body: string): BuildItem[] {
  const headings = indexHeadings(body);
  const i = headings.findIndex((h) => h.slug === "what-to-build");
  if (i < 0) return [];
  const next = headings.slice(i + 1).find((h) => h.level <= headings[i]!.level);
  const section = body.slice(headings[i]!.start, next ? next.start : body.length);
  const items: BuildItem[] = [];
  for (const line of section.split("\n")) {
    const item = parseBuildLine(line);
    if (item) items.push({ rank: items.length + 1, ...item });
  }
  return items;
}

/** `dependsOn` ids whose current version is ahead of the version recorded in `basedOn`. */
export function outdatedUpstreams(
  doc: ResearchDocRecord,
  studyDocs: ResearchDocRecord[]
): string[] {
  const { dependsOn, basedOn } = doc.frontmatter;
  return dependsOn.filter((id) => {
    const upstream = studyDocs.find((d) => d.frontmatter.id === id);
    return upstream !== undefined && upstream.frontmatter.version > (basedOn[id] ?? 0);
  });
}

const NOTE_EXTENSIONS = new Set([".md", ".txt", ".pdf"]);

/** Note files (`.md`/`.txt`/`.pdf`) in the study's `notes/` not yet listed in user-research `findings`. */
export async function newNotes(
  study: Study,
  studyDocs: ResearchDocRecord[],
  root = projectRoot()
): Promise<string[]> {
  const ur = studyDocs.find((d) => d.frontmatter.kind === "user-research");
  const ingested = new Set(ur?.frontmatter.findings ?? []);
  const files = await fs.readdir(studyNotesDir(study.slug, root)).catch(() => [] as string[]);
  return files
    .filter((f) => NOTE_EXTENSIONS.has(path.extname(f).toLowerCase()) && !ingested.has(f))
    .sort();
}

/** Everything the gates and flags are computed from, read once per study. */
export interface StudyState {
  study: Study;
  docs: ResearchDocRecord[];
  newNotes: string[];
  buildList: BuildItem[];
  handedOff: string[];
}

/** Read a study's docs, notes, build list and handed-off feature ids. */
export async function readStudyState(studyId: string, root = projectRoot()): Promise<StudyState> {
  const study = await readStudy(slugOfStudyId(studyId), root);
  const docs = await listResearchDocs(study.id, root);
  const strategy = docs.find((d) => d.frontmatter.kind === "strategy");
  const features = await listFeatures(root);
  return {
    study,
    docs,
    newNotes: await newNotes(study, docs, root),
    buildList: strategy ? parseBuildList(strategy.body) : [],
    handedOff: features.filter((f) => f.origin?.studyId === study.id).map((f) => f.id),
  };
}

export interface GateResult {
  ok: boolean;
  reason?: string;
}

/** Gate for one step against an already-read study state. */
function gateFor(step: ResearchStep, state: StudyState): GateResult {
  const doc = (kind: ResearchKind) => state.docs.find((d) => d.frontmatter.kind === kind);
  switch (step) {
    case "market":
      return { ok: true };
    case "concepts":
    case "user-research":
    case "marketing":
      return doc("market") ? { ok: true } : { ok: false, reason: "needs market research first" };
    case "findings":
      return doc("user-research")
        ? { ok: true }
        : { ok: false, reason: "needs the user-research plan first" };
    case "strategy":
      return (doc("user-research")?.frontmatter.findings?.length ?? 0) > 0
        ? { ok: true }
        : { ok: false, reason: "needs user-research findings first" };
    case "handoff":
      if (!doc("strategy")) return { ok: false, reason: "needs strategy first" };
      return state.buildList.length > 0 ? { ok: true } : { ok: false, reason: "no build items" };
  }
}

/** Core ordering gate called by `createResearchDoc` and the handoff. */
export async function checkResearchStep(
  studyId: string,
  step: ResearchKind | "handoff",
  root = projectRoot()
): Promise<GateResult> {
  return gateFor(step, await readStudyState(studyId, root));
}

export type StepState = "done" | "next" | "flag" | "open" | "locked";

export interface StepStatus {
  step: ResearchStep;
  state: StepState;
  reason?: string;
}

/** Whether a step's work exists (flags aside). */
function isDone(step: ResearchStep, state: StudyState): boolean {
  if (step === "handoff") return state.handedOff.length > 0;
  if (step === "findings") {
    const ur = state.docs.find((d) => d.frontmatter.kind === "user-research");
    return (ur?.frontmatter.findings?.length ?? 0) > 0 && state.newNotes.length === 0;
  }
  return state.docs.some((d) => d.frontmatter.kind === step);
}

/**
 * Per-step rail state. The first unfinished step is `next` (or `locked` when its gate is
 * closed); later unfinished steps are `open` or `locked`; a done doc behind its upstreams is `flag`.
 */
export function researchSteps(state: StudyState): StepStatus[] {
  let nextTaken = false;
  return RESEARCH_STEPS.map((step): StepStatus => {
    if (isDone(step, state)) {
      const doc = state.docs.find((d) => d.frontmatter.kind === step);
      const outdated = doc ? outdatedUpstreams(doc, state.docs) : [];
      return outdated.length > 0
        ? { step, state: "flag", reason: `behind ${outdated.join(", ")}` }
        : { step, state: "done" };
    }
    const gate = gateFor(step, state);
    const first = !nextTaken;
    nextTaken = true;
    if (!gate.ok) return { step, state: "locked", reason: gate.reason };
    return { step, state: first ? "next" : "open" };
  });
}

/** First unfinished step in rail order, or null when every step is done; derived from `researchSteps`. */
export function nextResearchStep(steps: StepStatus[]): ResearchStep | null {
  return steps.find((s) => s.state !== "done" && s.state !== "flag")?.step ?? null;
}

// ---- Handoff to Builder (Arch §handoff-to-builder) ----

export interface HandoffResult {
  created: Feature[];
  skipped: { itemId: string; featureId: string }[];
}

/**
 * Create one Builder feature per requested build item, recording `origin` on `feature.json`.
 * Idempotent per `(origin.studyId, origin.itemId)`: an item already handed off is skipped.
 */
export async function handoffStudyItems(
  input: { studyId: string; itemIds: string[] },
  root = projectRoot()
): Promise<HandoffResult> {
  const state = await readStudyState(input.studyId, root);
  const gate = gateFor("handoff", state);
  if (!gate.ok) throw new Error(`gate closed for handoff on ${input.studyId}: ${gate.reason}`);
  const strategy = state.docs.find((d) => d.frontmatter.kind === "strategy")!;
  const unknown = input.itemIds.filter((id) => !state.buildList.some((b) => b.itemId === id));
  if (unknown.length > 0) throw new Error(`unknown build item id(s): ${unknown.join(", ")}`);
  const features = await listFeatures(root);
  const result: HandoffResult = { created: [], skipped: [] };
  for (const itemId of input.itemIds) {
    const existing = features.find(
      (f) => f.origin?.studyId === state.study.id && f.origin.itemId === itemId
    );
    if (existing) {
      result.skipped.push({ itemId, featureId: existing.id });
      continue;
    }
    const item = state.buildList.find((b) => b.itemId === itemId)!;
    const feature = await createFeature(item.title, root, {
      origin: {
        studyId: state.study.id,
        strategyId: strategy.frontmatter.id,
        strategyVersion: strategy.frontmatter.version,
        rank: item.rank,
        itemId,
        item: item.title,
      },
    });
    features.push(feature);
    result.created.push(feature);
  }
  return result;
}
