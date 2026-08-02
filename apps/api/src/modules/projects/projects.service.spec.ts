import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import type { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import type { ProjectsRepository } from "./projects.repository.js";
import { ProjectsService } from "./projects.service.js";

const principal: AuthPrincipal = {
  subject: "0198f3a2-82dd-7000-8000-000000000001",
};
const projectId = "0198f3a2-82dd-7000-8000-000000000002";

const summaryRecord = {
  id: projectId,
  opportunityId: "0198f3a2-82dd-7000-8000-000000000003",
  title: "Warehouse tape loop",
  status: "active",
  currentLevel: "storyboard",
  currentVersion: 3,
  updatedAt: new Date("2026-08-02T10:00:00.000Z"),
  platform: "tiktok",
  score: 91,
};

function createService(detail: Record<string, unknown> | null = null) {
  const workspaces = {
    resolve: vi.fn().mockResolvedValue({ workspaceId: "workspace-1" }),
  } as unknown as WorkspaceContextService;
  const repository: ProjectsRepository = {
    list: vi.fn().mockResolvedValue([summaryRecord]),
    findById: vi.fn().mockResolvedValue(detail),
    findStoryboardUpgradeByIdempotency: vi.fn(),
    findExistingStoryboardUpgrade: vi.fn(),
    findStoryboardSource: vi.fn(),
    createStoryboardUpgrade: vi.fn(),
    findVideoUpgradeByIdempotency: vi.fn(),
    findExistingVideoUpgrade: vi.fn(),
    findVideoSource: vi.fn(),
    createVideoUpgrade: vi.fn(),
  };

  return { service: new ProjectsService(workspaces, repository), repository };
}

describe("ProjectsService", () => {
  it("lists workspace projects with maturity metadata", async () => {
    const { service, repository } = createService();

    await expect(service.list(principal)).resolves.toEqual({
      projects: [
        expect.objectContaining({
          id: projectId,
          platform: "tiktok",
          score: 91,
          hasScript: true,
          hasStoryboard: true,
          hasVideo: false,
          updatedAt: "2026-08-02T10:00:00.000Z",
        }),
      ],
    });
    expect(repository.list).toHaveBeenCalledWith("workspace-1");
  });

  it("returns the latest script, storyboard, versions and job", async () => {
    const { service } = createService({
      ...summaryRecord,
      script: {
        id: "0198f3a2-82dd-7000-8000-000000000010",
        projectId,
        title: "Warehouse tape loop",
        hook: "Let the room breathe. Then drop the needle.",
        body: "A restrained performance that opens into the full track.",
        callToAction: "What would you sample?",
        caption: "One room. One take.",
        platforms: ["tiktok", "instagram"],
        durationSeconds: 35,
      },
      storyboard: {
        id: "0198f3a2-82dd-7000-8000-000000000020",
        title: "Warehouse tape loop",
        aspectRatio: "9:16",
        durationSeconds: 35,
        scenes: [
          {
            id: "0198f3a2-82dd-7000-8000-000000000021",
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
      video: {
        id: "0198f3a2-82dd-7000-8000-000000000040",
        projectId,
        previewUrl: "/demo/creonome-vertical-demo.mp4",
        mimeType: "video/mp4",
        durationSeconds: 35,
        width: 540,
        height: 960,
        simulated: true,
        createdAt: new Date("2026-08-02T10:00:00.000Z"),
      },
      versions: [
        {
          version: 3,
          level: "storyboard",
          changeSource: "ai",
          changeSummary: "Built the first visual sequence.",
          lockedFields: ["duration"],
          createdAt: new Date("2026-08-02T10:00:00.000Z"),
        },
      ],
      latestJob: {
        id: "0198f3a2-82dd-7000-8000-000000000030",
        kind: "storyboard",
        provider: "gemini",
        model: "gemini-3.6-flash",
        status: "succeeded",
        progress: 100,
        errorCode: null,
        errorMessage: null,
        createdAt: new Date("2026-08-02T09:59:00.000Z"),
        updatedAt: new Date("2026-08-02T10:00:00.000Z"),
        completedAt: new Date("2026-08-02T10:00:00.000Z"),
      },
    });

    await expect(service.get(principal, projectId)).resolves.toMatchObject({
      id: projectId,
      currentLevel: "storyboard",
      script: { durationSeconds: 35 },
      storyboard: { scenes: [{ heading: "Silence" }] },
      video: {
        previewUrl: "/demo/creonome-vertical-demo.mp4",
        simulated: true,
      },
      versions: [{ createdAt: "2026-08-02T10:00:00.000Z" }],
      latestJob: { status: "succeeded" },
    });
  });

  it("does not reveal projects outside the resolved workspace", async () => {
    const { service } = createService(null);

    await expect(service.get(principal, projectId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
