import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  UpgradeProjectResultSchema,
  type UpgradeProjectInput,
  type UpgradeProjectResult,
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
} from "./projects.repository.js";

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
    title: { type: "string" },
    aspectRatio: { type: "string" },
    durationSeconds: { type: "integer", minimum: 1, maximum: 3_600 },
    scenes: {
      type: "array",
      minItems: 3,
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          heading: { type: "string" },
          description: { type: "string" },
          shotType: { type: ["string", "null"] },
          voiceover: { type: ["string", "null"] },
          onScreenText: { type: ["string", "null"] },
          bRoll: { type: ["string", "null"] },
          transition: { type: ["string", "null"] },
          requiredAsset: { type: ["string", "null"] },
          sound: { type: ["string", "null"] },
          editingNote: { type: ["string", "null"] },
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
  ) {}

  async upgrade(
    principal: AuthPrincipal,
    projectId: string,
    _input: UpgradeProjectInput,
    idempotencyKey: string,
  ): Promise<UpgradeProjectResult> {
    const normalizedKey = idempotencyKey.trim();
    if (normalizedKey.length < 8 || normalizedKey.length > 180) {
      throw new BadRequestException(
        "A valid Idempotency-Key header is required",
      );
    }

    const context = await this.workspaces.resolve(principal);
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
        await this.credits.release(
          context.workspaceId,
          cost,
          `${normalizedKey}:release`,
          `Released ${cost} credits after failed storyboard generation`,
        );
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
        provider: "gemini",
        model: "gemini-3.6-flash",
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
}
