import {
  BadRequestException,
  HttpException,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { StructuredGenerator } from "../ai/structured-generator.js";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import type { CreatorDnaService } from "../creator-dna/creator-dna.service.js";
import type { CreditsService } from "../credits/credits.service.js";
import type { GenerationJobEnqueueService } from "../jobs/generation-job-enqueue.service.js";
import type {
  InternalJobRecord,
  JobsRepository,
} from "../jobs/jobs.repository.js";
import type { QualityGateService } from "../quality-gate/quality-gate.service.js";
import type { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import type { ProjectsRepository } from "./projects.repository.js";
import { ProjectWorkflowService } from "./project-workflow.service.js";
import type {
  GeneratedVideoArtifact,
  VideoProvider,
} from "./video/video-provider.js";

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
const storyboardJobId = "0198f3a2-82dd-7000-8000-000000000098";
const videoJobId = "0198f3a2-82dd-7000-8000-000000000099";

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
          assetId: null as string | null,
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

const deterministicVideo: GeneratedVideoArtifact = {
  previewUrl: "/demo/creonome-vertical-demo.mp4",
  gcsUri: "mvp://workspace/project/video.mp4",
  mimeType: "video/mp4",
  durationSeconds: 8,
  width: 540,
  height: 960,
  byteSize: 771_365,
  provider: "creonome",
  model: "deterministic-motion-preview-v1",
  simulated: true,
  fallbackReasonCode: "VEO_QUOTA",
};

const realVideo: GeneratedVideoArtifact = {
  ...deterministicVideo,
  previewUrl: `/api/creonome/projects/${projectId}/video`,
  gcsUri: "gs://creonome-media/generated-videos/workspace/project/video.mp4",
  width: 720,
  height: 1280,
  byteSize: 2_048,
  provider: "google-gemini-api",
  model: "veo-3.1-fast-generate-preview",
  simulated: false,
  fallbackReasonCode: null,
};

function videoUpgradeRecord(
  artifact: GeneratedVideoArtifact = deterministicVideo,
) {
  return {
    project: {
      ...source.project,
      currentLevel: "video",
      currentVersion: 4,
      updatedAt: now,
    },
    video: {
      id: "0198f3a2-82dd-7000-8000-000000000060",
      projectId,
      previewUrl: artifact.previewUrl,
      gcsUri: artifact.gcsUri,
      mimeType: artifact.mimeType,
      durationSeconds: artifact.durationSeconds,
      width: artifact.width,
      height: artifact.height,
      provider: artifact.provider,
      model: artifact.model,
      simulated: artifact.simulated,
      createdAt: now,
    },
    job: {
      id: "0198f3a2-82dd-7000-8000-000000000061",
      kind: "video_render",
      provider: artifact.provider,
      model: artifact.model,
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

function currentStoryboardAfterSceneUpdate(
  sceneId: string,
  generatedScene: Record<string, unknown>,
) {
  const base = upgradeRecord();
  const merged = base.storyboard.scenes.map((scene) =>
    scene.id === sceneId ? { ...scene, ...generatedScene } : scene,
  );
  let startSeconds = 0;
  const scenes = merged.map((scene) => {
    const result = { ...scene, startSeconds };
    startSeconds += scene.durationSeconds ?? 0;
    return result;
  });
  return {
    project: {
      ...base.project,
      currentVersion: base.project.currentVersion + 1,
    },
    storyboard: {
      ...base.storyboard,
      durationSeconds: scenes.reduce(
        (total, scene) => total + (scene.durationSeconds ?? 0),
        0,
      ),
      scenes,
    },
  };
}

function currentStoryboardAfterAssetAttach(
  sceneId: string,
  assetId: string | null,
) {
  const base = upgradeRecord();
  const scenes = base.storyboard.scenes.map((scene) =>
    scene.id === sceneId ? { ...scene, assetId } : scene,
  );
  return {
    project: {
      ...base.project,
      currentVersion: base.project.currentVersion + 1,
    },
    storyboard: { ...base.storyboard, scenes },
  };
}

function currentStoryboardAfterReorder(orderedSceneIds: string[]) {
  const base = upgradeRecord();
  let startSeconds = 0;
  const scenes = orderedSceneIds.map((id, index) => {
    const scene = base.storyboard.scenes.find(
      (candidate) => candidate.id === id,
    )!;
    const result = { ...scene, position: index + 1, startSeconds };
    startSeconds += scene.durationSeconds ?? 0;
    return result;
  });
  return {
    project: {
      ...base.project,
      currentVersion: base.project.currentVersion + 1,
    },
    storyboard: { ...base.storyboard, scenes },
  };
}

function currentScriptAfterUpdate(generatedBlocks: Record<string, unknown>) {
  return {
    project: {
      ...source.project,
      currentVersion: source.project.currentVersion + 1,
    },
    script: { ...source.script, ...generatedBlocks },
  };
}

function queuedJob(
  kind: "storyboard" | "video_render",
  overrides: Partial<InternalJobRecord> = {},
): InternalJobRecord {
  return {
    id: kind === "storyboard" ? storyboardJobId : videoJobId,
    kind,
    provider: "pending",
    model: "pending",
    status: "queued",
    progress: 0,
    errorCode: null,
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    workspaceId: context.workspaceId,
    projectId,
    requestedByUserId: context.userId,
    idempotencyKey:
      kind === "storyboard" ? "upgrade-storyboard-1" : "upgrade-video-1",
    input: {
      workspaceId: context.workspaceId,
      userId: context.userId,
      creatorProfileId: context.creatorProfileId,
      projectId,
    },
    ...overrides,
  };
}

function setup(options?: {
  existing?: boolean;
  idempotent?: boolean;
  missing?: boolean;
  generatorRejects?: boolean;
  persistenceRejects?: boolean;
  realVideo?: boolean;
  videoRejects?: boolean;
  storyboardGateRejects?: boolean;
  videoGateRejects?: boolean;
  scriptGateRejects?: boolean;
  videoExisting?: boolean;
  videoIdempotent?: boolean;
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
    findVideoUpgradeByIdempotency: vi
      .fn()
      .mockResolvedValue(
        options?.videoIdempotent ? videoUpgradeRecord() : null,
      ),
    findExistingVideoUpgrade: vi
      .fn()
      .mockResolvedValue(options?.videoExisting ? videoUpgradeRecord() : null),
    findVideoSource: vi.fn().mockResolvedValue({
      project: {
        ...source.project,
        currentLevel: "storyboard",
        currentVersion: 3,
      },
      script: source.script,
      storyboard: upgradeRecord().storyboard,
      creativeIdentity: {
        stageName: "Nova Sainte",
        bio: "Independent electronic artist",
        audienceDescription: "Curious producers",
        languages: ["English"],
        genres: ["ambient"],
        dnaSummary: "Restrained studio storytelling.",
        traits: ["tone: precise"],
      },
    }),
    createVideoUpgrade: vi
      .fn()
      .mockImplementation(({ artifact }) =>
        Promise.resolve(videoUpgradeRecord(artifact)),
      ),
    updateStoryboardScene: vi
      .fn()
      .mockImplementation(({ sceneId, generated }) =>
        Promise.resolve(currentStoryboardAfterSceneUpdate(sceneId, generated)),
      ),
    reorderStoryboardScenes: vi
      .fn()
      .mockImplementation(({ orderedSceneIds }) =>
        Promise.resolve(currentStoryboardAfterReorder(orderedSceneIds)),
      ),
    attachStoryboardSceneAsset: vi
      .fn()
      .mockImplementation(({ sceneId, assetId }) => {
        if (assetId === "0198f3a2-82dd-7000-8000-00000000009a") {
          return Promise.resolve({ outcome: "asset_not_found" });
        }
        return Promise.resolve({
          outcome: "ok",
          record: currentStoryboardAfterAssetAttach(sceneId, assetId),
        });
      }),
    updateScriptBlocks: vi
      .fn()
      .mockImplementation(({ generated }) =>
        Promise.resolve(currentScriptAfterUpdate(generated)),
      ),
  } as unknown as ProjectsRepository;
  const credits = {
    getAccount: vi.fn().mockResolvedValue({
      balance: 58,
      reserved: 0,
      available: 58,
    }),
    getAccountForWorkspace: vi.fn().mockResolvedValue({
      balance: 58,
      reserved: 4,
      available: 54,
    }),
    reserve: vi.fn().mockImplementation((_workspaceId, amount: number) => ({
      balance: 58,
      reserved: amount,
      available: 58 - amount,
    })),
    commit: vi.fn().mockImplementation((_workspaceId, amount: number) => ({
      balance: 58 - amount,
      reserved: 0,
      available: 58 - amount,
    })),
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
  const videoProvider = {
    generate: options?.videoRejects
      ? vi.fn().mockRejectedValue(new Error("both providers unavailable"))
      : vi
          .fn()
          .mockResolvedValue(
            options?.realVideo ? realVideo : deterministicVideo,
          ),
  } as VideoProvider;
  const storyboardRejection = {
    passed: false,
    violations: [
      {
        code: "forbidden_topic",
        message:
          'Generated content references "alcohol", which conflicts with the creator boundary "No alcohol brand promotions".',
      },
    ],
  };
  const videoRejection = {
    passed: false,
    violations: [
      {
        code: "invalid_aspect_ratio",
        message: "Video must be rendered in 9:16.",
      },
    ],
  };
  const scriptRejection = {
    passed: false,
    violations: [
      {
        code: "missing_call_to_action" as const,
        message: "The script is missing a clear call to action.",
      },
    ],
  };
  const qualityGate = {
    evaluateScript: vi
      .fn()
      .mockResolvedValue(
        options?.scriptGateRejects
          ? scriptRejection
          : { passed: true, violations: [] },
      ),
    evaluateStoryboard: vi
      .fn()
      .mockResolvedValue(
        options?.storyboardGateRejects
          ? storyboardRejection
          : { passed: true, violations: [] },
      ),
    evaluateVideo: vi
      .fn()
      .mockResolvedValue(
        options?.videoGateRejects
          ? videoRejection
          : { passed: true, violations: [] },
      ),
  } as unknown as QualityGateService;
  const creatorDna = {
    getForWorkspaceContext: vi.fn().mockResolvedValue({
      version: 1,
      summary: "A restrained, studio-focused music creator.",
      confirmed: true,
      traits: [],
    }),
  } as unknown as CreatorDnaService;
  const enqueue = {
    createAndEnqueue: vi
      .fn()
      .mockImplementation(({ kind }) =>
        Promise.resolve(
          queuedJob(kind === "video_render" ? "video_render" : "storyboard"),
        ),
      ),
  } as unknown as GenerationJobEnqueueService;
  const jobsFindResult: Record<string, InternalJobRecord> = {
    [storyboardJobId]: queuedJob("storyboard"),
    [videoJobId]: queuedJob("video_render"),
  };
  const jobs: JobsRepository = {
    findById: vi.fn(),
    findByIdUnscoped: vi
      .fn()
      .mockImplementation((jobId: string) =>
        Promise.resolve(jobsFindResult[jobId] ?? null),
      ),
    cancel: vi.fn(),
    retry: vi.fn(),
    create: vi.fn(),
    markRunning: vi
      .fn()
      .mockImplementation((jobId: string) =>
        Promise.resolve({ ...jobsFindResult[jobId], status: "running" }),
      ),
    markSucceeded: vi.fn(),
    markFailed: vi.fn(),
  };

  return {
    service: new ProjectWorkflowService(
      workspaces,
      repository,
      credits,
      generator,
      videoProvider,
      qualityGate,
      creatorDna,
      enqueue,
      jobs,
    ),
    repository,
    credits,
    generator,
    videoProvider,
    qualityGate,
    creatorDna,
    enqueue,
    jobs,
  };
}

describe("ProjectWorkflowService.upgrade (video)", () => {
  it("reserves credits and queues a video generation job instead of rendering inline", async () => {
    const { service, credits, enqueue, repository, videoProvider } = setup();

    const result = await service.upgrade(
      principal,
      projectId,
      { targetLevel: "video", confirmedCreditCost: true, lockedFields: [] },
      "upgrade-video-1",
    );

    expect(credits.reserve).toHaveBeenCalledWith(
      context.workspaceId,
      12,
      "upgrade-video-1:reserve",
      expect.stringMatching(/video/i),
    );
    expect(enqueue.createAndEnqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "video_render",
        projectId,
        idempotencyKey: "upgrade-video-1",
      }),
    );
    expect(result).toMatchObject({
      job: { id: videoJobId, status: "queued" },
    });
    expect(videoProvider.generate).not.toHaveBeenCalled();
    expect(repository.createVideoUpgrade).not.toHaveBeenCalled();
  });

  it("regenerates an already-produced video instead of returning the cached one", async () => {
    const { service, credits, enqueue, repository, videoProvider } = setup({
      videoExisting: true,
    });

    const result = await service.upgrade(
      principal,
      projectId,
      {
        targetLevel: "video",
        confirmedCreditCost: true,
        lockedFields: ["durationSeconds"],
      },
      "upgrade-video-new-request",
    );

    // A fresh idempotency key against an already-produced level reserves
    // credits and queues a new job — it does not short-circuit to the
    // previous artifact. Only a literal retry of the *same* idempotency
    // key does that (see "finishes an idempotent video commit ...").
    expect(credits.reserve).toHaveBeenCalledWith(
      context.workspaceId,
      12,
      "upgrade-video-new-request:reserve",
      expect.stringMatching(/video/i),
    );
    expect(enqueue.createAndEnqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "video_render",
        projectId,
        idempotencyKey: "upgrade-video-new-request",
        input: expect.objectContaining({
          lockedFields: ["durationSeconds"],
        }),
      }),
    );
    expect(result).toMatchObject({ job: { status: "queued" } });
    expect(videoProvider.generate).not.toHaveBeenCalled();
    expect(repository.createVideoUpgrade).not.toHaveBeenCalled();
  });

  it("finishes an idempotent video commit without re-queueing", async () => {
    const { service, credits, enqueue } = setup({ videoIdempotent: true });

    await expect(
      service.upgrade(
        principal,
        projectId,
        { targetLevel: "video", confirmedCreditCost: true, lockedFields: [] },
        "upgrade-video-resume",
      ),
    ).resolves.toMatchObject({ video: { simulated: true } });
    expect(credits.commit).toHaveBeenCalledWith(
      context.workspaceId,
      12,
      "upgrade-video-resume:commit",
      expect.stringMatching(/video/i),
    );
    expect(credits.reserve).not.toHaveBeenCalled();
    expect(enqueue.createAndEnqueue).not.toHaveBeenCalled();
  });

  it("releases reserved credits and fails clearly when the queue is unavailable", async () => {
    const { service, credits, enqueue } = setup();
    vi.mocked(enqueue.createAndEnqueue).mockRejectedValueOnce(
      new Error("Cloud Tasks is not configured"),
    );

    await expect(
      service.upgrade(
        principal,
        projectId,
        { targetLevel: "video", confirmedCreditCost: true, lockedFields: [] },
        "upgrade-video-queue-down",
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ retryMode: "new_request" }),
    });
    expect(credits.release).toHaveBeenCalledWith(
      context.workspaceId,
      12,
      "upgrade-video-queue-down:release",
      expect.stringMatching(/queue/i),
    );
  });
});

