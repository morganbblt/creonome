import { randomUUID } from "node:crypto";
import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import {
  UploadSignResponseSchema,
  type UploadSignResponse,
} from "@creonome/contracts";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import type { SignUploadDto } from "./sign-upload.dto.js";
import { UPLOAD_SIGNER, type UploadSigner } from "./upload-signer.js";

const MAX_UPLOAD_BYTES = 500_000_000;
const supportedMimeType = /^(audio|video|image)\/[a-z0-9.+-]+$|^application\/(pdf|json)$|^text\/(plain|markdown)$/i;

function sanitizeFileName(fileName: string): string {
  const normalized = fileName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-160);
  return normalized || "upload.bin";
}

@Injectable()
export class UploadsService {
  constructor(
    @Inject(WorkspaceContextService)
    private readonly workspaces: WorkspaceContextService,
    @Inject(UPLOAD_SIGNER) private readonly signer: UploadSigner,
  ) {}

  async sign(
    principal: AuthPrincipal,
    input: SignUploadDto,
  ): Promise<UploadSignResponse> {
    if (
      input.byteSize < 1 ||
      input.byteSize > MAX_UPLOAD_BYTES ||
      !supportedMimeType.test(input.mimeType)
    ) {
      throw new BadRequestException("Unsupported file type or size");
    }
    const context = await this.workspaces.resolve(principal);
    const objectName = `workspaces/${context.workspaceId}/sources/${randomUUID()}-${sanitizeFileName(input.fileName)}`;
    const signed = await this.signer.signWrite({
      objectName,
      contentType: input.mimeType,
    });
    return UploadSignResponseSchema.parse({
      objectName,
      gcsUri: `gs://${process.env.GCP_MEDIA_BUCKET ?? "creonome-media"}/${objectName}`,
      uploadUrl: signed.url,
      expiresAt: signed.expiresAt.toISOString(),
      headers: { "Content-Type": input.mimeType },
    });
  }
}
