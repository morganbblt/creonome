import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NeonWorkspaceRepository } from "./neon-workspace.repository.js";
import { WorkspaceContextService } from "./workspace-context.service.js";
import { WORKSPACE_REPOSITORY } from "./workspace.repository.js";

@Module({
  providers: [
    NeonWorkspaceRepository,
    {
      provide: WORKSPACE_REPOSITORY,
      useExisting: NeonWorkspaceRepository,
    },
    {
      provide: WorkspaceContextService,
      inject: [WORKSPACE_REPOSITORY, ConfigService],
      useFactory: (
        repository: NeonWorkspaceRepository,
        config: ConfigService,
      ) =>
        new WorkspaceContextService(
          repository,
          config.get<boolean>("DEMO_MODE") ?? true,
          config.get<number>("DEFAULT_CREDIT_BALANCE") ?? 60,
        ),
    },
  ],
  exports: [WorkspaceContextService],
})
export class WorkspacesModule {}
