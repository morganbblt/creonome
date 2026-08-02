import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { describe, expect, it, vi } from "vitest";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import type {
  PrivateObjectReader,
  PrivateObjectStore,
} from "../uploads/private-object-store.js";
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
  const source = {
    id: "0198f3a2-82dd-7000-8000-000000000043",
    projectId: null,
    name: "private-rush.mov",
    kind: null,
    mimeType: "video/quicktime",
    byteSize: 4_200_000,
    durationSeconds: null,
    status: "ready",
    source: "upload" as const,
    gcsUri:
      "gs://creonome-909754432431-media/workspaces/0198f3a2-82dd-7000-8000-000000000002/sources/private-rush.mov",
    createdAt: new Date("2026-08-02T10:00:00.000Z"),
  };
  const findSourceById = vi
    .fn<AssetsRepository["findSourceById"]>()
    .mockResolvedValue(source);
  const deleteSource = vi
    .fn<AssetsRepository["deleteSource"]>()
    .mockResolvedValue(true);
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
    findSourceById,
    deleteSource,
  };
  const deleteObject = vi
    .fn<PrivateObjectStore["deleteObject"]>()
    .mockResolvedValue(undefined);
  const objectStore: PrivateObjectStore = {
    deleteObject,
  };
  const objectReader: PrivateObjectReader = {
    readObject: vi.fn().mockResolvedValue({
      bytes: Buffer.from("image"),
      mimeType: "image/jpeg",
    }),
  };
  const config = {
    get: vi.fn().mockReturnValue("creonome-909754432431-media"),
  } as unknown as ConfigService;
  return {
    service: new AssetsService(
      workspaces,
      repository,
      config,
      objectStore,
      objectReader,
    ),
    repository,
    findSourceById,
    deleteSource,
    deleteObject,
    objectReader,
    source,
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

  it("returns one uploaded source without exposing its private GCS URI", async () => {
    const { service, findSourceById, source } = createService();

    const asset = await service.get(principal, source.id);

    expect(asset).toMatchObject({
      id: source.id,
      name: source.name,
      source: "upload",
    });
    expect(asset).not.toHaveProperty("gcsUri");
    expect(findSourceById).toHaveBeenCalledWith(
      "0198f3a2-82dd-7000-8000-000000000002",
      source.id,
    );
  });

  it("deletes the private object before its cascading database record", async () => {
    const { service, deleteObject, deleteSource, source } = createService();

    await expect(service.remove(principal, source.id)).resolves.toEqual({
      id: source.id,
      deleted: true,
    });
    expect(deleteObject).toHaveBeenCalledWith(source.gcsUri);
    expect(deleteSource).toHaveBeenCalledWith(
      "0198f3a2-82dd-7000-8000-000000000002",
      source.id,
    );
    expect(deleteObject.mock.invocationCallOrder[0]).toBeLessThan(
      deleteSource.mock.invocationCallOrder[0]!,
    );
  });

  it("does not touch storage when a source belongs to another workspace", async () => {
    const { service, findSourceById, deleteSource, deleteObject, source } =
      createService();
    findSourceById.mockResolvedValue(null);

    await expect(service.remove(principal, source.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(deleteObject).not.toHaveBeenCalled();
    expect(deleteSource).not.toHaveBeenCalled();
  });

  it("preserves the database record when private object deletion fails", async () => {
    const { service, deleteSource, deleteObject, source } = createService();
    deleteObject.mockRejectedValue(new Error("storage unavailable"));

    await expect(service.remove(principal, source.id)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(deleteSource).not.toHaveBeenCalled();
  });

  it("streams an image only after resolving it inside the workspace", async () => {
    const { service, source, objectReader } = createService();
    source.mimeType = "image/png";

    await expect(service.readContent(principal, source.id)).resolves.toEqual({
      bytes: Buffer.from("image"),
      mimeType: "image/jpeg",
    });
    expect(objectReader.readObject).toHaveBeenCalledWith(source.gcsUri);
  });
});
