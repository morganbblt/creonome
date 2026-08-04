import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  MemoryCandidatesResponseSchema,
  MemoryReviewResultSchema,
  type MemoryCandidatesResponse,
  type MemoryReviewResult,
} from "@creonome/contracts";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import {
  CREATOR_DNA_REPOSITORY,
  type CreatorDnaRepository,
} from "../creator-dna/creator-dna.repository.js";
import { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import {
  MEMORY_CANDIDATE_REPOSITORY,
  type MemoryCandidateRecord,
  type MemoryCandidateRepository,
} from "./memory-candidate.repository.js";
import { MEMORY_PROVIDER, type MemoryProvider } from "./memory-provider.js";

/**
 * How many *approved* explicit-feedback signals (always_do / never_use, see
 * opportunities.service.ts's feedback()) sharing the same action must exist
 * before the pattern is promoted to a layer="learned" Creator DNA trait.
 * "Repeated" (bible §11.1) is read as "confirmed more than once" -- 2 is
 * the smallest count that constitutes a repeat, and every approval at or
 * above the threshold re-runs the promotion so the trait's evidence stays
 * current (see upsertLearnedTrait's idempotent-by-category+label upsert).
 */
const LEARNED_TRAIT_PROMOTION_THRESHOLD = 2;

/**
 * Confidence formula for a promoted learned trait: starts at a moderate
 * 0.6 (matching the codebase's existing DEFAULT_TRAIT_CONFIDENCE-style
 * baselines for inferred, non-declared signals -- see
 * opportunity-scoring.ts), then grows 0.05 per approval beyond the
 * threshold, capped at 0.95 -- intentionally always below the 1.0 reserved
 * for explicitly declared traits, since a learned pattern is inferred, not
 * stated.
 */
const LEARNED_TRAIT_BASE_CONFIDENCE = 0.6;
const LEARNED_TRAIT_CONFIDENCE_STEP = 0.05;
const LEARNED_TRAIT_MAX_CONFIDENCE = 0.95;

/** Maps an explicit feedback action to the learned trait it accumulates into. */
const LEARNED_TRAIT_BY_ACTION: Record<
  string,
  { category: string; label: string } | undefined
> = {
  always_do: { category: "preference", label: "Learned preference pattern" },
  never_use: { category: "avoidance", label: "Learned avoidance pattern" },
};

@Injectable()
export class MemoryCandidatesService {
  private readonly logger = new Logger(MemoryCandidatesService.name);

  constructor(
    @Inject(WorkspaceContextService)
    private readonly workspaces: WorkspaceContextService,
    @Inject(MEMORY_CANDIDATE_REPOSITORY)
    private readonly repository: MemoryCandidateRepository,
    @Inject(MEMORY_PROVIDER)
    private readonly memory: MemoryProvider,
    @Inject(CREATOR_DNA_REPOSITORY)
    private readonly creatorDna: CreatorDnaRepository,
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

    // Best-effort: a promotion failure must never fail the review the
    // creator just performed, or leave it in an inconsistent state.
    await this.promoteLearnedTraitIfRepeated(candidate).catch((error) => {
      this.logger.warn(
        `Learned trait promotion failed for memory candidate ${candidateId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });

    return MemoryReviewResultSchema.parse({
      id: candidateId,
      status: "approved",
      providerStatus: providerResult.status,
      providerEventId: providerResult.eventId,
      reviewedAt: reviewed.reviewedAt.toISOString(),
    });
  }

  /**
   * Promotes a repeated, approved explicit-feedback signal (always_do /
   * never_use, see opportunities.service.ts's feedback()) to a
   * layer="learned" Creator DNA trait once it has been confirmed at least
   * {@link LEARNED_TRAIT_PROMOTION_THRESHOLD} times. Reuses the existing
   * feedback -> memory candidate -> review signal path (recordFeedback in
   * neon-opportunities.repository.ts) rather than a second parallel
   * mechanism -- this only reads what that path already wrote.
   */
  private async promoteLearnedTraitIfRepeated(
    candidate: MemoryCandidateRecord,
  ): Promise<void> {
    if (candidate.evidence.source !== "explicit_feedback") return;
    const action = candidate.evidence.action;
    if (typeof action !== "string") return;
    const promotion = LEARNED_TRAIT_BY_ACTION[action];
    if (!promotion) return;

    const approvedCount = await this.repository.countApprovedFeedbackByAction(
      candidate.creatorProfileId,
      action,
    );
    if (approvedCount < LEARNED_TRAIT_PROMOTION_THRESHOLD) return;

    const confidence = Math.min(
      LEARNED_TRAIT_MAX_CONFIDENCE,
      LEARNED_TRAIT_BASE_CONFIDENCE +
        LEARNED_TRAIT_CONFIDENCE_STEP *
          (approvedCount - LEARNED_TRAIT_PROMOTION_THRESHOLD),
    );

    await this.creatorDna.upsertLearnedTrait(candidate.creatorProfileId, {
      category: promotion.category,
      label: promotion.label,
      value: `Confirmed ${approvedCount} times via creator feedback. Most recent: "${candidate.content}"`,
      confidence: confidence.toFixed(3),
      evidence: {
        source: "learned_pattern",
        action,
        approvedCount,
        promotedFromMemoryCandidateId: candidate.id,
      },
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
