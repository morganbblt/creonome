import { Controller, Get, Inject, Param } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { ProjectDetail, ProjectList } from "@creonome/contracts";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { ProjectsService } from "./projects.service.js";

@ApiTags("projects")
@ApiBearerAuth()
@Controller({ path: "projects", version: "1" })
export class ProjectsController {
  constructor(
    @Inject(ProjectsService)
    private readonly projects: ProjectsService,
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
}
