import { z } from "zod";
export const STAGE = z.enum(["prd", "architecture", "plan", "walkthrough"]);
export const DOC_STATUS = z.enum(["draft", "approved"]);
export const TASK_STATUS = z.enum(["todo", "in_progress", "done"]);
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
export const MAX_TASK_COMPLEXITY = 3;
export const DEFAULT_PHASE = "default";
export const GENERATED_BY = z.enum(["agent", "human"]);
export const FeatureSchema = z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    currentStage: STAGE.default("prd"),
    createdAt: z.string(),
});
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
export const TaskArtifactsSchema = z.object({
    commits: z.array(z.string()).default([]),
    files: z.array(z.string()).default([]),
    pr: z.string().nullable().default(null),
});
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
export const TasksFileSchema = z.object({
    tasks: z.array(TaskSchema).default([]),
});
//# sourceMappingURL=types.js.map