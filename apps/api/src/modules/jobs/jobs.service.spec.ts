import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import type { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import type { GenerationQueue } from "./generation-queue.js";
import type { JobsRepository } from "./jobs.repository.js";
import { JobsService } from "./jobs.service.js";

const principal: AuthPrincipal = {
  subject: "0198f3a2-82dd-7000-8000-000000000001",
};
const jobId = "0198f3a2-82dd-7000-8000-000000000002";

function createService(
  record: Record<string, unknown> | null,
  overrides: Partial<JobsRepository> = {},
) {
  const workspaces = {
    resolve: vi.fn().mockResolvedValue({ workspaceId: "workspace-1" }),
  } as unknown as WorkspaceContextService;
  const repository: JobsRepository = {
    findById: vi.fn().mockResolvedValue(record),
    findByIdUnscoped: vi.fn(),
    cancel: vi.fn(),
    retry: vi.fn(),
    create: vi.fn(),
    markRunning: vi.fn(),
    markSucceeded: vi.fn(),
    markFailed: vi.fn(),
    ...overrides,
  };
  const queue: GenerationQueue = {
    enqueue: vi.fn().mockResolvedValue(undefined),
  };
  return { service: new JobsService(workspaces, repository, queue), repository, queue };
}

const baseJob = {
  id: jobId,
  kind: "video_render",
  provider: "demo-renderer",
  model: "ffmpeg-v1",
  status: "succeeded",
  progress: 100,
  errorCode: null,
  errorMessage: null,
  createdAt: new Date("2026-08-02T09:00:00.000Z"),
  updatedAt: new Date("2026-08-02T09:01:00.000Z"),
  completedAt: new Date("2026-08-02T09:01:00.000Z"),
};

describe("JobsService", () => {
  it("returns a workspace-scoped observable generation state", async () => {
    const { service } = createService(baseJob);

    await expect(service.get(principal, jobId)).resolves.toMatchObject({
      id: jobId,
      status: "succeeded",
      progress: 100,
      completedAt: "2026-08-02T09:01:00.000Z",
    });
  });

  it("does not reveal jobs outside the resolved workspace", async () => {
    const { service } = createService(null);
    await expect(service.get(principal, jobId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("re-enqueues a Cloud Tasks task when a job is retried", async () => {
    const retriedJob = { ...baseJob, status: "queued", progress: 0 };
    const { service, repository, queue } = createService(null, {
      retry: vi.fn().mockResolvedValue(retriedJob),
    });

    const result = await service.retry(principal, jobId);

    expect(repository.retry).toHaveBeenCalledWith("workspace-1", jobId);
    expect(queue.enqueue).toHaveBeenCalledWith({
      jobId,
      kind: "video_render",
    });
    expect(result.status).toBe("queued");
  });

  it("fails the job instead of leaving it stuck when re-enqueuing fails", async () => {
    const retriedJob = { ...baseJob, status: "queued", progress: 0 };
    const { service, repository, queue } = createService(null, {
      retry: vi.fn().mockResolvedValue(retriedJob),
    });
    vi.mocked(queue.enqueue).mockRejectedValueOnce(
      new Error("Cloud Tasks is not configured"),
    );

    await expect(service.retry(principal, jobId)).rejects.toThrow(
      "Cloud Tasks is not configured",
    );
    expect(repository.markFailed).toHaveBeenCalledWith(
      jobId,
      "failed_final",
      "QUEUE_UNAVAILABLE",
      "Cloud Tasks is not configured",
    );
  });

  it("does not re-enqueue when there was no retryable job", async () => {
    const { service, queue } = createService(null, {
      retry: vi.fn().mockResolvedValue(null),
    });

    await expect(service.retry(principal, jobId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(queue.enqueue).not.toHaveBeenCalled();
  });
});
