import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import { WorkspacesModule } from "../workspaces/workspaces.module.js";
import { IntegrationsController } from "./integrations.controller.js";
import { INTEGRATIONS_REPOSITORY } from "./integrations.repository.js";
import { IntegrationsService } from "./integrations.service.js";
import { NeonIntegrationsRepository } from "./neon-integrations.repository.js";
import { TikTokOAuthClient } from "./tiktok-oauth.client.js";

@Module({
  imports: [WorkspacesModule],
  controllers: [IntegrationsController],
  providers: [
    NeonIntegrationsRepository,
    {
      provide: INTEGRATIONS_REPOSITORY,
      useExisting: NeonIntegrationsRepository,
    },
    {
      provide: IntegrationsService,
      inject: [WorkspaceContextService, INTEGRATIONS_REPOSITORY, ConfigService],
      useFactory: (
        workspaces: WorkspaceContextService,
        repository: NeonIntegrationsRepository,
        config: ConfigService,
      ) => {
        const enabled =
          config.get<boolean>("FEATURE_SOCIAL_CONNECTIONS") ?? false;
        const tiktokClientKey = config.get<string>("TIKTOK_CLIENT_KEY");
        const tiktokClientSecret = config.get<string>("TIKTOK_CLIENT_SECRET");
        const tiktokRedirectUri = config.get<string>("TIKTOK_REDIRECT_URI");
        const tiktokConfigured = Boolean(
          enabled && tiktokClientKey && tiktokClientSecret && tiktokRedirectUri,
        );
        const tiktokClient = tiktokConfigured
          ? new TikTokOAuthClient({
              clientKey: tiktokClientKey as string,
              clientSecret: tiktokClientSecret as string,
              redirectUri: tiktokRedirectUri as string,
            })
          : null;

        return new IntegrationsService(
          workspaces,
          repository,
          {
            tiktokConfigured,
            instagramConfigured: Boolean(
              enabled &&
              config.get("META_APP_ID") &&
              config.get("META_APP_SECRET") &&
              config.get("META_REDIRECT_URI"),
            ),
          },
          tiktokClient,
        );
      },
    },
  ],
})
export class IntegrationsModule {}
