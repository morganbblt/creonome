import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import IntegrationsPage from "./settings/integrations/page";
import PrivacyPage from "./settings/privacy/page";

const getPrivacy = vi.fn().mockResolvedValue({
  preferences: {
    modelTrainingOptIn: false,
    keepRushesAfterExport: true,
    updatedAt: "2026-08-02T10:00:00.000Z",
  },
  accountDeletion: null,
});

vi.mock("@/src/lib/api/server-client", () => ({
  createServerApiClient: () => ({ getPrivacy }),
}));

describe("management pages", () => {
  it("renders provider states", () => {
    const { unmount } = render(<IntegrationsPage />);
    expect(screen.getByRole("heading", { name: "Integrations" })).toBeTruthy();
    expect(screen.getByText("TikTok")).toBeTruthy();
    expect(screen.getByText("Instagram")).toBeTruthy();
    expect(screen.getAllByText("Coming soon")).toHaveLength(2);
    expect(screen.queryByText("Configuration required")).toBeNull();
    unmount();
  });

  it("renders authenticated privacy controls", async () => {
    render(await PrivacyPage());
    expect(screen.getByRole("heading", { name: "Your data" })).toBeTruthy();
    expect(screen.getByText("Creator DNA · JSON")).toBeTruthy();
    expect(screen.getByText("Projects & scripts · JSON")).toBeTruthy();
    expect(screen.getByText("Delete my account")).toBeTruthy();
  });
});
