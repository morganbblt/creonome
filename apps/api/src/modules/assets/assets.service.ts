import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  CreateAssetInputSchema,
  LibraryItemSchema,
  LibrarySchema,
  type CreateAssetInput,
  type Library,
  type LibraryItem,
  type LibraryItemKind,
} from "@creonome/contracts";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
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
