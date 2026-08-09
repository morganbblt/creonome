export type ProjectSummaryRecord = {
  id: string;
  opportunityId: string | null;
  title: string;
  status: string;
  currentLevel: string;
  currentVersion: number;
  updatedAt: Date;
  platform: string | null;
  score: number | null;
};

export type ProjectScriptRecord = {
  id: string;
  projectId: string;
  title: string;
  hook: string;
  body: string;
  callToAction: string | null;
  caption: string | null;
  platforms: string[];
  durationSeconds: number | null;
};

export type ProjectSceneRecord = {
  id: string;
  position: number;
  startSeconds: number;
  heading: string;
  description: string;
  shotType: string | null;
  voiceover: string | null;
  onScreenText: string | null;
  bRoll: string | null;
  transition: string | null;
  requiredAsset: string | null;
  sound: string | null;
  editingNote: string | null;
  referenceFrameUrl: string | null;
  durationSeconds: number | null;
  /**
   * The Library asset explicitly attached to this scene (P2.4), or null.
   * Not AI-generated content -- see {@link GeneratedStoryboardScene}, which
   * deliberately omits this field so a scene-level regenerate never
   * touches it.
   */
  assetId: string | null;
};

export type ProjectStoryboardRecord = {
  id: string;
  title: string;
  aspectRatio: string;
  durationSeconds: number | null;
  scenes: ProjectSceneRecord[];
};

export type ProjectVideoRecord = {
  id: string;
  projectId: string;
  previewUrl: string;
  mimeType: string;
  durationSeconds: number | null;
  width: number;
  height: number;
  gcsUri: string;
  provider: string;
  model: string;
  simulated: boolean;
  createdAt: Date;
};

export type ProjectVersionRecord = {
  version: number;
  level: string;
  changeSource: string;
  changeSummary: string | null;
  lockedFields: string[];
  createdAt: Date;
};

export type ProjectJobRecord = {
  id: string;
  kind: string;
  provider: string;
  model: string;
  status: string;
  progress: number;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
};

export type ProjectDetailRecord = ProjectSummaryRecord & {
  script: ProjectScriptRecord | null;
  storyboard: ProjectStoryboardRecord | null;
  video: ProjectVideoRecord | null;
  versions: ProjectVersionRecord[];
  latestJob: ProjectJobRecord | null;
};

export type WorkflowProjectRecord = {
  id: string;
  opportunityId: string | null;
  title: string;
  status: string;
  currentLevel: string;
  currentVersion: number;
  updatedAt: Date;
};

export type StoryboardSourceRecord = {
  project: WorkflowProjectRecord;
  script: ProjectScriptRecord;
};

export type VideoSourceRecord = {
  project: WorkflowProjectRecord;
  script: ProjectScriptRecord;
  storyboard: ProjectStoryboardRecord;
  creativeIdentity: {
    stageName: string;
    bio: string | null;
    audienceDescription: string | null;
    languages: string[];
    genres: string[];
    dnaSummary: string | null;
    traits: string[];
    peopleReferenceImage?: {
      gcsUri: string;
      mimeType: "image/jpeg" | "image/png" | "image/webp";
    } | null;
  };
};

export type GeneratedStoryboardScene = Omit<
  ProjectSceneRecord,
  "id" | "position" | "startSeconds" | "durationSeconds" | "assetId"
> & { durationSeconds: number };

export type GeneratedStoryboard = {
  title: string;
  aspectRatio: string;
  durationSeconds: number;
  scenes: GeneratedStoryboardScene[];
};

export type StoryboardUpgradeRecord = {
  project: WorkflowProjectRecord;
  storyboard: ProjectStoryboardRecord;
  job: ProjectJobRecord;
};

export type CreateStoryboardUpgradeInput = {
  workspaceId: string;
  creatorProfileId: string;
  userId: string;
  projectId: string;
  idempotencyKey: string;
  provider: string;
  model: string;
  generated: GeneratedStoryboard;
  /**
   * Field names (bible §9.6) the caller asked to preserve across this
   * generation, e.g. "title" or "scene:2:voiceover". Recorded on the new
   * project_versions row for the version-history UI; lock *enforcement*
   * itself happens earlier, in ProjectWorkflowService, before this method
   * is called.
   */
  lockedFields: string[];
  /**
   * The generation_jobs row already inserted as "queued" by the public
   * controller action before the Cloud Tasks task ran. When provided, this
   * method updates that row to "succeeded" instead of inserting a new one.
   */
  jobId?: string;
};

export type VideoUpgradeRecord = {
  project: WorkflowProjectRecord;
  video: ProjectVideoRecord;
  job: ProjectJobRecord;
};

export type CreateVideoUpgradeInput = {
  workspaceId: string;
  userId: string;
  projectId: string;
  idempotencyKey: string;
  artifact: import("./video/video-provider.js").GeneratedVideoArtifact;
  /**
   * Field names (bible §9.6) the caller asked to preserve across this
   * render, e.g. "durationSeconds". Recorded on the new project_versions
   * row; enforcement happens earlier, in ProjectWorkflowService.
   */
  lockedFields: string[];
  /**
   * The generation_jobs row already inserted as "queued" by the public
   * controller action before the Cloud Tasks task ran. When provided, this
   * method updates that row to "succeeded" instead of inserting a new one.
   */
  jobId?: string;
};

