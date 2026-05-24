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
export async function checkGate(featureId, stage, root = projectRoot()) {
    if (stage === "prd")
        return { ok: true };
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
    const prior = PRIOR_STAGE[stage];
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
export async function listStale(root = projectRoot()) {
    return listDocuments({ stale: true }, root);
}
//# sourceMappingURL=dependencies.js.map