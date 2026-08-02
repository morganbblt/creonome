import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module.js";
import { CreditsModule } from "../credits/credits.module.js";
import { WorkspacesModule } from "../workspaces/workspaces.module.js";
import { NeonProjectsRepository } from "./neon-projects.repository.js";
import { ProjectWorkflowService } from "./project-workflow.service.js";
import { ProjectsController } from "./projects.controller.js";
import { PROJECTS_REPOSITORY } from "./projects.repository.js";
import { ProjectsService } from "./projects.service.js";

@Module({
  imports: [AiModule, CreditsModule, WorkspacesModule],
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    ProjectWorkflowService,
    NeonProjectsRepository,
    {
      provide: PROJECTS_REPOSITORY,
      useExisting: NeonProjectsRepository,
    },
  ],
  exports: [ProjectsService],
})
export class ProjectsModule {}
