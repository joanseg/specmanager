import { ensureSpecsRoot } from "./features.js";
import { migrateWalkthroughs } from "./documents.js";
import { writeManifest } from "./manifest.js";
import { syncClaudeMd } from "./claude-md.js";
import { syncDesignMd } from "./design-md.js";
import { projectRoot } from "./paths.js";

export interface InitResult {
  projectDir: string;
  claudeMd: string;
  createdClaudeMd: boolean;
  designMd: string;
  createdDesignMd: boolean;
  migratedWalkthroughs: string[];
}

export async function initProject(root = projectRoot()): Promise<InitResult> {
  await ensureSpecsRoot(root);
  const migratedWalkthroughs = await migrateWalkthroughs(root);
  await writeManifest(root);
  const cmd = await syncClaudeMd(root);
  const dmd = await syncDesignMd(root, { mode: "init" });
  return {
    projectDir: root,
    claudeMd: cmd.path,
    createdClaudeMd: cmd.created,
    designMd: dmd.path,
    createdDesignMd: dmd.created,
    migratedWalkthroughs,
  };
}
