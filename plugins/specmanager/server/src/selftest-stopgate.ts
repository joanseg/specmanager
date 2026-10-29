// Stop-gate smoke test — hooks/stop-gate.sh driven end-to-end with synthetic
// SubagentStop JSON and fixture builder transcripts carrying a `Dispatch:` line:
// no marker ⇒ pass, open dispatched tasks ⇒ exit 2, tests run only when the
// phase is done, the "none" marker skips the run, the per-dispatch N=3 cap
// blocks the one task and exits 0. Plus unit cases for core/dispatch.ts and
// resolveGateCard.
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
  listTasks,
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
  gateCounterKey,
  pickBlockTask,
  type GateHookInput,
  type Task,
} from "./core/index.js";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`ok — ${msg}`);
}

// dist/selftest-stopgate.js → plugin root is two levels up from server/dist.
const here = path.dirname(fileURLToPath(import.meta.url)); // .../server/dist
const PLUGIN_ROOT = path.resolve(here, "..", ".."); // .../plugins/specmanager
const HOOK = path.join(PLUGIN_ROOT, "hooks", "stop-gate.sh");

/** Builder transcript whose first user record carries `Dispatch: <dispatch>`. */
async function dispatchTranscript(root: string, dispatch: string): Promise<string> {
  const dir = path.join(root, "hook-transcripts");
  await fs.mkdir(dir, { recursive: true });
  const p = path.join(dir, `${dispatch.replace(/\W/g, "_")}.jsonl`);
  await fs.writeFile(p, `${userRecord(`Dispatch: ${dispatch}\nBuild it.`)}\n`, "utf8");
  return p;
}

/** Run the hook with a builder's SubagentStop JSON on stdin. */
function runHook(root: string, transcript: string, sessionId?: string): { code: number; stderr: string } {
  const input: GateHookInput = {
    hook_event_name: "SubagentStop",
    agent_type: "specmanager:builder",
    agent_id: "a-hook",
    last_assistant_message: "Done.",
    agent_transcript_path: transcript,
    ...(sessionId ? { session_id: sessionId } : {}),
  };
  const r = spawnSync("bash", [HOOK], {
    input: JSON.stringify(input),
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: PLUGIN_ROOT, SPECMANAGER_PROJECT_DIR: root },
    encoding: "utf8",
  });
  return { code: r.status ?? -1, stderr: r.stderr ?? "" };
}

const RESOLVER = path.join(here, "resolve-active-card.js");
const BLOCKER = path.join(here, "set-phase-blocked.js");

/** Run the blocker CLI with `args`; returns its exit code. */
function runBlocker(root: string, args: string[]): number {
  const r = spawnSync(process.execPath, [BLOCKER, ...args], {
    env: { ...process.env, SPECMANAGER_PROJECT_DIR: root },
    encoding: "utf8",
  });
  return r.status ?? -1;
}

/** Run the resolver CLI with `input` on stdin. */
function runResolver(root: string, input: string): { code: number; stdout: string } {
  const r = spawnSync(process.execPath, [RESOLVER], {
    input,
    env: { ...process.env, SPECMANAGER_PROJECT_DIR: root },
    encoding: "utf8",
  });
  return { code: r.status ?? -1, stdout: r.stdout ?? "" };
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

  // The CLI (plan 2.6): stdin = hook JSON, stdout = GateCard JSON or `null`, never a crash.
  for (const [input, label] of [["", "empty"], ["{not json", "garbage"], ["[1]", "non-object"]] as const) {
    const r = runResolver(root, input);
    assert(r.code === 0 && r.stdout === "null", `CLI: ${label} stdin prints null, exit 0`);
  }
  const cli = runResolver(root, JSON.stringify(hook()));
  const cliCard = JSON.parse(cli.stdout) as { featureId?: string; gatedTaskIds?: string[] } | null;
  assert(
    cli.code === 0 && cliCard?.featureId === feature.id && cliCard.gatedTaskIds?.[0] === k1.id,
    "CLI: a valid builder hook JSON prints the gate card"
  );

  await setActiveBuild({ featureId: "feat-deleted", phase: "core", sessionId: "sess-G" }, root);
  assert((await resolveGateCard(hook(), root)) === null, "gate card: deleted feature passes");
  assert((await readActiveBuild(root)) === null, "gate card: deleted feature clears the marker");
}

