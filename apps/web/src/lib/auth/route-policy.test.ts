import { describe, expect, it } from "vitest";
import { isProtectedPath } from "./route-policy";

describe("application route policy", () => {
  it("protects creator workspace routes", () => {
    expect(isProtectedPath("/today")).toBe(true);
    expect(isProtectedPath("/onboarding")).toBe(true);
    expect(isProtectedPath("/projects/warehouse-tapes")).toBe(true);
    expect(isProtectedPath("/opportunities/warehouse-tapes")).toBe(true);
    expect(isProtectedPath("/credits")).toBe(true);
    expect(isProtectedPath("/settings/billing")).toBe(true);
  });

  it("keeps auth, legal and provider callbacks public", () => {
    expect(isProtectedPath("/auth/sign-in")).toBe(false);
    expect(isProtectedPath("/api/auth/sign-in/email")).toBe(false);
    expect(isProtectedPath("/legal/privacy")).toBe(false);
  });
});
