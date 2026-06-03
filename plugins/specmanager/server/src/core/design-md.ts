// Repo-level ./docs/DESIGN.md generator. Follows the Google Stitch DESIGN.md
// spec snapshot pinned at docs/references/stitch-design-md.md.
//
// Two layers:
//   1. YAML frontmatter — machine-readable design tokens.
//   2. Markdown body — 8 canonical sections with prose + token tables.
//
// We never overwrite hand-written content outside the managed markers:
//   <!-- specmanager:design:start -->
//   <!-- specmanager:design:end -->
// On first init they're appended at the bottom; on refresh we replace only the
// region between them.

import fs from "node:fs/promises";
import path from "node:path";
import { designMdPath, projectRoot } from "./paths.js";
import { events } from "./events.js";

const START = "<!-- specmanager:design:start -->";
const END = "<!-- specmanager:design:end -->";

export interface UiDigest {
  /** Directories that contain UI source (e.g. ["src/ui", "src/components"]). */
  uiDirs: string[];
  /** Up to N component files found (relative paths) — sample, not exhaustive. */
  componentSamples: string[];
  /** Count of likely-component files (TSX / JSX / Vue / Svelte) across uiDirs. */
  componentCount: number;
  /** Tailwind config(s) discovered (relative paths). */
  tailwindConfigs: string[];
  /** design-tokens.json / *.tokens.json files discovered (relative paths). */
  tokenFiles: string[];
  /** CSS custom properties harvested from *.css files (name → first value seen). */
  cssVars: Record<string, string>;
  /** Project name (for the YAML `name:` field) — derived from package.json or root dir. */
  projectName: string;
  /** Whether docs/ existed before the scan (used by walkthrough). */
  hadDocsDir: boolean;
}

const UI_DIR_CANDIDATES = [
  "src/ui",
  "src/components",
  "src",
  "app",
  "ui",
  "ui/src",
  "web",
  "frontend",
  "frontend/src",
  "client",
  "client/src",
  "packages/ui/src",
];

// Candidates generic enough that a nested match would wrongly catch a
// backend dir (e.g. server/src). We only trust these at the repo root; the
// UI-specific names are searched at any depth so monorepo / plugin layouts
// like plugins/specmanager/ui/src are found.
const ROOT_ONLY_CANDIDATES = new Set(["src", "app"]);

const COMPONENT_EXTENSIONS = [".tsx", ".jsx", ".vue", ".svelte"];
const MAX_SAMPLE = 8;
const MAX_DEPTH = 4;

async function exists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function readProjectName(root: string): Promise<string> {
  const pkg = path.join(root, "package.json");
  try {
    const raw = await fs.readFile(pkg, "utf8");
    const j = JSON.parse(raw) as { name?: string };
    if (typeof j.name === "string" && j.name.length > 0) return j.name;
  } catch {
    // fall through
  }
  return path.basename(root);
}

async function walkForComponents(
  start: string,
  rel: string,
  out: { samples: string[]; count: number },
  depth = 0
): Promise<void> {
  if (depth > MAX_DEPTH) return;
  let entries: { name: string; isDir: boolean }[] = [];
  try {
    const raw = await fs.readdir(start, { withFileTypes: true });
    entries = raw
      .filter((e) => !e.name.startsWith(".") && e.name !== "node_modules" && e.name !== "dist")
      .map((e) => ({ name: e.name, isDir: e.isDirectory() }));
  } catch {
    return;
  }
  for (const e of entries) {
    const child = path.join(start, e.name);
    const childRel = path.join(rel, e.name);
    if (e.isDir) {
      await walkForComponents(child, childRel, out, depth + 1);
    } else if (COMPONENT_EXTENSIONS.some((ext) => e.name.endsWith(ext))) {
      out.count++;
      if (out.samples.length < MAX_SAMPLE) out.samples.push(childRel);
    }
  }
}

