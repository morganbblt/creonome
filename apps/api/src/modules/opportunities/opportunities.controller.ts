import { Body, Controller, Get, Headers, Inject, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type {
  OpportunityBatch,
  OpportunityDetail,
  OpportunityRevision,
  Project,
  UpgradeOpportunityResult,
} from "@creonome/contracts";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { OpportunitiesService } from "./opportunities.service.js";
import { OpportunityGenerationService } from "./opportunity-generation.service.js";
import { CreateOpportunityBatchDto } from "./create-opportunity-batch.dto.js";
import { ModifyOpportunityDto } from "./modify-opportunity.dto.js";
import { OpportunityWorkflowService } from "./opportunity-workflow.service.js";
import { UpgradeOpportunityDto } from "./upgrade-opportunity.dto.js";

@ApiTags("opportunities")
@ApiBearerAuth()
@Controller({ path: "opportunities", version: "1" })
export class OpportunitiesController {
  constructor(
    @Inject(OpportunitiesService)
    private readonly opportunities: OpportunitiesService,
    @Inject(OpportunityGenerationService)
    private readonly generation: OpportunityGenerationService,
    @Inject(OpportunityWorkflowService)
    private readonly workflow: OpportunityWorkflowService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Get the current three-opportunity creative batch" })
  @ApiOkResponse({ description: "Exactly three differentiated opportunities" })
  getCurrent(@CurrentUser() principal: AuthPrincipal): Promise<OpportunityBatch> {
    return this.opportunities.getCurrent(principal);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get one workspace-scoped opportunity" })
  getById(
    @CurrentUser() principal: AuthPrincipal,
    @Param("id") opportunityId: string,
  ): Promise<OpportunityDetail> {
    return this.opportunities.getById(principal, opportunityId);
  }

  @Post(":id/modify")
  @ApiOperation({ summary: "Create a reversible project revision from chat" })
  modify(
    @CurrentUser() principal: AuthPrincipal,
    @Param("id") opportunityId: string,
    @Body() input: ModifyOpportunityDto,
  ): Promise<OpportunityRevision> {
    return this.workflow.modify(principal, opportunityId, input);
  }

  @Post(":id/upgrade")
  @ApiOperation({ summary: "Confirm credits and upgrade an idea to a script" })
  upgrade(
    @CurrentUser() principal: AuthPrincipal,
    @Param("id") opportunityId: string,
    @Headers("idempotency-key") idempotencyKey: string,
    @Body() input: UpgradeOpportunityDto,
  ): Promise<UpgradeOpportunityResult> {
    return this.workflow.upgrade(
      principal,
      opportunityId,
      input,
      idempotencyKey ?? "",
    );
  }

  @Post(":id/save")
  @ApiOperation({ summary: "Save an opportunity as an idempotent project" })
  save(
    @CurrentUser() principal: AuthPrincipal,
    @Param("id") opportunityId: string,
  ): Promise<Project> {
    return this.opportunities.save(principal, opportunityId);
  }

  @Post("batches")
  @ApiOperation({ summary: "Generate an idempotent three-opportunity batch" })
  generate(
    @CurrentUser() principal: AuthPrincipal,
    @Headers("idempotency-key") idempotencyKey: string,
    @Body() input: CreateOpportunityBatchDto,
  ): Promise<OpportunityBatch> {
    return this.generation.generate(principal, idempotencyKey ?? "", input.direction);
  }
}
