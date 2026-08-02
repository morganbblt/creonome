import { createHash } from "node:crypto";
import type {
  GenerateVideosOperation,
  GenerateVideosParameters,
} from "@google/genai";
import type { VideoObjectStore } from "./video-object-store.js";
import {
  type GeneratedVideoArtifact,
  type VideoGenerationInput,
  type VideoProvider,
  VideoProviderError,
} from "./video-provider.js";

const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const MIN_VIDEO_BYTES = 1_024;

export interface VeoGenerationClient {
  generateVideos(
    parameters: GenerateVideosParameters,
  ): Promise<GenerateVideosOperation>;
  getVideosOperation(
    operation: GenerateVideosOperation,
  ): Promise<GenerateVideosOperation>;
}

type VeoVideoProviderOptions = {
  apiKey?: string;
  client: VeoGenerationClient;
  store: VideoObjectStore;
  fetch?: typeof fetch;
  model?: string;
  provider?: "google-gemini-api" | "google-vertex-ai";
  pollIntervalMs?: number;
  timeoutMs?: number;
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
};

function bounded(value: string | null | undefined, limit: number): string {
  return (value ?? "none").replace(/\s+/g, " ").trim().slice(0, limit);
}

export function buildVeoPrompt(input: VideoGenerationInput): string {
  const { source } = input;
  const identity = source.creativeIdentity;
  const scenes = source.storyboard.scenes
    .slice(0, 8)
    .map((scene) => {
      const end = scene.startSeconds + (scene.durationSeconds ?? 0);
      return [
        `Scene ${scene.position} [${scene.startSeconds}s-${end}s]: ${bounded(scene.heading, 120)}.`,
        `Frame: ${bounded(scene.shotType, 120)}. Action: ${bounded(scene.description, 500)}.`,
        `Voiceover: ${bounded(scene.voiceover, 240)}. On-screen text: ${bounded(scene.onScreenText, 160)}.`,
        `Sound: ${bounded(scene.sound, 240)}. Transition/edit: ${bounded(scene.transition, 180)}; ${bounded(scene.editingNote, 240)}.`,
      ].join(" ");
    })
    .join("\n");

  return [
    "Create one coherent, production-usable 8-second vertical music-creator video for TikTok and Instagram Reels.",
    "Output requirements: portrait 9:16, 720p, cinematic natural motion, a single visually continuous idea, safe title area, no logos, no watermarks, no subtitles added beyond explicitly requested on-screen text.",
    "Compress the longer storyboard into its strongest 8-second arc while preserving chronological intent. Favor achievable studio action over surreal spectacle. Do not introduce people other than the described adult creator.",
    `Creative identity — artist: ${bounded(identity.stageName, 120)}; bio: ${bounded(identity.bio, 240)}; audience: ${bounded(identity.audienceDescription, 240)}; genres: ${bounded(identity.genres.join(", "), 200)}; languages: ${bounded(identity.languages.join(", "), 120)}.`,
    `Creator DNA: ${bounded(identity.dnaSummary, 500)}. Traits: ${bounded(identity.traits.join("; "), 500)}.`,
    `Script — title: ${bounded(source.script.title, 160)}. Hook: ${bounded(source.script.hook, 300)}. Body: ${bounded(source.script.body, 1_200)}. CTA: ${bounded(source.script.callToAction, 240)}.`,
    `Storyboard (${bounded(source.storyboard.aspectRatio, 24)}, ${source.storyboard.durationSeconds ?? "unknown"} seconds):`,
    scenes,
    "Audio: create synchronized, original ambience and sound design that follows the storyboard; do not imitate a named artist or copyrighted recording.",
  ].join("\n");
}

function classifyProviderError(error: unknown): string {
  if (error instanceof VideoProviderError) return error.code;
  const candidate = error as {
    code?: unknown;
    status?: unknown;
    name?: unknown;
  };
  const code = Number(candidate?.code ?? candidate?.status);
  if (code === 429 || code === 8) return "VEO_QUOTA";
  if (code === 401 || code === 403 || code === 7 || code === 16) {
    return "VEO_PERMISSION";
  }
  if (candidate?.name === "AbortError") return "VEO_TIMEOUT";
  return "VEO_REQUEST_FAILED";
}

