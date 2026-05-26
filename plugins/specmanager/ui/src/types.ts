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

export interface FeatureRow {
  id: string;
  slug: string;
  title: string;
  currentStage: Stage;
  documents: DocCard[];
  tasks: TaskCounts;
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
  | { type: "file.changed"; filePath: string };