describe("ProjectWorkflowService.executeQueuedVideoUpgrade", () => {
  it("persists the deterministic fallback and atomically commits twelve credits", async () => {
    const { service, repository, credits, videoProvider, jobs } = setup();

    await service.executeQueuedVideoUpgrade(videoJobId);

    expect(jobs.markRunning).toHaveBeenCalledWith(videoJobId);
    expect(repository.createVideoUpgrade).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: context.workspaceId,
        projectId,
        idempotencyKey: "upgrade-video-1",
        jobId: videoJobId,
        artifact: expect.objectContaining({
          simulated: true,
          fallbackReasonCode: "VEO_QUOTA",
        }),
      }),
    );
    expect(videoProvider.generate).toHaveBeenCalledTimes(1);
    expect(credits.commit).toHaveBeenCalledWith(
      context.workspaceId,
      12,
      "upgrade-video-1:commit",
      expect.stringMatching(/video/i),
    );
  });

  it("commits credits when a real Veo render succeeds", async () => {
    const { service, repository, credits } = setup({ realVideo: true });

    await service.executeQueuedVideoUpgrade(videoJobId);

    expect(repository.createVideoUpgrade).toHaveBeenCalledWith(
      expect.objectContaining({ artifact: realVideo }),
    );
    expect(credits.commit).toHaveBeenCalledTimes(1);
    expect(credits.release).not.toHaveBeenCalled();
  });

  it("carries a locked field through a video regeneration while an unlocked field changes freely", async () => {
    const { service, repository, credits, jobs, videoProvider } = setup({
      videoExisting: true,
    });
    vi.mocked(jobs.findByIdUnscoped).mockResolvedValueOnce(
      queuedJob("video_render", {
        input: {
          workspaceId: context.workspaceId,
          userId: context.userId,
          creatorProfileId: context.creatorProfileId,
          projectId,
          lockedFields: ["width"],
        },
      }),
    );
    // width matches the previous render (locked, compliant); height differs
    // (unlocked, allowed to change).
    vi.mocked(videoProvider.generate).mockResolvedValueOnce({
      ...deterministicVideo,
      height: 1280,
    });

    await service.executeQueuedVideoUpgrade(videoJobId);

    expect(videoProvider.generate).toHaveBeenCalledTimes(1); // compliant, no retry
    expect(repository.createVideoUpgrade).toHaveBeenCalledWith(
      expect.objectContaining({
        artifact: expect.objectContaining({
          width: deterministicVideo.width, // the locked field survived
          height: 1280, // the unlocked field was allowed to change
        }),
        lockedFields: ["width"],
      }),
    );
    expect(credits.commit).toHaveBeenCalled();
    expect(jobs.markFailed).not.toHaveBeenCalled();
  });

  it("retries once, then fails clearly instead of silently persisting a locked-field violation on a video render", async () => {
    const { service, repository, credits, jobs, videoProvider } = setup({
      videoExisting: true,
    });
    vi.mocked(jobs.findByIdUnscoped).mockResolvedValueOnce(
      queuedJob("video_render", {
        input: {
          workspaceId: context.workspaceId,
          userId: context.userId,
          creatorProfileId: context.creatorProfileId,
          projectId,
          lockedFields: ["width"],
        },
      }),
    );
    // Both attempts ignore the lock and change the locked width.
    vi.mocked(videoProvider.generate)
      .mockResolvedValueOnce({ ...deterministicVideo, width: 720 })
      .mockResolvedValueOnce({ ...deterministicVideo, width: 810 });

    await service.executeQueuedVideoUpgrade(videoJobId);

    expect(videoProvider.generate).toHaveBeenCalledTimes(2);
    expect(repository.createVideoUpgrade).not.toHaveBeenCalled();
    expect(credits.commit).not.toHaveBeenCalled();
    expect(jobs.markFailed).toHaveBeenCalledWith(
      videoJobId,
      "failed_final",
      "LOCKED_FIELD_VIOLATION",
      expect.stringContaining("width"),
    );
    expect(credits.release).toHaveBeenCalledWith(
      context.workspaceId,
      12,
      "upgrade-video-1:release",
      expect.stringMatching(/failed/i),
    );
  });

  it("rejects a video whose render fails the pre-publish content gate and releases the reservation", async () => {
    const { service, credits, repository, qualityGate, jobs } = setup({
      videoGateRejects: true,
    });

    await service.executeQueuedVideoUpgrade(videoJobId);

    expect(qualityGate.evaluateVideo).toHaveBeenCalledWith(
      context.creatorProfileId,
      expect.objectContaining({ width: expect.any(Number) }),
    );
    expect(repository.createVideoUpgrade).not.toHaveBeenCalled();
    expect(credits.commit).not.toHaveBeenCalled();
    expect(jobs.markFailed).toHaveBeenCalledWith(
      videoJobId,
      "failed_final",
      "QUALITY_GATE_REJECTED",
      expect.any(String),
    );
    expect(credits.release).toHaveBeenCalledWith(
      context.workspaceId,
      12,
      "upgrade-video-1:release",
      expect.stringMatching(/failed/i),
    );
  });

  it("fails the job when neither video provider produced an artifact", async () => {
    const { service, credits, repository, jobs } = setup({
      videoRejects: true,
    });

    await service.executeQueuedVideoUpgrade(videoJobId);

    expect(repository.createVideoUpgrade).not.toHaveBeenCalled();
    expect(credits.commit).not.toHaveBeenCalled();
    expect(jobs.markFailed).toHaveBeenCalledWith(
      videoJobId,
      "failed_retryable",
      "GENERATION_FAILED",
      expect.any(String),
    );
    expect(credits.release).toHaveBeenCalledTimes(1);
  });

  it("keeps a succeeded job untouched when only the commit confirmation fails", async () => {
    const { service, credits, jobs } = setup();
    vi.mocked(credits.commit).mockRejectedValueOnce(
      new Error("credit commit unavailable"),
    );

    await service.executeQueuedVideoUpgrade(videoJobId);

    expect(jobs.markFailed).not.toHaveBeenCalled();
    expect(credits.release).not.toHaveBeenCalled();
  });
});

