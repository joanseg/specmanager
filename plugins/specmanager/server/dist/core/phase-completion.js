import { projectRoot } from "./paths.js";
import { listPhases } from "./phases.js";
import { listDocuments } from "./documents.js";
import { DEFAULT_PHASE } from "./types.js";
export async function getPhaseCompletion(featureId, phase, root = projectRoot()) {
    const phases = await listPhases(featureId, root);
    const desc = phases.find((p) => p.name === phase);
    if (!desc)
        return null; // unknown phase name
    const walkthroughs = await listDocuments({ featureId, stage: "walkthrough" }, root);
    const hasWalkthrough = walkthroughs.some((d) => (d.frontmatter.phase ?? DEFAULT_PHASE) === phase);
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
//# sourceMappingURL=phase-completion.js.map