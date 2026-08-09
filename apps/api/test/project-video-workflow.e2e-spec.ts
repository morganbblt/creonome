import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { StructuredGenerator } from "../src/modules/ai/structured-generator.js";
import type { AuthPrincipal } from "../src/modules/auth/auth-token-verifier.js";
import type { CreatorDnaService } from "../src/modules/creator-dna/creator-dna.service.js";
import type { CreditsService } from "../src/modules/credits/credits.service.js";
import { GenerationJobEnqueueService } from "../src/modules/jobs/generation-job-enqueue.service.js";
import type { GenerationQueue } from "../src/modules/jobs/generation-queue.js";
import type {
  CreateJobInput,
  InternalJobRecord,
  JobsRepository,
} from "../src/modules/jobs/jobs.repository.js";
import { ProjectWorkflowService } from "../src/modules/projects/project-workflow.service.js";
import type {
  ProjectsRepository,
  StoryboardUpgradeRecord,
  VideoUpgradeRecord,
} from "../src/modules/projects/projects.repository.js";
import { DeterministicVideoProvider } from "../src/modules/projects/video/deterministic-video.provider.js";
import type { QualityGateService } from "../src/modules/quality-gate/quality-gate.service.js";
import type { WorkspaceContextService } from "../src/modules/workspaces/workspace-context.service.js";

const now = new Date("2026-08-02T10:00:00.000Z");
const projectId = "0198f3a2-82dd-7000-8000-000000000020";
const context = {
  userId: "0198f3a2-82dd-7000-8000-000000000010",
  workspaceId: "0198f3a2-82dd-7000-8000-000000000011",
  creatorProfileId: "0198f3a2-82dd-7000-8000-000000000012",
};
const principal: AuthPrincipal = { subject: "neon-user-1" };
const script = {
  id: "0198f3a2-82dd-7000-8000-000000000021",
  projectId,
  title: "The silence before the drop",
  hook: "Hold the empty room.",
  body: "Lower the needle, then reveal the session.",
  callToAction: "What arrives after your silence?",
  caption: "The room is part of the arrangement.",
  platforms: ["tiktok", "instagram"],
  durationSeconds: 30,
};
const project = {
  id: projectId,
  opportunityId: "0198f3a2-82dd-7000-8000-000000000013",
  title: script.title,
  status: "active",
  currentLevel: "script",
  currentVersion: 2,
  updatedAt: now,
};
const generatedStoryboard = {
  title: `${script.title} — storyboard`,
  aspectRatio: "9:16",
  durationSeconds: 30,
  scenes: [
    {
      heading: "Hold the room",
      description: "Locked close-up on the silent speaker cone.",
      shotType: "Extreme close-up",
      voiceover: script.hook,
      onScreenText: "Before the drop",
      bRoll: null,
      transition: "Hard cut.",
      requiredAsset: "Studio speaker",
      sound: "Room tone",
      editingNote: "Hold the opening.",
      referenceFrameUrl: null,
      durationSeconds: 8,
    },
    {
      heading: "Touch the needle",
      description: "The hand lowers the needle.",
      shotType: "Macro tracking",
      voiceover: null,
      onScreenText: null,
      bRoll: null,
      transition: "Cut on action.",
      requiredAsset: "Turntable",
      sound: "Needle contact",
      editingNote: "Follow the hand.",
      referenceFrameUrl: null,
      durationSeconds: 9,
    },
    {
      heading: "Reveal the session",
      description: "Wide reveal of the creator and session.",
      shotType: "Wide reveal",
      voiceover: "Let the kick arrive.",
      onScreenText: null,
      bRoll: null,
      transition: "Loop cleanly.",
      requiredAsset: "Studio wide shot",
      sound: "First kick",
      editingNote: "Land on the downbeat.",
      referenceFrameUrl: null,
      durationSeconds: 13,
    },
  ],
};

/** Minimal in-memory JobsRepository so the enqueue → execute round trip can
 * be exercised without a real Postgres connection. */
