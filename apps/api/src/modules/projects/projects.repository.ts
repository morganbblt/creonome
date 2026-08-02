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
  heading: string;
  description: string;
  shotType: string | null;
  voiceover: string | null;
  onScreenText: string | null;
  durationSeconds: number | null;
};

export type ProjectStoryboardRecord = {
  id: string;
  title: string;
  aspectRatio: string;
  durationSeconds: number | null;
  scenes: ProjectSceneRecord[];
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
  versions: ProjectVersionRecord[];
  latestJob: ProjectJobRecord | null;
};

export interface ProjectsRepository {
  list(workspaceId: string): Promise<ProjectSummaryRecord[]>;
  findById(
    workspaceId: string,
    projectId: string,
  ): Promise<ProjectDetailRecord | null>;
}

export const PROJECTS_REPOSITORY = Symbol("PROJECTS_REPOSITORY");
