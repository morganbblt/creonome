import { Module } from "@nestjs/common";
import { WorkspacesModule } from "../workspaces/workspaces.module.js";
import { CreditsController } from "./credits.controller.js";
import { CREDITS_REPOSITORY } from "./credits.repository.js";
import { CreditsService } from "./credits.service.js";
import { NeonCreditsRepository } from "./neon-credits.repository.js";

@Module({
  imports: [WorkspacesModule],
  controllers: [CreditsController],
  providers: [
    CreditsService,
    NeonCreditsRepository,
    { provide: CREDITS_REPOSITORY, useExisting: NeonCreditsRepository },
  ],
  exports: [CreditsService, CREDITS_REPOSITORY],
})
export class CreditsModule {}
