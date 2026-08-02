export interface PrivateObjectStore {
  deleteObject(gcsUri: string): Promise<void>;
}

export const PRIVATE_OBJECT_STORE = Symbol("PRIVATE_OBJECT_STORE");

export type PrivateObjectRead = {
  bytes: Buffer;
  mimeType: string;
};

export interface PrivateObjectReader {
  readObject(gcsUri: string): Promise<PrivateObjectRead>;
}

export const PRIVATE_OBJECT_READER = Symbol("PRIVATE_OBJECT_READER");
