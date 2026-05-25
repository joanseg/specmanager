#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { startBoardServer, BoardServer } from "./board-server.js";
import { spawn } from "node:child_process";

import {
  STAGE,
  DOC_STATUS,
  TASK_STATUS,
  GENERATED_BY,
  initProject,
  listFeatures,
  createFeature,
  listDocuments,
  readDocumentById,
  createDocument,
  writeDocument,
  setStatus,
  checkGate,
  listStale,
  linkDocuments,
  listTasks,
  createTask,
  updateTask,
  syncClaudeMd,
  writeManifest,
} from "./core/index.js";

const PROJECT_DIR =
  process.env.SPECMANAGER_PROJECT_DIR ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const BOARD_PORT = Number(process.env.SPECMANAGER_BOARD_PORT ?? 4317);

function text(payload: unknown) {
  return {
    content: [
      { type: "text" as const, text: typeof payload === "string" ? payload : JSON.stringify(payload, null, 2) },
    ],
  };
}

function ok<T>(data: T) {
  return text({ ok: true, data });
}

function fail(message: string) {
  return text({ ok: false, error: message });
}

const server = new McpServer({ name: "specmanager", version: "0.1.0" });

server.registerTool(
  "specmanager_init",
  {
    description:
      "Scaffold .claude/specs/ in the project, write the manifest cache, and write/refresh the managed CLAUDE.md block.",
    inputSchema: z.object({}),
  },
  async () => ok(await initProject(PROJECT_DIR))
);

server.registerTool(
  "list_features",
  {
    description: "List all features in the project.",
    inputSchema: z.object({}),
  },
  async () => ok(await listFeatures(PROJECT_DIR))
);

server.registerTool(
  "create_feature",
  {
    description: "Create a new feature pipeline by title. Returns the feature record.",
    inputSchema: z.object({ title: z.string().min(1) }),
  },
  async ({ title }) => {
    const f = await createFeature(title, PROJECT_DIR);
    await writeManifest(PROJECT_DIR);
    await syncClaudeMd(PROJECT_DIR);
    return ok(f);
  }
);

server.registerTool(
  "list_documents",
  {
    description: "List documents, optionally filtered by featureId / stage / status / stale.",
    inputSchema: z.object({
      featureId: z.string().optional(),
      stage: STAGE.optional(),
      status: DOC_STATUS.optional(),
      stale: z.boolean().optional(),
    }),
  },
  async (filter) => {
    const docs = await listDocuments(filter, PROJECT_DIR);
    return ok(docs.map((d) => ({ ...d.frontmatter, filePath: d.filePath })));
  }
);

server.registerTool(
  "read_document",
  {
    description: "Return a document's frontmatter and body by id.",
    inputSchema: z.object({ id: z.string() }),
  },
  async ({ id }) => {
    try {
      const d = await readDocumentById(id, PROJECT_DIR);
      return ok({ ...d.frontmatter, body: d.body, filePath: d.filePath });
    } catch (err) {
      return fail((err as Error).message);
    }
  }
);

server.registerTool(
  "create_document",
  {
    description: "Create a draft document in a feature+stage.",
    inputSchema: z.object({
      featureId: z.string(),
      stage: STAGE,
      title: z.string().min(1),
      body: z.string().optional(),
      filename: z.string().optional(),
      generatedBy: GENERATED_BY.optional(),
      dependsOn: z.array(z.string()).optional(),
      basedOn: z.record(z.string(), z.number()).optional(),
    }),
  },
  async (input) => {
    try {
      const d = await createDocument(input, PROJECT_DIR);
      await writeManifest(PROJECT_DIR);
      return ok({ ...d.frontmatter, filePath: d.filePath });
    } catch (err) {
      return fail((err as Error).message);
    }
  }
);

server.registerTool(
  "write_document",
  {
    description:
      "Replace a document's body / metadata; bumps version. Pass baseVersion for optimistic concurrency.",
    inputSchema: z.object({
      id: z.string(),
      body: z.string().optional(),
      title: z.string().optional(),
      generatedBy: GENERATED_BY.optional(),
      baseVersion: z.number().int().nonnegative().optional(),
      dependsOn: z.array(z.string()).optional(),
      basedOn: z.record(z.string(), z.number()).optional(),
    }),
  },
  async (input) => {
    try {
      const d = await writeDocument(input, PROJECT_DIR);
      await writeManifest(PROJECT_DIR);
      return ok({ ...d.frontmatter, filePath: d.filePath });
    } catch (err) {
      return fail((err as Error).message);
    }
  }
);

server.registerTool(
  "set_status",
  {
    description:
      "Transition a document between draft and approved. Reopening (approved→draft) flags downstream docs stale.",
    inputSchema: z.object({ id: z.string(), status: DOC_STATUS }),
  },
  async ({ id, status }) => {
    try {
      const d = await setStatus(id, status, PROJECT_DIR);
      await writeManifest(PROJECT_DIR);
      await syncClaudeMd(PROJECT_DIR);
      return ok({ ...d.frontmatter });
    } catch (err) {
      return fail((err as Error).message);
    }
  }
);

