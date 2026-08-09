import { randomUUID } from "node:crypto";
import { Inject, ServiceUnavailableException } from "@nestjs/common";
import {
  type CreonomeDatabase,
  creatorDnaVersions,
  creatorProfiles,
  dnaTraits,
  generatedAssets,
  generationJobs,
  opportunities,
  projects,
  projectVersions,
  sourceAssets,
  scripts,
  storyboardScenes,
  storyboards,
} from "@creonome/db";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { CREONOME_DATABASE } from "../database/database.module.js";
import type {
  CreateStoryboardUpgradeInput,
  CreateVideoUpgradeInput,
  CurrentScriptRecord,
  CurrentStoryboardRecord,
  ProjectDetailRecord,
  ProjectJobRecord,
  ProjectVideoRecord,
  ProjectsRepository,
  ProjectSummaryRecord,
  ReorderStoryboardScenesInput,
  StoryboardSourceRecord,
  StoryboardUpgradeRecord,
  UpdateScriptBlocksInput,
  UpdateStoryboardSceneInput,
  VideoSourceRecord,
  VideoUpgradeRecord,
} from "./projects.repository.js";

/**
 * `database.batch()` requires a provably non-empty tuple type
 * (`[T, ...T[]]`), which a plain `.map()`-built array doesn't structurally
 * satisfy. The batches below always have at least a version-insert and a
 * project-update, so this assertion is safe.
 */
function asBatch<T>(items: T[]): [T, ...T[]] {
  if (items.length === 0) {
    throw new Error("Cannot batch an empty list of queries");
  }
  return items as [T, ...T[]];
}

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

const videoSelection = {
  id: generatedAssets.id,
  projectId: generatedAssets.projectId,
  previewUri: generatedAssets.gcsUri,
  mimeType: generatedAssets.mimeType,
  durationSeconds: generatedAssets.durationSeconds,
  metadata: generatedAssets.metadata,
  createdAt: generatedAssets.createdAt,
};

