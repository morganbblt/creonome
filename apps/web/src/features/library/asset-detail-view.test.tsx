import type { AssetDetail } from "@creonome/contracts";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AssetDetailView } from "./asset-detail-view";

const baseAsset: AssetDetail = {
  id: "0198f3a2-82dd-7000-8000-000000000042",
  projectId: null,
  name: "private-rush.mov",
  kind: "video",
  mimeType: "video/quicktime",
  byteSize: 2_400_000,
  durationSeconds: 35,
  status: "ready",
  source: "upload",
  createdAt: "2026-08-02T10:30:00.000Z",
  analysis: null,
};

describe("AssetDetailView", () => {
  it("renders the asset's real metadata", () => {
    render(<AssetDetailView asset={baseAsset} />);

    expect(
      screen.getByRole("heading", { name: "private-rush.mov" }),
    ).toBeTruthy();
    expect(screen.getByText("video/quicktime")).toBeTruthy();
    expect(screen.getByText("2.4 MB")).toBeTruthy();
    expect(screen.getByText("0:35")).toBeTruthy();
    expect(screen.getByText("Ready")).toBeTruthy();
    expect(
      screen.getByText("No analysis has run for this asset yet."),
    ).toBeTruthy();
  });

  it("shows analysis evidence when present", () => {
    render(
      <AssetDetailView
        asset={{
          ...baseAsset,
          analysis: {
            summary:
              "A steady handheld walkthrough of a small ceramics studio.",
            disciplines: ["ceramics"],
            genres: ["studio vlog"],
            creativeSignature:
              "Warm, unhurried narration over practical b-roll.",
            themes: ["craft", "process"],
            targetAudience: "Hobbyist makers curious about the craft.",
            boundaries: [],
            evidence: ["Steady handheld camera work throughout the clip."],
          },
        }}
      />,
    );

    expect(
      screen.getByText(
        "A steady handheld walkthrough of a small ceramics studio.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("ceramics")).toBeTruthy();
    expect(
      screen.getByText("Steady handheld camera work throughout the clip."),
    ).toBeTruthy();
  });

  it("links to the parent project when the asset belongs to one", () => {
    render(
      <AssetDetailView
        asset={{
          ...baseAsset,
          projectId: "0198f3a2-82dd-7000-8000-000000000020",
        }}
      />,
    );

    const link = screen.getByRole("link", { name: /open project/i });
    expect(link.getAttribute("href")).toBe(
      "/projects/0198f3a2-82dd-7000-8000-000000000020",
    );
  });
});
