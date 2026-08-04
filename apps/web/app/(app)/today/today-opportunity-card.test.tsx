import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { demoOpportunities } from "../../../src/features/opportunities/demo-opportunities";
import { TodayOpportunityCard } from "./today-opportunity-card";

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
});
