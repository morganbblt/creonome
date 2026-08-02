import { describe, expect, it } from "vitest";
import { parseApiEnv, parseWebServerEnv } from "./index.js";

describe("API environment", () => {
  it("coerces deployment values and applies safe defaults", () => {
    const env = parseApiEnv({
      NODE_ENV: "test",
      PORT: "4100",
      CORS_ALLOWED_ORIGINS: "http://localhost:3000,https://creonome.vercel.app",
    });

    expect(env.PORT).toBe(4100);
    expect(env.API_PREFIX).toBe("api");
    expect(env.CORS_ALLOWED_ORIGINS).toEqual([
      "http://localhost:3000",
      "https://creonome.vercel.app",
    ]);
  });

  it("rejects wildcard CORS origins", () => {
    expect(() => parseApiEnv({ CORS_ALLOWED_ORIGINS: "*" })).toThrow();
  });

  it("normalizes optional server-only provider configuration", () => {
    const env = parseApiEnv({
      DATABASE_URL: "postgresql://user:pass@example.neon.tech/neondb",
      NEON_AUTH_JWKS_URL: "https://auth.example.com/.well-known/jwks.json",
      GEMINI_API_KEY: "gemini-key",
      MEM0_API_KEY: "mem0-key",
      TIKTOK_CLIENT_KEY: "",
    });

    expect(env.DATABASE_URL).toContain("postgresql://");
    expect(env.GEMINI_MODEL).toBe("gemini-3.5-flash");
    expect(env.GOOGLE_CLOUD_LOCATION).toBe("global");
    expect(env.VERTEX_AI_MODEL).toBe("gemini-3.5-flash");
    expect(env.VIDEO_PROVIDER).toBe("auto");
    expect(env.VEO_BACKEND).toBe("auto");
    expect(env.VEO_VERTEX_LOCATION).toBe("us-central1");
    expect(env.VEO_VERTEX_MODEL).toBe("veo-3.1-fast-generate-001");
    expect(env.VEO_GEMINI_MODEL).toBe("veo-3.1-fast-generate-preview");
    expect(env.VEO_POLL_INTERVAL_MS).toBe(10_000);
    expect(env.VEO_TIMEOUT_MS).toBe(240_000);
    expect(env.MEM0_BASE_URL).toBe("https://api.mem0.ai");
    expect(env.TIKTOK_CLIENT_KEY).toBeUndefined();
  });
});

describe("web server environment", () => {
  it("accepts the branch-specific Neon Auth configuration", () => {
    const env = parseWebServerEnv({
      NODE_ENV: "production",
      NEON_AUTH_BASE_URL:
        "https://ep-example.neonauth.eu-central-1.aws.neon.tech/neondb/auth",
      NEON_AUTH_COOKIE_SECRET: "a".repeat(32),
    });

    expect(env.NEON_AUTH_BASE_URL).toContain("neonauth");
    expect(env.NEON_AUTH_COOKIE_SECRET).toHaveLength(32);
  });

  it("rejects short cookie secrets and non-HTTP auth URLs", () => {
    expect(() =>
      parseWebServerEnv({
        NEON_AUTH_BASE_URL: "file:///tmp/auth",
        NEON_AUTH_COOKIE_SECRET: "short",
      }),
    ).toThrow();
  });
});
