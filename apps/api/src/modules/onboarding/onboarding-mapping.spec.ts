import type { OnboardingProfile } from "@creonome/contracts";
import { describe, expect, it } from "vitest";
import {
  deriveOnboardingStep,
  profileToTraitInputs,
} from "./onboarding-mapping.js";

const profile: OnboardingProfile = {
  stageName: "Nova Sainte",
  disciplines: ["music producer", "performer"],
  genres: ["electronic"],
  creativeSignature: "Restrained electronic stories with tactile detail.",
  themes: ["process"],
  targetAudience: "Independent electronic listeners.",
  boundaries: ["No fake urgency"],
};

describe("onboarding persistence mapping", () => {
  it("derives a stable route step from persisted progress", () => {
    expect(deriveOnboardingStep("pending", 0, false)).toBe("source");
    expect(deriveOnboardingStep("in_progress", 1, false)).toBe("upload");
    expect(deriveOnboardingStep("in_progress", 3, true)).toBe("profile");
    expect(deriveOnboardingStep("complete", 3, true)).toBe("complete");
  });

  it("keeps declared profile edits separate from observed evidence", () => {
    const traits = profileToTraitInputs(profile, "declared");

    expect(traits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "signature",
          value: profile.creativeSignature,
          evidence: { source: "onboarding", provenance: "declared" },
        }),
        expect.objectContaining({
          category: "boundary",
          value: "No fake urgency",
        }),
      ]),
    );
    expect(traits.map(({ position }) => position)).toEqual(
      Array.from({ length: traits.length }, (_, index) => index + 1),
    );
  });

  it("assigns a unique display label to every trait in a category", () => {
    const traits = profileToTraitInputs(
      {
        ...profile,
        genres: ["electronic", "ambient"],
        themes: ["process", "transformation"],
        boundaries: ["No fake urgency", "No trend imitation"],
      },
      "observed",
    );

    const categoryLabels = traits.map(
      ({ category, label }) => `${category}:${label}`,
    );
    expect(new Set(categoryLabels).size).toBe(categoryLabels.length);
    expect(categoryLabels).toEqual(
      expect.arrayContaining([
        "discipline:Discipline 1",
        "discipline:Discipline 2",
        "genre:Genre 1",
        "genre:Genre 2",
        "theme:Theme 1",
        "theme:Theme 2",
        "boundary:Boundary 1",
        "boundary:Boundary 2",
      ]),
    );
  });
});
