import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { WorkspacesModule } from "../workspaces/workspaces.module.js";
import { CloudTasksGenerationQueue } from "./cloud-tasks-generation-queue.js";
import { GENERATION_QUEUE, type GenerationQueue } from "./generation-queue.js";
import { GenerationJobEnqueueService } from "./generation-job-enqueue.service.js";
import { JobsController } from "./jobs.controller.js";
import { JOBS_REPOSITORY } from "./jobs.repository.js";
import { JobsService } from "./jobs.service.js";
import { NeonJobsRepository } from "./neon-jobs.repository.js";

@Module({
  imports: [WorkspacesModule],
  controllers: [JobsController],
  providers: [
    JobsService,
    GenerationJobEnqueueService,
    NeonJobsRepository,
    { provide: JOBS_REPOSITORY, useExisting: NeonJobsRepository },
    {
      provide: GENERATION_QUEUE,
      inject: [ConfigService],
      useFactory: (config: ConfigService): GenerationQueue =>
        new CloudTasksGenerationQueue(config),
    },
  ],
  exports: [JOBS_REPOSITORY, GENERATION_QUEUE, GenerationJobEnqueueService],
})
export class JobsModule {}
