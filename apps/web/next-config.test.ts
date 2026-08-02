import { describe, expect, it } from "vitest";
import nextConfig from "./next.config";

describe("Next.js security headers", () => {
  it("sets browser hardening headers on every route", async () => {
    const rules = await nextConfig.headers?.();
    const headers = Object.fromEntries(
      (rules?.find((rule) => rule.source === "/:path*")?.headers ?? []).map(
        ({ key, value }) => [key, value],
      ),
    );

    expect(headers).toMatchObject({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    });
  });
});
