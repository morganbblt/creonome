import { GenerationJobSchema, type GenerationJob } from "@creonome/contracts";

const terminalFailureStatuses = new Set([
  "failed",
  "failed_retryable",
  "failed_final",
  "cancelled",
]);

export class GenerationJobFailedError extends Error {
  constructor(readonly job: GenerationJob) {
    super(job.errorMessage ?? "Generation failed");
    this.name = "GenerationJobFailedError";
  }
}

export class GenerationJobTimeoutError extends Error {
  constructor() {
    super("Timed out waiting for the generation job to finish");
    this.name = "GenerationJobTimeoutError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Polls `GET /api/creonome/jobs/:id` (which proxies the API's
 * `GET /api/v1/jobs/:id`) until the queued generation job reaches a
 * terminal status. Generation now runs on the Cloud Tasks queue instead of
 * inline in the triggering request, so the client that queued the job is
 * responsible for watching it to completion.
 */
export async function pollGenerationJob(
  jobId: string,
  options: {
    intervalMs?: number;
    timeoutMs?: number;
    onUpdate?: (job: GenerationJob) => void;
    signal?: AbortSignal;
  } = {},
): Promise<GenerationJob> {
  const intervalMs = options.intervalMs ?? 2_000;
  // Comfortably above VEO_TIMEOUT_MS (240s) plus polling/processing slack.
  const timeoutMs = options.timeoutMs ?? 280_000;
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    if (options.signal?.aborted) {
      throw new DOMException("Polling was cancelled", "AbortError");
    }
    const response = await fetch(
      `/api/creonome/jobs/${encodeURIComponent(jobId)}`,
      { cache: "no-store", signal: options.signal },
    );
    if (!response.ok) {
      throw new Error("Could not check the generation job status");
    }
    const job = GenerationJobSchema.parse(await response.json());
    options.onUpdate?.(job);

    if (job.status === "succeeded") {
      return job;
    }
    if (terminalFailureStatuses.has(job.status)) {
      throw new GenerationJobFailedError(job);
    }
    if (Date.now() > deadline) {
      throw new GenerationJobTimeoutError();
    }
    await sleep(intervalMs);
  }
}
