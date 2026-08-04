import { Inject, Injectable } from "@nestjs/common";
import {
  GENERATION_QUEUE,
  type GenerationQueue,
} from "./generation-queue.js";
import {
  JOBS_REPOSITORY,
  type CreateJobInput,
  type InternalJobRecord,
  type JobsRepository,
} from "./jobs.repository.js";

/**
 * Shared by every generation-triggering controller action: inserts the
 * "queued" generation_jobs row and hands it to the Cloud Tasks queue. If
 * the queue cannot be reached (most commonly because Cloud Tasks is not
 * configured for this environment, e.g. local dev), the job is marked
 * failed_final so it never sits invisibly stuck in "queued", and the
 * original error is rethrown so the caller can release any reserved
 * credits and surface a clear failure instead of a silent hang.
 */
@Injectable()
export class GenerationJobEnqueueService {
  constructor(
    @Inject(JOBS_REPOSITORY) private readonly jobs: JobsRepository,
    @Inject(GENERATION_QUEUE) private readonly queue: GenerationQueue,
  ) {}

  async createAndEnqueue(input: CreateJobInput): Promise<InternalJobRecord> {
    const job = await this.jobs.create(input);
    try {
      await this.queue.enqueue({ jobId: job.id, kind: job.kind });
    } catch (error) {
      await this.jobs.markFailed(
        job.id,
        "failed_final",
        "QUEUE_UNAVAILABLE",
        error instanceof Error
          ? error.message
          : "Failed to enqueue the generation job",
      );
      throw error;
    }
    return job;
  }
}
