import fs from "node:fs/promises";
import path from "node:path";
import { DEFAULT_PHASE } from "./types.js";
import { projectRoot, stageDir, STAGES } from "./paths.js";
import { docId, nowIso } from "./ids.js";
import { readDoc, writeDoc } from "./frontmatter.js";
import { events } from "./events.js";
import { findFeatureById, listFeatures } from "./features.js";
const DEFAULT_FILENAMES = {
    prd: ["prd.md", "press-release.md"],
    architecture: ["architecture.md"],
    design: ["mockups.html"],
    plan: ["plan.md"],
    walkthrough: [],
};
export const FINAL_PHASE = "final";
/**
 * Bodies for design briefs are HTML. If a line starting with `---` (which is
 * gray-matter's frontmatter delimiter) appears at column 0, the round-trip
 * read would treat everything below it as a second frontmatter block and lose
 * the body. Wrap any such leading `---` in an HTML comment to defang it.
 * Cheap, defensive — only touches `---` at column 0, leaves everything else.
 */
export function sanitizeDesignBriefBody(body) {
    return body.replace(/^---$/gm, "<!-- --- -->");
}
// High-fi stacked mockups with inline CSS for several screens are larger than a
// prose brief — 5MB headroom. Designers should still prefer CSS mockups over
// inlining large raster screenshots.
export const DESIGN_BRIEF_MAX_BYTES = 5 * 1024 * 1024;
function sanitizePhaseSegment(phase) {
    return (phase
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || DEFAULT_PHASE);
}
export function walkthroughFilename(phase) {
    if (phase === FINAL_PHASE)
        return "feature.md";
    return `phase-${sanitizePhaseSegment(phase)}.md`;
}
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
                // Doc files use gray-matter frontmatter; body can be markdown OR html
                // (design briefs are .html). We trust frontmatter as the source of truth.
                if (!name.endsWith(".md") && !name.endsWith(".html"))
                    continue;
                // A single malformed doc (e.g. an .html written without SpecManager
                // frontmatter) must never take down the whole board — skip + warn.
                let doc;
                try {
                    doc = await readDoc(path.join(dir, name));
                }
                catch (err) {
                    // eslint-disable-next-line no-console
                    console.error(`specmanager: skipping unparseable doc ${path.join(dir, name)}: ${err.message}`);
                    continue;
                }
                // Walkthroughs: legacy docs predating Phase 7.B have no `phase` field —
                // default to the synthetic "default" phase so check_gate keeps working.
                if (stage === "walkthrough" && !doc.frontmatter.phase) {
                    doc.frontmatter.phase = DEFAULT_PHASE;
                }
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
/**
 * One-time non-destructive migration: rename pre-Phase-7.B walkthrough files
 * (anything that isn't already `phase-*.md` or `feature.md`) to `phase-default.md`.
 * Also stamps `phase: "default"` into their frontmatter so reads round-trip.
 * Safe to run repeatedly — no-op once migrated.
 */
export async function migrateWalkthroughs(root = projectRoot()) {
    const features = await listFeatures(root);
    const migrated = [];
    for (const f of features) {
        const dir = stageDir(f.slug, "walkthrough", root);
        const entries = await fs.readdir(dir).catch(() => []);
        for (const name of entries) {
            if (!name.endsWith(".md"))
                continue;
            if (name === "feature.md" || name.startsWith("phase-"))
                continue;
            const oldPath = path.join(dir, name);
            const doc = await readDoc(oldPath);
            const newPath = path.join(dir, walkthroughFilename(DEFAULT_PHASE));
            const newExists = await fs
                .stat(newPath)
                .then(() => true)
                .catch(() => false);
            if (newExists)
                continue; // never overwrite
            const updated = {
                ...doc.frontmatter,
                phase: DEFAULT_PHASE,
                updatedAt: nowIso(),
            };
            await writeDoc(oldPath, updated, doc.body);
            await fs.rename(oldPath, newPath);
            migrated.push(newPath);
        }
    }
    return migrated;
}
export async function readDocumentById(id, root = projectRoot()) {
    const all = await listDocuments({}, root);
    const hit = all.find((d) => d.frontmatter.id === id);
    if (!hit)
        throw new Error(`document not found: ${id}`);
    return hit;
}
function defaultFilename(stage, slug, title, phase) {
    if (stage === "walkthrough") {
        return walkthroughFilename(phase ?? DEFAULT_PHASE);
    }
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
    const phase = input.stage === "walkthrough" ? input.phase ?? DEFAULT_PHASE : undefined;
    const filename = input.filename ?? defaultFilename(input.stage, feature.slug, input.title, phase);
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
        ...(phase !== undefined ? { phase } : {}),
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