async function harvestCssVars(
  start: string,
  out: Record<string, string>,
  depth = 0
): Promise<void> {
  if (depth > MAX_DEPTH) return;
  if (Object.keys(out).length > 64) return;
  let entries: { name: string; isDir: boolean }[] = [];
  try {
    const raw = await fs.readdir(start, { withFileTypes: true });
    entries = raw
      .filter((e) => !e.name.startsWith(".") && e.name !== "node_modules" && e.name !== "dist")
      .map((e) => ({ name: e.name, isDir: e.isDirectory() }));
  } catch {
    return;
  }
  for (const e of entries) {
    const child = path.join(start, e.name);
    if (e.isDir) {
      await harvestCssVars(child, out, depth + 1);
    } else if (e.name.endsWith(".css") || e.name.endsWith(".scss")) {
      try {
        const raw = await fs.readFile(child, "utf8");
        // Match lines like:   --foo-bar: #fff;  /* comment */
        const re = /^\s*--([\w-]+)\s*:\s*([^;]+?);/gm;
        let m;
        while ((m = re.exec(raw)) !== null) {
          const key = m[1]!;
          const value = m[2]!.trim();
          if (!(key in out)) out[key] = value;
          if (Object.keys(out).length > 64) return;
        }
      } catch {
        // skip unreadable files
      }
    }
  }
}

/** Non-ignored subdirectories under `start`, relative to it, up to MAX_DEPTH.
 * Used as base dirs so UI-specific candidates are found when nested (monorepos,
 * the plugin's own plugins/<name>/ui layout). */
