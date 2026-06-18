import { projectRoot } from "./paths.js";
import { listPhases } from "./phases.js";
import { listDocuments } from "./documents.js";
import { DEFAULT_PHASE } from "./types.js";

/**
 * Deterministic "is this phase done and does it still need a walkthrough?"
 * predicate, queried by the build command after the builder returns *or* errors
 * so the post-phase pipeline never depends on the builder Task's exit path.
 * A pure read composing existing core — no new schema, no mutation.
 */
export interface PhaseCompletion {
  phase: string;
  taskCount: number;
  doneCount: number;
  complete: boolean; // every phase task status === "done"
  hasWalkthrough: boolean; // a walkthrough doc (draft|approved) exists for this phase
  needsWalkthrough: boolean; // complete && !hasWalkthrough
  isSinglePhase: boolean; // feature has exactly one phase (drives single-phase suppression)
}

export async function getPhaseCompletion(
  featureId: string,
  phase: string,
  root = projectRoot()
): Promise<PhaseCompletion | null> {
  const phases = await listPhases(featureId, root);
  const desc = phases.find((p) => p.name === phase);
  if (!desc) return null; // unknown phase name

  const walkthroughs = await listDocuments({ featureId, stage: "walkthrough" }, root);
  const hasWalkthrough = walkthroughs.some(
    (d) => (d.frontmatter.phase ?? DEFAULT_PHASE) === phase
  );
  const complete = desc.doneCount === desc.taskCount && desc.taskCount > 0;

  return {
    phase,
    taskCount: desc.taskCount,
    doneCount: desc.doneCount,
    complete,
    hasWalkthrough,
    needsWalkthrough: complete && !hasWalkthrough,
    isSinglePhase: phases.length === 1,
  };
}
