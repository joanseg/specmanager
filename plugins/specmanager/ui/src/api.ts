import {
  Board,
  DocFull,
  DocStatus,
  GateResult,
  HandoffResult,
  ResearchDocFull,
  Stage,
  Study,
  StudySummary,
  Task,
  TaskStatus,
  WsEvent,
} from "./types";

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

export async function fetchTasks(featureId: string): Promise<Task[]> {
  const res = await fetch(`/api/features/${encodeURIComponent(featureId)}/tasks`);
  if (!res.ok) throw new Error(`/api/features/${featureId}/tasks → ${res.status}`);
  return (await res.json()) as Task[];
}

export async function createTaskApi(
  featureId: string,
  title: string
): Promise<Task> {
  const res = await fetch(`/api/features/${encodeURIComponent(featureId)}/tasks`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`create task → ${res.status}`);
  return (await res.json()) as Task;
}

export async function patchTask(
  featureId: string,
  taskId: string,
  patch: {
    status?: TaskStatus;
    title?: string;
    artifacts?: { commits?: string[]; files?: string[]; pr?: string | null };
  }
): Promise<Task> {
  const res = await fetch(
    `/api/features/${encodeURIComponent(featureId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    }
  );
  if (!res.ok) throw new Error(`patch task → ${res.status}`);
  return (await res.json()) as Task;
}

export async function fetchGate(featureId: string, stage: Stage): Promise<GateResult> {
  const res = await fetch(
    `/api/features/${encodeURIComponent(featureId)}/gate?stage=${stage}`
  );
  if (!res.ok) throw new Error(`gate check → ${res.status}`);
  return (await res.json()) as GateResult;
}

async function errorOf(res: Response): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return data.error ?? `HTTP ${res.status}`;
}

export async function fetchStudies(studyId?: string): Promise<StudySummary[]> {
  const qs = studyId ? `?studyId=${encodeURIComponent(studyId)}` : "";
  const res = await fetch(`/api/studies${qs}`);
  if (!res.ok) throw new Error(`/api/studies → ${res.status}`);
  return (await res.json()) as StudySummary[];
}

export async function createStudyApi(title: string, idea: string): Promise<Study> {
  const res = await fetch("/api/studies", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title, idea }),
  });
  if (!res.ok) throw new Error(await errorOf(res));
  return (await res.json()) as Study;
}

export async function fetchResearchDoc(id: string): Promise<ResearchDocFull> {
  const res = await fetch(`/api/research/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`/api/research/${id} → ${res.status}`);
  return (await res.json()) as ResearchDocFull;
}

export interface PutResearchOk { ok: true; doc: ResearchDocFull; }

export async function putResearchDoc(
  id: string,
  body: string,
  baseVersion: number,
  title?: string
): Promise<PutResearchOk | PutDocConflict> {
  const res = await fetch(`/api/research/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ body, baseVersion, title }),
  });
  if (res.ok) return { ok: true, doc: (await res.json()) as ResearchDocFull };
  return { ok: false, status: res.status, error: await errorOf(res) };
}

export async function postHandoff(studyId: string, itemIds: string[]): Promise<HandoffResult> {
  const res = await fetch(`/api/studies/${encodeURIComponent(studyId)}/handoff`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ itemIds }),
  });
  if (!res.ok) throw new Error(await errorOf(res));
  return (await res.json()) as HandoffResult;
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
