import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { GenerationJobSchema, type GenerationJob } from "@creonome/contracts";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import { GENERATION_QUEUE, type GenerationQueue } from "./generation-queue.js";
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
    @Inject(GENERATION_QUEUE)
    private readonly queue: GenerationQueue,
  ) {}

  async get(principal: AuthPrincipal, jobId: string): Promise<GenerationJob> {
    const context = await this.workspaces.resolve(principal);
    return this.toContract(
      await this.repository.findById(context.workspaceId, jobId),
    );
  }

  async cancel(
    principal: AuthPrincipal,
    jobId: string,
  ): Promise<GenerationJob> {
    const context = await this.workspaces.resolve(principal);
    return this.toContract(
      await this.repository.cancel(context.workspaceId, jobId),
    );
  }

  async retry(principal: AuthPrincipal, jobId: string): Promise<GenerationJob> {
    const context = await this.workspaces.resolve(principal);
    const job = await this.repository.retry(context.workspaceId, jobId);
    if (!job) {
      throw new NotFoundException("Generation job was not found");
    }
    // Retrying must actually put the job back to work, not just flip its
    // status back to "queued": re-enqueue the Cloud Tasks task so the
    // internal handler picks it up again. If the queue is unreachable,
    // fail the job outright instead of leaving it stuck in "queued".
    try {
      await this.queue.enqueue({ jobId: job.id, kind: job.kind });
    } catch (error) {
      await this.repository.markFailed(
        job.id,
        "failed_final",
        "QUEUE_UNAVAILABLE",
        error instanceof Error
          ? error.message
          : "Failed to re-enqueue the generation job",
      );
      throw error;
    }
    return this.toContract(job);
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
