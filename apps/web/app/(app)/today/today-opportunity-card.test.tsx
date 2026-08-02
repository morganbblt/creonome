import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { demoOpportunities } from "../../../src/features/opportunities/demo-opportunities";
import { TodayOpportunityCard } from "./today-opportunity-card";

describe("TodayOpportunityCard", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("discloses and undiscloses details after the 750ms hover delay", () => {
    vi.useFakeTimers();
    render(<TodayOpportunityCard opportunity={demoOpportunities[0]!} />);

    const card = screen.getByRole("article");
    const toggle = screen.getByRole("button", { name: "Show details" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    fireEvent.mouseEnter(card);
    act(() => vi.advanceTimersByTime(749));
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    act(() => vi.advanceTimersByTime(1));
    expect(toggle.getAttribute("aria-expanded")).toBe("true");

    fireEvent.mouseLeave(card);
    act(() => vi.advanceTimersByTime(749));
    expect(toggle.getAttribute("aria-expanded")).toBe("true");

    act(() => vi.advanceTimersByTime(1));
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });
});
