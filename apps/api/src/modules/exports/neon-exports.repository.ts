import { randomUUID } from "node:crypto";
import { Inject, ServiceUnavailableException } from "@nestjs/common";
import { type CreonomeDatabase, exports as projectExports } from "@creonome/db";
import { CREONOME_DATABASE } from "../database/database.module.js";
import type {
  CompletedExportRecord,
  CreateCompletedExportRecord,
  ExportsRepository,
} from "./exports.repository.js";

export class NeonExportsRepository implements ExportsRepository {
  constructor(
    @Inject(CREONOME_DATABASE)
    private readonly database: CreonomeDatabase | undefined,
  ) {}

  async createCompleted(
    input: CreateCompletedExportRecord,
  ): Promise<CompletedExportRecord> {
    const now = new Date();
    const [record] = await this.requireDatabase()
      .insert(projectExports)
      .values({
        id: randomUUID(),
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        requestedByUserId: input.userId,
        format: input.format,
        status: "ready",
        createdAt: now,
        completedAt: now,
      })
      .returning({
        id: projectExports.id,
        createdAt: projectExports.createdAt,
      });
    if (!record) {
      throw new ServiceUnavailableException("Project export was not recorded");
    }
    return record;
  }

  private requireDatabase(): CreonomeDatabase {
    if (!this.database) {
      throw new ServiceUnavailableException("DATABASE_URL is not configured");
    }
    return this.database;
  }
}
