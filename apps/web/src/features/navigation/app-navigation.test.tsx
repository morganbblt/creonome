import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppNavigation } from "./app-navigation";

vi.mock("next/navigation", () => ({
  usePathname: () => "/today",
}));

describe("AppNavigation", () => {
  it("shows immediate progress when another workspace tab is selected", () => {
    render(<AppNavigation progressClassName="route-progress" />);

    expect(screen.queryByRole("progressbar")).toBeNull();
    const projects = screen.getByRole("link", { name: "Projects" });
    projects.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(projects);

    expect(
      screen.getByRole("progressbar", { name: /loading projects/i }),
    ).toBeTruthy();
  });

  it("does not show progress when the current tab is selected again", () => {
    render(<AppNavigation progressClassName="route-progress" />);

    const today = screen.getByRole("link", { name: "Today" });
    today.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(today);

    expect(screen.queryByRole("progressbar")).toBeNull();
  });
});
