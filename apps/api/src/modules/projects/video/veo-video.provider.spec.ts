import type {
  GenerateVideosOperation,
  GenerateVideosParameters,
} from "@google/genai";
import { describe, expect, it, vi } from "vitest";
import type { VideoSourceRecord } from "../projects.repository.js";
import type { VideoObjectStore } from "./video-object-store.js";
import {
  VeoVideoProvider,
  type VeoGenerationClient,
} from "./veo-video.provider.js";
import { VideoProviderError } from "./video-provider.js";

const source: VideoSourceRecord = {
  project: {
    id: "0198f3a2-82dd-7000-8000-000000000020",
    opportunityId: "0198f3a2-82dd-7000-8000-000000000013",
    title: "The silence before the drop",
    status: "active",
    currentLevel: "storyboard",
    currentVersion: 3,
    updatedAt: new Date("2026-08-02T10:00:00.000Z"),
  },
  script: {
    id: "0198f3a2-82dd-7000-8000-000000000021",
    projectId: "0198f3a2-82dd-7000-8000-000000000020",
    title: "The silence before the drop",
    hook: "Hold the empty room.",
    body: "Lower the needle, then reveal the session.",
    callToAction: "What arrives after your silence?",
    caption: "The room is part of the arrangement.",
    platforms: ["tiktok", "instagram"],
    durationSeconds: 30,
  },
  storyboard: {
    id: "0198f3a2-82dd-7000-8000-000000000030",
    title: "The silence before the drop — storyboard",
    aspectRatio: "9:16",
    durationSeconds: 30,
    scenes: [
      {
        id: "0198f3a2-82dd-7000-8000-000000000031",
        position: 1,
        startSeconds: 0,
        heading: "Hold the room",
        description: "Locked close-up on the silent speaker cone.",
        shotType: "Extreme close-up",
        voiceover: "Hold the empty room.",
        onScreenText: "Before the drop",
        bRoll: null,
        transition: "Hard cut on the needle touch.",
        requiredAsset: "Studio speaker",
        sound: "Room tone",
        editingNote: "Keep the opening still.",
        referenceFrameUrl: null,
        durationSeconds: 8,
      },
    ],
  },
  creativeIdentity: {
    stageName: "Nova Sainte",
    bio: "Independent electronic artist",
    audienceDescription: "Curious producers",
    languages: ["English"],
    genres: ["ambient", "electronic"],
    dnaSummary: "Intimate studio gestures and restrained reveals.",
    traits: ["visual: cold blue studio", "tone: precise and calm"],
  },
};

function mp4(): Buffer {
  const bytes = Buffer.alloc(2_048);
  bytes.writeUInt32BE(24, 0);
  bytes.write("ftyp", 4, "ascii");
  bytes.write("isom", 8, "ascii");
  return bytes;
}

function input() {
  return {
    workspaceId: "0198f3a2-82dd-7000-8000-000000000011",
    projectId: source.project.id,
    idempotencyKey: "video-generation-0198f3a2",
    source,
  };
}

function setup(options?: {
  initial?: GenerateVideosOperation;
  polls?: GenerateVideosOperation[];
  download?: Response;
  timeoutMs?: number;
}) {
  const initial =
    options?.initial ??
    ({ name: "operations/veo-1" } as GenerateVideosOperation);
  const polls = options?.polls ?? [
    {
      name: "operations/veo-1",
      done: true,
      response: {
        generatedVideos: [
          {
            video: {
              uri: "https://generativelanguage.googleapis.com/v1beta/files/video-1:download?alt=media",
              mimeType: "video/mp4",
            },
          },
        ],
      },
    } as GenerateVideosOperation,
  ];
  const client: VeoGenerationClient = {
    generateVideos: vi.fn(
      async (_parameters: GenerateVideosParameters) => initial,
    ),
    getVideosOperation: vi.fn(async () => polls.shift() ?? initial),
  };
  const store: VideoObjectStore = {
    put: vi.fn(async ({ bytes }) => ({
      gcsUri: "gs://creonome-media/generated-videos/video-1.mp4",
      byteSize: bytes.byteLength,
    })),
    read: vi.fn(),
  };
  const download = vi.fn<typeof fetch>().mockResolvedValue(
    options?.download ??
      new Response(new Uint8Array(mp4()), {
        headers: { "Content-Type": "video/mp4" },
      }),
  );
  let now = 0;
  const provider = new VeoVideoProvider({
    apiKey: "test-only-key",
    client,
    store,
    fetch: download,
    model: "veo-3.1-fast-generate-preview",
    pollIntervalMs: 10,
    timeoutMs: options?.timeoutMs ?? 100,
    now: () => now,
    sleep: async (milliseconds) => {
      now += milliseconds;
    },
  });
  return { provider, client, store, download };
}

