import { Inject, ServiceUnavailableException } from "@nestjs/common";
import { type CreonomeDatabase, memoryCandidates } from "@creonome/db";
import { and, eq } from "drizzle-orm";
import { CREONOME_DATABASE } from "../database/database.module.js";
import type {
  MemoryCandidateRecord,
  MemoryCandidateRepository,
  MemoryReviewStatus,
} from "./memory-candidate.repository.js";

export class NeonMemoryCandidateRepository
  implements MemoryCandidateRepository
{
  constructor(
    @Inject(CREONOME_DATABASE)
    private readonly database: CreonomeDatabase | undefined,
  ) {}

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

  async markReviewed(
    candidateId: string,
    workspaceId: string,
    reviewedByUserId: string,
    status: MemoryReviewStatus,
  ): Promise<boolean> {
    const reviewed = await this.requireDatabase()
      .update(memoryCandidates)
      .set({ status, reviewedByUserId, reviewedAt: new Date() })
      .where(
        and(
          eq(memoryCandidates.id, candidateId),
          eq(memoryCandidates.workspaceId, workspaceId),
          eq(memoryCandidates.status, "pending"),
        ),
      )
      .returning({ id: memoryCandidates.id });
    return reviewed.length > 0;
  }

  private requireDatabase(): CreonomeDatabase {
    if (!this.database) {
      throw new ServiceUnavailableException("DATABASE_URL is not configured");
    }
    return this.database;
  }
}
