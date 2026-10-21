// Phase 2 smoke test — boots board server against a tmp project,
// hits REST endpoints, opens a WS, and asserts file-change → event.

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import WebSocket from "ws";

import {
  createFeature,
  createDocument,
  createResearchDoc,
  initProject,
  pidFilePath,
  studyNotesDir,
  writeResearchDoc,
} from "./core/index.js";
import { startBoardServer, type BoardServer } from "./board-server.js";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`ok — ${msg}`);
}

async function pickPort(): Promise<number> {
  // Use a port unlikely to collide with the default 4317.
  return 4317 + Math.floor(Math.random() * 1000);
}

/** JSON request against the board; returns status and parsed body. */
async function call<T>(
  url: string,
  method = "GET",
  body?: unknown
): Promise<{ status: number; json: T }> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as T };
}

/** Resolve on the first WS `file.changed` event whose path matches, after `trigger` runs. */
function awaitFileChanged(
  port: number,
  match: (filePath: string) => boolean,
  trigger: () => Promise<void>
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("timed out waiting for file.changed event"));
    }, 4000);
    ws.on("open", () => void trigger());
    ws.on("message", (data) => {
      const event = JSON.parse(String(data)) as { type: string; filePath?: string };
      if (event.type === "file.changed" && match(event.filePath ?? "")) {
        clearTimeout(timer);
        ws.close();
        resolve(event.filePath!);
      }
    });
    ws.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Research REST routes: create a study, read/save a doc (incl. 409), hand off
 * `[S<n>]` build items (created, then skipped), unknown ids → 404, and a WS
 * `file.changed` for a note dropped in the study's `notes/`.
 */
