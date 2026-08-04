import { describe, expect, it, vi } from "vitest";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import type { CreatorDnaService } from "../creator-dna/creator-dna.service.js";
import type { CreditsService } from "../credits/credits.service.js";
import type { StructuredGenerator } from "../ai/structured-generator.js";
import type { GenerationJobEnqueueService } from "../jobs/generation-job-enqueue.service.js";
import type {
  InternalJobRecord,
  JobsRepository,
} from "../jobs/jobs.repository.js";
import type { MemoryProvider } from "../memory/memory-provider.js";
import type { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import type {
  OpportunityRecord,
  OpportunitiesRepository,
} from "./opportunities.repository.js";
import { OpportunityGenerationService } from "./opportunity-generation.service.js";

const principal: AuthPrincipal = {
  subject: "0198f3a2-82dd-7000-8000-000000000001",
};
const context = {
  userId: "0198f3a2-82dd-7000-8000-000000000002",
  workspaceId: "0198f3a2-82dd-7000-8000-000000000003",
  creatorProfileId: "0198f3a2-82dd-7000-8000-000000000004",
};

const generatedRecords: OpportunityRecord[] = [1, 2, 3].map((position) => ({
  id: `0198f3a2-82dd-7000-8000-00000000000${position + 4}`,
  position,
  title: `Generated concept ${position}`,
  pitch: "A generated creative route detailed enough to make this week.",
  scoreOverall: 88 - position,
  scoreConfidence: "high",
  scoreMomentum: 86 - position,
  scoreDnaFit: 92 - position,
  scoreNovelty: 82 + position,
  scoreFeasibility: 90 - position,
  rationale: "Generated from Creator DNA and current memory.",
  effort: position === 2 ? "medium" : "low",
  platform: "tiktok",
  estimatedDurationSeconds: 30 + position,
  projectId: null,
  projectCurrentLevel: null,
  availableAt: new Date("2026-08-02T12:00:00.000Z"),
}));

const jobId = "0198f3a2-82dd-7000-8000-000000000099";

function queuedJob(
  overrides: Partial<InternalJobRecord> = {},
): InternalJobRecord {
  return {
    id: jobId,
    kind: "opportunity_batch",
    provider: "pending",
    model: "pending",
    status: "queued",
    progress: 0,
    errorCode: null,
    errorMessage: null,
    createdAt: new Date("2026-08-02T12:00:00.000Z"),
    updatedAt: new Date("2026-08-02T12:00:00.000Z"),
    completedAt: null,
    workspaceId: context.workspaceId,
    projectId: null,
    requestedByUserId: context.userId,
    idempotencyKey: "request-2026-08-02",
    input: {
      workspaceId: context.workspaceId,
      userId: context.userId,
      creatorProfileId: context.creatorProfileId,
      direction: "More experimental",
    },
    ...overrides,
  };
}

function setup(existing: OpportunityRecord[] = []) {
  const workspaces = {
    resolve: vi.fn().mockResolvedValue(context),
  } as unknown as WorkspaceContextService;
  const trendSignals = [
    {
      id: "0198f3a2-82dd-7000-8000-000000000041",
      title: "Quiet process, loud reveal",
      summary: "A normalized format cluster built from eight references.",
      lifecycle: "emerging",
      momentumScore: 88,
      lastSeenAt: new Date("2026-08-02T11:00:00.000Z"),
    },
  ];
  const repository: OpportunitiesRepository = {
    listTrendSignals: vi.fn().mockResolvedValue(trendSignals),
    listCurrent: vi.fn(),
    findById: vi.fn(),
    saveAsProject: vi.fn(),
    findByIdempotency: vi.fn().mockResolvedValue(existing),
    createBatch: vi.fn().mockResolvedValue(generatedRecords),
    recordFeedback: vi.fn(),
    createRevision: vi.fn(),
    findScriptUpgradeByIdempotency: vi.fn(),
    findExistingScriptUpgrade: vi.fn(),
    createScriptUpgrade: vi.fn(),
  };
  const credits = {
    reserve: vi.fn().mockResolvedValue({}),
    commit: vi.fn().mockResolvedValue({}),
    release: vi.fn().mockResolvedValue({}),
    getAccountForWorkspace: vi
      .fn()
      .mockResolvedValue({ balance: 60, reserved: 3, available: 57 }),
  } as unknown as CreditsService;
  const dna = {
    getForWorkspaceContext: vi.fn().mockResolvedValue({
      summary: "Nocturnal, restrained and tactile.",
      traits: [],
    }),
  } as unknown as CreatorDnaService;
  const memory: MemoryProvider = {
    search: vi.fn().mockResolvedValue([
      {
        id: "memory-1",
        content: "Never use fake urgency.",
        score: 0.9,
        metadata: {},
      },
    ]),
    remember: vi.fn(),
    forget: vi.fn(),
  };
  const generator: StructuredGenerator = {
    generate: vi.fn().mockResolvedValue({
      opportunities: [1, 2, 3].map((position) => ({
        title: `Generated concept ${position}`,
        pitch: "A generated creative route detailed enough to make this week.",
        score: 88 - position,
        confidence: "high",
      })),
    }),
  };
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
    service: new OpportunityGenerationService(
      workspaces,
      repository,
      credits,
      dna,
      memory,
      generator,
      enqueue,
      jobs,
    ),
    repository,
    credits,
    generator,
    trendSignals,
    enqueue,
    jobs,
  };
}

