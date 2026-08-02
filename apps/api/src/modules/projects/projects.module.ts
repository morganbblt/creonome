import { Module } from "@nestjs/common";
import { WorkspacesModule } from "../workspaces/workspaces.module.js";
import { NeonProjectsRepository } from "./neon-projects.repository.js";
import { ProjectsController } from "./projects.controller.js";
import { PROJECTS_REPOSITORY } from "./projects.repository.js";
import { ProjectsService } from "./projects.service.js";

@Module({
  imports: [WorkspacesModule],
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    NeonProjectsRepository,
    {
      provide: PROJECTS_REPOSITORY,
      useExisting: NeonProjectsRepository,
    },
  ],
})
export class ProjectsModule {}
