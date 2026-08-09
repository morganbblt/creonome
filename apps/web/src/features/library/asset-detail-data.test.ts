import type { AssetDetail } from "@creonome/contracts";
import { describe, expect, it, vi } from "vitest";
import { loadAssetDetail } from "./asset-detail-data";

const asset: AssetDetail = {
  id: "0198f3a2-82dd-7000-8000-000000000042",
  projectId: null,
  name: "private-rush.mov",
  kind: "video",
  mimeType: "video/quicktime",
  byteSize: 2_000_000,
  durationSeconds: null,
  status: "ready",
  source: "upload",
  createdAt: "2026-08-02T10:30:00.000Z",
  analysis: null,
};

describe("asset detail data", () => {
  it("returns the live asset detail", async () => {
    await expect(
      loadAssetDetail({ getAsset: vi.fn().mockResolvedValue(asset) }, asset.id),
    ).resolves.toEqual({ asset });
  });

  it("returns null when the asset does not exist or belongs to another workspace", async () => {
    await expect(
      loadAssetDetail(
        { getAsset: vi.fn().mockRejectedValue(new Error("not found")) },
        asset.id,
      ),
    ).resolves.toBeNull();
  });
});
