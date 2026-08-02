import { HttpException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { StructuredGenerator } from "../ai/structured-generator.js";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import type { CreditsService } from "../credits/credits.service.js";
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

function setup(options?: {
  generatorRejects?: boolean;
  missing?: boolean;
  existingUpgrade?: boolean;
}) {
  const workspaces = {
    resolve: vi.fn().mockResolvedValue(context),
  } as unknown as WorkspaceContextService;
  const repository = {
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

  return {
    service: new OpportunityWorkflowService(
      workspaces,
      repository,
      credits,
      generator,
    ),
    repository,
    credits,
    generator,
  };
}

describe("OpportunityWorkflowService", () => {
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

  it("reserves and commits two credits around a successful script upgrade", async () => {
    const { service, credits, repository } = setup();

    await expect(
      service.upgrade(
        principal,
        opportunity.id,
        { targetLevel: "script", confirmedCreditCost: true },
        "upgrade-script-1",
      ),
    ).resolves.toMatchObject({
      project: { currentLevel: "script" },
      script: { durationSeconds: 35 },
      credits: { balance: 58, reserved: 0 },
    });
    expect(credits.reserve).toHaveBeenCalledBefore(
      vi.mocked(repository.createScriptUpgrade),
    );
    expect(credits.commit).toHaveBeenCalledWith(
      context.workspaceId,
      2,
      "upgrade-script-1:commit",
      expect.stringMatching(/script/i),
    );
  });

  it("returns an existing script without reserving credits or downgrading the project", async () => {
    const { service, credits, repository } = setup({ existingUpgrade: true });

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
    expect(repository.createScriptUpgrade).not.toHaveBeenCalled();
  });

  it("finishes an idempotent script commit without regenerating", async () => {
    const { service, credits, repository } = setup();
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
    expect(repository.createScriptUpgrade).not.toHaveBeenCalled();
  });

  it("releases reserved credits if persistence fails", async () => {
    const { service, credits, repository } = setup();
    vi.mocked(repository.createScriptUpgrade).mockRejectedValue(
      new Error("database unavailable"),
    );

    await expect(
      service.upgrade(
        principal,
        opportunity.id,
        { targetLevel: "script", confirmedCreditCost: true },
        "upgrade-script-2",
      ),
    ).rejects.toThrow("database unavailable");
    expect(credits.release).toHaveBeenCalledWith(
      context.workspaceId,
      2,
      "upgrade-script-2:release",
      expect.stringMatching(/failed/i),
    );
  });

  it("keeps a persisted reservation recoverable if commit confirmation fails", async () => {
    const { service, credits } = setup();
    vi.mocked(credits.commit).mockRejectedValue(
      new Error("credit commit unavailable"),
    );

    await expect(
      service.upgrade(
        principal,
        opportunity.id,
        { targetLevel: "script", confirmedCreditCost: true },
        "upgrade-script-commit-retry",
      ),
    ).rejects.toThrow("credit commit unavailable");
    expect(credits.release).not.toHaveBeenCalled();
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
