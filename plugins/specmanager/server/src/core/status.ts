import { DocFrontmatter, DocStatus, DocumentRecord } from "./types.js";
import { listDocuments, readDocumentById } from "./documents.js";
import { writeDoc } from "./frontmatter.js";
import { events } from "./events.js";
import { nowIso } from "./ids.js";
import { projectRoot } from "./paths.js";
import { listPhases } from "./phases.js";
import { isFeatureShipped } from "./shipped.js";

export async function setStatus(
  id: string,
  next: DocStatus,
  root = projectRoot()
): Promise<DocumentRecord> {
  const doc = await readDocumentById(id, root);
  const prev = doc.frontmatter.status;
  if (prev === next) return doc;

  const updated: DocFrontmatter = {
    ...doc.frontmatter,
    status: next,
    updatedAt: nowIso(),
  };
  // Approving a doc clears its own stale flag — the human has signed off on it as-is.
  if (next === "approved") updated.stale = false;
  await writeDoc(doc.filePath, updated, doc.body);
  events.emit({ type: "status.changed", documentId: id, from: prev, to: next });
  if (next === "approved" && doc.frontmatter.stale) {
    events.emit({ type: "stale.cleared", documentId: id });
  }

  // feature.shipped — fired when the feature's terminal walkthrough is approved:
  // the "final" roll-up for multi-phase features, OR (single-phase shortcut) the
  // only phase's walkthrough, so a one-phase feature need not draft a redundant
  // "final". The MCP server's auto-sync listener uses this to refresh
  // ./docs/DESIGN.md. Shipped detection in claude-md.ts shares isFeatureShipped.
  if (next === "approved" && doc.frontmatter.stage === "walkthrough") {
    const featureId = doc.frontmatter.featureId;
    const [docs, phases] = await Promise.all([
      listDocuments({ featureId }, root),
      listPhases(featureId, root),
    ]);
    if (isFeatureShipped(docs.map((d) => d.frontmatter), phases)) {
      events.emit({ type: "feature.shipped", featureId });
    }
  }

  if (prev === "approved" && next === "draft") {
    await propagateStale(id, `${id} reopened`, root);
  }

  return { ...doc, frontmatter: updated };
}

export async function propagateStale(
  upstreamId: string,
  cause: string,
  root = projectRoot()
): Promise<string[]> {
  const all = await listDocuments({}, root);
  const flagged: string[] = [];
  const queue: string[] = [upstreamId];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const cur = queue.shift()!;
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