describe("ProjectWorkflowService.upgrade (storyboard)", () => {
  it("reserves credits and queues a storyboard generation job instead of generating inline", async () => {
    const { service, repository, credits, enqueue } = setup();

    const result = await service.upgrade(
      principal,
      projectId,
      {
        targetLevel: "storyboard",
        confirmedCreditCost: true,
        lockedFields: [],
      },
      "upgrade-storyboard-1",
    );

    expect(credits.reserve).toHaveBeenCalledWith(
      context.workspaceId,
      4,
      "upgrade-storyboard-1:reserve",
      expect.stringMatching(/storyboard/i),
    );
    expect(enqueue.createAndEnqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "storyboard",
        projectId,
        idempotencyKey: "upgrade-storyboard-1",
      }),
    );
    expect(result).toMatchObject({
      job: { id: storyboardJobId, status: "queued" },
    });
    expect(repository.createStoryboardUpgrade).not.toHaveBeenCalled();
  });

  it("regenerates an already-produced storyboard instead of returning the cached one", async () => {
    const { service, repository, credits, enqueue, generator } = setup({
      existing: true,
    });

    const result = await service.upgrade(
      principal,
      projectId,
      {
        targetLevel: "storyboard",
        confirmedCreditCost: true,
        lockedFields: ["title"],
      },
      "upgrade-storyboard-new-request",
    );

    // A fresh idempotency key against an already-produced level reserves
    // credits and queues a new job — it does not short-circuit to the
    // previous artifact. Only a literal retry of the *same* idempotency
    // key does that (see "finishes an idempotent credit commit ...").
    expect(credits.reserve).toHaveBeenCalledWith(
      context.workspaceId,
      4,
      "upgrade-storyboard-new-request:reserve",
      expect.stringMatching(/storyboard/i),
    );
    expect(enqueue.createAndEnqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "storyboard",
        projectId,
        idempotencyKey: "upgrade-storyboard-new-request",
        input: expect.objectContaining({
          lockedFields: ["title"],
        }),
      }),
    );
    expect(result).toMatchObject({ job: { status: "queued" } });
    expect(generator.generate).not.toHaveBeenCalled();
    expect(repository.createStoryboardUpgrade).not.toHaveBeenCalled();
  });

  it("finishes an idempotent credit commit without regenerating", async () => {
    const { service, repository, credits, enqueue } = setup({
      idempotent: true,
    });

    await expect(
      service.upgrade(
        principal,
        projectId,
        {
          targetLevel: "storyboard",
          confirmedCreditCost: true,
          lockedFields: [],
        },
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
    expect(enqueue.createAndEnqueue).not.toHaveBeenCalled();
  });

  it("does not reserve credits for an unavailable project", async () => {
    const { service, credits } = setup({ missing: true });

    await expect(
      service.upgrade(
        principal,
        projectId,
        {
          targetLevel: "storyboard",
          confirmedCreditCost: true,
          lockedFields: [],
        },
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
        {
          targetLevel: "storyboard",
          confirmedCreditCost: true,
          lockedFields: [],
        },
        "",
      ),
    ).rejects.toBeInstanceOf(HttpException);
    expect(credits.reserve).not.toHaveBeenCalled();
  });
});

