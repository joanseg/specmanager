import { DocFrontmatter, DocumentRecord, Stage } from "./types.js";
import { listDocuments, readDocumentById } from "./documents.js";
import { writeDoc } from "./frontmatter.js";
import { nowIso } from "./ids.js";
import { projectRoot } from "./paths.js";
import { listTasks } from "./tasks.js";

export async function linkDocuments(
  downstreamId: string,
  upstreamId: string,
  root = projectRoot()
): Promise<DocumentRecord> {
  const downstream = await readDocumentById(downstreamId, root);
  const upstream = await readDocumentById(upstreamId, root);
  const updated: DocFrontmatter = {
    ...downstream.frontmatter,
    dependsOn: Array.from(new Set([...downstream.frontmatter.dependsOn, upstreamId])),
    basedOn: { ...downstream.frontmatter.basedOn, [upstreamId]: upstream.frontmatter.version },
    updatedAt: nowIso(),
  };
  await writeDoc(downstream.filePath, updated, downstream.body);
  return { ...downstream, frontmatter: updated };
}

export interface GateResult {
  ok: boolean;
  reason?: string;
}

const PRIOR_STAGE: Partial<Record<Stage, Stage>> = {
  architecture: "prd",
  plan: "architecture",
};

export async function checkGate(
  featureId: string,
  stage: Stage,
  root = projectRoot()
): Promise<GateResult> {
  if (stage === "prd") return { ok: true };
  if (stage === "walkthrough") {
    const tasks = await listTasks(featureId, root);
    if (tasks.length === 0) {
      return { ok: false, reason: "no tasks recorded — Build is not complete" };
    }
    const undone = tasks.filter((t) => t.status !== "done");
    if (undone.length > 0) {
      return {
        ok: false,
        reason: `${undone.length} task(s) not done: ${undone.map((t) => t.id).join(", ")}`,
      };
    }
    return { ok: true };
  }
  const prior = PRIOR_STAGE[stage]!;
  const docs = await listDocuments({ featureId, stage: prior }, root);
  if (docs.length === 0) {
    return { ok: false, reason: `no ${prior} document for feature ${featureId}` };
  }
  const approved = docs.find((d) => d.frontmatter.status === "approved");
  if (!approved) {
    return { ok: false, reason: `${prior} stage is not approved` };
  }
  return { ok: true };
}

export async function listStale(root = projectRoot()): Promise<DocumentRecord[]> {
  return listDocuments({ stale: true }, root);
}
