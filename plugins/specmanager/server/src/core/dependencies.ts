import { DEFAULT_PHASE, DocFrontmatter, DocumentRecord, Stage } from "./types.js";
import { listDocuments, readDocumentById } from "./documents.js";
import { writeDoc } from "./frontmatter.js";
import { nowIso } from "./ids.js";
import { projectRoot } from "./paths.js";
import { listTasks } from "./tasks.js";
import { rollupPhases } from "./phases.js";

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

export interface CheckGateOptions {
  phase?: string;
}

export async function checkGate(
  featureId: string,
  stage: Stage,
  rootOrOpts?: string | CheckGateOptions,
  optsArg?: CheckGateOptions
): Promise<GateResult> {
  let resolvedRoot: string | undefined;
  let opts: CheckGateOptions | undefined;
  if (typeof rootOrOpts === "string") {
    resolvedRoot = rootOrOpts;
    opts = optsArg;
  } else if (rootOrOpts) {
    opts = rootOrOpts;
  }
  if (!resolvedRoot) resolvedRoot = projectRoot();
  const phase = opts?.phase;

  if (stage === "prd") return { ok: true };
  if (stage === "walkthrough") {
    const targetPhase = phase ?? DEFAULT_PHASE;
    // The "final" sentinel is the feature-level roll-up walkthrough. It opens
    // only when every phase has an `approved` walkthrough.
    if (targetPhase === "final") {
      const allTasks = await listTasks(featureId, resolvedRoot);
      const phases = rollupPhases(allTasks);
      if (phases.length === 0) {
        return { ok: false, reason: "no phases discovered — Build hasn't started" };
      }
      const wts = await listDocuments(
        { featureId, stage: "walkthrough" },
        resolvedRoot
      );
      const approvedByPhase = new Set(
        wts
          .filter((d) => d.frontmatter.status === "approved")
          .map((d) => d.frontmatter.phase ?? DEFAULT_PHASE)
      );
      const missing = phases
        .map((p) => p.name)
        .filter((name) => !approvedByPhase.has(name));
      if (missing.length > 0) {
        return {
          ok: false,
          reason: `phase walkthroughs not approved: ${missing.join(", ")}`,
        };
      }
      return { ok: true };
    }
    const tasks = await listTasks(featureId, resolvedRoot);
    if (tasks.length === 0) {
      return { ok: false, reason: "no tasks recorded — Build is not complete" };
    }
    const inPhase = tasks.filter((t) => (t.phase || DEFAULT_PHASE) === targetPhase);
    if (inPhase.length === 0) {
      return {
        ok: false,
        reason: `no tasks found in phase '${targetPhase}'`,
      };
    }
    const undone = inPhase.filter((t) => t.status !== "done");
    if (undone.length > 0) {
      return {
        ok: false,
        reason: `phase '${targetPhase}' has ${undone.length} task(s) not done: ${undone
          .map((t) => t.id)
          .join(", ")}`,
      };
    }
    return { ok: true };
  }
  const prior = PRIOR_STAGE[stage]!;
  const docs = await listDocuments({ featureId, stage: prior }, resolvedRoot);
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
