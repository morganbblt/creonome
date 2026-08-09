import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { demoOpportunities } from "../../../src/features/opportunities/demo-opportunities";
import { TodayOpportunityCard } from "./today-opportunity-card";

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock("@/src/lib/analytics/analytics", async () => {
  const actual = await vi.importActual<
    typeof import("@/src/lib/analytics/analytics")
  >("@/src/lib/analytics/analytics");
  return { ...actual, track };
});

afterEach(() => {
  vi.unstubAllGlobals();
  track.mockReset();
});

describe("TodayOpportunityCard", () => {
  it("only reveals details on an explicit click, never on hover", () => {
    render(<TodayOpportunityCard opportunity={demoOpportunities[0]!} />);

    const card = screen.getByRole("article");
    const toggle = screen.getByRole("button", { name: "Show details" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    fireEvent.mouseEnter(card);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.mouseLeave(card);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("HOOK")).toBeTruthy();

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("fires opportunity_saved once the save request succeeds", async () => {
    const opportunity = demoOpportunities[0]!;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          id: "0198f3a2-82dd-7000-8000-000000000030",
          opportunityId: opportunity.id,
          title: opportunity.title,
          status: "active",
          currentLevel: "idea",
          currentVersion: 1,
          updatedAt: "2026-08-02T12:00:00.000Z",
        }),
      ),
    );
    render(<TodayOpportunityCard opportunity={opportunity} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: `More actions for ${opportunity.title}`,
      }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: /save for later/i }));

    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: /saved in projects/i })),
    );
    expect(track).toHaveBeenCalledWith("opportunity_saved", {
      opportunityId: opportunity.id,
    });
    expect(fetch).toHaveBeenCalledWith(
      `/api/creonome/opportunities/${opportunity.id}/save`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("does not fire opportunity_saved when the save request fails", async () => {
    const opportunity = demoOpportunities[0]!;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 500 })),
    );
    render(<TodayOpportunityCard opportunity={opportunity} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: `More actions for ${opportunity.title}`,
      }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: /save for later/i }));

    expect(
      await screen.findByText(/could not be saved/i),
    ).toBeTruthy();
    expect(track).not.toHaveBeenCalled();
  });
});
