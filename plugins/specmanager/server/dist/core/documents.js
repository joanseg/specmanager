import fs from "node:fs/promises";
import path from "node:path";
import { projectRoot, stageDir, STAGES } from "./paths.js";
import { docId, nowIso } from "./ids.js";
import { readDoc, writeDoc } from "./frontmatter.js";
import { events } from "./events.js";
import { findFeatureById, listFeatures } from "./features.js";
const DEFAULT_FILENAMES = {
    prd: ["prd.md", "press-release.md"],
    architecture: ["architecture.md"],
    plan: ["plan.md"],
    walkthrough: [],
};
export async function listDocuments(filter = {}, root = projectRoot()) {
    const features = await listFeatures(root);
    const out = [];
    for (const f of features) {
        if (filter.featureId && f.id !== filter.featureId)
            continue;
        for (const stage of STAGES) {
            if (filter.stage && filter.stage !== stage)
                continue;
            const dir = stageDir(f.slug, stage, root);
            const entries = await fs.readdir(dir).catch(() => []);
            for (const name of entries) {
                if (!name.endsWith(".md"))
                    continue;
                const doc = await readDoc(path.join(dir, name));
                if (filter.status && doc.frontmatter.status !== filter.status)
                    continue;
                if (filter.stale !== undefined && doc.frontmatter.stale !== filter.stale)
                    continue;
                out.push(doc);
            }
        }
    }
    return out;
}
export async function readDocumentById(id, root = projectRoot()) {
    const all = await listDocuments({}, root);
    const hit = all.find((d) => d.frontmatter.id === id);
    if (!hit)
        throw new Error(`document not found: ${id}`);
    return hit;
}
function defaultFilename(stage, slug, title) {
    const defaults = DEFAULT_FILENAMES[stage];
    if (defaults.length > 0)
        return defaults[0];
    const t = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return `${t || slug}.md`;
}
async function nextDocSequence(stage, slug, root) {
    const existing = await listDocuments({ stage }, root);
    return existing.length + 1;
}
export async function createDocument(input, root = projectRoot()) {
    const feature = await findFeatureById(input.featureId, root);
    if (!feature)
        throw new Error(`feature not found: ${input.featureId}`);
    const dir = stageDir(feature.slug, input.stage, root);
    await fs.mkdir(dir, { recursive: true });
    const filename = input.filename ?? defaultFilename(input.stage, feature.slug, input.title);
    const filePath = path.join(dir, filename);
    const exists = await fs
        .stat(filePath)
        .then(() => true)
        .catch(() => false);
    if (exists)
        throw new Error(`document file already exists: ${filePath}`);
    const seq = await nextDocSequence(input.stage, feature.slug, root);
    const now = nowIso();
    const frontmatter = {
        id: docId(input.stage, feature.slug, seq),
        featureId: feature.id,
        stage: input.stage,
        status: "draft",
        stale: false,
        title: input.title,
        dependsOn: input.dependsOn ?? [],
        basedOn: input.basedOn ?? {},
        generatedBy: input.generatedBy ?? "human",
        version: 1,
        createdAt: now,
        updatedAt: now,
    };
    await writeDoc(filePath, frontmatter, input.body ?? "");
    events.emit({
        type: "document.created",
        documentId: frontmatter.id,
        featureId: feature.id,
    });
    return { frontmatter, body: input.body ?? "", filePath };
}
export async function writeDocument(input, root = projectRoot()) {
    const current = await readDocumentById(input.id, root);
    if (typeof input.baseVersion === "number" &&
        input.baseVersion !== current.frontmatter.version) {
        throw new Error(`version conflict: doc ${input.id} is at v${current.frontmatter.version}, write expected v${input.baseVersion}`);
    }
    const updated = {
        ...current.frontmatter,
        title: input.title ?? current.frontmatter.title,
        generatedBy: input.generatedBy ?? current.frontmatter.generatedBy,
        dependsOn: input.dependsOn ?? current.frontmatter.dependsOn,
        basedOn: input.basedOn ?? current.frontmatter.basedOn,
        version: current.frontmatter.version + 1,
        updatedAt: nowIso(),
    };
    const body = input.body ?? current.body;
    await writeDoc(current.filePath, updated, body);
    events.emit({
        type: "document.updated",
        documentId: updated.id,
        featureId: updated.featureId,
        version: updated.version,
    });
    return { frontmatter: updated, body, filePath: current.filePath };
}
//# sourceMappingURL=documents.js.map