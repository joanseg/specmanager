export function slugify(input) {
    return input
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "feature";
}
export function featureId(slug) {
    return `feat-${slug}`;
}
export function docId(stage, slug, n) {
    const prefix = {
        prd: "prd",
        architecture: "arch",
        plan: "plan",
        walkthrough: "wt",
    };
    const p = prefix[stage] ?? stage;
    return `${p}-${slug}-${String(n).padStart(3, "0")}`;
}
export function taskId(n) {
    return `task-${String(n).padStart(3, "0")}`;
}
export function nowIso() {
    return new Date().toISOString();
}
//# sourceMappingURL=ids.js.map