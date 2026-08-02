import { Inject, ServiceUnavailableException } from "@nestjs/common";
import { type CreonomeDatabase, generationJobs } from "@creonome/db";
import { and, eq, inArray } from "drizzle-orm";
import { CREONOME_DATABASE } from "../database/database.module.js";
import type { JobRecord, JobsRepository } from "./jobs.repository.js";

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
          inArray(generationJobs.status, ["failed", "cancelled"]),
        ),
      )
      .returning(jobSelection);
    return job ?? null;
  }

  private requireDatabase(): CreonomeDatabase {
    if (!this.database) {
      throw new ServiceUnavailableException("DATABASE_URL is not configured");
    }
    return this.database;
  }
}
