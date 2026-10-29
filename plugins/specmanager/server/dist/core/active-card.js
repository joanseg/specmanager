// R1 — marker-first active-card resolution, shared by the Stop-gate hook so
// discovery lives in core (TS), not bash heuristics. Resolution is pinned to the
// explicit active-build marker (`.cache/active-build.json`) written by
// /specmanager-build: no marker ⇒ no build in flight ⇒ return null (the gate is
// a no-op pass). The marker carries {featureId, phase}, so the gate can only ever
// target the phase the build is actually on — never an unrelated feature with
// open tasks. Returns the active phase's verification target (meta.testCommand
// primary, plan.md **Exit test:** line as fallback). Never invents a failure.
import fs from "node:fs/promises";
import { projectRoot } from "./paths.js";
import { findFeatureById } from "./features.js";
import { listTasks, readTasksMeta } from "./tasks.js";
import { listDocuments } from "./documents.js";
import { readActiveBuild, clearActiveBuild } from "./active-build.js";
import { matchPhaseHeading } from "./spec-slice.js";
import { parseDispatchLine, readDispatchPrompt, readHandbackMessage, dispatchKey } from "./dispatch.js";
/** Extract the `**Exit test:**` line for a phase section from plan.md body. */
function exitTestForPhase(planBody, phase) {
    const lines = planBody.split("\n");
    let inPhase = false;
    for (const line of lines) {
        const heading = matchPhaseHeading(line);
        if (heading !== null) {
            inPhase = heading.toLowerCase() === phase.toLowerCase();
            continue;
        }
        if (inPhase) {
            const m = line.match(/\*\*Exit test:\*\*\s*(.+)/i);
            if (m)
                return m[1].trim();
        }
    }
    return null;
}
/**
 * Resolve the active card from the explicit active-build marker. No marker ⇒
 * null (no build in flight). The marker pins resolution to one {featureId,
 * phase}; a stale/finished marker (pinned phase with no open tasks) or a marker
 * for a deleted feature is cleared and resolves to null. Never enumerates other
 * features, so an unrelated feature with open tasks can never trigger the gate.
 * A marker owned by a different session than `sessionId` resolves to null, so a
 * concurrent session in the same project never gates on (or spends the retry
 * budget of) another session's build.
 */
export async function resolveActiveCard(root = projectRoot(), sessionId = null) {
    const marker = await readActiveBuild(root);
    if (!marker)
        return null; // no build in flight ⇒ the gate is a no-op pass
    // Another session's build ⇒ not ours to gate (legacy null-owner markers still gate).
    if (marker.sessionId && sessionId && marker.sessionId !== sessionId)
        return null;
    const feature = await findFeatureById(marker.featureId, root);
    if (!feature) {
        // Marker points at a deleted feature ⇒ stale; clear it and no-op.
        await clearActiveBuild(root);
        return null;
    }
    const tasks = await listTasks(feature.id, root);
    const phaseTasks = tasks.filter((t) => t.phase === marker.phase);
    const openTaskIds = phaseTasks.filter((t) => t.status !== "done").map((t) => t.id);
    // False-in-flight guard: the pinned phase has no open tasks (finished, or a
    // crash-stale marker) ⇒ clear the marker and no-op. The gate never fires for a
    // completed or empty phase.
    if (openTaskIds.length === 0) {
        await clearActiveBuild(root);
        return null;
    }
    return { ...(await phaseTarget(feature, marker.phase, root)), openTaskIds };
}
/** The phase's verification target: testCommand, Exit-test fallback, architecture refs. */
async function phaseTarget(feature, phase, root) {
    const meta = await readTasksMeta(feature.id, root);
    const phaseMeta = meta.phases[phase];
    let exitTest = null;
    const planDoc = (await listDocuments({ featureId: feature.id, stage: "plan" }, root))[0];
    if (planDoc) {
        try {
            exitTest = exitTestForPhase(await fs.readFile(planDoc.filePath, "utf8"), phase);
        }
        catch {
            // plan body unreadable ⇒ no fallback exit-test line
        }
    }
    return {
        featureId: feature.id,
        slug: feature.slug,
        phase,
        testCommand: phaseMeta?.testCommand ?? null,
        exitTest,
        architectureRefs: phaseMeta?.architectureRefs ?? [],
    };
}
const BUILDER = "specmanager:builder";
const NEEDS_HUMAN = "NEEDS_HUMAN:";
/** The builder handed back `NEEDS_HUMAN:` — in its final reply, else in a SubagentHandback call. */
async function needsHuman(hook) {
    if (hook.last_assistant_message?.trimStart().startsWith(NEEDS_HUMAN))
        return true;
    if (!hook.agent_transcript_path)
        return false;
    const handback = await readHandbackMessage(hook.agent_transcript_path);
    return handback?.trimStart().startsWith(NEEDS_HUMAN) ?? false;
}
/** Dispatched tasks that belong to the phase, in tasks.json order; unknown ids drop out. */
function gatedTasks(dispatch, phaseTasks) {
    if (dispatch.bulk)
        return phaseTasks;
    return phaseTasks.filter((t) => dispatch.taskIds.includes(t.id));
}
/**
 * Counter file name for one dispatch: `<slug>__<phase>__<dispatchKey>`. The
 * `<slug>__<phase>` prefix is sanitised `[^A-Za-z0-9_.-]` → `_`, as
 * resetGateCounters does; the dispatch key keeps its `+` joiner.
 */
