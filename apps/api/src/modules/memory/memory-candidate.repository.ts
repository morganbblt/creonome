export type MemoryCandidateRecord = {
  id: string;
  workspaceId: string;
  creatorProfileId: string;
  kind: string;
  content: string;
};

export type MemoryReviewStatus = "approved" | "rejected";

export interface MemoryCandidateRepository {
  findPending(
    candidateId: string,
    workspaceId: string,
  ): Promise<MemoryCandidateRecord | null>;
  markReviewed(
    candidateId: string,
    workspaceId: string,
    reviewedByUserId: string,
    status: MemoryReviewStatus,
  ): Promise<boolean>;
}

export const MEMORY_CANDIDATE_REPOSITORY = Symbol(
  "MEMORY_CANDIDATE_REPOSITORY",
);