function createInMemoryJobsRepository(): JobsRepository {
  const jobsById = new Map<string, InternalJobRecord>();
  return {
    findById: vi.fn(),
    cancel: vi.fn(),
    retry: vi.fn(),
    findByIdUnscoped: vi.fn(
      async (jobId: string) => jobsById.get(jobId) ?? null,
    ),
    create: vi.fn(async (input: CreateJobInput) => {
      const job: InternalJobRecord = {
        id: randomUUID(),
        kind: input.kind,
        provider: input.provider,
        model: input.model,
        status: "queued",
        progress: 0,
        errorCode: null,
        errorMessage: null,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        requestedByUserId: input.requestedByUserId,
        idempotencyKey: input.idempotencyKey,
        input: input.input,
      };
      jobsById.set(job.id, job);
      return job;
    }),
    markRunning: vi.fn(async (jobId: string) => {
      const job = jobsById.get(jobId);
      if (!job || job.status !== "queued") return null;
      const updated = { ...job, status: "running" };
      jobsById.set(jobId, updated);
      return updated;
    }),
    markSucceeded: vi.fn(
      async (jobId: string, output: Record<string, unknown>) => {
        const job = jobsById.get(jobId);
        if (!job) return null;
        const updated = { ...job, status: "succeeded", progress: 100, output };
        jobsById.set(jobId, updated);
        return updated;
      },
    ),
    markFailed: vi.fn(
      async (
        jobId: string,
        status: "failed_retryable" | "failed_final",
        errorCode: string,
        errorMessage: string,
      ) => {
        const job = jobsById.get(jobId);
        if (!job) return null;
        const updated = { ...job, status, errorCode, errorMessage };
        jobsById.set(jobId, updated);
        return updated;
      },
    ),
  };
}

