import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  OnboardingCalibrationSetSchema,
  OnboardingProfileSchema,
  OnboardingStateSchema,
  SubmitOnboardingCalibrationResponsesInputSchema,
  SubmitOnboardingCalibrationResponsesResultSchema,
  UpdateOnboardingAssetInputSchema,
  UpdateOnboardingProfileInputSchema,
  type OnboardingCalibrationSet,
  type OnboardingState,
  type SubmitOnboardingCalibrationResponsesInput,
  type SubmitOnboardingCalibrationResponsesResult,
  type UpdateOnboardingAssetInput,
  type UpdateOnboardingProfileInput,
} from "@creonome/contracts";
import { z } from "zod";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import {
  STRUCTURED_GENERATOR,
  type StructuredGenerator,
} from "../ai/structured-generator.js";
import { CreatorDnaService } from "../creator-dna/creator-dna.service.js";
import { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import {
  ONBOARDING_INTELLIGENCE,
  type LabeledOnboardingInsight,
  type OnboardingIntelligence,
} from "./onboarding-intelligence.js";
import {
  ONBOARDING_REPOSITORY,
  type OnboardingRepository,
} from "./onboarding.repository.js";

const CalibrationGeneratedSchema = z.object({
  concepts: z
    .array(
      z.object({
        title: z.string().min(3).max(120),
        description: z.string().min(12).max(320),
      }),
    )
    .length(6),
});

const calibrationGeneratedJsonSchema = {
  type: "object",
  properties: {
    concepts: {
      type: "array",
      minItems: 6,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          title: { type: "string", minLength: 3, maxLength: 120 },
          description: { type: "string", minLength: 12, maxLength: 320 },
        },
        required: ["title", "description"],
        additionalProperties: false,
      },
    },
  },
  required: ["concepts"],
  additionalProperties: false,
};

/**
 * Deliberately generic fallback mini-concepts used when the structured
 * generator or Creator DNA lookup is unavailable, mirroring
 * OpportunityGenerationService's localOpportunities() fallback so
 * calibration (bible screen #17) never blocks onboarding on an AI outage.
 */
const localCalibrationConcepts: Array<{
  title: string;
  description: string;
}> = [
  {
    title: "One gesture, one drop",
    description:
      "Film one decisive production gesture, then let the reveal land without explanation.",
  },
  {
    title: "Build from one room sound",
    description:
      "Capture one texture in the room, transform it in three visible steps.",
  },
  {
    title: "Four ingredients, one reveal",
    description:
      "Show four sounds, one arrangement choice, and the final vertical payoff.",
  },
  {
    title: "A slower, unpolished take",
    description: "Post an unedited rehearsal moment instead of a finished cut.",
  },
  {
    title: "Answer a comment on camera",
    description: "Turn one real audience question into a short reaction.",
  },
  {
    title: "A collaboration teaser",
    description:
      "Tease an upcoming collaboration without revealing the other creator yet.",
  },
];

const supportedMimeTypes = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "image/jpeg",
  "image/png",
  "application/pdf",
  "text/plain",
]);

@Injectable()
export class OnboardingService {
  constructor(
    @Inject(WorkspaceContextService)
    private readonly workspaces: WorkspaceContextService,
    @Inject(ONBOARDING_REPOSITORY)
    private readonly repository: OnboardingRepository,
    @Inject(ONBOARDING_INTELLIGENCE)
    private readonly intelligence: OnboardingIntelligence,
    @Inject(CreatorDnaService)
    private readonly creatorDna: CreatorDnaService,
    @Inject(STRUCTURED_GENERATOR)
    private readonly generator: StructuredGenerator,
  ) {}

  async get(principal: AuthPrincipal): Promise<OnboardingState> {
    const context = await this.workspaces.resolve(principal);
    return OnboardingStateSchema.parse(await this.repository.getState(context));
  }

  async analyzeAsset(
    principal: AuthPrincipal,
    assetId: string,
  ): Promise<OnboardingState> {
    const context = await this.workspaces.resolve(principal);
    const source = await this.repository.findSourceAsset(
      context.workspaceId,
      assetId,
    );
    if (!source) {
      throw new NotFoundException("Source asset not found");
    }
    if (source.status === "ready" || source.status === "analyzing") {
      return OnboardingStateSchema.parse(
        await this.repository.getState(context),
      );
    }

    const analysisId = await this.repository.startAnalysis({
      assetId: source.id,
      provider: this.intelligence.provider,
      model: this.intelligence.model,
    });
    if (!supportedMimeTypes.has(source.mimeType)) {
      await this.repository.failAnalysis({
        assetId: source.id,
        analysisId,
        errorCode: "unsupported_media_type",
      });
      return OnboardingStateSchema.parse(
        await this.repository.getState(context),
      );
    }

    try {
      const insight = await this.intelligence.analyze(source);
      await this.repository.completeAnalysis({
        assetId: source.id,
        analysisId,
        provider: this.intelligence.provider,
        model: this.intelligence.model,
        insight,
        context,
      });
    } catch {
      await this.repository.failAnalysis({
        assetId: source.id,
        analysisId,
        errorCode: "analysis_failed",
      });
    }

    return OnboardingStateSchema.parse(await this.repository.getState(context));
  }

