import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CreatorDnaPage from "./creator-dna/page";
import LibraryPage from "./library/page";
import ProjectsPage from "./projects/page";
import IntegrationsPage from "./settings/integrations/page";
import PrivacyPage from "./settings/privacy/page";

describe("management pages", () => {
  it("renders project levels and the current creative work", () => {
    render(<ProjectsPage />);
    expect(screen.getByRole("heading", { name: "Projects" })).toBeTruthy();
    expect(screen.getByText("Flip the crate find in one take")).toBeTruthy();
    expect(screen.getByText("Storyboard 2")).toBeTruthy();
  });

  it("renders the mixed media library", () => {
    render(<LibraryPage />);
    expect(screen.getByRole("heading", { name: "Library" })).toBeTruthy();
    expect(screen.getByText("warehouse_01.mov")).toBeTruthy();
    expect(screen.getByText("tape_loop_A.wav")).toBeTruthy();
  });

  it("renders all fourteen creator DNA dimensions", () => {
    render(<CreatorDnaPage />);
    expect(screen.getByRole("heading", { name: "Creator DNA" })).toBeTruthy();
    expect(screen.getAllByTestId("dna-dimension")).toHaveLength(14);
    expect(screen.getByText("Memory candidates")).toBeTruthy();
  });

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
