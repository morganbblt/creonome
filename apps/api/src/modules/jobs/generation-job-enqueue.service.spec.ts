import { describe, expect, it, vi } from "vitest";
import type { GenerationQueue } from "./generation-queue.js";
import { GenerationJobEnqueueService } from "./generation-job-enqueue.service.js";
import type { CreateJobInput, InternalJobRecord, JobsRepository } from "./jobs.repository.js";

const input: CreateJobInput = {
  workspaceId: "0198f3a2-82dd-7000-8000-000000000001",
  projectId: null,
  requestedByUserId: "0198f3a2-82dd-7000-8000-000000000002",
  kind: "script",
  provider: "pending",
  model: "pending",
  idempotencyKey: "upgrade-1",
  input: { opportunityId: "0198f3a2-82dd-7000-8000-000000000003" },
};

function createdJob(): InternalJobRecord {
  return {
    id: "0198f3a2-82dd-7000-8000-000000000099",
    kind: "script",
    provider: "pending",
    model: "pending",
    status: "queued",
    progress: 0,
    errorCode: null,
    errorMessage: null,
    createdAt: new Date("2026-08-02T10:00:00.000Z"),
    updatedAt: new Date("2026-08-02T10:00:00.000Z"),
    completedAt: null,
    workspaceId: input.workspaceId,
    projectId: null,
    requestedByUserId: input.requestedByUserId,
    idempotencyKey: input.idempotencyKey,
    input: input.input,
  };
}

function setup() {
  const jobs: JobsRepository = {
    findById: vi.fn(),
    findByIdUnscoped: vi.fn(),
    cancel: vi.fn(),
    retry: vi.fn(),
    create: vi.fn().mockResolvedValue(createdJob()),
    markRunning: vi.fn(),
    markSucceeded: vi.fn(),
    markFailed: vi.fn().mockResolvedValue({ ...createdJob(), status: "failed_final" }),
  };
  const queue: GenerationQueue = { enqueue: vi.fn().mockResolvedValue(undefined) };
  return { service: new GenerationJobEnqueueService(jobs, queue), jobs, queue };
}

describe("GenerationJobEnqueueService", () => {
  it("creates a queued job and enqueues a Cloud Tasks task, returning immediately", async () => {
    const { service, jobs, queue } = setup();

    const job = await service.createAndEnqueue(input);

    expect(jobs.create).toHaveBeenCalledWith(input);
    expect(queue.enqueue).toHaveBeenCalledWith({
      jobId: job.id,
      kind: "script",
    });
    expect(job.status).toBe("queued");
  });

  it("fails the job and rethrows when Cloud Tasks is not configured, instead of leaving it stuck", async () => {
    const { service, jobs, queue } = setup();
    vi.mocked(queue.enqueue).mockRejectedValueOnce(
      new Error("Cloud Tasks is not configured for this environment"),
    );

    await expect(service.createAndEnqueue(input)).rejects.toThrow(
      "Cloud Tasks is not configured for this environment",
    );
    expect(jobs.markFailed).toHaveBeenCalledWith(
      createdJob().id,
      "failed_final",
      "QUEUE_UNAVAILABLE",
      "Cloud Tasks is not configured for this environment",
    );
  });
});
