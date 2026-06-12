#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { startBoardServer, BoardServer } from "./board-server.js";
import { spawn } from "node:child_process";

import {
  STAGE,
  DOC_KIND,
  DOC_STATUS,
  TASK_STATUS,
  TASK_COMPLEXITY,
  GENERATED_BY,
  events,
  initProject,
  listFeatures,
  createFeature,
  listDocuments,
  readDocumentById,
  createDocument,
  sanitizeDesignBriefBody,
  DESIGN_BRIEF_MAX_BYTES,
  writeDocument,
  setStatus,
  checkGate,
  listStale,
  linkDocuments,
  listTasks,
  createTask,
  updateTask,
  listPhases,
  getNextPhase,
  syncClaudeMd,
  syncDesignMd,
  writeManifest,
} from "./core/index.js";

const PROJECT_DIR =
  process.env.SPECMANAGER_PROJECT_DIR ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const BOARD_PORT = Number(process.env.SPECMANAGER_BOARD_PORT ?? 4317);

function text(payload: unknown) {
  return {
    content: [
      { type: "text" as const, text: typeof payload === "string" ? payload : JSON.stringify(payload) },
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
    description:
      "Create a draft document in a feature+stage. For walkthrough docs, pass `phase` (e.g. \"Foundation\") so the manifest can link the doc to its phase; the filename is derived from `phase` (`phase-<name>.md`, or `feature.md` for `phase: \"final\"`). Pass `kind: \"interview\"` with stage `prd` to store a pre-PRD interview artifact; filename defaults to `interview.md`.",
    inputSchema: z.object({
      featureId: z.string(),
      stage: STAGE,
      title: z.string().min(1),
      body: z.string().optional(),
      filename: z.string().optional(),
      generatedBy: GENERATED_BY.optional(),
      dependsOn: z.array(z.string()).optional(),
      basedOn: z.record(z.string(), z.number()).optional(),
      phase: z.string().optional(),
      kind: DOC_KIND.optional(),
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
  "create_design_brief",
  {
    description:
      "Create a draft design doc (stacked high-fi screen mockups) in the design stage. Body is one self-contained HTML document — rendered screens + explanatory notes. Wraps create_document with stage=\"design\", defangs any `---` at column 0 (gray-matter collision), and rejects bodies larger than 5MB. Writes to design/mockups.html.",
    inputSchema: z.object({
      featureId: z.string(),
      title: z.string().min(1),
      body: z.string(),
      dependsOn: z.array(z.string()).optional(),
      basedOn: z.record(z.string(), z.number()).optional(),
    }),
  },
  async ({ featureId, title, body, dependsOn, basedOn }) => {
    const bytes = Buffer.byteLength(body, "utf8");
    if (bytes > DESIGN_BRIEF_MAX_BYTES) {
      return fail(
        `design brief body is ${bytes} bytes — cap is ${DESIGN_BRIEF_MAX_BYTES}. Refer to large screenshots by repo-relative path instead of inlining as data: URIs.`
      );
    }
    try {
      const d = await createDocument(
        {
          featureId,
          stage: "design",
          title,
          body: sanitizeDesignBriefBody(body),
          dependsOn,
          basedOn,
          generatedBy: "agent",
        },
        PROJECT_DIR
      );
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
      "Check whether the prerequisite for a feature's stage is met (prior stage approved, or — for walkthrough — all tasks in the named phase are done). `phase` defaults to 'default' and is only meaningful for the walkthrough stage.",
    inputSchema: z.object({
      featureId: z.string(),
      stage: STAGE,
      phase: z.string().optional(),
    }),
  },
  async ({ featureId, stage, phase }) =>
    ok(await checkGate(featureId, stage, PROJECT_DIR, { phase }))
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
    description:
      "Create a task on a feature's plan. `phase` groups tasks into a working-software increment. `complexity` is Fibonacci (1|2|3|5|8|13); values ≥5 are rejected — split before persisting.",
    inputSchema: z.object({
      featureId: z.string(),
      title: z.string().min(1),
      stageRef: z.string().optional(),
      phase: z.string().optional(),
      complexity: TASK_COMPLEXITY.nullable().optional(),
      dependsOn: z.array(z.string()).optional(),
    }),
  },
  async (input) => {
    try {
      const t = await createTask(input, PROJECT_DIR);
      await writeManifest(PROJECT_DIR);
      return ok(t);
    } catch (err) {
      return fail((err as Error).message);
    }
  }
);

server.registerTool(
  "update_task",
  {
    description: "Update a task's status, title, phase, complexity, or artifacts.",
    inputSchema: z.object({
      id: z.string(),
      featureId: z.string(),
      status: TASK_STATUS.optional(),
      title: z.string().optional(),
      phase: z.string().optional(),
      complexity: TASK_COMPLEXITY.nullable().optional(),
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
      await writeManifest(PROJECT_DIR);
      return ok(t);
    } catch (err) {
      return fail((err as Error).message);
    }
  }
);

server.registerTool(
  "list_phases",
  {
    description:
      "List a feature's phases (groups of tasks that ladder up to a testable working-software increment), in first-seen order.",
    inputSchema: z.object({ featureId: z.string() }),
  },
  async ({ featureId }) => ok(await listPhases(featureId, PROJECT_DIR))
);

server.registerTool(
  "get_next_phase",
  {
    description:
      "Return the first phase whose tasks aren't all done, or null if every phase is complete. Used by /specmanager-build.",
    inputSchema: z.object({ featureId: z.string() }),
  },
  async ({ featureId }) => ok(await getNextPhase(featureId, PROJECT_DIR))
);

server.registerTool(
  "sync_claude_md",
  {
    description: "Rewrite the managed SpecManager block in the project CLAUDE.md.",
    inputSchema: z.object({}),
  },
  async () => ok(await syncClaudeMd(PROJECT_DIR))
);

server.registerTool(
  "sync_design_md",
  {
    description:
      "Generate or refresh ./docs/DESIGN.md from the project's UI sources. Idempotent. mode=init creates if missing; mode=refresh updates only the managed block.",
    inputSchema: z.object({ mode: z.enum(["init", "refresh"]).optional() }),
  },
  async ({ mode }) => ok(await syncDesignMd(PROJECT_DIR, { mode: mode ?? "refresh" }))
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

// Refresh the CLAUDE.md managed block whenever any mutation flows through core —
// covers MCP tool calls AND board-server REST writes, since both emit the same events.
function startClaudeMdAutoSync(root: string): void {
  let pending: NodeJS.Timeout | null = null;
  const schedule = (): void => {
    if (pending) clearTimeout(pending);
    pending = setTimeout(() => {
      pending = null;
      syncClaudeMd(root).catch((err) => {
        // eslint-disable-next-line no-console
        console.error("specmanager: sync_claude_md failed:", (err as Error).message);
      });
    }, 150);
  };
  events.on((e) => {
    switch (e.type) {
      case "feature.created":
      case "document.created":
      case "document.updated":
      case "status.changed":
      case "stale.flagged":
      case "stale.cleared":
        schedule();
        break;
      default:
        // file.changed, task.updated, feature.shipped, design.synced — manifest
        // covers these, no CLAUDE.md row impact
        break;
    }
  });
}

// Refresh ./docs/DESIGN.md whenever a feature ships (final-phase walkthrough
// approved). Best-effort — failures log to stderr but never block.
function startDesignMdAutoSync(root: string): void {
  let pending: NodeJS.Timeout | null = null;
  const schedule = (): void => {
    if (pending) clearTimeout(pending);
    pending = setTimeout(() => {
      pending = null;
      syncDesignMd(root, { mode: "refresh" }).catch((err) => {
        // eslint-disable-next-line no-console
        console.error("specmanager: sync_design_md failed:", (err as Error).message);
      });
    }, 250);
  };
  events.on((e) => {
    if (e.type === "feature.shipped") schedule();
  });
}

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

  startClaudeMdAutoSync(PROJECT_DIR);
  startDesignMdAutoSync(PROJECT_DIR);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Watch stdin for EOF so we self-terminate when the parent `claude` goes away.
  // Attached AFTER server.connect so it's purely additive to the transport's
  // established `data` consumer — we don't read data or resume the stream ourselves.
  process.stdin.on("end", shutdown);
  process.stdin.on("close", shutdown);
}

let shuttingDown = false;

/** Idempotent teardown: stop the board (frees the port + removes board.pid) and exit. */
const shutdown = async (): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;
  if (board) await board.stop().catch(() => undefined);
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("SIGHUP", shutdown);

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("specmanager mcp failed to start:", err);
  process.exit(1);
});
