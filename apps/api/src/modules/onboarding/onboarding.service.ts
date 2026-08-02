import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  OnboardingProfileSchema,
  OnboardingStateSchema,
  UpdateOnboardingAssetInputSchema,
  UpdateOnboardingProfileInputSchema,
  type OnboardingState,
  type UpdateOnboardingAssetInput,
  type UpdateOnboardingProfileInput,
} from "@creonome/contracts";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
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
}
