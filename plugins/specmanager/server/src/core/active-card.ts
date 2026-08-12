// R1 — marker-first active-card resolution, shared by the Stop-gate hook so
// discovery lives in core (TS), not bash heuristics. Resolution is pinned to the
// explicit active-build marker (`.cache/active-build.json`) written by
// /specmanager-build: no marker ⇒ no build in flight ⇒ return null (the gate is
// a no-op pass). The marker carries {featureId, phase}, so the gate can only ever
// target the phase the build is actually on — never an unrelated feature with
// open tasks. Returns the active phase's verification target (meta.testCommand
// primary, plan.md **Exit test:** line as fallback). Never invents a failure.

import fs from "node:fs/promises";
import { projectRoot } from "./paths.js";
import { findFeatureById } from "./features.js";
import { listTasks, readTasksMeta } from "./tasks.js";
import { listDocuments } from "./documents.js";
import { readActiveBuild, clearActiveBuild } from "./active-build.js";
import { matchPhaseHeading } from "./spec-slice.js";

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
    const heading = matchPhaseHeading(line);
    if (heading !== null) {
      inPhase = heading.toLowerCase() === phase.toLowerCase();
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
 * Resolve the active card from the explicit active-build marker. No marker ⇒
 * null (no build in flight). The marker pins resolution to one {featureId,
 * phase}; a stale/finished marker (pinned phase with no open tasks) or a marker
 * for a deleted feature is cleared and resolves to null. Never enumerates other
 * features, so an unrelated feature with open tasks can never trigger the gate.
 */
export async function resolveActiveCard(root = projectRoot()): Promise<ActiveCard | null> {
  const marker = await readActiveBuild(root);
  if (!marker) return null; // no build in flight ⇒ the gate is a no-op pass

  const feature = await findFeatureById(marker.featureId, root);
  if (!feature) {
    // Marker points at a deleted feature ⇒ stale; clear it and no-op.
    await clearActiveBuild(root);
    return null;
  }

  const tasks = await listTasks(feature.id, root);
  const phaseTasks = tasks.filter((t) => t.phase === marker.phase);
  const openTaskIds = phaseTasks.filter((t) => t.status !== "done").map((t) => t.id);

  // False-in-flight guard: the pinned phase has no open tasks (finished, or a
  // crash-stale marker) ⇒ clear the marker and no-op. The gate never fires for a
  // completed or empty phase.
  if (openTaskIds.length === 0) {
    await clearActiveBuild(root);
    return null;
  }

  const meta = await readTasksMeta(feature.id, root);
  const phaseMeta = meta.phases[marker.phase];
  const testCommand = phaseMeta?.testCommand ?? null;
  const architectureRefs = phaseMeta?.architectureRefs ?? [];

  let exitTest: string | null = null;
  const planDocs = await listDocuments({ featureId: feature.id, stage: "plan" }, root);
  const planDoc = planDocs[0];
  if (planDoc) {
    try {
      const raw = await fs.readFile(planDoc.filePath, "utf8");
      exitTest = exitTestForPhase(raw, marker.phase);
    } catch {
      // plan body unreadable ⇒ no fallback exit-test line
    }
  }

  return {
    featureId: feature.id,
    slug: feature.slug,
    phase: marker.phase,
    testCommand,
    exitTest,
    architectureRefs,
    openTaskIds,
  };
}