describe("Storyboard → Video workflow", () => {
  it("keeps one credit ledger across a queued storyboard and video job", async () => {
    let storyboardUpgrade: StoryboardUpgradeRecord | null = null;
    let videoUpgrade: VideoUpgradeRecord | null = null;
    const repository = {
      findStoryboardUpgradeByIdempotency: vi.fn().mockResolvedValue(null),
      findExistingStoryboardUpgrade: vi.fn(async () => storyboardUpgrade),
      findStoryboardSource: vi.fn().mockResolvedValue({ project, script }),
      createStoryboardUpgrade: vi.fn(async () => {
        let startSeconds = 0;
        storyboardUpgrade = {
          project: {
            ...project,
            currentLevel: "storyboard",
            currentVersion: 3,
          },
          storyboard: {
            id: "0198f3a2-82dd-7000-8000-000000000030",
            title: generatedStoryboard.title,
            aspectRatio: "9:16",
            durationSeconds: 30,
            scenes: generatedStoryboard.scenes.map((scene, index) => {
              const result = {
                ...scene,
                id: `0198f3a2-82dd-7000-8000-00000000003${index + 1}`,
                position: index + 1,
                startSeconds,
                assetId: null as string | null,
              };
              startSeconds += scene.durationSeconds;
              return result;
            }),
          },
          job: {
            id: "0198f3a2-82dd-7000-8000-000000000040",
            kind: "storyboard",
            provider: "gemini",
            model: "gemini-3.5-flash",
            status: "succeeded",
            progress: 100,
            errorCode: null,
            errorMessage: null,
            createdAt: now,
            updatedAt: now,
            completedAt: now,
          },
        };
        return storyboardUpgrade;
      }),
      findVideoUpgradeByIdempotency: vi.fn().mockResolvedValue(null),
      findExistingVideoUpgrade: vi.fn(async () => videoUpgrade),
      findVideoSource: vi.fn(async () =>
        storyboardUpgrade
          ? {
              project: storyboardUpgrade.project,
              script,
              storyboard: storyboardUpgrade.storyboard,
              creativeIdentity: {
                stageName: "Nova Sainte",
                bio: "Independent electronic artist",
                audienceDescription: "Curious producers",
                languages: ["English"],
                genres: ["ambient"],
                dnaSummary: "Restrained studio storytelling.",
                traits: ["tone: precise"],
              },
            }
          : null,
      ),
      createVideoUpgrade: vi.fn(async ({ artifact }) => {
        videoUpgrade = {
          project: {
            ...project,
            currentLevel: "video",
            currentVersion: 4,
          },
          video: {
            id: "0198f3a2-82dd-7000-8000-000000000060",
            projectId,
            ...artifact,
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
        return videoUpgrade;
      }),
    } as unknown as ProjectsRepository;

    let balance = 60;
    let reserved = 0;
    const credits = {
      reserve: vi.fn(async (_workspace, amount: number) => {
        reserved += amount;
        return { balance, reserved, available: balance - reserved };
      }),
      commit: vi.fn(async (_workspace, amount: number) => {
        reserved -= amount;
        balance -= amount;
        return { balance, reserved, available: balance - reserved };
      }),
      release: vi.fn(),
      getAccount: vi.fn(async () => ({
        balance,
        reserved,
        available: balance,
      })),
      getAccountForWorkspace: vi.fn(async () => ({
        balance,
        reserved,
        available: balance - reserved,
      })),
    } as unknown as CreditsService;
    const qualityGate = {
      evaluateScript: vi
        .fn()
        .mockResolvedValue({ passed: true, violations: [] }),
      evaluateStoryboard: vi
        .fn()
        .mockResolvedValue({ passed: true, violations: [] }),
      evaluateVideo: vi
        .fn()
        .mockResolvedValue({ passed: true, violations: [] }),
    } as unknown as QualityGateService;
    const jobsRepository = createInMemoryJobsRepository();
    const queue: GenerationQueue = {
      enqueue: vi.fn().mockResolvedValue(undefined),
    };
    const enqueue = new GenerationJobEnqueueService(jobsRepository, queue);
    const creatorDna = {
      getForWorkspaceContext: vi.fn().mockResolvedValue({
        version: 1,
        summary: "Restrained studio storytelling.",
        confirmed: true,
        traits: [],
      }),
    } as unknown as CreatorDnaService;
    const service = new ProjectWorkflowService(
      {
        resolve: vi.fn().mockResolvedValue(context),
      } as unknown as WorkspaceContextService,
      repository,
      credits,
      {
        generate: vi.fn().mockResolvedValue(generatedStoryboard),
      } as unknown as StructuredGenerator,
      new DeterministicVideoProvider(),
      qualityGate,
      creatorDna,
      enqueue,
      jobsRepository,
    );

    const queuedStoryboardJob = await service.upgrade(
      principal,
      projectId,
      {
        targetLevel: "storyboard",
        confirmedCreditCost: true,
        lockedFields: [],
      },
      "e2e-storyboard-generation",
    );
    expect(queuedStoryboardJob).toMatchObject({ job: { status: "queued" } });
    if (!("job" in queuedStoryboardJob))
      throw new Error("expected a queued job");
    await service.executeQueuedStoryboardUpgrade(queuedStoryboardJob.job.id);
    expect(storyboardUpgrade).not.toBeNull();
    expect(storyboardUpgrade!.project.currentLevel).toBe("storyboard");

    const queuedVideoJob = await service.upgrade(
      principal,
      projectId,
      { targetLevel: "video", confirmedCreditCost: true, lockedFields: [] },
      "e2e-video-generation",
    );
    expect(queuedVideoJob).toMatchObject({ job: { status: "queued" } });
    if (!("job" in queuedVideoJob)) throw new Error("expected a queued job");
    await service.executeQueuedVideoUpgrade(queuedVideoJob.job.id);

    expect(videoUpgrade).toMatchObject({
      project: { currentLevel: "video" },
      video: { simulated: true, provider: "creonome" },
    });
    expect(balance).toBe(44);
    expect(reserved).toBe(0);
    expect(credits.reserve).toHaveBeenCalledTimes(2);
    expect(credits.commit).toHaveBeenCalledTimes(2);
    expect(credits.release).not.toHaveBeenCalled();
  });
});
