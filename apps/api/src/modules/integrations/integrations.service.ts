import { randomUUID } from "node:crypto";
import {
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  IntegrationsResponseSchema,
  type IntegrationsResponse,
  type SocialProvider,
} from "@creonome/contracts";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import {
  INTEGRATIONS_REPOSITORY,
  type IntegrationsRepository,
} from "./integrations.repository.js";
import type { TikTokOAuthClient } from "./tiktok-oauth.client.js";

type IntegrationConfiguration = {
  tiktokConfigured: boolean;
  instagramConfigured: boolean;
};

const TIKTOK_UNAVAILABLE_MESSAGE =
  "TikTok OAuth requires the Creonome developer app credentials and final callback domain";

@Injectable()
export class IntegrationsService {
  constructor(
    @Inject(WorkspaceContextService)
    private readonly workspaces: WorkspaceContextService,
    @Inject(INTEGRATIONS_REPOSITORY)
    private readonly repository: IntegrationsRepository,
    private readonly configuration: IntegrationConfiguration,
    private readonly tiktokClient: TikTokOAuthClient | null = null,
  ) {}

  async list(principal: AuthPrincipal): Promise<IntegrationsResponse> {
    const context = await this.workspaces.resolve(principal);
    const connections = await this.repository.list(context.workspaceId);
    const providers: SocialProvider[] = ["tiktok", "instagram"];

    return IntegrationsResponseSchema.parse({
      integrations: providers.map((provider) => {
        const configured =
          provider === "tiktok"
            ? this.configuration.tiktokConfigured
            : this.configuration.instagramConfigured;
        const connection = connections.find(
          (item) => item.provider === provider,
        );

        if (!connection) {
          return {
            provider,
            configured,
            status: configured ? "disconnected" : "unavailable",
          };
        }

        return {
          ...connection,
          configured,
          expiresAt: connection.expiresAt?.toISOString() ?? null,
          lastSyncAt: connection.lastSyncAt?.toISOString() ?? null,
        };
      }),
    });
  }

  startTikTok(): { url: string } {
    if (!this.configuration.tiktokConfigured || !this.tiktokClient) {
      throw new ServiceUnavailableException(TIKTOK_UNAVAILABLE_MESSAGE);
    }
    return { url: this.tiktokClient.createAuthorizationUrl(randomUUID()) };
  }

  async disconnect(principal: AuthPrincipal, connectionId: string) {
    const context = await this.workspaces.resolve(principal);
    const disconnected = await this.repository.disconnect(
      context.workspaceId,
      connectionId,
    );
    if (!disconnected) {
      throw new NotFoundException("Social connection was not found");
    }
    return { disconnected: true };
  }
}
