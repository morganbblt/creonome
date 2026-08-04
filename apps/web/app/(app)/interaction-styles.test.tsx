import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { demoOpportunities } from "../../src/features/opportunities/demo-opportunities";
import { OpportunityWorkspace } from "../../src/features/opportunities/opportunity-workspace";
import { TodayOpportunityCard } from "./today/today-opportunity-card";

const opportunity = {
  id: "7af6fdcc-8881-48c2-ae5d-3f45df1bd0a2",
  strategy: "signature" as const,
  title: "The silence before the drop",
  pitch: "Hold the room still, then let the first kick arrive alone.",
  score: 92,
  confidence: "high" as const,
  freshness: "fresh" as const,
  currentLevel: "idea" as const,
  projectId: null,
  nextLevel: "script" as const,
  creditCost: 2,
  hook: "Two euros. One take. No talking.",
  rationale: "This route matches the creator's restrained reveal language.",
  reserve: "Clear the sample before the storyboard step.",
  effort: "low" as const,
  platform: "tiktok" as const,
  estimatedDurationSeconds: 35,
  evidence: ["DNA fit 96/100", "Momentum 88/100"],
  trendSignal: {
    status: "ok" as const,
    title: "Quiet process, loud reveal",
    lifecycle: "emerging",
    momentumScore: 88,
    observedAt: "2026-08-02T11:00:00.000Z",
    evidenceCount: 8,
    source: "trend_radar" as const,
    reason: null,
  },
};

describe("requested interaction styles", () => {
  it("reveals Today details through the explicit accessible toggle", () => {
    render(<TodayOpportunityCard opportunity={demoOpportunities[0]!} />);

    const toggle = screen.getByRole("button", { name: "Show details" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("HOOK")).toBeTruthy();
  });

  it("keeps the page sharp behind a lightly translucent glass side sheet", () => {
    render(
      <OpportunityWorkspace opportunity={opportunity} initialPanel="modify" />,
    );

    const dialog = screen.getByRole("dialog", { name: /modify this idea/i });
    expect(dialog.className).toMatch(/backdrop-blur-lg/);
    expect(dialog.className).toMatch(/bg-card\/82/);

    const overlay = document.querySelector('[data-slot="sheet-overlay"]');
    expect(overlay?.className).toMatch(/bg-transparent/);
    expect(overlay?.className).toMatch(/backdrop-blur-none/);
  });

  it("presents the opportunity placeholder in a genuine 9:16 frame", () => {
    render(<OpportunityWorkspace opportunity={opportunity} />);

    const media = screen.getByRole("img", {
      name: /vertical 9:16 preview/i,
    });
    expect(media.className).toMatch(/aspect-\[9\/16\]/);
    expect(screen.getByText("9:16")).toBeTruthy();
    expect(screen.queryByText(/creator footage/i)).toBeNull();
  });
});
