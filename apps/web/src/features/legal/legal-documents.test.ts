import { describe, expect, it } from "vitest";
import { legalDocuments } from "./legal-documents";

describe("legal placeholders", () => {
  it("publishes the three public documents required by social integrations", () => {
    expect(Object.keys(legalDocuments)).toEqual([
      "privacy",
      "terms",
      "data-deletion",
    ]);
    expect(legalDocuments.privacy.title).toBe("Privacy policy");
    expect(legalDocuments["data-deletion"].sections.join(" ")).toContain(
      "support@creonome.app",
    );
  });
});