async function researchChecks(board: BoardServer, root: string): Promise<void> {
  const api = board.url;

  const missing = await call<{ error: string }>(`${api}/api/studies`, "POST", { title: "x" });
  assert(missing.status === 400, "POST /api/studies without idea → 400");

  const created = await call<{ id: string; slug: string }>(`${api}/api/studies`, "POST", {
    title: "Oposiciones",
    idea: "Exam prep app",
  });
  assert(created.status === 200, "POST /api/studies → 200");
  const study = created.json;
  assert(study.id === "study-oposiciones", "study id derives from the title");

  const listed = await call<Array<{ id: string; nextStep: string }>>(`${api}/api/studies`);
  assert(listed.status === 200 && listed.json.length === 1, "GET /api/studies lists the study");
  assert(listed.json[0]!.nextStep === "market", "new study's next step is market");

  const one = await call<Array<{ id: string }>>(`${api}/api/studies?studyId=${study.id}`);
  assert(one.json.length === 1 && one.json[0]!.id === study.id, "GET /api/studies?studyId= filters");

  const unknownStudy = await call<{ error: string }>(`${api}/api/studies?studyId=study-nope`);
  assert(unknownStudy.status === 404, "GET /api/studies?studyId=<unknown> → 404");

  // Seed market → user-research (+ findings) through core, so strategy's gate opens.
  const market = await createResearchDoc(
    { studyId: study.id, kind: "market", title: "Market", body: "## Size\nsmall\n" },
    root
  );
  const marketId = market.frontmatter.id;

  const read = await call<{ id: string; body: string; version: number }>(
    `${api}/api/research/${marketId}`
  );
  assert(read.status === 200 && read.json.body.includes("small"), "GET /api/research/:id → body");

  const saved = await call<{ version: number; generatedBy: string }>(
    `${api}/api/research/${marketId}`,
    "PUT",
    { body: "## Size\nedited\n", baseVersion: 1 }
  );
  assert(saved.status === 200 && saved.json.version === 2, "PUT /api/research/:id bumps version");
  assert(saved.json.generatedBy === "human", "PUT /api/research/:id records generatedBy human");

  const stale = await call<{ error: string }>(`${api}/api/research/${marketId}`, "PUT", {
    body: "should fail",
    baseVersion: 1,
  });
  assert(stale.status === 409, "PUT /api/research/:id with stale baseVersion → 409");

  const unknownDoc = await call<{ error: string }>(`${api}/api/research/market-nope`);
  assert(unknownDoc.status === 404, "GET /api/research/<unknown> → 404");

  const dep = { dependsOn: [marketId], basedOn: { [marketId]: 2 } };
  const ur = await createResearchDoc(
    { studyId: study.id, kind: "user-research", title: "UR", ...dep },
    root
  );
  await writeResearchDoc(
    { id: ur.frontmatter.id, findings: ["2026-10-01-P1.md"], baseVersion: 1 },
    root
  );
  await createResearchDoc(
    {
      studyId: study.id,
      kind: "strategy",
      title: "Strategy",
      body: [
        "## What to build",
        "",
        "1. [S1] **Mock exams** — the core loop",
        "2. [S2] **Spaced repetition** — retention",
        "",
      ].join("\n"),
      dependsOn: [ur.frontmatter.id],
      basedOn: { [ur.frontmatter.id]: 2 },
    },
    root
  );

  type Handoff = { created: Array<{ id: string }>; skipped: Array<{ itemId: string }> };
  const handoffUrl = `${api}/api/studies/${study.id}/handoff`;
  const first = await call<Handoff>(handoffUrl, "POST", { itemIds: ["S1"] });
  assert(first.status === 200 && first.json.created.length === 1, "handoff S1 creates a feature");

  const second = await call<Handoff>(handoffUrl, "POST", { itemIds: ["S1", "S2"] });
  assert(
    second.json.created.length === 1 &&
      second.json.skipped.length === 1 &&
      second.json.skipped[0]!.itemId === "S1",
    "re-handoff skips S1 and creates S2"
  );

  const emptyIds = await call<{ error: string }>(handoffUrl, "POST", { itemIds: [] });
  assert(emptyIds.status === 400, "handoff with empty itemIds → 400");

  const badItem = await call<{ error: string }>(handoffUrl, "POST", { itemIds: ["S7"] });
  assert(badItem.status === 400, "handoff with an unknown build item → 400");

  const unknownHandoff = await call<{ error: string }>(
    `${api}/api/studies/study-nope/handoff`,
    "POST",
    { itemIds: ["S1"] }
  );
  assert(unknownHandoff.status === 404, "handoff on an unknown study → 404");

  const notePath = path.join(studyNotesDir(study.slug, root), "2026-10-02-P2.md");
  const changed = await awaitFileChanged(
    board.port,
    (p) => p.includes(`${path.sep}notes${path.sep}`),
    () => fs.writeFile(notePath, "masked note\n", "utf8")
  );
  assert(changed.endsWith("2026-10-02-P2.md"), "WS file.changed fires for a note dropped in notes/");
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Phase B reap/rebind assertion.
 *
 * Seeds a stale board.pid for a spawned-then-killed process, starts the board,
 * and asserts it reaps the stale PID and binds, that board.pid then names the
 * new live owner (this process), and that stop() removes the file.
 */
async function reapRebindCheck(): Promise<void> {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "specmanager-pid-"));
  const prevEnv = process.env.CLAUDE_PLUGIN_DATA;
  process.env.CLAUDE_PLUGIN_DATA = dataDir;
  try {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "specmanager-reap-"));
    await initProject(root);

    // Spawn a short-lived child, kill it, and record its (now stale) PID.
    const child = spawn("node", ["-e", "setTimeout(() => {}, 60000)"], {
      stdio: "ignore",
    });
    const stalePid = child.pid!;
    child.kill("SIGKILL");
    await sleep(50);
    // pidFilePath() is keyed on sha1(root), so it MUST be passed this test's
    // tmp `root` — the same one startBoardServer gets below. Calling it bare
    // resolves to projectRoot(), i.e. the real repo, so the test would write
    // and read the *live session's* pidfile while the board under test wrote
    // a different one, and the owner assertion could never pass. That bug was
    // masked until now: bare pidFilePath() threw on an unset
    // SPECMANAGER_PROJECT_DIR/CLAUDE_PROJECT_DIR before reaching the assert.
    await fs.writeFile(pidFilePath(root), String(stalePid), "utf8");

    const port = await pickPort();
    const board = await startBoardServer({ root, port });
    assert(board, `board reaped stale board.pid and bound on port ${port}`);
    if (!board) return;

    const owner = (await fs.readFile(pidFilePath(root), "utf8")).trim();
    assert(
      Number.parseInt(owner, 10) === process.pid,
      "board.pid now holds the new live owner (this process)"
    );

    await board.stop();
    let stillThere = true;
    try {
      await fs.access(pidFilePath(root));
    } catch {
      stillThere = false;
    }
    assert(!stillThere, "stop() removed board.pid");
  } finally {
    if (prevEnv === undefined) delete process.env.CLAUDE_PLUGIN_DATA;
    else process.env.CLAUDE_PLUGIN_DATA = prevEnv;
  }
}

