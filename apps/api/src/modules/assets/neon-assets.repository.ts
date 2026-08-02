import { randomUUID } from "node:crypto";
import { Inject, ServiceUnavailableException } from "@nestjs/common";
import {
  type CreonomeDatabase,
  generatedAssets,
  generationJobs,
  projects,
  scripts,
  sourceAssets,
} from "@creonome/db";
import { and, desc, eq } from "drizzle-orm";
import { CREONOME_DATABASE } from "../database/database.module.js";
import type {
  AssetsRepository,
  LibraryAssetRecord,
  RegisterAssetInput,
} from "./assets.repository.js";

function fileNameFromGcsUri(gcsUri: string): string {
  return gcsUri.split("/").at(-1) || "generated-asset";
}

export class NeonAssetsRepository implements AssetsRepository {
  constructor(
    @Inject(CREONOME_DATABASE)
    private readonly database: CreonomeDatabase | undefined,
  ) {}

  async list(workspaceId: string): Promise<LibraryAssetRecord[]> {
    const database = this.requireDatabase();
    const [uploads, generated, projectScripts] = await Promise.all([
      database
        .select({
          id: sourceAssets.id,
          fileName: sourceAssets.fileName,
          mimeType: sourceAssets.mimeType,
          byteSize: sourceAssets.byteSize,
          status: sourceAssets.status,
          createdAt: sourceAssets.createdAt,
        })
        .from(sourceAssets)
        .where(eq(sourceAssets.workspaceId, workspaceId))
        .orderBy(desc(sourceAssets.createdAt)),
      database
        .select({
          id: generatedAssets.id,
          projectId: generatedAssets.projectId,
          kind: generatedAssets.kind,
          gcsUri: generatedAssets.gcsUri,
          mimeType: generatedAssets.mimeType,
          byteSize: generatedAssets.byteSize,
          durationSeconds: generatedAssets.durationSeconds,
          status: generationJobs.status,
          createdAt: generatedAssets.createdAt,
        })
        .from(generatedAssets)
        .innerJoin(
          generationJobs,
          eq(generatedAssets.generationJobId, generationJobs.id),
        )
        .where(eq(generatedAssets.workspaceId, workspaceId))
        .orderBy(desc(generatedAssets.createdAt)),
      database
        .select({
          id: scripts.id,
          projectId: scripts.projectId,
          title: scripts.title,
          durationSeconds: scripts.durationSeconds,
          createdAt: scripts.updatedAt,
        })
        .from(scripts)
        .innerJoin(projects, eq(scripts.projectId, projects.id))
        .where(eq(projects.workspaceId, workspaceId))
        .orderBy(desc(scripts.updatedAt)),
    ]);

    return [
      ...uploads.map((asset) => ({
        id: asset.id,
        projectId: null,
        name: asset.fileName,
        kind: null,
        mimeType: asset.mimeType,
        byteSize: asset.byteSize,
        durationSeconds: null,
        status: asset.status,
        source: "upload" as const,
        createdAt: asset.createdAt,
      })),
      ...generated.map((asset) => ({
        id: asset.id,
        projectId: asset.projectId,
        name: fileNameFromGcsUri(asset.gcsUri),
        kind: asset.kind,
        mimeType: asset.mimeType,
        byteSize: asset.byteSize,
        durationSeconds: asset.durationSeconds,
        status: asset.status,
        source: "generated" as const,
        createdAt: asset.createdAt,
      })),
      ...projectScripts.map((script) => ({
        id: script.id,
        projectId: script.projectId,
        name: script.title,
        kind: "script",
        mimeType: "text/plain",
        byteSize: null,
        durationSeconds: script.durationSeconds,
        status: "ready",
        source: "script" as const,
        createdAt: script.createdAt,
      })),
    ].sort(
      (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
    );
  }

  async create(input: RegisterAssetInput): Promise<LibraryAssetRecord> {
    const database = this.requireDatabase();
    const selection = {
      id: sourceAssets.id,
      fileName: sourceAssets.fileName,
      mimeType: sourceAssets.mimeType,
      byteSize: sourceAssets.byteSize,
      status: sourceAssets.status,
      createdAt: sourceAssets.createdAt,
    };
    const [existing] = await database
      .select(selection)
      .from(sourceAssets)
      .where(
        and(
          eq(sourceAssets.workspaceId, input.workspaceId),
          eq(sourceAssets.gcsUri, input.gcsUri),
        ),
      )
      .limit(1);
    const asset =
      existing ??
      (
        await database
          .insert(sourceAssets)
          .values({
            id: randomUUID(),
            workspaceId: input.workspaceId,
            uploadedByUserId: input.userId,
            fileName: input.fileName,
            mimeType: input.mimeType,
            byteSize: input.byteSize,
            gcsUri: input.gcsUri,
            checksumSha256: input.checksumSha256 ?? null,
            status: "uploaded",
          })
          .returning(selection)
      )[0]!;

    return {
      id: asset.id,
      projectId: null,
      name: asset.fileName,
      kind: null,
      mimeType: asset.mimeType,
      byteSize: asset.byteSize,
      durationSeconds: null,
      status: asset.status,
      source: "upload",
      createdAt: asset.createdAt,
    };
  }

  private requireDatabase(): CreonomeDatabase {
    if (!this.database) {
      throw new ServiceUnavailableException("DATABASE_URL is not configured");
    }
    return this.database;
  }
}
