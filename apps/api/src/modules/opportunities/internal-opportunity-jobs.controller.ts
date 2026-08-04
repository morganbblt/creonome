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
import { JOBS_REPOSITORY, type JobsRepository } from "../jobs/jobs.repository.js";
import { OpportunityGenerationService } from "./opportunity-generation.service.js";
import { OpportunityWorkflowService } from "./opportunity-workflow.service.js";

/**
 * Cloud Tasks push target for generation_jobs of kind "opportunity_batch"
 * and "script". Not reachable by end users: gated the same way as every
 * other service-to-service endpoint in this codebase (see
 * ../privacy/privacy.controller.ts for the sibling pattern).
 */
@ApiTags("internal")
@Public()
@UseGuards(InternalJobAuthGuard)
@Controller({ path: "internal/opportunity-jobs", version: "1" })
export class InternalOpportunityJobsController {
  constructor(
    @Inject(OpportunityGenerationService)
    private readonly generation: OpportunityGenerationService,
    @Inject(OpportunityWorkflowService)
    private readonly workflow: OpportunityWorkflowService,
    @Inject(JOBS_REPOSITORY)
    private readonly jobs: JobsRepository,
  ) {}

  @Post(":jobId/execute")
  @ApiOperation({
    summary: "Execute a queued opportunity generation job (internal only)",
  })
  async execute(
    @Param("jobId", new ParseUUIDPipe()) jobId: string,
  ): Promise<{ jobId: string }> {
    const job = await this.jobs.findByIdUnscoped(jobId);
    if (!job) {
      throw new NotFoundException("Generation job was not found");
    }
    switch (job.kind) {
      case "opportunity_batch":
        await this.generation.executeQueuedBatch(jobId);
        break;
      case "script":
        await this.workflow.executeQueuedScriptUpgrade(jobId);
        break;
      default:
        throw new NotFoundException(
          `No handler is registered for generation kind "${job.kind}"`,
        );
    }
    return { jobId };
  }
}
