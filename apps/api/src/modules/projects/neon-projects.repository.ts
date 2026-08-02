import { randomUUID } from "node:crypto";
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
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { CREONOME_DATABASE } from "../database/database.module.js";
import type {
  CreateStoryboardUpgradeInput,
  ProjectDetailRecord,
  ProjectJobRecord,
  ProjectsRepository,
  ProjectSummaryRecord,
  StoryboardSourceRecord,
  StoryboardUpgradeRecord,
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

const workflowProjectSelection = {
  id: projects.id,
  opportunityId: projects.opportunityId,
  title: projects.title,
  status: projects.status,
  currentLevel: projects.currentLevel,
  currentVersion: projects.currentVersion,
  updatedAt: projects.updatedAt,
};

const workflowJobSelection = {
  ...jobSelection,
  projectId: generationJobs.projectId,
};

const sceneSelection = {
  id: storyboardScenes.id,
  position: storyboardScenes.position,
  heading: storyboardScenes.heading,
  description: storyboardScenes.description,
  shotType: storyboardScenes.shotType,
  voiceover: storyboardScenes.voiceover,
  onScreenText: storyboardScenes.onScreenText,
  bRoll: storyboardScenes.bRoll,
  transition: storyboardScenes.transition,
  requiredAsset: storyboardScenes.requiredAsset,
  sound: storyboardScenes.sound,
  editingNote: storyboardScenes.editingNote,
  referenceFrameUrl: storyboardScenes.referenceFrameUrl,
  durationSeconds: storyboardScenes.durationSeconds,
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
    const sceneRows = storyboard
      ? await database
          .select(sceneSelection)
          .from(storyboardScenes)
          .where(eq(storyboardScenes.storyboardId, storyboard.id))
          .orderBy(asc(storyboardScenes.position))
      : [];
    let elapsedSeconds = 0;
    const scenes = sceneRows.map((scene) => {
      const result = { ...scene, startSeconds: elapsedSeconds };
      elapsedSeconds += scene.durationSeconds ?? 0;
      return result;
    });

    return {
      ...project,
      script: scriptRows[0] ?? null,
      storyboard: storyboard ? { ...storyboard, scenes } : null,
      versions,
      latestJob: jobRows[0] ?? null,
    };
  }

  async findStoryboardUpgradeByIdempotency(
    workspaceId: string,
    idempotencyKey: string,
  ): Promise<StoryboardUpgradeRecord | null> {
    const [job] = await this.requireDatabase()
      .select(workflowJobSelection)
      .from(generationJobs)
      .where(
        and(
          eq(generationJobs.workspaceId, workspaceId),
          eq(generationJobs.idempotencyKey, idempotencyKey),
          eq(generationJobs.kind, "storyboard"),
          eq(generationJobs.status, "succeeded"),
        ),
      )
      .limit(1);
    if (!job?.projectId) {
      return null;
    }
    return this.loadStoryboardUpgrade(workspaceId, job.projectId, job);
  }

  async findExistingStoryboardUpgrade(
    workspaceId: string,
    projectId: string,
  ): Promise<StoryboardUpgradeRecord | null> {
    const database = this.requireDatabase();
    const [project] = await database
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.workspaceId, workspaceId),
          eq(projects.id, projectId),
          inArray(projects.currentLevel, ["storyboard", "video"]),
        ),
      )
      .limit(1);
    if (!project) {
      return null;
    }
    const [job] = await database
      .select(workflowJobSelection)
      .from(generationJobs)
      .where(
        and(
          eq(generationJobs.workspaceId, workspaceId),
          eq(generationJobs.projectId, projectId),
          eq(generationJobs.kind, "storyboard"),
          eq(generationJobs.status, "succeeded"),
        ),
      )
      .orderBy(desc(generationJobs.completedAt))
      .limit(1);
    return job ? this.loadStoryboardUpgrade(workspaceId, projectId, job) : null;
  }

  async findStoryboardSource(
    workspaceId: string,
    projectId: string,
  ): Promise<StoryboardSourceRecord | null> {
    const database = this.requireDatabase();
    const [project] = await database
      .select(workflowProjectSelection)
      .from(projects)
      .where(
        and(eq(projects.workspaceId, workspaceId), eq(projects.id, projectId)),
      )
      .limit(1);
    if (!project) {
      return null;
    }
    const [script] = await database
      .select(scriptSelection)
      .from(scripts)
      .where(eq(scripts.projectId, projectId))
      .orderBy(desc(scripts.updatedAt))
      .limit(1);
    return script ? { project, script } : null;
  }

  async createStoryboardUpgrade(
    input: CreateStoryboardUpgradeInput,
  ): Promise<StoryboardUpgradeRecord | null> {
    const idempotent = await this.findStoryboardUpgradeByIdempotency(
      input.workspaceId,
      input.idempotencyKey,
    );
    if (idempotent) {
      return idempotent;
    }
    const source = await this.findStoryboardSource(
      input.workspaceId,
      input.projectId,
    );
    if (!source) {
      return null;
    }

    const database = this.requireDatabase();
    const now = new Date();
    const version = source.project.currentVersion + 1;
    const projectVersionId = randomUUID();
    const storyboardId = randomUUID();
    const jobId = randomUUID();
    const sceneRows = input.generated.scenes.map((scene, index) => ({
      id: randomUUID(),
      storyboardId,
      position: index + 1,
      ...scene,
      createdAt: now,
    }));

    const insertVersion = database.insert(projectVersions).values({
      id: projectVersionId,
      projectId: input.projectId,
      version,
      level: "storyboard",
      parentVersion: source.project.currentVersion,
      changeSource: "storyboard_generation",
      changeSummary: "Generated a shootable storyboard from the latest script",
      snapshot: {
        scriptId: source.script.id,
        storyboardId,
        sceneCount: sceneRows.length,
      },
      createdByUserId: input.userId,
      createdAt: now,
    });
    const insertStoryboard = database.insert(storyboards).values({
      id: storyboardId,
      projectId: input.projectId,
      projectVersionId,
      title: input.generated.title,
      aspectRatio: input.generated.aspectRatio,
      durationSeconds: input.generated.durationSeconds,
      createdAt: now,
      updatedAt: now,
    });
    const insertScenes = database.insert(storyboardScenes).values(sceneRows);
    const insertJob = database.insert(generationJobs).values({
      id: jobId,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      requestedByUserId: input.userId,
      kind: "storyboard",
      provider: input.provider,
      model: input.model,
      status: "succeeded",
      progress: 100,
      idempotencyKey: input.idempotencyKey,
      input: { scriptId: source.script.id },
      output: {
        storyboardId,
        projectVersion: version,
        sceneCount: sceneRows.length,
      },
      createdAt: now,
      startedAt: now,
      completedAt: now,
      updatedAt: now,
    });
    const updateProject = database
      .update(projects)
      .set({
        currentLevel: "storyboard",
        currentVersion: version,
        updatedAt: now,
      })
      .where(
        and(
          eq(projects.id, input.projectId),
          eq(projects.workspaceId, input.workspaceId),
        ),
      );
    await database.batch([
      insertVersion,
      insertStoryboard,
      insertScenes,
      insertJob,
      updateProject,
    ] as const);

    let startSeconds = 0;
    return {
      project: {
        ...source.project,
        currentLevel: "storyboard",
        currentVersion: version,
        updatedAt: now,
      },
      storyboard: {
        id: storyboardId,
        title: input.generated.title,
        aspectRatio: input.generated.aspectRatio,
        durationSeconds: input.generated.durationSeconds,
        scenes: sceneRows.map(
          ({
            storyboardId: _storyboardId,
            createdAt: _createdAt,
            ...scene
          }) => {
            const result = { ...scene, startSeconds };
            startSeconds += scene.durationSeconds;
            return result;
          },
        ),
      },
      job: {
        id: jobId,
        kind: "storyboard",
        provider: input.provider,
        model: input.model,
        status: "succeeded",
        progress: 100,
        errorCode: null,
        errorMessage: null,
        createdAt: now,
        updatedAt: now,
        completedAt: now,
      },
    };
  }

  private async loadStoryboardUpgrade(
    workspaceId: string,
    projectId: string,
    job: ProjectJobRecord,
  ): Promise<StoryboardUpgradeRecord | null> {
    const database = this.requireDatabase();
    const [project] = await database
      .select(workflowProjectSelection)
      .from(projects)
      .where(
        and(eq(projects.workspaceId, workspaceId), eq(projects.id, projectId)),
      )
      .limit(1);
    const [storyboard] = await database
      .select(storyboardSelection)
      .from(storyboards)
      .where(eq(storyboards.projectId, projectId))
      .orderBy(desc(storyboards.updatedAt))
      .limit(1);
    if (!project || !storyboard) {
      return null;
    }
    const sceneRows = await database
      .select(sceneSelection)
      .from(storyboardScenes)
      .where(eq(storyboardScenes.storyboardId, storyboard.id))
      .orderBy(asc(storyboardScenes.position));
    let startSeconds = 0;
    const scenes = sceneRows.map((scene) => {
      const result = { ...scene, startSeconds };
      startSeconds += scene.durationSeconds;
      return result;
    });
    return {
      project,
      storyboard: { ...storyboard, scenes },
      job,
    };
  }

  private requireDatabase(): CreonomeDatabase {
    if (!this.database) {
      throw new ServiceUnavailableException("DATABASE_URL is not configured");
    }
    return this.database;
  }
}
