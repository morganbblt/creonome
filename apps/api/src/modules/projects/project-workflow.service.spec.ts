import {
  HttpException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { StructuredGenerator } from "../ai/structured-generator.js";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import type { CreditsService } from "../credits/credits.service.js";
import type { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import type { ProjectsRepository } from "./projects.repository.js";
import { ProjectWorkflowService } from "./project-workflow.service.js";

const principal: AuthPrincipal = {
  subject: "0198f3a2-82dd-7000-8000-000000000001",
};

const context = {
  userId: "0198f3a2-82dd-7000-8000-000000000010",
  workspaceId: "0198f3a2-82dd-7000-8000-000000000011",
  creatorProfileId: "0198f3a2-82dd-7000-8000-000000000012",
};

const projectId = "0198f3a2-82dd-7000-8000-000000000020";
const now = new Date("2026-08-02T10:00:00.000Z");

const source = {
  project: {
    id: projectId,
    opportunityId: "0198f3a2-82dd-7000-8000-000000000013",
    title: "The silence before the drop",
    status: "active",
    currentLevel: "script",
    currentVersion: 2,
    updatedAt: now,
  },
  script: {
    id: "0198f3a2-82dd-7000-8000-000000000021",
    projectId,
    title: "The silence before the drop",
    hook: "Hold the empty room.",
    body: "Lower the needle, wait for the first kick, then reveal the session.",
    callToAction: "What arrives after your silence?",
    caption: "The room is part of the arrangement.",
    platforms: ["tiktok", "instagram"],
    durationSeconds: 30,
  },
};

const generated = {
  title: "The silence before the drop — storyboard",
  aspectRatio: "9:16",
  durationSeconds: 30,
  scenes: [
    {
      heading: "Hold the room",
      description: "Locked close-up on the silent speaker cone.",
      shotType: "Extreme close-up",
      voiceover: "Hold the empty room.",
      onScreenText: "Before the drop",
      bRoll: "Dust moving through the studio light.",
      transition: "Hard cut on the needle touch.",
      requiredAsset: "Studio speaker close-up",
      sound: "Room tone only",
      editingNote: "Keep the first frame still for two seconds.",
      referenceFrameUrl: null,
      durationSeconds: 8,
    },
    {
      heading: "Make the gesture",
      description: "Hand lowers the needle while the camera tracks down.",
      shotType: "Macro tracking shot",
      voiceover: null,
      onScreenText: null,
      bRoll: "DAW playhead waiting at bar one.",
      transition: "Cut on action.",
      requiredAsset: "Turntable and hand insert",
      sound: "Needle contact and vinyl noise",
      editingNote: "Let the contact transient lead the next cut.",
      referenceFrameUrl: null,
      durationSeconds: 9,
    },
    {
      heading: "Land the reveal",
      description: "Wide reveal of the creator and the full session.",
      shotType: "Wide handheld reveal",
      voiceover: "Then let the first kick arrive alone.",
      onScreenText: "One detail. One decision.",
      bRoll: "Meters moving with the first kick.",
      transition: "End on a clean loop.",
      requiredAsset: "Wide studio performance take",
      sound: "Track master from the first kick",
      editingNote: "Match the final pose to the opening silhouette.",
      referenceFrameUrl: null,
      durationSeconds: 13,
    },
  ],
};

function upgradeRecord() {
  let startSeconds = 0;
  return {
    project: {
      ...source.project,
      currentLevel: "storyboard",
      currentVersion: 3,
      updatedAt: now,
    },
    storyboard: {
      id: "0198f3a2-82dd-7000-8000-000000000030",
      title: generated.title,
      aspectRatio: generated.aspectRatio,
      durationSeconds: generated.durationSeconds,
      scenes: generated.scenes.map((scene, index) => {
        const record = {
          ...scene,
          id: `0198f3a2-82dd-7000-8000-00000000003${index + 1}`,
          position: index + 1,
          startSeconds,
        };
        startSeconds += scene.durationSeconds;
        return record;
      }),
    },
    job: {
      id: "0198f3a2-82dd-7000-8000-000000000040",
      kind: "storyboard",
      provider: "gemini",
      model: "gemini-3.6-flash",
      status: "succeeded",
      progress: 100,
      errorCode: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
      completedAt: now,
    },
  };
}

function setup(options?: {
  existing?: boolean;
  idempotent?: boolean;
  missing?: boolean;
  generatorRejects?: boolean;
  persistenceRejects?: boolean;
}) {
  const workspaces = {
    resolve: vi.fn().mockResolvedValue(context),
  } as unknown as WorkspaceContextService;
  const repository = {
    list: vi.fn(),
    findById: vi.fn(),
    findStoryboardUpgradeByIdempotency: vi
      .fn()
      .mockResolvedValue(options?.idempotent ? upgradeRecord() : null),
    findExistingStoryboardUpgrade: vi
      .fn()
      .mockResolvedValue(options?.existing ? upgradeRecord() : null),
    findStoryboardSource: vi
      .fn()
      .mockResolvedValue(options?.missing ? null : source),
    createStoryboardUpgrade: options?.persistenceRejects
      ? vi.fn().mockRejectedValue(new Error("database unavailable"))
      : vi.fn().mockResolvedValue(upgradeRecord()),
  } as unknown as ProjectsRepository;
  const credits = {
    getAccount: vi.fn().mockResolvedValue({
      balance: 58,
      reserved: 0,
      available: 58,
    }),
    reserve: vi.fn().mockResolvedValue({
      balance: 58,
      reserved: 4,
      available: 54,
    }),
    commit: vi.fn().mockResolvedValue({
      balance: 54,
      reserved: 0,
      available: 54,
    }),
    release: vi.fn().mockResolvedValue({
      balance: 58,
      reserved: 0,
      available: 58,
    }),
  } as unknown as CreditsService;
  const generator = {
    generate: options?.generatorRejects
      ? vi.fn().mockRejectedValue(new Error("quota unavailable"))
      : vi.fn().mockResolvedValue(generated),
  } as unknown as StructuredGenerator;

  return {
    service: new ProjectWorkflowService(
      workspaces,
      repository,
      credits,
      generator,
    ),
    repository,
    credits,
  };
}

describe("ProjectWorkflowService", () => {
  it("reserves and commits four credits around a persisted storyboard", async () => {
    const { service, repository, credits } = setup();

    await expect(
      service.upgrade(
        principal,
        projectId,
        { targetLevel: "storyboard", confirmedCreditCost: true },
        "upgrade-storyboard-1",
      ),
    ).resolves.toMatchObject({
      project: { currentLevel: "storyboard", currentVersion: 3 },
      storyboard: { scenes: [{ startSeconds: 0 }, {}, { startSeconds: 17 }] },
      credits: { balance: 54, reserved: 0 },
    });
    expect(credits.reserve).toHaveBeenCalledBefore(
      vi.mocked(repository.createStoryboardUpgrade),
    );
    expect(repository.createStoryboardUpgrade).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: context.workspaceId,
        projectId,
        idempotencyKey: "upgrade-storyboard-1",
        provider: "vertex-ai",
        model: "gemini-3.5-flash",
        generated,
      }),
    );
    expect(credits.commit).toHaveBeenCalledWith(
      context.workspaceId,
      4,
      "upgrade-storyboard-1:commit",
      expect.stringMatching(/storyboard/i),
    );
  });

  it("returns an existing storyboard without reserving credits", async () => {
    const { service, repository, credits } = setup({ existing: true });

    await expect(
      service.upgrade(
        principal,
        projectId,
        { targetLevel: "storyboard", confirmedCreditCost: true },
        "upgrade-storyboard-existing",
      ),
    ).resolves.toMatchObject({
      project: { currentLevel: "storyboard" },
      credits: { balance: 58, reserved: 0 },
    });
    expect(repository.findExistingStoryboardUpgrade).toHaveBeenCalledWith(
      context.workspaceId,
      projectId,
    );
    expect(credits.reserve).not.toHaveBeenCalled();
    expect(repository.createStoryboardUpgrade).not.toHaveBeenCalled();
  });

  it("finishes an idempotent credit commit without regenerating", async () => {
    const { service, repository, credits } = setup({ idempotent: true });

    await expect(
      service.upgrade(
        principal,
        projectId,
        { targetLevel: "storyboard", confirmedCreditCost: true },
        "upgrade-storyboard-resume",
      ),
    ).resolves.toMatchObject({ credits: { balance: 54, reserved: 0 } });
    expect(credits.commit).toHaveBeenCalledWith(
      context.workspaceId,
      4,
      "upgrade-storyboard-resume:commit",
      expect.stringMatching(/storyboard/i),
    );
    expect(credits.reserve).not.toHaveBeenCalled();
    expect(repository.createStoryboardUpgrade).not.toHaveBeenCalled();
  });

  it("uses a deterministic storyboard when Gemini is unavailable", async () => {
    const { service, repository, credits } = setup({ generatorRejects: true });

    await service.upgrade(
      principal,
      projectId,
      { targetLevel: "storyboard", confirmedCreditCost: true },
      "upgrade-storyboard-fallback",
    );

    expect(repository.createStoryboardUpgrade).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "creonome",
        model: "deterministic-storyboard-v1",
        generated: expect.objectContaining({
          scenes: expect.arrayContaining([
            expect.objectContaining({ editingNote: expect.any(String) }),
          ]),
        }),
      }),
    );
    expect(credits.commit).toHaveBeenCalled();
    expect(credits.release).not.toHaveBeenCalled();
  });

  it("releases the reservation if persistence fails", async () => {
    const { service, credits } = setup({ persistenceRejects: true });

    const failure = await service
      .upgrade(
        principal,
        projectId,
        { targetLevel: "storyboard", confirmedCreditCost: true },
        "upgrade-storyboard-2",
      )
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ServiceUnavailableException);
    expect(
      (failure as ServiceUnavailableException).getResponse(),
    ).toMatchObject({ retryMode: "new_request" });
    expect(credits.release).toHaveBeenCalledWith(
      context.workspaceId,
      4,
      "upgrade-storyboard-2:release",
      expect.stringMatching(/failed/i),
    );
  });

  it("does not reserve credits for an unavailable project", async () => {
    const { service, credits } = setup({ missing: true });

    await expect(
      service.upgrade(
        principal,
        projectId,
        { targetLevel: "storyboard", confirmedCreditCost: true },
        "upgrade-storyboard-missing",
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(credits.reserve).not.toHaveBeenCalled();
  });

  it("requires a valid idempotency key before reserving credits", async () => {
    const { service, credits } = setup();

    await expect(
      service.upgrade(
        principal,
        projectId,
        { targetLevel: "storyboard", confirmedCreditCost: true },
        "",
      ),
    ).rejects.toBeInstanceOf(HttpException);
    expect(credits.reserve).not.toHaveBeenCalled();
  });
});
