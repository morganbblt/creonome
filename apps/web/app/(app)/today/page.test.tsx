import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../src/lib/api/server-client", () => ({
  createServerApiClient: () => ({
    getCurrentOpportunities: vi.fn().mockRejectedValue(new Error("offline")),
  }),
}));

import TodayPage from "./page";

describe("Today page", () => {
  it("does not expose paid actions for fallback records that do not exist", async () => {
    render(await TodayPage());

    expect(screen.getByRole("status").textContent).toMatch(
      /couldn.t load this week.s opportunities/i,
    );
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect(
      screen.queryAllByRole("link", { name: /move to script/i }),
    ).toHaveLength(0);
  });

  it("shows the cost before requesting a new batch", async () => {
    render(await TodayPage());

    expect(
      screen.queryByRole("button", { name: /3 new opportunities/i }),
    ).toBeNull();
  });

  it("links every primary and modify action to the opportunity workspace", async () => {
    render(await TodayPage());

    expect(
      screen.queryAllByRole("link", { name: /move to script/i }),
    ).toHaveLength(0);
    expect(screen.queryAllByRole("link", { name: /modify/i })).toHaveLength(0);
  });
});
