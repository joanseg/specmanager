import fs from "node:fs/promises";
import path from "node:path";
import {
  ResearchDocFrontmatter,
  ResearchDocFrontmatterSchema,
  ResearchDocRecord,
  ResearchKind,
  Study,
  StudySchema,
} from "./types.js";
import { projectRoot, researchDir, studyDir, studyNotesDir } from "./paths.js";
import { nowIso, slugify } from "./ids.js";
import { ensureSpecsRoot, uniqueSlug } from "./features.js";
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
