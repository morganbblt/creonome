export type MemoryCandidateScope = "idea" | "project" | "creator";

export type MemoryCandidateRecord = {
  id: string;
  workspaceId: string;
  creatorProfileId: string;
  kind: string;
  content: string;
  evidence: Record<string, unknown>;
};

export type MemoryReviewStatus = "approved" | "rejected";
export type MemoryCandidateStatus = "pending" | MemoryReviewStatus;

export type MemoryCandidateListRecord = MemoryCandidateRecord & {
  provider: string;
  scope: MemoryCandidateScope;
  confidence: number;
  evidence: Record<string, unknown>;
  status: MemoryCandidateStatus;
  reviewedAt: Date | null;
  createdAt: Date;
};

export type MemoryReviewedRecord = { reviewedAt: Date };

export interface MemoryCandidateRepository {
  list(
    workspaceId: string,
    creatorProfileId: string,
  ): Promise<MemoryCandidateListRecord[]>;
  findPending(
    candidateId: string,
    workspaceId: string,
  ): Promise<MemoryCandidateRecord | null>;
  markReviewed(
    candidateId: string,
    workspaceId: string,
    reviewedByUserId: string,
    status: MemoryReviewStatus,
  ): Promise<MemoryReviewedRecord | null>;
  /**
   * Counts *approved* memory candidates that came from an explicit
   * opportunity-feedback signal (evidence.source === "explicit_feedback",
   * see opportunities.service.ts's feedback()) sharing the same feedback
   * `action` ("always_do" / "never_use") for this creator. Used to detect
   * a repeated, confirmed pattern worth promoting to a layer="learned"
   * Creator DNA trait -- see MemoryCandidatesService.approve.
   */
  countApprovedFeedbackByAction(
    creatorProfileId: string,
    action: string,
  ): Promise<number>;
}

export const MEMORY_CANDIDATE_REPOSITORY = Symbol(
  "MEMORY_CANDIDATE_REPOSITORY",
);
