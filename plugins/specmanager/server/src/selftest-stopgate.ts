// R1 smoke test — the Stop-gate hook (hooks/stop-gate.sh) driven end-to-end with
// the marker-first resolveActiveCard: no marker ⇒ no-op (the bug fix), an
// explicit active-build marker pins the gate to one {featureId, phase}, exit 2
// on a failing command / open tasks, the "none" marker skips the run, a
// stale/finished marker auto-clears, and the N=3 iteration cap surfaces the
// phase as blocked + exits 0.
//
// Usage: node dist/selftest-stopgate.js

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import {
  initProject,
  createFeature,
  createDocument,
  setStatus,
  createTask,
  updateTask,
  setPhaseMeta,
  readTasksMeta,
  setActiveBuild,
  clearActiveBuild,
  readActiveBuild,
  stopGateDir,
  parseDispatchLine,
  readDispatchPrompt,
  dispatchKey,
  readHandbackMessage,
  resolveGateCard,
  type GateHookInput,
} from "./core/index.js";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`ok — ${msg}`);
}

// dist/selftest-stopgate.js → plugin root is two levels up from server/dist.
const here = path.dirname(fileURLToPath(import.meta.url)); // .../server/dist
const PLUGIN_ROOT = path.resolve(here, "..", ".."); // .../plugins/specmanager
const HOOK = path.join(PLUGIN_ROOT, "hooks", "stop-gate.sh");

function runHook(root: string, sessionId?: string): { code: number; stderr: string } {
  const r = spawnSync("bash", [HOOK], {
    input: JSON.stringify(sessionId ? { session_id: sessionId } : {}),
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: PLUGIN_ROOT, SPECMANAGER_PROJECT_DIR: root },
    encoding: "utf8",
  });
  return { code: r.status ?? -1, stderr: r.stderr ?? "" };
}

/** First transcript record, shaped on a real Claude Code subagent transcript. */
function userRecord(content: unknown): string {
  return JSON.stringify({
    parentUuid: null,
    isSidechain: true,
    agentId: "a5a6fee096b88fb8e",
    type: "user",
    message: { role: "user", content },
    uuid: "3b0d3545-8abc-4cac-8968-fb362e17ac3f",
  });
}

/** core/dispatch.ts: the `Dispatch:` line parser, transcript reader and counter key. */
async function dispatchUnitCases(root: string): Promise<void> {
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

  assert(
    same(parseDispatchLine("Dispatch: task-007\nBuild it."), { taskIds: ["task-007"], bulk: false }),
    "dispatch: single id parses"
  );
  assert(
    same(parseDispatchLine("Dispatch: task-007,task-008 ,  task-007"), {
      taskIds: ["task-007", "task-008"],
      bulk: false,
    }),
    "dispatch: comma list parses, spaces optional, duplicates dropped"
  );
  assert(same(parseDispatchLine("Dispatch: bulk"), { taskIds: [], bulk: true }), "dispatch: bulk parses");
  assert(
    same(parseDispatchLine("Intro\nDispatch: nope here\nDispatch: task-002\nDispatch: task-003"), {
      taskIds: ["task-002"],
      bulk: false,
    }),
    "dispatch: first valid line wins, a malformed line is skipped"
  );
  assert(parseDispatchLine("Build task-007. Dispatch: task-007") === null, "dispatch: line must start the line");
  assert(parseDispatchLine("Dispatch:") === null, "dispatch: empty value is null");
  assert(parseDispatchLine("No line here") === null, "dispatch: absent line is null");

  assert(dispatchKey({ taskIds: [], bulk: true }) === "bulk", "dispatchKey: bulk");
  assert(dispatchKey({ taskIds: ["task-007"], bulk: false }) === "task-007", "dispatchKey: single id");
  assert(
    dispatchKey({ taskIds: ["task-008", "task-007"], bulk: false }) === "task-007+task-008",
    "dispatchKey: ids sorted and +-joined"
  );

  const dir = path.join(root, "transcripts");
  await fs.mkdir(dir, { recursive: true });
  const write = async (name: string, body: string) => {
    const p = path.join(dir, name);
    await fs.writeFile(p, body, "utf8");
    return p;
  };
  const later = JSON.stringify({ type: "user", message: { content: "Dispatch: task-999" } });

  const str = await write("string.jsonl", `${userRecord("Dispatch: task-002\nProbe only.")}\n${later}\n`);
  assert(
    (await readDispatchPrompt(str)) === "Dispatch: task-002\nProbe only.",
    "reader: string content, first user record only"
  );
  const blocks = await write(
    "blocks.jsonl",
    `${JSON.stringify({ type: "system" })}\n${userRecord([
      { type: "text", text: "Dispatch: task-001, task-003" },
      { type: "image", source: {} },
      { type: "text", text: "Build them." },
    ])}\n`
  );
  assert(
    (await readDispatchPrompt(blocks)) === "Dispatch: task-001, task-003\nBuild them.",
    "reader: array of text blocks joined, non-user records skipped"
  );
  assert((await readDispatchPrompt(path.join(dir, "missing.jsonl"))) === null, "reader: missing file is null");
  assert((await readDispatchPrompt(await write("empty.jsonl", ""))) === null, "reader: empty file is null");
  assert((await readDispatchPrompt(await write("bad.jsonl", "{not json\n"))) === null, "reader: bad JSON is null");
}

