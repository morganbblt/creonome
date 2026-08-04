import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const middleware = vi.fn();
const getAuth = vi.fn(() => ({ middleware: () => middleware }));

vi.mock("@/src/lib/auth/server", () => ({ getAuth }));

describe("web proxy protection", () => {
  const originalDisableAuth = process.env.NEXT_PUBLIC_DISABLE_AUTH;

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    middleware.mockReset();
    getAuth.mockClear();
    if (originalDisableAuth === undefined) {
      delete process.env.NEXT_PUBLIC_DISABLE_AUTH;
    } else {
      process.env.NEXT_PUBLIC_DISABLE_AUTH = originalDisableAuth;
    }
  });

  it("runs Neon Auth middleware for the credit ledger", async () => {
    const { config } = await import("./proxy");
    expect(config.matcher).toContain("/credits/:path*");
  });

  it("still runs real auth by default, even outside production", async () => {
    delete process.env.NEXT_PUBLIC_DISABLE_AUTH;
    vi.stubEnv("NODE_ENV", "development");
    const { default: proxy } = await import("./proxy");

    await proxy(new NextRequest("http://localhost:3000/today"));

    expect(getAuth).toHaveBeenCalledOnce();
  });

  it("bypasses auth only when explicitly opted in outside production", async () => {
    process.env.NEXT_PUBLIC_DISABLE_AUTH = "true";
    vi.stubEnv("NODE_ENV", "development");
    const { default: proxy } = await import("./proxy");

    const response = await proxy(new NextRequest("http://localhost:3000/today"));

    expect(getAuth).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
  });

  it("never bypasses auth in production, even if the flag is set", async () => {
    process.env.NEXT_PUBLIC_DISABLE_AUTH = "true";
    vi.stubEnv("NODE_ENV", "production");
    const { default: proxy } = await import("./proxy");

    await proxy(new NextRequest("http://localhost:3000/today"));

    expect(getAuth).toHaveBeenCalledOnce();
  });
});