/** resolveGateCard fields (plan 2.5): runTests, counterKey, blockTaskId; no all-done guard. */
async function gateCardFieldCases(root: string): Promise<void> {
  const feature = await createFeature("Gate fields feature", root);
  const f1 = await createTask({ featureId: feature.id, title: "F1", phase: "core", complexity: 1 }, root);
  const f2 = await createTask({ featureId: feature.id, title: "F2", phase: "core", complexity: 1 }, root);
  await createTask({ featureId: feature.id, title: "F3", phase: "later", complexity: 1 }, root);
  await setActiveBuild({ featureId: feature.id, phase: "core", sessionId: "sess-F" }, root);

  const dir = path.join(root, "field-transcripts");
  await fs.mkdir(dir, { recursive: true });
  const transcript = async (name: string, prompt: string) => {
    const p = path.join(dir, name);
    await fs.writeFile(p, `${userRecord(prompt)}\n`, "utf8");
    return p;
  };
  const card = async (prompt: string) =>
    resolveGateCard(
      {
        hook_event_name: "SubagentStop",
        session_id: "sess-F",
        agent_type: "specmanager:builder",
        agent_transcript_path: await transcript(`${prompt.replace(/\W/g, "_")}.jsonl`, prompt),
      },
      root
    );
  const done = (id: string) =>
    updateTask({ id, featureId: feature.id, status: "done", artifacts: { files: ["f.ts"] } }, root);

  const open1 = await card(`Dispatch: ${f1.id}`);
  assert(open1?.runTests === false, "runTests: gated task open ⇒ false");
  assert(open1.counterKey === `${feature.slug}__core__${f1.id}`, "counterKey: <slug>__<phase>__<task id>");
  assert(open1.blockTaskId === f1.id, "blockTaskId: single-id dispatch blocks the dispatched task");

  const multi = await card(`Dispatch: ${f2.id}, ${f1.id}`);
  assert(multi?.counterKey === `${feature.slug}__core__${f1.id}+${f2.id}`, "counterKey: multi-id sorted, +-joined");
  assert((await card("Dispatch: bulk"))?.counterKey === `${feature.slug}__core__bulk`, "counterKey: bulk");
  assert(
    gateCounterKey("my slug", "ph/1", { taskIds: ["t:2", "t 1"], bulk: false }) === "my_slug__ph_1__t_1+t_2",
    "counterKey: [^A-Za-z0-9_.-] sanitised to _, the + joiner kept"
  );

  await done(f1.id);
  const otherOpen = await card(`Dispatch: ${f1.id}`);
  assert(
    otherOpen?.runTests === false && otherOpen.openTaskIds.length === 0,
    "runTests: gated done but another phase task open ⇒ false"
  );

  await done(f2.id);
  const allDone = await card(`Dispatch: ${f1.id}`);
  assert(allDone !== null, "gate card: an all-done phase still yields a card (no all-done guard)");
  assert(allDone.runTests === true, "runTests: gated done and phase otherwise done ⇒ true");
  assert((await readActiveBuild(root))?.featureId === feature.id, "gate card: all-done phase leaves the marker");
  await clearActiveBuild(root);

  // R4 pick ladder, pure.
  const t = (id: string, status: Task["status"], updatedAt: string, dependsOn: string[] = []) =>
    ({ id, status, updatedAt, dependsOn }) as Task;
  const ladder = [t("a", "todo", "2026-01-01", ["x"]), t("b", "in_progress", "2026-01-02"), t("x", "todo", "2026-01-03")];
  assert(pickBlockTask(ladder, ladder) === "b", "blockTaskId: first in_progress wins");
  const ready = [t("a", "todo", "2026-01-01", ["x"]), t("c", "blocked", "2026-01-02", ["d"]), t("e", "todo", "2026-01-03")];
  const all = [...ready, t("x", "todo", "2026-01-01"), t("d", "done", "2026-01-01")];
  assert(pickBlockTask(ready, all) === "c", "blockTaskId: else first not-done with dependsOn all done");
  const stuck = [t("a", "done", "2026-01-01"), t("b", "todo", "2026-01-02", ["z"]), t("c", "todo", "2026-01-03", ["z"])];
  assert(pickBlockTask(stuck, stuck) === "b", "blockTaskId: else first not-done");
  const finished = [t("a", "done", "2026-01-03"), t("b", "done", "2026-01-05"), t("c", "done", "2026-01-04")];
  assert(pickBlockTask(finished, finished) === "b", "blockTaskId: all done ⇒ latest updatedAt");
  assert(pickBlockTask([], []) === null, "blockTaskId: nothing gated ⇒ null");
}

