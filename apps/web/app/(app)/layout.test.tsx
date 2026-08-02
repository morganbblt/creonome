import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/lib/api/server-client", () => ({
  createServerApiClient: () => ({
    getCredits: vi.fn().mockResolvedValue({ available: 60 }),
  }),
}));

import { dynamic } from "./layout";

describe("authenticated app layout", () => {
  it("always renders workspace-scoped data per request", () => {
    expect(dynamic).toBe("force-dynamic");
  });
});