type VideoSelectionRow = {
  id: string;
  projectId: string | null;
  previewUri: string;
  mimeType: string;
  durationSeconds: number | null;
  metadata: unknown;
  createdAt: Date;
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

function toVideoRecord(row: VideoSelectionRow): ProjectVideoRecord | null {
  if (!row.projectId) return null;
  const metadata =
    row.metadata && typeof row.metadata === "object"
      ? (row.metadata as Record<string, unknown>)
      : {};
  return {
    id: row.id,
    projectId: row.projectId,
    previewUrl:
      typeof metadata.publicUrl === "string"
        ? metadata.publicUrl
        : row.previewUri,
    gcsUri: row.previewUri,
    mimeType: row.mimeType,
    durationSeconds: row.durationSeconds,
    width: typeof metadata.width === "number" ? metadata.width : 540,
    height: typeof metadata.height === "number" ? metadata.height : 960,
    provider:
      typeof metadata.provider === "string" ? metadata.provider : "creonome",
    model:
      typeof metadata.model === "string"
        ? metadata.model
        : "deterministic-motion-preview-v1",
    simulated: metadata.simulated === true || metadata.fixture === true,
    createdAt: row.createdAt,
  };
}

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

    const [scriptRows, storyboardRows, videoRows, versions, jobRows] =
      await Promise.all([
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
          .select(videoSelection)
          .from(generatedAssets)
          .where(
            and(
              eq(generatedAssets.workspaceId, workspaceId),
              eq(generatedAssets.projectId, projectId),
              eq(generatedAssets.kind, "video"),
            ),
          )
          .orderBy(desc(generatedAssets.createdAt))
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
      video: videoRows[0] ? toVideoRecord(videoRows[0]) : null,
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
    const jobId = input.jobId ?? randomUUID();
    const sceneRows = input.generated.scenes.map((scene, index) => ({
      id: randomUUID(),
      storyboardId,
      position: index + 1,
      ...scene,
      createdAt: now,
    }));
    // A storyboard (or a video built on top of one) already existing on
    // this project means this call is regenerating an already-produced
    // level rather than creating it for the first time (bible §9.6).
    const isRegeneration =
      source.project.currentLevel === "storyboard" ||
      source.project.currentLevel === "video";

    const insertVersion = database.insert(projectVersions).values({
      id: projectVersionId,
      projectId: input.projectId,
      version,
      level: "storyboard",
      parentVersion: source.project.currentVersion,
      changeSource: isRegeneration
        ? "storyboard_regeneration"
        : "storyboard_generation",
      changeSummary: isRegeneration
        ? "Regenerated the storyboard from the latest script"
        : "Generated a shootable storyboard from the latest script",
      lockedFields: input.lockedFields,
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
    const jobOutput = {
      storyboardId,
      projectVersion: version,
      sceneCount: sceneRows.length,
    };
    const jobWrite = input.jobId
      ? database
          .update(generationJobs)
          .set({
            projectId: input.projectId,
            provider: input.provider,
            model: input.model,
            status: "succeeded",
            progress: 100,
            input: { scriptId: source.script.id },
            output: jobOutput,
            startedAt: now,
            completedAt: now,
            updatedAt: now,
          })
          .where(eq(generationJobs.id, input.jobId))
      : database.insert(generationJobs).values({
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
          output: jobOutput,
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
      jobWrite,
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

  async updateStoryboardScene(
    input: UpdateStoryboardSceneInput,
  ): Promise<CurrentStoryboardRecord | null> {
    const database = this.requireDatabase();
    const [project] = await database
      .select(workflowProjectSelection)
      .from(projects)
      .where(
        and(
          eq(projects.workspaceId, input.workspaceId),
          eq(projects.id, input.projectId),
        ),
      )
      .limit(1);
    if (!project) return null;

    const [storyboardRow] = await database
      .select(storyboardSelection)
      .from(storyboards)
      .where(
        and(
          eq(storyboards.id, input.storyboardId),
          eq(storyboards.projectId, input.projectId),
        ),
      )
      .limit(1);
    const [targetScene] = await database
      .select({
        position: storyboardScenes.position,
        durationSeconds: storyboardScenes.durationSeconds,
      })
      .from(storyboardScenes)
      .where(
        and(
          eq(storyboardScenes.id, input.sceneId),
          eq(storyboardScenes.storyboardId, input.storyboardId),
        ),
      )
      .limit(1);
    if (!storyboardRow || !targetScene) return null;

    const now = new Date();
    const version = project.currentVersion + 1;
    const projectVersionId = randomUUID();
    // The storyboard's total duration is derived from its scenes; only the
    // target scene's duration is actually changing here, so recompute the
    // total instead of requiring the caller to keep it in sync.
    const newTotalDuration =
      (storyboardRow.durationSeconds ?? 0) -
      targetScene.durationSeconds +
      input.generated.durationSeconds;

    await database.batch([
      database
        .update(storyboardScenes)
        .set({ ...input.generated })
        .where(eq(storyboardScenes.id, input.sceneId)),
      database
        .update(storyboards)
        .set({ durationSeconds: newTotalDuration, updatedAt: now })
        .where(eq(storyboards.id, input.storyboardId)),
      database.insert(projectVersions).values({
        id: projectVersionId,
        projectId: input.projectId,
        version,
        level: "storyboard",
        parentVersion: project.currentVersion,
        changeSource: "storyboard_scene_regeneration",
        changeSummary: `Regenerated scene ${targetScene.position} of the storyboard`,
        lockedFields: input.lockedFields,
        snapshot: {
          storyboardId: input.storyboardId,
          sceneId: input.sceneId,
        },
        createdByUserId: input.userId,
        createdAt: now,
      }),
      database
        .update(projects)
        .set({ currentVersion: version, updatedAt: now })
        .where(
          and(
            eq(projects.id, input.projectId),
            eq(projects.workspaceId, input.workspaceId),
          ),
        ),
    ] as const);

    const sceneRows = await database
      .select(sceneSelection)
      .from(storyboardScenes)
      .where(eq(storyboardScenes.storyboardId, input.storyboardId))
      .orderBy(asc(storyboardScenes.position));
    let startSeconds = 0;
    const scenes = sceneRows.map((scene) => {
      const result = { ...scene, startSeconds };
      startSeconds += scene.durationSeconds ?? 0;
      return result;
    });

    return {
      project: { ...project, currentVersion: version, updatedAt: now },
      storyboard: {
        ...storyboardRow,
        durationSeconds: newTotalDuration,
        scenes,
      },
    };
  }

  async reorderStoryboardScenes(
    input: ReorderStoryboardScenesInput,
  ): Promise<CurrentStoryboardRecord | null> {
    const database = this.requireDatabase();
    const [project] = await database
      .select(workflowProjectSelection)
      .from(projects)
      .where(
        and(
          eq(projects.workspaceId, input.workspaceId),
          eq(projects.id, input.projectId),
        ),
      )
      .limit(1);
    if (!project) return null;

    const [storyboardRow] = await database
      .select(storyboardSelection)
      .from(storyboards)
      .where(
        and(
          eq(storyboards.id, input.storyboardId),
          eq(storyboards.projectId, input.projectId),
        ),
      )
      .limit(1);
    if (!storyboardRow) return null;

    const existingScenes = await database
      .select({ id: storyboardScenes.id })
      .from(storyboardScenes)
      .where(eq(storyboardScenes.storyboardId, input.storyboardId));
    const existingIds = new Set(existingScenes.map((scene) => scene.id));
    const requestedIds = new Set(input.orderedSceneIds);
    const isValidPermutation =
      existingIds.size === input.orderedSceneIds.length &&
      requestedIds.size === input.orderedSceneIds.length &&
      [...existingIds].every((id) => requestedIds.has(id));
    if (!isValidPermutation) {
      // Not a 404 — the storyboard exists, but the requested order doesn't
      // match its actual scene ids. The caller maps this to a 400.
      return null;
    }

    const now = new Date();
    const version = project.currentVersion + 1;
    const projectVersionId = randomUUID();

    // Two-phase renumbering avoids transiently violating the
    // (storyboardId, position) unique constraint when scenes swap places:
    // every row first moves to a distinct negative placeholder (which can
    // never collide with the positive positions already in use), then all
    // rows get their final positive position once every placeholder is in
    // place.
    const placeholderUpdates = input.orderedSceneIds.map((sceneId, index) =>
      database
        .update(storyboardScenes)
        .set({ position: -1 * (index + 1) })
        .where(eq(storyboardScenes.id, sceneId)),
    );
    const finalUpdates = input.orderedSceneIds.map((sceneId, index) =>
      database
        .update(storyboardScenes)
        .set({ position: index + 1 })
        .where(eq(storyboardScenes.id, sceneId)),
    );

    await database.batch(
      asBatch([
        ...placeholderUpdates,
        ...finalUpdates,
        database
          .update(storyboards)
          .set({ updatedAt: now })
          .where(eq(storyboards.id, input.storyboardId)),
        database.insert(projectVersions).values({
          id: projectVersionId,
          projectId: input.projectId,
          version,
          level: "storyboard",
          parentVersion: project.currentVersion,
          changeSource: "storyboard_reorder",
          changeSummary: "Reordered the storyboard scenes",
          lockedFields: [],
          snapshot: {
            storyboardId: input.storyboardId,
            order: input.orderedSceneIds,
          },
          createdByUserId: input.userId,
          createdAt: now,
        }),
        database
          .update(projects)
          .set({ currentVersion: version, updatedAt: now })
          .where(
            and(
              eq(projects.id, input.projectId),
              eq(projects.workspaceId, input.workspaceId),
            ),
          ),
      ]),
    );

    const sceneRows = await database
      .select(sceneSelection)
      .from(storyboardScenes)
      .where(eq(storyboardScenes.storyboardId, input.storyboardId))
      .orderBy(asc(storyboardScenes.position));
    let startSeconds = 0;
    const scenes = sceneRows.map((scene) => {
      const result = { ...scene, startSeconds };
      startSeconds += scene.durationSeconds ?? 0;
      return result;
    });

    return {
      project: { ...project, currentVersion: version, updatedAt: now },
      storyboard: { ...storyboardRow, scenes },
    };
  }

  async findVideoUpgradeByIdempotency(
    workspaceId: string,
    idempotencyKey: string,
  ): Promise<VideoUpgradeRecord | null> {
    const [job] = await this.requireDatabase()
      .select(workflowJobSelection)
      .from(generationJobs)
      .where(
        and(
          eq(generationJobs.workspaceId, workspaceId),
          eq(generationJobs.idempotencyKey, idempotencyKey),
          eq(generationJobs.kind, "video_render"),
          eq(generationJobs.status, "succeeded"),
        ),
      )
      .limit(1);
    return job?.projectId
      ? this.loadVideoUpgrade(workspaceId, job.projectId, job)
      : null;
  }

  async findExistingVideoUpgrade(
    workspaceId: string,
    projectId: string,
  ): Promise<VideoUpgradeRecord | null> {
    const database = this.requireDatabase();
    const [project] = await database
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.workspaceId, workspaceId),
          eq(projects.id, projectId),
          eq(projects.currentLevel, "video"),
        ),
      )
      .limit(1);
    if (!project) return null;
    const [job] = await database
      .select(workflowJobSelection)
      .from(generationJobs)
      .where(
        and(
          eq(generationJobs.workspaceId, workspaceId),
          eq(generationJobs.projectId, projectId),
          eq(generationJobs.kind, "video_render"),
          eq(generationJobs.status, "succeeded"),
        ),
      )
      .orderBy(desc(generationJobs.completedAt))
      .limit(1);
    return job ? this.loadVideoUpgrade(workspaceId, projectId, job) : null;
  }

  async findVideoSource(
    workspaceId: string,
    projectId: string,
  ): Promise<VideoSourceRecord | null> {
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
    const [script] = await database
      .select(scriptSelection)
      .from(scripts)
      .where(eq(scripts.projectId, projectId))
      .orderBy(desc(scripts.updatedAt))
      .limit(1);
    if (!project || !storyboard || !script) return null;
    const sceneRows = await database
      .select(sceneSelection)
      .from(storyboardScenes)
      .where(eq(storyboardScenes.storyboardId, storyboard.id))
      .orderBy(asc(storyboardScenes.position));
    let startSeconds = 0;
    const scenes = sceneRows.map((scene) => {
      const result = { ...scene, startSeconds };
      startSeconds += scene.durationSeconds ?? 0;
      return result;
    });
    const [profile] = await database
      .select({
        id: creatorProfiles.id,
        stageName: creatorProfiles.stageName,
        bio: creatorProfiles.bio,
        audienceDescription: creatorProfiles.audienceDescription,
        languages: creatorProfiles.languages,
        genres: creatorProfiles.genres,
      })
      .from(creatorProfiles)
      .where(eq(creatorProfiles.workspaceId, workspaceId))
      .orderBy(desc(creatorProfiles.updatedAt))
      .limit(1);
    const [dna] = profile
      ? await database
          .select({
            id: creatorDnaVersions.id,
            summary: creatorDnaVersions.summary,
          })
          .from(creatorDnaVersions)
          .where(eq(creatorDnaVersions.creatorProfileId, profile.id))
          .orderBy(desc(creatorDnaVersions.version))
          .limit(1)
      : [];
    const traits = dna
      ? await database
          .select({
            category: dnaTraits.category,
            label: dnaTraits.label,
            value: dnaTraits.value,
          })
          .from(dnaTraits)
          .where(eq(dnaTraits.dnaVersionId, dna.id))
          .orderBy(asc(dnaTraits.position))
      : [];
    const [peopleReferenceImage] = await database
      .select({
        gcsUri: sourceAssets.gcsUri,
        mimeType: sourceAssets.mimeType,
      })
      .from(sourceAssets)
      .where(
        and(
          eq(sourceAssets.workspaceId, workspaceId),
          sql`${sourceAssets.metadata}->>'peopleReference' = 'true'`,
          sql`${sourceAssets.mimeType} in ('image/jpeg', 'image/png', 'image/webp')`,
        ),
      )
      .orderBy(desc(sourceAssets.createdAt))
      .limit(1);
    return {
      project,
      script,
      storyboard: { ...storyboard, scenes },
      creativeIdentity: {
        stageName: profile?.stageName ?? "Independent creator",
        bio: profile?.bio ?? null,
        audienceDescription: profile?.audienceDescription ?? null,
        languages: profile?.languages ?? [],
        genres: profile?.genres ?? [],
        dnaSummary: dna?.summary ?? null,
        traits: traits.map(
          (trait) => `${trait.category}: ${trait.label} — ${trait.value}`,
        ),
        peopleReferenceImage: peopleReferenceImage
          ? {
              gcsUri: peopleReferenceImage.gcsUri,
              mimeType: peopleReferenceImage.mimeType as
                "image/jpeg" | "image/png" | "image/webp",
            }
          : null,
      },
    };
  }

  async createVideoUpgrade(
    input: CreateVideoUpgradeInput,
  ): Promise<VideoUpgradeRecord | null> {
    const idempotent = await this.findVideoUpgradeByIdempotency(
      input.workspaceId,
      input.idempotencyKey,
    );
    if (idempotent) return idempotent;
    const source = await this.findVideoSource(
      input.workspaceId,
      input.projectId,
    );
    if (!source) return null;

    const database = this.requireDatabase();
    const now = new Date();
    const version = source.project.currentVersion + 1;
    const projectVersionId = randomUUID();
    const jobId = input.jobId ?? randomUUID();
    const assetId = randomUUID();
    const artifact = input.artifact;
    // A video already existing on this project means this call is
    // regenerating an already-produced level (bible §9.6).
    const isRegeneration = source.project.currentLevel === "video";
    const video: ProjectVideoRecord = {
      id: assetId,
      projectId: input.projectId,
      previewUrl: artifact.previewUrl,
      gcsUri: artifact.gcsUri,
      mimeType: artifact.mimeType,
      durationSeconds: artifact.durationSeconds,
      width: artifact.width,
      height: artifact.height,
      provider: artifact.provider,
      model: artifact.model,
      simulated: artifact.simulated,
      createdAt: now,
    };

    await database.batch([
      database.insert(projectVersions).values({
        id: projectVersionId,
        projectId: input.projectId,
        version,
        level: "video",
        parentVersion: source.project.currentVersion,
        changeSource: isRegeneration
          ? "video_regeneration"
          : "video_generation",
        changeSummary: isRegeneration
          ? artifact.simulated
            ? "Regenerated the vertical-video preview with the resilient MVP fallback"
            : "Regenerated a production vertical-video render with Veo"
          : artifact.simulated
            ? "Generated a vertical-video preview with the resilient MVP fallback"
            : "Generated a production vertical-video render with Veo",
        lockedFields: input.lockedFields,
        snapshot: {
          storyboardId: source.storyboard.id,
          generatedAssetId: assetId,
        },
        createdByUserId: input.userId,
        createdAt: now,
      }),
      input.jobId
        ? database
            .update(generationJobs)
            .set({
              projectId: input.projectId,
              provider: artifact.provider,
              model: artifact.model,
              status: "succeeded",
              progress: 100,
              input: { storyboardId: source.storyboard.id },
              output: {
                generatedAssetId: assetId,
                previewUrl: artifact.previewUrl,
                simulated: artifact.simulated,
                fallbackReasonCode: artifact.fallbackReasonCode,
              },
              startedAt: now,
              completedAt: now,
              updatedAt: now,
            })
            .where(eq(generationJobs.id, input.jobId))
        : database.insert(generationJobs).values({
            id: jobId,
            workspaceId: input.workspaceId,
            projectId: input.projectId,
            requestedByUserId: input.userId,
            kind: "video_render",
            provider: artifact.provider,
            model: artifact.model,
            status: "succeeded",
            progress: 100,
            idempotencyKey: input.idempotencyKey,
            input: { storyboardId: source.storyboard.id },
            output: {
              generatedAssetId: assetId,
              previewUrl: artifact.previewUrl,
              simulated: artifact.simulated,
              fallbackReasonCode: artifact.fallbackReasonCode,
            },
            createdAt: now,
            startedAt: now,
            completedAt: now,
            updatedAt: now,
          }),
      database.insert(generatedAssets).values({
        id: assetId,
        generationJobId: jobId,
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        kind: "video",
        gcsUri: artifact.gcsUri,
        mimeType: artifact.mimeType,
        byteSize: artifact.byteSize,
        durationSeconds: artifact.durationSeconds,
        metadata: {
          publicUrl: artifact.previewUrl,
          width: artifact.width,
          height: artifact.height,
          provider: artifact.provider,
          model: artifact.model,
          simulated: artifact.simulated,
          fallbackReasonCode: artifact.fallbackReasonCode,
        },
        createdAt: now,
      }),
      database
        .update(projects)
        .set({ currentLevel: "video", currentVersion: version, updatedAt: now })
        .where(
          and(
            eq(projects.workspaceId, input.workspaceId),
            eq(projects.id, input.projectId),
          ),
        ),
    ] as const);

    return {
      project: {
        ...source.project,
        currentLevel: "video",
        currentVersion: version,
        updatedAt: now,
      },
      video,
      job: {
        id: jobId,
        kind: "video_render",
        provider: artifact.provider,
        model: artifact.model,
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

  private async loadVideoUpgrade(
    workspaceId: string,
    projectId: string,
    job: ProjectJobRecord,
  ): Promise<VideoUpgradeRecord | null> {
    const database = this.requireDatabase();
    const [project] = await database
      .select(workflowProjectSelection)
      .from(projects)
      .where(
        and(eq(projects.workspaceId, workspaceId), eq(projects.id, projectId)),
      )
      .limit(1);
    const [videoRow] = await database
      .select(videoSelection)
      .from(generatedAssets)
      .where(
        and(
          eq(generatedAssets.workspaceId, workspaceId),
          eq(generatedAssets.projectId, projectId),
          eq(generatedAssets.generationJobId, job.id),
          eq(generatedAssets.kind, "video"),
        ),
      )
      .limit(1);
    const video = videoRow ? toVideoRecord(videoRow) : null;
    return project && video ? { project, video, job } : null;
  }

  async updateScriptBlocks(
    input: UpdateScriptBlocksInput,
  ): Promise<CurrentScriptRecord | null> {
    const database = this.requireDatabase();
    const [project] = await database
      .select(workflowProjectSelection)
      .from(projects)
      .where(
        and(
          eq(projects.workspaceId, input.workspaceId),
          eq(projects.id, input.projectId),
        ),
      )
      .limit(1);
    if (!project) return null;

    const [scriptRow] = await database
      .select({ id: scripts.id })
      .from(scripts)
      .where(
        and(
          eq(scripts.id, input.scriptId),
          eq(scripts.projectId, input.projectId),
        ),
      )
      .limit(1);
    if (!scriptRow) return null;

    const now = new Date();
    const version = project.currentVersion + 1;
    const projectVersionId = randomUUID();

    await database.batch([
      database
        .update(scripts)
        .set({
          hook: input.generated.hook,
          body: input.generated.body,
          callToAction: input.generated.callToAction,
          caption: input.generated.caption,
          projectVersionId,
          updatedAt: now,
        })
        .where(eq(scripts.id, input.scriptId)),
      database.insert(projectVersions).values({
        id: projectVersionId,
        projectId: input.projectId,
        version,
        level: "script",
        parentVersion: project.currentVersion,
        changeSource: "script_block_edit",
        changeSummary: "Regenerated a script block from a targeted edit",
        lockedFields: input.lockedFields,
        snapshot: { scriptId: input.scriptId },
        createdByUserId: input.userId,
        createdAt: now,
      }),
      database
        .update(projects)
        .set({ currentVersion: version, updatedAt: now })
        .where(
          and(
            eq(projects.id, input.projectId),
            eq(projects.workspaceId, input.workspaceId),
          ),
        ),
    ] as const);

    const [script] = await database
      .select(scriptSelection)
      .from(scripts)
      .where(eq(scripts.id, input.scriptId))
      .limit(1);
    if (!script) return null;

    return {
      project: { ...project, currentVersion: version, updatedAt: now },
      script,
    };
  }

  private requireDatabase(): CreonomeDatabase {
    if (!this.database) {
      throw new ServiceUnavailableException("DATABASE_URL is not configured");
    }
    return this.database;
  }
}
