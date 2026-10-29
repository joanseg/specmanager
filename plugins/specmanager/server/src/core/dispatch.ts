// The builder-scoped Stop-gate's dispatch line. /specmanager-build writes a
// `Dispatch:` line into every builder prompt (`Dispatch: task-007`,
// `Dispatch: task-007, task-008`, `Dispatch: bulk`). At SubagentStop the
// resolver reads the builder's own prompt — the first `user` record of its
// transcript, which the orchestrator wrote — and parses the line. Readers here
// never throw: an absent or unreadable signal is `null`, and the gate passes.

import fs from "node:fs";
import readline from "node:readline";

export interface Dispatch {
  taskIds: string[];
  bulk: boolean;
}

const LINE = /^Dispatch:[ \t]*(.*?)[ \t]*$/;
const ID = /^[A-Za-z0-9_.-]+$/;

/** Parse one `Dispatch:` value: `bulk`, or comma-separated ids. Invalid ⇒ null. */
function parseValue(value: string): Dispatch | null {
  if (value === "bulk") return { taskIds: [], bulk: true };
  const ids = value.split(",").map((s) => s.trim());
  if (ids.some((id) => !ID.test(id))) return null;
  return { taskIds: [...new Set(ids)], bulk: false };
}

/** First line of `prompt` that is a valid `Dispatch:` line, or null. */
export function parseDispatchLine(prompt: string): Dispatch | null {
  for (const line of prompt.split(/\r?\n/)) {
    const m = LINE.exec(line);
    const d = m ? parseValue(m[1] ?? "") : null;
    if (d) return d;
  }
  return null;
}

/** Prompt text of a transcript record's `message.content`: a string, or joined text blocks. */
function contentText(content: unknown): string | null {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;
  const texts = content
    .filter((b) => b?.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string);
  return texts.length ? texts.join("\n") : null;
}

/**
 * The builder's dispatch prompt: the first `type: "user"` record of its JSONL
 * transcript, read lazily. Any read or parse error ⇒ null.
 */
export async function readDispatchPrompt(transcriptPath: string): Promise<string | null> {
  const stream = fs.createReadStream(transcriptPath, { encoding: "utf8" });
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });
  try {
    for await (const line of lines) {
      if (!line.trim()) continue;
      const record = JSON.parse(line);
      if (record?.type === "user") return contentText(record.message?.content);
    }
    return null;
  } catch {
    return null;
  } finally {
    lines.close();
    stream.destroy();
  }
}

/** Counter key for a dispatch: `bulk`, the single id, or the sorted ids joined by `+`. */
export function dispatchKey(d: Dispatch): string {
  if (d.bulk) return "bulk";
  return [...d.taskIds].sort().join("+");
}
