import type { ProjectSummary } from "@creonome/contracts";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectIndex } from "./project-index";

const projects: ProjectSummary[] = [
  {
    id: "0198f3a2-82dd-7000-8000-000000000020",
    opportunityId: "7af6fdcc-8881-48c2-ae5d-3f45df1bd0a2",
    title: "Warehouse tape loop",
    status: "active",
    currentLevel: "storyboard",
    currentVersion: 3,
    updatedAt: "2026-08-02T12:03:00.000Z",
    platform: "tiktok",
    score: 91,
    hasScript: true,
    hasStoryboard: true,
    hasVideo: false,
  },
  {
    id: "0198f3a2-82dd-7000-8000-000000000021",
    opportunityId: null,
    title: "Quiet studio reveal",
    status: "active",
    currentLevel: "script",
    currentVersion: 1,
    updatedAt: "2026-08-02T11:03:00.000Z",
    platform: "instagram",
    score: null,
    hasScript: true,
    hasStoryboard: false,
    hasVideo: false,
  },
];

describe("ProjectIndex", () => {
  it("links every live project and filters by maturity", () => {
    render(<ProjectIndex projects={projects} />);

    expect(screen.getByText("Warehouse tape loop")).toBeTruthy();
    expect(screen.getByText("Quiet studio reveal")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: /Open Warehouse tape loop/i })
        .getAttribute("href"),
    ).toBe(`/projects/${projects[0]!.id}`);

    fireEvent.click(screen.getByRole("button", { name: /^Script 1$/ }));
    expect(screen.queryByText("Warehouse tape loop")).toBeNull();
    expect(screen.getByText("Quiet studio reveal")).toBeTruthy();
  });

  it("searches titles without changing the source collection", () => {
    render(<ProjectIndex projects={projects} />);

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search projects" }),
      {
        target: { value: "warehouse" },
      },
    );
    expect(screen.getByText("Warehouse tape loop")).toBeTruthy();
    expect(screen.queryByText("Quiet studio reveal")).toBeNull();
  });
});
