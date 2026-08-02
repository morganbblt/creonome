import { Module } from "@nestjs/common";
import { WorkspacesModule } from "../workspaces/workspaces.module.js";
import { CreatorDnaController } from "./creator-dna.controller.js";
import { CREATOR_DNA_REPOSITORY } from "./creator-dna.repository.js";
import { CreatorDnaService } from "./creator-dna.service.js";
import { NeonCreatorDnaRepository } from "./neon-creator-dna.repository.js";

@Module({
  imports: [WorkspacesModule],
  controllers: [CreatorDnaController],
  providers: [
    CreatorDnaService,
    NeonCreatorDnaRepository,
    {
      provide: CREATOR_DNA_REPOSITORY,
      useExisting: NeonCreatorDnaRepository,
    },
  ],
  exports: [CreatorDnaService],
})
export class CreatorDnaModule {}
