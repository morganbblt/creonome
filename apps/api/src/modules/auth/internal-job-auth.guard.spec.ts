import {
  ServiceUnavailableException,
  UnauthorizedException,
  type ExecutionContext,
} from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { describe, expect, it, vi } from "vitest";
import { InternalJobAuthGuard } from "./internal-job-auth.guard.js";

function contextFor(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function configWith(token: string | undefined): ConfigService {
  return { get: vi.fn().mockReturnValue(token) } as unknown as ConfigService;
}

describe("InternalJobAuthGuard", () => {
  it("accepts a request bearing the exact configured token", () => {
    const guard = new InternalJobAuthGuard(configWith("trusted-secret"));
    const request = { headers: { authorization: "Bearer trusted-secret" } };

    expect(guard.canActivate(contextFor(request))).toBe(true);
  });

  it("rejects a request with the wrong token", () => {
    const guard = new InternalJobAuthGuard(configWith("trusted-secret"));
    const request = { headers: { authorization: "Bearer wrong-secret" } };

    expect(() => guard.canActivate(contextFor(request))).toThrow(
      UnauthorizedException,
    );
  });

  it("rejects a request with no authorization header", () => {
    const guard = new InternalJobAuthGuard(configWith("trusted-secret"));

    expect(() => guard.canActivate(contextFor({ headers: {} }))).toThrow(
      UnauthorizedException,
    );
  });

  it("refuses every request when no token is configured", () => {
    const guard = new InternalJobAuthGuard(configWith(undefined));
    const request = { headers: { authorization: "Bearer anything" } };

    expect(() => guard.canActivate(contextFor(request))).toThrow(
      ServiceUnavailableException,
    );
  });
});
