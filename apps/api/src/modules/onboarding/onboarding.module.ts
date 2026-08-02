import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenAI } from "@google/genai";
import { WorkspacesModule } from "../workspaces/workspaces.module.js";
import { NeonOnboardingRepository } from "./neon-onboarding.repository.js";
import { OnboardingController } from "./onboarding.controller.js";
import { ONBOARDING_INTELLIGENCE } from "./onboarding-intelligence.js";
import { ONBOARDING_REPOSITORY } from "./onboarding.repository.js";
import { OnboardingService } from "./onboarding.service.js";
import { VertexOnboardingIntelligence } from "./vertex-onboarding.intelligence.js";

@Module({
  imports: [WorkspacesModule],
  controllers: [OnboardingController],
  providers: [
    OnboardingService,
    NeonOnboardingRepository,
    {
      provide: ONBOARDING_REPOSITORY,
      useExisting: NeonOnboardingRepository,
    },
    {
      provide: ONBOARDING_INTELLIGENCE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const client = new GoogleGenAI({
          vertexai: true,
          project: config.get<string>("GOOGLE_CLOUD_PROJECT") ?? "creonome",
          location: config.get<string>("GOOGLE_CLOUD_LOCATION") ?? "global",
        });
        return new VertexOnboardingIntelligence(
          client,
          config.get<string>("VERTEX_AI_MODEL") ?? "gemini-3.5-flash",
        );
      },
    },
  ],
})
export class OnboardingModule {}
