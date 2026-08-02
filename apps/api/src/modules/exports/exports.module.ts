import { Module } from "@nestjs/common";
import { ProjectsModule } from "../projects/projects.module.js";
import { WorkspacesModule } from "../workspaces/workspaces.module.js";
import { ExportsController } from "./exports.controller.js";
import { EXPORTS_REPOSITORY } from "./exports.repository.js";
import { ExportsService } from "./exports.service.js";
import { NeonExportsRepository } from "./neon-exports.repository.js";

@Module({
  imports: [ProjectsModule, WorkspacesModule],
  controllers: [ExportsController],
  providers: [
    ExportsService,
    NeonExportsRepository,
    {
      provide: EXPORTS_REPOSITORY,
      useExisting: NeonExportsRepository,
    },
  ],
})
export class ExportsModule {}
