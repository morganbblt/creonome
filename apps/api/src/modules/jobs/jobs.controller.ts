import { Controller, Get, Inject, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { JobsService } from "./jobs.service.js";

@ApiTags("jobs")
@ApiBearerAuth()
@Controller({ path: "jobs", version: "1" })
export class JobsController {
  constructor(@Inject(JobsService) private readonly jobs: JobsService) {}

  @Get(":id")
  @ApiOperation({ summary: "Get an observable generation job" })
  get(
    @CurrentUser() principal: AuthPrincipal,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.jobs.get(principal, id);
  }

  @Post(":id/cancel")
  @ApiOperation({ summary: "Cancel a queued or running job" })
  cancel(
    @CurrentUser() principal: AuthPrincipal,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.jobs.cancel(principal, id);
  }

  @Post(":id/retry")
  @ApiOperation({ summary: "Retry a failed or cancelled job" })
  retry(
    @CurrentUser() principal: AuthPrincipal,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.jobs.retry(principal, id);
  }
}
