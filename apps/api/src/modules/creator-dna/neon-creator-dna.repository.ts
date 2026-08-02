import { Inject, ServiceUnavailableException } from "@nestjs/common";
import {
  creatorDnaVersions,
  type CreonomeDatabase,
  dnaTraits,
} from "@creonome/db";
import { asc, desc, eq } from "drizzle-orm";
import { CREONOME_DATABASE } from "../database/database.module.js";
import type {
  CreatorDnaRecord,
  CreatorDnaRepository,
  CreatorDnaVersionRecord,
} from "./creator-dna.repository.js";

export class NeonCreatorDnaRepository implements CreatorDnaRepository {
  constructor(
    @Inject(CREONOME_DATABASE)
    private readonly database: CreonomeDatabase | undefined,
  ) {}

  async getCurrent(creatorProfileId: string): Promise<CreatorDnaRecord | null> {
    const database = this.requireDatabase();
    const [version] = await database
      .select({
        id: creatorDnaVersions.id,
        version: creatorDnaVersions.version,
        summary: creatorDnaVersions.summary,
        confirmed: creatorDnaVersions.confirmed,
      })
      .from(creatorDnaVersions)
      .where(eq(creatorDnaVersions.creatorProfileId, creatorProfileId))
      .orderBy(desc(creatorDnaVersions.version))
      .limit(1);

    if (!version) {
      return null;
    }

    const traits = await database
      .select({
        id: dnaTraits.id,
        category: dnaTraits.category,
        label: dnaTraits.label,
        value: dnaTraits.value,
        confidence: dnaTraits.confidence,
        evidence: dnaTraits.evidence,
      })
      .from(dnaTraits)
      .where(eq(dnaTraits.dnaVersionId, version.id))
      .orderBy(asc(dnaTraits.position));

    return { ...version, traits };
  }

  async confirmCurrent(
    creatorProfileId: string,
  ): Promise<CreatorDnaRecord | null> {
    const current = await this.getCurrent(creatorProfileId);
    if (!current) {
      return null;
    }

    await this.requireDatabase()
      .update(creatorDnaVersions)
      .set({ confirmed: true })
      .where(eq(creatorDnaVersions.id, current.id));

    return { ...current, confirmed: true };
  }

  async listVersions(
    creatorProfileId: string,
  ): Promise<CreatorDnaVersionRecord[]> {
    return this.requireDatabase()
      .select({
        id: creatorDnaVersions.id,
        version: creatorDnaVersions.version,
        summary: creatorDnaVersions.summary,
        confirmed: creatorDnaVersions.confirmed,
        createdAt: creatorDnaVersions.createdAt,
      })
      .from(creatorDnaVersions)
      .where(eq(creatorDnaVersions.creatorProfileId, creatorProfileId))
      .orderBy(desc(creatorDnaVersions.version));
  }

  private requireDatabase(): CreonomeDatabase {
    if (!this.database) {
      throw new ServiceUnavailableException("DATABASE_URL is not configured");
    }
    return this.database;
  }
}
