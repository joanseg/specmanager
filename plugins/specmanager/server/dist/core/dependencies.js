import { DEFAULT_PHASE } from "./types.js";
import { listDocuments, readDocumentById } from "./documents.js";
import { writeDoc } from "./frontmatter.js";
import { nowIso } from "./ids.js";
import { projectRoot } from "./paths.js";
import { listTasks } from "./tasks.js";
export async function linkDocuments(downstreamId, upstreamId, root = projectRoot()) {
    const downstream = await readDocumentById(downstreamId, root);
    const upstream = await readDocumentById(upstreamId, root);
    const updated = {
        ...downstream.frontmatter,
        dependsOn: Array.from(new Set([...downstream.frontmatter.dependsOn, upstreamId])),
        basedOn: { ...downstream.frontmatter.basedOn, [upstreamId]: upstream.frontmatter.version },
        updatedAt: nowIso(),
    };
    await writeDoc(downstream.filePath, updated, downstream.body);
    return { ...downstream, frontmatter: updated };
}
const PRIOR_STAGE = {
    architecture: "prd",
    plan: "architecture",
};
export async function checkGate(featureId, stage, rootOrOpts, optsArg) {
    let resolvedRoot;
    let opts;
    if (typeof rootOrOpts === "string") {
        resolvedRoot = rootOrOpts;
        opts = optsArg;
    }
    else if (rootOrOpts) {
        opts = rootOrOpts;
    }
    if (!resolvedRoot)
        resolvedRoot = projectRoot();
    const phase = opts?.phase;
    if (stage === "prd")
        return { ok: true };
    if (stage === "walkthrough") {
        const targetPhase = phase ?? DEFAULT_PHASE;
        // The "final" sentinel is reserved for Phase 7.C — opens only when every
        // phase walkthrough is approved. Until 7.C ships, refuse.
        if (targetPhase === "final") {
            return {
                ok: false,
                reason: "final walkthrough is reserved for Phase 7.C and not yet available",
            };
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
    const prior = PRIOR_STAGE[stage];
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
export async function listStale(root = projectRoot()) {
    return listDocuments({ stale: true }, root);
}
//# sourceMappingURL=dependencies.js.map