import { z } from "zod";

export const STAGE = z.enum(["prd", "architecture", "design", "plan", "walkthrough"]);
export type Stage = z.infer<typeof STAGE>;

export const DOC_STATUS = z.enum(["draft", "approved"]);
export type DocStatus = z.infer<typeof DOC_STATUS>;

export const TASK_STATUS = z.enum(["todo", "in_progress", "done"]);
export type TaskStatus = z.infer<typeof TASK_STATUS>;

// Fibonacci scale. Anything ≥5 must be split before persisting — the planner
// agent self-checks, and create_task / update_task reject as a backstop.
export const TASK_COMPLEXITY = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(5),
  z.literal(8),
  z.literal(13),
]);
export type TaskComplexity = z.infer<typeof TASK_COMPLEXITY>;

export const MAX_TASK_COMPLEXITY = 3 as const;
export const DEFAULT_PHASE = "default" as const;

export const GENERATED_BY = z.enum(["agent", "human"]);
export type GeneratedBy = z.infer<typeof GENERATED_BY>;

export const FeatureSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  currentStage: STAGE.default("prd"),
  createdAt: z.string(),
});
export type Feature = z.infer<typeof FeatureSchema>;

export const DocFrontmatterSchema = z.object({
  id: z.string(),
  featureId: z.string(),
  stage: STAGE,
  status: DOC_STATUS.default("draft"),
  stale: z.boolean().default(false),
  title: z.string(),
  dependsOn: z.array(z.string()).default([]),
  basedOn: z.record(z.string(), z.number()).default({}),
  generatedBy: GENERATED_BY.default("human"),
  version: z.number().int().nonnegative().default(1),
  // Only meaningful for walkthrough docs; omitted on PRD/Architecture/Plan.
  // "default" = legacy per-feature walkthrough; "final" = the 7.C roll-up.
  phase: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type DocFrontmatter = z.infer<typeof DocFrontmatterSchema>;

export interface DocumentRecord {
  frontmatter: DocFrontmatter;
  body: string;
  filePath: string;
}

export const TaskArtifactsSchema = z.object({
  commits: z.array(z.string()).default([]),
  files: z.array(z.string()).default([]),
  pr: z.string().nullable().default(null),
});
export type TaskArtifacts = z.infer<typeof TaskArtifactsSchema>;

export const TaskSchema = z.object({
  id: z.string(),
  featureId: z.string(),
  title: z.string(),
  status: TASK_STATUS.default("todo"),
  stageRef: z.string().optional(),
  phase: z.string().default(DEFAULT_PHASE),
  complexity: TASK_COMPLEXITY.nullable().default(null),
  dependsOn: z.array(z.string()).default([]),
  artifacts: TaskArtifactsSchema.default({ commits: [], files: [], pr: null }),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Task = z.infer<typeof TaskSchema>;

export const TasksFileSchema = z.object({
  tasks: z.array(TaskSchema).default([]),
});
export type TasksFile = z.infer<typeof TasksFileSchema>;
