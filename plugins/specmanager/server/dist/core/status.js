import { listDocuments, readDocumentById } from "./documents.js";
import { writeDoc } from "./frontmatter.js";
import { events } from "./events.js";
import { nowIso } from "./ids.js";
import { projectRoot } from "./paths.js";
export async function setStatus(id, next, root = projectRoot()) {
    const doc = await readDocumentById(id, root);
    const prev = doc.frontmatter.status;
    if (prev === next)
        return doc;
    const updated = {
        ...doc.frontmatter,
        status: next,
        updatedAt: nowIso(),
    };
    // Approving a doc clears its own stale flag — the human has signed off on it as-is.
    if (next === "approved")
        updated.stale = false;
    await writeDoc(doc.filePath, updated, doc.body);
    events.emit({ type: "status.changed", documentId: id, from: prev, to: next });
    if (next === "approved" && doc.frontmatter.stale) {
        events.emit({ type: "stale.cleared", documentId: id });
    }
    // feature.shipped — fired exactly once when the final-phase walkthrough is
    // approved. The MCP server's auto-sync listener uses this to refresh
    // ./docs/DESIGN.md so the system-level design spec stays current.
    if (next === "approved" &&
        doc.frontmatter.stage === "walkthrough" &&
        doc.frontmatter.phase === "final") {
        events.emit({ type: "feature.shipped", featureId: doc.frontmatter.featureId });
    }
    if (prev === "approved" && next === "draft") {
        await propagateStale(id, `${id} reopened`, root);
    }
    return { ...doc, frontmatter: updated };
}
export async function propagateStale(upstreamId, cause, root = projectRoot()) {
    const all = await listDocuments({}, root);
    const flagged = [];
    const queue = [upstreamId];
    const seen = new Set();
    while (queue.length > 0) {
        const cur = queue.shift();
        for (const d of all) {
            if (d.frontmatter.dependsOn.includes(cur) && !seen.has(d.frontmatter.id)) {
                seen.add(d.frontmatter.id);
                if (!d.frontmatter.stale) {
                    const updated = { ...d.frontmatter, stale: true, updatedAt: nowIso() };
                    await writeDoc(d.filePath, updated, d.body);
                    flagged.push(d.frontmatter.id);
                    events.emit({ type: "stale.flagged", documentId: d.frontmatter.id, cause });
                }
                queue.push(d.frontmatter.id);
            }
        }
    }
    return flagged;
}
//# sourceMappingURL=status.js.map