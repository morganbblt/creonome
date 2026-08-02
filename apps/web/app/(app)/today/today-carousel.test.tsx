import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoOpportunities } from "../../../src/features/opportunities/demo-opportunities";
import { TodayCarousel } from "./today-carousel";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const generatedBatch = {
  generatedAt: "2026-08-02T10:00:00.000Z",
  opportunities: demoOpportunities.map(
    (
      {
        badge: _badge,
        duration: _duration,
        hook: _hook,
        why: _why,
        reserve: _reserve,
        verdict: _verdict,
        effort: _effort,
        channel: _channel,
        ...opportunity
      },
      index,
    ) => ({
      ...opportunity,
      id: `01989f00-0000-7000-8000-00000000010${index}`,
    }),
  ),
};

describe("TodayCarousel", () => {
  const scrollBy = vi.fn();

  beforeEach(() => {
    scrollBy.mockReset();
    refresh.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json(generatedBatch)),
    );
    Object.defineProperty(HTMLElement.prototype, "scrollBy", {
      configurable: true,
      value: scrollBy,
    });
  });

  it("keeps the existing cards and appends each generated batch", async () => {
    render(<TodayCarousel opportunities={demoOpportunities} preview={false} />);

    expect(screen.getAllByRole("article")).toHaveLength(3);
    fireEvent.click(
      screen.getByRole("button", { name: /3 new opportunities/i }),
    );
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(6));
    fireEvent.click(
      screen.getByRole("button", { name: /next opportunities/i }),
    );
    expect(scrollBy).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "smooth" }),
    );
  });

  it("exposes carousel navigation in both directions", () => {
    render(<TodayCarousel opportunities={demoOpportunities} preview={false} />);

    expect(
      screen.getByRole("button", { name: /previous opportunities/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /next opportunities/i }),
    ).toBeTruthy();
  });

  it("makes the freshness of every opportunity readable", () => {
    render(<TodayCarousel opportunities={demoOpportunities} preview={false} />);

    expect(screen.getAllByText("Fresh this week")).toHaveLength(2);
    expect(screen.getByText("New signal")).toBeTruthy();
  });
});
