import type {
  OnboardingAssetInsight,
  OnboardingProfile,
  OnboardingRepresentativeness,
  OnboardingState,
} from "@creonome/contracts";
import type { WorkspaceContext } from "../workspaces/workspace.repository.js";

export type OnboardingSourceAssetRecord = {
  id: string;
  workspaceId: string;
  fileName: string;
  mimeType: string;
  gcsUri: string;
  status: string;
};

export type CompleteOnboardingAnalysisInput = {
  assetId: string;
  analysisId: string;
  provider: string;
  model: string;
  insight: OnboardingAssetInsight;
  context: WorkspaceContext;
};

export type FailOnboardingAnalysisInput = {
  assetId: string;
  analysisId: string;
  errorCode: string;
};

export interface OnboardingRepository {
  getState(context: WorkspaceContext): Promise<OnboardingState>;
  getStageName(creatorProfileId: string): Promise<string>;
  findSourceAsset(
    workspaceId: string,
    assetId: string,
  ): Promise<OnboardingSourceAssetRecord | null>;
  startAnalysis(input: {
    assetId: string;
    provider: string;
    model: string;
  }): Promise<string>;
  completeAnalysis(input: CompleteOnboardingAnalysisInput): Promise<void>;
  failAnalysis(input: FailOnboardingAnalysisInput): Promise<void>;
  updateRepresentativeness(
    workspaceId: string,
    assetId: string,
    representativeness: OnboardingRepresentativeness,
  ): Promise<boolean>;
  saveDraftProfile(
    context: WorkspaceContext,
    profile: OnboardingProfile,
  ): Promise<void>;
  completeProfile(
    context: WorkspaceContext,
    profile: OnboardingProfile,
  ): Promise<void>;
}

export const ONBOARDING_REPOSITORY = Symbol("ONBOARDING_REPOSITORY");
