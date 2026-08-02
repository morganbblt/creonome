import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { GenerationJobSchema, type GenerationJob } from "@creonome/contracts";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import {
  JOBS_REPOSITORY,
  type JobRecord,
  type JobsRepository,
} from "./jobs.repository.js";

@Injectable()
export class JobsService {
  constructor(
    @Inject(WorkspaceContextService)
    private readonly workspaces: WorkspaceContextService,
    @Inject(JOBS_REPOSITORY)
    private readonly repository: JobsRepository,
  ) {}

  async get(principal: AuthPrincipal, jobId: string): Promise<GenerationJob> {
    const context = await this.workspaces.resolve(principal);
    return this.toContract(
      await this.repository.findById(context.workspaceId, jobId),
    );
  }

  async cancel(principal: AuthPrincipal, jobId: string): Promise<GenerationJob> {
    const context = await this.workspaces.resolve(principal);
    return this.toContract(
      await this.repository.cancel(context.workspaceId, jobId),
    );
  }

  async retry(principal: AuthPrincipal, jobId: string): Promise<GenerationJob> {
    const context = await this.workspaces.resolve(principal);
    return this.toContract(
      await this.repository.retry(context.workspaceId, jobId),
    );
  }

  private toContract(job: JobRecord | null): GenerationJob {
    if (!job) {
      throw new NotFoundException("Generation job was not found");
    }
    return GenerationJobSchema.parse({
      ...job,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      completedAt: job.completedAt?.toISOString() ?? null,
    });
  }
}
