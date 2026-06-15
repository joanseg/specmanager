#!/usr/bin/env node
// CLI shim for the Stop-gate hook: record a blocked note on a phase when the
// iteration cap is hit (R1 AC2). task-009 extends core to also flip the phase's
// open tasks to a first-class `blocked` status; this shim picks that up
// automatically once `blockPhaseTasks` exists.
//
// Usage: set-phase-blocked.js <featureId> <phase> <reason...>
import * as core from "./core/index.js";
const { setPhaseBlocked } = core;
const root = process.env.SPECMANAGER_PROJECT_DIR ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const [, , featureId, phase, ...reasonParts] = process.argv;
const reason = reasonParts.join(" ") || "iteration cap reached";
if (!featureId || !phase) {
    process.stderr.write("set-phase-blocked: featureId and phase are required\n");
    process.exit(1);
}
(async () => {
    await setPhaseBlocked(featureId, phase, reason, root);
    const blockTasks = core["blockPhaseTasks"];
    if (blockTasks)
        await blockTasks(featureId, phase, root).catch(() => { });
})().catch((err) => {
    process.stderr.write(`set-phase-blocked: ${err.message}\n`);
    process.exit(1);
});
//# sourceMappingURL=set-phase-blocked.js.map