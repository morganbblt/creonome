import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenAI } from "@google/genai";
import { AiModule } from "../ai/ai.module.js";
import { CreditsModule } from "../credits/credits.module.js";
import { WorkspacesModule } from "../workspaces/workspaces.module.js";
import { NeonProjectsRepository } from "./neon-projects.repository.js";
import { ProjectWorkflowService } from "./project-workflow.service.js";
import { ProjectVideoService } from "./project-video.service.js";
import { ProjectsController } from "./projects.controller.js";
import { PROJECTS_REPOSITORY } from "./projects.repository.js";
import { ProjectsService } from "./projects.service.js";
import { DeterministicVideoProvider } from "./video/deterministic-video.provider.js";
import { GcsVideoObjectStore } from "./video/gcs-video-object.store.js";
import { ResilientVideoProvider } from "./video/resilient-video.provider.js";
import { UnavailableVideoObjectStore } from "./video/unavailable-video-object.store.js";
import {
  VIDEO_OBJECT_STORE,
  type VideoObjectStore,
} from "./video/video-object-store.js";
import {
  VIDEO_PROVIDER,
  VideoProviderError,
  type VideoProvider,
  type VideoProviderMode,
} from "./video/video-provider.js";
import { VeoVideoProvider } from "./video/veo-video.provider.js";

@Module({
  imports: [AiModule, CreditsModule, WorkspacesModule],
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    ProjectVideoService,
    ProjectWorkflowService,
    NeonProjectsRepository,
    {
      provide: PROJECTS_REPOSITORY,
      useExisting: NeonProjectsRepository,
    },
    {
      provide: VIDEO_OBJECT_STORE,
      inject: [ConfigService],
      useFactory: (config: ConfigService): VideoObjectStore => {
        const bucket = config.get<string>("GCP_MEDIA_BUCKET");
        return bucket
          ? new GcsVideoObjectStore(
              bucket,
              config.get<string>("GOOGLE_CLOUD_PROJECT") ?? "creonome",
            )
          : new UnavailableVideoObjectStore();
      },
    },
    {
      provide: VIDEO_PROVIDER,
      inject: [ConfigService, VIDEO_OBJECT_STORE],
      useFactory: (
        config: ConfigService,
        store: VideoObjectStore,
      ): VideoProvider => {
        const deterministic = new DeterministicVideoProvider();
        const apiKey = config.get<string>("GEMINI_API_KEY");
        const veo: VideoProvider = apiKey
          ? (() => {
              const client = new GoogleGenAI({ apiKey });
              return new VeoVideoProvider({
                apiKey,
                store,
                model:
                  config.get<string>("VEO_MODEL") ??
                  "veo-3.1-fast-generate-preview",
                pollIntervalMs:
                  config.get<number>("VEO_POLL_INTERVAL_MS") ?? 10_000,
                timeoutMs: config.get<number>("VEO_TIMEOUT_MS") ?? 240_000,
                client: {
                  generateVideos: (parameters) =>
                    client.models.generateVideos(parameters),
                  getVideosOperation: (operation) =>
                    client.operations.getVideosOperation({ operation }),
                },
              });
            })()
          : {
              async generate() {
                throw new VideoProviderError("VEO_NOT_CONFIGURED");
              },
            };
        return new ResilientVideoProvider(
          (config.get<string>("VIDEO_PROVIDER") ?? "auto") as VideoProviderMode,
          veo,
          deterministic,
        );
      },
    },
  ],
  exports: [ProjectsService],
})
export class ProjectsModule {}
