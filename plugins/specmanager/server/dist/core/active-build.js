// Explicit active-build marker (Architecture Option B). The Stop-gate's
// resolveActiveCard reads this marker first: no marker ⇒ no build in flight ⇒
// the gate is a no-op. /specmanager-build writes the marker when a phase starts
// and clears it when the phase completes or is blocked. Single-user means at
// most one build is ever in flight, so a single JSON file under the gitignored
// .cache/ surface (sibling of .cache/stop-gate/) is sufficient.
import fs from "node:fs/promises";
import path from "node:path";
import { projectRoot, specsDir } from "./paths.js";
import { nowIso } from "./ids.js";
import { events } from "./events.js";
/** `.claude/specs/.cache/active-build.json`. */
export function activeBuildPath(root = projectRoot()) {
    return path.join(specsDir(root), ".cache", "active-build.json");
}
/** Parse the marker; missing or unreadable/invalid ⇒ null (never throws). */
export async function readActiveBuild(root = projectRoot()) {
    try {
        const raw = await fs.readFile(activeBuildPath(root), "utf8");
        const parsed = JSON.parse(raw);
        if (typeof parsed?.featureId === "string" && typeof parsed?.phase === "string") {
            return parsed;
        }
        return null;
    }
    catch {
        return null;
    }
}
/** Write/overwrite the marker for the build now in flight. */
export async function setActiveBuild(input, root = projectRoot()) {
    const marker = {
        featureId: input.featureId,
        phase: input.phase,
        sessionId: input.sessionId ?? null,
        startedAt: nowIso(),
    };
    const p = activeBuildPath(root);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, JSON.stringify(marker, null, 2), "utf8");
    events.emit({ type: "build.started", featureId: input.featureId, phase: input.phase });
}
/** Delete the marker. Idempotent — a missing file is a no-op. */
export async function clearActiveBuild(root = projectRoot()) {
    await fs.rm(activeBuildPath(root), { force: true });
    events.emit({ type: "build.cleared" });
}
//# sourceMappingURL=active-build.js.map