async function collectSubdirs(
  start: string,
  rel = "",
  depth = 0,
  out: string[] = []
): Promise<string[]> {
  if (depth >= MAX_DEPTH) return out;
  let entries: { name: string; isDir: boolean }[] = [];
  try {
    const raw = await fs.readdir(start, { withFileTypes: true });
    entries = raw
      .filter((e) => e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules" && e.name !== "dist")
      .map((e) => ({ name: e.name, isDir: true }));
  } catch {
    return out;
  }
  for (const e of entries) {
    const childRel = rel ? path.join(rel, e.name) : e.name;
    out.push(childRel);
    await collectSubdirs(path.join(start, e.name), childRel, depth + 1, out);
  }
  return out;
}

export async function scanUiSources(root = projectRoot()): Promise<UiDigest> {
  const digest: UiDigest = {
    uiDirs: [],
    componentSamples: [],
    componentCount: 0,
    tailwindConfigs: [],
    tokenFiles: [],
    cssVars: {},
    projectName: await readProjectName(root),
    hadDocsDir: await exists(path.join(root, "docs")),
  };

  // Discover UI dirs: every candidate at the root, plus the UI-specific
  // candidates nested under any non-ignored subdirectory (bounded depth).
  for (const rel of UI_DIR_CANDIDATES) {
    if (await exists(path.join(root, rel))) digest.uiDirs.push(rel);
  }
  const nestedCandidates = UI_DIR_CANDIDATES.filter((c) => !ROOT_ONLY_CANDIDATES.has(c));
  for (const base of await collectSubdirs(root)) {
    for (const rel of nestedCandidates) {
      const abs = path.join(root, base, rel);
      if (await exists(abs)) digest.uiDirs.push(path.relative(root, abs));
    }
  }
  // Dedupe nested entries (keep the shallower one — it contains the rest).
  digest.uiDirs = dedupeNested(digest.uiDirs);

  // Components.
  const compAcc = { samples: [] as string[], count: 0 };
  for (const ui of digest.uiDirs) {
    await walkForComponents(path.join(root, ui), ui, compAcc);
  }
  digest.componentSamples = compAcc.samples;
  digest.componentCount = compAcc.count;

  // Tailwind configs (project root + typical UI subdirs).
  const tailwindCandidates = [
    "tailwind.config.js",
    "tailwind.config.ts",
    "tailwind.config.cjs",
    "tailwind.config.mjs",
  ];
  for (const c of tailwindCandidates) {
    if (await exists(path.join(root, c))) digest.tailwindConfigs.push(c);
  }

  // Token files.
  const tokenCandidates = [
    "design-tokens.json",
    "tokens.json",
    "src/design-tokens.json",
    "src/tokens.json",
  ];
  for (const c of tokenCandidates) {
    if (await exists(path.join(root, c))) digest.tokenFiles.push(c);
  }

  // CSS vars (only walk UI dirs to keep it bounded).
  for (const ui of digest.uiDirs) {
    await harvestCssVars(path.join(root, ui), digest.cssVars);
  }

  return digest;
}

function dedupeNested(dirs: string[]): string[] {
  const sorted = [...dirs].sort((a, b) => a.length - b.length);
  const out: string[] = [];
  for (const d of sorted) {
    if (!out.some((p) => d === p || d.startsWith(p + path.sep))) out.push(d);
  }
  return out;
}

// ─── Render ───────────────────────────────────────────────────────────────

function yamlBlock(digest: UiDigest): string {
  const lines: string[] = [];
  lines.push("---");
  lines.push("version: alpha");
  lines.push(`name: ${digest.projectName}`);
  lines.push(`description: "Auto-generated design system spec. Tokens inferred from ${digest.uiDirs.length} UI dir(s); fill in real values to harden."`);

  // Colors — try to pick out CSS vars that look like colors.
  const colorVars = Object.entries(digest.cssVars).filter(([, v]) =>
    /^(#[0-9a-fA-F]{3,8}|rgb|hsl|oklch|var\()/.test(v.trim())
  );
  lines.push("colors:");
  if (colorVars.length > 0) {
    for (const [k, v] of colorVars.slice(0, 12)) lines.push(`  ${safeKey(k)}: ${quote(v)}`);
  } else {
    lines.push('  primary: "#1A1C1E"     # TODO: replace with real brand color');
    lines.push('  neutral: "#F7F5F2"');
  }

  lines.push("typography:");
  lines.push("  body-md:");
  lines.push("    fontFamily: system-ui");
  lines.push("    fontSize: 16px");
  lines.push("    fontWeight: 400");
  lines.push("    lineHeight: 1.55");

  lines.push("rounded:");
  lines.push("  sm: 4px");
  lines.push("  md: 8px");
  lines.push("  lg: 12px");

  lines.push("spacing:");
  lines.push("  xs: 4px");
  lines.push("  sm: 8px");
  lines.push("  md: 16px");
  lines.push("  lg: 32px");

  lines.push("components:");
  lines.push("  button-primary:");
  lines.push('    backgroundColor: "{colors.primary}"');
  lines.push('    rounded: "{rounded.md}"');
  lines.push("    padding: 12px");

  lines.push("---");
  return lines.join("\n");
}

function safeKey(k: string): string {
  return k.replace(/[^A-Za-z0-9_-]/g, "-");
}
function quote(v: string): string {
  if (v.includes(" ") || v.includes("#") || v.includes(",") || v.includes(":")) {
    return `"${v.replace(/"/g, '\\"')}"`;
  }
  return v;
}

function renderBody(digest: UiDigest): string {
  const lines: string[] = [];
  lines.push("# Design system");
  lines.push("");
  lines.push(
    `_This file follows the [Stitch DESIGN.md spec](./references/stitch-design-md.md). The block between the managed markers is auto-generated from the repo's UI sources by \`/specmanager-init\` and refreshed after every feature ships. **Anything outside the markers is yours** — write freely._`
  );
  lines.push("");

  // Overview
  lines.push("## Overview");
  lines.push("");
  if (digest.uiDirs.length === 0) {
    lines.push(
      "_No UI source directory detected yet. Once the project grows a `src/`, `app/`, `ui/`, `web/`, `frontend/`, or `client/` directory with component files, the next re-sync will populate this section._"
    );
  } else {
    lines.push(
      `Inferred from \`${digest.uiDirs.join("`, `")}\` (${digest.componentCount} component file(s)). The project's voice and feel should be described here — replace this paragraph with brand personality, target audience, and the emotional response the UI should evoke.`
    );
  }
  lines.push("");

  // Colors
  lines.push("## Colors");
  lines.push("");
  const colorVars = Object.entries(digest.cssVars).filter(([, v]) =>
    /^(#[0-9a-fA-F]{3,8}|rgb|hsl|oklch|var\()/.test(v.trim())
  );
  if (colorVars.length > 0) {
    lines.push("Colors harvested from CSS custom properties in the UI source:");
    lines.push("");
    for (const [k, v] of colorVars.slice(0, 12)) lines.push(`- \`--${k}\`: \`${v}\``);
  } else {
    lines.push(
      "No color CSS variables detected. Add `:root { --primary: #…; }` declarations in your UI's main stylesheet and re-run `/specmanager-init` (or POST `/api/design/sync`) to populate this section."
    );
  }
  lines.push("");

  // Typography
  lines.push("## Typography");
  lines.push("");
  lines.push(
    "Typography scale — replace the placeholder body-md entry in the frontmatter with the real scale (headlines, body sizes, labels). Most design systems have 9–15 levels."
  );
  lines.push("");

  // Layout
  lines.push("## Layout");
  lines.push("");
  lines.push(
    "Layout strategy — grid model, breakpoint(s), max content width, spacing scale. The frontmatter `spacing` keys are the canonical values."
  );
  lines.push("");

  // Elevation & Depth
  lines.push("## Elevation & Depth");
  lines.push("");
  lines.push(
    "How visual hierarchy is conveyed — shadows, tonal layers, borders, or color contrast. Describe the approach this project takes."
  );
  lines.push("");

  // Shapes
  lines.push("## Shapes");
  lines.push("");
  lines.push(
    "Corner radii and edge treatments. See `rounded.*` in the frontmatter for the scale."
  );
  lines.push("");

  // Components
  lines.push("## Components");
  lines.push("");
  if (digest.componentSamples.length > 0) {
    lines.push("Sample component files discovered:");
    lines.push("");
    for (const p of digest.componentSamples) lines.push(`- \`${p}\``);
    lines.push("");
    lines.push(
      "Define style guidance for the component atoms used in this project (Buttons, Inputs, Cards, Lists, etc.) in the frontmatter `components` map."
    );
  } else {
    lines.push(
      "No component files detected yet. Once UI components exist in the repo, the next re-sync will surface them here."
    );
  }
  if (digest.tailwindConfigs.length > 0) {
    lines.push("");
    lines.push(`Tailwind config(s) detected: \`${digest.tailwindConfigs.join("`, `")}\` — token values in \`theme.extend\` should mirror the frontmatter above.`);
  }
  if (digest.tokenFiles.length > 0) {
    lines.push("");
    lines.push(`Token file(s) detected: \`${digest.tokenFiles.join("`, `")}\` — keep these in sync with the frontmatter above.`);
  }
  lines.push("");

  // Do's and Don'ts
  lines.push("## Do's and Don'ts");
  lines.push("");
  lines.push(
    "- Do treat the frontmatter as the source of truth — components reference it via `{colors.primary}`-style token references."
  );
  lines.push(
    "- Do keep this file in `./docs/DESIGN.md` so `/specmanager-init` and the auto-refresh can find it."
  );
  lines.push(
    "- Don't edit content **between** the managed markers by hand — SpecManager rewrites it after every feature ships."
  );
  lines.push(
    "- Don't move or rename the markers themselves; the merge logic searches for them literally."
  );
  return lines.join("\n");
}

export function renderDesignMd(digest: UiDigest): string {
  const block = `${START}\n${yamlBlock(digest)}\n\n${renderBody(digest)}\n${END}`;
  return block;
}

export interface SyncDesignMdOptions {
  mode?: "init" | "refresh";
}

export interface SyncDesignMdResult {
  path: string;
  created: boolean;
  updated: boolean;
  mode: "init" | "refresh";
}

export async function syncDesignMd(
  rootOrOpts?: string | SyncDesignMdOptions,
  optsArg?: SyncDesignMdOptions
): Promise<SyncDesignMdResult> {
  let resolvedRoot: string | undefined;
  let opts: SyncDesignMdOptions | undefined;
  if (typeof rootOrOpts === "string") {
    resolvedRoot = rootOrOpts;
    opts = optsArg;
  } else if (rootOrOpts) {
    opts = rootOrOpts;
  }
  const root = resolvedRoot ?? projectRoot();
  const mode = opts?.mode ?? "refresh";

  const file = designMdPath(root);
  const digest = await scanUiSources(root);
  const managedBlock = renderDesignMd(digest);

  await fs.mkdir(path.dirname(file), { recursive: true });

  let existing = "";
  let created = false;
  try {
    existing = await fs.readFile(file, "utf8");
  } catch {
    created = true;
  }

  let next: string;
  const startIdx = existing.indexOf(START);
  const endIdx = existing.indexOf(END);
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const before = existing.slice(0, startIdx);
    const after = existing.slice(endIdx + END.length);
    next = `${before}${managedBlock}${after}`;
  } else if (existing.trim().length === 0) {
    next = `${managedBlock}\n`;
  } else {
    // Hand-written content with no markers — preserve it, append managed block.
    next = `${existing.replace(/\s+$/, "")}\n\n${managedBlock}\n`;
  }

  const updated = next !== existing;
  if (updated) await fs.writeFile(file, next, "utf8");

  events.emit({ type: "design.synced", path: file, mode });
  return { path: file, created, updated, mode };
}
