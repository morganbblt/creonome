import { Module } from "@nestjs/common";
import { WorkspacesModule } from "../workspaces/workspaces.module.js";
import { AiModule } from "../ai/ai.module.js";
import { CreatorDnaModule } from "../creator-dna/creator-dna.module.js";
import { CreditsModule } from "../credits/credits.module.js";
import { MemoryModule } from "../memory/memory.module.js";
import { NeonOpportunitiesRepository } from "./neon-opportunities.repository.js";
import { OpportunitiesController } from "./opportunities.controller.js";
import { OPPORTUNITIES_REPOSITORY } from "./opportunities.repository.js";
import { OpportunitiesService } from "./opportunities.service.js";
import { OpportunityGenerationService } from "./opportunity-generation.service.js";
import { OpportunityWorkflowService } from "./opportunity-workflow.service.js";

@Module({
  imports: [AiModule, CreatorDnaModule, CreditsModule, MemoryModule, WorkspacesModule],
  controllers: [OpportunitiesController],
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
})
export class OpportunitiesModule {}