async function main(): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "specmanager-board-"));
  console.log(`tmp project: ${root}`);

  await initProject(root);
  const feature = await createFeature("Checkout corridor", root);
  await createDocument(
    {
      featureId: feature.id,
      stage: "prd",
      title: "Checkout corridor PRD",
      body: "# PRD\nDraft.",
    },
    root
  );

  const port = await pickPort();
  const board = await startBoardServer({ root, port });
  assert(board, `board server bound on port ${port}`);
  if (!board) return;

  try {
    // GET /api/board
    const boardRes = await fetch(`${board.url}/api/board`);
    assert(boardRes.ok, "GET /api/board → 200");
    const boardJson = (await boardRes.json()) as { features: Array<{ id: string; documents: unknown[] }> };
    assert(boardJson.features.length === 1, "board has 1 feature");
    assert(boardJson.features[0]!.documents.length === 1, "feature has 1 doc");

    // GET /api/features
    const featuresRes = await fetch(`${board.url}/api/features`);
    assert(featuresRes.ok, "GET /api/features → 200");

    // GET /api/features/:id
    const featureRes = await fetch(`${board.url}/api/features/${feature.id}`);
    assert(featureRes.ok, "GET /api/features/:id → 200");
    const featureJson = (await featureRes.json()) as { documents: Array<{ id: string }>; tasks: unknown[] };
    assert(featureJson.documents.length === 1, "feature view has 1 doc");
    assert(Array.isArray(featureJson.tasks), "feature view returns tasks array");

    // GET /api/documents/:id
    const docId = featureJson.documents[0]!.id;
    const docRes = await fetch(`${board.url}/api/documents/${docId}`);
    assert(docRes.ok, "GET /api/documents/:id → 200");
    const docJson = (await docRes.json()) as { body: string };
    assert(docJson.body.includes("PRD"), "doc body returned");

    // GET /api/stale
    const staleRes = await fetch(`${board.url}/api/stale`);
    assert(staleRes.ok, "GET /api/stale → 200");

    // PUT /api/documents/:id — successful update bumps version
    const putRes = await fetch(`${board.url}/api/documents/${docId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: "# PRD\nEdited via REST.", baseVersion: 1 }),
    });
    assert(putRes.ok, "PUT /api/documents/:id → 200");
    const putJson = (await putRes.json()) as { version: number };
    assert(putJson.version === 2, "PUT bumps version to 2");

    // PUT with stale baseVersion → 409
    const conflictRes = await fetch(`${board.url}/api/documents/${docId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: "should fail", baseVersion: 1 }),
    });
    assert(conflictRes.status === 409, "PUT with stale baseVersion → 409");

    // POST /api/documents/:id/status — approve, then reopen
    const approveRes = await fetch(`${board.url}/api/documents/${docId}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    assert(approveRes.ok, "POST status=approved → 200");
    const approveJson = (await approveRes.json()) as { status: string };
    assert(approveJson.status === "approved", "approve persisted");

    const reopenRes = await fetch(`${board.url}/api/documents/${docId}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "draft" }),
    });
    assert(reopenRes.ok, "POST status=draft (reopen) → 200");

    // POST with bad status → 400
    const badRes = await fetch(`${board.url}/api/documents/${docId}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "nope" }),
    });
    assert(badRes.status === 400, "POST status=nope → 400");

    // GET /api/features/:id/gate — architecture gate fails because PRD is draft
    const gateRes = await fetch(
      `${board.url}/api/features/${feature.id}/gate?stage=architecture`
    );
    assert(gateRes.ok, "GET /api/features/:id/gate → 200");
    const gateJson = (await gateRes.json()) as { ok: boolean };
    assert(gateJson.ok === false, "architecture gate is closed when PRD is draft");

    // POST /api/features/:id/tasks — create a task
    const newTaskRes = await fetch(`${board.url}/api/features/${feature.id}/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Wire it up" }),
    });
    assert(newTaskRes.ok, "POST /api/features/:id/tasks → 200");
    const newTask = (await newTaskRes.json()) as { id: string; status: string };
    assert(newTask.status === "todo", "new task starts todo");

    // PATCH /api/features/:featureId/tasks/:taskId — set in_progress with artifacts
    const patchRes = await fetch(
      `${board.url}/api/features/${feature.id}/tasks/${newTask.id}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: "in_progress",
          artifacts: { commits: ["abc1234"], files: ["src/foo.ts"] },
        }),
      }
    );
    assert(patchRes.ok, "PATCH tasks → 200");
    const patched = (await patchRes.json()) as {
      status: string;
      artifacts: { commits: string[]; files: string[] };
    };
    assert(patched.status === "in_progress", "task status updated");
    assert(patched.artifacts.commits[0] === "abc1234", "task commit recorded");
    assert(patched.artifacts.files[0] === "src/foo.ts", "task file recorded");

    // PATCH to done → walkthrough gate now opens
    await fetch(`${board.url}/api/features/${feature.id}/tasks/${newTask.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    const wgateRes = await fetch(
      `${board.url}/api/features/${feature.id}/gate?stage=walkthrough`
    );
    const wgateJson = (await wgateRes.json()) as { ok: boolean };
    assert(wgateJson.ok === true, "walkthrough gate opens when all tasks done");

    // PATCH unknown task → 404
    const missingRes = await fetch(
      `${board.url}/api/features/${feature.id}/tasks/task-999`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      }
    );
    assert(missingRes.status === 404, "PATCH unknown task → 404");

    // ── Phase A: design stage round-trip + compound plan gate ────────────
    // Re-approve the PRD so design's gate (which mirrors architecture's) is open.
    await fetch(`${board.url}/api/documents/${docId}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });

    // Create an architecture draft.
    const archDoc = await createDocument(
      {
        featureId: feature.id,
        stage: "architecture",
        title: "Checkout corridor architecture",
        body: "# Architecture\nDraft.",
      },
      root
    );
    assert(archDoc.frontmatter.status === "draft", "architecture starts draft");

    // Gate state 1 — architecture draft, no design → plan CLOSED.
    let planGate = (await (
      await fetch(`${board.url}/api/features/${feature.id}/gate?stage=plan`)
    ).json()) as { ok: boolean; reason?: string };
    assert(planGate.ok === false, "plan gate closed when architecture draft (no design)");
    assert(
      (planGate.reason ?? "").includes("architecture"),
      "plan gate reason names architecture"
    );

    // Approve architecture.
    await fetch(`${board.url}/api/documents/${archDoc.frontmatter.id}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });

    // Gate state 2 — architecture approved, no design → plan OPEN.
    planGate = (await (
      await fetch(`${board.url}/api/features/${feature.id}/gate?stage=plan`)
    ).json()) as { ok: boolean; reason?: string };
    assert(planGate.ok === true, "plan gate open when architecture approved + no design");

    // Design stage gate must be open now that the PRD is approved.
    const designGate = (await (
      await fetch(`${board.url}/api/features/${feature.id}/gate?stage=design`)
    ).json()) as { ok: boolean };
    assert(designGate.ok === true, "design gate opens when PRD approved");

    // Create a design draft. Default filename should be mockups.html.
    const designDoc = await createDocument(
      {
        featureId: feature.id,
        stage: "design",
        title: "Checkout corridor mockups",
        body: '<section class="sm-screen"><h1>List view</h1></section>',
      },
      root
    );
    assert(
      designDoc.filePath.endsWith("/design/mockups.html"),
      "design doc lands at design/mockups.html"
    );

    // Gate state 3 — architecture approved, design draft → plan CLOSED.
    planGate = (await (
      await fetch(`${board.url}/api/features/${feature.id}/gate?stage=plan`)
    ).json()) as { ok: boolean; reason?: string };
    assert(
      planGate.ok === false,
      "plan gate closed when design is draft (design exists → must approve)"
    );
    assert(
      (planGate.reason ?? "").includes("design"),
      "plan gate reason names design when design is the blocker"
    );

    // Approve design.
    await fetch(`${board.url}/api/documents/${designDoc.frontmatter.id}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });

    // Gate state 4 — architecture approved, design approved → plan OPEN.
    planGate = (await (
      await fetch(`${board.url}/api/features/${feature.id}/gate?stage=plan`)
    ).json()) as { ok: boolean };
    assert(planGate.ok === true, "plan gate open when architecture + design both approved");

    // Design doc round-trip via REST: list_documents, read_document.
    const designListRes = await fetch(`${board.url}/api/board`);
    const designList = (await designListRes.json()) as {
      features: Array<{ documents: Array<{ id: string; stage: string }> }>;
    };
    const designOnBoard = designList.features[0]!.documents.find(
      (d) => d.stage === "design"
    );
    assert(
      designOnBoard?.id === designDoc.frontmatter.id,
      "design doc appears in /api/board features[].documents"
    );

    const designReadRes = await fetch(
      `${board.url}/api/documents/${designDoc.frontmatter.id}`
    );
    assert(designReadRes.ok, "GET /api/documents/:id returns design doc");
    const designRead = (await designReadRes.json()) as { stage: string; body: string };
    assert(designRead.stage === "design", "design doc round-trips stage field");
    assert(designRead.body.includes("sm-screen"), "design doc round-trips body");

    // ── Phase B: DESIGN.md sync via REST ───────────────────────────────
    const designSyncRes = await fetch(`${board.url}/api/design/sync`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "refresh" }),
    });
    assert(designSyncRes.ok, "POST /api/design/sync → 200");
    const designSyncJson = (await designSyncRes.json()) as {
      path: string;
      created: boolean;
      mode: string;
    };
    assert(designSyncJson.mode === "refresh", "design sync echoes refresh mode");
    assert(designSyncJson.path.endsWith("docs/DESIGN.md"), "design sync returns DESIGN.md path");
    const designOnDisk = await fs.readFile(designSyncJson.path, "utf8");
    assert(
      designOnDisk.includes("<!-- specmanager:design:start -->"),
      "DESIGN.md on disk has the design start marker"
    );

    // WS event on file change
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      const timer = setTimeout(() => {
        ws.close();
        reject(new Error("timed out waiting for file.changed event"));
      }, 4000);

      ws.on("open", async () => {
        // touch a spec file to trigger chokidar
        const docPath = path.join(
          root,
          ".claude/specs/features/checkout-corridor/prd/prd.md"
        );
        await fs.appendFile(docPath, "\n<!-- touched -->\n", "utf8");
      });
      ws.on("message", (data) => {
        const event = JSON.parse(String(data)) as { type: string };
        if (event.type === "file.changed") {
          console.log("ok — WS received file.changed event");
          clearTimeout(timer);
          ws.close();
          resolve();
        }
      });
      ws.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    await researchChecks(board, root);

    console.log("\nPhase 2 board-server assertions passed.");
    console.log(`Inspect the tmp project at: ${root}`);
  } finally {
    await board.stop();
  }

  // ── Phase B: reap stale board.pid + rebind, then stop() removes it ──────
  await reapRebindCheck();
  console.log("\nPhase B reap/rebind assertions passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
