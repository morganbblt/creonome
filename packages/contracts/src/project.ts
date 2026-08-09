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
  /**
   * A Library asset the creator explicitly attached to this scene (P2.4),
   * distinct from `requiredAsset` above (an AI-generated free-text
   * description of what footage a scene needs). Set via
   * `PATCH /projects/:id/storyboard/scenes/:sceneId/asset`; untouched by a
   * scene-level regenerate (`PATCH .../scenes/:sceneId`), so it survives
   * the same way a locked field would.
   */
  assetId: z.uuid().nullable().default(null),
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

/**
 * The four editable "blocks" of a script (bible §15.3). `title`,
 * `platforms` and `durationSeconds` are deliberately excluded — they are
 * metadata rather than spoken/visual content, so `PATCH /projects/:id/script`
 * never touches them. Kept in the shared contract (unlike the storyboard's
 * server-only allow-list in locked-fields.ts) because these are literally
 * the field names already on {@link ScriptDraftSchema}, not a separately
 * evolving allow-list.
 */
export const SCRIPT_BLOCK_FIELDS = [
  "hook",
  "body",
  "callToAction",
  "caption",
] as const;
export const ScriptBlockFieldSchema = z.enum(SCRIPT_BLOCK_FIELDS);
export type ScriptBlockField = z.infer<typeof ScriptBlockFieldSchema>;

/**
 * Input for `PATCH /projects/:id/script` (bible §15.3): regenerates every
 * script block from a targeted instruction, preserving any block listed in
 * `lockedFields` exactly (bible §9.6). Synchronous and free, like
 * `POST /opportunities/:id/modify` — unlike storyboard/video `/upgrade`,
 * a single script edit is small and fast enough not to need the Cloud
 * Tasks queue or a credit reservation.
 */
export const RegenerateScriptBlockInputSchema = z.object({
  field: ScriptBlockFieldSchema,
  instruction: z.string().trim().min(3).max(600),
  lockedFields: z.array(ScriptBlockFieldSchema).max(3).default([]),
});
export type RegenerateScriptBlockInput = z.infer<
  typeof RegenerateScriptBlockInputSchema
>;

export const RegenerateScriptBlockResultSchema = z.object({
  project: ProjectSchema,
  script: ScriptDraftSchema,
});
export type RegenerateScriptBlockResult = z.infer<
  typeof RegenerateScriptBlockResultSchema
>;

/**
 * Input for `PATCH /projects/:id/storyboard/scenes/:sceneId` (bible §15.4):
 * regenerates one scene in place. `lockedFields` are plain
 * STORYBOARD_SCENE_LOCKABLE_FIELDS names (unprefixed — the scene is already
 * scoped by the URL param), matching apps/api's
 * locked-fields.ts#STORYBOARD_SCENE_LOCKABLE_FIELDS. Like the script block
 * edit above, this is synchronous and free.
 */
export const RegenerateStoryboardSceneInputSchema = z.object({
  instruction: z.string().trim().min(3).max(600).optional(),
  lockedFields: z.array(z.string().trim().min(1).max(60)).max(11).default([]),
});
export type RegenerateStoryboardSceneInput = z.infer<
  typeof RegenerateStoryboardSceneInputSchema
>;

export const RegenerateStoryboardSceneResultSchema = z.object({
  project: ProjectSchema,
  storyboard: ProjectStoryboardSchema,
});
export type RegenerateStoryboardSceneResult = z.infer<
  typeof RegenerateStoryboardSceneResultSchema
>;

/**
 * Input for `PATCH /projects/:id/storyboard/scenes/reorder`: a full
 * permutation of the storyboard's current scene ids in their new order.
 * Purely mechanical (no generation, no locks to check).
 */
export const ReorderStoryboardScenesInputSchema = z.object({
  sceneIds: z.array(z.uuid()).min(1).max(8),
});
export type ReorderStoryboardScenesInput = z.infer<
  typeof ReorderStoryboardScenesInputSchema
>;

export const ReorderStoryboardScenesResultSchema = z.object({
  project: ProjectSchema,
  storyboard: ProjectStoryboardSchema,
});
export type ReorderStoryboardScenesResult = z.infer<
  typeof ReorderStoryboardScenesResultSchema
>;

/**
 * Input for `PATCH /projects/:id/storyboard/scenes/:sceneId/asset`
 * (P2.4): attaches (or, with `assetId: null`, detaches) one Library asset
 * to a single scene. Purely mechanical -- like the reorder endpoint above,
 * no generation and no locks to check, since attaching an asset never
 * changes AI-generated scene content.
 */
export const AttachStoryboardSceneAssetInputSchema = z.object({
  assetId: z.uuid().nullable(),
});
export type AttachStoryboardSceneAssetInput = z.infer<
  typeof AttachStoryboardSceneAssetInputSchema
>;

export const AttachStoryboardSceneAssetResultSchema = z.object({
  project: ProjectSchema,
  storyboard: ProjectStoryboardSchema,
});
export type AttachStoryboardSceneAssetResult = z.infer<
  typeof AttachStoryboardSceneAssetResultSchema
>;

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
