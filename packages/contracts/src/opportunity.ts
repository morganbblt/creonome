import { z } from "zod";
import { CreditsResponseSchema } from "./credits.js";
import { GenerationJobSchema } from "./generation-job.js";
import { ProjectLevelSchema, ProjectSchema } from "./project.js";

export const OpportunityStrategySchema = z.enum([
  "signature",
  "stretch",
  "repeatable",
]);

export const OpportunitySchema = z.object({
  id: z.uuid(),
  strategy: OpportunityStrategySchema,
  title: z.string().trim().min(3).max(120),
  pitch: z.string().trim().min(12).max(320),
  score: z.number().int().min(0).max(100),
  confidence: z.enum(["low", "medium", "high"]),
  freshness: z.enum(["new", "fresh", "aging"]),
  nextLevel: z.enum(["idea", "script", "storyboard", "video"]),
  creditCost: z.number().int().min(0).max(100),
});

export const OpportunityBatchSchema = z.object({
  generatedAt: z.iso.datetime(),
  opportunities: z.array(OpportunitySchema).length(3),
});

export const OpportunityDetailSchema = OpportunitySchema.extend({
  currentLevel: ProjectLevelSchema,
  projectId: z.uuid().nullable(),
  hook: z.string().trim().min(3).max(220),
  rationale: z.string().trim().min(12).max(640),
  reserve: z.string().trim().min(3).max(320).nullable(),
  effort: z.enum(["low", "medium", "high"]),
  platform: z.enum(["tiktok", "instagram", "youtube", "multi_platform"]),
  estimatedDurationSeconds: z.number().int().positive().max(600).nullable(),
  evidence: z.array(z.string().trim().min(3).max(240)).max(4),
});

export const OpportunityMemoryScopeSchema = z.enum([
  "idea",
  "project",
  "creator",
]);

export const ModifyOpportunityInputSchema = z.object({
  instruction: z.string().trim().min(3).max(1_000),
  memoryScope: OpportunityMemoryScopeSchema.default("idea"),
  lockedFields: z
    .array(z.enum(["title", "pitch", "hook", "duration", "platform"]))
    .max(5)
    .default([]),
});

export const MemoryCandidateSchema = z.object({
  id: z.uuid(),
  status: z.literal("pending"),
  scope: OpportunityMemoryScopeSchema,
  content: z.string().trim().min(3).max(500),
});

export const OpportunityRevisionSchema = z.object({
  project: ProjectSchema,
  version: z.number().int().positive(),
  title: z.string().trim().min(3).max(160),
  pitch: z.string().trim().min(12).max(320),
  hook: z.string().trim().min(3).max(220),
  changeSummary: z.string().trim().min(3).max(320),
  memoryCandidate: MemoryCandidateSchema.nullable(),
});

export const UpgradeOpportunityInputSchema = z.object({
  targetLevel: z.literal("script"),
  confirmedCreditCost: z.literal(true),
});

export const ScriptDraftSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  title: z.string().trim().min(3).max(160),
  hook: z.string().trim().min(3).max(220),
  body: z.string().trim().min(12).max(4_000),
  callToAction: z.string().trim().min(3).max(220).nullable(),
  caption: z.string().trim().min(3).max(2_200).nullable(),
  platforms: z.array(z.enum(["tiktok", "instagram", "youtube"])).min(1),
  durationSeconds: z.number().int().positive().max(600).nullable(),
});

export const UpgradeOpportunityResultSchema = z.object({
  project: ProjectSchema,
  script: ScriptDraftSchema,
  job: GenerationJobSchema,
  credits: CreditsResponseSchema,
});

export type Opportunity = z.infer<typeof OpportunitySchema>;
export type OpportunityBatch = z.infer<typeof OpportunityBatchSchema>;
export type OpportunityDetail = z.infer<typeof OpportunityDetailSchema>;
export type OpportunityMemoryScope = z.infer<
  typeof OpportunityMemoryScopeSchema
>;
export type ModifyOpportunityInput = z.infer<
  typeof ModifyOpportunityInputSchema
>;
export type MemoryCandidate = z.infer<typeof MemoryCandidateSchema>;
export type OpportunityRevision = z.infer<typeof OpportunityRevisionSchema>;
export type UpgradeOpportunityInput = z.infer<
  typeof UpgradeOpportunityInputSchema
>;
export type ScriptDraft = z.infer<typeof ScriptDraftSchema>;
export type UpgradeOpportunityResult = z.infer<
  typeof UpgradeOpportunityResultSchema
>;
export type OpportunityStrategy = z.infer<typeof OpportunityStrategySchema>;
