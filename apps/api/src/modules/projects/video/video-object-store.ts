import type { Readable } from "node:stream";

export type StoredVideoObject = {
  gcsUri: string;
  byteSize: number;
};

export type VideoObjectRead = {
  stream: Readable;
  contentLength: number;
  totalSize: number;
  contentRange: string | null;
};

export interface VideoObjectStore {
  put(input: {
    objectName: string;
    bytes: Buffer;
    metadata: Record<string, string>;
  }): Promise<StoredVideoObject>;
  read(gcsUri: string, range?: string): Promise<VideoObjectRead>;
}

export const VIDEO_OBJECT_STORE = Symbol("VIDEO_OBJECT_STORE");