/** resolveGateCard pass conditions (plan 2.4): each returns null; a gated stop returns a card. */
async function gateCardPassCases(root: string): Promise<void> {
  const feature = await createFeature("Gate card feature", root);
  const k1 = await createTask({ featureId: feature.id, title: "K1", phase: "core", complexity: 1 }, root);
  const k2 = await createTask({ featureId: feature.id, title: "K2", phase: "core", complexity: 1 }, root);
  const k3 = await createTask({ featureId: feature.id, title: "K3", phase: "later", complexity: 1 }, root);
  await updateTask({ id: k2.id, featureId: feature.id, status: "done", artifacts: { files: ["k.ts"] } }, root);

  const dir = path.join(root, "gate-transcripts");
  await fs.mkdir(dir, { recursive: true });
  const transcript = async (name: string, ...records: string[]) => {
    const p = path.join(dir, name);
    await fs.writeFile(p, records.map((r) => `${r}\n`).join(""), "utf8");
    return p;
  };
  const assistant = (content: unknown) => JSON.stringify({ type: "assistant", message: { role: "assistant", content } });
  const one = await transcript("one.jsonl", userRecord(`Dispatch: ${k1.id}\nBuild it.`));
  const hook = (over: Partial<GateHookInput> = {}): GateHookInput => ({
    hook_event_name: "SubagentStop",
    session_id: "sess-G",
    agent_type: "specmanager:builder",
    agent_id: "a1",
    last_assistant_message: "Done.",
    agent_transcript_path: one,
    ...over,
  });

  await clearActiveBuild(root);
  assert((await resolveGateCard(hook(), root)) === null, "gate card: no marker passes");
  await setActiveBuild({ featureId: feature.id, phase: "core", sessionId: "sess-G" }, root);

  const card = await resolveGateCard(hook(), root);
  assert(card !== null && card.featureId === feature.id && card.phase === "core", "gate card: a builder stop is gated");
  assert(JSON.stringify(card.gatedTaskIds) === JSON.stringify([k1.id]), "gate card: gated set is the dispatched id");
  assert(JSON.stringify(card.openTaskIds) === JSON.stringify([k1.id]), "gate card: openTaskIds = gated not done");
  assert(card.bulk === false, "gate card: per-task dispatch is not bulk");

  assert((await resolveGateCard(hook({ hook_event_name: "Stop" }), root)) === null, "gate card: Stop event passes");
  assert((await resolveGateCard(hook({ agent_type: "specmanager:reviewer" }), root)) === null, "gate card: non-builder passes");
  assert((await resolveGateCard(hook({ agent_type: undefined }), root)) === null, "gate card: missing agent_type passes");
  assert((await resolveGateCard(hook({ session_id: "sess-other" }), root)) === null, "gate card: another session passes");
  assert((await readActiveBuild(root))?.featureId === feature.id, "gate card: another session leaves the marker");

  assert((await resolveGateCard(hook({ agent_transcript_path: undefined }), root)) === null, "gate card: no transcript path passes");
  assert(
    (await resolveGateCard(hook({ agent_transcript_path: path.join(dir, "missing.jsonl") }), root)) === null,
    "gate card: unreadable transcript passes"
  );
  assert((await resolveGateCard(hook({ agent_transcript_path: await transcript("empty.jsonl") }), root)) === null, "gate card: empty transcript passes");
  const noLine = await transcript("no-line.jsonl", userRecord("Build task-001 please."));
  assert((await resolveGateCard(hook({ agent_transcript_path: noLine }), root)) === null, "gate card: no Dispatch: line passes");
  const bad = await transcript("bad-line.jsonl", userRecord("Dispatch: task 001"));
  assert((await resolveGateCard(hook({ agent_transcript_path: bad }), root)) === null, "gate card: unparseable Dispatch: line passes");

  const outside = await transcript("outside.jsonl", userRecord(`Dispatch: ${k3.id}, task-999`));
  assert((await resolveGateCard(hook({ agent_transcript_path: outside }), root)) === null, "gate card: ids all outside the phase pass");
  const mixed = await transcript("mixed.jsonl", userRecord(`Dispatch: task-999, ${k3.id}, ${k2.id}, ${k1.id}`));
  const mixedCard = await resolveGateCard(hook({ agent_transcript_path: mixed }), root);
  assert(
    JSON.stringify(mixedCard?.gatedTaskIds) === JSON.stringify([k1.id, k2.id]),
    "gate card: outside ids drop out, the rest are gated in tasks.json order"
  );
  const bulk = await transcript("bulk.jsonl", userRecord("Dispatch: bulk"));
  const bulkCard = await resolveGateCard(hook({ agent_transcript_path: bulk }), root);
  assert(
    bulkCard?.bulk === true && JSON.stringify(bulkCard.gatedTaskIds) === JSON.stringify([k1.id, k2.id]),
    "gate card: bulk gates the whole phase"
  );

  assert(
    (await resolveGateCard(hook({ last_assistant_message: "NEEDS_HUMAN: test account" }), root)) === null,
    "gate card: NEEDS_HUMAN: in last_assistant_message passes"
  );
  assert(
    (await resolveGateCard(hook({ last_assistant_message: "\n  NEEDS_HUMAN: creds" }), root)) === null,
    "gate card: NEEDS_HUMAN: after leading whitespace passes"
  );
  assert(
    (await resolveGateCard(hook({ last_assistant_message: "Stopped. NEEDS_HUMAN: creds" }), root)) !== null,
    "gate card: NEEDS_HUMAN: mid-text is not a hand-back"
  );
  const handback = await transcript(
    "handback.jsonl",
    userRecord(`Dispatch: ${k1.id}`),
    assistant([{ type: "tool_use", id: "t1", name: "SubagentHandback", input: { message: "NEEDS_HUMAN: probe" } }])
  );
  assert((await readHandbackMessage(handback)) === "NEEDS_HUMAN: probe", "reader: SubagentHandback message read");
  assert(
    (await resolveGateCard(hook({ agent_transcript_path: handback, last_assistant_message: "" }), root)) === null,
    "gate card: NEEDS_HUMAN: in a SubagentHandback call passes"
  );
  const earlier = await transcript(
    "earlier.jsonl",
    userRecord(`Dispatch: ${k1.id}`),
    assistant([{ type: "text", text: "NEEDS_HUMAN: maybe" }])
  );
  assert((await readHandbackMessage(earlier)) === null, "reader: plain assistant text is not a hand-back");
  assert(
    (await resolveGateCard(hook({ agent_transcript_path: earlier }), root)) !== null,
    "gate card: an earlier NEEDS_HUMAN: text in the transcript does not pass"
  );

  await setActiveBuild({ featureId: "feat-deleted", phase: "core", sessionId: "sess-G" }, root);
  assert((await resolveGateCard(hook(), root)) === null, "gate card: deleted feature passes");
  assert((await readActiveBuild(root)) === null, "gate card: deleted feature clears the marker");
}

