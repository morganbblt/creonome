import { Inject, ServiceUnavailableException } from "@nestjs/common";
import { type CreonomeDatabase, socialConnections } from "@creonome/db";
import { and, eq } from "drizzle-orm";
import { CREONOME_DATABASE } from "../database/database.module.js";
import type {
  IntegrationRecord,
  IntegrationsRepository,
} from "./integrations.repository.js";

export class NeonIntegrationsRepository implements IntegrationsRepository {
  constructor(
    @Inject(CREONOME_DATABASE)
    private readonly database: CreonomeDatabase | undefined,
  ) {}

  async list(workspaceId: string): Promise<IntegrationRecord[]> {
    const rows = await this.requireDatabase()
      .select({
        id: socialConnections.id,
        provider: socialConnections.provider,
        displayName: socialConnections.displayName,
        scopes: socialConnections.scopes,
        status: socialConnections.status,
        expiresAt: socialConnections.expiresAt,
        lastSyncAt: socialConnections.lastSyncAt,
      })
      .from(socialConnections)
      .where(eq(socialConnections.workspaceId, workspaceId));
    return rows as IntegrationRecord[];
  }

  async disconnect(
    workspaceId: string,
    connectionId: string,
  ): Promise<boolean> {
    const rows = await this.requireDatabase()
      .update(socialConnections)
      .set({
        status: "revoked",
        accessTokenCiphertext: "revoked",
        refreshTokenCiphertext: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(socialConnections.workspaceId, workspaceId),
          eq(socialConnections.id, connectionId),
        ),
      )
      .returning({ id: socialConnections.id });
    return rows.length > 0;
  }

  private requireDatabase(): CreonomeDatabase {
    if (!this.database) {
      throw new ServiceUnavailableException("DATABASE_URL is not configured");
    }
    return this.database;
  }
}
