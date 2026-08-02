import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GeminiStructuredGenerator } from "./gemini-structured.generator.js";
import { STRUCTURED_GENERATOR } from "./structured-generator.js";
import { UnavailableStructuredGenerator } from "./unavailable-structured.generator.js";

@Module({
  providers: [
    {
      provide: STRUCTURED_GENERATOR,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const apiKey = config.get<string>("GEMINI_API_KEY");
        return apiKey
          ? new GeminiStructuredGenerator({
              apiKey,
              model: config.get<string>("GEMINI_MODEL") ?? "gemini-3.6-flash",
            })
          : new UnavailableStructuredGenerator();
      },
    },
  ],
  exports: [STRUCTURED_GENERATOR],
})
export class AiModule {}
