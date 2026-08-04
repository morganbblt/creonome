export type MemoryCandidateScope = "idea" | "project" | "creator";

export type MemoryCandidateRecord = {
  id: string;
  workspaceId: string;
  creatorProfileId: string;
  kind: string;
  content: string;
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
}

export const MEMORY_CANDIDATE_REPOSITORY = Symbol(
  "MEMORY_CANDIDATE_REPOSITORY",
);
