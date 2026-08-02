import { z } from "zod";
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
  heading: z.string().trim().min(1).max(160),
  description: z.string().trim().min(3).max(2_000),
  shotType: z.string().trim().min(1).max(120).nullable(),
  voiceover: z.string().trim().min(1).max(2_000).nullable(),
  onScreenText: z.string().trim().min(1).max(500).nullable(),
  durationSeconds: z.number().int().positive().max(600).nullable(),
});

export const ProjectStoryboardSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1).max(160),
  aspectRatio: z.string().trim().min(3).max(24),
  durationSeconds: z.number().int().positive().max(3_600).nullable(),
  scenes: z.array(StoryboardSceneSchema),
});

export const ProjectDetailSchema = ProjectSummarySchema.extend({
  script: ScriptDraftSchema.nullable(),
  storyboard: ProjectStoryboardSchema.nullable(),
  versions: z.array(ProjectVersionSchema),
  latestJob: GenerationJobSchema.nullable(),
});

export type Project = z.infer<typeof ProjectSchema>;
export type ProjectDetail = z.infer<typeof ProjectDetailSchema>;
export type ProjectLevel = z.infer<typeof ProjectLevelSchema>;
export type ProjectList = z.infer<typeof ProjectListSchema>;
export type ProjectPlatform = z.infer<typeof ProjectPlatformSchema>;
export type ProjectStoryboard = z.infer<typeof ProjectStoryboardSchema>;
export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;
export type ProjectVersion = z.infer<typeof ProjectVersionSchema>;
export type StoryboardScene = z.infer<typeof StoryboardSceneSchema>;
