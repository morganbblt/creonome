import { Storage } from "@google-cloud/storage";
import { BadRequestException } from "@nestjs/common";
import type { PrivateObjectStore } from "./private-object-store.js";
import type { SignWriteInput, UploadSigner } from "./upload-signer.js";

const SIGNED_URL_TTL_MS = 15 * 60 * 1_000;

export class GcsUploadSigner implements UploadSigner, PrivateObjectStore {
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

  async deleteObject(gcsUri: string): Promise<void> {
    const prefix = `gs://${this.bucketName}/`;
    if (!gcsUri.startsWith(prefix) || gcsUri.length === prefix.length) {
      throw new BadRequestException(
        "Private object is outside the configured media bucket",
      );
    }
    const objectName = gcsUri.slice(prefix.length);
    await this.storage
      .bucket(this.bucketName)
      .file(objectName)
      .delete({ ignoreNotFound: true });
  }
}
