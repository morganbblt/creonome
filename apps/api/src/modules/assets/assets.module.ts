import { Module } from "@nestjs/common";
import { WorkspacesModule } from "../workspaces/workspaces.module.js";
import { AssetsController } from "./assets.controller.js";
import { ASSETS_REPOSITORY } from "./assets.repository.js";
import { AssetsService } from "./assets.service.js";
import { NeonAssetsRepository } from "./neon-assets.repository.js";

@Module({
  imports: [WorkspacesModule],
  controllers: [AssetsController],
  providers: [
    AssetsService,
    NeonAssetsRepository,
    { provide: ASSETS_REPOSITORY, useExisting: NeonAssetsRepository },
  ],
})
export class AssetsModule {}
