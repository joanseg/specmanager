// Phase 2 smoke test — boots board server against a tmp project,
// hits REST endpoints, opens a WS, and asserts file-change → event.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import WebSocket from "ws";

import { createFeature, createDocument, initProject } from "./core/index.js";
import { startBoardServer } from "./board-server.js";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`ok — ${msg}`);
}

async function pickPort(): Promise<number> {
  // Use a port unlikely to collide with the default 4317.
  return 4317 + Math.floor(Math.random() * 1000);
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

    console.log("\nPhase 2 board-server assertions passed.");
    console.log(`Inspect the tmp project at: ${root}`);
  } finally {
    await board.stop();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
