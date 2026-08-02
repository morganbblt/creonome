import type { Library } from "@creonome/contracts";
import { describe, expect, it, vi } from "vitest";
import { loadLibrary } from "./library-data";

const library: Library = {
  totalByteSize: 8_400_000,
  items: [
    {
      id: "0198f3a2-82dd-7000-8000-000000000040",
      projectId: null,
      name: "warehouse-tapes-v1.mp4",
      kind: "export",
      mimeType: "video/mp4",
      byteSize: 8_400_000,
      durationSeconds: 35,
      status: "ready",
      source: "generated",
      createdAt: "2026-08-02T10:00:00.000Z",
    },
  ],
};

describe("library data", () => {
  it("returns the live workspace library", async () => {
    await expect(
      loadLibrary({ getLibrary: vi.fn().mockResolvedValue(library) }),
    ).resolves.toEqual({ source: "api", library });
  });

  it("does not substitute demo assets when the API is unavailable", async () => {
    await expect(
      loadLibrary({
        getLibrary: vi.fn().mockRejectedValue(new Error("offline")),
      }),
    ).resolves.toEqual({
      source: "unavailable",
      library: { items: [], totalByteSize: 0 },
    });
  });
});
