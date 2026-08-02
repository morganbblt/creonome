import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { GcsUploadSigner } from "./gcs-upload.signer.js";

function setup() {
  const file = { delete: vi.fn().mockResolvedValue(undefined) };
  const bucket = { file: vi.fn().mockReturnValue(file) };
  const storage = { bucket: vi.fn().mockReturnValue(bucket) };
  const signer = new GcsUploadSigner("creonome-909754432431-media", "creonome");
  Object.assign(signer, { storage });
  return { signer, storage, bucket, file };
}

describe("GcsUploadSigner private object deletion", () => {
  it("deletes only the object resolved inside the configured bucket", async () => {
    const { signer, storage, bucket, file } = setup();

    await signer.deleteObject(
      "gs://creonome-909754432431-media/workspaces/workspace-1/sources/private-rush.mov",
    );

    expect(storage.bucket).toHaveBeenCalledWith("creonome-909754432431-media");
    expect(bucket.file).toHaveBeenCalledWith(
      "workspaces/workspace-1/sources/private-rush.mov",
    );
    expect(file.delete).toHaveBeenCalledWith({ ignoreNotFound: true });
  });

  it("rejects deletion outside the configured bucket", async () => {
    const { signer, file } = setup();

    await expect(
      signer.deleteObject(
        "gs://foreign-bucket/workspaces/other/private-rush.mov",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(file.delete).not.toHaveBeenCalled();
  });
});
