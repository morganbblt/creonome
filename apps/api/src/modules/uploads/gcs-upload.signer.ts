import { Storage } from "@google-cloud/storage";
import type { SignWriteInput, UploadSigner } from "./upload-signer.js";

const SIGNED_URL_TTL_MS = 15 * 60 * 1_000;

export class GcsUploadSigner implements UploadSigner {
  private readonly storage: Storage;

  constructor(
    private readonly bucketName: string,
    projectId: string,
  ) {
    this.storage = new Storage({ projectId });
  }

  async signWrite(
    input: SignWriteInput,
  ): Promise<{ url: string; expiresAt: Date }> {
    const expiresAt = new Date(Date.now() + SIGNED_URL_TTL_MS);
    const [url] = await this.storage
      .bucket(this.bucketName)
      .file(input.objectName)
      .getSignedUrl({
        version: "v4",
        action: "write",
        expires: expiresAt,
        contentType: input.contentType,
      });
    return { url, expiresAt };
  }
}
