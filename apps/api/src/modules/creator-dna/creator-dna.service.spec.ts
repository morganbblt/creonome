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
      updateTrait: vi.fn(),
      confirmCurrent: vi.fn(),
      listVersions: vi.fn(),
      getVersion: vi.fn(),
      restoreVersion: vi.fn(),
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
      updateTrait: vi.fn(),
      confirmCurrent: vi.fn(),
      listVersions: vi.fn(),
      getVersion: vi.fn(),
      restoreVersion: vi.fn(),
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

  it("persists a corrected trait as a new DNA version", async () => {
    const workspaces = {
      resolve: vi.fn().mockResolvedValue({
        userId: "0198f3a2-82dd-7000-8000-000000000011",
        workspaceId: "0198f3a2-82dd-7000-8000-000000000010",
        creatorProfileId: "0198f3a2-82dd-7000-8000-000000000002",
      }),
    } as unknown as WorkspaceContextService;
    const updated = {
      id: "0198f3a2-82dd-7000-8000-000000000003",
      version: 3,
      summary: "Nocturnal electronic stories grounded in tactile details.",
      confirmed: true,
      traits: [
        {
          id: "0198f3a2-82dd-7000-8000-000000000004",
          category: "voice",
          label: "Tone",
          value: "precise, intimate and understated",
          confidence: "0.950",
          evidence: { source: "creator_edit" },
        },
      ],
    };
    const repository: CreatorDnaRepository = {
      getCurrent: vi.fn(),
      updateTrait: vi.fn().mockResolvedValue(updated),
      confirmCurrent: vi.fn(),
      listVersions: vi.fn(),
      getVersion: vi.fn(),
      restoreVersion: vi.fn(),
      getPeopleReferenceImage: vi.fn().mockResolvedValue(null),
      setPeopleReferenceImage: vi.fn(),
      clearPeopleReferenceImage: vi.fn(),
    };
    const service = new CreatorDnaService(workspaces, repository);

    await expect(
      service.updateTrait(
        principal,
        "0198f3a2-82dd-7000-8000-000000000004",
        "precise, intimate and understated",
      ),
    ).resolves.toMatchObject({
      version: 3,
      traits: [
        expect.objectContaining({ value: "precise, intimate and understated" }),
      ],
    });
    expect(repository.updateTrait).toHaveBeenCalledWith(
      "0198f3a2-82dd-7000-8000-000000000002",
      "0198f3a2-82dd-7000-8000-000000000011",
      "0198f3a2-82dd-7000-8000-000000000004",
      "precise, intimate and understated",
    );
  });

  it("restores an earlier version by delegating to the repository", async () => {
    const workspaces = {
      resolve: vi.fn().mockResolvedValue({
        userId: "0198f3a2-82dd-7000-8000-000000000011",
        workspaceId: "0198f3a2-82dd-7000-8000-000000000010",
        creatorProfileId: "0198f3a2-82dd-7000-8000-000000000002",
      }),
    } as unknown as WorkspaceContextService;
    const restored = {
      id: "0198f3a2-82dd-7000-8000-000000000006",
      version: 6,
      summary: "Older summary",
      confirmed: true,
      traits: [
        {
          id: "0198f3a2-82dd-7000-8000-000000000007",
          category: "voice",
          label: "Tone",
          value: "warm and playful",
          confidence: "0.800",
          evidence: { source: "restore", restoredFromVersion: 2 },
        },
      ],
    };
    const repository: CreatorDnaRepository = {
      getCurrent: vi.fn(),
      updateTrait: vi.fn(),
      confirmCurrent: vi.fn(),
      listVersions: vi.fn(),
      getVersion: vi.fn(),
      restoreVersion: vi.fn().mockResolvedValue(restored),
      getPeopleReferenceImage: vi.fn().mockResolvedValue(null),
      setPeopleReferenceImage: vi.fn(),
      clearPeopleReferenceImage: vi.fn(),
    };
    const service = new CreatorDnaService(workspaces, repository);

    await expect(service.restoreVersion(principal, 2)).resolves.toMatchObject({
      version: 6,
      traits: [expect.objectContaining({ value: "warm and playful" })],
    });
    expect(repository.restoreVersion).toHaveBeenCalledWith(
      "0198f3a2-82dd-7000-8000-000000000002",
      "0198f3a2-82dd-7000-8000-000000000011",
      2,
    );
  });

  it("throws when restoring a version that does not exist", async () => {
    const workspaces = {
      resolve: vi.fn().mockResolvedValue({
        userId: "0198f3a2-82dd-7000-8000-000000000011",
        workspaceId: "0198f3a2-82dd-7000-8000-000000000010",
        creatorProfileId: "0198f3a2-82dd-7000-8000-000000000002",
      }),
    } as unknown as WorkspaceContextService;
    const repository: CreatorDnaRepository = {
      getCurrent: vi.fn(),
      updateTrait: vi.fn(),
      confirmCurrent: vi.fn(),
      listVersions: vi.fn(),
      getVersion: vi.fn(),
      restoreVersion: vi.fn().mockResolvedValue(null),
      getPeopleReferenceImage: vi.fn().mockResolvedValue(null),
      setPeopleReferenceImage: vi.fn(),
      clearPeopleReferenceImage: vi.fn(),
    };
    const service = new CreatorDnaService(workspaces, repository);

    await expect(service.restoreVersion(principal, 999)).rejects.toThrow(
      "Creator DNA version was not found",
    );
  });

  it("diffs two versions: additions, removals and value changes", async () => {
    const workspaces = {
      resolve: vi.fn().mockResolvedValue({
        creatorProfileId: "0198f3a2-82dd-7000-8000-000000000002",
      }),
    } as unknown as WorkspaceContextService;
    const versionA = {
      id: "version-a",
      version: 1,
      summary: "First summary",
      confirmed: true,
      traits: [
        {
          id: "trait-tone",
          category: "voice",
          label: "Tone",
          value: "precise and intimate",
          confidence: "0.950",
          evidence: {},
        },
        {
          id: "trait-pacing",
          category: "voice",
          label: "Pacing",
          value: "brisk",
          confidence: "0.700",
          evidence: {},
        },
      ],
    };
    const versionB = {
      id: "version-b",
      version: 3,
      summary: "Third summary",
      confirmed: true,
      traits: [
        {
          id: "trait-tone-2",
          category: "voice",
          label: "Tone",
          value: "warm and playful",
          confidence: "0.800",
          evidence: {},
        },
        {
          id: "trait-topic",
          category: "content",
          label: "Signature topic",
          value: "urban gardening",
          confidence: "0.600",
          evidence: {},
        },
      ],
    };
    const repository: CreatorDnaRepository = {
      getCurrent: vi.fn(),
      updateTrait: vi.fn(),
      confirmCurrent: vi.fn(),
      listVersions: vi.fn(),
      getVersion: vi.fn().mockImplementation((_profileId, version) => {
        if (version === 1) return Promise.resolve(versionA);
        if (version === 3) return Promise.resolve(versionB);
        return Promise.resolve(null);
      }),
      restoreVersion: vi.fn(),
      getPeopleReferenceImage: vi.fn(),
      setPeopleReferenceImage: vi.fn(),
      clearPeopleReferenceImage: vi.fn(),
    };
    const service = new CreatorDnaService(workspaces, repository);

    await expect(service.compareVersions(principal, 1, 3)).resolves.toEqual({
      a: { version: 1, summary: "First summary" },
      b: { version: 3, summary: "Third summary" },
      traits: [
        {
          category: "voice",
          label: "Tone",
          status: "changed",
          fromValue: "precise and intimate",
          toValue: "warm and playful",
        },
        {
          category: "voice",
          label: "Pacing",
          status: "removed",
          fromValue: "brisk",
          toValue: null,
        },
        {
          category: "content",
          label: "Signature topic",
          status: "added",
          fromValue: null,
          toValue: "urban gardening",
        },
      ],
    });
  });

  it("throws when comparing a version that does not exist", async () => {
    const workspaces = {
      resolve: vi.fn().mockResolvedValue({
        creatorProfileId: "0198f3a2-82dd-7000-8000-000000000002",
      }),
    } as unknown as WorkspaceContextService;
    const repository: CreatorDnaRepository = {
      getCurrent: vi.fn(),
      updateTrait: vi.fn(),
      confirmCurrent: vi.fn(),
      listVersions: vi.fn(),
      getVersion: vi.fn().mockResolvedValue(null),
      restoreVersion: vi.fn(),
      getPeopleReferenceImage: vi.fn(),
      setPeopleReferenceImage: vi.fn(),
      clearPeopleReferenceImage: vi.fn(),
    };
    const service = new CreatorDnaService(workspaces, repository);

    await expect(service.compareVersions(principal, 1, 42)).rejects.toThrow(
      "Creator DNA version was not found",
    );
  });
});
