import type { ProjectDetail } from "@creonome/contracts";
import { describe, expect, it } from "vitest";
import {
  buildProjectMarkdown,
  projectExportFileName,
} from "./project-markdown.js";

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
        startSeconds: 0,
        heading: "Silence",
        description: "A hand lowers the needle in one locked shot.",
        shotType: "close-up",
        voiceover: null,
        onScreenText: "Wait for it.",
        bRoll: null,
        transition: "hard cut",
        requiredAsset: "needle macro",
        sound: "room tone",
        editingNote: "hold the first frame",
        referenceFrameUrl: null,
        durationSeconds: 7,
      },
    ],
  },
  video: null,
  versions: [],
  latestJob: null,
};

describe("project Markdown export", () => {
  it("serializes the latest script and every shootable scene detail", () => {
    const markdown = buildProjectMarkdown(project);

    expect(markdown).toContain("# Warehouse tape loop");
    expect(markdown).toContain("## Script");
    expect(markdown).toContain(project.script!.hook);
    expect(markdown).toContain("## Storyboard");
    expect(markdown).toContain("### 01 · Silence (00:00–00:07)");
    expect(markdown).toContain("**Required asset:** needle macro");
    expect(markdown).toContain("**Editing note:** hold the first frame");
  });

  it("builds a portable lowercase file name", () => {
    expect(projectExportFileName("Été / Warehouse: Tape Loop")).toBe(
      "ete-warehouse-tape-loop.md",
    );
  });
});
