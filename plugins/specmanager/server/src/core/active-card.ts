// R1 — deterministic active-card resolution, shared by the Stop-gate hook so
// discovery lives in core (TS), not bash heuristics. Resolves the feature whose
// plan still has open tasks, its active phase (first phase ≠ done/empty), and
// that phase's verification target (meta.testCommand primary, plan.md
// **Exit test:** line as fallback). Returns null when nothing is in flight ⇒
// the gate is a no-op pass (never invents a failure).

import fs from "node:fs/promises";
import { projectRoot } from "./paths.js";
import { listFeatures } from "./features.js";
import { listTasks, readTasksMeta } from "./tasks.js";
import { getNextPhase } from "./phases.js";
import { listDocuments } from "./documents.js";

export interface ActiveCard {
  featureId: string;
  slug: string;
  phase: string;
  /** Active phase's meta.testCommand: a command | "none" | null (absent ⇒ fallback). */
  testCommand: string | null;
  /** plan.md **Exit test:** line for the active phase — fallback only. */
  exitTest: string | null;
  /** Architecture anchors the active phase implements (R3 slice assembly). */
  architectureRefs: string[];
  openTaskIds: string[];
}

/** Extract the `**Exit test:**` line for a phase section from plan.md body. */
function exitTestForPhase(planBody: string, phase: string): string | null {
  const lines = planBody.split("\n");
  let inPhase = false;
  for (const line of lines) {
    const heading = line.match(/^##\s+Phase\s+([^\s—-]+)/i);
    if (heading) {
      inPhase = heading[1]!.toLowerCase() === phase.toLowerCase();
      continue;
    }
    if (inPhase) {
      const m = line.match(/\*\*Exit test:\*\*\s*(.+)/i);
      if (m) return m[1]!.trim();
    }
  }
  return null;
}

/**
 * Resolve the active card across the project: the first feature whose plan has
 * open (non-done) tasks, plus that feature's active phase + verification target.
 */
export async function resolveActiveCard(root = projectRoot()): Promise<ActiveCard | null> {
  const features = await listFeatures(root);
  for (const feature of features) {
    const tasks = await listTasks(feature.id, root);
    if (tasks.length === 0) continue;
    const phase = await getNextPhase(feature.id, root);
    if (!phase) continue; // every phase done ⇒ nothing in flight for this feature

    const phaseTasks = tasks.filter((t) => t.phase === phase.name);
    const openTaskIds = phaseTasks.filter((t) => t.status !== "done").map((t) => t.id);

    const meta = await readTasksMeta(feature.id, root);
    const phaseMeta = meta.phases[phase.name];
    const testCommand = phaseMeta?.testCommand ?? null;
    const architectureRefs = phaseMeta?.architectureRefs ?? [];

    let exitTest: string | null = null;
    const planDocs = await listDocuments({ featureId: feature.id, stage: "plan" }, root);
    const planDoc = planDocs[0];
    if (planDoc) {
      try {
        const raw = await fs.readFile(planDoc.filePath, "utf8");
        exitTest = exitTestForPhase(raw, phase.name);
      } catch {
        // plan body unreadable ⇒ no fallback exit-test line
      }
    }

    return {
      featureId: feature.id,
      slug: feature.slug,
      phase: phase.name,
      testCommand,
      exitTest,
      architectureRefs,
      openTaskIds,
    };
  }
  return null;
}