/**
 * `{project, storyboard}` view of the storyboard currently persisted for a
 * project, with no `job` attached — used by the scene-level edit routes
 * below, which run synchronously and never create a generation job.
 */
export type CurrentStoryboardRecord = {
  project: WorkflowProjectRecord;
  storyboard: ProjectStoryboardRecord;
};

export type UpdateStoryboardSceneInput = {
  workspaceId: string;
  projectId: string;
  userId: string;
  storyboardId: string;
  sceneId: string;
  /** The regenerated scene's fields (bible §15.4), replacing the row in place. */
  generated: GeneratedStoryboardScene;
  /**
   * `scene:<position>:<field>` lock keys (bible §9.6) recorded on the new
   * project_versions row, matching the format `findStoryboardLockViolations`
   * already uses for the whole-storyboard `/upgrade` regeneration.
   */
  lockedFields: string[];
};

export type ReorderStoryboardScenesInput = {
  workspaceId: string;
  projectId: string;
  userId: string;
  storyboardId: string;
  /** The full set of scene ids on this storyboard, in their new order. */
  orderedSceneIds: string[];
};

export type AttachStoryboardSceneAssetRepoInput = {
  workspaceId: string;
  projectId: string;
  userId: string;
  storyboardId: string;
  sceneId: string;
  /** The Library asset to attach, or null to detach whatever is attached. */
  assetId: string | null;
};

/**
 * Discriminated so the caller (ProjectWorkflowService) can tell "the scene
 * doesn't exist" (404) apart from "the given assetId isn't a source asset
 * in this workspace" (400) -- both are failures, but distinct ones, unlike
 * {@link updateStoryboardScene}'s single `null` (which only ever means
 * "scene not found").
 */
export type AttachStoryboardSceneAssetOutcome =
  | { outcome: "ok"; record: CurrentStoryboardRecord }
  | { outcome: "scene_not_found" }
  | { outcome: "asset_not_found" };

/** `{project, script}` view mirroring {@link CurrentStoryboardRecord}. */
export type CurrentScriptRecord = {
  project: WorkflowProjectRecord;
  script: ProjectScriptRecord;
};

export type UpdateScriptBlocksInput = {
  workspaceId: string;
  projectId: string;
  userId: string;
  scriptId: string;
  generated: {
    hook: string;
    body: string;
    callToAction: string | null;
    caption: string | null;
  };
  /** Script block names (bible §9.6) recorded on the new project_versions row. */
  lockedFields: string[];
};

export interface ProjectsRepository {
  list(workspaceId: string): Promise<ProjectSummaryRecord[]>;
  findById(
    workspaceId: string,
    projectId: string,
  ): Promise<ProjectDetailRecord | null>;
  findStoryboardUpgradeByIdempotency(
    workspaceId: string,
    idempotencyKey: string,
  ): Promise<StoryboardUpgradeRecord | null>;
  findExistingStoryboardUpgrade(
    workspaceId: string,
    projectId: string,
  ): Promise<StoryboardUpgradeRecord | null>;
  findStoryboardSource(
    workspaceId: string,
    projectId: string,
  ): Promise<StoryboardSourceRecord | null>;
  createStoryboardUpgrade(
    input: CreateStoryboardUpgradeInput,
  ): Promise<StoryboardUpgradeRecord | null>;
  /**
   * Regenerates exactly one scene in place (bible §15.4), bumping the
   * project version without cloning the whole storyboard row — the other
   * scenes' rows (and ids) are left untouched, which is also what keeps
   * {@link reorderStoryboardScenes} able to address scenes by a stable id.
   */
  updateStoryboardScene(
    input: UpdateStoryboardSceneInput,
  ): Promise<CurrentStoryboardRecord | null>;
  /** Purely mechanical: renumbers `position` to match `orderedSceneIds`. */
  reorderStoryboardScenes(
    input: ReorderStoryboardScenesInput,
  ): Promise<CurrentStoryboardRecord | null>;
  /**
   * Purely mechanical, like {@link reorderStoryboardScenes}: sets or clears
   * one scene's attached asset reference. Never touches AI-generated scene
   * content, so an attached asset survives a later scene-level regenerate.
   */
  attachStoryboardSceneAsset(
    input: AttachStoryboardSceneAssetRepoInput,
  ): Promise<AttachStoryboardSceneAssetOutcome>;
  findVideoUpgradeByIdempotency(
    workspaceId: string,
    idempotencyKey: string,
  ): Promise<VideoUpgradeRecord | null>;
  findExistingVideoUpgrade(
    workspaceId: string,
    projectId: string,
  ): Promise<VideoUpgradeRecord | null>;
  findVideoSource(
    workspaceId: string,
    projectId: string,
  ): Promise<VideoSourceRecord | null>;
  createVideoUpgrade(
    input: CreateVideoUpgradeInput,
  ): Promise<VideoUpgradeRecord | null>;
  /** Regenerates the script blocks in place (bible §15.3); the script row's id never changes. */
  updateScriptBlocks(
    input: UpdateScriptBlocksInput,
  ): Promise<CurrentScriptRecord | null>;
}

export const PROJECTS_REPOSITORY = Symbol("PROJECTS_REPOSITORY");
