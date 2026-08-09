import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MobileTabBar } from "./mobile-tab-bar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/projects/abc",
}));

describe("MobileTabBar", () => {
  it("renders exactly the four primary destinations", () => {
    render(<MobileTabBar />);

    const nav = screen.getByRole("navigation", { name: "Primary navigation" });
    const links = screen.getAllByRole("link");

    expect(links.map((link) => link.textContent)).toEqual([
      "Today",
      "Projects",
      "Library",
      "Creator DNA",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/today",
      "/projects",
      "/library",
      "/creator-dna",
    ]);
    expect(nav).toBeTruthy();
  });

  it("marks the active destination, including nested routes", () => {
    render(<MobileTabBar />);

    expect(
      screen.getByRole("link", { name: "Projects" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen.getByRole("link", { name: "Today" }).getAttribute("aria-current"),
    ).toBeNull();
  });

  it("is hidden by default and only appears at mobile widths, never on desktop", () => {
    render(<MobileTabBar />);

    const className = screen.getByRole("navigation", {
      name: "Primary navigation",
    }).className;

    expect(className).toMatch(/(?:^|\s)hidden(?:\s|$)/);
    expect(className).toMatch(/max-\[760px\]:flex/);
  });

  it("is fixed to the viewport bottom", () => {
    render(<MobileTabBar />);

    const className = screen.getByRole("navigation", {
      name: "Primary navigation",
    }).className;

    expect(className).toMatch(/fixed/);
    expect(className).toMatch(/bottom-0/);
  });
});
