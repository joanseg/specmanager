import os from "node:os";
import path from "node:path";

/**
 * Resolve the board-server PID file path.
 *
 * Prefers `${CLAUDE_PLUGIN_DATA}/board.pid` (the plugin's persistent data dir),
 * falling back to the OS temp dir when the env var is unset. Pure path
 * resolution — no filesystem side effects.
 */
export function pidFilePath(): string {
  const dir = process.env.CLAUDE_PLUGIN_DATA ?? os.tmpdir();
  return path.join(dir, "board.pid");
}
