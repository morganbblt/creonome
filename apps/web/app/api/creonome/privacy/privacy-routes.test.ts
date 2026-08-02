import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE as cancelDeletion } from "./account-deletion/[id]/route";
import { POST as scheduleDeletion } from "./account-deletion/route";
import { POST as createExport } from "./exports/route";
import { PUT as updatePreferences } from "./preferences/route";
import { GET as getPrivacy } from "./route";
import { proxyCreonomeRequest } from "@/src/lib/api/proxy-creonome-request";

vi.mock("@/src/lib/api/proxy-creonome-request", () => ({
  proxyCreonomeRequest: vi.fn().mockResolvedValue(Response.json({ ok: true })),
}));

describe("privacy proxy routes", () => {
  beforeEach(() => vi.mocked(proxyCreonomeRequest).mockClear());

  it("forwards every privacy operation to the versioned backend path", async () => {
    const request = new Request("https://www.creonome.com/api/creonome/privacy");
    await getPrivacy(request);
    await updatePreferences(request);
    await createExport(request);
    await scheduleDeletion(request);
    await cancelDeletion(request, {
      params: Promise.resolve({
        id: "0198f3a2-82dd-7000-8000-000000000090",
      }),
    });

    expect(vi.mocked(proxyCreonomeRequest).mock.calls.map((call) => call[1])).toEqual([
      "/privacy",
      "/privacy/preferences",
      "/privacy/exports",
      "/privacy/account-deletion",
      "/privacy/account-deletion/0198f3a2-82dd-7000-8000-000000000090",
    ]);
  });
});
