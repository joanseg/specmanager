import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import Fastify, { FastifyInstance } from "fastify";
import fastifyStatic from "@fastify/static";
import { WebSocketServer, WebSocket } from "ws";
import chokidar from "chokidar";

import {
  buildManifest,
  checkGate,
  createTask,
  events,
  listDocuments,
  listFeatures,
  listStale,
  listTasks,
  pidFilePath,
  projectRoot,
  readDocumentById,
  reapStalePid,
  removePidFile,
  setStatus,
  SpecEvent,
  specsDir,
  syncDesignMd,
  TaskComplexity,
  TaskStatus,
  updateTask,
  writeDocument,
  writePidFile,
} from "./core/index.js";
import { cancelChat, chatStatus, runChat, type ChatMode } from "./agent-chat.js";

const here = path.dirname(fileURLToPath(import.meta.url));
// dist/board-server.js → plugin root → ui/dist
const UI_DIST = path.resolve(here, "..", "..", "ui", "dist");

interface ClientChatSend {
  type: "chat.send";
  docId: string;
  message: string;
  mode?: ChatMode;
}
interface ClientChatCancel {
  type: "chat.cancel";
  docId: string;
}
type ClientMessage = ClientChatSend | ClientChatCancel;

function isClientMessage(x: unknown): x is ClientMessage {
  return Boolean(x && typeof x === "object" && "type" in x && typeof (x as { type: unknown }).type === "string");
}

function handleClientMessage(ws: WebSocket, msg: unknown, root: string): void {
  if (!isClientMessage(msg)) return;
  if (msg.type === "chat.cancel") {
    const ok = cancelChat(msg.docId);
    safeSend(ws, { type: "chat.cancelled", docId: msg.docId, ok });
    return;
  }
  if (msg.type === "chat.send") {
    if (typeof msg.message !== "string" || typeof msg.docId !== "string") {
      safeSend(ws, { type: "chat.error", reason: "chat.send: docId and message are required" });
      return;
    }
    safeSend(ws, { type: "chat.started", docId: msg.docId });
    void runChat({
      docId: msg.docId,
      message: msg.message,
      mode: msg.mode,
      projectRoot: root,
      onEvent: (e) => {
        const { type, ...rest } = e;
        safeSend(ws, { type: `chat.${type}`, docId: msg.docId, ...rest });
      },
    });
  }
}

function safeSend(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload));
}

export interface BoardServer {
  url: string;
  port: number;
  stop: () => Promise<void>;
}

