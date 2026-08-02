import { describe, expect, it } from "vitest";
import { resolveApiBaseUrl } from "./api-base-url";

describe("resolveApiBaseUrl", () => {
  it("normalizes a Cloud Run service URL to the versioned API base", () => {
    expect(resolveApiBaseUrl("https://api-creonome.run.app/")).toBe(
      "https://api-creonome.run.app/api/v1",
    );
    expect(resolveApiBaseUrl("https://api.creonome.app/api/v1")).toBe(
      "https://api.creonome.app/api/v1",
    );
  });
});
