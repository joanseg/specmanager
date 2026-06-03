// Phase 1 end-to-end smoke test — runs entirely against @specmanager/core
// in a throwaway temp directory. Exits non-zero on the first failure.
//
// Usage: node dist/selftest.js
//
// Validates the exit criteria for Phase 1:
//   init → feature → PRD → approve → reopen → dependent flagged stale.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  initProject,
  createFeature,
  createDocument,
  setStatus,
  readDocumentById,
  listStale,
  syncClaudeMd,
  syncDesignMd,
  scanUiSources,
  sanitizeDesignBriefBody,
} from "./core/index.js";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`ok — ${message}`);
}

async function main(): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "specmanager-selftest-"));
  console.log(`tmp project: ${root}`);

  // Seed a UI source file so scanUiSources has something to find.
  await fs.mkdir(path.join(root, "src/ui"), { recursive: true });
  await fs.writeFile(
    path.join(root, "src/ui/Button.tsx"),
    "export const Button = () => null;\n",
    "utf8"
  );
  await fs.writeFile(
    path.join(root, "src/ui/tokens.css"),
    ":root { --primary: #1A1C1E; --neutral: #F7F5F2; }\n",
    "utf8"
  );

  // 1. init
  const initRes = await initProject(root);
  assert(initRes.projectDir === root, "init returns project dir");
  const claudeMd1 = await fs.readFile(path.join(root, "CLAUDE.md"), "utf8");
  assert(claudeMd1.includes("<!-- specmanager:start -->"), "CLAUDE.md has start marker");
  assert(claudeMd1.includes("<!-- specmanager:end -->"), "CLAUDE.md has end marker");
  assert(claudeMd1.includes("No features yet"), "CLAUDE.md notes no features yet");

  // 1.5 DESIGN.md created by init with the design markers and scanned tokens.
  assert(initRes.createdDesignMd === true, "init reports it created DESIGN.md");
  assert(
    initRes.designMd.endsWith("docs/DESIGN.md"),
    "init returns DESIGN.md path under docs/"
  );
  const designMd1 = await fs.readFile(initRes.designMd, "utf8");
  assert(
    designMd1.includes("<!-- specmanager:design:start -->"),
    "DESIGN.md has design start marker"
  );
  assert(
    designMd1.includes("<!-- specmanager:design:end -->"),
    "DESIGN.md has design end marker"
  );
  assert(designMd1.includes("primary:"), "DESIGN.md frontmatter includes primary token");
  assert(
    designMd1.includes("Button.tsx"),
    "DESIGN.md components section names the scanned component"
  );

  // Hand-edit OUTSIDE the markers — survives a refresh.
  const handEdited = `# Hand-written preamble\n\nUser-owned content above the markers.\n\n${designMd1}`;
  await fs.writeFile(initRes.designMd, handEdited, "utf8");
  await syncDesignMd(root, { mode: "refresh" });
  const designMd2 = await fs.readFile(initRes.designMd, "utf8");
  assert(
    designMd2.startsWith("# Hand-written preamble"),
    "DESIGN.md preamble preserved across refresh"
  );
  assert(
    designMd2.includes("<!-- specmanager:design:start -->"),
    "DESIGN.md still has markers after refresh"
  );

  // Idempotent: running refresh twice with no source changes produces identical bytes.
  await syncDesignMd(root, { mode: "refresh" });
  const designMd3 = await fs.readFile(initRes.designMd, "utf8");
  assert(designMd3 === designMd2, "DESIGN.md refresh is idempotent (byte-identical)");

  // 1.6 Regression — scanUiSources must find UI nested in a monorepo / plugin
  // layout (plugins/<name>/ui/src), not only root-relative dirs, and must NOT
  // misclassify a sibling backend src/ as UI.
  const nestedRoot = await fs.mkdtemp(path.join(os.tmpdir(), "specmanager-selftest-nested-"));
  await fs.mkdir(path.join(nestedRoot, "plugins/acme/ui/src"), { recursive: true });
  await fs.writeFile(
    path.join(nestedRoot, "plugins/acme/ui/src/Widget.tsx"),
    "export const Widget = () => null;\n",
    "utf8"
  );
  await fs.writeFile(
    path.join(nestedRoot, "plugins/acme/ui/src/theme.css"),
    ":root {\n  --brand: #0af;\n}\n",
    "utf8"
  );
  // Decoy backend source that must NOT be picked up as a UI dir.
  await fs.mkdir(path.join(nestedRoot, "plugins/acme/server/src"), { recursive: true });
  await fs.writeFile(
    path.join(nestedRoot, "plugins/acme/server/src/index.ts"),
    "export const x = 1;\n",
    "utf8"
  );
  const nestedDigest = await scanUiSources(nestedRoot);
  assert(
    nestedDigest.uiDirs.includes("plugins/acme/ui"),
    "scanUiSources finds nested UI dir plugins/acme/ui"
  );
  assert(
    !nestedDigest.uiDirs.some((d) => d.includes("server")),
    "scanUiSources does not misclassify a backend server/src as UI"
  );
  assert(
    nestedDigest.componentSamples.some((s) => s.endsWith("Widget.tsx")),
    "scanUiSources counts the nested component file"
  );
  assert("brand" in nestedDigest.cssVars, "scanUiSources harvests CSS vars from the nested UI dir");

  // 2. create feature
  const feature = await createFeature("Checkout corridor", root);
  assert(feature.slug === "checkout-corridor", "feature slug is kebab-case");
  assert(feature.id === "feat-checkout-corridor", "feature id is feat-<slug>");
  const featureFile = path.join(root, ".claude/specs/features", feature.slug, "feature.json");
  await fs.access(featureFile);
  console.log(`ok — feature.json exists at ${featureFile}`);

  // 3. PRD doc (draft)
  const prd = await createDocument(
    {
      featureId: feature.id,
      stage: "prd",
      title: "Checkout corridor PRD",
      body: "# PRD\n\nDraft.",
    },
    root
  );
  assert(prd.frontmatter.status === "draft", "new PRD is draft");
  assert(prd.frontmatter.version === 1, "new PRD is v1");

  // 4. Architecture doc (draft) depending on the PRD
  const arch = await createDocument(
    {
      featureId: feature.id,
      stage: "architecture",
      title: "Checkout corridor architecture",
      body: "# Architecture\n\nDraft.",
      dependsOn: [prd.frontmatter.id],
      basedOn: { [prd.frontmatter.id]: prd.frontmatter.version },
    },
    root
  );
  assert(arch.frontmatter.dependsOn.includes(prd.frontmatter.id), "arch dependsOn PRD");
  assert(arch.frontmatter.stale === false, "arch starts not stale");

  // 5. Approve PRD
  const approved = await setStatus(prd.frontmatter.id, "approved", root);
  assert(approved.frontmatter.status === "approved", "PRD approved");

  // 6. Reopen PRD → architecture should be flagged stale
  await setStatus(prd.frontmatter.id, "draft", root);
  const archAfter = await readDocumentById(arch.frontmatter.id, root);
  assert(archAfter.frontmatter.stale === true, "arch flagged stale after PRD reopen");

  const stale = await listStale(root);
  assert(
    stale.some((d) => d.frontmatter.id === arch.frontmatter.id),
    "list_stale includes arch"
  );

  // 7. sync_claude_md after state changes
  await syncClaudeMd(root);
  const claudeMd2 = await fs.readFile(path.join(root, "CLAUDE.md"), "utf8");
  assert(claudeMd2.includes("Checkout corridor"), "CLAUDE.md table lists the feature");

  // 8. Re-approve clears stale on the *upstream* (not on downstream — that needs reconcile).
  // For now, just confirm we can flip the arch back manually as a stand-in for reconciliation.
  await setStatus(arch.frontmatter.id, "approved", root);
  const archReconciled = await readDocumentById(arch.frontmatter.id, root);
  assert(archReconciled.frontmatter.stale === false, "approving arch clears its stale flag");

  // 9. Phase C — design mockups wiring (sanitize + createDocument path).
  // Fake the designer subagent: a single self-contained HTML doc of stacked
  // screen mockups + explanatory notes. A stray `---` at column 0 must be defanged.
  const mockupHtml = [
    `<!doctype html>`,
    `<html><head><style>.sm-screen{border:1px solid #ccc}</style></head><body>`,
    `<section class="sm-screen"><h1>List view</h1></section>`,
    `<section class="sm-note"><h2>List view</h2><p>user-content</p></section>`,
    `---`,
    `<section class="sm-screen"><h1>Detail view</h1></section>`,
    `</body></html>`,
  ].join("\n");
  const sanitized = sanitizeDesignBriefBody(mockupHtml);
  assert(
    !/\n---\n/.test(sanitized),
    "sanitizeDesignBriefBody defangs `---` at column 0"
  );
  assert(
    sanitized.includes("<!-- --- -->"),
    "sanitizeDesignBriefBody wraps `---` in an HTML comment"
  );

  // Drive a fake designer subagent: createDocument with stage="design" + sanitized body.
  // (Mirrors what create_design_brief does in the MCP wrapper.)
  const designDoc = await createDocument(
    {
      featureId: feature.id,
      stage: "design",
      title: "Checkout corridor mockups",
      body: sanitized,
      generatedBy: "agent",
      dependsOn: [prd.frontmatter.id],
      basedOn: { [prd.frontmatter.id]: prd.frontmatter.version },
    },
    root
  );
  assert(designDoc.frontmatter.stage === "design", "design doc stage is design");
  assert(designDoc.frontmatter.generatedBy === "agent", "design doc generatedBy is agent");
  assert(
    designDoc.frontmatter.dependsOn[0] === prd.frontmatter.id,
    "design doc depends on PRD"
  );
  assert(
    designDoc.filePath.endsWith("/design/mockups.html"),
    "design doc lands at design/mockups.html"
  );
  const mockupRoundTrip = await readDocumentById(designDoc.frontmatter.id, root);
  assert(
    mockupRoundTrip.body.includes('<section class="sm-screen">'),
    "design doc body round-trips stacked screen sections"
  );
  assert(
    mockupRoundTrip.body.includes("<style>"),
    "design doc body round-trips inline styles"
  );
  assert(
    mockupRoundTrip.body.includes("<!-- --- -->"),
    "design doc body preserves the sanitized escape on read"
  );

  // 10. Resilience — a malformed doc file (no frontmatter) must be skipped,
  // never crash listDocuments / buildManifest (regression: design brief written
  // as raw HTML without going through create_design_brief).
  const designDir = path.join(
    root,
    ".claude/specs/features/checkout-corridor/design"
  );
  await fs.mkdir(designDir, { recursive: true });
  await fs.writeFile(
    path.join(designDir, "rogue.html"),
    "<!doctype html><html><body>no frontmatter here</body></html>",
    "utf8"
  );
  const { buildManifest } = await import("./core/index.js");
  const manifestAfterRogue = await buildManifest(root);
  assert(
    manifestAfterRogue.features.length >= 1,
    "buildManifest survives a frontmatter-less doc file (skips it, no throw)"
  );

  console.log("\nAll Phase 1 assertions passed.");
  console.log(`Inspect the tmp project at: ${root}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
