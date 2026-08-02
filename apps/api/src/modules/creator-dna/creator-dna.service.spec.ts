import { describe, expect, it, vi } from "vitest";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import type { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import type { CreatorDnaRepository } from "./creator-dna.repository.js";
import { CreatorDnaService } from "./creator-dna.service.js";

const principal: AuthPrincipal = {
  subject: "0198f3a2-82dd-7000-8000-000000000001",
};

describe("CreatorDnaService", () => {
  it("returns the latest DNA version with evidence-backed traits", async () => {
    const workspaces = {
      resolve: vi.fn().mockResolvedValue({
        creatorProfileId: "0198f3a2-82dd-7000-8000-000000000002",
      }),
    } as unknown as WorkspaceContextService;
    const repository: CreatorDnaRepository = {
      getCurrent: vi.fn().mockResolvedValue({
        id: "0198f3a2-82dd-7000-8000-000000000003",
        version: 2,
        summary: "Nocturnal electronic stories grounded in tactile details.",
        confirmed: true,
        traits: [
          {
            id: "0198f3a2-82dd-7000-8000-000000000004",
            category: "voice",
            label: "Tone",
            value: "precise and intimate",
            confidence: "0.950",
            evidence: { source: "onboarding" },
          },
        ],
      }),
      confirmCurrent: vi.fn(),
      listVersions: vi.fn(),
      getPeopleReferenceImage: vi.fn().mockResolvedValue(null),
      setPeopleReferenceImage: vi.fn(),
      clearPeopleReferenceImage: vi.fn(),
    };
    const service = new CreatorDnaService(workspaces, repository);

    await expect(service.getCurrent(principal)).resolves.toEqual({
      version: 2,
      summary: "Nocturnal electronic stories grounded in tactile details.",
      confirmed: true,
      peopleReferenceImage: null,
      traits: [expect.objectContaining({ confidence: 0.95, label: "Tone" })],
    });
  });

  it("sets and clears a workspace-scoped people reference image", async () => {
    const workspaces = {
      resolve: vi.fn().mockResolvedValue({
        workspaceId: "0198f3a2-82dd-7000-8000-000000000010",
        creatorProfileId: "0198f3a2-82dd-7000-8000-000000000002",
      }),
    } as unknown as WorkspaceContextService;
    const image = {
      id: "0198f3a2-82dd-7000-8000-000000000005",
      fileName: "portrait.png",
      mimeType: "image/png" as const,
      byteSize: 2_048,
      gcsUri: "gs://private/workspaces/workspace/sources/portrait.png",
      createdAt: new Date("2026-08-02T10:00:00.000Z"),
    };
    const repository: CreatorDnaRepository = {
      getCurrent: vi.fn().mockResolvedValue({
        id: "0198f3a2-82dd-7000-8000-000000000003",
        version: 2,
        summary: "Nocturnal electronic stories grounded in tactile details.",
        confirmed: true,
        traits: [],
      }),
      confirmCurrent: vi.fn(),
      listVersions: vi.fn(),
      getPeopleReferenceImage: vi.fn().mockResolvedValue(null),
      setPeopleReferenceImage: vi.fn().mockResolvedValue(image),
      clearPeopleReferenceImage: vi.fn().mockResolvedValue(true),
    };
    const service = new CreatorDnaService(workspaces, repository);

    await expect(
      service.setPeopleReferenceImage(principal, image.id),
    ).resolves.toMatchObject({
      peopleReferenceImage: {
        id: image.id,
        mimeType: "image/png",
      },
    });
    await expect(
      service.clearPeopleReferenceImage(principal),
    ).resolves.toMatchObject({
      peopleReferenceImage: null,
    });
    expect(repository.setPeopleReferenceImage).toHaveBeenCalledWith(
      "0198f3a2-82dd-7000-8000-000000000010",
      image.id,
    );
  });
});
