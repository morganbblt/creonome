import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import type { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import type { JobsRepository } from "./jobs.repository.js";
import { JobsService } from "./jobs.service.js";

const principal: AuthPrincipal = {
  subject: "0198f3a2-82dd-7000-8000-000000000001",
};
const jobId = "0198f3a2-82dd-7000-8000-000000000002";

function createService(record: Record<string, unknown> | null) {
  const workspaces = {
    resolve: vi.fn().mockResolvedValue({ workspaceId: "workspace-1" }),
  } as unknown as WorkspaceContextService;
  const repository: JobsRepository = {
    findById: vi.fn().mockResolvedValue(record),
    cancel: vi.fn(),
    retry: vi.fn(),
  };
  return new JobsService(workspaces, repository);
}

describe("JobsService", () => {
  it("returns a workspace-scoped observable generation state", async () => {
    const service = createService({
      id: jobId,
      kind: "video",
      provider: "demo-renderer",
      model: "ffmpeg-v1",
      status: "succeeded",
      progress: 100,
      errorCode: null,
      errorMessage: null,
      createdAt: new Date("2026-08-02T09:00:00.000Z"),
      updatedAt: new Date("2026-08-02T09:01:00.000Z"),
      completedAt: new Date("2026-08-02T09:01:00.000Z"),
    });

    await expect(service.get(principal, jobId)).resolves.toMatchObject({
      id: jobId,
      status: "succeeded",
      progress: 100,
      completedAt: "2026-08-02T09:01:00.000Z",
    });
  });

  it("does not reveal jobs outside the resolved workspace", async () => {
    const service = createService(null);
    await expect(service.get(principal, jobId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
