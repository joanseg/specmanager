// Mirror of the server's manifest shape (see core/manifest.ts).
// Kept lean so the UI can read /api/board without pulling server types.

export type Stage = "prd" | "architecture" | "plan" | "walkthrough";
export const STAGES: Stage[] = ["prd", "architecture", "plan", "walkthrough"];
export const COLUMNS = [...STAGES, "build" as const] as const;
export type Column = (typeof COLUMNS)[number];

export type DocStatus = "draft" | "approved";

export interface DocCard {
  id: string;
  stage: Stage;
  status: DocStatus;
  stale: boolean;
  version: number;
  title: string;
  phase?: string;
}

export interface DocFull {
  id: string;
  featureId: string;
  stage: Stage;
  status: DocStatus;
  stale: boolean;
  title: string;
  body: string;
  version: number;
  dependsOn: string[];
  basedOn: Record<string, number>;
  generatedBy: "agent" | "human";
  createdAt: string;
  updatedAt: string;
  filePath: string;
}

export interface GateResult {
  ok: boolean;
  reason?: string;
}

export type TaskStatus = "todo" | "in_progress" | "done";

export interface TaskArtifacts {
  commits: string[];
  files: string[];
  pr: string | null;
}

export interface Task {
  id: string;
  featureId: string;
  title: string;
  status: TaskStatus;
  stageRef?: string;
  phase?: string;
  complexity?: 1 | 2 | 3 | 5 | 8 | 13 | null;
  dependsOn: string[];
  artifacts: TaskArtifacts;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCounts {
  todo: number;
  in_progress: number;
  done: number;
  total: number;
}

export type PhaseStatus = "empty" | "todo" | "in_progress" | "done";

export interface PhaseRollup {
  name: string;
  order: number;
  taskCount: number;
  doneCount: number;
  inProgressCount: number;
  status: PhaseStatus;
  walkthroughId: string | null;
  walkthroughStatus: DocStatus | null;
  walkthroughStale: boolean | null;
}

export interface FeatureRow {
  id: string;
  slug: string;
  title: string;
  currentStage: Stage;
  documents: DocCard[];
  tasks: TaskCounts;
  phases: PhaseRollup[];
}

export interface Board {
  generatedAt: string;
  features: FeatureRow[];
}

export type WsEvent =
  | { type: "feature.created"; featureId: string }
  | { type: "document.created"; documentId: string; featureId: string }
  | { type: "document.updated"; documentId: string; featureId: string; version: number }
  | { type: "status.changed"; documentId: string; from: string; to: string }
  | { type: "stale.flagged"; documentId: string; cause: string }
  | { type: "stale.cleared"; documentId: string }
  | { type: "task.updated"; taskId: string; featureId: string }
  | { type: "file.changed"; filePath: string }
  | { type: "chat.started"; docId: string }
  | { type: "chat.cancelled"; docId: string; ok: boolean }
  | { type: "chat.info"; docId: string; reason?: string }
  | { type: "chat.delta"; docId: string; text?: string }
  | { type: "chat.tool"; docId: string; tool?: { name: string; input?: unknown; ok?: boolean; error?: string } }
  | { type: "chat.done"; docId: string; text?: string }
  | { type: "chat.error"; docId: string; reason?: string };

export interface ChatStatus {
  available: boolean;
  reason?: string;
}
