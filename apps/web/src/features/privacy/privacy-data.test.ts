import type { PrivacyState } from "@creonome/contracts";
import { describe, expect, it, vi } from "vitest";
import { loadPrivacy } from "./privacy-data";

const state: PrivacyState = {
  preferences: {
    modelTrainingOptIn: false,
    keepRushesAfterExport: true,
    updatedAt: "2026-08-02T10:00:00.000Z",
  },
  accountDeletion: null,
};

describe("loadPrivacy", () => {
  it("returns the authenticated API state", async () => {
    await expect(
      loadPrivacy({ getPrivacy: vi.fn().mockResolvedValue(state) }),
    ).resolves.toEqual(state);
  });

  it("fails closed without replacing privacy state with demo data", async () => {
    await expect(
      loadPrivacy({ getPrivacy: vi.fn().mockRejectedValue(new Error("offline")) }),
    ).resolves.toBeNull();
  });
});
