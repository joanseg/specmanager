import fs from "node:fs/promises";
import { manifestPath, projectRoot } from "./paths.js";
import { listFeatures } from "./features.js";
import { listDocuments } from "./documents.js";
import { listTasks } from "./tasks.js";
import { PhaseDescriptor, rollupPhases } from "./phases.js";
import { DEFAULT_PHASE } from "./types.js";

export interface PhaseManifestEntry extends PhaseDescriptor {
  walkthroughId: string | null;
  walkthroughStatus: "draft" | "approved" | null;
  walkthroughStale: boolean | null;
}

export interface Manifest {
  generatedAt: string;
  features: Array<{
    id: string;
    slug: string;
    title: string;
    currentStage: string;
    documents: Array<{
      id: string;
      stage: string;
      status: string;
      stale: boolean;
      version: number;
      title: string;
      phase?: string;
    }>;
    tasks: { todo: number; in_progress: number; done: number; total: number };
    phases: PhaseManifestEntry[];
  }>;
}

export async function buildManifest(root = projectRoot()): Promise<Manifest> {
  const features = await listFeatures(root);
  const out: Manifest = { generatedAt: new Date().toISOString(), features: [] };
  for (const f of features) {
    const docs = await listDocuments({ featureId: f.id }, root);
    const tasks = await listTasks(f.id, root);
    const counts = { todo: 0, in_progress: 0, done: 0, total: tasks.length };
    for (const t of tasks) counts[t.status]++;
    const phaseRollup = rollupPhases(tasks);
    // Map phase-name → walkthrough doc (if one exists for that phase).
    const walkthroughByPhase = new Map<
      string,
      { id: string; status: "draft" | "approved"; stale: boolean }
    >();
    for (const d of docs) {
      if (d.frontmatter.stage !== "walkthrough") continue;
      const phase = d.frontmatter.phase ?? DEFAULT_PHASE;
      walkthroughByPhase.set(phase, {
        id: d.frontmatter.id,
        status: d.frontmatter.status,
        stale: d.frontmatter.stale,
      });
    }
    const phases: PhaseManifestEntry[] = phaseRollup.map((p) => {
      const wt = walkthroughByPhase.get(p.name) ?? null;
      return {
        ...p,
        walkthroughId: wt?.id ?? null,
        walkthroughStatus: wt?.status ?? null,
        walkthroughStale: wt ? wt.stale : null,
      };
    });
    out.features.push({
      id: f.id,
      slug: f.slug,
      title: f.title,
      currentStage: f.currentStage,
      documents: docs.map((d) => ({
        id: d.frontmatter.id,
        stage: d.frontmatter.stage,
        status: d.frontmatter.status,
        stale: d.frontmatter.stale,
        version: d.frontmatter.version,
        title: d.frontmatter.title,
        ...(d.frontmatter.phase ? { phase: d.frontmatter.phase } : {}),
      })),
      tasks: counts,
      phases,
    });
  }
  return out;
}

export async function writeManifest(root = projectRoot()): Promise<Manifest> {
  const m = await buildManifest(root);
  await fs.writeFile(manifestPath(root), JSON.stringify(m, null, 2), "utf8");
  return m;
}
