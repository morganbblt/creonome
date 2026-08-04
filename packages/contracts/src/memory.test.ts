import { describe, expect, it } from "vitest";
import {
  MemoryCandidatesResponseSchema,
  MemoryReviewResultSchema,
} from "./memory.js";

describe("memory contracts", () => {
  it("separates pending candidates from reviewed history", () => {
    const response = MemoryCandidatesResponseSchema.parse({
      pendingCount: 1,
      pending: [
        {
          id: "0198f3a2-82dd-7000-8000-000000000061",
          status: "pending",
          kind: "creator",
          scope: "creator",
          content: "Prefer implicit calls to action.",
          source: "opportunity_chat",
          provider: "mem0",
          confidence: 0.6,
          projectId: "0198f3a2-82dd-7000-8000-000000000020",
          opportunityId: null,
          createdAt: "2026-08-02T06:00:00.000Z",
          reviewedAt: null,
        },
      ],
      history: [
        {
          id: "0198f3a2-82dd-7000-8000-000000000062",
          status: "rejected",
          kind: "project",
          scope: "project",
          content: "Always start with a spoken introduction.",
          source: "opportunity_chat",
          provider: "mem0",
          confidence: 0.6,
          projectId: "0198f3a2-82dd-7000-8000-000000000020",
          opportunityId: null,
          createdAt: "2026-08-01T06:00:00.000Z",
          reviewedAt: "2026-08-01T06:10:00.000Z",
        },
      ],
    });

    expect(response.pending).toHaveLength(1);
    expect(response.history[0]?.status).toBe("rejected");
  });

  it("requires review results to carry their canonical review time", () => {
    expect(
      MemoryReviewResultSchema.parse({
        id: "0198f3a2-82dd-7000-8000-000000000061",
        status: "approved",
        providerStatus: "pending",
        providerEventId: "event-1",
        reviewedAt: "2026-08-02T06:10:00.000Z",
      }),
    ).toMatchObject({ status: "approved", providerStatus: "pending" });
  });
});
