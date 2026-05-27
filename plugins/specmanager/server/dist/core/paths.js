import path from "node:path";
export function projectRoot() {
    const root = process.env.SPECMANAGER_PROJECT_DIR ?? process.env.CLAUDE_PROJECT_DIR;
    if (!root) {
        throw new Error("SPECMANAGER_PROJECT_DIR (or CLAUDE_PROJECT_DIR) is not set — cannot locate .claude/specs/");
    }
    return path.resolve(root);
}
export function specsDir(root = projectRoot()) {
    return path.join(root, ".claude", "specs");
}
export function featuresDir(root = projectRoot()) {
    return path.join(specsDir(root), "features");
}
export function featureDir(slug, root = projectRoot()) {
    return path.join(featuresDir(root), slug);
}
export function manifestPath(root = projectRoot()) {
    return path.join(specsDir(root), "manifest.json");
}
export function claudeMdPath(root = projectRoot()) {
    return path.join(root, "CLAUDE.md");
}
export const STAGES = [
    "prd",
    "architecture",
    "design",
    "plan",
    "walkthrough",
];
export function stageDir(slug, stage, root = projectRoot()) {
    const map = {
        prd: "prd",
        architecture: "architecture",
        design: "design",
        plan: "plan",
        walkthrough: "walkthroughs",
    };
    return path.join(featureDir(slug, root), map[stage]);
}
//# sourceMappingURL=paths.js.map