describe("ProjectWorkflowService.executeQueuedStoryboardUpgrade", () => {
  it("marks the job running, generates, persists and commits four credits", async () => {
    const { service, repository, credits, jobs } = setup();

    await service.executeQueuedStoryboardUpgrade(storyboardJobId);

    expect(jobs.markRunning).toHaveBeenCalledWith(storyboardJobId);
    expect(repository.createStoryboardUpgrade).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: context.workspaceId,
        projectId,
        idempotencyKey: "upgrade-storyboard-1",
        provider: "vertex-ai",
        model: "gemini-3.5-flash",
        generated,
        jobId: storyboardJobId,
      }),
    );
    expect(credits.commit).toHaveBeenCalledWith(
      context.workspaceId,
      4,
      "upgrade-storyboard-1:commit",
      expect.stringMatching(/storyboard/i),
    );
  });

  it("injects the creator's forbidden-layer traits as hard constraints into the storyboard prompt", async () => {
    const { service, generator, creatorDna } = setup();
    vi.mocked(creatorDna.getForWorkspaceContext).mockResolvedValueOnce({
      version: 1,
      summary: "A restrained, studio-focused music creator.",
      confirmed: true,
      traits: [
        {
          id: "trait-1",
          category: "boundary",
          label: "Boundary 1",
          value: "No alcohol brand promotions",
          layer: "forbidden",
          confidence: 1,
          evidence: {},
        },
      ],
    });

    await service.executeQueuedStoryboardUpgrade(storyboardJobId);

    expect(creatorDna.getForWorkspaceContext).toHaveBeenCalledWith(
      expect.objectContaining({ creatorProfileId: context.creatorProfileId }),
    );
    expect(generator.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining(
          "Hard constraints, must not violate under any circumstance: No alcohol brand promotions.",
        ),
      }),
    );
  });

  it("carries a locked field through a regeneration while an unlocked field changes freely", async () => {
    const { service, repository, credits, jobs, generator } = setup({
      existing: true,
    });
    vi.mocked(jobs.findByIdUnscoped).mockResolvedValueOnce(
      queuedJob("storyboard", {
        input: {
          workspaceId: context.workspaceId,
          userId: context.userId,
          creatorProfileId: context.creatorProfileId,
          projectId,
          lockedFields: ["title"],
        },
      }),
    );
    // The model complies with the lock (title unchanged from the previous
    // version) but is free to change the unlocked aspectRatio.
    vi.mocked(generator.generate).mockResolvedValueOnce({
      ...generated,
      aspectRatio: "1:1",
    });

    await service.executeQueuedStoryboardUpgrade(storyboardJobId);

    expect(generator.generate).toHaveBeenCalledTimes(1); // compliant on the first attempt, no retry
    expect(repository.createStoryboardUpgrade).toHaveBeenCalledWith(
      expect.objectContaining({
        generated: expect.objectContaining({
          title: generated.title, // the locked field survived
          aspectRatio: "1:1", // the unlocked field was allowed to change
        }),
        lockedFields: ["title"],
      }),
    );
    expect(credits.commit).toHaveBeenCalled();
    expect(jobs.markFailed).not.toHaveBeenCalled();
  });

  it("retries once with a stricter prompt, then fails clearly instead of silently persisting a locked-field violation", async () => {
    const { service, repository, credits, jobs, generator } = setup({
      existing: true,
    });
    vi.mocked(jobs.findByIdUnscoped).mockResolvedValueOnce(
      queuedJob("storyboard", {
        input: {
          workspaceId: context.workspaceId,
          userId: context.userId,
          creatorProfileId: context.creatorProfileId,
          projectId,
          lockedFields: ["title"],
        },
      }),
    );
    // Both attempts ignore the lock and change the locked title.
    vi.mocked(generator.generate)
      .mockResolvedValueOnce({ ...generated, title: "Ignoring the lock v1" })
      .mockResolvedValueOnce({ ...generated, title: "Ignoring the lock v2" });

    await service.executeQueuedStoryboardUpgrade(storyboardJobId);

    expect(generator.generate).toHaveBeenCalledTimes(2);
    expect(generator.generate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        prompt: expect.stringContaining("STRICT REQUIREMENT"),
      }),
    );
    // The violating result must never be persisted as a success.
    expect(repository.createStoryboardUpgrade).not.toHaveBeenCalled();
    expect(credits.commit).not.toHaveBeenCalled();
    expect(jobs.markFailed).toHaveBeenCalledWith(
      storyboardJobId,
      "failed_final",
      "LOCKED_FIELD_VIOLATION",
      expect.stringContaining("title"),
    );
    expect(credits.release).toHaveBeenCalledWith(
      context.workspaceId,
      4,
      "upgrade-storyboard-1:release",
      expect.stringMatching(/failed/i),
    );
  });

  it("uses a deterministic storyboard when Gemini is unavailable", async () => {
    const { service, repository, credits } = setup({
      generatorRejects: true,
    });

    await service.executeQueuedStoryboardUpgrade(storyboardJobId);

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

  it("rejects a storyboard that fails the pre-publish content gate and releases the reservation", async () => {
    const { service, credits, repository, qualityGate, jobs } = setup({
      storyboardGateRejects: true,
    });

    await service.executeQueuedStoryboardUpgrade(storyboardJobId);

    expect(qualityGate.evaluateStoryboard).toHaveBeenCalledWith(
      context.creatorProfileId,
      expect.objectContaining({ durationSeconds: expect.any(Number) }),
    );
    expect(repository.createStoryboardUpgrade).not.toHaveBeenCalled();
    expect(credits.commit).not.toHaveBeenCalled();
    expect(jobs.markFailed).toHaveBeenCalledWith(
      storyboardJobId,
      "failed_final",
      "QUALITY_GATE_REJECTED",
      expect.any(String),
    );
    expect(credits.release).toHaveBeenCalledWith(
      context.workspaceId,
      4,
      "upgrade-storyboard-1:release",
      expect.stringMatching(/failed/i),
    );
  });

  it("fails the job and releases the reservation if persistence fails", async () => {
    const { service, credits, jobs } = setup({ persistenceRejects: true });

    await service.executeQueuedStoryboardUpgrade(storyboardJobId);

    expect(jobs.markFailed).toHaveBeenCalledWith(
      storyboardJobId,
      "failed_retryable",
      "GENERATION_FAILED",
      "database unavailable",
    );
    expect(credits.release).toHaveBeenCalledWith(
      context.workspaceId,
      4,
      "upgrade-storyboard-1:release",
      expect.stringMatching(/failed/i),
    );
  });

  it("keeps a succeeded job untouched when only the commit confirmation fails", async () => {
    const { service, credits, jobs } = setup();
    vi.mocked(credits.commit).mockRejectedValueOnce(
      new Error("credit commit unavailable"),
    );

    await service.executeQueuedStoryboardUpgrade(storyboardJobId);

    expect(jobs.markFailed).not.toHaveBeenCalled();
    expect(credits.release).not.toHaveBeenCalled();
  });

  it("is a no-op when the job is not (or is no longer) queued", async () => {
    const { service, jobs, repository } = setup();
    vi.mocked(jobs.findByIdUnscoped).mockResolvedValueOnce(
      queuedJob("storyboard", { status: "succeeded" }),
    );

    await service.executeQueuedStoryboardUpgrade(storyboardJobId);

    expect(jobs.markRunning).not.toHaveBeenCalled();
    expect(repository.createStoryboardUpgrade).not.toHaveBeenCalled();
  });
});

