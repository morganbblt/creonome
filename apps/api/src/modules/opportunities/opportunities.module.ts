import { Module } from "@nestjs/common";
import { WorkspacesModule } from "../workspaces/workspaces.module.js";
import { AiModule } from "../ai/ai.module.js";
import { CreatorDnaModule } from "../creator-dna/creator-dna.module.js";
import { CreditsModule } from "../credits/credits.module.js";
import { JobsModule } from "../jobs/jobs.module.js";
import { MemoryModule } from "../memory/memory.module.js";
import { QualityGateModule } from "../quality-gate/quality-gate.module.js";
import { InternalOpportunityJobsController } from "./internal-opportunity-jobs.controller.js";
import { NeonOpportunitiesRepository } from "./neon-opportunities.repository.js";
import { OpportunitiesController } from "./opportunities.controller.js";
import { OPPORTUNITIES_REPOSITORY } from "./opportunities.repository.js";
import { OpportunitiesService } from "./opportunities.service.js";
import { OpportunityGenerationService } from "./opportunity-generation.service.js";
import { OpportunityWorkflowService } from "./opportunity-workflow.service.js";

@Module({
  imports: [
    AiModule,
    CreatorDnaModule,
    CreditsModule,
    JobsModule,
    MemoryModule,
    QualityGateModule,
    WorkspacesModule,
  ],
  controllers: [OpportunitiesController, InternalOpportunityJobsController],
  providers: [
    OpportunitiesService,
    OpportunityGenerationService,
    OpportunityWorkflowService,
    NeonOpportunitiesRepository,
    {
      provide: OPPORTUNITIES_REPOSITORY,
      useExisting: NeonOpportunitiesRepository,
    },
  ],
  exports: [OpportunityGenerationService, OpportunityWorkflowService],
})
export class OpportunitiesModule {}
