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

describe("CreatorDnaView", () => {
  it("renders persisted traits, evidence and confidence", () => {
    render(<CreatorDnaView dna={dna} />);

    expect(screen.getByRole("heading", { name: "Creator DNA" })).toBeTruthy();
    expect(screen.getByText("Direction artistique")).toBeTruthy();
    expect(screen.getByText("94% confidence")).toBeTruthy();
    expect(screen.getByText("representative uploads")).toBeTruthy();
    expect(screen.getByText("Confirmed · version 2")).toBeTruthy();
  });
});
