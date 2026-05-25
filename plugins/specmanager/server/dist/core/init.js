import { ensureSpecsRoot } from "./features.js";
import { writeManifest } from "./manifest.js";
import { syncClaudeMd } from "./claude-md.js";
import { projectRoot } from "./paths.js";
export async function initProject(root = projectRoot()) {
    await ensureSpecsRoot(root);
    await writeManifest(root);
    const md = await syncClaudeMd(root);
    return { projectDir: root, claudeMd: md.path, createdClaudeMd: md.created };
}
//# sourceMappingURL=init.js.map