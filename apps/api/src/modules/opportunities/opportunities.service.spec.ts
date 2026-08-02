import { NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import type { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import type {
  OpportunityRecord,
  OpportunitiesRepository,
} from "./opportunities.repository.js";
import { OpportunitiesService } from "./opportunities.service.js";

const principal: AuthPrincipal = {
  subject: "0198f3a2-82dd-7000-8000-000000000001",
};

const records: OpportunityRecord[] = [1, 2, 3].map((position) => ({
  id: `0198f3a2-82dd-7000-8000-00000000000${position + 1}`,
  position,
  title: `Concept ${position}`,
  pitch: "A sufficiently detailed creative direction for this weekly route.",
  scoreOverall: 90 - position,
  scoreConfidence: position === 3 ? "medium" : "high",
  scoreMomentum: 87 - position,
  scoreDnaFit: 94 - position,
  scoreNovelty: 82 + position,
  scoreFeasibility: 91 - position,
  rationale:
    "The creator's strongest formats support this production path with a restrained reveal.",
  effort: position === 2 ? "medium" : "low",
  platform: "tiktok",
  estimatedDurationSeconds: 30 + position,
  projectId: position === 1 ? "0198f3a2-82dd-7000-8000-000000000020" : null,
  projectCurrentLevel: position === 1 ? "storyboard" : null,
  availableAt: new Date("2026-08-02T09:00:00.000Z"),
  trendSignal:
    position === 1
      ? {
          title: "Quiet process, loud reveal",
          lifecycle: "emerging",
          momentumScore: 88,
          observedAt: new Date("2026-08-02T08:55:00.000Z"),
          evidenceCount: 8,
          sampleData: false,
        }
      : null,
}));

function setupService(rows: OpportunityRecord[]) {
  const workspaces = {
    resolve: vi.fn().mockResolvedValue({
      userId: "0198f3a2-82dd-7000-8000-000000000010",
      workspaceId: "0198f3a2-82dd-7000-8000-000000000011",
      creatorProfileId: "0198f3a2-82dd-7000-8000-000000000012",
    }),
  } as unknown as WorkspaceContextService;
  const repository = {
    listTrendSignals: vi.fn(),
    listCurrent: vi.fn().mockResolvedValue(rows),
    findById: vi.fn().mockResolvedValue(rows[0] ?? null),
    saveAsProject: vi.fn().mockResolvedValue({
      id: "0198f3a2-82dd-7000-8000-000000000020",
      opportunityId: rows[0]?.id ?? null,
      title: rows[0]?.title ?? "Saved concept",
      status: "active",
      currentLevel: "idea",
      currentVersion: 1,
      updatedAt: new Date("2026-08-02T10:00:00.000Z"),
    }),
    findByIdempotency: vi.fn(),
    createBatch: vi.fn(),
    createRevision: vi.fn(),
    findScriptUpgradeByIdempotency: vi.fn(),
    findExistingScriptUpgrade: vi.fn(),
    createScriptUpgrade: vi.fn(),
    recordFeedback: vi.fn().mockResolvedValue({
      id: "0198f3a2-82dd-7000-8000-000000000024",
      opportunityId: rows[0]?.id,
      action: "never_use",
      memoryCandidate: {
        id: "0198f3a2-82dd-7000-8000-000000000025",
        status: "pending",
        scope: "creator",
        content: "Avoid creative directions similar to “Concept 1”.",
      },
      createdAt: new Date("2026-08-02T12:05:00.000Z"),
    }),
  } as unknown as OpportunitiesRepository & {
    recordFeedback: ReturnType<typeof vi.fn>;
  };
  return {
    service: new OpportunitiesService(workspaces, repository),
    repository,
  };
}

function serviceWith(rows: OpportunityRecord[]) {
  return setupService(rows).service;
}

describe("OpportunitiesService", () => {
  it("returns exactly three differentiated creative strategies", async () => {
    await expect(serviceWith(records).getCurrent(principal)).resolves.toEqual({
      generatedAt: "2026-08-02T09:00:00.000Z",
      opportunities: [
        expect.objectContaining({ strategy: "signature", nextLevel: "script" }),
        expect.objectContaining({ strategy: "stretch", nextLevel: "script" }),
        expect.objectContaining({
          strategy: "repeatable",
          nextLevel: "script",
        }),
      ],
    });
  });

  it("fails closed when the canonical batch is incomplete", async () => {
    await expect(
      serviceWith(records.slice(0, 2)).getCurrent(principal),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("returns a workspace-scoped opportunity detail without exposing score internals", async () => {
    await expect(
      serviceWith(records).getById(principal, records[0]!.id),
    ).resolves.toMatchObject({
      id: records[0]!.id,
      strategy: "signature",
      currentLevel: "storyboard",
      projectId: records[0]!.projectId,
      nextLevel: "script",
      rationale: records[0]!.rationale,
      effort: "low",
      platform: "tiktok",
      estimatedDurationSeconds: 31,
      trendSignal: {
        status: "ok",
        title: "Quiet process, loud reveal",
        lifecycle: "emerging",
        momentumScore: 88,
        evidenceCount: 8,
        source: "trend_radar",
      },
      evidence: expect.arrayContaining([expect.stringMatching(/DNA fit/i)]),
    });
  });

  it("returns the persisted hook from the latest project version after a reload", async () => {
    const revised = {
      ...records[1]!,
      hook: "Make the opening quieter. Then reveal the track.",
    };

    await expect(
      serviceWith([revised]).getById(principal, revised.id),
    ).resolves.toMatchObject({
      hook: "Make the opening quieter. Then reveal the track.",
    });
  });

  it("saves an opportunity as an idempotent project", async () => {
    await expect(
      serviceWith(records).save(principal, records[0]!.id),
    ).resolves.toMatchObject({
      opportunityId: records[0]!.id,
      currentVersion: 1,
    });
  });

  it("records explicit feedback and proposes strong preferences for review", async () => {
    const { service, repository } = setupService(records);
    const feedback = (service as unknown as Record<string, unknown>).feedback;

    expect(feedback).toBeTypeOf("function");
    if (typeof feedback !== "function") return;

    await expect(
      feedback.call(service, principal, records[0]!.id, {
        action: "never_use",
      }),
    ).resolves.toMatchObject({
      action: "never_use",
      memoryCandidate: { scope: "creator", status: "pending" },
    });
    expect(repository.recordFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "0198f3a2-82dd-7000-8000-000000000011",
        userId: "0198f3a2-82dd-7000-8000-000000000010",
        opportunityId: records[0]!.id,
        action: "never_use",
        rating: 1,
        memoryContent: expect.stringMatching(/avoid.*Concept 1/i),
      }),
    );
  });

  it("does not reveal an opportunity outside the workspace", async () => {
    const service = serviceWith([]);
    await expect(
      service.getById(principal, records[0]!.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
