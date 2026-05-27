// In-UI AI chat (Phase 6).
//
// One @anthropic-ai/claude-agent-sdk session per docId, attached to an
// in-process MCP server that exposes a small slice of core (read/write/list)
// so the agent can persist edits via the same optimistic-concurrency path
// the human editor uses.

import {
  query,
  createSdkMcpServer,
  tool,
  type SDKMessage,
} from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod/v4";

import {
  listDocuments,
  readDocumentById,
  writeDocument,
  type DocFrontmatter,
  type Stage,
} from "./core/index.js";

export type ChatMode = "interview" | "co-write";

export interface ChatEvent {
  type: "delta" | "tool" | "done" | "error" | "info";
  text?: string;
  tool?: { name: string; input?: unknown; ok?: boolean; error?: string };
  reason?: string;
}

export interface RunChatInput {
  docId: string;
  message: string;
  mode?: ChatMode;
  projectRoot: string;
  onEvent: (e: ChatEvent) => void;
}

export interface ChatSession {
  abort: () => void;
  active: boolean;
  lastUsed: number;
}

const SESSIONS = new Map<string, ChatSession>();
const IDLE_MS = 15 * 60 * 1000;

function cleanupIdleSessions(): void {
  const now = Date.now();
  for (const [id, s] of SESSIONS) {
    if (!s.active && now - s.lastUsed > IDLE_MS) SESSIONS.delete(id);
  }
}
setInterval(cleanupIdleSessions, 60_000).unref?.();

/** Returns whether the chat backend is available (i.e. an API key is on env). */
export function chatAvailable(): boolean {
  return Boolean(
    process.env.ANTHROPIC_API_KEY ||
      process.env.CLAUDE_CODE_OAUTH_TOKEN ||
      process.env.CLAUDE_AGENT_SDK_OAUTH_TOKEN
  );
}

export function chatStatus(): { available: boolean; reason?: string } {
  if (chatAvailable()) return { available: true };
  return {
    available: false,
    reason:
      "set ANTHROPIC_API_KEY (or run inside an authenticated Claude Code session) — see docs/phase-6-test-walkthrough.md",
  };
}

const STAGE_PERSONA: Record<Stage, string> = {
  prd: `You are a senior product manager helping the user draft a PRD. Sections you should cover when relevant: Problem, Users & jobs-to-be-done, Goals / non-goals, Success metrics, Constraints, Flows, Open questions. Stay tight — 200-500 lines of markdown is normal.`,
  architecture: `You are a staff engineer designing an architecture grounded in this repo. Reference real file paths when you can (use the read_document tool to inspect the approved PRD; you may also use Glob/Read on the repo via the host tools). Sections: Summary, Affected components, Data model, Interfaces, Sequence, Failure modes, Conventions used, Open questions.`,
  design: `You are a senior product designer drafting an HTML design brief for this feature. The body must be self-contained HTML (inline CSS, no external assets). Sections to cover when relevant: Overview, User flows, Components used (refer to ./docs/DESIGN.md), Screens, Interaction notes, Open questions. Reference real screens / components from the repo when you can.`,
  plan: `You are a tech lead breaking the approved architecture into a sequenced execution plan. Output should include build order, risks, test strategy, and out-of-scope notes. Each item should be shippable in one sitting.`,
  walkthrough: `You are a technical writer documenting a shipped feature. Reference the actual tasks via list_documents/read_document; the user has already done the work. Sections: What shipped, How it works, Code tour, Tests, Known limitations.`,
};

function buildSystemPrompt(
  frontmatter: DocFrontmatter,
  body: string,
  mode: ChatMode
): string {
  const persona = STAGE_PERSONA[frontmatter.stage];
  const modeLine =
    mode === "interview"
      ? `The current draft body is blank. Begin by asking ONE focused question that unblocks the next section. As soon as you have a useful first pass for any section, call write_document to persist it.`
      : `The user already has draft content. Be a co-writer: ask before large rewrites, prefer surgical improvements, and persist via write_document with the current baseVersion.`;
  const guardrails = [
    `Document context:`,
    `- id: ${frontmatter.id}`,
    `- featureId: ${frontmatter.featureId}`,
    `- stage: ${frontmatter.stage}`,
    `- status: ${frontmatter.status}`,
    `- version: ${frontmatter.version} (use this as baseVersion on the next write)`,
    ``,
    `Rules:`,
    `- Persist changes ONLY through the write_document tool — do not Write/Edit the file directly. The tool enforces optimistic concurrency; if it returns a version-conflict error, stop and report it to the user without retrying blindly.`,
    `- If the document is "approved", refuse to edit and tell the user to reopen it first.`,
    `- Keep responses short in chat; long content goes into the doc itself.`,
    `- Do not approve / reopen the document — only the user does that.`,
    ``,
    `Current body (markdown, may be empty):`,
    `---`,
    body,
    `---`,
  ].join("\n");
  return `${persona}\n\n${modeLine}\n\n${guardrails}`;
}

