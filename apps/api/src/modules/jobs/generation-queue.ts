export type EnqueueGenerationJobInput = {
  jobId: string;
  kind: string;
};

/**
 * Hands a queued generation_jobs row off to the Cloud Tasks queue so the
 * actual generation work runs outside the triggering HTTP request. See
 * ../../modules/jobs/cloud-tasks-generation-queue.ts for the GCP-backed
 * implementation and docs/setup/environment.md for the provisioned queue.
 */
export interface GenerationQueue {
  enqueue(input: EnqueueGenerationJobInput): Promise<void>;
}

export const GENERATION_QUEUE = Symbol("GENERATION_QUEUE");
