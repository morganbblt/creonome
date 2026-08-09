import { z } from "zod";
import { CreditsResponseSchema } from "./credits.js";
import { GenerationJobSchema } from "./generation-job.js";
import { ScriptDraftSchema } from "./script.js";

export const ProjectLevelSchema = z.enum([
  "idea",
  "script",
  "storyboard",
  "video",
]);

export const ProjectSchema = z.object({
  id: z.uuid(),
  opportunityId: z.uuid().nullable(),
  title: z.string().trim().min(3).max(160),
  status: z.enum(["active", "archived"]),
  currentLevel: ProjectLevelSchema,
  currentVersion: z.number().int().positive(),
  updatedAt: z.iso.datetime(),
});

export const ProjectPlatformSchema = z.enum([
  "tiktok",
  "instagram",
  "youtube",
  "multi_platform",
]);

export const ProjectSummarySchema = ProjectSchema.extend({
  platform: ProjectPlatformSchema.nullable(),
  score: z.number().int().min(0).max(100).nullable(),
  hasScript: z.boolean(),
  hasStoryboard: z.boolean(),
  hasVideo: z.boolean(),
});

export const ProjectListSchema = z.object({
  projects: z.array(ProjectSummarySchema),
});

export const ProjectVersionSchema = z.object({
  version: z.number().int().positive(),
  level: ProjectLevelSchema,
  changeSource: z.string().trim().min(1).max(80),
  changeSummary: z.string().trim().min(1).max(320).nullable(),
  lockedFields: z.array(z.string().trim().min(1).max(80)),
  createdAt: z.iso.datetime(),
});

export const StoryboardSceneSchema = z.object({
  id: z.uuid(),
  position: z.number().int().positive(),
  startSeconds: z.number().int().nonnegative().max(86_400).default(0),
  heading: z.string().trim().min(1).max(160),
  description: z.string().trim().min(3).max(2_000),
  shotType: z.string().trim().min(1).max(120).nullable(),
  voiceover: z.string().trim().min(1).max(2_000).nullable(),
  onScreenText: z.string().trim().min(1).max(500).nullable(),
  durationSeconds: z.number().int().positive().max(600).nullable(),
  bRoll: z.string().trim().min(1).max(1_000).nullable().default(null),
  transition: z.string().trim().min(1).max(500).nullable().default(null),
  requiredAsset: z.string().trim().min(1).max(500).nullable().default(null),
  sound: z.string().trim().min(1).max(1_000).nullable().default(null),
  editingNote: z.string().trim().min(1).max(1_000).nullable().default(null),
  referenceFrameUrl: z.url().nullable().default(null),
});

export const ProjectStoryboardSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1).max(160),
  aspectRatio: z.string().trim().min(3).max(24),
  durationSeconds: z.number().int().positive().max(3_600).nullable(),
  scenes: z.array(StoryboardSceneSchema),
});

export const ProjectVideoSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  previewUrl: z.string().trim().min(1).max(2_000),
  mimeType: z.string().trim().min(3).max(120),
  durationSeconds: z.number().int().positive().max(3_600).nullable(),
  width: z.number().int().positive().max(8_192),
  height: z.number().int().positive().max(8_192),
  provider: z.string().trim().min(1).max(120),
  model: z.string().trim().min(1).max(160),
  simulated: z.boolean(),
  createdAt: z.iso.datetime(),
});

export const ProjectDetailSchema = ProjectSummarySchema.extend({
  script: ScriptDraftSchema.nullable(),
  storyboard: ProjectStoryboardSchema.nullable(),
  video: ProjectVideoSchema.nullable().default(null),
  versions: z.array(ProjectVersionSchema),
  latestJob: GenerationJobSchema.nullable(),
});

/**
 * Field-locking granularity for a `/projects/:id/upgrade` regeneration
 * request (bible §9.6). Locking is per-target-level:
 *  - storyboard: top-level fields ("title", "aspectRatio", "durationSeconds")
 *    plus a per-scene lock addressed by 1-based position, e.g.
 *    "scene:2:voiceover" (see STORYBOARD_SCENE_LOCKABLE_FIELDS below).
 *  - video: technical output fields ("durationSeconds", "width", "height").
 * The exact set of legal field names per level is enforced server-side in
 * apps/api/src/modules/projects/locked-fields.ts (kept out of the shared
 * contract so the API can evolve the allow-list without a contract bump);
 * this schema only bounds the shape (a short list of short strings).
 */
export const UpgradeProjectInputSchema = z.object({
  targetLevel: z.enum(["storyboard", "video"]),
  confirmedCreditCost: z.literal(true),
  lockedFields: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
});

export const UpgradeProjectResultSchema = z.object({
  project: ProjectSchema,
  storyboard: ProjectStoryboardSchema,
  job: GenerationJobSchema,
  credits: CreditsResponseSchema,
});

export const UpgradeVideoResultSchema = z.object({
  project: ProjectSchema,
  video: ProjectVideoSchema,
  job: GenerationJobSchema,
  credits: CreditsResponseSchema,
});

export type Project = z.infer<typeof ProjectSchema>;
export type ProjectDetail = z.infer<typeof ProjectDetailSchema>;
export type ProjectLevel = z.infer<typeof ProjectLevelSchema>;
export type ProjectList = z.infer<typeof ProjectListSchema>;
export type ProjectPlatform = z.infer<typeof ProjectPlatformSchema>;
export type ProjectStoryboard = z.infer<typeof ProjectStoryboardSchema>;
export type ProjectVideo = z.infer<typeof ProjectVideoSchema>;
export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;
export type ProjectVersion = z.infer<typeof ProjectVersionSchema>;
export type StoryboardScene = z.infer<typeof StoryboardSceneSchema>;
export type UpgradeProjectInput = z.infer<typeof UpgradeProjectInputSchema>;
export type UpgradeProjectResult = z.infer<typeof UpgradeProjectResultSchema>;
export type UpgradeVideoResult = z.infer<typeof UpgradeVideoResultSchema>;
