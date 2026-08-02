import { BadRequestException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { describe, expect, it, vi } from "vitest";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import type { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import type { AssetsRepository } from "./assets.repository.js";
import { AssetsService } from "./assets.service.js";

const principal: AuthPrincipal = {
  subject: "0198f3a2-82dd-7000-8000-000000000001",
};

function createService(records: Array<Record<string, unknown>> = []) {
  const workspaces = {
    resolve: vi.fn().mockResolvedValue({
      workspaceId: "0198f3a2-82dd-7000-8000-000000000002",
      userId: "0198f3a2-82dd-7000-8000-000000000003",
    }),
  } as unknown as WorkspaceContextService;
  const repository: AssetsRepository = {
    list: vi.fn().mockResolvedValue(records),
    create: vi.fn().mockImplementation(async (input) => ({
      id: "0198f3a2-82dd-7000-8000-000000000040",
      projectId: null,
      name: input.fileName,
      kind: null,
      mimeType: input.mimeType,
      byteSize: input.byteSize,
      durationSeconds: null,
      status: "uploaded",
      source: "upload",
      createdAt: new Date("2026-08-02T10:00:00.000Z"),
    })),
  };
  const config = {
    get: vi.fn().mockReturnValue("creonome-909754432431-media"),
  } as unknown as ConfigService;
  return {
    service: new AssetsService(workspaces, repository, config),
    repository,
  };
}

describe("AssetsService", () => {
  it("combines private assets and scripts into a workspace library", async () => {
    const { service } = createService([
      {
        id: "0198f3a2-82dd-7000-8000-000000000040",
        projectId: "0198f3a2-82dd-7000-8000-000000000020",
        name: "warehouse-tapes-v1.mp4",
        kind: "video",
        mimeType: "video/mp4",
        byteSize: 8_400_000,
        durationSeconds: 35,
        status: "succeeded",
        source: "generated",
        createdAt: new Date("2026-08-02T10:00:00.000Z"),
      },
      {
        id: "0198f3a2-82dd-7000-8000-000000000041",
        projectId: "0198f3a2-82dd-7000-8000-000000000020",
        name: "Warehouse tape loop",
        kind: "script",
        mimeType: "text/plain",
        byteSize: null,
        durationSeconds: 35,
        status: "ready",
        source: "script",
        createdAt: new Date("2026-08-02T09:00:00.000Z"),
      },
      {
        id: "0198f3a2-82dd-7000-8000-000000000042",
        projectId: "0198f3a2-82dd-7000-8000-000000000020",
        name: "warehouse-tape-loop.md",
        kind: "export",
        mimeType: "text/markdown;charset=utf-8",
        byteSize: null,
        durationSeconds: null,
        status: "ready",
        source: "export",
        createdAt: new Date("2026-08-02T11:00:00.000Z"),
      },
    ]);

    await expect(service.list(principal)).resolves.toMatchObject({
      totalByteSize: 8_400_000,
      items: [
        { name: "warehouse-tapes-v1.mp4", kind: "export", status: "ready" },
        { name: "Warehouse tape loop", kind: "script", status: "ready" },
        {
          name: "warehouse-tape-loop.md",
          kind: "export",
          status: "ready",
        },
      ],
    });
  });

  it("registers an uploaded object inside the resolved workspace prefix", async () => {
    const { service, repository } = createService();
    const input = {
      fileName: "needle_macro.mov",
      mimeType: "video/quicktime",
      byteSize: 12_500_000,
      gcsUri:
        "gs://creonome-909754432431-media/workspaces/0198f3a2-82dd-7000-8000-000000000002/sources/asset.mov",
    };

    await expect(service.create(principal, input)).resolves.toMatchObject({
      name: input.fileName,
      kind: "video",
      source: "upload",
    });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "0198f3a2-82dd-7000-8000-000000000002",
        gcsUri: input.gcsUri,
      }),
    );
  });

  it("rejects registration of an object outside the workspace prefix", async () => {
    const { service, repository } = createService();

    await expect(
      service.create(principal, {
        fileName: "foreign.mov",
        mimeType: "video/quicktime",
        byteSize: 100,
        gcsUri: "gs://other-bucket/workspaces/foreign/sources/foreign.mov",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });
});
