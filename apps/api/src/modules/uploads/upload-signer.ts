export type SignWriteInput = {
  objectName: string;
  contentType: string;
};

export interface UploadSigner {
  signWrite(input: SignWriteInput): Promise<{ url: string; expiresAt: Date }>;
}

export const UPLOAD_SIGNER = Symbol("UPLOAD_SIGNER");
