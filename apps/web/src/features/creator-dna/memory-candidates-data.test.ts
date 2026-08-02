import type { MemoryCandidatesResponse } from "@creonome/contracts";
import { describe, expect, it, vi } from "vitest";
import { loadMemoryCandidates } from "./memory-candidates-data";

const memories: MemoryCandidatesResponse = {
  pendingCount: 0,
  pending: [],
  history: [],
};

describe("memory candidates data", () => {
  it("loads the authenticated memory review queue", async () => {
    await expect(
      loadMemoryCandidates({
        getMemoryCandidates: vi.fn().mockResolvedValue(memories),
      }),
    ).resolves.toEqual(memories);
  });

  it("keeps Creator DNA usable when memory history is unavailable", async () => {
    await expect(
      loadMemoryCandidates({
        getMemoryCandidates: vi.fn().mockRejectedValue(new Error("offline")),
      }),
    ).resolves.toBeNull();
  });
});
