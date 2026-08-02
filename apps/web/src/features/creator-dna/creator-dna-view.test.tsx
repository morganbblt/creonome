import type { CreatorDna } from "@creonome/contracts";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  afterEach(() => vi.unstubAllGlobals());

  it("renders persisted traits, evidence and confidence", () => {
    render(<CreatorDnaView dna={dna} memories={memories} />);

    expect(screen.getByRole("heading", { name: "Creator DNA" })).toBeTruthy();
    expect(screen.getByText("Direction artistique")).toBeTruthy();
    expect(screen.getByText("94% confidence")).toBeTruthy();
    expect(screen.getByText("representative uploads")).toBeTruthy();
    expect(screen.getByText("Confirmed · version 2")).toBeTruthy();
    expect(screen.getByText("Prefer implicit calls to action.")).toBeTruthy();
  });

  it("uploads a private people reference image and marks it for Veo", async () => {
    const reference = {
      id: "0198f3a2-82dd-7000-8000-000000000055",
      fileName: "portrait.png",
      mimeType: "image/png" as const,
      byteSize: 2_048,
      createdAt: "2026-08-02T10:00:00.000Z",
    };
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          objectName: "portrait.png",
          gcsUri: "gs://private/workspaces/demo/sources/portrait.png",
          uploadUrl: "https://storage.googleapis.com/upload",
          expiresAt: "2026-08-02T10:15:00.000Z",
          headers: { "Content-Type": "image/png" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        Response.json({
          id: reference.id,
          projectId: null,
          name: reference.fileName,
          kind: "image",
          mimeType: reference.mimeType,
          byteSize: reference.byteSize,
          durationSeconds: null,
          status: "uploaded",
          source: "upload",
          createdAt: reference.createdAt,
        }),
      )
      .mockResolvedValueOnce(
        Response.json({ ...dna, peopleReferenceImage: reference }),
      );
    vi.stubGlobal("fetch", request);

    const { container } = render(
      <CreatorDnaView dna={dna} memories={memories} />,
    );
    const input = container.querySelector('input[type="file"]');
    expect(input).toBeTruthy();
    fireEvent.change(input!, {
      target: {
        files: [new File(["image"], "portrait.png", { type: "image/png" })],
      },
    });

    await waitFor(() => expect(screen.getByText("portrait.png")).toBeTruthy());
    expect(request).toHaveBeenNthCalledWith(
      4,
      "/api/creonome/creator-dna/reference-image",
      expect.objectContaining({ method: "PUT" }),
    );
    expect(screen.getByRole("button", { name: "Replace image" })).toBeTruthy();
  });

  it("saves a trait correction as the next DNA version", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        ...dna,
        version: 3,
        traits: [
          {
            ...dna.traits[0],
            value: "Precise, intimate and understated.",
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", request);

    render(<CreatorDnaView dna={dna} memories={memories} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(
      screen.getByRole("textbox", { name: "Edit Direction artistique" }),
      {
        target: { value: "Precise, intimate and understated." },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Save correction" }));

    await waitFor(() =>
      expect(screen.getByText(/Confirmed · version\s+3/)).toBeTruthy(),
    );
    expect(screen.getByText("Precise, intimate and understated.")).toBeTruthy();
    expect(request).toHaveBeenCalledWith(
      `/api/creonome/creator-dna/traits/${dna.traits[0]!.id}`,
      expect.objectContaining({ method: "PATCH" }),
    );
  });
});
