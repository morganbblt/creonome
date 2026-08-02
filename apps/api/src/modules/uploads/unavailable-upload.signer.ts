import { ServiceUnavailableException } from "@nestjs/common";
import type { SignWriteInput, UploadSigner } from "./upload-signer.js";

export class UnavailableUploadSigner implements UploadSigner {
  signWrite(
    _input: SignWriteInput,
  ): Promise<{ url: string; expiresAt: Date }> {
    throw new ServiceUnavailableException("GCP_MEDIA_BUCKET is not configured");
  }
}
