// Multi-repo declare-by-path self-test — runs entirely against @specmanager/core
// in a throwaway temp workspace. Exits non-zero on the first failure.
//
// Usage: node dist/selftest-repos.js
//
// Validates the "core" phase of Multi-repo nested docs (CLAUDE.md / DESIGN.md):
//   declare two sibling repos → seed repos/<name>/{CLAUDE.md,DESIGN.md,sidecar}
//   → render the linked "Declared repos" block → re-run reconciles idempotently
//   (nested bodies un-clobbered) and picks up a newly-passed third repo.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assertInsideRoot, initProject, repoDir, reposDir, scanDeclaredRepos, seedRepo, } from "./core/index.js";
function assert(condition, message) {
    if (!condition) {
        throw new Error(`FAIL: ${message}`);
    }
    console.log(`ok — ${message}`);
}
/** Create a sibling repo dir under `parent` with optional CLAUDE.md / DESIGN.md. */
async function makeRepo(parent, name, files) {
    const dir = path.join(parent, name);
    await fs.mkdir(dir, { recursive: true });
    if (files.claudeMd !== undefined) {
        await fs.writeFile(path.join(dir, "CLAUDE.md"), files.claudeMd, "utf8");
    }
    if (files.designMd !== undefined) {
        await fs.writeFile(path.join(dir, "DESIGN.md"), files.designMd, "utf8");
    }
    return dir;
}
/** Recursively list every file (not directory) under `dir`, sorted. */
async function listFiles(dir) {
    const out = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory())
            out.push(...(await listFiles(full)));
        else
            out.push(full);
    }
    return out;
}
/** Every file under `base` that does NOT live inside `reposAbs` — the containment witness set. */
async function listFilesOutsideRepos(base, reposAbs) {
    const all = await listFiles(base);
    return all
        .filter((f) => f !== reposAbs && !f.startsWith(reposAbs + path.sep))
        .sort();
}
async function main() {
    // A shared workspace so the meta root and the sibling repos have a common
    // parent — sourcePath (relative to the meta root's parent) then stays clean.
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "specmanager-repos-"));
    const root = path.join(workspace, "meta");
    await fs.mkdir(root, { recursive: true });
    console.log(`tmp workspace: ${workspace}`);
    // Two sibling repos: one with a UI (CLAUDE.md + DESIGN.md), one CLAUDE.md-only.
    const uiRepo = await makeRepo(workspace, "repo-with-ui", {
        claudeMd: "# repo-with-ui\n\nSource CLAUDE.md body.\n",
        designMd: "# repo-with-ui design\n\n--primary: #123456;\n",
    });
    const noUiRepo = await makeRepo(workspace, "repo-no-ui", {
        claudeMd: "# repo-no-ui\n\nSource CLAUDE.md body, no design system.\n",
    });
    // 1. Declare both repos through the full init pipeline (render included).
    const initRes = await initProject(root, {
        repoPaths: [uiRepo, noUiRepo],
        cwd: workspace,
    });
    assert(initRes.declaredRepos.length === 2, "init declares both repos");
    assert(initRes.rejectedRepos.length === 0, "init rejects nothing");
    // 2. Both nested trees + sidecars written under the meta root.
    const uiTree = path.join(root, "repos", "repo-with-ui");
    const noUiTree = path.join(root, "repos", "repo-no-ui");
    const uiClaude = path.join(uiTree, "CLAUDE.md");
    await fs.access(uiClaude);
    await fs.access(path.join(uiTree, "DESIGN.md"));
    await fs.access(path.join(uiTree, ".specmanager-repo.json"));
    await fs.access(path.join(noUiTree, "CLAUDE.md"));
    await fs.access(path.join(noUiTree, "DESIGN.md"));
    await fs.access(path.join(noUiTree, ".specmanager-repo.json"));
    console.log("ok — both repos/<name>/ trees + sidecars written");
    // Seeded CLAUDE.md mirrors the source body under the read-only banner.
    const uiClaudeBody = await fs.readFile(uiClaude, "utf8");
    assert(uiClaudeBody.includes("Read-only mirror"), "seeded mirror carries the read-only banner");
    assert(uiClaudeBody.includes("Source CLAUDE.md body."), "seeded mirror includes the source CLAUDE.md body");
    // 3. hasUi correct per repo (sidecar + scan).
    const uiSidecar = JSON.parse(await fs.readFile(path.join(uiTree, ".specmanager-repo.json"), "utf8"));
    const noUiSidecar = JSON.parse(await fs.readFile(path.join(noUiTree, ".specmanager-repo.json"), "utf8"));
    assert(uiSidecar.hasUi === true, "repo-with-ui sidecar hasUi is true");
    assert(noUiSidecar.hasUi === false, "repo-no-ui sidecar hasUi is false");
    assert(noUiSidecar.sourceHadDesignMd === false, "repo-no-ui sidecar records the source had no DESIGN.md");
    const scanned = await scanDeclaredRepos(root);
    assert(scanned.length === 2, "scanDeclaredRepos returns both repos");
    assert(scanned.find((r) => r.name === "repo-with-ui")?.hasUi === true, "scan reports repo-with-ui hasUi true");
    assert(scanned.find((r) => r.name === "repo-no-ui")?.hasUi === false, "scan reports repo-no-ui hasUi false");
    // 4. Managed CLAUDE.md block has the linked "Declared repos" subsection.
    const claudeMd = await fs.readFile(path.join(root, "CLAUDE.md"), "utf8");
    assert(claudeMd.includes("### Declared repos"), "CLAUDE.md has Declared repos subsection");
    assert(claudeMd.includes("- **repo-with-ui** — [CLAUDE.md](./repos/repo-with-ui/CLAUDE.md) · [DESIGN.md](./repos/repo-with-ui/DESIGN.md)"), "CLAUDE.md renders the repo-with-ui row with working relative links");
    // The relative link actually resolves to a real file under the meta root.
    await fs.access(path.join(root, "repos", "repo-with-ui", "CLAUDE.md"));
    console.log("ok — Declared repos link resolves to a real nested file");
    assert(claudeMd.includes("- **repo-no-ui** — [CLAUDE.md](./repos/repo-no-ui/CLAUDE.md) · [DESIGN.md](./repos/repo-no-ui/DESIGN.md) _(placeholder)_"), "CLAUDE.md marks the CLAUDE.md-only repo row as _(placeholder)_");
    // 5. Reconcile / idempotency — annotate a nested mirror, then re-run init.
    const annotated = `${uiClaudeBody}\n\n<!-- hand annotation: keep me -->\n`;
    await fs.writeFile(uiClaude, annotated, "utf8");
    // Third sibling repo, created only for the second run.
    const thirdRepo = await makeRepo(workspace, "repo-third", {
        claudeMd: "# repo-third\n\nA later addition.\n",
        designMd: "# repo-third design\n",
    });
    const rerun = await initProject(root, {
        repoPaths: [uiRepo, noUiRepo, thirdRepo],
        cwd: workspace,
    });
    assert(rerun.declaredRepos.length === 3, "re-run declares all three repos");
    assert(rerun.rejectedRepos.length === 0, "re-run rejects nothing");
    // The annotated mirror body is byte-identical (write-if-absent never clobbers).
    const uiClaudeAfter = await fs.readFile(uiClaude, "utf8");
    assert(uiClaudeAfter === annotated, "re-run leaves the annotated nested body byte-identical (un-clobbered)");
    // The third repo is now declared, seeded, and rendered.
    const thirdTree = path.join(root, "repos", "repo-third");
    await fs.access(path.join(thirdTree, "CLAUDE.md"));
    await fs.access(path.join(thirdTree, "DESIGN.md"));
    await fs.access(path.join(thirdTree, ".specmanager-repo.json"));
    console.log("ok — third repo seeded on re-run");
    const scannedAfter = await scanDeclaredRepos(root);
    assert(scannedAfter.length === 3, "scan returns all three repos after re-run");
    const claudeMdAfter = await fs.readFile(path.join(root, "CLAUDE.md"), "utf8");
    assert(claudeMdAfter.includes("- **repo-third** — [CLAUDE.md](./repos/repo-third/CLAUDE.md) · [DESIGN.md](./repos/repo-third/DESIGN.md)"), "CLAUDE.md renders the newly-added repo-third row after re-run");
    // 6. Write-containment / traversal — the load-bearing safety invariant:
    //    read may leave the meta root; write structurally cannot.
    // 6a. assertInsideRoot directly: an in-root path passes, a traversal escapes.
    const legit = repoDir("legit", root);
    assertInsideRoot(legit, root); // must NOT throw
    console.log("ok — assertInsideRoot accepts an in-root repos/<name>/ path");
    const escaping = repoDir(path.join("..", "..", "escape"), root);
    let guardThrew = false;
    try {
        assertInsideRoot(escaping, root);
    }
    catch {
        guardThrew = true;
    }
    assert(guardThrew, "assertInsideRoot rejects a traversal path that escapes the meta root");
    // 6b. A traversal-laden name cannot cause a write outside repos/. seedRepo
    //     builds its dir from (root, name) and gates every write on
    //     assertInsideRoot, so the crafted name throws before any bytes land.
    const before = await listFilesOutsideRepos(workspace, reposDir(root));
    const craftedDocs = { claudeMd: "# crafted\n", designMd: "# crafted\n" };
    let seedThrew = false;
    try {
        await seedRepo(root, path.join("..", "..", "escape"), uiRepo, craftedDocs);
    }
    catch {
        seedThrew = true;
    }
    assert(seedThrew, "seedRepo throws on a traversal-laden name (write-containment guard)");
    // Scan the meta root's parent: nothing was written anywhere outside repos/.
    const after = await listFilesOutsideRepos(workspace, reposDir(root));
    assert(before.length === after.length && before.every((f, i) => f === after[i]), "no file was written outside repos/ after the crafted traversal attempt");
    // 6c. Partial success — a missing arg is rejected without aborting the valid
    //     repos in the same declare call.
    const missing = path.join(workspace, "does-not-exist");
    const partialMissing = await initProject(root, {
        repoPaths: [uiRepo, missing, noUiRepo],
        cwd: workspace,
    });
    assert(partialMissing.rejectedRepos.some((r) => r.arg === missing && r.reason === "notFound"), "a missing arg is reported in rejectedRepos with reason notFound");
    assert(partialMissing.declaredRepos.length === 2 &&
        partialMissing.declaredRepos.some((r) => r.name === "repo-with-ui") &&
        partialMissing.declaredRepos.some((r) => r.name === "repo-no-ui"), "both valid repos are still declared despite the bad arg (partial success)");
    // 6d. A not-a-directory arg is likewise rejected, valid repo unharmed.
    const filePath = path.join(workspace, "a-file.txt");
    await fs.writeFile(filePath, "not a directory\n", "utf8");
    const partialFile = await initProject(root, {
        repoPaths: [uiRepo, filePath],
        cwd: workspace,
    });
    assert(partialFile.rejectedRepos.some((r) => r.arg === filePath && r.reason === "notADirectory"), "a not-a-directory arg is reported in rejectedRepos with reason notADirectory");
    assert(partialFile.declaredRepos.some((r) => r.name === "repo-with-ui"), "the valid repo is still declared alongside the not-a-directory rejection");
    console.log("\nAll multi-repo declare/seed/render/reconcile + containment assertions passed.");
    console.log(`Inspect the tmp workspace at: ${workspace}`);
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=selftest-repos.js.map