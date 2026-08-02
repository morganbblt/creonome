import { Readable } from "node:stream";
import type { Storage } from "@google-cloud/storage";
import { describe, expect, it, vi } from "vitest";
import { GcsVideoObjectStore } from "./gcs-video-object.store.js";

function setup(
  metadata: { size: string; contentType: string } = {
    size: "2048",
    contentType: "video/mp4",
  },
) {
  const stream = Readable.from(Buffer.from("video"));
  const file = {
    save: vi.fn().mockResolvedValue(undefined),
    getMetadata: vi.fn().mockResolvedValue([metadata]),
    delete: vi.fn().mockResolvedValue(undefined),
    createReadStream: vi.fn().mockReturnValue(stream),
  };
  const bucket = { file: vi.fn().mockReturnValue(file) };
  const storage = {
    bucket: vi.fn().mockReturnValue(bucket),
  } as unknown as Storage;
  return {
    store: new GcsVideoObjectStore("creonome-media", "creonome", storage),
    file,
    bucket,
    stream,
  };
}

describe("GcsVideoObjectStore", () => {
  it("uploads a complete MP4 and verifies the committed object metadata", async () => {
    const { store, file } = setup();
    const bytes = Buffer.alloc(2_048);

    await expect(
      store.put({
        objectName: "generated-videos/workspace/project/video.mp4",
        bytes,
        metadata: { provider: "google-gemini-api" },
      }),
    ).resolves.toEqual({
      gcsUri:
        "gs://creonome-media/generated-videos/workspace/project/video.mp4",
      byteSize: 2_048,
    });
    expect(file.save).toHaveBeenCalledWith(
      bytes,
      expect.objectContaining({
        resumable: false,
        validation: "crc32c",
        metadata: expect.objectContaining({ contentType: "video/mp4" }),
      }),
    );
  });

  it("deletes an object whose committed size cannot be verified", async () => {
    const { store, file } = setup({ size: "1024", contentType: "video/mp4" });

    await expect(
      store.put({
        objectName: "generated-videos/workspace/project/video.mp4",
        bytes: Buffer.alloc(2_048),
        metadata: {},
      }),
    ).rejects.toThrow("GCS_VIDEO_VERIFICATION_FAILED");
    expect(file.delete).toHaveBeenCalledWith({ ignoreNotFound: true });
  });

  it("serves a validated byte range for browser playback", async () => {
    const { store, file, stream } = setup();

    await expect(
      store.read(
        "gs://creonome-media/generated-videos/workspace/project/video.mp4",
        "bytes=100-299",
      ),
    ).resolves.toEqual({
      stream,
      contentLength: 200,
      totalSize: 2_048,
      contentRange: "bytes 100-299/2048",
    });
    expect(file.createReadStream).toHaveBeenCalledWith({
      start: 100,
      end: 299,
    });
  });

  it("refuses objects outside the configured private bucket", async () => {
    const { store } = setup();
    await expect(
      store.read("gs://attacker-bucket/video.mp4"),
    ).rejects.toMatchObject({ status: 400 });
  });
});
