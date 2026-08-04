import { HttpException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { StructuredGenerator } from "../ai/structured-generator.js";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import type { CreditsService } from "../credits/credits.service.js";
import type { GenerationJobEnqueueService } from "../jobs/generation-job-enqueue.service.js";
import type {
  InternalJobRecord,
  JobsRepository,
} from "../jobs/jobs.repository.js";
import type { QualityGateService } from "../quality-gate/quality-gate.service.js";
import type { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import type {
  OpportunityRecord,
  OpportunitiesRepository,
} from "./opportunities.repository.js";
import { OpportunityWorkflowService } from "./opportunity-workflow.service.js";

const principal: AuthPrincipal = {
  subject: "0198f3a2-82dd-7000-8000-000000000001",
};

const context = {
  userId: "0198f3a2-82dd-7000-8000-000000000010",
  workspaceId: "0198f3a2-82dd-7000-8000-000000000011",
  creatorProfileId: "0198f3a2-82dd-7000-8000-000000000012",
};

const opportunity: OpportunityRecord = {
  id: "0198f3a2-82dd-7000-8000-000000000013",
  position: 1,
  title: "The silence before the drop",
  pitch: "Hold the room still, then let the first kick arrive alone.",
  scoreOverall: 92,
  scoreConfidence: "high",
  scoreMomentum: 88,
  scoreDnaFit: 96,
  scoreNovelty: 84,
  scoreFeasibility: 94,
  rationale:
    "The format fits the creator's restrained visual and sonic language.",
  effort: "low",
  platform: "tiktok",
  estimatedDurationSeconds: 35,
  projectId: null,
  projectCurrentLevel: null,
  availableAt: new Date("2026-08-02T09:00:00.000Z"),
};

const jobId = "0198f3a2-82dd-7000-8000-000000000099";

function queuedJob(
  overrides: Partial<InternalJobRecord> = {},
): InternalJobRecord {
  return {
    id: jobId,
    kind: "script",
    provider: "pending",
    model: "pending",
    status: "queued",
    progress: 0,
    errorCode: null,
    errorMessage: null,
    createdAt: new Date("2026-08-02T10:00:00.000Z"),
    updatedAt: new Date("2026-08-02T10:00:00.000Z"),
    completedAt: null,
    workspaceId: context.workspaceId,
    projectId: null,
    requestedByUserId: context.userId,
    idempotencyKey: "upgrade-script-1",
    input: {
      workspaceId: context.workspaceId,
      userId: context.userId,
      creatorProfileId: context.creatorProfileId,
      opportunityId: opportunity.id,
    },
    ...overrides,
  };
}

function setup(options?: {
  generatorRejects?: boolean;
  missing?: boolean;
  existingUpgrade?: boolean;
  qualityGateRejects?: boolean;
}) {
  const workspaces = {
    resolve: vi.fn().mockResolvedValue(context),
  } as unknown as WorkspaceContextService;
  const repository = {
    listTrendSignals: vi.fn(),
    listCurrent: vi.fn(),
    findById: vi.fn().mockResolvedValue(options?.missing ? null : opportunity),
    saveAsProject: vi.fn(),
    findByIdempotency: vi.fn(),
    createBatch: vi.fn(),
    createRevision: vi.fn().mockResolvedValue({
      project: {
        id: "0198f3a2-82dd-7000-8000-000000000020",
        opportunityId: opportunity.id,
        title: opportunity.title,
        status: "active",
        currentLevel: "idea",
        currentVersion: 2,
        updatedAt: new Date("2026-08-02T10:00:00.000Z"),
      },
      version: 2,
      title: opportunity.title,
      pitch: opportunity.pitch,
      hook: "Let the room breathe. Then drop the needle.",
      changeSummary: "Quietened the opening.",
      memoryCandidate: {
        id: "0198f3a2-82dd-7000-8000-000000000021",
        status: "pending",
        scope: "project",
        content: "Prefer quiet openings for this project.",
      },
    }),
    findScriptUpgradeByIdempotency: vi.fn().mockResolvedValue(null),
    findExistingScriptUpgrade: vi.fn().mockResolvedValue(
      options?.existingUpgrade
        ? {
            project: {
              id: "0198f3a2-82dd-7000-8000-000000000020",
              opportunityId: opportunity.id,
              title: opportunity.title,
              status: "active",
              currentLevel: "storyboard",
              currentVersion: 3,
              updatedAt: new Date("2026-08-02T10:00:00.000Z"),
            },
            script: {
              id: "0198f3a2-82dd-7000-8000-000000000022",
              projectId: "0198f3a2-82dd-7000-8000-000000000020",
              title: opportunity.title,
              hook: "An existing hook.",
              body: "An existing script body that is ready to use.",
              callToAction: null,
              caption: null,
              platforms: ["tiktok"],
              durationSeconds: 35,
            },
            job: {
              id: "0198f3a2-82dd-7000-8000-000000000023",
              kind: "storyboard",
              provider: "demo",
              model: "fixture-v1",
              status: "succeeded",
              progress: 100,
              errorCode: null,
              errorMessage: null,
              createdAt: new Date("2026-08-02T09:59:00.000Z"),
              updatedAt: new Date("2026-08-02T10:00:00.000Z"),
              completedAt: new Date("2026-08-02T10:00:00.000Z"),
            },
          }
        : null,
    ),
    createScriptUpgrade: vi.fn().mockResolvedValue({
      project: {
        id: "0198f3a2-82dd-7000-8000-000000000020",
        opportunityId: opportunity.id,
        title: opportunity.title,
        status: "active",
        currentLevel: "script",
        currentVersion: 2,
        updatedAt: new Date("2026-08-02T10:00:00.000Z"),
      },
      script: {
        id: "0198f3a2-82dd-7000-8000-000000000022",
        projectId: "0198f3a2-82dd-7000-8000-000000000020",
        title: opportunity.title,
        hook: "Let the room breathe. Then drop the needle.",
        body: "Hold the empty room for two seconds, lower the needle, then reveal the kick.",
        callToAction: "What arrives after your silence?",
        caption: "The room is part of the arrangement.",
        platforms: ["tiktok", "instagram"],
        durationSeconds: 35,
      },
      job: {
        id: "0198f3a2-82dd-7000-8000-000000000023",
        kind: "script",
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
    }),
  } as unknown as OpportunitiesRepository;
  const credits = {
    getAccount: vi.fn().mockResolvedValue({
      balance: 58,
      reserved: 0,
      available: 58,
    }),
    getAccountForWorkspace: vi.fn().mockResolvedValue({
      balance: 60,
      reserved: 2,
      available: 58,
    }),
    reserve: vi.fn().mockResolvedValue({
      balance: 60,
      reserved: 2,
      available: 58,
    }),
    commit: vi.fn().mockResolvedValue({
      balance: 58,
      reserved: 0,
      available: 58,
    }),
    release: vi.fn().mockResolvedValue({
      balance: 60,
      reserved: 0,
      available: 60,
    }),
  } as unknown as CreditsService;
  const generator = {
    generate: options?.generatorRejects
      ? vi.fn().mockRejectedValue(new Error("quota unavailable"))
      : vi
          .fn()
          .mockResolvedValueOnce({
            title: opportunity.title,
            pitch: opportunity.pitch,
            hook: "Let the room breathe. Then drop the needle.",
            changeSummary: "Quietened the opening.",
            memoryContent: "Prefer quiet openings for this project.",
          })
          .mockResolvedValueOnce({
            title: opportunity.title,
            hook: "Let the room breathe. Then drop the needle.",
            body: "Hold the empty room for two seconds, lower the needle, then reveal the kick.",
            callToAction: "What arrives after your silence?",
            caption: "The room is part of the arrangement.",
            platforms: ["tiktok", "instagram"],
            durationSeconds: 35,
          }),
  } as unknown as StructuredGenerator;
  const qualityGate = {
    evaluateScript: vi.fn().mockResolvedValue(
      options?.qualityGateRejects
        ? {
            passed: false,
            violations: [
              {
                code: "forbidden_topic",
                message:
                  'Generated content references "alcohol", which conflicts with the creator boundary "No alcohol brand promotions".',
              },
            ],
          }
        : { passed: true, violations: [] },
    ),
    evaluateStoryboard: vi.fn(),
    evaluateVideo: vi.fn(),
  } as unknown as QualityGateService;
  const enqueue = {
    createAndEnqueue: vi.fn().mockResolvedValue(queuedJob()),
  } as unknown as GenerationJobEnqueueService;
  const jobs: JobsRepository = {
    findById: vi.fn(),
    findByIdUnscoped: vi.fn().mockResolvedValue(queuedJob()),
    cancel: vi.fn(),
    retry: vi.fn(),
    create: vi.fn(),
    markRunning: vi.fn().mockResolvedValue(queuedJob({ status: "running" })),
    markSucceeded: vi
      .fn()
      .mockResolvedValue(queuedJob({ status: "succeeded" })),
    markFailed: vi
      .fn()
      .mockResolvedValue(queuedJob({ status: "failed_retryable" })),
  };

  return {
    service: new OpportunityWorkflowService(
      workspaces,
      repository,
      credits,
      generator,
      qualityGate,
      enqueue,
      jobs,
    ),
    repository,
    credits,
    generator,
    qualityGate,
    enqueue,
    jobs,
  };
}

describe("OpportunityWorkflowService.modify", () => {
  it("creates a scoped project revision from the chat instruction", async () => {
    const { service, repository } = setup();

    await expect(
      service.modify(principal, opportunity.id, {
        instruction: "Make the opening quieter but keep the duration.",
        memoryScope: "project",
        lockedFields: ["duration"],
      }),
    ).resolves.toMatchObject({
      version: 2,
      hook: "Let the room breathe. Then drop the needle.",
      memoryCandidate: { status: "pending", scope: "project" },
    });
    expect(repository.createRevision).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: context.workspaceId,
        userId: context.userId,
        memoryScope: "project",
        lockedFields: ["duration"],
      }),
    );
  });

  it("uses a deterministic local revision when Gemini is unavailable", async () => {
    const { service, repository } = setup({ generatorRejects: true });

    await service.modify(principal, opportunity.id, {
      instruction: "Keep it one take.",
      memoryScope: "idea",
      lockedFields: [],
    });

    expect(repository.createRevision).toHaveBeenCalledWith(
      expect.objectContaining({
        generated: expect.objectContaining({
          changeSummary: expect.stringMatching(/one take/i),
        }),
      }),
    );
  });

  it("does not reveal an opportunity outside the workspace", async () => {
    const { service } = setup({ missing: true });
    await expect(
      service.modify(principal, opportunity.id, {
        instruction: "Change the hook.",
        memoryScope: "idea",
        lockedFields: [],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("OpportunityWorkflowService.upgrade", () => {
  it("reserves credits and queues a script generation job instead of generating inline", async () => {
    const { service, credits, enqueue, repository } = setup();

    const result = await service.upgrade(
      principal,
      opportunity.id,
      { targetLevel: "script", confirmedCreditCost: true },
      "upgrade-script-1",
    );

    expect(credits.reserve).toHaveBeenCalledWith(
      context.workspaceId,
      2,
      "upgrade-script-1:reserve",
      expect.stringMatching(/script/i),
    );
    expect(enqueue.createAndEnqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "script",
        idempotencyKey: "upgrade-script-1",
        input: expect.objectContaining({ opportunityId: opportunity.id }),
      }),
    );
    expect(result).toMatchObject({ job: { id: jobId, status: "queued" } });
    expect(repository.createScriptUpgrade).not.toHaveBeenCalled();
    expect(credits.commit).not.toHaveBeenCalled();
  });

  it("returns an existing script without reserving credits or queueing a job", async () => {
    const { service, credits, repository, enqueue } = setup({
      existingUpgrade: true,
    });

    await expect(
      service.upgrade(
        principal,
        opportunity.id,
        { targetLevel: "script", confirmedCreditCost: true },
        "upgrade-script-existing",
      ),
    ).resolves.toMatchObject({
      project: { currentLevel: "storyboard", currentVersion: 3 },
      script: { hook: "An existing hook." },
      credits: { balance: 58, reserved: 0 },
    });
    expect(repository.findExistingScriptUpgrade).toHaveBeenCalledWith(
      context.workspaceId,
      opportunity.id,
    );
    expect(credits.reserve).not.toHaveBeenCalled();
    expect(enqueue.createAndEnqueue).not.toHaveBeenCalled();
  });

  it("finishes an idempotent script commit without regenerating or re-queueing", async () => {
    const { service, credits, repository, enqueue } = setup();
    const stored = await repository.createScriptUpgrade({} as never);
    vi.mocked(repository.createScriptUpgrade).mockClear();
    vi.mocked(repository.findScriptUpgradeByIdempotency).mockResolvedValue(
      stored,
    );

    await expect(
      service.upgrade(
        principal,
        opportunity.id,
        { targetLevel: "script", confirmedCreditCost: true },
        "upgrade-script-resume",
      ),
    ).resolves.toMatchObject({ credits: { balance: 58, reserved: 0 } });
    expect(credits.commit).toHaveBeenCalledWith(
      context.workspaceId,
      2,
      "upgrade-script-resume:commit",
      expect.stringMatching(/script/i),
    );
    expect(credits.reserve).not.toHaveBeenCalled();
    expect(enqueue.createAndEnqueue).not.toHaveBeenCalled();
  });

  it("releases reserved credits and fails clearly when the queue is unavailable", async () => {
    const { service, credits, enqueue } = setup();
    vi.mocked(enqueue.createAndEnqueue).mockRejectedValueOnce(
      new Error("Cloud Tasks is not configured"),
    );

    const failure = await service
      .upgrade(
        principal,
        opportunity.id,
        { targetLevel: "script", confirmedCreditCost: true },
        "upgrade-script-2",
      )
      .catch((error: unknown) => error);
    expect(failure).toMatchObject({
      response: expect.objectContaining({ retryMode: "new_request" }),
    });
    expect(credits.release).toHaveBeenCalledWith(
      context.workspaceId,
      2,
      "upgrade-script-2:release",
      expect.stringMatching(/queue/i),
    );
  });

  it("requires an idempotency key before reserving credits", async () => {
    const { service, credits } = setup();
    await expect(
      service.upgrade(
        principal,
        opportunity.id,
        { targetLevel: "script", confirmedCreditCost: true },
        "",
      ),
    ).rejects.toBeInstanceOf(HttpException);
    expect(credits.reserve).not.toHaveBeenCalled();
  });
});

describe("OpportunityWorkflowService.executeQueuedScriptUpgrade", () => {
  it("marks the job running, generates, persists and commits two credits", async () => {
    const { service, credits, repository, jobs } = setup();

    await service.executeQueuedScriptUpgrade(jobId);

    expect(jobs.markRunning).toHaveBeenCalledWith(jobId);
    expect(repository.createScriptUpgrade).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "vertex-ai",
        model: "gemini-3.5-flash",
        jobId,
      }),
    );
    expect(credits.commit).toHaveBeenCalledWith(
      context.workspaceId,
      2,
      "upgrade-script-1:commit",
      expect.stringMatching(/script/i),
    );
  });

  it("fails the job and releases credits when persistence fails", async () => {
    const { service, credits, repository, jobs } = setup();
    vi.mocked(repository.createScriptUpgrade).mockRejectedValue(
      new Error("database unavailable"),
    );

    await service.executeQueuedScriptUpgrade(jobId);

    expect(jobs.markFailed).toHaveBeenCalledWith(
      jobId,
      "failed_retryable",
      "GENERATION_FAILED",
      "database unavailable",
    );
    expect(credits.release).toHaveBeenCalledWith(
      context.workspaceId,
      2,
      "upgrade-script-1:release",
      expect.stringMatching(/failed/i),
    );
  });

  it("keeps a succeeded job untouched when only the commit confirmation fails", async () => {
    const { service, credits, jobs } = setup();
    vi.mocked(credits.commit).mockRejectedValueOnce(
      new Error("credit commit unavailable"),
    );

    await service.executeQueuedScriptUpgrade(jobId);

    expect(jobs.markFailed).not.toHaveBeenCalled();
    expect(credits.release).not.toHaveBeenCalled();
  });

  it("rejects a generated script that fails the pre-publish content gate and releases the reservation", async () => {
    const { service, credits, repository, qualityGate, jobs } = setup({
      qualityGateRejects: true,
    });

    await service.executeQueuedScriptUpgrade(jobId);

    expect(qualityGate.evaluateScript).toHaveBeenCalledWith(
      context.creatorProfileId,
      expect.objectContaining({ hook: expect.any(String) }),
    );
    expect(repository.createScriptUpgrade).not.toHaveBeenCalled();
    expect(credits.commit).not.toHaveBeenCalled();
    expect(jobs.markFailed).toHaveBeenCalledWith(
      jobId,
      "failed_final",
      "QUALITY_GATE_REJECTED",
      expect.any(String),
    );
    expect(credits.release).toHaveBeenCalledWith(
      context.workspaceId,
      2,
      "upgrade-script-1:release",
      expect.stringMatching(/failed/i),
    );
  });

  it("is a no-op when the job is not (or is no longer) queued", async () => {
    const { service, jobs, repository } = setup();
    vi.mocked(jobs.findByIdUnscoped).mockResolvedValueOnce(
      queuedJob({ status: "succeeded" }),
    );

    await service.executeQueuedScriptUpgrade(jobId);

    expect(jobs.markRunning).not.toHaveBeenCalled();
    expect(repository.createScriptUpgrade).not.toHaveBeenCalled();
  });
});
