import { randomUUID } from "node:crypto";
import { Inject, ServiceUnavailableException } from "@nestjs/common";
import {
  type CreonomeDatabase,
  generationJobs,
  memoryCandidates,
  opportunities,
  opportunityBatches,
  projects,
  projectVersions,
  scripts,
} from "@creonome/db";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { CREONOME_DATABASE } from "../database/database.module.js";
import { currentOpportunityStatuses } from "./opportunities.repository.js";
import type {
  OpportunityRecord,
  CreateOpportunityBatchInput,
  CreateOpportunityRevisionInput,
  CreateScriptUpgradeInput,
  OpportunitiesRepository,
  OpportunityRevisionRecord,
  ProjectRecord,
  SaveOpportunityInput,
  ScriptUpgradeRecord,
} from "./opportunities.repository.js";

const projectSelection = {
  id: projects.id,
  opportunityId: projects.opportunityId,
  title: projects.title,
  status: projects.status,
  currentLevel: projects.currentLevel,
  currentVersion: projects.currentVersion,
  updatedAt: projects.updatedAt,
};

const workflowJobSelection = {
  id: generationJobs.id,
  projectId: generationJobs.projectId,
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

export class NeonOpportunitiesRepository implements OpportunitiesRepository {
  constructor(
    @Inject(CREONOME_DATABASE)
    private readonly database: CreonomeDatabase | undefined,
  ) {}

  async listCurrent(workspaceId: string): Promise<OpportunityRecord[]> {
    const database = this.requireDatabase();
    const [batch] = await database
      .select({
        id: opportunityBatches.id,
        availableAt: opportunityBatches.availableAt,
      })
      .from(opportunityBatches)
      .where(
        and(
          eq(opportunityBatches.workspaceId, workspaceId),
          eq(opportunityBatches.status, "available"),
        ),
      )
      .orderBy(desc(opportunityBatches.availableAt))
      .limit(1);

    if (!batch) {
      return [];
    }

    return this.listBatch(batch.id, batch.availableAt);
  }

  async findById(
    workspaceId: string,
    opportunityId: string,
  ): Promise<OpportunityRecord | null> {
    const database = this.requireDatabase();
    const [row] = await database
      .select({
        id: opportunities.id,
        position: opportunities.position,
        title: opportunities.title,
        pitch: opportunities.pitch,
        scoreOverall: opportunities.scoreOverall,
        scoreConfidence: opportunities.scoreConfidence,
        scoreMomentum: opportunities.scoreMomentum,
        scoreDnaFit: opportunities.scoreDnaFit,
        scoreNovelty: opportunities.scoreNovelty,
        scoreFeasibility: opportunities.scoreFeasibility,
        rationale: opportunities.rationale,
        effort: opportunities.effort,
        platform: opportunities.platform,
        estimatedDurationSeconds: opportunities.estimatedDurationSeconds,
        projectId: projects.id,
        projectCurrentLevel: projects.currentLevel,
        availableAt: opportunityBatches.availableAt,
      })
      .from(opportunities)
      .innerJoin(
        opportunityBatches,
        eq(opportunities.batchId, opportunityBatches.id),
      )
      .leftJoin(
        projects,
        and(
          eq(projects.opportunityId, opportunities.id),
          eq(projects.workspaceId, workspaceId),
        ),
      )
      .where(
        and(
          eq(opportunities.id, opportunityId),
          eq(opportunities.workspaceId, workspaceId),
        ),
      )
      .limit(1);
    if (!row) {
      return null;
    }
    if (!row.projectId) {
      return { ...row, hook: null };
    }

    const [version] = await database
      .select({ snapshot: projectVersions.snapshot })
      .from(projectVersions)
      .where(eq(projectVersions.projectId, row.projectId))
      .orderBy(desc(projectVersions.version))
      .limit(1);
    const snapshot = this.toOpportunitySnapshot(version?.snapshot);
    return {
      ...row,
      title: snapshot.title ?? row.title,
      pitch: snapshot.pitch ?? row.pitch,
      hook: snapshot.hook ?? null,
    };
  }

  async saveAsProject(
    input: SaveOpportunityInput,
  ): Promise<ProjectRecord | null> {
    const database = this.requireDatabase();
    const [opportunity] = await database
      .select({
        id: opportunities.id,
        title: opportunities.title,
      })
      .from(opportunities)
      .where(
        and(
          eq(opportunities.id, input.opportunityId),
          eq(opportunities.workspaceId, input.workspaceId),
        ),
      )
      .limit(1);
    if (!opportunity) {
      return null;
    }

    const [existing] = await database
      .select({
        id: projects.id,
        opportunityId: projects.opportunityId,
        title: projects.title,
        status: projects.status,
        currentLevel: projects.currentLevel,
        currentVersion: projects.currentVersion,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .where(
        and(
          eq(projects.workspaceId, input.workspaceId),
          eq(projects.opportunityId, input.opportunityId),
        ),
      )
      .limit(1);
    if (existing) {
      return existing;
    }

    const projectId = randomUUID();
    const projectVersionId = randomUUID();
    const now = new Date();
    await database.batch([
      database.insert(projects).values({
        id: projectId,
        workspaceId: input.workspaceId,
        creatorProfileId: input.creatorProfileId,
        opportunityId: opportunity.id,
        title: opportunity.title,
        status: "active",
        currentLevel: "idea",
        currentVersion: 1,
        createdAt: now,
        updatedAt: now,
      }),
      database.insert(projectVersions).values({
        id: projectVersionId,
        projectId,
        version: 1,
        level: "idea",
        changeSource: "opportunity_save",
        changeSummary: "Saved from the opportunity inbox",
        snapshot: { opportunityId: opportunity.id },
        createdByUserId: input.userId,
        createdAt: now,
      }),
      database
        .update(opportunities)
        .set({ status: "saved", savedAt: now, updatedAt: now })
        .where(eq(opportunities.id, opportunity.id)),
    ] as const);
    return {
      id: projectId,
      opportunityId: opportunity.id,
      title: opportunity.title,
      status: "active",
      currentLevel: "idea",
      currentVersion: 1,
      updatedAt: now,
    };
  }

  async findByIdempotency(
    workspaceId: string,
    idempotencyKey: string,
  ): Promise<OpportunityRecord[]> {
    const [batch] = await this.requireDatabase()
      .select({
        id: opportunityBatches.id,
        availableAt: opportunityBatches.availableAt,
      })
      .from(opportunityBatches)
      .where(
        and(
          eq(opportunityBatches.workspaceId, workspaceId),
          eq(opportunityBatches.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    return batch ? this.listBatch(batch.id, batch.availableAt) : [];
  }

  async createBatch(
    input: CreateOpportunityBatchInput,
  ): Promise<OpportunityRecord[]> {
    const database = this.requireDatabase();
    const batchId = randomUUID();
    const availableAt = new Date();
    const rows = input.opportunities.map((concept, index) => ({
      id: randomUUID(),
      batchId,
      workspaceId: input.workspaceId,
      creatorProfileId: input.creatorProfileId,
      position: index + 1,
      strategy: ["signature", "stretch", "repeatable"][index]!,
      title: concept.title,
      pitch: concept.pitch,
      rationale:
        "Generated from Creator DNA, current memory and this week's direction.",
      currentLevel: "idea",
      scoreOverall: concept.score,
      scoreMomentum: concept.score,
      scoreDnaFit: concept.score,
      scoreNovelty: concept.score,
      scoreFeasibility: concept.score,
      scoreConfidence: concept.confidence,
      effort: index === 1 ? "medium" : "low",
      platform: "tiktok",
      status: "available",
    }));

    await database.batch([
      database.insert(opportunityBatches).values({
        id: batchId,
        workspaceId: input.workspaceId,
        creatorProfileId: input.creatorProfileId,
        idempotencyKey: input.idempotencyKey,
        kind: "generated",
        size: 3,
        status: "available",
        availableAt,
      }),
      database.insert(opportunities).values(rows),
    ] as const);
    return this.listBatch(batchId, availableAt);
  }

  async createRevision(
    input: CreateOpportunityRevisionInput,
  ): Promise<OpportunityRevisionRecord | null> {
    const project = await this.saveAsProject(input);
    if (!project) {
      return null;
    }

    const database = this.requireDatabase();
    const now = new Date();
    const version = project.currentVersion + 1;
    const projectVersionId = randomUUID();
    const memoryCandidateId =
      input.memoryScope === "idea" ? null : randomUUID();
    const insertVersion = database.insert(projectVersions).values({
      id: projectVersionId,
      projectId: project.id,
      version,
      level: project.currentLevel,
      parentVersion: project.currentVersion,
      changeSource: "chat_revision",
      changeSummary: input.generated.changeSummary,
      lockedFields: input.lockedFields,
      snapshot: {
        opportunityId: input.opportunityId,
        title: input.generated.title,
        pitch: input.generated.pitch,
        hook: input.generated.hook,
      },
      createdByUserId: input.userId,
      createdAt: now,
    });
    const updateProject = database
      .update(projects)
      .set({
        title: input.generated.title,
        currentVersion: version,
        updatedAt: now,
      })
      .where(eq(projects.id, project.id));

    if (memoryCandidateId) {
      await database.batch([
        insertVersion,
        updateProject,
        database.insert(memoryCandidates).values({
          id: memoryCandidateId,
          workspaceId: input.workspaceId,
          creatorProfileId: input.creatorProfileId,
          kind: input.memoryScope,
          content: input.generated.memoryContent,
          evidence: {
            source: "opportunity_chat",
            opportunityId: input.opportunityId,
            projectId: project.id,
          },
          status: "pending",
          createdAt: now,
        }),
      ] as const);
    } else {
      await database.batch([insertVersion, updateProject] as const);
    }

    return {
      project: {
        ...project,
        title: input.generated.title,
        currentLevel: project.currentLevel,
        currentVersion: version,
        updatedAt: now,
      },
      version,
      title: input.generated.title,
      pitch: input.generated.pitch,
      hook: input.generated.hook,
      changeSummary: input.generated.changeSummary,
      memoryCandidate: memoryCandidateId
        ? {
            id: memoryCandidateId,
            status: "pending",
            scope: input.memoryScope,
            content: input.generated.memoryContent,
          }
        : null,
    };
  }

  async findScriptUpgradeByIdempotency(
    workspaceId: string,
    idempotencyKey: string,
  ): Promise<ScriptUpgradeRecord | null> {
    const database = this.requireDatabase();
    const [job] = await database
      .select(workflowJobSelection)
      .from(generationJobs)
      .where(
        and(
          eq(generationJobs.workspaceId, workspaceId),
          eq(generationJobs.idempotencyKey, idempotencyKey),
          eq(generationJobs.kind, "script"),
          eq(generationJobs.status, "succeeded"),
        ),
      )
      .limit(1);
    if (!job?.projectId) {
      return null;
    }

    const [project] = await database
      .select(projectSelection)
      .from(projects)
      .where(
        and(
          eq(projects.id, job.projectId),
          eq(projects.workspaceId, workspaceId),
        ),
      )
      .limit(1);
    const [script] = await database
      .select({
        id: scripts.id,
        projectId: scripts.projectId,
        title: scripts.title,
        hook: scripts.hook,
        body: scripts.body,
        callToAction: scripts.callToAction,
        caption: scripts.caption,
        platforms: scripts.platforms,
        durationSeconds: scripts.durationSeconds,
      })
      .from(scripts)
      .where(eq(scripts.projectId, job.projectId))
      .orderBy(desc(scripts.createdAt))
      .limit(1);
    if (!project || !script) {
      return null;
    }
    return {
      project,
      script: { ...script, platforms: this.toPlatforms(script.platforms) },
      job,
    };
  }

  async findExistingScriptUpgrade(
    workspaceId: string,
    opportunityId: string,
  ): Promise<ScriptUpgradeRecord | null> {
    const database = this.requireDatabase();
    const [project] = await database
      .select(projectSelection)
      .from(projects)
      .where(
        and(
          eq(projects.workspaceId, workspaceId),
          eq(projects.opportunityId, opportunityId),
          inArray(projects.currentLevel, ["script", "storyboard", "video"]),
        ),
      )
      .limit(1);
    if (!project) {
      return null;
    }
    const [script] = await database
      .select({
        id: scripts.id,
        projectId: scripts.projectId,
        title: scripts.title,
        hook: scripts.hook,
        body: scripts.body,
        callToAction: scripts.callToAction,
        caption: scripts.caption,
        platforms: scripts.platforms,
        durationSeconds: scripts.durationSeconds,
      })
      .from(scripts)
      .where(eq(scripts.projectId, project.id))
      .orderBy(desc(scripts.createdAt))
      .limit(1);
    const [job] = await database
      .select(workflowJobSelection)
      .from(generationJobs)
      .where(
        and(
          eq(generationJobs.workspaceId, workspaceId),
          eq(generationJobs.projectId, project.id),
          eq(generationJobs.status, "succeeded"),
        ),
      )
      .orderBy(desc(generationJobs.createdAt))
      .limit(1);
    if (!script || !job) {
      return null;
    }
    return {
      project,
      script: { ...script, platforms: this.toPlatforms(script.platforms) },
      job,
    };
  }

  async createScriptUpgrade(
    input: CreateScriptUpgradeInput,
  ): Promise<ScriptUpgradeRecord | null> {
    const existing = await this.findScriptUpgradeByIdempotency(
      input.workspaceId,
      input.idempotencyKey,
    );
    if (existing) {
      return existing;
    }
    const project = await this.saveAsProject(input);
    if (!project) {
      return null;
    }

    const database = this.requireDatabase();
    const now = new Date();
    const version = project.currentVersion + 1;
    const projectVersionId = randomUUID();
    const scriptId = randomUUID();
    const jobId = randomUUID();
    await database.batch([
      database.insert(projectVersions).values({
        id: projectVersionId,
        projectId: project.id,
        version,
        level: "script",
        parentVersion: project.currentVersion,
        changeSource: "opportunity_upgrade",
        changeSummary: "Generated the first script from the saved opportunity",
        snapshot: {
          opportunityId: input.opportunityId,
          scriptId,
          hook: input.generated.hook,
        },
        createdByUserId: input.userId,
        createdAt: now,
      }),
      database.insert(scripts).values({
        id: scriptId,
        projectId: project.id,
        projectVersionId,
        title: input.generated.title,
        hook: input.generated.hook,
        body: input.generated.body,
        callToAction: input.generated.callToAction,
        caption: input.generated.caption,
        platforms: input.generated.platforms,
        durationSeconds: input.generated.durationSeconds,
        createdAt: now,
        updatedAt: now,
      }),
      database.insert(generationJobs).values({
        id: jobId,
        workspaceId: input.workspaceId,
        projectId: project.id,
        requestedByUserId: input.userId,
        kind: "script",
        provider: input.provider,
        model: input.model,
        status: "succeeded",
        progress: 100,
        idempotencyKey: input.idempotencyKey,
        input: { opportunityId: input.opportunityId },
        output: { scriptId, projectVersion: version },
        createdAt: now,
        startedAt: now,
        completedAt: now,
        updatedAt: now,
      }),
      database
        .update(projects)
        .set({
          title: input.generated.title,
          currentLevel: "script",
          currentVersion: version,
          updatedAt: now,
        })
        .where(eq(projects.id, project.id)),
    ] as const);

    return {
      project: {
        ...project,
        title: input.generated.title,
        currentLevel: "script",
        currentVersion: version,
        updatedAt: now,
      },
      script: {
        id: scriptId,
        projectId: project.id,
        ...input.generated,
      },
      job: {
        id: jobId,
        kind: "script",
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

  private async listBatch(
    batchId: string,
    availableAt: Date,
  ): Promise<OpportunityRecord[]> {
    const rows = await this.requireDatabase()
      .select({
        id: opportunities.id,
        position: opportunities.position,
        title: opportunities.title,
        pitch: opportunities.pitch,
        scoreOverall: opportunities.scoreOverall,
        scoreConfidence: opportunities.scoreConfidence,
        scoreMomentum: opportunities.scoreMomentum,
        scoreDnaFit: opportunities.scoreDnaFit,
        scoreNovelty: opportunities.scoreNovelty,
        scoreFeasibility: opportunities.scoreFeasibility,
        rationale: opportunities.rationale,
        effort: opportunities.effort,
        platform: opportunities.platform,
        estimatedDurationSeconds: opportunities.estimatedDurationSeconds,
        projectId: projects.id,
        projectCurrentLevel: projects.currentLevel,
      })
      .from(opportunities)
      .leftJoin(projects, eq(projects.opportunityId, opportunities.id))
      .where(
        and(
          eq(opportunities.batchId, batchId),
          inArray(opportunities.status, [...currentOpportunityStatuses]),
        ),
      )
      .orderBy(asc(opportunities.position));

    return rows.map((row) => ({ ...row, availableAt }));
  }

  private toPlatforms(
    platforms: string[],
  ): Array<"tiktok" | "instagram" | "youtube"> {
    return platforms.filter(
      (platform): platform is "tiktok" | "instagram" | "youtube" =>
        platform === "tiktok" ||
        platform === "instagram" ||
        platform === "youtube",
    );
  }

  private toOpportunitySnapshot(value: unknown): {
    title?: string;
    pitch?: string;
    hook?: string;
  } {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }
    const snapshot = value as Record<string, unknown>;
    return {
      ...(typeof snapshot.title === "string" ? { title: snapshot.title } : {}),
      ...(typeof snapshot.pitch === "string" ? { pitch: snapshot.pitch } : {}),
      ...(typeof snapshot.hook === "string" ? { hook: snapshot.hook } : {}),
    };
  }

  private requireDatabase(): CreonomeDatabase {
    if (!this.database) {
      throw new ServiceUnavailableException("DATABASE_URL is not configured");
    }
    return this.database;
  }
}
