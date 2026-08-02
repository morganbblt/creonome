import { describe, expect, it, vi } from "vitest";
import type {
  GeneratedVideoArtifact,
  VideoGenerationInput,
  VideoProvider,
} from "./video-provider.js";
import { VideoProviderError } from "./video-provider.js";
import { ResilientVideoProvider } from "./resilient-video.provider.js";

const input = {} as VideoGenerationInput;
const deterministic: GeneratedVideoArtifact = {
  previewUrl: "/demo/creonome-vertical-demo.mp4",
  gcsUri: "mvp://workspace/project/video.mp4",
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

describe("ResilientVideoProvider", () => {
  it("returns a real Veo artifact when Veo succeeds", async () => {
    const real = {
      ...deterministic,
      simulated: false,
      provider: "google-gemini-api",
    };
    const veo = { generate: vi.fn().mockResolvedValue(real) } as VideoProvider;
    const fallback = { generate: vi.fn() } as VideoProvider;

    await expect(
      new ResilientVideoProvider("auto", veo, fallback).generate(input),
    ).resolves.toEqual(real);
    expect(fallback.generate).not.toHaveBeenCalled();
  });

  it("atomically falls back and keeps only a safe technical reason", async () => {
    const veo = {
      generate: vi.fn().mockRejectedValue(new VideoProviderError("VEO_QUOTA")),
    } as VideoProvider;
    const fallback = {
      generate: vi.fn().mockResolvedValue(deterministic),
    } as VideoProvider;

    await expect(
      new ResilientVideoProvider("auto", veo, fallback).generate(input),
    ).resolves.toEqual({
      ...deterministic,
      fallbackReasonCode: "VEO_QUOTA",
    });
  });

  it("never contacts Veo when deterministic mode is forced", async () => {
    const veo = { generate: vi.fn() } as VideoProvider;
    const fallback = {
      generate: vi.fn().mockResolvedValue(deterministic),
    } as VideoProvider;

    await new ResilientVideoProvider("deterministic", veo, fallback).generate(
      input,
    );
    expect(veo.generate).not.toHaveBeenCalled();
  });
});
