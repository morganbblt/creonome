import { BadRequestException } from "@nestjs/common";
import type {
  OnboardingAssetInsight,
  OnboardingProfile,
  OnboardingState,
} from "@creonome/contracts";
import { describe, expect, it, vi } from "vitest";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import type { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import type { OnboardingIntelligence } from "./onboarding-intelligence.js";
import type { OnboardingRepository } from "./onboarding.repository.js";
import { OnboardingService } from "./onboarding.service.js";

const principal: AuthPrincipal = {
  subject: "0198f3a2-82dd-7000-8000-000000000001",
};
const context = {
  userId: "0198f3a2-82dd-7000-8000-000000000002",
  workspaceId: "0198f3a2-82dd-7000-8000-000000000003",
  creatorProfileId: "0198f3a2-82dd-7000-8000-000000000004",
};
const insight: OnboardingAssetInsight = {
  summary: "A restrained performance built around tactile close-ups.",
  disciplines: ["music performance", "video"],
  genres: ["electronic", "ambient"],
  creativeSignature: "Nocturnal, tactile and deliberately understated.",
  themes: ["process", "anticipation"],
  targetAudience: "Listeners drawn to intimate electronic performance.",
  boundaries: ["No fake urgency"],
  evidence: ["Long pause before the first beat", "Macro needle shot"],
};
const profile: OnboardingProfile = {
  stageName: "Nova Sainte",
  disciplines: ["music producer", "performer"],
  genres: ["electronic", "ambient"],
  creativeSignature:
    "Nocturnal electronic stories grounded in tactile details.",
  themes: ["ritual", "process"],
  targetAudience: "Curious electronic listeners and independent creators.",
  boundaries: ["No fake urgency"],
};

function state(
  status: OnboardingState["status"] = "in_progress",
  readyCount = 3,
): OnboardingState {
  return {
    status,
    step:
      status === "complete"
        ? "complete"
        : readyCount >= 3
          ? "profile"
          : "upload",
    readyCount,
    recommendedAssetCount: 3,
    profile: readyCount >= 3 ? profile : null,
    assets: Array.from({ length: readyCount }, (_, index) => ({
      id: `0198f3a2-82dd-7000-8000-00000000006${index}`,
      fileName: `source-${index + 1}.mov`,
      mimeType: "video/quicktime",
      byteSize: 12_500_000,
      status: "ready" as const,
      representativeness: "representative" as const,
      analysis: insight,
      errorMessage: null,
      createdAt: "2026-08-02T10:00:00.000Z",
    })),
  };
}

function setup(currentState = state()) {
  const workspaces = {
    resolve: vi.fn().mockResolvedValue(context),
  } as unknown as WorkspaceContextService;
  const repository: OnboardingRepository = {
    getState: vi.fn().mockResolvedValue(currentState),
    getStageName: vi.fn().mockResolvedValue("Nova Sainte"),
    findSourceAsset: vi.fn().mockResolvedValue({
      id: "0198f3a2-82dd-7000-8000-000000000060",
      workspaceId: context.workspaceId,
      fileName: "warehouse-take.mov",
      mimeType: "video/quicktime",
      gcsUri: "gs://creonome-media/workspaces/workspace-1/sources/take.mov",
      status: "uploaded",
    }),
    startAnalysis: vi
      .fn()
      .mockResolvedValue("0198f3a2-82dd-7000-8000-000000000070"),
    completeAnalysis: vi.fn(),
    failAnalysis: vi.fn(),
    updateRepresentativeness: vi.fn().mockResolvedValue(true),
    saveDraftProfile: vi.fn(),
    completeProfile: vi.fn(),
  };
  const intelligence: OnboardingIntelligence = {
    provider: "vertex-ai",
    model: "gemini-3.5-flash",
    analyze: vi.fn().mockResolvedValue(insight),
    buildProfile: vi.fn().mockResolvedValue({
      disciplines: profile.disciplines,
      genres: profile.genres,
      creativeSignature: profile.creativeSignature,
      themes: profile.themes,
      targetAudience: profile.targetAudience,
      boundaries: profile.boundaries,
    }),
  };
  return {
    service: new OnboardingService(workspaces, repository, intelligence),
    repository,
    intelligence,
  };
}

describe("OnboardingService", () => {
  it("analyzes a private workspace asset and persists its evidence", async () => {
    const { service, repository, intelligence } = setup();

    await expect(
      service.analyzeAsset(principal, "0198f3a2-82dd-7000-8000-000000000060"),
    ).resolves.toMatchObject({ readyCount: 3 });
    expect(intelligence.analyze).toHaveBeenCalledWith(
      expect.objectContaining({
        gcsUri: expect.stringMatching(/^gs:\/\//),
        mimeType: "video/quicktime",
      }),
    );
    expect(repository.completeAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({ insight, provider: "vertex-ai" }),
    );
  });

  it("marks one failed analysis without blocking the onboarding state", async () => {
    const failed = {
      ...state("in_progress", 0),
      assets: [
        {
          ...state().assets[0]!,
          status: "failed" as const,
          analysis: null,
          errorMessage: "We couldn't analyze this file. Try again.",
        },
      ],
    };
    const { service, repository, intelligence } = setup(failed);
    vi.mocked(intelligence.analyze).mockRejectedValueOnce(
      new Error("provider unavailable"),
    );

    await expect(
      service.analyzeAsset(principal, "0198f3a2-82dd-7000-8000-000000000060"),
    ).resolves.toMatchObject({ assets: [{ status: "failed" }] });
    expect(repository.failAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: "analysis_failed" }),
    );
  });

  it("requires three analyzed sources before drafting the profile", async () => {
    const { service, intelligence } = setup(state("in_progress", 2));

    await expect(service.buildProfile(principal)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(intelligence.buildProfile).not.toHaveBeenCalled();
  });

  it("builds and saves an editable profile from labeled source evidence", async () => {
    const { service, repository, intelligence } = setup();

    await expect(service.buildProfile(principal)).resolves.toMatchObject({
      profile: { stageName: "Nova Sainte" },
    });
    expect(intelligence.buildProfile).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          representativeness: "representative",
          insight,
        }),
      ]),
    );
    expect(repository.saveDraftProfile).toHaveBeenCalledWith(
      context,
      expect.objectContaining({ stageName: "Nova Sainte" }),
    );
  });

  it("persists the creator edits and completes onboarding", async () => {
    const { service, repository } = setup(state("complete"));

    await expect(service.complete(principal, profile)).resolves.toMatchObject({
      status: "complete",
    });
    expect(repository.completeProfile).toHaveBeenCalledWith(context, profile);
  });
});