export function gateCounterKey(slug, phase, dispatch) {
    const prefix = `${slug}__${phase}`.replace(/[^A-Za-z0-9_.-]/g, "_");
    return `${prefix}__${dispatchKey(dispatch).replace(/[^A-Za-z0-9_.+-]/g, "_")}`;
}
/**
 * The task to block at the cap, among gated tasks in tasks.json order: the
 * first in_progress; else the first not-done whose dependsOn are all done;
 * else the first not-done; else (all done, tests red) the latest-updated.
 */
export function pickBlockTask(gated, allTasks) {
    const done = new Set(allTasks.filter((t) => t.status === "done").map((t) => t.id));
    const open = gated.filter((t) => t.status !== "done");
    const pick = gated.find((t) => t.status === "in_progress") ??
        open.find((t) => t.dependsOn.every((d) => done.has(d))) ??
        open[0] ??
        [...gated].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    return pick?.id ?? null;
}
/**
 * Resolve the gate card for a builder's SubagentStop. Returns null (the gate
 * passes, no strike) when: the event is not SubagentStop or the agent is not
 * the builder; no marker, another session's marker, or a deleted feature (the
 * marker is then cleared); the builder handed back `NEEDS_HUMAN:`; its
 * transcript has no readable dispatch prompt or no `Dispatch:` line; or no
 * dispatched id is in the marker's phase. Unlike resolveActiveCard there is no
 * all-done guard: a finished phase yields a card with `runTests: true`, so the
 * test leg runs exactly when the phase is done. The marker is cleared by the
 * build command, never here.
 */
export async function resolveGateCard(hook, root = projectRoot()) {
    if (hook.hook_event_name !== "SubagentStop" || hook.agent_type !== BUILDER)
        return null;
    const marker = await readActiveBuild(root);
    if (!marker)
        return null;
    if (marker.sessionId && hook.session_id && marker.sessionId !== hook.session_id)
        return null;
    const feature = await findFeatureById(marker.featureId, root);
    if (!feature) {
        await clearActiveBuild(root);
        return null;
    }
    if (await needsHuman(hook))
        return null;
    if (!hook.agent_transcript_path)
        return null;
    const prompt = await readDispatchPrompt(hook.agent_transcript_path);
    const dispatch = prompt === null ? null : parseDispatchLine(prompt);
    if (!dispatch)
        return null;
    const allTasks = await listTasks(feature.id, root);
    const phaseTasks = allTasks.filter((t) => t.phase === marker.phase);
    const gated = gatedTasks(dispatch, phaseTasks);
    if (gated.length === 0)
        return null;
    const openTaskIds = gated.filter((t) => t.status !== "done").map((t) => t.id);
    const phaseOpenTaskIds = phaseTasks.filter((t) => t.status !== "done").map((t) => t.id);
    return {
        ...(await phaseTarget(feature, marker.phase, root)),
        openTaskIds,
        gatedTaskIds: gated.map((t) => t.id),
        phaseOpenTaskIds,
        bulk: dispatch.bulk,
        runTests: openTaskIds.length === 0 && phaseOpenTaskIds.length === 0,
        counterKey: gateCounterKey(feature.slug, marker.phase, dispatch),
        blockTaskId: pickBlockTask(gated, allTasks),
    };
}
