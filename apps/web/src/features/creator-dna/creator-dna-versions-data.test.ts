import type { CreatorDnaVersionsResponse } from "@creonome/contracts";
import { describe, expect, it, vi } from "vitest";
import { loadCreatorDnaVersions } from "./creator-dna-versions-data";

const versions: CreatorDnaVersionsResponse = {
  versions: [
    {
      id: "0198f3a2-82dd-7000-8000-000000000001",
      version: 2,
      summary: "Restrained nocturnal electronic storytelling.",
      confirmed: true,
      source: "creator_edit",
      restoredFromVersion: null,
      createdAt: "2026-08-02T10:00:00.000Z",
    },
    {
      id: "0198f3a2-82dd-7000-8000-000000000002",
      version: 1,
      summary: "Restrained nocturnal electronic storytelling.",
      confirmed: true,
      source: "onboarding",
      restoredFromVersion: null,
      createdAt: "2026-08-01T10:00:00.000Z",
    },
  ],
};

describe("creator DNA versions data", () => {
  it("loads the version history", async () => {
    await expect(
      loadCreatorDnaVersions({
        getCreatorDnaVersions: vi.fn().mockResolvedValue(versions),
      }),
    ).resolves.toEqual(versions);
  });

  it("returns null instead of a stale history when unavailable", async () => {
    await expect(
      loadCreatorDnaVersions({
        getCreatorDnaVersions: vi.fn().mockRejectedValue(new Error("offline")),
      }),
    ).resolves.toBeNull();
  });
});
