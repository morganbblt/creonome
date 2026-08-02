import type {
  GeneratedVideoArtifact,
  VideoGenerationInput,
  VideoProvider,
} from "./video-provider.js";

export class DeterministicVideoProvider implements VideoProvider {
  async generate(input: VideoGenerationInput): Promise<GeneratedVideoArtifact> {
    return {
      previewUrl: "/demo/creonome-vertical-demo.mp4",
      gcsUri: `mvp://${input.workspaceId}/${input.projectId}/${encodeURIComponent(input.idempotencyKey)}.mp4`,
      mimeType: "video/mp4",
      durationSeconds: 8,
      width: 540,
      height: 960,
      byteSize: 771_365,
      provider: "creonome",
      model: "deterministic-motion-preview-v1",
      simulated: true,
      fallbackReasonCode: null,
    };
  }
}
