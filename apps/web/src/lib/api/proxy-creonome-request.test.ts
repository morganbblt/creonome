import { describe, expect, it, vi } from "vitest";
import { proxyCreonomeRequest } from "./proxy-creonome-request";

vi.mock("@/src/lib/auth/server", () => ({
  getAuth: () => ({
    token: async () => ({ data: { token: "neon-jwt" }, error: null }),
  }),
}));

vi.mock("./api-base-url", () => ({
  resolveApiBaseUrl: () => "https://api.creonome.app/api/v1",
}));

describe("proxyCreonomeRequest", () => {
  it("rejects a cross-origin browser mutation before contacting the API", async () => {
    const upstream = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", upstream);

    const response = await proxyCreonomeRequest(
      new Request("https://www.creonome.com/api/creonome/privacy/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://attacker.example",
          "Sec-Fetch-Site": "cross-site",
        },
        body: JSON.stringify({
          modelTrainingOptIn: true,
          keepRushesAfterExport: false,
        }),
      }),
      "/privacy/preferences",
    );

    expect(response.status).toBe(403);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("does not declare JSON for an empty mutation body", async () => {
    const upstream = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ status: "ok" }));
    vi.stubGlobal("fetch", upstream);

    await proxyCreonomeRequest(
      new Request("https://www.creonome.com/api/creonome/action", {
        method: "POST",
      }),
      "/onboarding/assets/asset-1/analyze",
    );

    const init = upstream.mock.calls[0]?.[1];
    expect(init?.body).toBeUndefined();
    expect(init?.headers).not.toHaveProperty("Content-Type");
  });
});
