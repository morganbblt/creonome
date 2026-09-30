import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SettingsPage from "./page";

describe("SettingsPage", () => {
  it("renders a hub heading and links to every existing settings section", () => {
    render(<SettingsPage />);

    expect(screen.getByRole("heading", { name: "Settings" })).toBeTruthy();

    const billing = screen.getByRole("link", { name: /billing/i });
    expect(billing.getAttribute("href")).toBe("/settings/billing");

    const integrations = screen.getByRole("link", { name: /integrations/i });
    expect(integrations.getAttribute("href")).toBe("/settings/integrations");

    const privacy = screen.getByRole("link", { name: /privacy/i });
    expect(privacy.getAttribute("href")).toBe("/settings/privacy");
  });

  it("shows a language placeholder that is honest about French-only support", () => {
    render(<SettingsPage />);

    expect(screen.getByRole("heading", { name: "Language" })).toBeTruthy();
    expect(screen.getByText(/Français uniquement pour le moment/)).toBeTruthy();
  });

  it("explains the single-user status instead of showing a cold error state", () => {
    render(<SettingsPage />);

    expect(screen.getByRole("heading", { name: "Members" })).toBeTruthy();
    expect(screen.getByText("Creonome is single-user for now")).toBeTruthy();
    expect(screen.getByText(/team workspaces/i)).toBeTruthy();

    const seatPlansLink = screen.getByRole("link", {
      name: /view seat plans/i,
    });
    expect(seatPlansLink.getAttribute("href")).toBe("/settings/billing");
  });
});
