import { ensureSpecsRoot } from "./features.js";
import { migrateWalkthroughs } from "./documents.js";
import { writeManifest } from "./manifest.js";
import { syncClaudeMd } from "./claude-md.js";
import { projectRoot } from "./paths.js";

export interface InitResult {
  projectDir: string;
  claudeMd: string;
  createdClaudeMd: boolean;
  migratedWalkthroughs: string[];
}

export async function initProject(root = projectRoot()): Promise<InitResult> {
  await ensureSpecsRoot(root);
  const migratedWalkthroughs = await migrateWalkthroughs(root);
  await writeManifest(root);
  const md = await syncClaudeMd(root);
  return {
    projectDir: root,
    claudeMd: md.path,
    createdClaudeMd: md.created,
    migratedWalkthroughs,
  };
}