export async function startBoardServer(opts: {
  root?: string;
  port?: number;
} = {}): Promise<BoardServer | null> {
  const root = opts.root ?? projectRoot();
  const port = opts.port ?? Number(process.env.SPECMANAGER_BOARD_PORT ?? 4317);

  const app: FastifyInstance = Fastify({ logger: false });

  // REST -------------------------------------------------------------------
  app.get("/api/board", async () => buildManifest(root));

  app.get("/api/features", async () => listFeatures(root));

  app.get<{ Params: { id: string } }>("/api/features/:id", async (req, reply) => {
    const features = await listFeatures(root);
    const feature = features.find((f) => f.id === req.params.id);
    if (!feature) {
      reply.code(404);
      return { error: "feature not found" };
    }
    const docs = await listDocuments({ featureId: feature.id }, root);
    const tasks = await listTasks(feature.id, root);
    return {
      ...feature,
      documents: docs.map((d) => ({ ...d.frontmatter, filePath: d.filePath })),
      tasks,
    };
  });

  app.get<{ Params: { id: string } }>("/api/documents/:id", async (req, reply) => {
    try {
      const doc = await readDocumentById(req.params.id, root);
      return { ...doc.frontmatter, body: doc.body, filePath: doc.filePath };
    } catch (err) {
      reply.code(404);
      return { error: (err as Error).message };
    }
  });

  app.put<{
    Params: { id: string };
    Body: { body?: string; title?: string; baseVersion?: number };
  }>("/api/documents/:id", async (req, reply) => {
    try {
      const updated = await writeDocument(
        {
          id: req.params.id,
          body: req.body?.body,
          title: req.body?.title,
          baseVersion: req.body?.baseVersion,
          generatedBy: "human",
        },
        root
      );
      return { ...updated.frontmatter, body: updated.body, filePath: updated.filePath };
    } catch (err) {
      const message = (err as Error).message;
      if (message.startsWith("version conflict")) {
        reply.code(409);
        return { error: message };
      }
      if (message.startsWith("document not found")) {
        reply.code(404);
        return { error: message };
      }
      reply.code(400);
      return { error: message };
    }
  });

  app.post<{
    Params: { id: string };
    Body: { status: "draft" | "approved" };
  }>("/api/documents/:id/status", async (req, reply) => {
    const next = req.body?.status;
    if (next !== "draft" && next !== "approved") {
      reply.code(400);
      return { error: `status must be 'draft' or 'approved' (got ${JSON.stringify(next)})` };
    }
    try {
      const updated = await setStatus(req.params.id, next, root);
      return { ...updated.frontmatter, body: updated.body, filePath: updated.filePath };
    } catch (err) {
      reply.code(404);
      return { error: (err as Error).message };
    }
  });

  app.get<{
    Params: { id: string };
    Querystring: { stage?: string; phase?: string };
  }>("/api/features/:id/gate", async (req, reply) => {
    const stage = req.query.stage as
      | "prd"
      | "architecture"
      | "plan"
      | "walkthrough"
      | undefined;
    if (!stage) {
      reply.code(400);
      return { error: "missing query param: stage" };
    }
    return checkGate(req.params.id, stage, root, { phase: req.query.phase });
  });

  app.get("/api/stale", async () => {
    const docs = await listStale(root);
    return docs.map((d) => ({ ...d.frontmatter, filePath: d.filePath }));
  });

  app.get<{ Querystring: { featureId?: string } }>("/api/tasks", async (req) => {
    if (req.query.featureId) return listTasks(req.query.featureId, root);
    const features = await listFeatures(root);
    const out: unknown[] = [];
    for (const f of features) out.push(...(await listTasks(f.id, root)));
    return out;
  });

  app.get<{ Params: { id: string } }>("/api/features/:id/tasks", async (req) =>
    listTasks(req.params.id, root)
  );

  app.post<{
    Params: { id: string };
    Body: {
      title: string;
      stageRef?: string;
      phase?: string;
      complexity?: TaskComplexity | null;
      dependsOn?: string[];
    };
  }>("/api/features/:id/tasks", async (req, reply) => {
    if (!req.body?.title || typeof req.body.title !== "string") {
      reply.code(400);
      return { error: "title is required" };
    }
    try {
      const t = await createTask(
        {
          featureId: req.params.id,
          title: req.body.title,
          stageRef: req.body.stageRef,
          phase: req.body.phase,
          complexity: req.body.complexity,
          dependsOn: req.body.dependsOn,
        },
        root
      );
      return t;
    } catch (err) {
      reply.code(400);
      return { error: (err as Error).message };
    }
  });

  app.get("/api/chat/status", async () => chatStatus());

  app.post<{ Body: { mode?: "init" | "refresh" } }>(
    "/api/design/sync",
    async (req) => {
      const mode = req.body?.mode === "init" ? "init" : "refresh";
      return syncDesignMd(root, { mode });
    }
  );

  app.patch<{
    Params: { featureId: string; taskId: string };
    Body: {
      status?: TaskStatus;
      title?: string;
      phase?: string;
      complexity?: TaskComplexity | null;
      artifacts?: { commits?: string[]; files?: string[]; pr?: string | null };
    };
  }>("/api/features/:featureId/tasks/:taskId", async (req, reply) => {
    try {
      const updated = await updateTask(
        {
          id: req.params.taskId,
          featureId: req.params.featureId,
          status: req.body?.status,
          title: req.body?.title,
          phase: req.body?.phase,
          complexity: req.body?.complexity,
          artifacts: req.body?.artifacts,
        },
        root
      );
      return updated;
    } catch (err) {
      const message = (err as Error).message;
      if (message.startsWith("task not found") || message.startsWith("feature not found")) {
        reply.code(404);
        return { error: message };
      }
      reply.code(400);
      return { error: message };
    }
  });

  // Static UI (optional — only if it has been built)
  if (existsSync(UI_DIST)) {
    await app.register(fastifyStatic, { root: UI_DIST, prefix: "/", index: ["index.html"] });
  } else {
    app.get("/", async (_req, reply) => {
      reply.type("text/html");
      return `<!doctype html><html><body style="font-family:system-ui;padding:2rem;max-width:40rem;margin:auto">
<h1>SpecManager board</h1>
<p>The UI bundle hasn't been built yet. From the plugin source dir:</p>
<pre>cd plugins/specmanager/ui &amp;&amp; npm install &amp;&amp; npm run build</pre>
<p>REST endpoints are live now:</p>
<ul>
  <li><a href="/api/board">/api/board</a></li>
  <li><a href="/api/features">/api/features</a></li>
  <li><a href="/api/stale">/api/stale</a></li>
</ul>
</body></html>`;
    });
  }

  // Listen ----------------------------------------------------------------
  // Reap a stale predecessor (e.g. a kill -9'd board) so a fresh boot can
  // reclaim the port. Single bind attempt follows the ~200ms reap wait.
  await reapStalePid(port);
  try {
    await app.listen({ port, host: "127.0.0.1" });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`specmanager: board server failed to bind 127.0.0.1:${port}: ${(err as Error).message}`);
    return null;
  }

  // WS --------------------------------------------------------------------
  const wss = new WebSocketServer({ server: app.server, path: "/ws" });
  const clients = new Set<WebSocket>();
  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.on("close", () => clients.delete(ws));
    ws.on("message", (raw) => {
      let msg: unknown;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }
      handleClientMessage(ws, msg, root);
    });
  });

  const broadcast = (event: SpecEvent): void => {
    const payload = JSON.stringify(event);
    for (const ws of clients) {
      if (ws.readyState === ws.OPEN) ws.send(payload);
    }
  };
  const unsubscribe = events.on(broadcast);

  // File watcher -> file.changed core event (debounced) -------------------
  const watchTarget = specsDir(root);
  const pendingChanges = new Set<string>();
  let flushTimer: NodeJS.Timeout | null = null;
  const flush = (): void => {
    flushTimer = null;
    for (const p of pendingChanges) events.emit({ type: "file.changed", filePath: p });
    pendingChanges.clear();
  };
  const schedule = (p: string): void => {
    pendingChanges.add(p);
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, 120);
  };
  const watcher = chokidar.watch(watchTarget, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 80, pollInterval: 30 },
  });
  watcher.on("add", schedule).on("change", schedule).on("unlink", schedule);

  const url = `http://127.0.0.1:${port}`;
  return {
    url,
    port,
    stop: async () => {
      unsubscribe();
      if (flushTimer) clearTimeout(flushTimer);
      wss.close();
      await watcher.close();
      await app.close();
    },
  };
}
