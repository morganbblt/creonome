import { Inject, ServiceUnavailableException } from "@nestjs/common";
import {
  creatorDnaVersions,
  type CreonomeDatabase,
  dnaTraits,
  sourceAssets,
} from "@creonome/db";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { CREONOME_DATABASE } from "../database/database.module.js";
import type {
  CreatorDnaRecord,
  CreatorDnaReferenceImageRecord,
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

  async getPeopleReferenceImage(
    workspaceId: string,
  ): Promise<CreatorDnaReferenceImageRecord | null> {
    const [asset] = await this.requireDatabase()
      .select({
        id: sourceAssets.id,
        fileName: sourceAssets.fileName,
        mimeType: sourceAssets.mimeType,
        byteSize: sourceAssets.byteSize,
        gcsUri: sourceAssets.gcsUri,
        createdAt: sourceAssets.createdAt,
      })
      .from(sourceAssets)
      .where(
        and(
          eq(sourceAssets.workspaceId, workspaceId),
          sql`${sourceAssets.metadata}->>'peopleReference' = 'true'`,
          sql`${sourceAssets.mimeType} in ('image/jpeg', 'image/png', 'image/webp')`,
        ),
      )
      .orderBy(desc(sourceAssets.createdAt))
      .limit(1);
    if (!asset) return null;
    return {
      ...asset,
      mimeType: asset.mimeType as CreatorDnaReferenceImageRecord["mimeType"],
    };
  }

  async setPeopleReferenceImage(
    workspaceId: string,
    assetId: string,
  ): Promise<CreatorDnaReferenceImageRecord | null> {
    const database = this.requireDatabase();
    const [asset] = await database
      .select({
        id: sourceAssets.id,
        fileName: sourceAssets.fileName,
        mimeType: sourceAssets.mimeType,
        byteSize: sourceAssets.byteSize,
        gcsUri: sourceAssets.gcsUri,
        createdAt: sourceAssets.createdAt,
      })
      .from(sourceAssets)
      .where(
        and(
          eq(sourceAssets.workspaceId, workspaceId),
          eq(sourceAssets.id, assetId),
        ),
      )
      .limit(1);
    if (
      !asset ||
      !["image/jpeg", "image/png", "image/webp"].includes(asset.mimeType) ||
      asset.byteSize > 20 * 1024 * 1024
    ) {
      return null;
    }

    const now = new Date();
    await database.batch([
      database
        .update(sourceAssets)
        .set({
          metadata: sql`jsonb_set(coalesce(${sourceAssets.metadata}, '{}'::jsonb), '{peopleReference}', 'false'::jsonb, true)`,
          updatedAt: now,
        })
        .where(
          and(
            eq(sourceAssets.workspaceId, workspaceId),
            sql`${sourceAssets.metadata}->>'peopleReference' = 'true'`,
          ),
        ),
      database
        .update(sourceAssets)
        .set({
          metadata: sql`jsonb_set(coalesce(${sourceAssets.metadata}, '{}'::jsonb), '{peopleReference}', 'true'::jsonb, true)`,
          updatedAt: now,
        })
        .where(
          and(
            eq(sourceAssets.workspaceId, workspaceId),
            eq(sourceAssets.id, assetId),
          ),
        ),
    ]);

    return {
      ...asset,
      mimeType: asset.mimeType as CreatorDnaReferenceImageRecord["mimeType"],
    };
  }

  async clearPeopleReferenceImage(workspaceId: string): Promise<boolean> {
    const updated = await this.requireDatabase()
      .update(sourceAssets)
      .set({
        metadata: sql`jsonb_set(coalesce(${sourceAssets.metadata}, '{}'::jsonb), '{peopleReference}', 'false'::jsonb, true)`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(sourceAssets.workspaceId, workspaceId),
          sql`${sourceAssets.metadata}->>'peopleReference' = 'true'`,
        ),
      )
      .returning({ id: sourceAssets.id });
    return updated.length > 0;
  }

  private requireDatabase(): CreonomeDatabase {
    if (!this.database) {
      throw new ServiceUnavailableException("DATABASE_URL is not configured");
    }
    return this.database;
  }
}
