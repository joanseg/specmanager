import { Board, DocFull, DocStatus, GateResult, Stage, WsEvent } from "./types";

export async function fetchBoard(): Promise<Board> {
  const res = await fetch("/api/board");
  if (!res.ok) throw new Error(`/api/board → ${res.status}`);
  return (await res.json()) as Board;
}

export async function fetchDoc(id: string): Promise<DocFull> {
  const res = await fetch(`/api/documents/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`/api/documents/${id} → ${res.status}`);
  return (await res.json()) as DocFull;
}

export interface PutDocOk { ok: true; doc: DocFull; }
export interface PutDocConflict { ok: false; status: number; error: string; }

export async function putDoc(
  id: string,
  body: string,
  baseVersion: number,
  title?: string
): Promise<PutDocOk | PutDocConflict> {
  const res = await fetch(`/api/documents/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ body, baseVersion, title }),
  });
  if (res.ok) return { ok: true, doc: (await res.json()) as DocFull };
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return { ok: false, status: res.status, error: data.error ?? `HTTP ${res.status}` };
}

export async function postDocStatus(id: string, status: DocStatus): Promise<DocFull> {
  const res = await fetch(`/api/documents/${encodeURIComponent(id)}/status`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as DocFull;
}

export async function fetchGate(featureId: string, stage: Stage): Promise<GateResult> {
  const res = await fetch(
    `/api/features/${encodeURIComponent(featureId)}/gate?stage=${stage}`
  );
  if (!res.ok) throw new Error(`gate check → ${res.status}`);
  return (await res.json()) as GateResult;
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
