import { ServiceUnavailableException } from "@nestjs/common";
import type {
  PrivateObjectReader,
  PrivateObjectStore,
} from "./private-object-store.js";
import type { SignWriteInput, UploadSigner } from "./upload-signer.js";

export class UnavailableUploadSigner
  implements UploadSigner, PrivateObjectStore, PrivateObjectReader
{
  signWrite(_input: SignWriteInput): Promise<{ url: string; expiresAt: Date }> {
    throw new ServiceUnavailableException("GCP_MEDIA_BUCKET is not configured");
  }

  deleteObject(_gcsUri: string): Promise<void> {
    throw new ServiceUnavailableException("GCP_MEDIA_BUCKET is not configured");
  }

  readObject(_gcsUri: string): Promise<never> {
    throw new ServiceUnavailableException("GCP_MEDIA_BUCKET is not configured");
  }
}
