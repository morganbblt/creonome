import { Body, Controller, Inject, Param, Post } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { ProjectExport } from "@creonome/contracts";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { CreateProjectExportDto } from "./create-project-export.dto.js";
import { ExportsService } from "./exports.service.js";

@ApiTags("exports")
@ApiBearerAuth()
@Controller({ path: "projects", version: "1" })
export class ExportsController {
  constructor(
    @Inject(ExportsService) private readonly exportsService: ExportsService,
  ) {}

  @Post(":id/exports")
  @ApiOperation({ summary: "Create a downloadable project export" })
  @ApiCreatedResponse({ description: "Recorded Markdown project export" })
  create(
    @CurrentUser() principal: AuthPrincipal,
    @Param("id") projectId: string,
    @Body() input: CreateProjectExportDto,
  ): Promise<ProjectExport> {
    return this.exportsService.create(principal, projectId, input);
  }
}
