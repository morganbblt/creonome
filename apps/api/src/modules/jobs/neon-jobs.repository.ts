import { Inject, ServiceUnavailableException } from "@nestjs/common";
import { type CreonomeDatabase, generationJobs } from "@creonome/db";
import { and, eq, inArray } from "drizzle-orm";
import { CREONOME_DATABASE } from "../database/database.module.js";
import type {
  CreateJobInput,
  FailedJobStatus,
  InternalJobRecord,
  JobRecord,
  JobsRepository,
} from "./jobs.repository.js";

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
  projectId: generationJobs.projectId,
};

const internalJobSelection = {
  ...jobSelection,
  workspaceId: generationJobs.workspaceId,
  requestedByUserId: generationJobs.requestedByUserId,
  idempotencyKey: generationJobs.idempotencyKey,
  input: generationJobs.input,
};

/** Statuses from which a queued job may still be picked up or retried. */
const retryableStatuses = [
  "failed",
  "failed_retryable",
  "failed_final",
  "cancelled",
] as const;

export class NeonJobsRepository implements JobsRepository {
  constructor(
    @Inject(CREONOME_DATABASE)
    private readonly database: CreonomeDatabase | undefined,
  ) {}

  async findById(
    workspaceId: string,
    jobId: string,
  ): Promise<JobRecord | null> {
    const [job] = await this.requireDatabase()
      .select(jobSelection)
      .from(generationJobs)
      .where(
        and(
          eq(generationJobs.workspaceId, workspaceId),
          eq(generationJobs.id, jobId),
        ),
      )
      .limit(1);
    return job ?? null;
  }

  async findByIdUnscoped(jobId: string): Promise<InternalJobRecord | null> {
    const [job] = await this.requireDatabase()
      .select(internalJobSelection)
      .from(generationJobs)
      .where(eq(generationJobs.id, jobId))
      .limit(1);
    return (job as InternalJobRecord) ?? null;
  }

  async cancel(workspaceId: string, jobId: string): Promise<JobRecord | null> {
    const [job] = await this.requireDatabase()
      .update(generationJobs)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
        completedAt: new Date(),
      })
      .where(
        and(
          eq(generationJobs.workspaceId, workspaceId),
          eq(generationJobs.id, jobId),
          inArray(generationJobs.status, ["queued", "running"]),
        ),
      )
      .returning(jobSelection);
    return job ?? null;
  }

  async retry(workspaceId: string, jobId: string): Promise<JobRecord | null> {
    const [job] = await this.requireDatabase()
      .update(generationJobs)
      .set({
        status: "queued",
        progress: 0,
        errorCode: null,
        errorMessage: null,
        startedAt: null,
        completedAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(generationJobs.workspaceId, workspaceId),
          eq(generationJobs.id, jobId),
          inArray(generationJobs.status, retryableStatuses),
        ),
      )
      .returning(jobSelection);
    return job ?? null;
  }

  async create(input: CreateJobInput): Promise<InternalJobRecord> {
    const now = new Date();
    const [job] = await this.requireDatabase()
      .insert(generationJobs)
      .values({
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        requestedByUserId: input.requestedByUserId,
        kind: input.kind,
        provider: input.provider,
        model: input.model,
        status: "queued",
        progress: 0,
        idempotencyKey: input.idempotencyKey,
        input: input.input,
        output: {},
        createdAt: now,
        updatedAt: now,
      })
      .returning(internalJobSelection);
    return job as InternalJobRecord;
  }

  async markRunning(jobId: string): Promise<InternalJobRecord | null> {
    const [job] = await this.requireDatabase()
      .update(generationJobs)
      .set({
        status: "running",
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(generationJobs.id, jobId),
          inArray(generationJobs.status, ["queued", "running"]),
        ),
      )
      .returning(internalJobSelection);
    return (job as InternalJobRecord) ?? null;
  }

  async markSucceeded(
    jobId: string,
    output: Record<string, unknown>,
  ): Promise<InternalJobRecord | null> {
    const [job] = await this.requireDatabase()
      .update(generationJobs)
      .set({
        status: "succeeded",
        progress: 100,
        output,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(generationJobs.id, jobId))
      .returning(internalJobSelection);
    return (job as InternalJobRecord) ?? null;
  }

  async markFailed(
    jobId: string,
    status: FailedJobStatus,
    errorCode: string,
    errorMessage: string,
  ): Promise<InternalJobRecord | null> {
    const [job] = await this.requireDatabase()
      .update(generationJobs)
      .set({
        status,
        errorCode,
        errorMessage,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(generationJobs.id, jobId))
      .returning(internalJobSelection);
    return (job as InternalJobRecord) ?? null;
  }

  private requireDatabase(): CreonomeDatabase {
    if (!this.database) {
      throw new ServiceUnavailableException("DATABASE_URL is not configured");
    }
    return this.database;
  }
}
