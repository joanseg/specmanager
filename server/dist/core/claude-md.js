import fs from "node:fs/promises";
import { claudeMdPath, projectRoot } from "./paths.js";
import { buildManifest } from "./manifest.js";
const START = "<!-- specmanager:start -->";
const END = "<!-- specmanager:end -->";
function stageLabel(stage) {
    switch (stage) {
        case "prd":
            return "PRD";
        case "architecture":
            return "Architecture";
        case "plan":
            return "Plan";
        case "walkthrough":
            return "Walkthroughs";
        default:
            return stage;
    }
}
function notesFor(f) {
    const stale = f.documents.filter((d) => d.stale).map((d) => stageLabel(d.stage));
    if (f.currentStage === "plan" && f.tasks.total > 0) {
        const note = `Build (${f.tasks.done}/${f.tasks.total} tasks done)`;
        return stale.length ? `${note} · ${stale.join(", ")} ⚠️ stale` : note;
    }
    if (stale.length)
        return `${stale.join(", ")} ⚠️ stale`;
    return "—";
}
function currentStageLabel(f) {
    const doc = f.documents.find((d) => d.stage === f.currentStage);
    if (!doc)
        return stageLabel(f.currentStage);
    return `${stageLabel(f.currentStage)} (${doc.status})`;
}
export async function renderBlock(root = projectRoot()) {
    const m = await buildManifest(root);
    const lines = [];
    lines.push(START);
    lines.push("## Project lifecycle (managed by SpecManager — do not edit by hand)");
    lines.push("");
    lines.push("Specs live in `.claude/specs/features/`. Read the approved doc for a feature's stage before implementing it.");
    lines.push("");
    if (m.features.length === 0) {
        lines.push("_No features yet. Run `/specmanager:feature \"<title>\"` to create one._");
    }
    else {
        lines.push("| Feature | Current stage | Notes |");
        lines.push("|---------|---------------|-------|");
        for (const f of m.features) {
            lines.push(`| ${f.title} | ${currentStageLabel(f)} | ${notesFor(f)} |`);
        }
    }
    lines.push("");
    lines.push("**Rules:** don't start a feature's tasks until its Plan is approved; treat ⚠️ stale docs as needing reconciliation.");
    lines.push("");
    lines.push(`_Last synced: ${m.generatedAt}_`);
    lines.push(END);
    return lines.join("\n");
}
export async function syncClaudeMd(root = projectRoot()) {
    const file = claudeMdPath(root);
    const block = await renderBlock(root);
    let existing = "";
    let created = false;
    try {
        existing = await fs.readFile(file, "utf8");
    }
    catch {
        created = true;
    }
    let next;
    const startIdx = existing.indexOf(START);
    const endIdx = existing.indexOf(END);
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        const before = existing.slice(0, startIdx);
        const after = existing.slice(endIdx + END.length);
        next = `${before}${block}${after}`;
    }
    else if (existing.trim().length === 0) {
        next = `${block}\n`;
    }
    else {
        next = `${block}\n\n${existing}`;
    }
    if (next !== existing) {
        await fs.writeFile(file, next, "utf8");
    }
    return { path: file, created };
}
//# sourceMappingURL=claude-md.js.map