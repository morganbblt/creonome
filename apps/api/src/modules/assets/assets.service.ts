import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AssetDeletionSchema,
  AssetDetailSchema,
  CreateAssetInputSchema,
  LibraryItemSchema,
  LibrarySchema,
  OnboardingAssetInsightSchema,
  type AssetDeletion,
  type AssetDetail,
  type CreateAssetInput,
  type Library,
  type LibraryItem,
  type LibraryItemKind,
} from "@creonome/contracts";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import {
  PRIVATE_OBJECT_READER,
  PRIVATE_OBJECT_STORE,
  type PrivateObjectReader,
  type PrivateObjectStore,
} from "../uploads/private-object-store.js";
import { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import {
  ASSETS_REPOSITORY,
  type AssetsRepository,
  type LibraryAssetRecord,
} from "./assets.repository.js";

@Injectable()
export class AssetsService {
  constructor(
    @Inject(WorkspaceContextService)
    private readonly workspaces: WorkspaceContextService,
    @Inject(ASSETS_REPOSITORY)
    private readonly repository: AssetsRepository,
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(PRIVATE_OBJECT_STORE)
    private readonly objectStore: PrivateObjectStore,
    @Inject(PRIVATE_OBJECT_READER)
    private readonly objectReader: PrivateObjectReader,
  ) {}

  async list(principal: AuthPrincipal): Promise<Library> {
    const context = await this.workspaces.resolve(principal);
    const records = await this.repository.list(context.workspaceId);
    return LibrarySchema.parse({
      items: records.map((record) => this.toItem(record)),
      totalByteSize: records.reduce(
        (total, record) => total + (record.byteSize ?? 0),
        0,
      ),
    });
  }

  async create(
    principal: AuthPrincipal,
    rawInput: CreateAssetInput,
  ): Promise<LibraryItem> {
    const input = CreateAssetInputSchema.parse(rawInput);
    const context = await this.workspaces.resolve(principal);
    const bucket = this.config.get<string>("GCP_MEDIA_BUCKET");
    if (!bucket) {
      throw new ServiceUnavailableException(
        "GCP_MEDIA_BUCKET is not configured",
      );
    }
    const prefix = `gs://${bucket}/workspaces/${context.workspaceId}/sources/`;
    if (!input.gcsUri.startsWith(prefix)) {
      throw new BadRequestException("Asset is outside the current workspace");
    }
    return this.toItem(await this.repository.create({ ...input, ...context }));
  }

  async get(principal: AuthPrincipal, assetId: string): Promise<AssetDetail> {
    const context = await this.workspaces.resolve(principal);
    const asset = await this.repository.findSourceById(
      context.workspaceId,
      assetId,
    );
    if (!asset) throw new NotFoundException("Source asset was not found");
    const analysisRecord = await this.repository.findLatestAnalysis(assetId);
    const parsedInsight = OnboardingAssetInsightSchema.safeParse(
      analysisRecord?.result,
    );
    return AssetDetailSchema.parse({
      ...this.toItem(asset),
      analysis: parsedInsight.success ? parsedInsight.data : null,
    });
  }

  async remove(
    principal: AuthPrincipal,
    assetId: string,
  ): Promise<AssetDeletion> {
    const context = await this.workspaces.resolve(principal);
    const asset = await this.repository.findSourceById(
      context.workspaceId,
      assetId,
    );
    if (!asset) throw new NotFoundException("Source asset was not found");

    try {
      await this.objectStore.deleteObject(asset.gcsUri);
    } catch {
      throw new ServiceUnavailableException(
        "Private source deletion could not be confirmed",
      );
    }
    const deleted = await this.repository.deleteSource(
      context.workspaceId,
      assetId,
    );
    if (!deleted) throw new NotFoundException("Source asset was not found");
    return AssetDeletionSchema.parse({ id: assetId, deleted: true });
  }

  async readContent(
    principal: AuthPrincipal,
    assetId: string,
  ): Promise<{ bytes: Buffer; mimeType: string }> {
    const context = await this.workspaces.resolve(principal);
    const asset = await this.repository.findSourceById(
      context.workspaceId,
      assetId,
    );
    if (!asset) throw new NotFoundException("Source asset was not found");
    if (!asset.mimeType?.startsWith("image/")) {
      throw new BadRequestException("Only image assets can be previewed here");
    }
    const content = await this.objectReader.readObject(asset.gcsUri);
    if (!content.mimeType.startsWith("image/")) {
      throw new BadRequestException("The stored source is not an image");
    }
    return content;
  }

  private toItem(record: LibraryAssetRecord): LibraryItem {
    return LibraryItemSchema.parse({
      ...record,
      kind: this.kind(record),
      status: this.status(record),
      createdAt: record.createdAt.toISOString(),
    });
  }

  private kind(record: LibraryAssetRecord): LibraryItemKind {
    if (record.source === "export") return "export";
    if (record.source === "generated") return "export";
    if (record.source === "script") return "script";
    if (record.mimeType?.startsWith("video/")) return "video";
    if (record.mimeType?.startsWith("audio/")) return "audio";
    if (record.mimeType?.startsWith("image/")) return "image";
    return "document";
  }

  private status(record: LibraryAssetRecord): LibraryItem["status"] {
    if (record.source === "export") return "ready";
    if (record.source === "script") return "ready";
    if (record.status === "succeeded") return "ready";
    if (record.status === "failed") return "failed";
    if (record.status === "queued" || record.status === "running") {
      return "analyzing";
    }
    return "uploaded";
  }
}
