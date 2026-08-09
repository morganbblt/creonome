import type { CreatorDna } from "@creonome/contracts";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OnboardingDnaReviewView } from "./onboarding-dna-review-view";

const dna: CreatorDna = {
  version: 1,
  summary: "A confirmed Creator DNA built from three analyzed sources.",
  confirmed: true,
  traits: [
    {
      id: "0198f3a2-82dd-7000-8000-000000000090",
      category: "signature",
      label: "Creative signature",
      value: "Nocturnal electronic stories grounded in tactile details.",
      layer: "declared",
      confidence: 1,
      evidence: {},
    },
    {
      id: "0198f3a2-82dd-7000-8000-000000000091",
      category: "boundary",
      label: "Boundary 1",
      value: "No fake urgency",
      layer: "forbidden",
      confidence: null,
      evidence: {},
    },
  ],
  peopleReferenceImage: null,
};

describe("OnboardingDnaReviewView", () => {
  it("shows a loading state while the Creator DNA is still being fetched", () => {
    render(
      <OnboardingDnaReviewView
        dna={null}
        error={null}
        loading
        onBack={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    expect(screen.getByRole("status").textContent).toContain(
      "Loading your Creator DNA",
    );
    expect(
      (screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("renders every trait labeled by its declared/observed/learned/forbidden layer", () => {
    render(
      <OnboardingDnaReviewView
        dna={dna}
        error={null}
        loading={false}
        onBack={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    expect(screen.getByText(dna.summary)).toBeTruthy();
    expect(screen.getByText("Declared")).toBeTruthy();
    expect(screen.getByText("Forbidden")).toBeTruthy();
    expect(screen.getByText("No fake urgency")).toBeTruthy();
  });

  it("surfaces a fetch error without blocking navigation back", () => {
    render(
      <OnboardingDnaReviewView
        dna={null}
        error="We couldn’t load your Creator DNA. Your confirmed profile is intact — try again."
        loading={false}
        onBack={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "Your confirmed profile is intact",
    );
  });

  it("navigates back and forward through the provided callbacks", () => {
    const onBack = vi.fn();
    const onContinue = vi.fn();
    render(
      <OnboardingDnaReviewView
        dna={dna}
        error={null}
        loading={false}
        onBack={onBack}
        onContinue={onContinue}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
