import { ServiceUnavailableException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import type { CreatorDnaService } from "../creator-dna/creator-dna.service.js";
import type { CreditsService } from "../credits/credits.service.js";
import type { StructuredGenerator } from "../ai/structured-generator.js";
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

function setup(existing: OpportunityRecord[] = []) {
  const workspaces = {
    resolve: vi.fn().mockResolvedValue(context),
  } as unknown as WorkspaceContextService;
  const repository: OpportunitiesRepository = {
    listCurrent: vi.fn(),
    findById: vi.fn(),
    saveAsProject: vi.fn(),
    findByIdempotency: vi.fn().mockResolvedValue(existing),
    createBatch: vi.fn().mockResolvedValue(generatedRecords),
    createRevision: vi.fn(),
    findScriptUpgradeByIdempotency: vi.fn(),
    findExistingScriptUpgrade: vi.fn(),
    createScriptUpgrade: vi.fn(),
  };
  const credits = {
    reserve: vi.fn().mockResolvedValue({}),
    commit: vi.fn().mockResolvedValue({}),
    release: vi.fn().mockResolvedValue({}),
  } as unknown as CreditsService;
  const dna = {
    getCurrent: vi.fn().mockResolvedValue({
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
  return {
    service: new OpportunityGenerationService(
      workspaces,
      repository,
      credits,
      dna,
      memory,
      generator,
    ),
    repository,
    credits,
    generator,
  };
}

describe("OpportunityGenerationService", () => {
  it("reserves, generates, persists and commits one idempotent batch", async () => {
    const { service, credits, repository, generator } = setup();

    await expect(
      service.generate(principal, "request-2026-08-02", "More experimental"),
    ).resolves.toMatchObject({
      opportunities: [
        { strategy: "signature" },
        { strategy: "stretch" },
        { strategy: "repeatable" },
      ],
    });
    expect(credits.reserve).toHaveBeenCalledWith(
      context.workspaceId,
      3,
      "request-2026-08-02:reserve",
      "Generate three opportunities",
    );
    expect(generator.generate).toHaveBeenCalledOnce();
    expect(generator.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        jsonSchema: expect.objectContaining({
          properties: expect.objectContaining({
            opportunities: expect.objectContaining({
              items: expect.objectContaining({
                properties: expect.objectContaining({
                  pitch: {
                    type: "string",
                    minLength: 12,
                    maxLength: 320,
                  },
                }),
              }),
            }),
          }),
        }),
      }),
    );
    expect(repository.createBatch).toHaveBeenCalledOnce();
    expect(credits.commit).toHaveBeenCalledOnce();
  });

  it("settles and replays a persisted request without reserving or regenerating", async () => {
    const { service, credits, generator } = setup(generatedRecords);

    await service.generate(principal, "request-2026-08-02");
    expect(credits.reserve).not.toHaveBeenCalled();
    expect(generator.generate).not.toHaveBeenCalled();
    expect(credits.commit).toHaveBeenCalledWith(
      context.workspaceId,
      3,
      "request-2026-08-02:commit",
      "Generated three opportunities",
    );
  });

  it("marks a released pre-persistence failure for a fresh request", async () => {
    const { service, credits, generator } = setup();
    vi.mocked(generator.generate).mockRejectedValueOnce(
      new Error("vertex output invalid"),
    );

    const failure = await service
      .generate(principal, "request-invalid-output")
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ServiceUnavailableException);
    expect(
      (failure as ServiceUnavailableException).getResponse(),
    ).toMatchObject({ retryMode: "new_request" });
    expect(credits.release).toHaveBeenCalledOnce();
  });

  it("keeps a persisted reservation recoverable when commit fails", async () => {
    const { service, credits } = setup();
    vi.mocked(credits.commit).mockRejectedValueOnce(
      new Error("credit commit unavailable"),
    );

    await expect(
      service.generate(principal, "request-commit-retry"),
    ).rejects.toThrow("credit commit unavailable");
    expect(credits.release).not.toHaveBeenCalled();
  });

  it("preserves the provider failure when releasing credits also fails", async () => {
    const { service, credits, generator } = setup();
    vi.mocked(generator.generate).mockRejectedValueOnce(
      new Error("gemini unavailable"),
    );
    vi.mocked(credits.release).mockRejectedValueOnce(
      new Error("ledger unavailable"),
    );

    await expect(
      service.generate(principal, "request-provider-failure"),
    ).rejects.toThrow("gemini unavailable");
  });
});
