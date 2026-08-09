import { describe, expect, it, vi } from "vitest";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import type { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import type { IntegrationsRepository } from "./integrations.repository.js";
import { IntegrationsService } from "./integrations.service.js";
import { TikTokOAuthClient } from "./tiktok-oauth.client.js";

const principal: AuthPrincipal = {
  subject: "0198f3a2-82dd-7000-8000-000000000001",
};

describe("IntegrationsService", () => {
  it("distinguishes missing developer credentials from a disconnected account", async () => {
    const workspaces = {
      resolve: vi.fn().mockResolvedValue({ workspaceId: "workspace-1" }),
    } as unknown as WorkspaceContextService;
    const repository: IntegrationsRepository = {
      list: vi.fn().mockResolvedValue([]),
      disconnect: vi.fn(),
    };
    const service = new IntegrationsService(workspaces, repository, {
      tiktokConfigured: false,
      instagramConfigured: true,
    });

    await expect(service.list(principal)).resolves.toEqual({
      integrations: [
        { provider: "tiktok", configured: false, status: "unavailable" },
        { provider: "instagram", configured: true, status: "disconnected" },
      ],
    });
  });

  it("throws when starting TikTok OAuth without developer credentials", () => {
    const workspaces = {
      resolve: vi.fn(),
    } as unknown as WorkspaceContextService;
    const repository: IntegrationsRepository = {
      list: vi.fn(),
      disconnect: vi.fn(),
    };
    const service = new IntegrationsService(workspaces, repository, {
      tiktokConfigured: false,
      instagramConfigured: false,
    });

    expect(() => service.startTikTok()).toThrow(
      "TikTok OAuth requires the Creonome developer app credentials and final callback domain",
    );
  });

  it("builds a real authorization URL when TikTok OAuth is configured and enabled", () => {
    const workspaces = {
      resolve: vi.fn(),
    } as unknown as WorkspaceContextService;
    const repository: IntegrationsRepository = {
      list: vi.fn(),
      disconnect: vi.fn(),
    };
    const tiktokClient = new TikTokOAuthClient({
      clientKey: "client-key",
      clientSecret: "client-secret",
      redirectUri:
        "https://api.creonome.app/api/v1/integrations/tiktok/callback",
    });
    const service = new IntegrationsService(
      workspaces,
      repository,
      { tiktokConfigured: true, instagramConfigured: false },
      tiktokClient,
    );

    const { url } = service.startTikTok();
    const parsed = new URL(url);
    expect(`${parsed.origin}${parsed.pathname}`).toBe(
      "https://www.tiktok.com/v2/auth/authorize/",
    );
    expect(parsed.searchParams.get("client_key")).toBe("client-key");
    expect(parsed.searchParams.get("state")).toBeTruthy();
  });
});

describe("TikTokOAuthClient", () => {
  it("builds the current OAuth v2 authorization URL with approved read scopes", () => {
    const client = new TikTokOAuthClient({
      clientKey: "client-key",
      clientSecret: "client-secret",
      redirectUri:
        "https://api.creonome.app/api/v1/integrations/tiktok/callback",
    });

    const url = new URL(client.createAuthorizationUrl("csrf-state"));
    expect(`${url.origin}${url.pathname}`).toBe(
      "https://www.tiktok.com/v2/auth/authorize/",
    );
    expect(url.searchParams.get("client_key")).toBe("client-key");
    expect(url.searchParams.get("scope")).toBe("user.info.basic,video.list");
    expect(url.searchParams.get("state")).toBe("csrf-state");
  });
});
