import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LandingPage } from "./landing-page";

describe("LandingPage", () => {
  it("leads with the value proposition and a primary call to action", () => {
    render(<LandingPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /know what to make next/i,
      }),
    ).toBeTruthy();
    expect(
      screen.getAllByRole("link", { name: /get started free/i })[0]?.getAttribute(
        "href",
      ),
    ).toBe("/auth/sign-up");
    expect(
      screen.getAllByRole("link", { name: "Sign in" })[0]?.getAttribute("href"),
    ).toBe("/auth/sign-in");
  });

  it("explains the three pillars", () => {
    render(<LandingPage />);

    expect(screen.getByText("Trend intelligence")).toBeTruthy();
    expect(screen.getByText("Creator DNA")).toBeTruthy();
    expect(screen.getByText("Creative production")).toBeTruthy();
  });

  it("links to legal pages from the footer", () => {
    render(<LandingPage />);

    expect(
      screen.getByRole("link", { name: "Privacy" }).getAttribute("href"),
    ).toBe("/legal/privacy");
    expect(
      screen.getByRole("link", { name: "Terms" }).getAttribute("href"),
    ).toBe("/legal/terms");
  });
});
