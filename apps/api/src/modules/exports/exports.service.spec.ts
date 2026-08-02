import type {
  CreateProjectExportInput,
  ProjectDetail,
} from "@creonome/contracts";
import { describe, expect, it, vi } from "vitest";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import type { ProjectsService } from "../projects/projects.service.js";
import type { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import type { ExportsRepository } from "./exports.repository.js";
import { ExportsService } from "./exports.service.js";

const principal: AuthPrincipal = {
  subject: "0198f3a2-82dd-7000-8000-000000000001",
};

const project = {
  id: "0198f3a2-82dd-7000-8000-000000000020",
  opportunityId: null,
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
  script: {
    id: "0198f3a2-82dd-7000-8000-000000000022",
    projectId: "0198f3a2-82dd-7000-8000-000000000020",
    title: "Warehouse tape loop",
    hook: "Let the room breathe.",
    body: "Drop the needle.",
    callToAction: null,
    caption: null,
    platforms: ["tiktok"],
    durationSeconds: 20,
  },
  storyboard: null,
  versions: [],
  latestJob: null,
} satisfies ProjectDetail;

function createService() {
  const projects = {
    get: vi.fn().mockResolvedValue(project),
  } as unknown as ProjectsService;
  const workspaces = {
    resolve: vi.fn().mockResolvedValue({
      workspaceId: "0198f3a2-82dd-7000-8000-000000000002",
      userId: "0198f3a2-82dd-7000-8000-000000000003",
      creatorProfileId: "0198f3a2-82dd-7000-8000-000000000004",
    }),
  } as unknown as WorkspaceContextService;
  const repository = {
    createCompleted: vi.fn().mockResolvedValue({
      id: "0198f3a2-82dd-7000-8000-000000000080",
      createdAt: new Date("2026-08-02T06:00:00.000Z"),
    }),
  } as unknown as ExportsRepository;
  return {
    service: new ExportsService(workspaces, projects, repository),
    repository,
  };
}

describe("ExportsService", () => {
  it("authorizes the project, records the export and returns its content", async () => {
    const { service, repository } = createService();
    const input: CreateProjectExportInput = { format: "markdown" };

    await expect(
      service.create(principal, project.id, input),
    ).resolves.toMatchObject({
      projectId: project.id,
      status: "ready",
      fileName: "warehouse-tape-loop.md",
      content: expect.stringContaining("## Script"),
    });
    expect(repository.createCompleted).toHaveBeenCalledWith({
      workspaceId: "0198f3a2-82dd-7000-8000-000000000002",
      projectId: project.id,
      userId: "0198f3a2-82dd-7000-8000-000000000003",
      format: "markdown",
    });
  });
});
