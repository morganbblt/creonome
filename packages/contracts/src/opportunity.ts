import { z } from "zod";
import { CreditsResponseSchema } from "./credits.js";
import { GenerationJobSchema } from "./generation-job.js";
import { ProjectLevelSchema, ProjectSchema } from "./project.js";
import { ScriptDraftSchema } from "./script.js";

export { ScriptDraftSchema } from "./script.js";
export type { ScriptDraft } from "./script.js";

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

export const TrendSignalSchema = z.object({
  status: z.enum(["ok", "partial", "unavailable"]),
  title: z.string().trim().min(3).max(160).nullable(),
  lifecycle: z.string().trim().min(2).max(40).nullable(),
  momentumScore: z.number().int().min(0).max(100).nullable(),
  observedAt: z.iso.datetime().nullable(),
  evidenceCount: z.number().int().min(0),
  source: z.enum(["trend_radar", "sample", "unavailable"]),
  reason: z.string().trim().min(3).max(240).nullable(),
});

const UnavailableTrendSignal = {
  status: "unavailable" as const,
  title: null,
  lifecycle: null,
  momentumScore: null,
  observedAt: null,
  evidenceCount: 0,
  source: "unavailable" as const,
  reason: "No normalized trend signal is attached to this opportunity.",
};

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
  trendSignal: TrendSignalSchema.default(UnavailableTrendSignal),
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

export const OpportunityFeedbackActionSchema = z.enum([
  "this_is_me",
  "almost",
  "not_my_style",
  "good_idea_bad_wording",
  "never_use",
  "always_do",
]);

export const OpportunityFeedbackInputSchema = z.object({
  action: OpportunityFeedbackActionSchema,
  comment: z.string().trim().min(3).max(500).optional(),
});

export const OpportunityFeedbackResultSchema = z.object({
  id: z.uuid(),
  opportunityId: z.uuid(),
  action: OpportunityFeedbackActionSchema,
  memoryCandidate: MemoryCandidateSchema.nullable(),
  createdAt: z.iso.datetime(),
});

export const UpgradeOpportunityInputSchema = z.object({
  targetLevel: z.literal("script"),
  confirmedCreditCost: z.literal(true),
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
export type TrendSignal = z.infer<typeof TrendSignalSchema>;
export type OpportunityMemoryScope = z.infer<
  typeof OpportunityMemoryScopeSchema
>;
export type ModifyOpportunityInput = z.infer<
  typeof ModifyOpportunityInputSchema
>;
export type MemoryCandidate = z.infer<typeof MemoryCandidateSchema>;
export type OpportunityRevision = z.infer<typeof OpportunityRevisionSchema>;
export type OpportunityFeedbackAction = z.infer<
  typeof OpportunityFeedbackActionSchema
>;
export type OpportunityFeedbackInput = z.infer<
  typeof OpportunityFeedbackInputSchema
>;
export type OpportunityFeedbackResult = z.infer<
  typeof OpportunityFeedbackResultSchema
>;
export type UpgradeOpportunityInput = z.infer<
  typeof UpgradeOpportunityInputSchema
>;
export type UpgradeOpportunityResult = z.infer<
  typeof UpgradeOpportunityResultSchema
>;
export type OpportunityStrategy = z.infer<typeof OpportunityStrategySchema>;
