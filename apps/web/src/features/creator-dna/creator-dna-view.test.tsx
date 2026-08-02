import type { CreatorDna } from "@creonome/contracts";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CreatorDnaView } from "./creator-dna-view";

const dna: CreatorDna = {
  version: 2,
  summary:
    "Restrained nocturnal electronic storytelling built around tactile process.",
  confirmed: true,
  traits: [
    {
      id: "0198f3a2-82dd-7000-8000-000000000011",
      category: "visual_language",
      label: "Direction artistique",
      value: "Cold grey light, concrete, vinyl and restrained film grain.",
      confidence: 0.94,
      evidence: { source: "representative uploads" },
    },
  ],
};

const memories = {
  pendingCount: 1,
  pending: [
    {
      id: "0198f3a2-82dd-7000-8000-000000000061",
      status: "pending" as const,
      kind: "creator",
      scope: "creator" as const,
      content: "Prefer implicit calls to action.",
      source: "opportunity_chat",
      provider: "mem0",
      projectId: null,
      opportunityId: null,
      createdAt: "2026-08-02T06:00:00.000Z",
      reviewedAt: null,
    },
  ],
  history: [],
};

describe("CreatorDnaView", () => {
  it("renders persisted traits, evidence and confidence", () => {
    render(<CreatorDnaView dna={dna} memories={memories} />);

    expect(screen.getByRole("heading", { name: "Creator DNA" })).toBeTruthy();
    expect(screen.getByText("Direction artistique")).toBeTruthy();
    expect(screen.getByText("94% confidence")).toBeTruthy();
    expect(screen.getByText("representative uploads")).toBeTruthy();
    expect(screen.getByText("Confirmed · version 2")).toBeTruthy();
    expect(screen.getByText("Prefer implicit calls to action.")).toBeTruthy();
  });
});
