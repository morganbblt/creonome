import type { OnboardingProfile } from "@creonome/contracts";
import { describe, expect, it } from "vitest";
import {
  calibrationResponseConfidence,
  calibrationResponseContent,
  classifyBoundary,
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
          layer: "declared",
          evidence: { source: "onboarding", provenance: "declared" },
        }),
        expect.objectContaining({
          category: "boundary",
          value: "No fake urgency",
          layer: "forbidden",
        }),
      ]),
    );
    expect(traits.map(({ position }) => position)).toEqual(
      Array.from({ length: traits.length }, (_, index) => index + 1),
    );
  });

  it("assigns the onboarding provenance as the layer for non-boundary traits", () => {
    const observedTraits = profileToTraitInputs(profile, "observed");
    for (const trait of observedTraits.filter(
      ({ category }) => category !== "boundary",
    )) {
      expect(trait.layer).toBe("observed");
    }
  });

  it("always marks boundaries as the forbidden layer regardless of provenance", () => {
    for (const provenance of ["observed", "declared"] as const) {
      const traits = profileToTraitInputs(profile, provenance);
      const boundaries = traits.filter(
        ({ category }) => category === "boundary",
      );
      expect(boundaries).not.toHaveLength(0);
      for (const boundary of boundaries) {
        expect(boundary.layer).toBe("forbidden");
      }
    }
  });

  it("classifies each forbidden boundary into a structured entry type", () => {
    const traits = profileToTraitInputs(
      { ...profile, boundaries: ["No alcohol brand promotions"] },
      "declared",
    );
    const [boundary] = traits.filter(({ category }) => category === "boundary");
    expect(boundary?.evidence).toMatchObject({ boundaryType: "topic" });
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

describe("classifyBoundary", () => {
  it("classifies a single-token boundary as a banned word", () => {
    expect(classifyBoundary("Politics")).toBe("word");
  });

  it("classifies a short Title Case phrase as an unauthorized person/entity", () => {
    expect(classifyBoundary("No Jane Doe")).toBe("person");
    expect(classifyBoundary("Acme Cola")).toBe("person");
  });

  it("classifies a lowercase multi-word phrase as a banned topic", () => {
    expect(classifyBoundary("No alcohol brand promotions")).toBe("topic");
  });

  it("classifies an empty boundary as other", () => {
    // Trailing punctuation is stripped after the negation prefix check
    // normalizes the string, so "No !" reduces to an empty phrase once
    // the "no " prefix and the "!" are both peeled off.
    expect(classifyBoundary("No !")).toBe("other");
  });
});

describe("calibration response mapping", () => {
  it("gives an unambiguous affirmation the same confidence as an unambiguous rejection", () => {
    expect(calibrationResponseConfidence("feels_like_me")).toBe(
      calibrationResponseConfidence("not_for_me"),
    );
  });

  it("gives the softer, exploratory response a lower confidence", () => {
    expect(
      Number(calibrationResponseConfidence("future_direction")),
    ).toBeLessThan(Number(calibrationResponseConfidence("feels_like_me")));
  });

  it("formats confidence as a fixed 3-decimal string", () => {
    expect(calibrationResponseConfidence("feels_like_me")).toBe("0.650");
  });

  it("summarizes a calibration response as durable memory content", () => {
    const content = calibrationResponseContent({
      title: "One gesture, one drop",
      description: "Film one decisive production gesture.",
      response: "feels_like_me",
    });

    expect(content).toContain("One gesture, one drop");
    expect(content).toContain("feels like me");
    expect(content).toContain("Film one decisive production gesture.");
  });
});
