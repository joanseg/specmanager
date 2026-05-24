import fs from "node:fs/promises";
import path from "node:path";
import { FeatureSchema } from "./types.js";
import { featureDir, featuresDir, projectRoot, specsDir, stageDir, STAGES } from "./paths.js";
import { featureId, nowIso, slugify } from "./ids.js";
import { events } from "./events.js";
async function ensureDir(p) {
    await fs.mkdir(p, { recursive: true });
}
export async function ensureSpecsRoot(root = projectRoot()) {
    await ensureDir(specsDir(root));
    await ensureDir(featuresDir(root));
}
export async function listFeatures(root = projectRoot()) {
    await ensureSpecsRoot(root);
    const slugs = await fs.readdir(featuresDir(root)).catch(() => []);
    const features = [];
    for (const slug of slugs) {
        const fpath = path.join(featureDir(slug, root), "feature.json");
        try {
            const raw = await fs.readFile(fpath, "utf8");
            features.push(FeatureSchema.parse(JSON.parse(raw)));
        }
        catch {
            // skip malformed entries
        }
    }
    features.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return features;
}
export async function readFeature(slug, root = projectRoot()) {
    const raw = await fs.readFile(path.join(featureDir(slug, root), "feature.json"), "utf8");
    return FeatureSchema.parse(JSON.parse(raw));
}
export async function findFeatureById(id, root = projectRoot()) {
    const list = await listFeatures(root);
    return list.find((f) => f.id === id) ?? null;
}
async function uniqueSlug(base, root) {
    let slug = base;
    let n = 2;
    while (true) {
        const exists = await fs
            .stat(featureDir(slug, root))
            .then(() => true)
            .catch(() => false);
        if (!exists)
            return slug;
        slug = `${base}-${n++}`;
    }
}
export async function createFeature(title, root = projectRoot()) {
    await ensureSpecsRoot(root);
    const base = slugify(title);
    const slug = await uniqueSlug(base, root);
    const dir = featureDir(slug, root);
    await ensureDir(dir);
    for (const s of STAGES)
        await ensureDir(stageDir(slug, s, root));
    const feature = {
        id: featureId(slug),
        slug,
        title,
        currentStage: "prd",
        createdAt: nowIso(),
    };
    await fs.writeFile(path.join(dir, "feature.json"), JSON.stringify(feature, null, 2), "utf8");
    events.emit({ type: "feature.created", featureId: feature.id });
    return feature;
}
//# sourceMappingURL=features.js.map