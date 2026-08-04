import type { CreatorDnaVersionsResponse } from "@creonome/contracts";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CreatorDnaVersionsView } from "./creator-dna-versions-view";

const versions: CreatorDnaVersionsResponse = {
  versions: [
    {
      id: "0198f3a2-82dd-7000-8000-000000000003",
      version: 3,
      summary: "Nocturnal electronic stories grounded in tactile details.",
      confirmed: true,
      source: "creator_edit",
      restoredFromVersion: null,
      createdAt: "2026-08-03T10:00:00.000Z",
    },
    {
      id: "0198f3a2-82dd-7000-8000-000000000002",
      version: 2,
      summary: "Nocturnal electronic stories.",
      confirmed: true,
      source: "onboarding",
      restoredFromVersion: null,
      createdAt: "2026-08-02T10:00:00.000Z",
    },
    {
      id: "0198f3a2-82dd-7000-8000-000000000001",
      version: 1,
      summary: "Early draft summary.",
      confirmed: false,
      source: "onboarding",
      restoredFromVersion: null,
      createdAt: "2026-08-01T10:00:00.000Z",
    },
  ],
};

describe("CreatorDnaVersionsView", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("lists every version with a change summary", () => {
    render(<CreatorDnaVersionsView versions={versions} />);

    expect(
      screen.getByRole("heading", { name: /version history/i }),
    ).toBeTruthy();
    expect(screen.getByText("Version 3")).toBeTruthy();
    expect(screen.getByText("Version 2")).toBeTruthy();
    expect(screen.getByText("Version 1")).toBeTruthy();
    expect(screen.getByText("Manual trait correction")).toBeTruthy();
    expect(screen.getAllByText("Generated during onboarding")).toHaveLength(2);
  });

  it("restores an earlier version and refreshes the list", async () => {
    const restoredDna = {
      version: 4,
      summary: "Early draft summary.",
      confirmed: true,
      traits: [],
    };
    const refreshedVersions: CreatorDnaVersionsResponse = {
      versions: [
        {
          id: "0198f3a2-82dd-7000-8000-000000000004",
          version: 4,
          summary: "Early draft summary.",
          confirmed: true,
          source: "restore",
          restoredFromVersion: 1,
          createdAt: "2026-08-04T10:00:00.000Z",
        },
        ...versions.versions,
      ],
    };
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(restoredDna))
      .mockResolvedValueOnce(Response.json(refreshedVersions));
    vi.stubGlobal("fetch", request);

    render(<CreatorDnaVersionsView versions={versions} />);
    const restoreButtons = screen.getAllByRole("button", { name: "Restore" });
    // Restore the oldest version (version 1), the last card rendered.
    fireEvent.click(restoreButtons[restoreButtons.length - 1]!);

    fireEvent.click(
      screen.getByRole("button", { name: "Restore this version" }),
    );

    await waitFor(() =>
      expect(
        screen.getByText(
          "Version 4 was created from version 1. Earlier versions are untouched.",
        ),
      ).toBeTruthy(),
    );
    expect(request).toHaveBeenNthCalledWith(
      1,
      "/api/creonome/creator-dna/versions/1/restore",
      expect.objectContaining({ method: "POST" }),
    );
    expect(screen.getByText("Version 4")).toBeTruthy();
  });

  it("compares two selected versions and shows the trait diff", async () => {
    const compareResult = {
      a: { version: 1, summary: "Early draft summary." },
      b: { version: 3, summary: "Nocturnal electronic stories." },
      traits: [
        {
          category: "voice",
          label: "Tone",
          status: "changed" as const,
          fromValue: "warm",
          toValue: "precise and intimate",
        },
        {
          category: "content",
          label: "Signature topic",
          status: "added" as const,
          fromValue: null,
          toValue: "urban gardening",
        },
      ],
    };
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(compareResult));
    vi.stubGlobal("fetch", request);

    render(<CreatorDnaVersionsView versions={versions} />);
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]!); // version 3
    fireEvent.click(checkboxes[2]!); // version 1

    fireEvent.click(screen.getByRole("button", { name: /compare v1 and v3/i }));

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Version 1 vs version 3" }),
      ).toBeTruthy(),
    );
    expect(request).toHaveBeenCalledWith(
      "/api/creonome/creator-dna/versions/1/compare/3",
      expect.any(Object),
    );
    expect(screen.getByText("changed")).toBeTruthy();
    expect(screen.getByText("added")).toBeTruthy();
    expect(screen.getByText("urban gardening")).toBeTruthy();
  });
});
