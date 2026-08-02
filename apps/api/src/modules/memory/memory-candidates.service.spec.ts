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
    findPending: vi.fn().mockResolvedValue({
      id: candidateId,
      workspaceId: "workspace-1",
      creatorProfileId: "creator-1",
      kind: "creative_boundary",
      content: "Never use fake urgency.",
    }),
    markReviewed: vi.fn().mockResolvedValue(true),
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
  it("writes to Mem0 only after explicit approval", async () => {
    const { service, repository, provider } = setup();

    await expect(service.approve(principal, candidateId)).resolves.toMatchObject({
      id: candidateId,
      status: "approved",
      providerStatus: "pending",
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

    await expect(service.reject(principal, candidateId)).resolves.toEqual({
      id: candidateId,
      status: "rejected",
    });
    expect(provider.remember).not.toHaveBeenCalled();
  });
});
