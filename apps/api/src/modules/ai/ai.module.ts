import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenAI } from "@google/genai";
import { GeminiStructuredGenerator } from "./gemini-structured.generator.js";
import { STRUCTURED_GENERATOR } from "./structured-generator.js";
import { UnavailableStructuredGenerator } from "./unavailable-structured.generator.js";
import { VertexStructuredGenerator } from "./vertex-structured.generator.js";

@Module({
  providers: [
    {
      provide: STRUCTURED_GENERATOR,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const project = config.get<string>("GOOGLE_CLOUD_PROJECT");
        const apiKey = config.get<string>("GEMINI_API_KEY");
        const model = config.get<string>("GEMINI_MODEL") ?? "gemini-3.5-flash";
        if (config.get<string>("NODE_ENV") !== "production" && apiKey) {
          return new GeminiStructuredGenerator({ apiKey, model });
        }
        if (project) {
          return new VertexStructuredGenerator(
            new GoogleGenAI({
              vertexai: true,
              project,
              location: config.get<string>("GOOGLE_CLOUD_LOCATION") ?? "global",
            }),
            config.get<string>("VERTEX_AI_MODEL") ?? "gemini-3.5-flash",
          );
        }
        return apiKey
          ? new GeminiStructuredGenerator({ apiKey, model })
          : new UnavailableStructuredGenerator();
      },
    },
  ],
  exports: [STRUCTURED_GENERATOR],
})
export class AiModule {}
