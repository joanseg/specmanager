import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { WebSocketServer } from "ws";
import chokidar from "chokidar";
import { buildManifest, events, listDocuments, listFeatures, listStale, listTasks, projectRoot, readDocumentById, specsDir, } from "./core/index.js";
const here = path.dirname(fileURLToPath(import.meta.url));
// dist/board-server.js → plugin root → ui/dist
const UI_DIST = path.resolve(here, "..", "..", "ui", "dist");
export async function startBoardServer(opts = {}) {
    const root = opts.root ?? projectRoot();
    const port = opts.port ?? Number(process.env.SPECMANAGER_BOARD_PORT ?? 4317);
    const app = Fastify({ logger: false });
    // REST -------------------------------------------------------------------
    app.get("/api/board", async () => buildManifest(root));
    app.get("/api/features", async () => listFeatures(root));
    app.get("/api/features/:id", async (req, reply) => {
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
    app.get("/api/documents/:id", async (req, reply) => {
        try {
            const doc = await readDocumentById(req.params.id, root);
            return { ...doc.frontmatter, body: doc.body, filePath: doc.filePath };
        }
        catch (err) {
            reply.code(404);
            return { error: err.message };
        }
    });
    app.get("/api/stale", async () => {
        const docs = await listStale(root);
        return docs.map((d) => ({ ...d.frontmatter, filePath: d.filePath }));
    });
    app.get("/api/tasks", async (req) => {
        if (req.query.featureId)
            return listTasks(req.query.featureId, root);
        const features = await listFeatures(root);
        const out = [];
        for (const f of features)
            out.push(...(await listTasks(f.id, root)));
        return out;
    });
    // Static UI (optional — only if it has been built)
    if (existsSync(UI_DIST)) {
        await app.register(fastifyStatic, { root: UI_DIST, prefix: "/", index: ["index.html"] });
    }
    else {
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
    try {
        await app.listen({ port, host: "127.0.0.1" });
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.error(`specmanager: board server failed to bind 127.0.0.1:${port}: ${err.message}`);
        return null;
    }
    // WS --------------------------------------------------------------------
    const wss = new WebSocketServer({ server: app.server, path: "/ws" });
    const clients = new Set();
    wss.on("connection", (ws) => {
        clients.add(ws);
        ws.on("close", () => clients.delete(ws));
    });
    const broadcast = (event) => {
        const payload = JSON.stringify(event);
        for (const ws of clients) {
            if (ws.readyState === ws.OPEN)
                ws.send(payload);
        }
    };
    const unsubscribe = events.on(broadcast);
    // File watcher -> file.changed core event (debounced) -------------------
    const watchTarget = specsDir(root);
    const pendingChanges = new Set();
    let flushTimer = null;
    const flush = () => {
        flushTimer = null;
        for (const p of pendingChanges)
            events.emit({ type: "file.changed", filePath: p });
        pendingChanges.clear();
    };
    const schedule = (p) => {
        pendingChanges.add(p);
        if (flushTimer)
            clearTimeout(flushTimer);
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
            if (flushTimer)
                clearTimeout(flushTimer);
            wss.close();
            await watcher.close();
            await app.close();
        },
    };
}
//# sourceMappingURL=board-server.js.map