function makeMcpServer(projectRoot: string) {
  return createSdkMcpServer({
    name: "specmanager-chat",
    version: "0.6.0",
    instructions:
      "In-process bridge to SpecManager core. Use these tools to read and persist document edits with optimistic concurrency.",
    tools: [
      tool(
        "read_document",
        "Return a SpecManager document's frontmatter and body by id.",
        { id: z.string() },
        async ({ id }) => {
          try {
            const d = await readDocumentById(id, projectRoot);
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify(
                    { ...d.frontmatter, body: d.body, filePath: d.filePath },
                    null,
                    2
                  ),
                },
              ],
            };
          } catch (err) {
            return {
              content: [{ type: "text" as const, text: `error: ${(err as Error).message}` }],
              isError: true,
            };
          }
        }
      ),
      tool(
        "list_documents",
        "List documents in the project, optionally filtered by featureId / stage / status / stale.",
        {
          featureId: z.string().optional(),
          stage: z.enum(["prd", "architecture", "plan", "walkthrough"]).optional(),
          status: z.enum(["draft", "approved"]).optional(),
          stale: z.boolean().optional(),
        },
        async (filter) => {
          const docs = await listDocuments(filter, projectRoot);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  docs.map((d) => ({ ...d.frontmatter, filePath: d.filePath })),
                  null,
                  2
                ),
              },
            ],
          };
        }
      ),
      tool(
        "write_document",
        "Persist a new body to a SpecManager document. Pass baseVersion to detect mid-stream conflicts (the user editing in another window).",
        {
          id: z.string(),
          body: z.string(),
          baseVersion: z.number().int().nonnegative(),
        },
        async ({ id, body, baseVersion }) => {
          try {
            const d = await writeDocument(
              { id, body, baseVersion, generatedBy: "agent" },
              projectRoot
            );
            return {
              content: [
                {
                  type: "text" as const,
                  text: `ok — wrote ${d.frontmatter.id} v${d.frontmatter.version}`,
                },
              ],
            };
          } catch (err) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `error: ${(err as Error).message}`,
                },
              ],
              isError: true,
            };
          }
        }
      ),
    ],
  });
}

/**
 * Run one turn of chat for a doc. Streams events through `onEvent`.
 * Returns when the turn completes (or aborts).
 */
export async function runChat(input: RunChatInput): Promise<void> {
  if (!chatAvailable()) {
    input.onEvent({
      type: "error",
      reason:
        "chat is unavailable: no ANTHROPIC_API_KEY / CLAUDE_CODE_OAUTH_TOKEN on the MCP server's environment",
    });
    return;
  }

  // Load the current doc so we can build a fresh system prompt every turn —
  // ensures the agent always sees the latest body + version.
  let doc;
  try {
    doc = await readDocumentById(input.docId, input.projectRoot);
  } catch (err) {
    input.onEvent({ type: "error", reason: (err as Error).message });
    return;
  }

  const mode: ChatMode = input.mode ?? (doc.body.trim().length === 0 ? "interview" : "co-write");
  const systemPrompt = buildSystemPrompt(doc.frontmatter, doc.body, mode);

  const abort = new AbortController();
  const session: ChatSession = { abort: () => abort.abort(), active: true, lastUsed: Date.now() };
  // Last-writer-wins: a new turn supersedes any previous abort handle for this doc.
  SESSIONS.get(input.docId)?.abort();
  SESSIONS.set(input.docId, session);

  input.onEvent({ type: "info", reason: `mode: ${mode}` });

  try {
    const q = query({
      prompt: input.message,
      options: {
        cwd: input.projectRoot,
        abortController: abort,
        systemPrompt,
        includePartialMessages: true,
        // Limit built-in tools — the agent gets just read-only repo browsing,
        // and persistence flows through our SDK MCP server.
        tools: ["Read", "Glob", "Grep"],
        mcpServers: {
          specmanager: makeMcpServer(input.projectRoot),
        },
        allowedTools: [
          "Read",
          "Glob",
          "Grep",
          "mcp__specmanager__read_document",
          "mcp__specmanager__list_documents",
          "mcp__specmanager__write_document",
        ],
        maxTurns: 12,
      },
    });

    for await (const msg of q as AsyncIterable<SDKMessage>) {
      session.lastUsed = Date.now();
      handleSdkMessage(msg, input.onEvent);
    }
  } catch (err) {
    if ((err as Error).name !== "AbortError") {
      input.onEvent({ type: "error", reason: (err as Error).message });
    }
  } finally {
    session.active = false;
    session.lastUsed = Date.now();
  }
}

function handleSdkMessage(msg: SDKMessage, onEvent: (e: ChatEvent) => void): void {
  switch (msg.type) {
    case "stream_event": {
      // BetaRawMessageStreamEvent — extract text deltas from content_block_delta.
      const ev = msg.event as { type?: string; delta?: { type?: string; text?: string } };
      if (ev?.type === "content_block_delta" && ev.delta?.type === "text_delta" && ev.delta.text) {
        onEvent({ type: "delta", text: ev.delta.text });
      }
      break;
    }
    case "assistant": {
      // Non-streaming fallback: emit any text blocks that weren't already streamed.
      // (When includePartialMessages is true, the stream_event branch is normally enough.)
      const content = msg.message?.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === "tool_use") {
            onEvent({
              type: "tool",
              tool: { name: block.name, input: block.input },
            });
          }
        }
      }
      break;
    }
    case "result": {
      if (msg.subtype === "success") {
        onEvent({ type: "done", text: msg.result });
      } else {
        onEvent({
          type: "error",
          reason: `${msg.subtype}${"error" in msg && msg.error ? `: ${String(msg.error)}` : ""}`,
        });
      }
      break;
    }
    default:
      break;
  }
}

export function cancelChat(docId: string): boolean {
  const s = SESSIONS.get(docId);
  if (s && s.active) {
    s.abort();
    return true;
  }
  return false;
}
