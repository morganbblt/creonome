import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  UpgradeProjectResultSchema,
  UpgradeVideoResultSchema,
  type UpgradeProjectInput,
  type UpgradeProjectResult,
  type UpgradeVideoResult,
} from "@creonome/contracts";
import { z } from "zod";
import {
  STRUCTURED_GENERATOR,
  type StructuredGenerator,
} from "../ai/structured-generator.js";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import { CreditsService, creditCosts } from "../credits/credits.service.js";
import { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import {
  PROJECTS_REPOSITORY,
  type GeneratedStoryboard,
  type ProjectsRepository,
  type StoryboardSourceRecord,
  type StoryboardUpgradeRecord,
  type VideoUpgradeRecord,
} from "./projects.repository.js";
import { VIDEO_PROVIDER, type VideoProvider } from "./video/video-provider.js";

const GeneratedStoryboardSceneSchema = z.object({
  heading: z.string().trim().min(1).max(160),
  description: z.string().trim().min(3).max(2_000),
  shotType: z.string().trim().min(1).max(120).nullable(),
  voiceover: z.string().trim().min(1).max(2_000).nullable(),
  onScreenText: z.string().trim().min(1).max(500).nullable(),
  bRoll: z.string().trim().min(1).max(1_000).nullable(),
  transition: z.string().trim().min(1).max(500).nullable(),
  requiredAsset: z.string().trim().min(1).max(500).nullable(),
  sound: z.string().trim().min(1).max(1_000).nullable(),
  editingNote: z.string().trim().min(1).max(1_000).nullable(),
  referenceFrameUrl: z.url().nullable(),
  durationSeconds: z.number().int().positive().max(600),
});

const GeneratedStoryboardSchema = z
  .object({
    title: z.string().trim().min(3).max(160),
    aspectRatio: z.string().trim().min(3).max(24),
    durationSeconds: z.number().int().positive().max(3_600),
    scenes: z.array(GeneratedStoryboardSceneSchema).min(3).max(8),
  })
  .refine(
    (storyboard) =>
      storyboard.scenes.reduce(
        (total, scene) => total + scene.durationSeconds,
        0,
      ) === storyboard.durationSeconds,
    { message: "Scene durations must match the storyboard duration" },
  );

const generatedStoryboardJsonSchema = {
  type: "object",
  properties: {
    title: { type: "string", minLength: 3, maxLength: 160 },
    aspectRatio: { type: "string", minLength: 3, maxLength: 24 },
    durationSeconds: { type: "integer", minimum: 1, maximum: 3_600 },
    scenes: {
      type: "array",
      minItems: 3,
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          heading: { type: "string", minLength: 1, maxLength: 160 },
          description: { type: "string", minLength: 3, maxLength: 2_000 },
          shotType: {
            type: ["string", "null"],
            minLength: 1,
            maxLength: 120,
          },
          voiceover: {
            type: ["string", "null"],
            minLength: 1,
            maxLength: 2_000,
          },
          onScreenText: {
            type: ["string", "null"],
            minLength: 1,
            maxLength: 500,
          },
          bRoll: {
            type: ["string", "null"],
            minLength: 1,
            maxLength: 1_000,
          },
          transition: {
            type: ["string", "null"],
            minLength: 1,
            maxLength: 500,
          },
          requiredAsset: {
            type: ["string", "null"],
            minLength: 1,
            maxLength: 500,
          },
          sound: {
            type: ["string", "null"],
            minLength: 1,
            maxLength: 1_000,
          },
          editingNote: {
            type: ["string", "null"],
            minLength: 1,
            maxLength: 1_000,
          },
          referenceFrameUrl: { type: ["string", "null"] },
          durationSeconds: { type: "integer", minimum: 1, maximum: 600 },
        },
        required: [
          "heading",
          "description",
          "shotType",
          "voiceover",
          "onScreenText",
          "bRoll",
          "transition",
          "requiredAsset",
          "sound",
          "editingNote",
          "referenceFrameUrl",
          "durationSeconds",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "aspectRatio", "durationSeconds", "scenes"],
  additionalProperties: false,
};

@Injectable()
export class ProjectWorkflowService {
  constructor(
    @Inject(WorkspaceContextService)
    private readonly workspaces: WorkspaceContextService,
    @Inject(PROJECTS_REPOSITORY)
    private readonly repository: ProjectsRepository,
    @Inject(CreditsService)
    private readonly credits: CreditsService,
    @Inject(STRUCTURED_GENERATOR)
    private readonly generator: StructuredGenerator,
    @Inject(VIDEO_PROVIDER)
    private readonly videoProvider: VideoProvider,
  ) {}

  async upgrade(
    principal: AuthPrincipal,
    projectId: string,
    _input: UpgradeProjectInput,
    idempotencyKey: string,
  ): Promise<UpgradeProjectResult | UpgradeVideoResult> {
    const normalizedKey = idempotencyKey.trim();
    if (normalizedKey.length < 8 || normalizedKey.length > 180) {
      throw new BadRequestException(
        "A valid Idempotency-Key header is required",
      );
    }

    const context = await this.workspaces.resolve(principal);
    if (_input.targetLevel === "video") {
      return this.upgradeVideo(context, projectId, normalizedKey, principal);
    }
    const idempotent = await this.repository.findStoryboardUpgradeByIdempotency(
      context.workspaceId,
      normalizedKey,
    );
    if (idempotent) {
      const credits = await this.credits.commit(
        context.workspaceId,
        creditCosts.storyboard,
        `${normalizedKey}:commit`,
        `Committed ${creditCosts.storyboard} credits for storyboard generation`,
      );
      return this.toContract(idempotent, credits);
    }

    const existing = await this.repository.findExistingStoryboardUpgrade(
      context.workspaceId,
      projectId,
    );
    if (existing) {
      return this.toContract(
        existing,
        await this.credits.getAccount(principal),
      );
    }

    const source = await this.repository.findStoryboardSource(
      context.workspaceId,
      projectId,
    );
    if (!source) {
      throw new NotFoundException("A script-ready project was not found");
    }

    const cost = creditCosts.storyboard;
    await this.credits.reserve(
      context.workspaceId,
      cost,
      `${normalizedKey}:reserve`,
      `Reserve ${cost} credits for storyboard generation`,
    );

    let persisted = false;
    try {
      const generated = await this.generateStoryboard(source);
      const upgrade = await this.repository.createStoryboardUpgrade({
        ...context,
        projectId,
        idempotencyKey: normalizedKey,
        provider: generated.provider,
        model: generated.model,
        generated: generated.storyboard,
      });
      if (!upgrade) {
        throw new NotFoundException("A script-ready project was not found");
      }
      persisted = true;
      const credits = await this.credits.commit(
        context.workspaceId,
        cost,
        `${normalizedKey}:commit`,
        `Committed ${cost} credits for storyboard generation`,
      );
      return this.toContract(upgrade, credits);
    } catch (error) {
      if (!persisted) {
        try {
          await this.credits.release(
            context.workspaceId,
            cost,
            `${normalizedKey}:release`,
            `Released ${cost} credits after failed storyboard generation`,
          );
        } catch {
          throw error;
        }
        throw new ServiceUnavailableException({
          message: "Storyboard generation could not be completed",
          retryMode: "new_request",
        });
      }
      throw error;
    }
  }

  private async upgradeVideo(
    context: {
      workspaceId: string;
      userId: string;
      creatorProfileId: string;
    },
    projectId: string,
    idempotencyKey: string,
    principal: AuthPrincipal,
  ): Promise<UpgradeVideoResult> {
    const idempotent = await this.repository.findVideoUpgradeByIdempotency(
      context.workspaceId,
      idempotencyKey,
    );
    if (idempotent) {
      const credits = await this.credits.commit(
        context.workspaceId,
        creditCosts.video,
        `${idempotencyKey}:commit`,
        `Committed ${creditCosts.video} credits for video generation`,
      );
      return this.toVideoContract(idempotent, credits);
    }

    const existing = await this.repository.findExistingVideoUpgrade(
      context.workspaceId,
      projectId,
    );
    if (existing) {
      return this.toVideoContract(
        existing,
        await this.credits.getAccount(principal),
      );
    }

    const source = await this.repository.findVideoSource(
      context.workspaceId,
      projectId,
    );
    if (!source) {
      throw new NotFoundException("A storyboard-ready project was not found");
    }

    const cost = creditCosts.video;
    await this.credits.reserve(
      context.workspaceId,
      cost,
      `${idempotencyKey}:reserve`,
      `Reserve ${cost} credits for video generation`,
    );

    let persisted = false;
    try {
      const artifact = await this.videoProvider.generate({
        workspaceId: context.workspaceId,
        projectId,
        idempotencyKey,
        source,
      });
      const upgrade = await this.repository.createVideoUpgrade({
        workspaceId: context.workspaceId,
        userId: context.userId,
        projectId,
        idempotencyKey,
        artifact,
      });
      if (!upgrade) {
        throw new NotFoundException("A storyboard-ready project was not found");
      }
      persisted = true;
      const credits = await this.credits.commit(
        context.workspaceId,
        cost,
        `${idempotencyKey}:commit`,
        `Committed ${cost} credits for ${artifact.simulated ? "fallback" : "Veo"} video generation`,
      );
      return this.toVideoContract(upgrade, credits);
    } catch (error) {
      if (!persisted) {
        try {
          await this.credits.release(
            context.workspaceId,
            cost,
            `${idempotencyKey}:release`,
            `Released ${cost} credits after failed video generation`,
          );
        } catch {
          throw error;
        }
        throw new ServiceUnavailableException({
          message: "Video generation could not be completed",
          retryMode: "new_request",
        });
      }
      throw error;
    }
  }

  private async generateStoryboard(source: StoryboardSourceRecord): Promise<{
    provider: string;
    model: string;
    storyboard: GeneratedStoryboard;
  }> {
    try {
      const storyboard = await this.generator.generate({
        prompt: [
          "Turn this script into a shootable vertical-video storyboard.",
          `Title: ${source.script.title}`,
          `Hook: ${source.script.hook}`,
          `Body: ${source.script.body}`,
          `Call to action: ${source.script.callToAction ?? "none"}`,
          `Target duration: ${source.script.durationSeconds ?? 30} seconds`,
          "Create 3 to 8 chronological scenes in 9:16.",
          "Every scene needs a precise frame, action, audio, transition, required asset and edit instruction.",
          "Keep it feasible for an independent music creator in one studio session.",
          "Scene durations must add up to the storyboard duration.",
        ].join("\n"),
        schema: GeneratedStoryboardSchema,
        jsonSchema: generatedStoryboardJsonSchema,
      });
      return {
        provider: "vertex-ai",
        model: "gemini-3.5-flash",
        storyboard,
      };
    } catch {
      return {
        provider: "creonome",
        model: "deterministic-storyboard-v1",
        storyboard: this.localStoryboard(source),
      };
    }
  }

  private localStoryboard(source: StoryboardSourceRecord): GeneratedStoryboard {
    const total = Math.max(source.script.durationSeconds ?? 30, 12);
    const opening = Math.max(3, Math.floor(total * 0.27));
    const process = Math.max(3, Math.floor(total * 0.33));
    const reveal = total - opening - process;

    return {
      title: `${source.script.title} — storyboard`.slice(0, 160),
      aspectRatio: "9:16",
      durationSeconds: total,
      scenes: [
        {
          heading: "Opening detail",
          description:
            "Hold on one tactile studio detail before revealing its purpose.",
          shotType: "Locked extreme close-up",
          voiceover: source.script.hook,
          onScreenText: "Start with the detail nobody notices",
          bRoll: "Room light, cables and a silent speaker cone.",
          transition: "Hard cut on the first physical gesture.",
          requiredAsset: "One clean macro take of the opening detail",
          sound: "Room tone with no music",
          editingNote: "Hold the first frame long enough to create tension.",
          referenceFrameUrl: null,
          durationSeconds: opening,
        },
        {
          heading: "Production gesture",
          description:
            "Show the single decisive action that changes the musical idea.",
          shotType: "Macro tracking shot",
          voiceover: source.script.body.slice(0, 2_000),
          onScreenText: null,
          bRoll: "DAW playhead, hands and meters responding to the action.",
          transition: "Cut on action into the musical reveal.",
          requiredAsset: "Close take of the creator performing the gesture",
          sound: "Contact sound leading into the track",
          editingNote: "Let the real transient motivate the cut.",
          referenceFrameUrl: null,
          durationSeconds: process,
        },
        {
          heading: "Musical reveal",
          description:
            "Open to the full studio and let the finished musical moment land.",
          shotType: "Wide handheld reveal",
          voiceover: source.script.callToAction,
          onScreenText: source.script.caption?.slice(0, 500) ?? null,
          bRoll: "Meters, performance details and the creator's reaction.",
          transition: "Resolve on a frame that can loop to the opening.",
          requiredAsset: "Wide performance take with clean master audio",
          sound: "Finished track master",
          editingNote:
            "Prioritize the musical payoff; remove extra explanation.",
          referenceFrameUrl: null,
          durationSeconds: reveal,
        },
      ],
    };
  }

  private toContract(
    upgrade: StoryboardUpgradeRecord,
    credits: { balance: number; reserved: number; available: number },
  ): UpgradeProjectResult {
    return UpgradeProjectResultSchema.parse({
      ...upgrade,
      project: {
        ...upgrade.project,
        updatedAt: upgrade.project.updatedAt.toISOString(),
      },
      job: {
        ...upgrade.job,
        createdAt: upgrade.job.createdAt.toISOString(),
        updatedAt: upgrade.job.updatedAt.toISOString(),
        completedAt: upgrade.job.completedAt?.toISOString() ?? null,
      },
      credits,
    });
  }

  private toVideoContract(
    upgrade: VideoUpgradeRecord,
    credits: { balance: number; reserved: number; available: number },
  ): UpgradeVideoResult {
    return UpgradeVideoResultSchema.parse({
      ...upgrade,
      project: {
        ...upgrade.project,
        updatedAt: upgrade.project.updatedAt.toISOString(),
      },
      video: {
        ...upgrade.video,
        createdAt: upgrade.video.createdAt.toISOString(),
      },
      job: {
        ...upgrade.job,
        createdAt: upgrade.job.createdAt.toISOString(),
        updatedAt: upgrade.job.updatedAt.toISOString(),
        completedAt: upgrade.job.completedAt?.toISOString() ?? null,
      },
      credits,
    });
  }
}
