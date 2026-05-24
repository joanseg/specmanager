import { z } from "zod";

export const STAGE = z.enum(["prd", "architecture", "plan", "walkthrough"]);
export type Stage = z.infer<typeof STAGE>;

export const DOC_STATUS = z.enum(["draft", "approved"]);
export type DocStatus = z.infer<typeof DOC_STATUS>;

export const TASK_STATUS = z.enum(["todo", "in_progress", "done"]);
export type TaskStatus = z.infer<typeof TASK_STATUS>;

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
