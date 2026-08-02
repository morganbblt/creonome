import { Logger } from "@nestjs/common";
import type {
  GeneratedVideoArtifact,
  VideoGenerationInput,
  VideoProvider,
  VideoProviderMode,
} from "./video-provider.js";
import { VideoProviderError } from "./video-provider.js";

function safeFailureCode(error: unknown): string {
  return error instanceof VideoProviderError
    ? error.code
    : "VEO_UNEXPECTED_FAILURE";
}

export class ResilientVideoProvider implements VideoProvider {
  private readonly logger = new Logger(ResilientVideoProvider.name);

  constructor(
    private readonly mode: VideoProviderMode,
    private readonly veo: VideoProvider,
    private readonly deterministic: VideoProvider,
  ) {}

  async generate(input: VideoGenerationInput): Promise<GeneratedVideoArtifact> {
    if (this.mode === "deterministic") {
      return this.deterministic.generate(input);
    }

    try {
      return await this.veo.generate(input);
    } catch (error) {
      const reason = safeFailureCode(error);
      this.logger.warn(
        `Veo render unavailable; switching to deterministic fallback (${reason})`,
      );
      const fallback = await this.deterministic.generate(input);
      return { ...fallback, fallbackReasonCode: reason };
    }
  }
}
