import type {
  OnboardingAssetInsight,
  OnboardingProfile,
  OnboardingRepresentativeness,
} from "@creonome/contracts";
import type { OnboardingSourceAssetRecord } from "./onboarding.repository.js";

export type LabeledOnboardingInsight = {
  fileName: string;
  representativeness: OnboardingRepresentativeness;
  insight: OnboardingAssetInsight;
};

export type OnboardingProfileDraft = Omit<OnboardingProfile, "stageName">;

export interface OnboardingIntelligence {
  readonly provider: string;
  readonly model: string;
  analyze(source: OnboardingSourceAssetRecord): Promise<OnboardingAssetInsight>;
  buildProfile(
    sources: LabeledOnboardingInsight[],
  ): Promise<OnboardingProfileDraft>;
}

export const ONBOARDING_INTELLIGENCE = Symbol("ONBOARDING_INTELLIGENCE");
