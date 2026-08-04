import { z } from "zod";

export const MemoryCandidateStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
]);

/**
 * The blast radius a memory candidate should be remembered at. This is the
 * canonical definition -- opportunity.ts re-exports it as
 * OpportunityMemoryScopeSchema rather than declaring its own copy, since the
 * two used to diverge (opportunity.ts had "idea" and this one didn't).
 */
export const MemoryCandidateScopeSchema = z.enum([
  "idea",
  "project",
  "creator",
]);

const MemoryCandidateBaseSchema = z.object({
  id: z.uuid(),
  kind: z.string().trim().min(1).max(80),
  scope: MemoryCandidateScopeSchema,
  content: z.string().trim().min(3).max(500),
  source: z.string().trim().min(1).max(80),
  provider: z.string().trim().min(1).max(80),
  /**
   * Heuristic 0..1 confidence that this candidate reflects a durable
   * creator preference. Lets the review queue eventually sort pending
   * candidates by how confident the source was; no UI consumes it yet.
   */
  confidence: z.number().min(0).max(1),
  projectId: z.uuid().nullable(),
  opportunityId: z.uuid().nullable(),
  createdAt: z.iso.datetime(),
});

export const PendingMemoryCandidateSchema = MemoryCandidateBaseSchema.extend({
  status: z.literal("pending"),
  reviewedAt: z.null(),
});

export const ReviewedMemoryCandidateSchema = MemoryCandidateBaseSchema.extend({
  status: z.enum(["approved", "rejected"]),
  reviewedAt: z.iso.datetime(),
});

export const MemoryCandidatesResponseSchema = z.object({
  pendingCount: z.number().int().nonnegative(),
  pending: z.array(PendingMemoryCandidateSchema),
  history: z.array(ReviewedMemoryCandidateSchema),
});

export const MemoryReviewResultSchema = z.object({
  id: z.uuid(),
  status: z.enum(["approved", "rejected"]),
  providerStatus: z.enum(["pending", "succeeded", "failed"]).nullable(),
  providerEventId: z.string().trim().min(1).nullable(),
  reviewedAt: z.iso.datetime(),
});

export type MemoryCandidateStatus = z.infer<typeof MemoryCandidateStatusSchema>;
export type MemoryCandidateScope = z.infer<typeof MemoryCandidateScopeSchema>;
export type PendingMemoryCandidate = z.infer<
  typeof PendingMemoryCandidateSchema
>;
export type ReviewedMemoryCandidate = z.infer<
  typeof ReviewedMemoryCandidateSchema
>;
export type MemoryCandidatesResponse = z.infer<
  typeof MemoryCandidatesResponseSchema
>;
export type MemoryReviewResult = z.infer<typeof MemoryReviewResultSchema>;