function operationFailureCode(operation: GenerateVideosOperation): string {
  const code = Number(operation.error?.code);
  if (code === 429 || code === 8) return "VEO_QUOTA";
  if (code === 401 || code === 403 || code === 7 || code === 16) {
    return "VEO_PERMISSION";
  }
  if (
    (operation.response?.raiMediaFilteredCount ?? 0) > 0 ||
    (operation.response?.raiMediaFilteredReasons?.length ?? 0) > 0
  ) {
    return "VEO_SAFETY_FILTERED";
  }
  return "VEO_OPERATION_FAILED";
}

function assertMp4(bytes: Buffer, contentType: string | null): void {
  if (
    bytes.byteLength < MIN_VIDEO_BYTES ||
    bytes.byteLength > MAX_VIDEO_BYTES ||
    !contentType?.toLowerCase().startsWith("video/mp4") ||
    bytes.subarray(0, 32).indexOf(Buffer.from("ftyp")) < 0
  ) {
    throw new VideoProviderError("VEO_INVALID_MP4");
  }
}

export class VeoVideoProvider implements VideoProvider {
  private readonly fetch: typeof fetch;
  private readonly model: string;
  private readonly provider: "google-gemini-api" | "google-vertex-ai";
  private readonly pollIntervalMs: number;
  private readonly timeoutMs: number;
  private readonly now: () => number;
  private readonly sleep: (milliseconds: number) => Promise<void>;

  constructor(private readonly options: VeoVideoProviderOptions) {
    this.fetch = options.fetch ?? globalThis.fetch;
    this.model = options.model ?? "veo-3.1-fast-generate-preview";
    this.provider = options.provider ?? "google-gemini-api";
    this.pollIntervalMs = options.pollIntervalMs ?? 10_000;
    this.timeoutMs = options.timeoutMs ?? 240_000;
    this.now = options.now ?? Date.now;
    this.sleep =
      options.sleep ??
      ((milliseconds) =>
        new Promise((resolve) => setTimeout(resolve, milliseconds)));
  }

