import type { OpportunityBatch } from "@creonome/contracts";
import { describe, expect, it, vi } from "vitest";
import { demoOpportunities } from "./demo-opportunities";
import { loadTodayOpportunities } from "./today-data";

const batch: OpportunityBatch = {
  generatedAt: "2026-08-02T00:00:00.000Z",
  opportunities: demoOpportunities.map(
    ({
      badge: _badge,
      duration: _duration,
      hook: _hook,
      why: _why,
      reserve: _reserve,
      verdict: _verdict,
      effort: _effort,
      channel: _channel,
      ...opportunity
    }) => opportunity,
  ) as OpportunityBatch["opportunities"],
};

describe("loadTodayOpportunities", () => {
  it("uses the authenticated API batch and supplies presentation details", async () => {
    const getCurrentOpportunities = vi.fn().mockResolvedValue(batch);
    const result = await loadTodayOpportunities({ getCurrentOpportunities });

    expect(result.source).toBe("api");
    expect(result.opportunities).toHaveLength(3);
    expect(result.opportunities[0]?.badge).toBe("Natural fit");
  });

  it("shows the non-actionable MVP preview when the backend is unavailable", async () => {
    const result = await loadTodayOpportunities({
      getCurrentOpportunities: vi.fn().mockRejectedValue(new Error("offline")),
    });

    expect(result.source).toBe("demo");
    expect(result.opportunities).toEqual(demoOpportunities);
  });
});
