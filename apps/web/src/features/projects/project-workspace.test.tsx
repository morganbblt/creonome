import type { ProjectDetail } from "@creonome/contracts";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectWorkspace } from "./project-workspace";

const project: ProjectDetail = {
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
  script: {
    id: "0198f3a2-82dd-7000-8000-000000000022",
    projectId: "0198f3a2-82dd-7000-8000-000000000020",
    title: "Warehouse tape loop",
    hook: "Let the room breathe. Then drop the needle.",
    body: "Hold for two seconds, lower the needle, then reveal the kick.",
    callToAction: "What comes after your silence?",
    caption: "The room is part of the arrangement.",
    platforms: ["tiktok", "instagram"],
    durationSeconds: 35,
  },
  storyboard: {
    id: "0198f3a2-82dd-7000-8000-000000000023",
    title: "Warehouse tape loop",
    aspectRatio: "9:16",
    durationSeconds: 35,
    scenes: [
      {
        id: "0198f3a2-82dd-7000-8000-000000000024",
        position: 1,
        heading: "Silence",
        description: "A hand lowers the needle in one locked shot.",
        shotType: "close-up",
        voiceover: null,
        onScreenText: "Wait for it.",
        durationSeconds: 7,
      },
    ],
  },
  versions: [
    {
      version: 3,
      level: "storyboard",
      changeSource: "ai",
      changeSummary: "Built the first visual sequence.",
      lockedFields: ["duration"],
      createdAt: "2026-08-02T12:03:00.000Z",
    },
  ],
  latestJob: null,
};

describe("ProjectWorkspace", () => {
  it("renders the persisted script, storyboard scene and version history", () => {
    render(<ProjectWorkspace project={project} />);

    expect(
      screen.getByRole("heading", { level: 1, name: project.title }),
    ).toBeTruthy();
    expect(screen.getByText(project.script!.hook)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "01 · Silence" })).toBeTruthy();
    expect(screen.getByText("Built the first visual sequence.")).toBeTruthy();
    expect(screen.getByText("Current level", { exact: false })).toBeTruthy();
  });
});
