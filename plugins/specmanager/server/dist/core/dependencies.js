import { DEFAULT_PHASE } from "./types.js";
import { listDocuments, readDocumentById } from "./documents.js";
import { writeDoc } from "./frontmatter.js";
import { nowIso } from "./ids.js";
import { projectRoot } from "./paths.js";
import { listTasks } from "./tasks.js";
import { rollupPhases } from "./phases.js";
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
// Each stage's primary upstream — used by the simple gate path.
// Plan's gate is compound (architecture approved AND no draft design): handled in checkGate
// below rather than via this map. The map keeps the literal "<prior> stage is not approved"
// reason string Phase 3's UI banners parse — so Plan's compound gate adds, never replaces,
// the basic prior-stage check.
const PRIOR_STAGE = {
    architecture: "prd",
    design: "prd",
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
        // The "final" sentinel is the feature-level roll-up walkthrough. It opens
        // only when every phase has an `approved` walkthrough.
        if (targetPhase === "final") {
            const allTasks = await listTasks(featureId, resolvedRoot);
            const phases = rollupPhases(allTasks);
            if (phases.length === 0) {
                return { ok: false, reason: "no phases discovered — Build hasn't started" };
            }
            const wts = await listDocuments({ featureId, stage: "walkthrough" }, resolvedRoot);
            const approvedByPhase = new Set(wts
                .filter((d) => d.frontmatter.status === "approved")
                .map((d) => d.frontmatter.phase ?? DEFAULT_PHASE));
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
    const prior = PRIOR_STAGE[stage];
    const allDocs = await listDocuments({ featureId, stage: prior }, resolvedRoot);
    // Interviews live inside the prd stage but are not lifecycle documents:
    // an approved interview must never open the Architecture/Design gates,
    // and an interview alone must not satisfy the "a prd doc exists" check.
    const docs = allDocs.filter((d) => d.frontmatter.kind !== "interview");
    if (docs.length === 0) {
        return { ok: false, reason: `no ${prior} document for feature ${featureId}` };
    }
    const approved = docs.find((d) => d.frontmatter.status === "approved");
    if (!approved) {
        return { ok: false, reason: `${prior} stage is not approved` };
    }
    // Plan's gate is compound: architecture approved (already checked above) AND
    // (no design doc exists OR design approved). Design is optional — if no design
    // doc exists for the feature, Plan still opens.
    if (stage === "plan") {
        const designs = await listDocuments({ featureId, stage: "design" }, resolvedRoot);
        if (designs.length > 0) {
            const designApproved = designs.find((d) => d.frontmatter.status === "approved");
            if (!designApproved) {
                return {
                    ok: false,
                    reason: "design stage is not approved (design is optional — delete the draft to skip)",
                };
            }
        }
    }
    return { ok: true };
}
export async function listStale(root = projectRoot()) {
    return listDocuments({ stale: true }, root);
}
//# sourceMappingURL=dependencies.js.map