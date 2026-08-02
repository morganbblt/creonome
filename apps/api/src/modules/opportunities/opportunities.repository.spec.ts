import { getTableName } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { NeonOpportunitiesRepository } from "./neon-opportunities.repository.js";
import { currentOpportunityStatuses } from "./opportunities.repository.js";

describe("currentOpportunityStatuses", () => {
  it("keeps saved work in the canonical three-card batch", () => {
    expect(currentOpportunityStatuses).toEqual(["available", "saved"]);
  });
});

describe("NeonOpportunitiesRepository feedback", () => {
  it("stores strong feedback with an approval-gated memory candidate", async () => {
    const writes: Array<{ table: string; value: Record<string, unknown> }> = [];
    const fakeDatabase = {
      insert(table: Parameters<typeof getTableName>[0]) {
        return {
          values(value: Record<string, unknown>) {
            writes.push({ table: getTableName(table), value });
            return { kind: "insert" };
          },
        };
      },
      batch: vi.fn().mockResolvedValue([]),
    };
    const repository = new NeonOpportunitiesRepository(fakeDatabase as never);
    const recordFeedback = (repository as unknown as Record<string, unknown>)
      .recordFeedback;

    expect(recordFeedback).toBeTypeOf("function");
    if (typeof recordFeedback !== "function") return;

    await expect(
      recordFeedback.call(repository, {
        workspaceId: "0198f3a2-82dd-7000-8000-000000000011",
        creatorProfileId: "0198f3a2-82dd-7000-8000-000000000012",
        userId: "0198f3a2-82dd-7000-8000-000000000010",
        opportunityId: "0198f3a2-82dd-7000-8000-000000000002",
        projectId: null,
        action: "never_use",
        rating: 1,
        comment: null,
        memoryContent: "Avoid this direction.",
      }),
    ).resolves.toMatchObject({
      action: "never_use",
      memoryCandidate: { status: "pending", scope: "creator" },
    });
    expect(writes.map(({ table }) => table)).toEqual([
      "feedback_events",
      "memory_candidates",
    ]);
    expect(writes[1]?.value).toMatchObject({
      kind: "creator",
      status: "pending",
    });
  });
});