async function main(): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "specmanager-stopgate-"));
  console.log(`tmp project: ${root}`);
  console.log(`hook: ${HOOK}`);

  // 1. No marker → no-op pass (exit 0) even with an unrelated open-task feature.
  //    This is the exact shipped bug: a project-wide scan would lock onto this
  //    feature and demand a build. The marker-first resolver returns null.
  await initProject(root);
  const unrelated = await createFeature("Unrelated feature", root);
  const unrelatedPlan = await createDocument(
    {
      featureId: unrelated.id,
      stage: "plan",
      title: "Unrelated plan",
      body: "# Plan\n\n## Phase core — x\n**Exit test:** echo ok\n",
    },
    root
  );
  await setStatus(unrelatedPlan.frontmatter.id, "approved", root);
  await createTask({ featureId: unrelated.id, title: "U1", phase: "core", complexity: 2 }, root);
  await setPhaseMeta(unrelated.id, "core", { testCommand: "true", architectureRefs: [] }, root);
  assert((await readActiveBuild(root)) === null, "no active-build marker exists initially");
  const noMarker = runHook(root);
  assert(noMarker.code === 0, "no-op pass when no marker exists despite an unrelated open-task feature");
  assert(noMarker.stderr.trim() === "", "no-marker no-op writes no stderr");

  // Set up the in-flight feature with an approved plan + one open core task.
  const feature = await createFeature("Gate feature", root);
  const plan = await createDocument(
    {
      featureId: feature.id,
      stage: "plan",
      title: "Gate plan",
      body: "# Plan\n\n## Phase core — x\n**Exit test:** echo ok\n",
    },
    root
  );
  await setStatus(plan.frontmatter.id, "approved", root);
  const t1 = await createTask({ featureId: feature.id, title: "T1", phase: "core", complexity: 2 }, root);

  // 2. Marker pins the gate. Passing command but open task → exit 2.
  await setActiveBuild({ featureId: feature.id, phase: "core" }, root);
  await setPhaseMeta(feature.id, "core", { testCommand: "true", architectureRefs: [] }, root);
  const openFail = runHook(root);
  assert(openFail.code === 2, "exit 2 when the pinned phase has open tasks");
  assert(openFail.stderr.includes("not done"), "stderr names the open task");

  // 2b. Session scoping: a marker owned by session A never gates session B's
  //     stop (no stderr, no counter bump); the owning session still gates.
  await setActiveBuild({ featureId: feature.id, phase: "core", sessionId: "sess-A" }, root);
  const other = runHook(root, "sess-B");
  assert(other.code === 0, "another session's stop is a no-op pass");
  assert(other.stderr.trim() === "", "another session's stop writes no stderr");
  assert((await readActiveBuild(root))?.sessionId === "sess-A", "another session's stop leaves the marker intact");
  const owner = runHook(root, "sess-A");
  assert(owner.code === 2, "the owning session's stop still gates");
  // setActiveBuild reset the budget (R3), so attempt 1/3 proves sess-B spent nothing.
  assert(owner.stderr.includes("attempt 1/3"), "only the owning session consumed the retry budget");
  await setActiveBuild({ featureId: feature.id, phase: "core" }, root);
  // Restore the one-attempt budget the later cases expect.
  await fs.writeFile(path.join(root, ".claude/specs/.cache/stop-gate", `${feature.slug}__core`), "1", "utf8");

  // 3. Passing command + task done → false-in-flight guard clears the marker, exit 0.
  await updateTask({ id: t1.id, featureId: feature.id, status: "done", artifacts: { files: ["x.ts"] } }, root);
  const pass = runHook(root);
  assert(pass.code === 0, "exit 0 when command passes and all pinned-phase tasks done");
  assert((await readActiveBuild(root)) === null, "finished phase auto-clears the marker (false-in-flight guard)");

  // 4. "none" marker → skip the run, verify criteria only. Re-pin the marker and
  //    add a second open task so the phase is in flight again; none-marker must
  //    not fabricate a test failure, but the open task still fails criteria.
  const t2 = await createTask({ featureId: feature.id, title: "T2", phase: "core", complexity: 1 }, root);
  await setActiveBuild({ featureId: feature.id, phase: "core" }, root);
  await setPhaseMeta(feature.id, "core", { testCommand: "none", architectureRefs: [] }, root);
  const noneOpen = runHook(root);
  assert(noneOpen.code === 2, "none-marker still fails on open tasks (criteria only)");
  assert(!noneOpen.stderr.includes("tests failing"), "none-marker never reports a test failure");

  // 4b. Clear-on-done: mark the task done + clearActiveBuild → next stop no-ops.
  await updateTask({ id: t2.id, featureId: feature.id, status: "done", artifacts: { files: ["y.ts"] } }, root);
  await clearActiveBuild(root);
  const cleared = runHook(root);
  assert(cleared.code === 0, "clear-on-done: no marker after clearActiveBuild → exit 0");

  // 4c. Stale-marker guard: pin a marker on a phase whose tasks are all done →
  //     guard returns null, exit 0, and the marker is auto-cleared.
  await setActiveBuild({ featureId: feature.id, phase: "core" }, root);
  const stale = runHook(root);
  assert(stale.code === 0, "stale marker (phase all done) → exit 0");
  assert((await readActiveBuild(root)) === null, "stale marker auto-cleared after the guard fires");

  // 5. Iteration cap: failing command + open task, pinned via its own marker.
  const cap = await createFeature("Cap feature", root);
  const capPlan = await createDocument(
    { featureId: cap.id, stage: "plan", title: "Cap plan", body: "# Plan\n\n## Phase core — x\n**Exit test:** n/a\n" },
    root
  );
  await setStatus(capPlan.frontmatter.id, "approved", root);
  await createTask({ featureId: cap.id, title: "C1", phase: "core", complexity: 2 }, root);
  // Pin the marker to the cap feature explicitly — resolution never scans.
  await setActiveBuild({ featureId: cap.id, phase: "core" }, root);
  await setPhaseMeta(cap.id, "core", { testCommand: "false", architectureRefs: [] }, root);

  const a1 = runHook(root);
  assert(a1.code === 2, "cap attempt 1 → exit 2");
  const a2 = runHook(root);
  assert(a2.code === 2, "cap attempt 2 → exit 2");
  const a3 = runHook(root);
  assert(a3.code === 0, "cap attempt 3 → exit 0 (blocked, no infinite loop)");
  assert(a3.stderr.includes("BLOCKED"), "cap attempt 3 stderr announces BLOCKED");

  const meta = await readTasksMeta(cap.id, root);
  assert(typeof meta.blocked["core"] === "string", "blocked note recorded for the phase");

  // Counter reset after cap: a fresh fail starts the budget over (exit 2 again).
  // The cap phase still has its open task and the marker is still pinned.
  const a4 = runHook(root);
  assert(a4.code === 2, "counter reset after cap → next fail is exit 2 again");

  // ── Absent-testCommand path (Q5) ────────────────────────────────────────────
  // Every case above pins an explicit meta.testCommand. These two cover the
  // opposite: a plan with no meta.phases entry at all (12 of 16 plans in this
  // repo), where testCommand resolves to null. Rung 2 (the plan's **Exit test:**
  // line) is the only fallback — the project-root probe ladder is deleted.

  // 6. No meta.phases + an exit test containing `npm ` → rung 2 runs it.
  //    The command fails deterministically without shelling out to npm; the
  //    `npm ` token is what makes rung 2 select the line, and the failure text
  //    proves the selected line was actually executed.
  const rung2 = await createFeature("Rung two feature", root);
  const rung2Plan = await createDocument(
    {
      featureId: rung2.id,
      stage: "plan",
      title: "Rung two plan",
      body: "# Plan\n\n## Phase core — x\n**Exit test:** false # npm run build\n",
    },
    root
  );
  await setStatus(rung2Plan.frontmatter.id, "approved", root);
  await createTask({ featureId: rung2.id, title: "R1", phase: "core", complexity: 2 }, root);
  await setActiveBuild({ featureId: rung2.id, phase: "core" }, root);
  const rung2Meta = await readTasksMeta(rung2.id, root);
  assert(rung2Meta.phases["core"] === undefined, "rung-2 feature has no meta.phases entry (testCommand absent)");
  const rung2Run = runHook(root);
  assert(rung2Run.code === 2, "absent testCommand + runnable exit test → rung 2 runs it and its failure gates");
  assert(rung2Run.stderr.includes("npm run build"), "stderr names the exit-test line rung 2 resolved");

  // 7. No meta.phases + a prose-only exit test → nothing runs, even with a
  //    failing project-root `npm test` present (what the deleted probe would
  //    have found). Criteria-only: open tasks gate, all-done exits 0.
  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ name: "probe-bait", scripts: { test: "exit 1" } }, null, 2),
    "utf8"
  );
  const prose = await createFeature("Prose exit test feature", root);
  const prosePlan = await createDocument(
    {
      featureId: prose.id,
      stage: "plan",
      title: "Prose plan",
      body: "# Plan\n\n## Phase core — x\n**Exit test:** manual review of the rendered board\n",
    },
    root
  );
  await setStatus(prosePlan.frontmatter.id, "approved", root);
  const p1 = await createTask({ featureId: prose.id, title: "P1", phase: "core", complexity: 2 }, root);
  await setActiveBuild({ featureId: prose.id, phase: "core" }, root);
  const proseOpen = runHook(root);
  assert(proseOpen.code === 2, "absent testCommand + prose exit test → open tasks still gate");
  assert(
    !proseOpen.stderr.includes("tests failing"),
    "no command is inferred from a project-root package.json (probe ladder deleted)"
  );
  await updateTask({ id: p1.id, featureId: prose.id, status: "done", artifacts: { files: ["p.ts"] } }, root);
  const proseDone = runHook(root);
  assert(proseDone.code === 0, "absent testCommand + prose exit test + all tasks done → exit 0");
  assert(proseDone.stderr.trim() === "", "criteria-only pass writes no stderr");

  // ── R3 core: setActiveBuild resets the phase's retry counters ──────────────
  // Legacy `<slug>__<phase>` and per-dispatch `<slug>__<phase>__*` files go;
  // another phase's counter and a prefix-only lookalike stay.
  const dir = stopGateDir(root);
  await fs.mkdir(dir, { recursive: true });
  const seeded = [
    `${cap.slug}__core`,
    `${cap.slug}__core__task-001`,
    `${cap.slug}__core__bulk`,
    `${cap.slug}__other`,
    `${cap.slug}__coreX`,
  ];
  for (const name of seeded) await fs.writeFile(path.join(dir, name), "2", "utf8");
  await setActiveBuild({ featureId: cap.id, phase: "core" }, root);
  const left = (await fs.readdir(dir)).sort();
  assert(!left.includes(`${cap.slug}__core`), "R3: legacy phase counter deleted at build start");
  assert(
    !left.some((n) => n.startsWith(`${cap.slug}__core__`)),
    "R3: every per-dispatch counter of the phase deleted at build start"
  );
  assert(
    left.includes(`${cap.slug}__other`) && left.includes(`${cap.slug}__coreX`),
    "R3: other phases' counters and prefix lookalikes survive"
  );

  await dispatchUnitCases(root);
  await gateCardPassCases(root);

  console.log("\nAll R1 Stop-gate assertions passed.");
  console.log(`Inspect the tmp project at: ${root}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
