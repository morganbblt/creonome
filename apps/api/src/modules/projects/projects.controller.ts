import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type {
  ProjectDetail,
  ProjectList,
  UpgradeProjectResult,
} from "@creonome/contracts";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { ProjectWorkflowService } from "./project-workflow.service.js";
import { ProjectsService } from "./projects.service.js";
import { UpgradeProjectDto } from "./upgrade-project.dto.js";

@ApiTags("projects")
@ApiBearerAuth()
@Controller({ path: "projects", version: "1" })
export class ProjectsController {
  constructor(
    @Inject(ProjectsService)
    private readonly projects: ProjectsService,
    @Inject(ProjectWorkflowService)
    private readonly workflow: ProjectWorkflowService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List the current workspace projects" })
  @ApiOkResponse({ description: "Projects ordered by their latest change" })
  list(@CurrentUser() principal: AuthPrincipal): Promise<ProjectList> {
    return this.projects.list(principal);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get one project and its latest deliverables" })
  get(
    @CurrentUser() principal: AuthPrincipal,
    @Param("id") projectId: string,
  ): Promise<ProjectDetail> {
    return this.projects.get(principal, projectId);
  }

  @Post(":id/upgrade")
  @ApiOperation({
    summary: "Confirm credits and upgrade a script to a storyboard",
  })
  @ApiOkResponse({
    description: "Persisted storyboard and updated credit balance",
  })
  upgrade(
    @CurrentUser() principal: AuthPrincipal,
    @Param("id") projectId: string,
    @Headers("idempotency-key") idempotencyKey: string,
    @Body() input: UpgradeProjectDto,
  ): Promise<UpgradeProjectResult> {
    return this.workflow.upgrade(
      principal,
      projectId,
      input,
      idempotencyKey ?? "",
    );
  }
}
