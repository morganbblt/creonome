import type { VideoSourceRecord } from "../projects.repository.js";

export type VideoProviderMode = "auto" | "veo" | "deterministic";

export type VideoGenerationInput = {
  workspaceId: string;
  projectId: string;
  idempotencyKey: string;
  source: VideoSourceRecord;
};

export type GeneratedVideoArtifact = {
  previewUrl: string;
  gcsUri: string;
  mimeType: "video/mp4";
  durationSeconds: number;
  width: number;
  height: number;
  byteSize: number | null;
  provider: string;
  model: string;
  simulated: boolean;
  fallbackReasonCode: string | null;
};

export interface VideoProvider {
  generate(input: VideoGenerationInput): Promise<GeneratedVideoArtifact>;
}

export class VideoProviderError extends Error {
  constructor(
    readonly code: string,
    options?: { cause?: unknown },
  ) {
    super(code, options);
    this.name = "VideoProviderError";
  }
}

export const VIDEO_PROVIDER = Symbol("VIDEO_PROVIDER");
