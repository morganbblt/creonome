import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import IntegrationsPage from "./settings/integrations/page";
import PrivacyPage from "./settings/privacy/page";

describe("management pages", () => {
  it("renders provider states and privacy controls", () => {
    const { unmount } = render(<IntegrationsPage />);
    expect(screen.getByRole("heading", { name: "Integrations" })).toBeTruthy();
    expect(screen.getByText("TikTok")).toBeTruthy();
    expect(screen.getByText("Instagram")).toBeTruthy();
    expect(screen.getAllByText("Coming soon")).toHaveLength(2);
    expect(screen.queryByText("Configuration required")).toBeNull();
    unmount();

    render(<PrivacyPage />);
    expect(screen.getByRole("heading", { name: "Your data" })).toBeTruthy();
    expect(screen.getByText("Creator DNA · JSON")).toBeTruthy();
    expect(screen.getByText("Delete my account")).toBeTruthy();
  });
});
