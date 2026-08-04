import {
  Controller,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalJobAuthGuard } from "../auth/internal-job-auth.guard.js";
import { Public } from "../auth/public.decorator.js";
import {
  JOBS_REPOSITORY,
  type JobsRepository,
} from "../jobs/jobs.repository.js";
import { ProjectWorkflowService } from "./project-workflow.service.js";

/**
 * Cloud Tasks push target for generation_jobs of kind "storyboard" and
 * "video_render". Not reachable by end users: gated the same way as every
 * other service-to-service endpoint in this codebase (see
 * ../privacy/privacy.controller.ts for the sibling pattern).
 */
@ApiTags("internal")
@Public()
@UseGuards(InternalJobAuthGuard)
@Controller({ path: "internal/project-jobs", version: "1" })
export class InternalProjectJobsController {
  constructor(
    @Inject(ProjectWorkflowService)
    private readonly workflow: ProjectWorkflowService,
    @Inject(JOBS_REPOSITORY)
    private readonly jobs: JobsRepository,
  ) {}

  @Post(":jobId/execute")
  @ApiOperation({
    summary: "Execute a queued project generation job (internal only)",
  })
  async execute(
    @Param("jobId", new ParseUUIDPipe()) jobId: string,
  ): Promise<{ jobId: string }> {
    const job = await this.jobs.findByIdUnscoped(jobId);
    if (!job) {
      throw new NotFoundException("Generation job was not found");
    }
    switch (job.kind) {
      case "storyboard":
        await this.workflow.executeQueuedStoryboardUpgrade(jobId);
        break;
      case "video_render":
        await this.workflow.executeQueuedVideoUpgrade(jobId);
        break;
      default:
        throw new NotFoundException(
          `No handler is registered for generation kind "${job.kind}"`,
        );
    }
    return { jobId };
  }
}
