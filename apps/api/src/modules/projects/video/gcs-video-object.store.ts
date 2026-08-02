import { HttpException } from "@nestjs/common";
import { Storage } from "@google-cloud/storage";
import type {
  StoredVideoObject,
  VideoObjectRead,
  VideoObjectStore,
} from "./video-object-store.js";

function parseRange(
  range: string | undefined,
  size: number,
): { start: number; end: number } | null {
  if (!range) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!match || (!match[1] && !match[2])) {
    throw new HttpException("Requested video range is invalid", 416);
  }
  let start: number;
  let end: number;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) {
      throw new HttpException("Requested video range is invalid", 416);
    }
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
  }
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    end < start ||
    start >= size
  ) {
    throw new HttpException("Requested video range is outside the file", 416);
  }
  return { start, end: Math.min(end, size - 1) };
}

export class GcsVideoObjectStore implements VideoObjectStore {
  private readonly storage: Storage;

  constructor(
    private readonly bucketName: string,
    projectId: string,
    storage?: Storage,
  ) {
    this.storage = storage ?? new Storage({ projectId });
  }

  async put(input: {
    objectName: string;
    bytes: Buffer;
    metadata: Record<string, string>;
  }): Promise<StoredVideoObject> {
    if (
      !input.objectName.startsWith("generated-videos/") ||
      input.objectName.includes("..") ||
      !input.objectName.endsWith(".mp4")
    ) {
      throw new HttpException("Generated video object name is invalid", 400);
    }
    const file = this.storage.bucket(this.bucketName).file(input.objectName);
    await file.save(input.bytes, {
      resumable: false,
      validation: "crc32c",
      metadata: {
        contentType: "video/mp4",
        cacheControl: "private, max-age=3600",
        metadata: input.metadata,
      },
    });
    const [metadata] = await file.getMetadata();
    const size = Number(metadata.size);
    if (
      size !== input.bytes.byteLength ||
      metadata.contentType !== "video/mp4"
    ) {
      await file.delete({ ignoreNotFound: true });
      throw new Error("GCS_VIDEO_VERIFICATION_FAILED");
    }
    return {
      gcsUri: `gs://${this.bucketName}/${input.objectName}`,
      byteSize: size,
    };
  }

  async read(gcsUri: string, range?: string): Promise<VideoObjectRead> {
    const prefix = `gs://${this.bucketName}/generated-videos/`;
    if (!gcsUri.startsWith(prefix) || gcsUri.length === prefix.length) {
      throw new HttpException(
        "Video is outside the configured private media bucket",
        400,
      );
    }
    const objectName = gcsUri.slice(`gs://${this.bucketName}/`.length);
    const file = this.storage.bucket(this.bucketName).file(objectName);
    const [metadata] = await file.getMetadata();
    const totalSize = Number(metadata.size);
    if (
      !Number.isSafeInteger(totalSize) ||
      totalSize <= 0 ||
      metadata.contentType !== "video/mp4"
    ) {
      throw new Error("GCS_VIDEO_METADATA_INVALID");
    }
    const parsed = parseRange(range, totalSize);
    if (!parsed) {
      return {
        stream: file.createReadStream(),
        contentLength: totalSize,
        totalSize,
        contentRange: null,
      };
    }
    return {
      stream: file.createReadStream(parsed),
      contentLength: parsed.end - parsed.start + 1,
      totalSize,
      contentRange: `bytes ${parsed.start}-${parsed.end}/${totalSize}`,
    };
  }
}
