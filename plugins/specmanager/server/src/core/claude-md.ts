import fs from "node:fs/promises";
import { claudeMdPath, projectRoot } from "./paths.js";
import { buildManifest } from "./manifest.js";

const START = "<!-- specmanager:start -->";
const END = "<!-- specmanager:end -->";

/** Match a marker only when it stands alone on its own line, so markers
 * mentioned inline in prose (e.g. this project's own docs) are ignored. */
function lineMarkerRe(marker: string): RegExp {
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^[ \\t]*${escaped}[ \\t\\r]*$`, "m");
}

function stageLabel(stage: string): string {
  switch (stage) {
    case "prd":
      return "PRD";
    case "architecture":
      return "Architecture";
    case "design":
      return "Design";
    case "plan":
      return "Plan";
    case "walkthrough":
      return "Walkthroughs";
    default:
      return stage;
  }
}

function notesFor(f: {
  documents: Array<{ stage: string; status: string; stale: boolean }>;
  tasks: { todo: number; in_progress: number; done: number; total: number };
  currentStage: string;
  phases?: Array<{ name: string; status: string }>;
}): string {
  const stale = f.documents.filter((d) => d.stale).map((d) => stageLabel(d.stage));
  if (f.currentStage === "plan" && f.tasks.total > 0) {
    const phaseSummary =
      f.phases && f.phases.length > 1
        ? ` · phases ${f.phases.filter((p) => p.status === "done").length}/${f.phases.length}`
        : "";
    const note = `Build (${f.tasks.done}/${f.tasks.total} tasks done)${phaseSummary}`;
    return stale.length ? `${note} · ${stale.join(", ")} ⚠️ stale` : note;
  }
  if (stale.length) return `${stale.join(", ")} ⚠️ stale`;
  return "—";
}

function currentStageLabel(f: {
  currentStage: string;
  documents: Array<{ stage: string; status: string }>;
}): string {
  const doc = f.documents.find((d) => d.stage === f.currentStage);
  if (!doc) return stageLabel(f.currentStage);
  return `${stageLabel(f.currentStage)} (${doc.status})`;
}

export async function renderBlock(root = projectRoot()): Promise<string> {
  const m = await buildManifest(root);
  const lines: string[] = [];
  lines.push(START);
  lines.push("## Project lifecycle (managed by SpecManager — do not edit by hand)");
  lines.push("");
  lines.push(
    "Specs live in `.claude/specs/features/`. Read the approved doc for a feature's stage before implementing it."
  );
  lines.push("");
  if (m.features.length === 0) {
    lines.push("_No features yet. Run `/specmanager-prd \"<title>\"` to create one._");
  } else {
    lines.push("| Feature | Current stage | Notes |");
    lines.push("|---------|---------------|-------|");
    for (const f of m.features) {
      lines.push(`| ${f.title} | ${currentStageLabel(f)} | ${notesFor(f)} |`);
    }
  }
  lines.push("");
  lines.push(
    "**Rules:** don't start a feature's tasks until its Plan is approved; treat ⚠️ stale docs as needing reconciliation."
  );
  lines.push("");
  lines.push("**Commands:**");
  lines.push(
    "`/specmanager-prd` · `/specmanager-architecture` · `/specmanager-design` (optional) · `/specmanager-plan` · `/specmanager-build` · `/specmanager-walkthrough` · `/specmanager-board`"
  );
  lines.push("");
  lines.push(`_Last synced: ${m.generatedAt}_`);
  lines.push(END);
  return lines.join("\n");
}

export async function syncClaudeMd(root = projectRoot()): Promise<{ path: string; created: boolean }> {
  const file = claudeMdPath(root);
  const block = await renderBlock(root);
  let existing = "";
  let created = false;
  try {
    existing = await fs.readFile(file, "utf8");
  } catch {
    created = true;
  }
  let next: string;
  const startMatch = lineMarkerRe(START).exec(existing);
  const endMatch = lineMarkerRe(END).exec(existing);
  if (startMatch && endMatch && endMatch.index > startMatch.index) {
    const before = existing.slice(0, startMatch.index);
    const after = existing.slice(endMatch.index + endMatch[0].length);
    next = `${before}${block}${after}`;
  } else if (existing.trim().length === 0) {
    next = `${block}\n`;
  } else {
    next = `${block}\n\n${existing}`;
  }
  if (next !== existing) {
    await fs.writeFile(file, next, "utf8");
  }
  return { path: file, created };
}
