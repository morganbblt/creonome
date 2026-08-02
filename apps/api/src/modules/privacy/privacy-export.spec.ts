import { describe, expect, it } from "vitest";
import { sanitizePrivacyExport } from "./privacy-export.js";

describe("sanitizePrivacyExport", () => {
  it("removes infrastructure locations and credentials at every depth", () => {
    expect(
      sanitizePrivacyExport({
        source: {
          fileName: "rush.mov",
          gcsUri: "gs://private/rush.mov",
          checksumSha256: "private-checksum",
        },
        integrations: [
          {
            provider: "instagram",
            accessTokenCiphertext: "encrypted-secret",
            refreshTokenCiphertext: "encrypted-refresh",
          },
        ],
      }),
    ).toEqual({
      source: { fileName: "rush.mov" },
      integrations: [{ provider: "instagram" }],
    });
  });

  it("preserves dates, arrays and portable product data", () => {
    const exportedAt = new Date("2026-08-02T10:00:00.000Z");
    expect(
      sanitizePrivacyExport({ exportedAt, traits: ["tactile", null] }),
    ).toEqual({ exportedAt, traits: ["tactile", null] });
  });
});
