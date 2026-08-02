import type { ProjectDetail, ProjectList } from "@creonome/contracts";
import { describe, expect, it, vi } from "vitest";
import { loadProject, loadProjects } from "./projects-data";

const project = {
  id: "0198f3a2-82dd-7000-8000-000000000020",
  opportunityId: "7af6fdcc-8881-48c2-ae5d-3f45df1bd0a2",
  title: "Warehouse tape loop",
  status: "active",
  currentLevel: "script",
  currentVersion: 2,
  updatedAt: "2026-08-02T12:03:00.000Z",
  platform: "tiktok",
  score: 91,
  hasScript: true,
  hasStoryboard: false,
  hasVideo: false,
} as const;

describe("project data", () => {
  it("returns live projects without demo fallbacks", async () => {
    const response: ProjectList = { projects: [project] };
    const result = await loadProjects({
      getProjects: vi.fn().mockResolvedValue(response),
    });

    expect(result).toEqual({ source: "api", projects: [project] });
  });

  it("marks an unavailable backend instead of returning phantom projects", async () => {
    const result = await loadProjects({
      getProjects: vi.fn().mockRejectedValue(new Error("offline")),
    });

    expect(result).toEqual({ source: "unavailable", projects: [] });
  });

  it("loads one project or returns null when it cannot be read", async () => {
    const detail: ProjectDetail = {
      ...project,
      script: null,
      storyboard: null,
      video: null,
      versions: [],
      latestJob: null,
    };
    await expect(
      loadProject(
        { getProject: vi.fn().mockResolvedValue(detail) },
        project.id,
      ),
    ).resolves.toEqual(detail);
    await expect(
      loadProject(
        { getProject: vi.fn().mockRejectedValue(new Error("missing")) },
        project.id,
      ),
    ).resolves.toBeNull();
  });
});