describe("VeoVideoProvider", () => {
  it("builds a 9:16 Veo operation, polls it, validates the MP4 and stores it", async () => {
    const { provider, client, store, download } = setup();

    await expect(provider.generate(input())).resolves.toMatchObject({
      provider: "google-gemini-api",
      model: "veo-3.1-fast-generate-preview",
      simulated: false,
      mimeType: "video/mp4",
      durationSeconds: 8,
      width: 720,
      height: 1280,
      byteSize: 2_048,
      gcsUri: "gs://creonome-media/generated-videos/video-1.mp4",
    });
    expect(client.generateVideos).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "veo-3.1-fast-generate-preview",
        source: {
          prompt: expect.stringMatching(/Nova Sainte[\s\S]*Hold the room/),
        },
        config: expect.objectContaining({
          aspectRatio: "9:16",
          durationSeconds: 8,
          numberOfVideos: 1,
          resolution: "720p",
        }),
      }),
    );
    expect(client.generateVideos).not.toHaveBeenCalledWith(
      expect.objectContaining({ prompt: expect.any(String) }),
    );
    const request = vi.mocked(client.generateVideos).mock.calls[0]?.[0];
    expect(request?.config).not.toHaveProperty("generateAudio");
    expect(download).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/generativelanguage\.googleapis\.com/),
      expect.objectContaining({
        headers: expect.objectContaining({ "x-goog-api-key": "test-only-key" }),
      }),
    );
    expect(store.put).toHaveBeenCalledWith(
      expect.objectContaining({
        objectName: expect.stringMatching(/generated-videos\/.+\.mp4$/),
        bytes: expect.any(Buffer),
      }),
    );
  });

  it("fails with a controlled timeout while an operation is still pending", async () => {
    const pending = {
      name: "operations/veo-1",
      done: false,
    } as GenerateVideosOperation;
    const { provider, store } = setup({
      initial: pending,
      polls: [pending, pending, pending],
      timeoutMs: 20,
    });

    await expect(provider.generate(input())).rejects.toMatchObject({
      code: "VEO_TIMEOUT",
    });
    expect(store.put).not.toHaveBeenCalled();
  });

  it("classifies quota refusal without leaking the provider response", async () => {
    const { provider } = setup({
      initial: {
        name: "operations/veo-1",
        done: true,
        error: { code: 429, message: "sensitive quota detail" },
      } as unknown as GenerateVideosOperation,
    });

    const failure = await provider.generate(input()).catch((error) => error);
    expect(failure).toBeInstanceOf(VideoProviderError);
    expect(failure).toMatchObject({ code: "VEO_QUOTA" });
    expect(String(failure)).not.toContain("sensitive quota detail");
  });

  it("rejects a completed operation with no usable video", async () => {
    const { provider, store } = setup({
      initial: {
        name: "operations/veo-1",
        done: true,
        response: { generatedVideos: [] },
      } as unknown as GenerateVideosOperation,
    });

    await expect(provider.generate(input())).rejects.toMatchObject({
      code: "VEO_INCOMPLETE_RESPONSE",
    });
    expect(store.put).not.toHaveBeenCalled();
  });

  it("rejects a failed or non-MP4 download before writing to GCS", async () => {
    const { provider, store } = setup({
      download: new Response("upstream unavailable", { status: 503 }),
    });

    await expect(provider.generate(input())).rejects.toMatchObject({
      code: "VEO_DOWNLOAD_FAILED",
    });
    expect(store.put).not.toHaveBeenCalled();
  });
});
