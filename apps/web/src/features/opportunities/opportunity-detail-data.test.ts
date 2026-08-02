import { describe, expect, it, vi } from "vitest";
import { loadOpportunityDetail } from "./opportunity-detail-data";

describe("loadOpportunityDetail", () => {
  it("does not turn a failed API lookup into a writable demo opportunity", async () => {
    const result = await loadOpportunityDetail(
      {
        getOpportunity: vi.fn().mockRejectedValue(new Error("not found")),
      },
      "7af6fdcc-8881-48c2-ae5d-3f45df1bd0a2",
    );

    expect(result).toBeNull();
  });
});
