// Mirror of the server's manifest shape (see core/manifest.ts).
// Kept lean so the UI can read /api/board without pulling server types.

export type Stage = "prd" | "architecture" | "design" | "plan" | "walkthrough";
export const STAGES: Stage[] = ["prd", "architecture", "design", "plan", "walkthrough"];
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
  // "interview" = pre-PRD interview artifact in the prd stage; rendered as a
  // chip beneath the PRD card, never as the column's primary card.
  kind?: "interview";
}

export interface DocFull {
  id: string;
  featureId: string;
  stage: Stage;
  status: DocStatus;
  stale: boolean;
  kind?: "interview";
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

export type TaskStatus = "todo" | "in_progress" | "done" | "blocked";

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
  blocked: number;
  total: number;
}

export type PhaseStatus = "empty" | "todo" | "in_progress" | "done" | "blocked";

export interface PhaseRollup {
  name: string;
  order: number;
  taskCount: number;
  doneCount: number;
  inProgressCount: number;
  blockedCount: number;
  status: PhaseStatus;
  walkthroughId: string | null;
  walkthroughStatus: DocStatus | null;
  walkthroughStale: boolean | null;
}

// Provenance of a feature handed off from a study's strategy build list.
export interface FeatureOrigin {
  studyId: string;
  strategyId: string;
  strategyVersion: number;
  rank: number;
  itemId: string;
  item: string;
}

export interface FeatureRow {
  id: string;
  slug: string;
  title: string;
  currentStage: Stage;
  origin?: FeatureOrigin;
  documents: DocCard[];
  tasks: TaskCounts;
  phases: PhaseRollup[];
}

export interface Board {
  generatedAt: string;
  projectName: string;
  features: FeatureRow[];
}

// Mirror of core/research.ts `StudySummary` (GET /api/studies).
export type ResearchKind = "brief" | "market" | "doc" | "user-research" | "marketing" | "strategy";
export type ResearchStep =
  | "market"
  | "docs"
  | "user-research"
  | "marketing"
  | "findings"
  | "strategy"
  | "handoff";
export type StepState = "done" | "next" | "flag" | "open" | "locked";

export interface StepStatus {
  step: ResearchStep;
  state: StepState;
  reason?: string;
}

export interface BuildItem {
  rank: number;
  itemId: string;
  title: string;
  rationale: string;
}

export interface Study {
  id: string;
  slug: string;
  title: string;
  idea: string;
  createdAt: string;
}

export interface StudyDocCard {
  id: string;
  kind: ResearchKind;
  docType?: string;
  title: string;
  version: number;
  filePath: string;
  outdated: string[];
}

export interface StudySummary extends Study {
  docs: StudyDocCard[];
  newNotes: string[];
  nextStep: ResearchStep | null;
  steps: StepStatus[];
  buildList: BuildItem[];
  handedOff: string[];
  handoffs: Handoff[];
}

/** One handed-off build item and the Builder feature it became. */
export interface Handoff {
  itemId: string;
  featureId: string;
  slug: string;
}

// GET/PUT /api/research/:id — frontmatter plus body; no status or stale.
export interface ResearchDocFull {
  id: string;
  studyId: string;
  kind: ResearchKind;
  docType?: string;
  title: string;
  body: string;
  version: number;
  dependsOn: string[];
  basedOn: Record<string, number>;
  generatedBy: "agent" | "human";
  findings?: string[];
  createdAt: string;
  updatedAt: string;
  filePath: string;
}

export interface HandoffResult {
  created: { id: string; slug: string; title: string; currentStage: Stage; origin?: FeatureOrigin; createdAt: string }[];
  skipped: { itemId: string; featureId: string }[];
}

export type WsEvent =
  | { type: "feature.created"; featureId: string }
  | { type: "study.created"; studyId: string }
  | { type: "research.created"; documentId: string; studyId: string }
  | { type: "research.updated"; documentId: string; studyId: string; version: number }
  | { type: "document.created"; documentId: string; featureId: string }
  | { type: "document.updated"; documentId: string; featureId: string; version: number }
  | { type: "status.changed"; documentId: string; from: string; to: string }
  | { type: "stale.flagged"; documentId: string; cause: string }
  | { type: "stale.cleared"; documentId: string }
  | { type: "task.updated"; taskId: string; featureId: string }
  | { type: "file.changed"; filePath: string }
  | { type: "feature.shipped"; featureId: string }
  | { type: "design.synced"; path: string; mode: "init" | "refresh" };