const generatedScriptBlocks = {
  hook: "A punchier opening line.",
  body: source.script.body,
  callToAction: source.script.callToAction,
  caption: source.script.caption,
};

describe("ProjectWorkflowService.regenerateScriptBlock", () => {
  it("regenerates the targeted block synchronously, with no credits or job involved", async () => {
    const { service, repository, generator, credits, enqueue } = setup();
    vi.mocked(generator.generate).mockResolvedValueOnce(generatedScriptBlocks);

    const result = await service.regenerateScriptBlock(principal, projectId, {
      field: "hook",
      instruction: "Make the hook punchier",
      lockedFields: ["body"],
    });

    expect(generator.generate).toHaveBeenCalledTimes(1);
    expect(repository.updateScriptBlocks).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: context.workspaceId,
        projectId,
        scriptId: source.script.id,
        generated: generatedScriptBlocks,
        lockedFields: ["body"],
      }),
    );
    expect(result).toMatchObject({
      script: expect.objectContaining({ hook: generatedScriptBlocks.hook }),
    });
    // Synchronous and free — unlike storyboard/video /upgrade.
    expect(credits.reserve).not.toHaveBeenCalled();
    expect(enqueue.createAndEnqueue).not.toHaveBeenCalled();
  });

  it("rejects up front when the block being changed is also locked", async () => {
    const { service, generator } = setup();

    await expect(
      service.regenerateScriptBlock(principal, projectId, {
        field: "hook",
        instruction: "Make the hook punchier",
        lockedFields: ["hook"],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(generator.generate).not.toHaveBeenCalled();
  });

  it("carries a locked block through a regeneration while an unlocked one changes freely", async () => {
    const { service, repository, generator } = setup();
    vi.mocked(generator.generate).mockResolvedValueOnce({
      ...generatedScriptBlocks,
      hook: source.script.hook, // locked, compliant
      body: "A completely different body.", // unlocked, free to change
    });

    await service.regenerateScriptBlock(principal, projectId, {
      field: "body",
      instruction: "Rewrite the body",
      lockedFields: ["hook"],
    });

    expect(generator.generate).toHaveBeenCalledTimes(1); // compliant, no retry
    expect(repository.updateScriptBlocks).toHaveBeenCalledWith(
      expect.objectContaining({
        generated: expect.objectContaining({
          hook: source.script.hook,
          body: "A completely different body.",
        }),
      }),
    );
  });

  it("retries once with a stricter prompt, then rejects instead of persisting a locked-block violation", async () => {
    const { service, repository, generator } = setup();
    vi.mocked(generator.generate)
      .mockResolvedValueOnce({
        ...generatedScriptBlocks,
        hook: "Ignoring the lock v1",
      })
      .mockResolvedValueOnce({
        ...generatedScriptBlocks,
        hook: "Ignoring the lock v2",
      });

    await expect(
      service.regenerateScriptBlock(principal, projectId, {
        field: "body",
        instruction: "Rewrite the body",
        lockedFields: ["hook"],
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    expect(generator.generate).toHaveBeenCalledTimes(2);
    expect(generator.generate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        prompt: expect.stringContaining("STRICT REQUIREMENT"),
      }),
    );
    expect(repository.updateScriptBlocks).not.toHaveBeenCalled();
  });

  it("uses a deterministic local fallback when the generator is unavailable, leaving non-target blocks untouched", async () => {
    const { service, repository } = setup({ generatorRejects: true });

    await service.regenerateScriptBlock(principal, projectId, {
      field: "body",
      instruction: "Tighten this up",
      lockedFields: ["hook", "callToAction"],
    });

    expect(repository.updateScriptBlocks).toHaveBeenCalledWith(
      expect.objectContaining({
        generated: expect.objectContaining({
          hook: source.script.hook, // untouched
          callToAction: source.script.callToAction, // untouched
          body: expect.stringContaining("Tighten this up"),
        }),
      }),
    );
  });

  it("rejects a script that fails the pre-publish quality gate without persisting it", async () => {
    const { service, repository, generator } = setup({
      scriptGateRejects: true,
    });
    vi.mocked(generator.generate).mockResolvedValueOnce(generatedScriptBlocks);

    await expect(
      service.regenerateScriptBlock(principal, projectId, {
        field: "hook",
        instruction: "Make the hook punchier",
        lockedFields: [],
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(repository.updateScriptBlocks).not.toHaveBeenCalled();
  });

  it("fails clearly when the project has no script yet", async () => {
    const { service } = setup({ missing: true });

    await expect(
      service.regenerateScriptBlock(principal, projectId, {
        field: "hook",
        instruction: "Make the hook punchier",
        lockedFields: [],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("ProjectWorkflowService.regenerateStoryboardScene", () => {
  const sceneId = "0198f3a2-82dd-7000-8000-000000000031"; // position 1
  const generatedScene = {
    heading: "A brand new opening",
    description: "Reworked opening beat.",
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
  };

  it("regenerates exactly one scene, leaving the others as generated (i.e. untouched by this call)", async () => {
    const { service, repository, generator } = setup({ existing: true });
    vi.mocked(generator.generate).mockResolvedValueOnce(generatedScene);

    const result = await service.regenerateStoryboardScene(
      principal,
      projectId,
      sceneId,
      { instruction: "Open on something else", lockedFields: [] },
    );

    expect(generator.generate).toHaveBeenCalledTimes(1);
    expect(repository.updateStoryboardScene).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: context.workspaceId,
        projectId,
        sceneId,
        generated: generatedScene,
        lockedFields: [],
      }),
    );
    expect(result.storyboard.scenes).toHaveLength(
      upgradeRecord().storyboard.scenes.length,
    );
  });

  it("rejects an unknown lock field name before calling the generator", async () => {
    const { service, generator } = setup({ existing: true });

    await expect(
      service.regenerateStoryboardScene(principal, projectId, sceneId, {
        lockedFields: ["notAField"],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(generator.generate).not.toHaveBeenCalled();
  });

  it("carries a locked scene field through the regeneration while an unlocked one changes freely", async () => {
    const { service, repository, generator } = setup({ existing: true });
    const previousScene = upgradeRecord().storyboard.scenes[0]!;
    vi.mocked(generator.generate).mockResolvedValueOnce({
      ...generatedScene,
      voiceover: previousScene.voiceover, // locked, compliant
      heading: "A brand new heading", // unlocked, free to change
    });

    await service.regenerateStoryboardScene(principal, projectId, sceneId, {
      lockedFields: ["voiceover"],
    });

    expect(generator.generate).toHaveBeenCalledTimes(1); // compliant, no retry
    expect(repository.updateStoryboardScene).toHaveBeenCalledWith(
      expect.objectContaining({
        generated: expect.objectContaining({
          voiceover: previousScene.voiceover,
          heading: "A brand new heading",
        }),
        lockedFields: ["scene:1:voiceover"],
      }),
    );
  });

  it("retries once, then rejects instead of persisting a locked scene-field violation — leaving other scenes unaffected", async () => {
    const { service, repository, generator } = setup({ existing: true });
    vi.mocked(generator.generate)
      .mockResolvedValueOnce({
        ...generatedScene,
        voiceover: "Ignoring the lock v1",
      })
      .mockResolvedValueOnce({
        ...generatedScene,
        voiceover: "Ignoring the lock v2",
      });

    await expect(
      service.regenerateStoryboardScene(principal, projectId, sceneId, {
        lockedFields: ["voiceover"],
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    expect(generator.generate).toHaveBeenCalledTimes(2);
    // Never persisted — scene 2 and beyond, and the locked field on scene
    // 1, are all left exactly as they were.
    expect(repository.updateStoryboardScene).not.toHaveBeenCalled();
  });

  it("404s when the scene id does not belong to the current storyboard", async () => {
    const { service } = setup({ existing: true });

    await expect(
      service.regenerateStoryboardScene(
        principal,
        projectId,
        "0198f3a2-82dd-7000-8000-000000000099",
        { lockedFields: [] },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("never sends assetId to the repository, so a scene's attached asset can't be clobbered by a regenerate", async () => {
    // GeneratedStoryboardScene deliberately has no assetId field (see
    // projects.repository.ts) -- this asserts that contract holds at the
    // call site: `generated` here is exactly what
    // NeonProjectsRepository#updateStoryboardScene passes to `.set(...)`,
    // so an omitted key is what makes the SQL UPDATE leave the asset_id
    // column untouched (bible-style lock-preservation, but for a field
    // that was never AI-generated content in the first place).
    const { service, repository, generator } = setup({ existing: true });
    vi.mocked(generator.generate).mockResolvedValueOnce(generatedScene);

    await service.regenerateStoryboardScene(principal, projectId, sceneId, {
      instruction: "Open on something else",
      lockedFields: [],
    });

    const call = vi.mocked(repository.updateStoryboardScene).mock.calls[0]![0];
    expect(call.generated).not.toHaveProperty("assetId");
  });
});

describe("ProjectWorkflowService.attachStoryboardSceneAsset", () => {
  const sceneId = "0198f3a2-82dd-7000-8000-000000000031"; // position 1
  const assetId = "0198f3a2-82dd-7000-8000-000000000099";
  const generatedScene = {
    heading: "A brand new opening",
    description: "Reworked opening beat.",
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
  };

  it("attaches an asset to a scene without calling the generator", async () => {
    const { service, repository, generator } = setup({ existing: true });

    const result = await service.attachStoryboardSceneAsset(
      principal,
      projectId,
      sceneId,
      { assetId },
    );

    expect(generator.generate).not.toHaveBeenCalled();
    expect(repository.attachStoryboardSceneAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: context.workspaceId,
        projectId,
        sceneId,
        assetId,
      }),
    );
    const attachedScene = result.storyboard.scenes.find(
      (scene) => scene.id === sceneId,
    );
    expect(attachedScene).toMatchObject({ assetId });
  });

  it("detaches an asset from a scene with assetId: null", async () => {
    const { service, repository } = setup({ existing: true });

    await service.attachStoryboardSceneAsset(principal, projectId, sceneId, {
      assetId: null,
    });

    expect(repository.attachStoryboardSceneAsset).toHaveBeenCalledWith(
      expect.objectContaining({ sceneId, assetId: null }),
    );
  });

  it("404s when the scene id does not belong to the current storyboard", async () => {
    const { service } = setup({ existing: true });

    await expect(
      service.attachStoryboardSceneAsset(
        principal,
        projectId,
        "0198f3a2-82dd-7000-8000-000000000099",
        { assetId },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("404s when the project has no storyboard yet", async () => {
    const { service } = setup({ existing: false });

    await expect(
      service.attachStoryboardSceneAsset(principal, projectId, sceneId, {
        assetId,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("400s when the asset does not belong to the current workspace", async () => {
    const { service } = setup({ existing: true });

    await expect(
      service.attachStoryboardSceneAsset(principal, projectId, sceneId, {
        assetId: "0198f3a2-82dd-7000-8000-00000000009a",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("survives a later regenerate of the same scene (repository never receives an overwrite)", async () => {
    const { service, repository, generator } = setup({ existing: true });

    await service.attachStoryboardSceneAsset(principal, projectId, sceneId, {
      assetId,
    });
    vi.mocked(generator.generate).mockResolvedValueOnce(generatedScene);
    await service.regenerateStoryboardScene(principal, projectId, sceneId, {
      instruction: "Open on something else",
      lockedFields: [],
    });

    // The regenerate call's payload to the repository never carries
    // assetId (see the assertion above in the regenerateStoryboardScene
    // suite) -- so the earlier attach is never overwritten by this call,
    // regardless of what NeonProjectsRepository#updateStoryboardScene's
    // partial `.set(...)` actually persists.
    const regenerateCall = vi.mocked(repository.updateStoryboardScene).mock
      .calls[0]![0];
    expect(regenerateCall.generated).not.toHaveProperty("assetId");
  });
});

describe("ProjectWorkflowService.reorderStoryboardScenes", () => {
  it("reorders the scenes and bumps the project version with no generation involved", async () => {
    const { service, repository, generator } = setup({ existing: true });
    const scenes = upgradeRecord().storyboard.scenes;
    const reversedIds = [...scenes].reverse().map((scene) => scene.id);

    const result = await service.reorderStoryboardScenes(principal, projectId, {
      sceneIds: reversedIds,
    });

    expect(repository.reorderStoryboardScenes).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: context.workspaceId,
        projectId,
        storyboardId: upgradeRecord().storyboard.id,
        orderedSceneIds: reversedIds,
      }),
    );
    expect(result.storyboard.scenes.map((scene) => scene.id)).toEqual(
      reversedIds,
    );
    expect(generator.generate).not.toHaveBeenCalled();
  });

  it("rejects an order that is not a permutation of the storyboard's current scenes", async () => {
    const { service, repository } = setup({ existing: true });
    vi.mocked(repository.reorderStoryboardScenes).mockResolvedValueOnce(null);

    await expect(
      service.reorderStoryboardScenes(principal, projectId, {
        sceneIds: ["0198f3a2-82dd-7000-8000-000000000099"],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("404s when the project has no storyboard yet", async () => {
    const { service } = setup();

    await expect(
      service.reorderStoryboardScenes(principal, projectId, {
        sceneIds: ["0198f3a2-82dd-7000-8000-000000000031"],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