  async generate(input: VideoGenerationInput): Promise<GeneratedVideoArtifact> {
    const deadline = this.now() + this.timeoutMs;
    const abort = new AbortController();
    let operation: GenerateVideosOperation;

    try {
      operation = await this.withDeadline(
        this.options.client.generateVideos({
          model: this.model,
          source: {
            prompt: buildVeoPrompt(input),
          },
          config: {
            abortSignal: abort.signal,
            numberOfVideos: 1,
            durationSeconds: 8,
            aspectRatio: "9:16",
            resolution: "720p",
            personGeneration: "allow_adult",
            enhancePrompt: true,
            negativePrompt:
              "landscape, horizontal framing, letterboxing, watermark, logo, duplicated limbs, distorted hands, unreadable text, copyrighted character, unsafe content",
          },
        }),
        deadline,
        abort,
      );
    } catch (error) {
      throw new VideoProviderError(classifyProviderError(error), {
        cause: error,
      });
    }

    try {
      while (!operation.done) {
        const remaining = deadline - this.now();
        if (remaining <= 0) {
          abort.abort();
          throw new VideoProviderError("VEO_TIMEOUT");
        }
        await this.sleep(Math.min(this.pollIntervalMs, remaining));
        if (this.now() >= deadline) {
          abort.abort();
          throw new VideoProviderError("VEO_TIMEOUT");
        }
        operation = await this.withDeadline(
          this.options.client.getVideosOperation(operation),
          deadline,
          abort,
        );
      }
    } catch (error) {
      abort.abort();
      throw new VideoProviderError(classifyProviderError(error), {
        cause: error,
      });
    }

    if (operation.error) {
      throw new VideoProviderError(operationFailureCode(operation));
    }

    const generated = operation.response?.generatedVideos?.[0]?.video;
    if (!generated || (!generated.uri && !generated.videoBytes)) {
      const filtered = operationFailureCode(operation);
      throw new VideoProviderError(
        filtered === "VEO_SAFETY_FILTERED"
          ? filtered
          : "VEO_INCOMPLETE_RESPONSE",
      );
    }

    let bytes: Buffer;
    if (generated.videoBytes) {
      bytes = Buffer.from(generated.videoBytes, "base64");
      assertMp4(bytes, generated.mimeType ?? "video/mp4");
    } else {
      bytes = await this.downloadVideo(generated.uri!, deadline, abort);
    }

    const digest = createHash("sha256")
      .update(input.idempotencyKey)
      .digest("hex")
      .slice(0, 32);
    let stored;
    try {
      stored = await this.withDeadline(
        this.options.store.put({
          objectName: `generated-videos/${input.workspaceId}/${input.projectId}/${digest}.mp4`,
          bytes,
          metadata: {
            provider: this.provider,
            model: this.model,
            projectId: input.projectId,
            aspectRatio: "9:16",
            simulated: "false",
          },
        }),
        deadline,
        abort,
      );
    } catch (error) {
      throw new VideoProviderError(
        error instanceof VideoProviderError ? error.code : "VEO_STORAGE_FAILED",
        { cause: error },
      );
    }

    if (stored.byteSize !== bytes.byteLength) {
      throw new VideoProviderError("VEO_GCS_VERIFICATION_FAILED");
    }

    return {
      previewUrl: `/api/creonome/projects/${input.projectId}/video`,
      gcsUri: stored.gcsUri,
      mimeType: "video/mp4",
      durationSeconds: 8,
      width: 720,
      height: 1280,
      byteSize: stored.byteSize,
      provider: this.provider,
      model: this.model,
      simulated: false,
      fallbackReasonCode: null,
    };
  }

  private async downloadVideo(
    uri: string,
    deadline: number,
    abort: AbortController,
  ): Promise<Buffer> {
    let url: URL;
    try {
      url = new URL(uri);
    } catch {
      throw new VideoProviderError("VEO_INCOMPLETE_RESPONSE");
    }
    if (
      url.protocol !== "https:" ||
      url.hostname !== "generativelanguage.googleapis.com"
    ) {
      throw new VideoProviderError("VEO_UNTRUSTED_DOWNLOAD_URI");
    }
    if (!this.options.apiKey) {
      throw new VideoProviderError("VEO_DOWNLOAD_AUTH_UNAVAILABLE");
    }
    if (this.now() >= deadline) {
      throw new VideoProviderError("VEO_TIMEOUT");
    }

    let response: Response;
    try {
      response = await this.withDeadline(
        this.fetch(url.toString(), {
          method: "GET",
          redirect: "follow",
          signal: abort.signal,
          headers: { "x-goog-api-key": this.options.apiKey },
        }),
        deadline,
        abort,
      );
    } catch (error) {
      throw new VideoProviderError(classifyProviderError(error), {
        cause: error,
      });
    }
    if (!response.ok) {
      throw new VideoProviderError("VEO_DOWNLOAD_FAILED");
    }
    const declaredSize = Number(response.headers.get("content-length") ?? 0);
    if (declaredSize > MAX_VIDEO_BYTES) {
      throw new VideoProviderError("VEO_INVALID_MP4");
    }
    const bytes = Buffer.from(
      await this.withDeadline(response.arrayBuffer(), deadline, abort),
    );
    assertMp4(bytes, response.headers.get("content-type"));
    return bytes;
  }

  private async withDeadline<T>(
    promise: Promise<T>,
    deadline: number,
    abort?: AbortController,
  ): Promise<T> {
    const remaining = deadline - this.now();
    if (remaining <= 0) {
      abort?.abort();
      throw new VideoProviderError("VEO_TIMEOUT");
    }
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(() => {
            abort?.abort();
            reject(new VideoProviderError("VEO_TIMEOUT"));
          }, remaining);
          timeout.unref?.();
        }),
      ]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
}
