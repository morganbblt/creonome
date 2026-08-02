import type { CreatorDna } from "@creonome/contracts";
import { describe, expect, it, vi } from "vitest";
import { loadCreatorDna } from "./creator-dna-data";

const dna: CreatorDna = {
  version: 1,
  summary: "Restrained nocturnal electronic storytelling.",
  confirmed: true,
  traits: [],
};

describe("creator DNA data", () => {
  it("loads the current evidence-backed DNA", async () => {
    await expect(
      loadCreatorDna({ getCreatorDna: vi.fn().mockResolvedValue(dna) }),
    ).resolves.toEqual(dna);
  });

  it("returns null instead of static dimensions when unavailable", async () => {
    await expect(
      loadCreatorDna({
        getCreatorDna: vi.fn().mockRejectedValue(new Error("offline")),
      }),
    ).resolves.toBeNull();
  });
});
