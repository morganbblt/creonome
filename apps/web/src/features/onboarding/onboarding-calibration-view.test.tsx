import type { OnboardingCalibrationConcept } from "@creonome/contracts";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OnboardingCalibrationView } from "./onboarding-calibration-view";

const concepts: OnboardingCalibrationConcept[] = Array.from(
  { length: 6 },
  (_, index) => ({
    id: `calibration-${index + 1}`,
    title: `Mini-concept ${index + 1}`,
    description: `A short calibration concept detailed enough to react to, number ${index + 1}.`,
  }),
);

describe("OnboardingCalibrationView", () => {
  it("renders all six generated mini-concepts with three response options each", () => {
    render(
      <OnboardingCalibrationView
        concepts={concepts}
        error={null}
        loading={false}
        onBack={vi.fn()}
        onContinue={vi.fn()}
        onRespond={vi.fn()}
        responses={{}}
        submitting={false}
      />,
    );

    for (const concept of concepts) {
      expect(screen.getByText(concept.title)).toBeTruthy();
    }
    expect(
      screen.getAllByRole("button", { name: "Feels like me" }),
    ).toHaveLength(6);
    expect(
      screen.getAllByRole("button", { name: "A future direction" }),
    ).toHaveLength(6);
    expect(screen.getAllByRole("button", { name: "Not for me" })).toHaveLength(
      6,
    );
    expect(screen.getByText("0 of 6 answered")).toBeTruthy();
  });

  it("captures a response per concept and disables Continue until all six are answered", () => {
    const onRespond = vi.fn();
    const { rerender } = render(
      <OnboardingCalibrationView
        concepts={concepts}
        error={null}
        loading={false}
        onBack={vi.fn()}
        onContinue={vi.fn()}
        onRespond={onRespond}
        responses={{}}
        submitting={false}
      />,
    );

    fireEvent.click(
      screen.getAllByRole("button", { name: "Feels like me" })[0]!,
    );
    expect(onRespond).toHaveBeenCalledWith("calibration-1", "feels_like_me");

    expect(
      (screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    const allAnswered = Object.fromEntries(
      concepts.map((concept) => [concept.id, "feels_like_me" as const]),
    );
    rerender(
      <OnboardingCalibrationView
        concepts={concepts}
        error={null}
        loading={false}
        onBack={vi.fn()}
        onContinue={vi.fn()}
        onRespond={onRespond}
        responses={allAnswered}
        submitting={false}
      />,
    );

    expect(screen.getByText("6 of 6 answered")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("navigates to the next step once all concepts are answered", () => {
    const onContinue = vi.fn();
    const allAnswered = Object.fromEntries(
      concepts.map((concept) => [concept.id, "not_for_me" as const]),
    );
    render(
      <OnboardingCalibrationView
        concepts={concepts}
        error={null}
        loading={false}
        onBack={vi.fn()}
        onContinue={onContinue}
        onRespond={vi.fn()}
        responses={allAnswered}
        submitting={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("shows a non-blocking error when calibration concepts fail to generate", () => {
    render(
      <OnboardingCalibrationView
        concepts={[]}
        error="We couldn’t generate calibration concepts. Your profile is intact — try again, or continue without answering."
        loading={false}
        onBack={vi.fn()}
        onContinue={vi.fn()}
        onRespond={vi.fn()}
        responses={{}}
        submitting={false}
      />,
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "Your profile is intact",
    );
  });
});
