import { Module } from "@nestjs/common";
import { CreatorDnaModule } from "../creator-dna/creator-dna.module.js";
import { QualityGateService } from "./quality-gate.service.js";

@Module({
  imports: [CreatorDnaModule],
  providers: [QualityGateService],
  exports: [QualityGateService],
})
export class QualityGateModule {}