server.registerTool(
  "check_gate",
  {
    description:
      "Check whether the prerequisite for a feature's stage is met (prior stage approved, or all tasks done for walkthroughs).",
    inputSchema: z.object({ featureId: z.string(), stage: STAGE }),
  },
  async ({ featureId, stage }) => ok(await checkGate(featureId, stage, PROJECT_DIR))
);

server.registerTool(
  "list_stale",
  {
    description: "List documents currently flagged stale.",
    inputSchema: z.object({}),
  },
  async () => {
    const docs = await listStale(PROJECT_DIR);
    return ok(docs.map((d) => ({ ...d.frontmatter, filePath: d.filePath })));
  }
);

server.registerTool(
  "link_documents",
  {
    description: "Record a dependsOn edge from downstream to upstream and stamp the basedOn version.",
    inputSchema: z.object({ downstreamId: z.string(), upstreamId: z.string() }),
  },
  async ({ downstreamId, upstreamId }) => {
    try {
      const d = await linkDocuments(downstreamId, upstreamId, PROJECT_DIR);
      return ok({ ...d.frontmatter });
    } catch (err) {
      return fail((err as Error).message);
    }
  }
);

server.registerTool(
  "list_tasks",
  {
    description: "List tasks for a feature.",
    inputSchema: z.object({ featureId: z.string() }),
  },
  async ({ featureId }) => ok(await listTasks(featureId, PROJECT_DIR))
);

server.registerTool(
  "create_task",
  {
    description: "Create a task on a feature's plan.",
    inputSchema: z.object({
      featureId: z.string(),
      title: z.string().min(1),
      stageRef: z.string().optional(),
      dependsOn: z.array(z.string()).optional(),
    }),
  },
  async (input) => {
    try {
      const t = await createTask(input, PROJECT_DIR);
      return ok(t);
    } catch (err) {
      return fail((err as Error).message);
    }
  }
);

server.registerTool(
  "update_task",
  {
    description: "Update a task's status, title, or artifacts.",
    inputSchema: z.object({
      id: z.string(),
      featureId: z.string(),
      status: TASK_STATUS.optional(),
      title: z.string().optional(),
      artifacts: z
        .object({
          commits: z.array(z.string()).optional(),
          files: z.array(z.string()).optional(),
          pr: z.string().nullable().optional(),
        })
        .optional(),
    }),
  },
  async (input) => {
    try {
      const t = await updateTask(input, PROJECT_DIR);
      return ok(t);
    } catch (err) {
      return fail((err as Error).message);
    }
  }
);

server.registerTool(
  "sync_claude_md",
  {
    description: "Rewrite the managed SpecManager block in the project CLAUDE.md.",
    inputSchema: z.object({}),
  },
  async () => ok(await syncClaudeMd(PROJECT_DIR))
);

let board: BoardServer | null = null;

server.registerTool(
  "board_url",
  {
    description:
      "Return the localhost URL of the kanban board server, and whether it is currently running.",
    inputSchema: z.object({}),
  },
  async () =>
    ok({
      url: board?.url ?? `http://127.0.0.1:${BOARD_PORT}`,
      available: board !== null,
    })
);

server.registerTool(
  "open_board",
  {
    description:
      "Open the SpecManager kanban board in the user's default browser. Returns the URL it tried to open.",
    inputSchema: z.object({}),
  },
  async () => {
    const url = board?.url ?? `http://127.0.0.1:${BOARD_PORT}`;
    if (!board) {
      return fail(`board server is not running on ${url} — restart the Claude Code session`);
    }
    const cmd =
      process.platform === "darwin" ? "open" :
      process.platform === "win32" ? "cmd" :
      "xdg-open";
    const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
    try {
      const child = spawn(cmd, args, { detached: true, stdio: "ignore" });
      child.unref();
      return ok({ url, opened: true });
    } catch (err) {
      return fail(`could not open browser (${(err as Error).message}); URL: ${url}`);
    }
  }
);

async function main(): Promise<void> {
  // Boot the board server first so the URL is ready by the time any tool is called.
  // Failure (e.g. port in use) is non-fatal — MCP keeps working without the UI.
  try {
    board = await startBoardServer({ root: PROJECT_DIR, port: BOARD_PORT });
    if (board) {
      // eslint-disable-next-line no-console
      console.error(`specmanager: board server up at ${board.url}`);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("specmanager: board server failed to start:", (err as Error).message);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const shutdown = async (): Promise<void> => {
  if (board) await board.stop().catch(() => undefined);
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("specmanager mcp failed to start:", err);
  process.exit(1);
});
