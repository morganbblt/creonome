import { fireEvent, render, screen, within } from "@testing-library/react";
import type { OpportunityBatch } from "@creonome/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoOpportunities } from "../../../src/features/opportunities/demo-opportunities";

const getCurrentOpportunities = vi.hoisted(() => vi.fn());

vi.mock("../../../src/lib/api/server-client", () => ({
  createServerApiClient: () => ({
    getCurrentOpportunities,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import TodayPage from "./page";

const batch: OpportunityBatch = {
  generatedAt: "2026-08-02T00:00:00.000Z",
  opportunities: demoOpportunities.map(
    ({
      badge: _badge,
      duration: _duration,
      hook: _hook,
      why: _why,
      reserve: _reserve,
      verdict: _verdict,
      effort: _effort,
      channel: _channel,
      ...opportunity
    }) => opportunity,
  ) as OpportunityBatch["opportunities"],
};

beforeEach(() => {
  getCurrentOpportunities.mockReset();
  getCurrentOpportunities.mockRejectedValue(new Error("offline"));
  vi.unstubAllGlobals();
});

describe("Today page", () => {
  it("shows three non-actionable previews while the live batch is unavailable", async () => {
    render(await TodayPage());

    expect(screen.getByRole("status").textContent).toMatch(/mvp demo/i);
    expect(screen.queryAllByRole("article")).toHaveLength(3);
    expect(
      screen.queryAllByRole("link", { name: /move to script/i }),
    ).toHaveLength(0);
  });

  it("offers a real live-generation retry with its cost", async () => {
    render(await TodayPage());

    expect(
      screen.getByRole("button", { name: /try live generation.*3 credits/i }),
    ).toBeTruthy();
  });

  it("links every primary and modify action to the opportunity workspace", async () => {
    render(await TodayPage());

    expect(
      screen.queryAllByRole("link", { name: /move to script/i }),
    ).toHaveLength(0);
    expect(screen.queryAllByRole("link", { name: /modify/i })).toHaveLength(0);
  });

  it("opens the handoff action menu with honest level availability", async () => {
    getCurrentOpportunities.mockResolvedValue(batch);
    render(await TodayPage());

    const more = screen.getAllByRole("button", {
      name: /more actions for/i,
    })[0]!;
    expect(more.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(more);

    const menu = screen.getByRole("menu", {
      name: `Actions for ${demoOpportunities[0]!.title}`,
    });
    expect(more.getAttribute("aria-expanded")).toBe("true");
    expect(
      within(menu).getByRole("menuitem", { name: /move to script.*2 cr/i }),
    ).toBeTruthy();
    expect(
      within(menu).getByRole("menuitem", {
        name: /generate storyboard.*6 cr/i,
      }),
    ).toHaveProperty("disabled", true);
    expect(
      within(menu).getByRole("menuitem", {
        name: /generate full video.*17 cr/i,
      }),
    ).toHaveProperty("disabled", true);
    expect(
      within(menu).getByRole("menuitem", { name: /save for later.*free/i }),
    ).toBeTruthy();
  });

  it("saves an opportunity into its persisted project", async () => {
    getCurrentOpportunities.mockResolvedValue(batch);
    const projectId = "0198f3a2-82dd-7000-8000-000000000020";
    const request = vi.fn().mockResolvedValue(
      Response.json(
        {
          id: projectId,
          opportunityId: demoOpportunities[0]!.id,
          title: demoOpportunities[0]!.title,
          status: "active",
          currentLevel: "idea",
          currentVersion: 1,
          updatedAt: "2026-08-02T12:00:00.000Z",
        },
        { status: 201 },
      ),
    );
    vi.stubGlobal("fetch", request);
    render(await TodayPage());

    fireEvent.click(
      screen.getAllByRole("button", { name: /more actions for/i })[0]!,
    );
    fireEvent.click(
      screen.getByRole("menuitem", { name: /save for later.*free/i }),
    );

    const saved = await screen.findByRole("menuitem", {
      name: /saved in projects/i,
    });
    expect(saved.getAttribute("href")).toBe(`/projects/${projectId}`);
    expect(request).toHaveBeenCalledWith(
      `/api/creonome/opportunities/${demoOpportunities[0]!.id}/save`,
      expect.objectContaining({ method: "POST" }),
    );
  });
});
