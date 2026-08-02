import { NotFoundException } from "@nestjs/common";
import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import type { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import type { ProjectsRepository } from "./projects.repository.js";
import { ProjectVideoService } from "./project-video.service.js";
import type { VideoObjectStore } from "./video/video-object-store.js";

const principal: AuthPrincipal = { subject: "neon-user-1" };

function setup(simulated = false) {
  const workspaces = {
    resolve: vi.fn().mockResolvedValue({ workspaceId: "workspace-1" }),
  } as unknown as WorkspaceContextService;
  const repository = {
    findById: vi.fn().mockResolvedValue({
      video: {
        simulated,
        gcsUri: simulated
          ? "mvp://workspace/project/video.mp4"
          : "gs://creonome-media/generated-videos/workspace/project/video.mp4",
      },
    }),
  } as unknown as ProjectsRepository;
  const read = {
    stream: Readable.from(Buffer.from("video")),
    contentLength: 200,
    totalSize: 2_048,
    contentRange: "bytes 100-299/2048",
  };
  const store = {
    read: vi.fn().mockResolvedValue(read),
  } as unknown as VideoObjectStore;
  return {
    service: new ProjectVideoService(workspaces, repository, store),
    repository,
    store,
    read,
  };
}

describe("ProjectVideoService", () => {
  it("streams only the authenticated workspace's private Veo object", async () => {
    const { service, repository, store, read } = setup();

    await expect(
      service.read(principal, "project-1", "bytes=100-299"),
    ).resolves.toEqual(read);
    expect(repository.findById).toHaveBeenCalledWith(
      "workspace-1",
      "project-1",
    );
    expect(store.read).toHaveBeenCalledWith(
      "gs://creonome-media/generated-videos/workspace/project/video.mp4",
      "bytes=100-299",
    );
  });

  it("does not expose deterministic public fixtures through the private route", async () => {
    const { service, store } = setup(true);
    await expect(service.read(principal, "project-1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(store.read).not.toHaveBeenCalled();
  });
});
