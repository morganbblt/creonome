import { describe, expect, it, vi } from "vitest";

vi.mock("@/src/lib/auth/server", () => ({ getAuth: vi.fn() }));

import { config } from "./proxy";

describe("web proxy protection", () => {
  it("runs Neon Auth middleware for the credit ledger", () => {
    expect(config.matcher).toContain("/credits/:path*");
  });
});
