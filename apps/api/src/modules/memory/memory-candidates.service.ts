import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import {
  MEMORY_CANDIDATE_REPOSITORY,
  type MemoryCandidateRepository,
} from "./memory-candidate.repository.js";
import {
  MEMORY_PROVIDER,
  type MemoryProvider,
} from "./memory-provider.js";

@Injectable()
export class MemoryCandidatesService {
  constructor(
    @Inject(WorkspaceContextService)
    private readonly workspaces: WorkspaceContextService,
    @Inject(MEMORY_CANDIDATE_REPOSITORY)
    private readonly repository: MemoryCandidateRepository,
    @Inject(MEMORY_PROVIDER)
    private readonly memory: MemoryProvider,
  ) {}

  async approve(principal: AuthPrincipal, candidateId: string) {
    const context = await this.workspaces.resolve(principal);
    const candidate = await this.repository.findPending(
      candidateId,
      context.workspaceId,
    );
    if (!candidate) {
      throw new NotFoundException("Pending memory candidate was not found");
    }

    const providerResult = await this.memory.remember({
      content: candidate.content,
      kind: candidate.kind,
      workspaceId: candidate.workspaceId,
      creatorProfileId: candidate.creatorProfileId,
      candidateId: candidate.id,
    });
    const reviewed = await this.repository.markReviewed(
      candidateId,
      context.workspaceId,
      context.userId,
      "approved",
    );
    if (!reviewed) {
      throw new ConflictException("Memory candidate was already reviewed");
    }

    return {
      id: candidateId,
      status: "approved" as const,
      providerStatus: providerResult.status,
      providerEventId: providerResult.eventId,
    };
  }

  async reject(principal: AuthPrincipal, candidateId: string) {
    const context = await this.workspaces.resolve(principal);
    const candidate = await this.repository.findPending(
      candidateId,
      context.workspaceId,
    );
    if (!candidate) {
      throw new NotFoundException("Pending memory candidate was not found");
    }
    const reviewed = await this.repository.markReviewed(
      candidateId,
      context.workspaceId,
      context.userId,
      "rejected",
    );
    if (!reviewed) {
      throw new ConflictException("Memory candidate was already reviewed");
    }
    return { id: candidateId, status: "rejected" as const };
  }
}
