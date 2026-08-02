import { describe, expect, it } from "vitest";
import { resolveAuthServerConfig } from "./server-config";

describe("Neon Auth server configuration", () => {
  it("keeps session cookies short-lived and credentials server-only", () => {
    const config = resolveAuthServerConfig({
      NODE_ENV: "production",
      NEON_AUTH_BASE_URL:
        "https://ep-cool-river-123456.neonauth.eu-west-2.aws.neon.tech/neondb/auth",
      NEON_AUTH_COOKIE_SECRET: "a".repeat(32),
    });

    expect(config).toEqual({
      baseUrl:
        "https://ep-cool-river-123456.neonauth.eu-west-2.aws.neon.tech/neondb/auth",
      cookies: {
        secret: "a".repeat(32),
        sessionDataTtl: 300,
        sameSite: "lax",
      },
      logLevel: "warn",
    });
  });

  it("rejects an invalid cookie secret before the SDK is initialized", () => {
    expect(() =>
      resolveAuthServerConfig({
        NEON_AUTH_BASE_URL: "https://auth.example.com",
        NEON_AUTH_COOKIE_SECRET: "short",
      }),
    ).toThrow();
  });
});
