import fs from "node:fs/promises";
import path from "node:path";
import { Study, StudySchema } from "./types.js";
import { projectRoot, researchDir, studyDir, studyNotesDir } from "./paths.js";
import { nowIso, slugify } from "./ids.js";
import { ensureSpecsRoot, uniqueSlug } from "./features.js";
import { events } from "./events.js";

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
