import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenAI } from "@google/genai";
import { AiModule } from "../ai/ai.module.js";
import { CreditsModule } from "../credits/credits.module.js";
import { WorkspacesModule } from "../workspaces/workspaces.module.js";
import {
  PRIVATE_OBJECT_READER,
  type PrivateObjectReader,
} from "../uploads/private-object-store.js";
import { UploadsModule } from "../uploads/uploads.module.js";
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
  imports: [AiModule, CreditsModule, UploadsModule, WorkspacesModule],
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
      inject: [ConfigService, VIDEO_OBJECT_STORE, PRIVATE_OBJECT_READER],
      useFactory: (
        config: ConfigService,
        store: VideoObjectStore,
        reader: PrivateObjectReader,
      ): VideoProvider => {
        const deterministic = new DeterministicVideoProvider();
        const project = config.get<string>("GOOGLE_CLOUD_PROJECT");
        const apiKey = config.get<string>("GEMINI_API_KEY");
        const backend = config.get<string>("VEO_BACKEND") ?? "auto";
        const useVertex =
          backend === "vertex" || (backend === "auto" && Boolean(project));
        const veo: VideoProvider = useVertex
          ? (() => {
              if (!project) {
                return {
                  async generate() {
                    throw new VideoProviderError("VEO_VERTEX_NOT_CONFIGURED");
                  },
                };
              }
              const client = new GoogleGenAI({
                vertexai: true,
                project,
                location:
                  config.get<string>("VEO_VERTEX_LOCATION") ?? "us-central1",
              });
              return new VeoVideoProvider({
                store,
                readReferenceImage: (gcsUri) => reader.readObject(gcsUri),
                model:
                  config.get<string>("VEO_VERTEX_MODEL") ??
                  "veo-3.1-fast-generate-001",
                provider: "google-vertex-ai",
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
          : apiKey
            ? (() => {
                const client = new GoogleGenAI({ apiKey });
                return new VeoVideoProvider({
                  apiKey,
                  store,
                  readReferenceImage: (gcsUri) => reader.readObject(gcsUri),
                  model:
                    config.get<string>("VEO_GEMINI_MODEL") ??
                    "veo-3.1-fast-generate-preview",
                  provider: "google-gemini-api",
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
                  throw new VideoProviderError("VEO_GEMINI_NOT_CONFIGURED");
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
