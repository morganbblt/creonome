import { describe, expect, it, vi } from "vitest";

vi.mock("@/src/lib/api/server-client", () => ({
  createServerApiClient: vi.fn(),
}));

describe("onboarding page rendering", () => {
  it("renders per request so auth and persisted progress cannot be frozen at build time", async () => {
    const page = await import("./page");
    expect(page.dynamic).toBe("force-dynamic");
  });
});
