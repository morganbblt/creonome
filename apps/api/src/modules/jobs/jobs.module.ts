import { Module } from "@nestjs/common";
import { WorkspacesModule } from "../workspaces/workspaces.module.js";
import { JobsController } from "./jobs.controller.js";
import { JOBS_REPOSITORY } from "./jobs.repository.js";
import { JobsService } from "./jobs.service.js";
import { NeonJobsRepository } from "./neon-jobs.repository.js";

@Module({
  imports: [WorkspacesModule],
  controllers: [JobsController],
  providers: [
    JobsService,
    NeonJobsRepository,
    { provide: JOBS_REPOSITORY, useExisting: NeonJobsRepository },
  ],
})
export class JobsModule {}
