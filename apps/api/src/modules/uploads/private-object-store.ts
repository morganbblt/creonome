export interface PrivateObjectStore {
  deleteObject(gcsUri: string): Promise<void>;
}

export const PRIVATE_OBJECT_STORE = Symbol("PRIVATE_OBJECT_STORE");
