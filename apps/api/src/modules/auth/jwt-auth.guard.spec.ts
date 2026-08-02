import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";
import type { AuthTokenVerifier } from "./auth-token-verifier.js";
import { JwtAuthGuard, extractBearerToken } from "./jwt-auth.guard.js";

function contextFor(request: Record<string, unknown>): ExecutionContext {
  return {
    getClass: () => class TestController {},
    getHandler: () => () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe("JwtAuthGuard", () => {
  it("extracts only a well-formed Bearer token", () => {
    expect(extractBearerToken("Bearer signed.jwt.value")).toBe(
      "signed.jwt.value",
    );
    expect(extractBearerToken("Basic credentials")).toBeUndefined();
    expect(extractBearerToken("Bearer ")).toBeUndefined();
  });

  it("verifies the token and attaches the trusted principal", async () => {
    const principal = {
      subject: "0198f3a2-82dd-7000-8000-000000000001",
      email: "nova@example.com",
      name: "Nova Sainte",
    };
    const verifier: AuthTokenVerifier = {
      verify: vi.fn().mockResolvedValue(principal),
    };
    const request = { headers: { authorization: "Bearer valid-token" } };
    const guard = new JwtAuthGuard(new Reflector(), verifier);

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(verifier.verify).toHaveBeenCalledWith("valid-token");
    expect(request).toHaveProperty("auth", principal);
  });

  it("rejects a protected request without credentials", async () => {
    const verifier: AuthTokenVerifier = { verify: vi.fn() };
    const guard = new JwtAuthGuard(new Reflector(), verifier);

    await expect(
      guard.canActivate(contextFor({ headers: {} })),
    ).rejects.toThrow("Authentication is required");
  });

  it("allows a route explicitly marked public", async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(true),
    } as unknown as Reflector;
    const verifier: AuthTokenVerifier = { verify: vi.fn() };
    const guard = new JwtAuthGuard(reflector, verifier);

    await expect(
      guard.canActivate(contextFor({ headers: {} })),
    ).resolves.toBe(true);
    expect(verifier.verify).not.toHaveBeenCalled();
  });
});
