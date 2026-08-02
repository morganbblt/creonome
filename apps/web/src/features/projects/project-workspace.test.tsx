import type { ProjectDetail } from "@creonome/contracts";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectWorkspace } from "./project-workspace";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

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
    body: "[0:00-0:08] Hold for two seconds. [0:08-0:15] Lower the needle. [0:15-0:35] Reveal the kick.",
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
        startSeconds: 0,
        heading: "Silence",
        description: "A hand lowers the needle in one locked shot.",
        shotType: "close-up",
        voiceover: null,
        onScreenText: "Wait for it.",
        bRoll: null,
        transition: null,
        requiredAsset: null,
        sound: null,
        editingNote: null,
        referenceFrameUrl: null,
        durationSeconds: 7,
      },
    ],
  },
  video: null,
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
  it("opens the latest deliverable first and navigates older tabs", () => {
    render(<ProjectWorkspace project={project} />);

    expect(
      screen.getByRole("heading", { level: 1, name: project.title }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("tab", { name: "Storyboard" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(screen.queryByText(project.script!.hook)).toBeNull();
    expect(screen.getByRole("heading", { name: "01 · Silence" })).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Script" }));
    expect(screen.getByText(project.script!.hook)).toBeTruthy();
    expect(screen.getAllByTestId("script-segment")).toHaveLength(3);
    expect(screen.queryByRole("heading", { name: "01 · Silence" })).toBeNull();
    expect(screen.getByText("Built the first visual sequence.")).toBeTruthy();
    expect(screen.getByText("Current level", { exact: false })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Download Markdown" }),
    ).toBeTruthy();
  });

  it("opens a generated MVP video first and keeps storyboard history available", () => {
    render(
      <ProjectWorkspace
        project={{
          ...project,
          currentLevel: "video",
          currentVersion: 4,
          hasVideo: true,
          video: {
            id: "0198f3a2-82dd-7000-8000-000000000050",
            projectId: project.id,
            previewUrl: "/demo/creonome-vertical-demo.mp4",
            mimeType: "video/mp4",
            durationSeconds: 35,
            width: 540,
            height: 960,
            simulated: true,
            createdAt: "2026-08-02T12:04:00.000Z",
          },
        }}
      />,
    );

    expect(
      screen.getByRole("tab", { name: "Video" }).getAttribute("aria-selected"),
    ).toBe("true");
    expect(screen.getByLabelText("Generated vertical video")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: /download mvp video/i })
        .getAttribute("href"),
    ).toBe("/demo/creonome-vertical-demo.mp4");
    fireEvent.click(screen.getByRole("tab", { name: "Storyboard" }));
    expect(screen.getByRole("heading", { name: "01 · Silence" })).toBeTruthy();
  });

  it("offers the final video level after a storyboard exists", () => {
    render(<ProjectWorkspace project={project} />);

    expect(
      screen.getByRole("button", { name: /generate mvp video · 12 cr/i }),
    ).toBeTruthy();
  });
});