describe("OpportunityGenerationService.generate", () => {
  it("reserves credits and queues a Cloud Tasks job instead of generating inline", async () => {
    const { service, credits, enqueue } = setup();

    const result = await service.generate(
      principal,
      "request-2026-08-02",
      "More experimental",
    );

    expect(credits.reserve).toHaveBeenCalledWith(
      context.workspaceId,
      3,
      "request-2026-08-02:reserve",
      "Generate three opportunities",
    );
    expect(enqueue.createAndEnqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "opportunity_batch",
        idempotencyKey: "request-2026-08-02",
        input: expect.objectContaining({
          workspaceId: context.workspaceId,
          direction: "More experimental",
        }),
      }),
    );
    expect(result).toMatchObject({
      job: { id: jobId, status: "queued" },
    });
    expect(credits.commit).not.toHaveBeenCalled();
  });

  it("settles and replays a persisted request without reserving or queueing", async () => {
    const { service, credits, generator, enqueue } = setup(generatedRecords);

    const result = await service.generate(principal, "request-2026-08-02");
    expect(credits.reserve).not.toHaveBeenCalled();
    expect(generator.generate).not.toHaveBeenCalled();
    expect(enqueue.createAndEnqueue).not.toHaveBeenCalled();
    expect(credits.commit).toHaveBeenCalledWith(
      context.workspaceId,
      3,
      "request-2026-08-02:commit",
      "Generated three opportunities",
    );
    expect(result).toMatchObject({
      opportunities: [
        { strategy: "signature" },
        { strategy: "stretch" },
        { strategy: "repeatable" },
      ],
    });
  });

  it("releases the reservation and fails clearly when the queue is unavailable", async () => {
    const { service, credits, enqueue } = setup();
    vi.mocked(enqueue.createAndEnqueue).mockRejectedValueOnce(
      new Error("Cloud Tasks is not configured"),
    );

    await expect(
      service.generate(principal, "request-queue-down"),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ retryMode: "new_request" }),
    });
    expect(credits.release).toHaveBeenCalledWith(
      context.workspaceId,
      3,
      "request-queue-down:release",
      "Opportunity generation could not be queued",
    );
  });
});

describe("OpportunityGenerationService.executeQueuedBatch", () => {
  it("marks the job running, generates, persists and commits credits", async () => {
    const { service, credits, repository, generator, jobs, trendSignals } =
      setup();

    await service.executeQueuedBatch(jobId);

    expect(jobs.markRunning).toHaveBeenCalledWith(jobId);
    expect(generator.generate).toHaveBeenCalledOnce();
    expect(repository.createBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: context.workspaceId,
        idempotencyKey: "request-2026-08-02",
        trendSignals,
      }),
    );
    expect(jobs.markSucceeded).toHaveBeenCalledWith(
      jobId,
      expect.objectContaining({ opportunityIds: expect.any(Array) }),
    );
    expect(credits.commit).toHaveBeenCalledWith(
      context.workspaceId,
      3,
      "request-2026-08-02:commit",
      "Generated three opportunities",
    );
  });

  it("falls back to a deterministic MVP batch when the AI provider is unavailable", async () => {
    const { service, credits, generator, repository } = setup();
    vi.mocked(generator.generate).mockRejectedValueOnce(
      new Error("vertex output invalid"),
    );

    await service.executeQueuedBatch(jobId);

    expect(repository.createBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        opportunities: expect.arrayContaining([
          expect.objectContaining({ title: "One gesture, one drop" }),
        ]),
      }),
    );
    expect(credits.commit).toHaveBeenCalledOnce();
    expect(credits.release).not.toHaveBeenCalled();
  });

  it("fails the job and releases credits when persistence fails", async () => {
    const { service, credits, repository, jobs } = setup();
    vi.mocked(repository.createBatch).mockRejectedValueOnce(
      new Error("database unavailable"),
    );

    await service.executeQueuedBatch(jobId);

    expect(jobs.markFailed).toHaveBeenCalledWith(
      jobId,
      "failed_retryable",
      "GENERATION_FAILED",
      "database unavailable",
    );
    expect(credits.release).toHaveBeenCalledWith(
      context.workspaceId,
      3,
      "request-2026-08-02:release",
      "Opportunity generation failed",
    );
  });

  it("keeps a succeeded job untouched when only the commit confirmation fails", async () => {
    const { service, credits, jobs } = setup();
    vi.mocked(credits.commit).mockRejectedValueOnce(
      new Error("credit commit unavailable"),
    );

    await service.executeQueuedBatch(jobId);

    expect(jobs.markSucceeded).toHaveBeenCalledOnce();
    expect(jobs.markFailed).not.toHaveBeenCalled();
    expect(credits.release).not.toHaveBeenCalled();
  });

  it("is a no-op when the job is not (or is no longer) queued", async () => {
    const { service, jobs, repository } = setup();
    vi.mocked(jobs.findByIdUnscoped).mockResolvedValueOnce(
      queuedJob({ status: "succeeded" }),
    );

    await service.executeQueuedBatch(jobId);

    expect(jobs.markRunning).not.toHaveBeenCalled();
    expect(repository.createBatch).not.toHaveBeenCalled();
  });
});
