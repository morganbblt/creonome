import { randomUUID } from "node:crypto";
import { Inject, ServiceUnavailableException } from "@nestjs/common";
import {
  assetAnalyses,
  type CreonomeDatabase,
  exports as projectExports,
  generatedAssets,
  generationJobs,
  projects,
  scripts,
  sourceAssets,
} from "@creonome/db";
import { and, desc, eq } from "drizzle-orm";
import { CREONOME_DATABASE } from "../database/database.module.js";
import type {
  AssetAnalysisRecord,
  AssetsRepository,
  LibraryAssetRecord,
  RegisterAssetInput,
  SourceAssetRecord,
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
    const [uploads, generated, projectScripts, completedExports] =
      await Promise.all([
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
        database
          .select({
            id: projectExports.id,
            projectId: projectExports.projectId,
            title: projects.title,
            format: projectExports.format,
            status: projectExports.status,
            createdAt: projectExports.createdAt,
          })
          .from(projectExports)
          .innerJoin(projects, eq(projectExports.projectId, projects.id))
          .where(eq(projectExports.workspaceId, workspaceId))
          .orderBy(desc(projectExports.createdAt)),
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
      ...completedExports.map((projectExport) => ({
        id: projectExport.id,
        projectId: projectExport.projectId,
        name: `${projectExport.title}.${projectExport.format === "markdown" ? "md" : projectExport.format}`,
        kind: "export",
        mimeType:
          projectExport.format === "markdown"
            ? "text/markdown;charset=utf-8"
            : "application/octet-stream",
        byteSize: null,
        durationSeconds: null,
        status: projectExport.status,
        source: "export" as const,
        createdAt: projectExport.createdAt,
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

  async findSourceById(
    workspaceId: string,
    assetId: string,
  ): Promise<SourceAssetRecord | null> {
    const [asset] = await this.requireDatabase()
      .select({
        id: sourceAssets.id,
        fileName: sourceAssets.fileName,
        mimeType: sourceAssets.mimeType,
        byteSize: sourceAssets.byteSize,
        gcsUri: sourceAssets.gcsUri,
        status: sourceAssets.status,
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
    if (!asset) return null;
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
      gcsUri: asset.gcsUri,
      createdAt: asset.createdAt,
    };
  }

  async findLatestAnalysis(
    assetId: string,
  ): Promise<AssetAnalysisRecord | null> {
    const [analysis] = await this.requireDatabase()
      .select({
        status: assetAnalyses.status,
        result: assetAnalyses.result,
        errorCode: assetAnalyses.errorCode,
        completedAt: assetAnalyses.completedAt,
      })
      .from(assetAnalyses)
      .where(eq(assetAnalyses.sourceAssetId, assetId))
      .orderBy(desc(assetAnalyses.createdAt))
      .limit(1);
    return analysis ?? null;
  }

  async deleteSource(workspaceId: string, assetId: string): Promise<boolean> {
    const deleted = await this.requireDatabase()
      .delete(sourceAssets)
      .where(
        and(
          eq(sourceAssets.workspaceId, workspaceId),
          eq(sourceAssets.id, assetId),
        ),
      )
      .returning({ id: sourceAssets.id });
    return deleted.length > 0;
  }

  private requireDatabase(): CreonomeDatabase {
    if (!this.database) {
      throw new ServiceUnavailableException("DATABASE_URL is not configured");
    }
    return this.database;
  }
}
