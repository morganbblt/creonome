import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import { WorkspacesModule } from "../workspaces/workspaces.module.js";
import { IntegrationsController } from "./integrations.controller.js";
import { INTEGRATIONS_REPOSITORY } from "./integrations.repository.js";
import { IntegrationsService } from "./integrations.service.js";
import { NeonIntegrationsRepository } from "./neon-integrations.repository.js";

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
        return new IntegrationsService(workspaces, repository, {
          tiktokConfigured: Boolean(
            enabled &&
            config.get("TIKTOK_CLIENT_KEY") &&
            config.get("TIKTOK_CLIENT_SECRET") &&
            config.get("TIKTOK_REDIRECT_URI"),
          ),
          instagramConfigured: Boolean(
            enabled &&
            config.get("META_APP_ID") &&
            config.get("META_APP_SECRET") &&
            config.get("META_REDIRECT_URI"),
          ),
        });
      },
    },
  ],
})
export class IntegrationsModule {}
