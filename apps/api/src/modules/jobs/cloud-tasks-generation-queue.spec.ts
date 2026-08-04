import { ServiceUnavailableException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { describe, expect, it, vi } from "vitest";
import { CloudTasksGenerationQueue } from "./cloud-tasks-generation-queue.js";

function configService(values: Record<string, string> = {}): ConfigService {
  return {
    get: vi.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

describe("CloudTasksGenerationQueue", () => {
  it("fails clearly instead of crashing when required env vars are missing (e.g. local dev)", async () => {
    const queue = new CloudTasksGenerationQueue(configService({}));

    await expect(
      queue.enqueue({ jobId: "job-1", kind: "script" }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(
      queue.enqueue({ jobId: "job-1", kind: "script" }),
    ).rejects.toMatchObject({
      message: expect.stringContaining("GOOGLE_CLOUD_PROJECT"),
    });
  });

  it("fails clearly when only some Cloud Tasks env vars are configured", async () => {
    const queue = new CloudTasksGenerationQueue(
      configService({
        GOOGLE_CLOUD_PROJECT: "creonome",
        GCP_TASKS_LOCATION: "europe-west1",
        // GCP_TASKS_QUEUE, WORKER_BASE_URL, INTERNAL_JOB_TOKEN intentionally missing
      }),
    );

    await expect(
      queue.enqueue({ jobId: "job-1", kind: "script" }),
    ).rejects.toMatchObject({
      message: expect.stringContaining("GCP_TASKS_QUEUE"),
    });
  });

  it("rejects a job kind with no registered internal handler", async () => {
    const queue = new CloudTasksGenerationQueue(
      configService({
        GOOGLE_CLOUD_PROJECT: "creonome",
        GCP_TASKS_LOCATION: "europe-west1",
        GCP_TASKS_QUEUE: "creonome-generation",
        WORKER_BASE_URL: "https://api.creonome.com",
        INTERNAL_JOB_TOKEN: "secret",
      }),
    );

    await expect(
      queue.enqueue({ jobId: "job-1", kind: "unknown_kind" }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
