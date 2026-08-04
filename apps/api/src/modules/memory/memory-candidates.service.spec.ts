import { describe, expect, it, vi } from "vitest";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import type { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import type { MemoryCandidateRepository } from "./memory-candidate.repository.js";
import type { MemoryProvider } from "./memory-provider.js";
import { MemoryCandidatesService } from "./memory-candidates.service.js";

const principal: AuthPrincipal = {
  subject: "0198f3a2-82dd-7000-8000-000000000001",
};
const candidateId = "0198f3a2-82dd-7000-8000-000000000002";

function setup() {
  const workspaces = {
    resolve: vi.fn().mockResolvedValue({
      userId: "user-1",
      workspaceId: "workspace-1",
      creatorProfileId: "creator-1",
    }),
  } as unknown as WorkspaceContextService;
  const repository: MemoryCandidateRepository = {
    list: vi.fn().mockResolvedValue([
      {
        id: candidateId,
        workspaceId: "workspace-1",
        creatorProfileId: "creator-1",
        provider: "mem0",
        kind: "creator",
        scope: "creator",
        confidence: 0.6,
        content: "Never use fake urgency.",
        evidence: {
          source: "opportunity_chat",
          projectId: "0198f3a2-82dd-7000-8000-000000000020",
        },
        status: "pending",
        reviewedAt: null,
        createdAt: new Date("2026-08-02T06:00:00.000Z"),
      },
      {
        id: "0198f3a2-82dd-7000-8000-000000000004",
        workspaceId: "workspace-1",
        creatorProfileId: "creator-1",
        provider: "mem0",
        kind: "project",
        scope: "project",
        confidence: 0.6,
        content: "Use a louder opening.",
        evidence: { source: "opportunity_chat" },
        status: "rejected",
        reviewedAt: new Date("2026-08-01T06:10:00.000Z"),
        createdAt: new Date("2026-08-01T06:00:00.000Z"),
      },
      {
        id: "0198f3a2-82dd-7000-8000-000000000005",
        workspaceId: "workspace-1",
        creatorProfileId: "creator-1",
        provider: "mem0",
        kind: "idea",
        scope: "idea",
        confidence: 0.6,
        content: "Lean into the reveal beat for this one idea.",
        evidence: { source: "opportunity_chat" },
        status: "pending",
        reviewedAt: null,
        createdAt: new Date("2026-08-03T06:00:00.000Z"),
      },
    ]),
    findPending: vi.fn().mockResolvedValue({
      id: candidateId,
      workspaceId: "workspace-1",
      creatorProfileId: "creator-1",
      kind: "creative_boundary",
      content: "Never use fake urgency.",
    }),
    markReviewed: vi.fn().mockResolvedValue({
      reviewedAt: new Date("2026-08-02T06:10:00.000Z"),
    }),
  };
  const provider: MemoryProvider = {
    search: vi.fn(),
    remember: vi.fn().mockResolvedValue({
      status: "pending",
      eventId: "0198f3a2-82dd-7000-8000-000000000003",
    }),
    forget: vi.fn(),
  };
  return {
    service: new MemoryCandidatesService(workspaces, repository, provider),
    repository,
    provider,
  };
}

describe("MemoryCandidatesService", () => {
  it("lists workspace candidates as a pending queue and review history", async () => {
    const { service } = setup();

    await expect(service.list(principal)).resolves.toMatchObject({
      pendingCount: 2,
      pending: [
        {
          id: candidateId,
          scope: "creator",
          confidence: 0.6,
          source: "opportunity_chat",
          projectId: "0198f3a2-82dd-7000-8000-000000000020",
        },
        {
          id: "0198f3a2-82dd-7000-8000-000000000005",
          scope: "idea",
          confidence: 0.6,
        },
      ],
      history: [
        {
          status: "rejected",
          scope: "project",
          reviewedAt: "2026-08-01T06:10:00.000Z",
        },
      ],
    });
  });

  it("writes to Mem0 only after explicit approval", async () => {
    const { service, repository, provider } = setup();

    await expect(
      service.approve(principal, candidateId),
    ).resolves.toMatchObject({
      id: candidateId,
      status: "approved",
      providerStatus: "pending",
      reviewedAt: "2026-08-02T06:10:00.000Z",
    });
    expect(provider.remember).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Never use fake urgency." }),
    );
    expect(repository.markReviewed).toHaveBeenCalledWith(
      candidateId,
      "workspace-1",
      "user-1",
      "approved",
    );
  });

  it("rejects locally without sending creative data to Mem0", async () => {
    const { service, provider } = setup();

    await expect(service.reject(principal, candidateId)).resolves.toMatchObject(
      {
        id: candidateId,
        status: "rejected",
        providerStatus: null,
        reviewedAt: "2026-08-02T06:10:00.000Z",
      },
    );
    expect(provider.remember).not.toHaveBeenCalled();
  });
});