async function main(): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "specmanager-stopgate-"));
  console.log(`tmp project: ${root}`);
  console.log(`hook: ${HOOK}`);
  const counterDir = path.join(root, ".claude/specs/.cache/stop-gate");
  const exists = (p: string) => fs.access(p).then(() => true, () => false);

  // 1. No marker → pass (exit 0, no stderr), even for a builder whose dispatched
  //    task is open in an unrelated feature.
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
  const u1 = await createTask({ featureId: unrelated.id, title: "U1", phase: "core", complexity: 2 }, root);
  await setPhaseMeta(unrelated.id, "core", { testCommand: "true", architectureRefs: [] }, root);
  assert((await readActiveBuild(root)) === null, "no active-build marker exists initially");
  const noMarker = runHook(root, await dispatchTranscript(root, u1.id));
  assert(noMarker.code === 0, "no-op pass when no marker exists despite an open dispatched task");
  assert(noMarker.stderr.trim() === "", "no-marker no-op writes no stderr");

  // In-flight feature: approved plan, one open core task.
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
  const t1Transcript = await dispatchTranscript(root, t1.id);

  // 2. Passing command but the dispatched task open → exit 2 naming it.
  await setActiveBuild({ featureId: feature.id, phase: "core" }, root);
  await setPhaseMeta(feature.id, "core", { testCommand: "true", architectureRefs: [] }, root);
  const openFail = runHook(root, t1Transcript);
  assert(openFail.code === 2, "exit 2 when the dispatched task is open");
  assert(openFail.stderr.includes(`not done: ${t1.id}`), "stderr names the open dispatched task");
  assert(openFail.stderr.includes("attempt 1/3"), "stderr counts the attempt");
  assert(
    await exists(path.join(counterDir, `${feature.slug}__core__${t1.id}`)),
    "the strike lands on the dispatch's own counter file"
  );

  // 2b. Session scoping: a marker owned by session A never gates session B's
  //     builder (no stderr, no strike); the owning session still gates.
  await setActiveBuild({ featureId: feature.id, phase: "core", sessionId: "sess-A" }, root);
  const other = runHook(root, t1Transcript, "sess-B");
  assert(other.code === 0, "another session's builder stop is a no-op pass");
  assert(other.stderr.trim() === "", "another session's builder stop writes no stderr");
  assert((await readActiveBuild(root))?.sessionId === "sess-A", "another session's stop leaves the marker intact");
  const owner = runHook(root, t1Transcript, "sess-A");
  assert(owner.code === 2, "the owning session's builder stop still gates");
  // setActiveBuild reset the budget (R3), so attempt 1/3 proves sess-B spent nothing.
  assert(owner.stderr.includes("attempt 1/3"), "only the owning session consumed the retry budget");

  // 3. Task done, phase otherwise done, passing command → exit 0. The pass
  //    deletes only this dispatch's counter; the marker stays for the build
  //    command to clear.
  const otherKey = path.join(counterDir, `${feature.slug}__core__task-999`);
  await fs.writeFile(otherKey, "2", "utf8");
  await updateTask({ id: t1.id, featureId: feature.id, status: "done", artifacts: { files: ["x.ts"] } }, root);
  const pass = runHook(root, t1Transcript, "sess-A");
  assert(pass.code === 0, "exit 0 when the phase is done and its command passes");
  assert(!(await exists(path.join(counterDir, `${feature.slug}__core__${t1.id}`))), "a pass deletes the dispatch's counter");
  assert(await exists(otherKey), "a pass leaves other dispatches' counters");
  assert((await readActiveBuild(root))?.featureId === feature.id, "the gate never clears the marker");

  // 4. "none" marker → never a test failure; an open dispatched task still gates.
  const t2 = await createTask({ featureId: feature.id, title: "T2", phase: "core", complexity: 1 }, root);
  const t2Transcript = await dispatchTranscript(root, t2.id);
  await setActiveBuild({ featureId: feature.id, phase: "core" }, root);
  await setPhaseMeta(feature.id, "core", { testCommand: "none", architectureRefs: [] }, root);
  const noneOpen = runHook(root, t2Transcript);
  assert(noneOpen.code === 2, "none-marker still fails on an open dispatched task");
  assert(!noneOpen.stderr.includes("tests failing"), "none-marker never reports a test failure");

  // 4b. "none" with the phase done → exit 0 (runTests true, nothing to run).
  await updateTask({ id: t2.id, featureId: feature.id, status: "done", artifacts: { files: ["y.ts"] } }, root);
  const noneDone = runHook(root, t2Transcript);
  assert(noneDone.code === 0 && noneDone.stderr.trim() === "", "none-marker + phase done → exit 0, no stderr");

  // 4c. clear_active_build → the next builder stop passes.
  await clearActiveBuild(root);
  assert(runHook(root, t2Transcript).code === 0, "no marker after clearActiveBuild → exit 0");

  // 5. Iteration cap: open task C1 among three, failing command (never run, the
  //    phase is open). The third strike blocks C1 alone and exits 0.
  const cap = await createFeature("Cap feature", root);
  const capPlan = await createDocument(
    { featureId: cap.id, stage: "plan", title: "Cap plan", body: "# Plan\n\n## Phase core — x\n**Exit test:** n/a\n" },
    root
  );
  await setStatus(capPlan.frontmatter.id, "approved", root);
  const c1 = await createTask({ featureId: cap.id, title: "C1", phase: "core", complexity: 2 }, root);
  await createTask({ featureId: cap.id, title: "C2", phase: "core", complexity: 1 }, root);
  await createTask({ featureId: cap.id, title: "C3", phase: "core", complexity: 1 }, root);
  await setActiveBuild({ featureId: cap.id, phase: "core" }, root);
  await setPhaseMeta(cap.id, "core", { testCommand: "false", architectureRefs: [] }, root);
  const c1Transcript = await dispatchTranscript(root, c1.id);

  const a1 = runHook(root, c1Transcript);
  assert(a1.code === 2, "cap attempt 1 → exit 2");
  assert(!a1.stderr.includes("tests failing"), "tests are not run while the dispatched task is open");
  assert(runHook(root, c1Transcript).code === 2, "cap attempt 2 → exit 2");
  const a3 = runHook(root, c1Transcript);
  assert(a3.code === 0, "cap attempt 3 → exit 0 (the builder returns)");
  assert(a3.stderr.includes(`${c1.id} BLOCKED`), "cap stderr names the one blocked task");
  assert(a3.stderr.includes("resets the retry budget"), "cap stderr says a rebuild resets the budget");
  const capTasks = (await listTasks(cap.id, root)).filter((x) => x.phase === "core");
  assert(capTasks.map((x) => x.status).join(",") === "blocked,todo,todo", "cap blocks only the dispatched task");
  const capNote = (await readTasksMeta(cap.id, root)).blocked["core"];
  assert(capNote?.startsWith(`${c1.id}: iteration cap (3) reached`), "cap: meta.blocked note leads with the task id");
  assert(!(await exists(path.join(counterDir, `${cap.slug}__core__${c1.id}`))), "cap clears the dispatch's counter");

  // A blocked task counts as open, and the budget starts over.
  const a4 = runHook(root, c1Transcript);
  assert(a4.code === 2 && a4.stderr.includes("attempt 1/3"), "after the cap the next fail is attempt 1/3 again");

  // The shim directly: a task id blocks that task only; anything else is refused.
  await updateTask({ id: c1.id, featureId: cap.id, status: "todo" }, root);
  assert(runBlocker(root, [cap.id, "core", "task-002", "iteration cap (3) reached: tests failed"]) === 0, "set-phase-blocked with a task id exits 0");
  assert(
    (await listTasks(cap.id, root)).map((x) => x.status).join(",") === "todo,blocked,todo",
    "R4: only the named task is blocked; the others keep their status"
  );
  assert(
    (await readTasksMeta(cap.id, root)).blocked["core"] === "task-002: iteration cap (3) reached: tests failed",
    "R4: meta.blocked note leads with the task id"
  );
  await updateTask({ id: "task-002", featureId: cap.id, status: "todo" }, root);
  assert(runBlocker(root, [cap.id, "core", "iteration cap reached"]) === 1, "set-phase-blocked without a task id exits 1");
  assert(
    (await listTasks(cap.id, root)).every((x) => x.status === "todo") &&
      (await readTasksMeta(cap.id, root)).blocked["core"]?.startsWith("task-002:"),
    "set-phase-blocked without a task id writes nothing"
  );

  // ── Absent-testCommand path (Q5) ────────────────────────────────────────────
  // A plan with no meta.phases entry: testCommand is null and the plan's
  // **Exit test:** line is the only fallback, run once the phase is done.

  // 6. Exit test containing `npm ` runs when the phase is done; its failure
  //    gates with the test tail. `false` fails without shelling out to npm.
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
  const r1 = await createTask({ featureId: rung2.id, title: "R1", phase: "core", complexity: 2 }, root);
  await setActiveBuild({ featureId: rung2.id, phase: "core" }, root);
  assert((await readTasksMeta(rung2.id, root)).phases["core"] === undefined, "rung-2 feature has no meta.phases entry");
  await updateTask({ id: r1.id, featureId: rung2.id, status: "done", artifacts: { files: ["r.ts"] } }, root);
  const rung2Run = runHook(root, await dispatchTranscript(root, r1.id));
  assert(rung2Run.code === 2, "phase done + runnable exit test → it runs and its failure gates");
  assert(rung2Run.stderr.includes("tests failing") && rung2Run.stderr.includes("npm run build"), "stderr names the exit-test line that ran");

  // 7. A prose-only exit test never runs, even with a failing project-root
  //    `npm test` present. Open tasks gate; a done phase exits 0.
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
  const p1Transcript = await dispatchTranscript(root, p1.id);
  await setActiveBuild({ featureId: prose.id, phase: "core" }, root);
  const proseOpen = runHook(root, p1Transcript);
  assert(proseOpen.code === 2, "prose exit test → the open dispatched task still gates");
  assert(!proseOpen.stderr.includes("tests failing"), "no command is inferred from a project-root package.json");
  await updateTask({ id: p1.id, featureId: prose.id, status: "done", artifacts: { files: ["p.ts"] } }, root);
  const proseDone = runHook(root, p1Transcript);
  assert(proseDone.code === 0, "prose exit test + phase done → exit 0");
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
  await gateCardFieldCases(root);

  console.log("\nAll Stop-gate assertions passed.");
  console.log(`Inspect the tmp project at: ${root}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