  async updateAsset(
    principal: AuthPrincipal,
    assetId: string,
    rawInput: UpdateOnboardingAssetInput,
  ): Promise<OnboardingState> {
    const input = UpdateOnboardingAssetInputSchema.parse(rawInput);
    const context = await this.workspaces.resolve(principal);
    const updated = await this.repository.updateRepresentativeness(
      context.workspaceId,
      assetId,
      input.representativeness,
    );
    if (!updated) {
      throw new NotFoundException("Source asset not found");
    }
    return OnboardingStateSchema.parse(await this.repository.getState(context));
  }

  async buildProfile(principal: AuthPrincipal): Promise<OnboardingState> {
    const context = await this.workspaces.resolve(principal);
    const state = await this.repository.getState(context);
    const sources: LabeledOnboardingInsight[] = state.assets.flatMap((asset) =>
      asset.status === "ready" && asset.analysis
        ? [
            {
              fileName: asset.fileName,
              representativeness: asset.representativeness,
              insight: asset.analysis,
            },
          ]
        : [],
    );
    if (sources.length < 3) {
      throw new BadRequestException(
        "Analyze at least three sources before building your profile",
      );
    }

    const [stageName, draft] = await Promise.all([
      this.repository.getStageName(context.creatorProfileId),
      this.intelligence.buildProfile(sources),
    ]);
    const profile = OnboardingProfileSchema.parse({ stageName, ...draft });
    await this.repository.saveDraftProfile(context, profile);
    return OnboardingStateSchema.parse(await this.repository.getState(context));
  }

  async complete(
    principal: AuthPrincipal,
    rawInput: UpdateOnboardingProfileInput,
  ): Promise<OnboardingState> {
    const input = UpdateOnboardingProfileInputSchema.parse(rawInput);
    const context = await this.workspaces.resolve(principal);
    await this.repository.completeProfile(context, input);
    return OnboardingStateSchema.parse(await this.repository.getState(context));
  }

  /**
   * Bible screen #17 calibration: generate six short mini-concepts from the
   * just-confirmed Creator DNA for the creator to react to. Unlike
   * OpportunityGenerationService this runs synchronously -- it happens once,
   * during onboarding, produces short text (not video), and has no credit
   * cost, so the Cloud Tasks queue that exists to keep long generations off
   * the request thread would be unwarranted overhead here.
   */
  async generateCalibration(
    principal: AuthPrincipal,
  ): Promise<OnboardingCalibrationSet> {
    const context = await this.workspaces.resolve(principal);
    const dna = await this.creatorDna
      .getForWorkspaceContext(context)
      .catch(() => null);
    const generated = await this.generator
      .generate({
        prompt: [
          "Generate exactly six short, distinct mini-concepts for a creator to react to during onboarding calibration.",
          "Each concept is a one-line content idea the creator can instantly recognize as fitting them, stretching them, or not fitting them at all.",
          "Mix concepts: some should closely match their declared identity, some should be a plausible future direction, and some should be a mismatch they can reject.",
          `Creator DNA: ${dna?.summary ?? "unavailable; use generic short-form creative concepts"}`,
          "Do not invent biographical facts and do not claim guaranteed virality.",
        ].join("\n"),
        schema: CalibrationGeneratedSchema,
        jsonSchema: calibrationGeneratedJsonSchema,
      })
      .catch(() => null);
    const concepts = generated?.concepts ?? localCalibrationConcepts;
    return OnboardingCalibrationSetSchema.parse({
      concepts: concepts.map((concept, index) => ({
        id: `calibration-${index + 1}`,
        ...concept,
      })),
    });
  }

  /**
   * Persists calibration responses as memory candidate signal (see
   * onboarding-mapping.ts's calibrationResponseConfidence/Content) rather
   * than feeding generation directly -- the same pending-review path
   * explicit opportunity feedback already writes to.
   */
  async submitCalibrationResponses(
    principal: AuthPrincipal,
    rawInput: SubmitOnboardingCalibrationResponsesInput,
  ): Promise<SubmitOnboardingCalibrationResponsesResult> {
    const input =
      SubmitOnboardingCalibrationResponsesInputSchema.parse(rawInput);
    const context = await this.workspaces.resolve(principal);
    const saved = await this.repository.saveCalibrationResponses(
      context,
      input.responses,
    );
    return SubmitOnboardingCalibrationResponsesResultSchema.parse({ saved });
  }
}
