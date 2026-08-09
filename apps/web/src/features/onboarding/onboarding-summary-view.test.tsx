import type { CreditsResponse, OnboardingProfile } from "@creonome/contracts";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OnboardingSummaryView } from "./onboarding-summary-view";

const profile: OnboardingProfile = {
  stageName: "Nova Sainte",
  disciplines: ["music producer", "performer"],
  genres: ["electronic", "ambient"],
  creativeSignature:
    "Nocturnal electronic stories grounded in tactile details.",
  themes: ["ritual", "process"],
  targetAudience: "Curious electronic listeners and independent creators.",
  boundaries: ["No fake urgency", "No alcohol brand promotions"],
};

const credits: CreditsResponse = { balance: 20, reserved: 2, available: 18 };

describe("OnboardingSummaryView", () => {
  it("lists key traits, objectives, limits and available credits", () => {
    render(
      <OnboardingSummaryView
        credits={credits}
        error={null}
        generating={false}
        onGenerate={vi.fn()}
        profile={profile}
      />,
    );

    expect(screen.getByText("Nova Sainte")).toBeTruthy();
    expect(screen.getByText(profile.creativeSignature)).toBeTruthy();
    expect(screen.getByText("music producer")).toBeTruthy();
    expect(screen.getByText("electronic")).toBeTruthy();
    expect(screen.getByText("ritual")).toBeTruthy();
    expect(screen.getByText("No fake urgency")).toBeTruthy();
    expect(screen.getByText("No alcohol brand promotions")).toBeTruthy();
    expect(screen.getByText("18")).toBeTruthy();
  });

  it("shows a placeholder when credits have not loaded yet", () => {
    render(
      <OnboardingSummaryView
        credits={null}
        error={null}
        generating={false}
        onGenerate={vi.fn()}
        profile={profile}
      />,
    );

    expect(screen.getByText("—")).toBeTruthy();
  });

  it("triggers the final CTA to generate the first opportunities", () => {
    const onGenerate = vi.fn();
    render(
      <OnboardingSummaryView
        credits={credits}
        error={null}
        generating={false}
        onGenerate={onGenerate}
        profile={profile}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Generate my first opportunities" }),
    );
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it("disables the CTA while the workspace is opening", () => {
    render(
      <OnboardingSummaryView
        credits={credits}
        error={null}
        generating
        onGenerate={vi.fn()}
        profile={profile}
      />,
    );

    expect(
      (
        screen.getByRole("button", {
          name: /Opening your workspace/i,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});
