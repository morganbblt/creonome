import { Inject, ServiceUnavailableException } from "@nestjs/common";
import { type CreonomeDatabase, memoryCandidates } from "@creonome/db";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { CREONOME_DATABASE } from "../database/database.module.js";
import type {
  MemoryCandidateListRecord,
  MemoryCandidateRecord,
  MemoryCandidateRepository,
  MemoryReviewedRecord,
  MemoryReviewStatus,
} from "./memory-candidate.repository.js";

export class NeonMemoryCandidateRepository implements MemoryCandidateRepository {
  constructor(
    @Inject(CREONOME_DATABASE)
    private readonly database: CreonomeDatabase | undefined,
  ) {}

  async list(
    workspaceId: string,
    creatorProfileId: string,
  ): Promise<MemoryCandidateListRecord[]> {
    const records = await this.requireDatabase()
      .select({
        id: memoryCandidates.id,
        workspaceId: memoryCandidates.workspaceId,
        creatorProfileId: memoryCandidates.creatorProfileId,
        provider: memoryCandidates.provider,
        kind: memoryCandidates.kind,
        scope: memoryCandidates.scope,
        confidence: memoryCandidates.confidence,
        content: memoryCandidates.content,
        evidence: memoryCandidates.evidence,
        status: memoryCandidates.status,
        reviewedAt: memoryCandidates.reviewedAt,
        createdAt: memoryCandidates.createdAt,
      })
      .from(memoryCandidates)
      .where(
        and(
          eq(memoryCandidates.workspaceId, workspaceId),
          eq(memoryCandidates.creatorProfileId, creatorProfileId),
        ),
      )
      .orderBy(desc(memoryCandidates.createdAt))
      .limit(50);
    return records.flatMap((record) =>
      (record.status === "pending" ||
        record.status === "approved" ||
        record.status === "rejected") &&
      (record.scope === "idea" ||
        record.scope === "project" ||
        record.scope === "creator")
        ? [
            {
              ...record,
              status: record.status,
              scope: record.scope,
              confidence: Number(record.confidence),
            },
          ]
        : [],
    );
  }

  async findPending(
    candidateId: string,
    workspaceId: string,
  ): Promise<MemoryCandidateRecord | null> {
    const [candidate] = await this.requireDatabase()
      .select({
        id: memoryCandidates.id,
        workspaceId: memoryCandidates.workspaceId,
        creatorProfileId: memoryCandidates.creatorProfileId,
        kind: memoryCandidates.kind,
        content: memoryCandidates.content,
        evidence: memoryCandidates.evidence,
      })
      .from(memoryCandidates)
      .where(
        and(
          eq(memoryCandidates.id, candidateId),
          eq(memoryCandidates.workspaceId, workspaceId),
          eq(memoryCandidates.status, "pending"),
        ),
      )
      .limit(1);
    return candidate ?? null;
  }

  async countApprovedFeedbackByAction(
    creatorProfileId: string,
    action: string,
  ): Promise<number> {
    const [row] = await this.requireDatabase()
      .select({ count: count() })
      .from(memoryCandidates)
      .where(
        and(
          eq(memoryCandidates.creatorProfileId, creatorProfileId),
          eq(memoryCandidates.status, "approved"),
          sql`${memoryCandidates.evidence}->>'source' = 'explicit_feedback'`,
          sql`${memoryCandidates.evidence}->>'action' = ${action}`,
        ),
      );
    return row?.count ?? 0;
  }

  async markReviewed(
    candidateId: string,
    workspaceId: string,
    reviewedByUserId: string,
    status: MemoryReviewStatus,
  ): Promise<MemoryReviewedRecord | null> {
    const reviewedAt = new Date();
    const reviewed = await this.requireDatabase()
      .update(memoryCandidates)
      .set({ status, reviewedByUserId, reviewedAt })
      .where(
        and(
          eq(memoryCandidates.id, candidateId),
          eq(memoryCandidates.workspaceId, workspaceId),
          eq(memoryCandidates.status, "pending"),
        ),
      )
      .returning({ reviewedAt: memoryCandidates.reviewedAt });
    return reviewed[0]?.reviewedAt
      ? { reviewedAt: reviewed[0].reviewedAt }
      : null;
  }

  private requireDatabase(): CreonomeDatabase {
    if (!this.database) {
      throw new ServiceUnavailableException("DATABASE_URL is not configured");
    }
    return this.database;
  }
}
