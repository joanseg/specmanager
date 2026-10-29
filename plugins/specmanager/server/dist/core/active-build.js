// Explicit active-build marker (Architecture Option B). The Stop-gate's
// resolveActiveCard reads this marker first: no marker ⇒ no build in flight ⇒
// the gate is a no-op. /specmanager-build writes the marker when a phase starts
// and clears it when the phase completes or is blocked. At most one build is in
// flight per project, so a single JSON file under the gitignored .cache/ surface
// (sibling of .cache/stop-gate/) is sufficient; its sessionId scopes the gate to
// the session running the build.
import fs from "node:fs/promises";
import path from "node:path";
import { projectRoot, specsDir } from "./paths.js";
import { nowIso } from "./ids.js";
import { events } from "./events.js";
import { findFeatureById } from "./features.js";
/** `.claude/specs/.cache/active-build.json`. */
export function activeBuildPath(root = projectRoot()) {
    return path.join(specsDir(root), ".cache", "active-build.json");
}
/** `.claude/specs/.cache/stop-gate/` — the Stop-gate's retry counters. */
export function stopGateDir(root = projectRoot()) {
    return path.join(specsDir(root), ".cache", "stop-gate");
}
/**
 * Delete a phase's retry counters: the legacy `<slug>__<phase>` file and every
 * per-dispatch `<slug>__<phase>__*` file. Key is sanitised like the counters.
 */
export async function resetGateCounters(slug, phase, root = projectRoot()) {
    const key = `${slug}__${phase}`.replace(/[^A-Za-z0-9_.-]/g, "_");
    const dir = stopGateDir(root);
    const names = await fs.readdir(dir).catch(() => []);
    for (const name of names) {
        if (name === key || name.startsWith(`${key}__`)) {
            await fs.rm(path.join(dir, name), { force: true });
        }
    }
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
/** Write/overwrite the marker for the build now in flight; resets the phase's retry budget. */
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
    const feature = await findFeatureById(input.featureId, root);
    if (feature)
        await resetGateCounters(feature.slug, input.phase, root);
    events.emit({ type: "build.started", featureId: input.featureId, phase: input.phase });
}
/** Delete the marker. Idempotent — a missing file is a no-op. */
export async function clearActiveBuild(root = projectRoot()) {
    await fs.rm(activeBuildPath(root), { force: true });
    events.emit({ type: "build.cleared" });
}
