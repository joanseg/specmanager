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
import { initProject, createFeature, createDocument, setStatus, readDocumentById, listStale, syncClaudeMd, syncDesignMd, } from "./core/index.js";
function assert(condition, message) {
    if (!condition) {
        throw new Error(`FAIL: ${message}`);
    }
    console.log(`ok — ${message}`);
}
async function main() {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "specmanager-selftest-"));
    console.log(`tmp project: ${root}`);
    // Seed a UI source file so scanUiSources has something to find.
    await fs.mkdir(path.join(root, "src/ui"), { recursive: true });
    await fs.writeFile(path.join(root, "src/ui/Button.tsx"), "export const Button = () => null;\n", "utf8");
    await fs.writeFile(path.join(root, "src/ui/tokens.css"), ":root { --primary: #1A1C1E; --neutral: #F7F5F2; }\n", "utf8");
    // 1. init
    const initRes = await initProject(root);
    assert(initRes.projectDir === root, "init returns project dir");
    const claudeMd1 = await fs.readFile(path.join(root, "CLAUDE.md"), "utf8");
    assert(claudeMd1.includes("<!-- specmanager:start -->"), "CLAUDE.md has start marker");
    assert(claudeMd1.includes("<!-- specmanager:end -->"), "CLAUDE.md has end marker");
    assert(claudeMd1.includes("No features yet"), "CLAUDE.md notes no features yet");
    // 1.5 DESIGN.md created by init with the design markers and scanned tokens.
    assert(initRes.createdDesignMd === true, "init reports it created DESIGN.md");
    assert(initRes.designMd.endsWith("docs/DESIGN.md"), "init returns DESIGN.md path under docs/");
    const designMd1 = await fs.readFile(initRes.designMd, "utf8");
    assert(designMd1.includes("<!-- specmanager:design:start -->"), "DESIGN.md has design start marker");
    assert(designMd1.includes("<!-- specmanager:design:end -->"), "DESIGN.md has design end marker");
    assert(designMd1.includes("primary:"), "DESIGN.md frontmatter includes primary token");
    assert(designMd1.includes("Button.tsx"), "DESIGN.md components section names the scanned component");
    // Hand-edit OUTSIDE the markers — survives a refresh.
    const handEdited = `# Hand-written preamble\n\nUser-owned content above the markers.\n\n${designMd1}`;
    await fs.writeFile(initRes.designMd, handEdited, "utf8");
    await syncDesignMd(root, { mode: "refresh" });
    const designMd2 = await fs.readFile(initRes.designMd, "utf8");
    assert(designMd2.startsWith("# Hand-written preamble"), "DESIGN.md preamble preserved across refresh");
    assert(designMd2.includes("<!-- specmanager:design:start -->"), "DESIGN.md still has markers after refresh");
    // Idempotent: running refresh twice with no source changes produces identical bytes.
    await syncDesignMd(root, { mode: "refresh" });
    const designMd3 = await fs.readFile(initRes.designMd, "utf8");
    assert(designMd3 === designMd2, "DESIGN.md refresh is idempotent (byte-identical)");
    // 2. create feature
    const feature = await createFeature("Checkout corridor", root);
    assert(feature.slug === "checkout-corridor", "feature slug is kebab-case");
    assert(feature.id === "feat-checkout-corridor", "feature id is feat-<slug>");
    const featureFile = path.join(root, ".claude/specs/features", feature.slug, "feature.json");
    await fs.access(featureFile);
    console.log(`ok — feature.json exists at ${featureFile}`);
    // 3. PRD doc (draft)
    const prd = await createDocument({
        featureId: feature.id,
        stage: "prd",
        title: "Checkout corridor PRD",
        body: "# PRD\n\nDraft.",
    }, root);
    assert(prd.frontmatter.status === "draft", "new PRD is draft");
    assert(prd.frontmatter.version === 1, "new PRD is v1");
    // 4. Architecture doc (draft) depending on the PRD
    const arch = await createDocument({
        featureId: feature.id,
        stage: "architecture",
        title: "Checkout corridor architecture",
        body: "# Architecture\n\nDraft.",
        dependsOn: [prd.frontmatter.id],
        basedOn: { [prd.frontmatter.id]: prd.frontmatter.version },
    }, root);
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
    assert(stale.some((d) => d.frontmatter.id === arch.frontmatter.id), "list_stale includes arch");
    // 7. sync_claude_md after state changes
    await syncClaudeMd(root);
    const claudeMd2 = await fs.readFile(path.join(root, "CLAUDE.md"), "utf8");
    assert(claudeMd2.includes("Checkout corridor"), "CLAUDE.md table lists the feature");
    // 8. Re-approve clears stale on the *upstream* (not on downstream — that needs reconcile).
    // For now, just confirm we can flip the arch back manually as a stand-in for reconciliation.
    await setStatus(arch.frontmatter.id, "approved", root);
    const archReconciled = await readDocumentById(arch.frontmatter.id, root);
    assert(archReconciled.frontmatter.stale === false, "approving arch clears its stale flag");
    console.log("\nAll Phase 1 assertions passed.");
    console.log(`Inspect the tmp project at: ${root}`);
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=selftest.js.map