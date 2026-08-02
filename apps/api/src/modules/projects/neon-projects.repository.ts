import { Inject, ServiceUnavailableException } from "@nestjs/common";
import {
  type CreonomeDatabase,
  generationJobs,
  opportunities,
  projects,
  projectVersions,
  scripts,
  storyboardScenes,
  storyboards,
} from "@creonome/db";
import { and, asc, desc, eq } from "drizzle-orm";
import { CREONOME_DATABASE } from "../database/database.module.js";
import type {
  ProjectDetailRecord,
  ProjectsRepository,
  ProjectSummaryRecord,
} from "./projects.repository.js";

const summarySelection = {
  id: projects.id,
  opportunityId: projects.opportunityId,
  title: projects.title,
  status: projects.status,
  currentLevel: projects.currentLevel,
  currentVersion: projects.currentVersion,
  updatedAt: projects.updatedAt,
  platform: opportunities.platform,
  score: opportunities.scoreOverall,
};

const scriptSelection = {
  id: scripts.id,
  projectId: scripts.projectId,
  title: scripts.title,
  hook: scripts.hook,
  body: scripts.body,
  callToAction: scripts.callToAction,
  caption: scripts.caption,
  platforms: scripts.platforms,
  durationSeconds: scripts.durationSeconds,
};

const storyboardSelection = {
  id: storyboards.id,
  title: storyboards.title,
  aspectRatio: storyboards.aspectRatio,
  durationSeconds: storyboards.durationSeconds,
};

const versionSelection = {
  version: projectVersions.version,
  level: projectVersions.level,
  changeSource: projectVersions.changeSource,
  changeSummary: projectVersions.changeSummary,
  lockedFields: projectVersions.lockedFields,
  createdAt: projectVersions.createdAt,
};

const jobSelection = {
  id: generationJobs.id,
  kind: generationJobs.kind,
  provider: generationJobs.provider,
  model: generationJobs.model,
  status: generationJobs.status,
  progress: generationJobs.progress,
  errorCode: generationJobs.errorCode,
  errorMessage: generationJobs.errorMessage,
  createdAt: generationJobs.createdAt,
  updatedAt: generationJobs.updatedAt,
  completedAt: generationJobs.completedAt,
};

export class NeonProjectsRepository implements ProjectsRepository {
  constructor(
    @Inject(CREONOME_DATABASE)
    private readonly database: CreonomeDatabase | undefined,
  ) {}

  async list(workspaceId: string): Promise<ProjectSummaryRecord[]> {
    return this.requireDatabase()
      .select(summarySelection)
      .from(projects)
      .leftJoin(opportunities, eq(projects.opportunityId, opportunities.id))
      .where(eq(projects.workspaceId, workspaceId))
      .orderBy(desc(projects.updatedAt));
  }

  async findById(
    workspaceId: string,
    projectId: string,
  ): Promise<ProjectDetailRecord | null> {
    const database = this.requireDatabase();
    const [project] = await database
      .select(summarySelection)
      .from(projects)
      .leftJoin(opportunities, eq(projects.opportunityId, opportunities.id))
      .where(
        and(eq(projects.workspaceId, workspaceId), eq(projects.id, projectId)),
      )
      .limit(1);
    if (!project) return null;

    const [scriptRows, storyboardRows, versions, jobRows] = await Promise.all([
      database
        .select(scriptSelection)
        .from(scripts)
        .where(eq(scripts.projectId, projectId))
        .orderBy(desc(scripts.updatedAt))
        .limit(1),
      database
        .select(storyboardSelection)
        .from(storyboards)
        .where(eq(storyboards.projectId, projectId))
        .orderBy(desc(storyboards.updatedAt))
        .limit(1),
      database
        .select(versionSelection)
        .from(projectVersions)
        .where(eq(projectVersions.projectId, projectId))
        .orderBy(desc(projectVersions.version)),
      database
        .select(jobSelection)
        .from(generationJobs)
        .where(
          and(
            eq(generationJobs.workspaceId, workspaceId),
            eq(generationJobs.projectId, projectId),
          ),
        )
        .orderBy(desc(generationJobs.updatedAt))
        .limit(1),
    ]);

    const storyboard = storyboardRows[0];
    const scenes = storyboard
      ? await database
          .select({
            id: storyboardScenes.id,
            position: storyboardScenes.position,
            heading: storyboardScenes.heading,
            description: storyboardScenes.description,
            shotType: storyboardScenes.shotType,
            voiceover: storyboardScenes.voiceover,
            onScreenText: storyboardScenes.onScreenText,
            durationSeconds: storyboardScenes.durationSeconds,
          })
          .from(storyboardScenes)
          .where(eq(storyboardScenes.storyboardId, storyboard.id))
          .orderBy(asc(storyboardScenes.position))
      : [];

    return {
      ...project,
      script: scriptRows[0] ?? null,
      storyboard: storyboard ? { ...storyboard, scenes } : null,
      versions,
      latestJob: jobRows[0] ?? null,
    };
  }

  private requireDatabase(): CreonomeDatabase {
    if (!this.database) {
      throw new ServiceUnavailableException("DATABASE_URL is not configured");
    }
    return this.database;
  }
}
