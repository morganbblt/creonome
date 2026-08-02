import type {
  OnboardingProfile,
  OnboardingStatus,
  OnboardingStep,
} from "@creonome/contracts";

export type DnaTraitInput = {
  position: number;
  category: string;
  label: string;
  value: string;
  confidence: string;
  evidence: { source: "onboarding"; provenance: "observed" | "declared" };
};

export function deriveOnboardingStep(
  status: OnboardingStatus,
  assetCount: number,
  hasProfile: boolean,
): OnboardingStep {
  if (status === "complete") return "complete";
  if (hasProfile) return "profile";
  if (assetCount > 0) return "upload";
  return "source";
}

export function profileToTraitInputs(
  profile: OnboardingProfile,
  provenance: "observed" | "declared",
): DnaTraitInput[] {
  const evidence = { source: "onboarding" as const, provenance };
  const traits = [
    ...profile.disciplines.map((value, index) => ({
      category: "discipline",
      label: `Discipline ${index + 1}`,
      value,
    })),
    ...profile.genres.map((value, index) => ({
      category: "genre",
      label: `Genre ${index + 1}`,
      value,
    })),
    {
      category: "signature",
      label: "Creative signature",
      value: profile.creativeSignature,
    },
    ...profile.themes.map((value, index) => ({
      category: "theme",
      label: `Theme ${index + 1}`,
      value,
    })),
    {
      category: "audience",
      label: "Target audience",
      value: profile.targetAudience,
    },
    ...profile.boundaries.map((value, index) => ({
      category: "boundary",
      label: `Boundary ${index + 1}`,
      value,
    })),
  ];

  return traits.map((trait, index) => ({
    ...trait,
    position: index + 1,
    confidence: provenance === "observed" ? "0.800" : "1.000",
    evidence,
  }));
}
