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
  "id" | "position" | "startSeconds" | "durationSeconds"
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
}

export const PROJECTS_REPOSITORY = Symbol("PROJECTS_REPOSITORY");
