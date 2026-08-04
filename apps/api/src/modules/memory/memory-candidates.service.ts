import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  MemoryCandidatesResponseSchema,
  MemoryReviewResultSchema,
  type MemoryCandidatesResponse,
  type MemoryReviewResult,
} from "@creonome/contracts";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import {
  MEMORY_CANDIDATE_REPOSITORY,
  type MemoryCandidateRepository,
} from "./memory-candidate.repository.js";
import { MEMORY_PROVIDER, type MemoryProvider } from "./memory-provider.js";

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

  async list(principal: AuthPrincipal): Promise<MemoryCandidatesResponse> {
    const context = await this.workspaces.resolve(principal);
    const records = await this.repository.list(
      context.workspaceId,
      context.creatorProfileId,
    );
    const candidates = records.map((record) => {
      const projectId =
        typeof record.evidence.projectId === "string"
          ? record.evidence.projectId
          : null;
      const opportunityId =
        typeof record.evidence.opportunityId === "string"
          ? record.evidence.opportunityId
          : null;
      return {
        id: record.id,
        status: record.status,
        kind: record.kind,
        scope: record.scope,
        confidence: record.confidence,
        content: record.content,
        source:
          typeof record.evidence.source === "string"
            ? record.evidence.source
            : record.provider,
        provider: record.provider,
        projectId,
        opportunityId,
        createdAt: record.createdAt.toISOString(),
        reviewedAt: record.reviewedAt?.toISOString() ?? null,
      };
    });

    return MemoryCandidatesResponseSchema.parse({
      pendingCount: candidates.filter(({ status }) => status === "pending")
        .length,
      pending: candidates.filter(({ status }) => status === "pending"),
      history: candidates.filter(({ status }) => status !== "pending"),
    });
  }

  async approve(
    principal: AuthPrincipal,
    candidateId: string,
  ): Promise<MemoryReviewResult> {
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

    return MemoryReviewResultSchema.parse({
      id: candidateId,
      status: "approved",
      providerStatus: providerResult.status,
      providerEventId: providerResult.eventId,
      reviewedAt: reviewed.reviewedAt.toISOString(),
    });
  }

  async reject(
    principal: AuthPrincipal,
    candidateId: string,
  ): Promise<MemoryReviewResult> {
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
    return MemoryReviewResultSchema.parse({
      id: candidateId,
      status: "rejected",
      providerStatus: null,
      providerEventId: null,
      reviewedAt: reviewed.reviewedAt.toISOString(),
    });
  }
}
