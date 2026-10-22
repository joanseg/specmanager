import { z } from "zod";

export const STAGE = z.enum(["prd", "architecture", "design", "plan", "walkthrough"]);
export type Stage = z.infer<typeof STAGE>;

export const DOC_STATUS = z.enum(["draft", "approved"]);
export type DocStatus = z.infer<typeof DOC_STATUS>;

// `blocked` (R1 AC2 / R3 AC5): the Stop-gate iteration cap flips a phase's open
// tasks to `blocked` so the board surfaces a first-class state. Remediation:
// re-enter the phase (counter resets) and rebuild — that clears the block.
export const TASK_STATUS = z.enum(["todo", "in_progress", "done", "blocked"]);
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

// Discriminates non-lifecycle artifacts that live inside a stage folder.
// "interview" = the optional pre-PRD interview stored in the prd stage;
// excluded from gating, stage labels, and the board's primary stage card.
export const DOC_KIND = z.enum(["interview"]);
export type DocKind = z.infer<typeof DOC_KIND>;

// Provenance of a feature handed off from a research study's strategy build list.
// Lives on feature.json, never in dependsOn, so research stays out of staleness.
export const FeatureOriginSchema = z.object({
  studyId: z.string(),
  strategyId: z.string(),
  strategyVersion: z.number().int().nonnegative(),
  rank: z.number().int().positive(),
  itemId: z.string(),
  item: z.string(),
});
export type FeatureOrigin = z.infer<typeof FeatureOriginSchema>;

export const FeatureSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  currentStage: STAGE.default("prd"),
  origin: FeatureOriginSchema.optional(),
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
  // Only meaningful for prd-stage docs; absent everywhere else. "interview"
  // marks the pre-PRD interview artifact (kind is immutable after creation).
  kind: DOC_KIND.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type DocFrontmatter = z.infer<typeof DocFrontmatterSchema>;

// Researcher mode, under .claude/specs/research/<slug>/: one doc per single kind per study;
// `doc` is the multi-per-study HTML kind and carries a `docType`.
export const RESEARCH_KIND = z.enum(["brief", "market", "doc", "user-research", "marketing", "strategy"]);
export type ResearchKind = z.infer<typeof RESEARCH_KIND>;

// Preset doc types; any other non-empty `docType` string is a custom type (its own label).
export const DOC_TYPE_PRESETS = [
  "wireframes",
  "client-presentation",
  "partner-presentation",
  "investor-deck",
  "one-pager",
] as const;

export const StudySchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  idea: z.string(),
  createdAt: z.string(),
});
export type Study = z.infer<typeof StudySchema>;

/** Legacy `kind: concepts` frontmatter reads as a wireframes doc; id and versions are untouched. */
function normalizeLegacyConcepts(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const fm = raw as Record<string, unknown>;
  return fm.kind === "concepts" ? { ...fm, kind: "doc", docType: "wireframes" } : fm;
}

// No status or stale: research docs are never approved; "outdated" is computed.
// `findings` lists ingested note filenames and is valid only on user-research.
// `docType` is required on `doc` and rejected on every other kind.
export const ResearchDocFrontmatterSchema = z
  .preprocess(normalizeLegacyConcepts, z.object({
    id: z.string(),
    studyId: z.string(),
    kind: RESEARCH_KIND,
    title: z.string(),
    dependsOn: z.array(z.string()).default([]),
    basedOn: z.record(z.string(), z.number()).default({}),
    generatedBy: GENERATED_BY.default("human"),
    version: z.number().int().nonnegative().default(1),
    findings: z.array(z.string()).optional(),
    docType: z.string().min(1).optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }))
  .refine((fm) => fm.findings === undefined || fm.kind === "user-research", {
    message: "findings is only valid on user-research docs",
    path: ["findings"],
  })
  .refine((fm) => (fm.docType !== undefined) === (fm.kind === "doc"), {
    message: "docType is required on doc and only valid on doc",
    path: ["docType"],
  });
export type ResearchDocFrontmatter = z.infer<typeof ResearchDocFrontmatterSchema>;

export interface ResearchDocRecord {
  frontmatter: ResearchDocFrontmatter;
  body: string;
  filePath: string;
}

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

// Per-phase metadata the planner emits (R1 testCommand, R3 architectureRefs).
// `testCommand`: a runnable shell command, or the literal "none" for an
// intentionally test-less phase. Absent ⇒ the gate's convention-probe fallback.
// `architectureRefs`: stable Architecture anchors (e.g. "R1", "core-active-card")
// the phase implements; used to assemble the reviewer's spec slice.
// `kind`: "build" (default), "spike", or "placeholder" (meta-only, zero tasks,
// filled after the spike). `prerequisites`: human setup the phase needs.

// A human prerequisite: what is needed and how to grant it, never a secret value.
// `neededBy`: task ids; [] means needed from the first task.
export const PrerequisiteSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.enum(["account", "credential", "access", "test-account", "other"]),
  neededBy: z.array(z.string()).default([]),
  grantVia: z.string().optional(),
});
export type Prerequisite = z.infer<typeof PrerequisiteSchema>;

export const PhaseKindSchema = z.enum(["build", "spike", "placeholder"]);
export type PhaseKind = z.infer<typeof PhaseKindSchema>;

export const PhaseMetaSchema = z.object({
  testCommand: z.string(),
  architectureRefs: z.array(z.string()).default([]),
  kind: PhaseKindSchema.default("build"),
  prerequisites: z.array(PrerequisiteSchema).default([]),
});
export type PhaseMeta = z.infer<typeof PhaseMetaSchema>;

// Optional `blocked` note surfaced by the Stop-gate iteration cap (R1 AC2).
// Keyed by phase name; cleared when the phase is re-entered and rebuilt.
export const TasksMetaSchema = z.object({
  phases: z.record(z.string(), PhaseMetaSchema).default({}),
  blocked: z.record(z.string(), z.string()).default({}),
});
export type TasksMeta = z.infer<typeof TasksMetaSchema>;

export const TasksFileSchema = z.object({
  tasks: z.array(TaskSchema).default([]),
  // Zod defaults ⇒ zero migration; pre-existing tasks.json keep working.
  meta: TasksMetaSchema.default({ phases: {}, blocked: {} }),
});
export type TasksFile = z.infer<typeof TasksFileSchema>;
