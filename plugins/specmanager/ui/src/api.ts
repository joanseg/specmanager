import { Board, WsEvent } from "./types";

export async function fetchBoard(): Promise<Board> {
  const res = await fetch("/api/board");
  if (!res.ok) throw new Error(`/api/board → ${res.status}`);
  return (await res.json()) as Board;
}

export function openWebSocket(onEvent: (event: WsEvent) => void): () => void {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${proto}//${location.host}/ws`);
  ws.addEventListener("message", (msg) => {
    try {
      onEvent(JSON.parse(msg.data) as WsEvent);
    } catch {
      // ignore malformed payloads
    }
  });
  return () => ws.close();
}
