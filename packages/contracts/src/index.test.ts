import { describe, expect, it } from "vitest";
import {
  CreatorDnaSchema,
  CreditsResponseSchema,
  GenerationJobSchema,
  HealthResponseSchema,
  IntegrationsResponseSchema,
  ModifyOpportunityInputSchema,
  OpportunityBatchSchema,
  OpportunityDetailSchema,
  OpportunityRevisionSchema,
  OnboardingStateSchema,
  UpdateOnboardingAssetInputSchema,
  UpdateOnboardingProfileInputSchema,
  ProjectListSchema,
  ProjectSchema,
  ProjectVideoSchema,
  UpgradeOpportunityInputSchema,
  UpgradeOpportunityResultSchema,
} from "./index.js";
import * as contracts from "./index.js";

const opportunity = {
  id: "7af6fdcc-8881-48c2-ae5d-3f45df1bd0a2",
  strategy: "signature" as const,
  title: "The silence before the drop",
  pitch: "Hold the room still, then let the first kick arrive alone.",
  score: 92,
  confidence: "high" as const,
  freshness: "fresh" as const,
  nextLevel: "script" as const,
  creditCost: 2,
};

describe("shared API contracts", () => {
  it("validates a saved creative project", () => {
    expect(
      ProjectSchema.parse({
        id: "0198f3a2-82dd-7000-8000-000000000001",
        opportunityId: "0198f3a2-82dd-7000-8000-000000000002",
        title: "Warehouse tape loop",
        status: "active",
        currentLevel: "idea",
        currentVersion: 1,
        updatedAt: "2026-08-02T10:00:00.000Z",
      }),
    ).toMatchObject({ currentLevel: "idea", currentVersion: 1 });
  });

  it("keeps real versus fallback video provenance explicit", () => {
    expect(
      ProjectVideoSchema.parse({
        id: "0198f3a2-82dd-7000-8000-000000000060",
        projectId: "0198f3a2-82dd-7000-8000-000000000001",
        previewUrl: "/api/creonome/projects/project-1/video",
        mimeType: "video/mp4",
        durationSeconds: 8,
        width: 720,
        height: 1280,
        provider: "google-gemini-api",
        model: "veo-3.1-fast-generate-preview",
        simulated: false,
        createdAt: "2026-08-02T10:00:00.000Z",
      }),
    ).toMatchObject({
      provider: "google-gemini-api",
      simulated: false,
    });
  });

  it("requires the maturity and discovery metadata used by the project index", () => {
    const project = {
      id: "0198f3a2-82dd-7000-8000-000000000001",
      opportunityId: "0198f3a2-82dd-7000-8000-000000000002",
      title: "Warehouse tape loop",
      status: "active",
      currentLevel: "storyboard",
      currentVersion: 3,
      updatedAt: "2026-08-02T10:00:00.000Z",
    };

    expect(ProjectListSchema.safeParse({ projects: [project] }).success).toBe(
      false,
    );
    expect(
      ProjectListSchema.safeParse({
        projects: [
          {
            ...project,
            platform: "tiktok",
            score: 91,
            hasScript: true,
            hasStoryboard: true,
            hasVideo: false,
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("validates a complete project workspace with its latest deliverables", () => {
    const projectDetailSchema = (contracts as Record<string, unknown>)
      .ProjectDetailSchema as
      { safeParse: (value: unknown) => { success: boolean } } | undefined;

    expect(projectDetailSchema).toBeDefined();
    if (!projectDetailSchema) return;

    expect(
      projectDetailSchema.safeParse({
        id: "0198f3a2-82dd-7000-8000-000000000001",
        opportunityId: "0198f3a2-82dd-7000-8000-000000000002",
        title: "Warehouse tape loop",
        status: "active",
        currentLevel: "storyboard",
        currentVersion: 3,
        updatedAt: "2026-08-02T10:00:00.000Z",
        platform: "tiktok",
        score: 91,
        hasScript: true,
        hasStoryboard: true,
        hasVideo: false,
        script: {
          id: "0198f3a2-82dd-7000-8000-000000000010",
          projectId: "0198f3a2-82dd-7000-8000-000000000001",
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
        versions: [
          {
            version: 3,
            level: "storyboard",
            changeSource: "ai",
            changeSummary: "Built the first visual sequence.",
            lockedFields: ["duration"],
            createdAt: "2026-08-02T10:00:00.000Z",
          },
        ],
        latestJob: {
          id: "0198f3a2-82dd-7000-8000-000000000030",
          kind: "storyboard",
          provider: "gemini",
          model: "gemini-3.6-flash",
          status: "succeeded",
          progress: 100,
          createdAt: "2026-08-02T09:59:00.000Z",
          updatedAt: "2026-08-02T10:00:00.000Z",
          completedAt: "2026-08-02T10:00:00.000Z",
        },
      }).success,
    ).toBe(true);
  });

  it("validates the mixed private library and asset registration contract", () => {
    const librarySchema = (contracts as Record<string, unknown>)
      .LibrarySchema as
      { safeParse: (value: unknown) => { success: boolean } } | undefined;
    const createAssetInputSchema = (contracts as Record<string, unknown>)
      .CreateAssetInputSchema as
      { safeParse: (value: unknown) => { success: boolean } } | undefined;

    expect(librarySchema).toBeDefined();
    expect(createAssetInputSchema).toBeDefined();
    if (!librarySchema || !createAssetInputSchema) return;

    expect(
      librarySchema.safeParse({
        totalByteSize: 8_400_000,
        items: [
          {
            id: "0198f3a2-82dd-7000-8000-000000000040",
            projectId: "0198f3a2-82dd-7000-8000-000000000001",
            name: "warehouse-tapes-v1.mp4",
            kind: "export",
            mimeType: "video/mp4",
            byteSize: 8_400_000,
            durationSeconds: 35,
            status: "ready",
            source: "generated",
            createdAt: "2026-08-02T10:00:00.000Z",
          },
        ],
      }).success,
    ).toBe(true);
    expect(
      createAssetInputSchema.safeParse({
        fileName: "needle_macro.mov",
        mimeType: "video/quicktime",
        byteSize: 12_500_000,
        gcsUri: "gs://creonome-media/workspaces/workspace-1/sources/asset.mov",
      }).success,
    ).toBe(true);
  });

  it("validates an explicit receipt after a private source is deleted", () => {
    const assetDeletionSchema = (contracts as Record<string, unknown>)
      .AssetDeletionSchema as
      { safeParse: (value: unknown) => { success: boolean } } | undefined;

    expect(assetDeletionSchema).toBeDefined();
    if (!assetDeletionSchema) return;

    expect(
      assetDeletionSchema.safeParse({
        id: "0198f3a2-82dd-7000-8000-000000000040",
        deleted: true,
      }).success,
    ).toBe(true);
    expect(
      assetDeletionSchema.safeParse({
        id: "0198f3a2-82dd-7000-8000-000000000040",
        deleted: false,
      }).success,
    ).toBe(false);
  });

  it("validates an evidence-backed onboarding workspace", () => {
    const state = OnboardingStateSchema.parse({
      status: "in_progress",
      step: "profile",
      readyCount: 3,
      recommendedAssetCount: 3,
      assets: [
        {
          id: "0198f3a2-82dd-7000-8000-000000000060",
          fileName: "warehouse-take.mov",
          mimeType: "video/quicktime",
          byteSize: 12_500_000,
          status: "ready",
          representativeness: "representative",
          analysis: {
            summary: "A restrained live take built around tactile close-ups.",
            disciplines: ["music performance", "video"],
            genres: ["electronic", "ambient"],
            creativeSignature:
              "Nocturnal, tactile and deliberately understated.",
            themes: ["process", "anticipation"],
            targetAudience:
              "Listeners drawn to intimate electronic performance.",
            boundaries: ["No fake urgency"],
            evidence: ["Long pause before the first beat", "Macro needle shot"],
          },
          errorMessage: null,
          createdAt: "2026-08-02T10:00:00.000Z",
        },
      ],
      profile: {
        stageName: "Nova Sainte",
        disciplines: ["music producer", "performer"],
        genres: ["electronic", "ambient"],
        creativeSignature:
          "Nocturnal electronic stories grounded in tactile details.",
        themes: ["ritual", "process", "transformation"],
        targetAudience:
          "Curious electronic listeners and independent creators.",
        boundaries: ["No fake urgency", "No trend imitation"],
      },
    });

    expect(state.readyCount).toBe(3);
    expect(state.assets[0]?.analysis?.evidence).toHaveLength(2);
  });

  it("constrains onboarding edits to supported profile and evidence labels", () => {
    expect(
      UpdateOnboardingAssetInputSchema.safeParse({
        representativeness: "reference_only",
      }).success,
    ).toBe(true);
    expect(
      UpdateOnboardingAssetInputSchema.safeParse({
        representativeness: "viral",
      }).success,
    ).toBe(false);
    expect(
      UpdateOnboardingProfileInputSchema.safeParse({
        stageName: "Nova Sainte",
        disciplines: ["music producer"],
        genres: ["electronic"],
        creativeSignature: "Tactile, restrained electronic storytelling.",
        themes: ["process"],
        targetAudience: "Independent electronic listeners.",
        boundaries: [],
      }).success,
    ).toBe(true);
  });

  it("requires credit confirmation and rich scenes for a storyboard upgrade", () => {
    const upgradeInputSchema = (contracts as Record<string, unknown>)
      .UpgradeProjectInputSchema as
      { safeParse: (value: unknown) => { success: boolean } } | undefined;
    const upgradeResultSchema = (contracts as Record<string, unknown>)
      .UpgradeProjectResultSchema as
      { safeParse: (value: unknown) => { success: boolean } } | undefined;

    expect(upgradeInputSchema).toBeDefined();
    expect(upgradeResultSchema).toBeDefined();
    if (!upgradeInputSchema || !upgradeResultSchema) return;

    expect(
      upgradeInputSchema.safeParse({
        targetLevel: "storyboard",
        confirmedCreditCost: false,
      }).success,
    ).toBe(false);
    expect(
      upgradeResultSchema.safeParse({
        project: {
          id: "0198f3a2-82dd-7000-8000-000000000001",
          opportunityId: "0198f3a2-82dd-7000-8000-000000000002",
          title: "Warehouse tape loop",
          status: "active",
          currentLevel: "storyboard",
          currentVersion: 4,
          updatedAt: "2026-08-02T10:00:00.000Z",
        },
        storyboard: {
          id: "0198f3a2-82dd-7000-8000-000000000050",
          title: "Warehouse tape loop",
          aspectRatio: "9:16",
          durationSeconds: 35,
          scenes: [
            {
              id: "0198f3a2-82dd-7000-8000-000000000051",
              position: 1,
              startSeconds: 0,
              heading: "The pause",
              description: "Hold on the hand above the record.",
              shotType: "macro handheld",
              voiceover: "Wait for the room.",
              onScreenText: "listen first",
              durationSeconds: 8,
              bRoll: "Dust catching the practical light.",
              transition: "Hard cut on needle contact.",
              requiredAsset: "needle_macro.mov",
              sound: "Room tone, then needle crackle.",
              editingNote: "Keep the first two seconds silent.",
              referenceFrameUrl: null,
            },
          ],
        },
        job: {
          id: "0198f3a2-82dd-7000-8000-000000000052",
          kind: "storyboard",
          provider: "gemini",
          model: "gemini-3.6-flash",
          status: "succeeded",
          progress: 100,
          createdAt: "2026-08-02T09:59:00.000Z",
          updatedAt: "2026-08-02T10:00:00.000Z",
          completedAt: "2026-08-02T10:00:00.000Z",
        },
        credits: { balance: 54, reserved: 0, available: 54 },
      }).success,
    ).toBe(true);
  });

  it("contracts a persisted MVP video render as the final project level", () => {
    const inputSchema = (contracts as Record<string, unknown>)
      .UpgradeProjectInputSchema as {
      safeParse: (value: unknown) => { success: boolean };
    };
    const resultSchema = (contracts as Record<string, unknown>)
      .UpgradeVideoResultSchema as
      { safeParse: (value: unknown) => { success: boolean } } | undefined;

    expect(
      inputSchema.safeParse({
        targetLevel: "video",
        confirmedCreditCost: true,
      }).success,
    ).toBe(true);
    expect(resultSchema).toBeDefined();
    if (!resultSchema) return;

    expect(
      resultSchema.safeParse({
        project: {
          id: "0198f3a2-82dd-7000-8000-000000000001",
          opportunityId: "0198f3a2-82dd-7000-8000-000000000002",
          title: "Warehouse tape loop",
          status: "active",
          currentLevel: "video",
          currentVersion: 4,
          updatedAt: "2026-08-02T10:00:00.000Z",
        },
        video: {
          id: "0198f3a2-82dd-7000-8000-000000000060",
          projectId: "0198f3a2-82dd-7000-8000-000000000001",
          previewUrl: "/demo/creonome-vertical-demo.mp4",
          mimeType: "video/mp4",
          durationSeconds: 35,
          width: 540,
          height: 960,
          provider: "creonome",
          model: "deterministic-motion-preview-v1",
          simulated: true,
          createdAt: "2026-08-02T10:00:00.000Z",
        },
        job: {
          id: "0198f3a2-82dd-7000-8000-000000000061",
          kind: "video_render",
          provider: "creonome",
          model: "mvp-motion-preview-v1",
          status: "succeeded",
          progress: 100,
          createdAt: "2026-08-02T09:59:00.000Z",
          updatedAt: "2026-08-02T10:00:00.000Z",
          completedAt: "2026-08-02T10:00:00.000Z",
        },
        credits: { balance: 42, reserved: 0, available: 42 },
      }).success,
    ).toBe(true);
  });
  it("accepts the public health response", () => {
    const result = HealthResponseSchema.parse({
      status: "ok",
      service: "creonome-api",
      version: "0.1.0",
      timestamp: "2026-08-02T12:00:00.000Z",
    });

    expect(result.status).toBe("ok");
  });

  it("requires exactly three scored opportunities", () => {
    const valid = OpportunityBatchSchema.safeParse({
      generatedAt: "2026-08-02T12:00:00.000Z",
      opportunities: [
        opportunity,
        {
          ...opportunity,
          id: "c51ff70f-2aed-48ec-97b1-3163eb4247a4",
          strategy: "stretch",
        },
        {
          ...opportunity,
          id: "b37ea693-66d4-41fc-a260-768942277d10",
          strategy: "repeatable",
        },
      ],
    });
    const invalid = OpportunityBatchSchema.safeParse({
      generatedAt: "2026-08-02T12:00:00.000Z",
      opportunities: [opportunity, opportunity],
    });

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });

  it("validates the read-only opportunity detail used by the creative chat", () => {
    expect(
      OpportunityDetailSchema.parse({
        ...opportunity,
        currentLevel: "idea",
        projectId: null,
        hook: "Two euros. One take. No talking.",
        rationale:
          "The creator's strongest clips open on a physical gesture and delay the musical reveal.",
        reserve: "Clear the sample before generating a storyboard.",
        effort: "low",
        platform: "tiktok",
        estimatedDurationSeconds: 35,
        evidence: [
          "6 of 8 strong clips open on a gesture",
          "Single-take studio footage is already part of the creator DNA",
        ],
        trendSignal: {
          status: "partial",
          title: "Quiet process, loud reveal",
          lifecycle: "emerging",
          momentumScore: 88,
          observedAt: "2026-08-02T11:00:00.000Z",
          evidenceCount: 8,
          source: "sample",
          reason: "Synthetic signal set for the deterministic demo.",
        },
        subScores: {
          momentum: 82,
          dnaFit: 91,
          novelty: 68,
          feasibility: 88,
        },
      }).currentLevel,
    ).toBe("idea");
  });

  it("validates a scoped chat revision without mutating the source opportunity", () => {
    const input = ModifyOpportunityInputSchema.parse({
      instruction: "Keep the one-take constraint but make the opening quieter.",
      memoryScope: "project",
      lockedFields: ["duration"],
    });
    const revision = OpportunityRevisionSchema.parse({
      project: {
        id: "0198f3a2-82dd-7000-8000-000000000020",
        opportunityId: opportunity.id,
        title: opportunity.title,
        status: "active",
        currentLevel: "idea",
        currentVersion: 2,
        updatedAt: "2026-08-02T12:03:00.000Z",
      },
      version: 2,
      title: opportunity.title,
      pitch: opportunity.pitch,
      hook: "Let the room breathe. Then drop the needle.",
      changeSummary:
        "Quietened the opening while preserving the one-take rule.",
      memoryCandidate: {
        id: "0198f3a2-82dd-7000-8000-000000000021",
        status: "pending",
        scope: "project",
        content: "Prefer quiet openings for this project.",
      },
    });

    expect(input.memoryScope).toBe("project");
    expect(revision.project.currentVersion).toBe(2);
  });

  it("validates explicit opportunity feedback and its memory receipt", () => {
    const feedbackInputSchema = (contracts as Record<string, unknown>)
      .OpportunityFeedbackInputSchema as
      { parse: (value: unknown) => { action: string } } | undefined;
    const feedbackResultSchema = (contracts as Record<string, unknown>)
      .OpportunityFeedbackResultSchema as
      | {
          parse: (value: unknown) => {
            action: string;
            memoryCandidate: { scope: string } | null;
          };
        }
      | undefined;

    expect(feedbackInputSchema).toBeDefined();
    expect(feedbackResultSchema).toBeDefined();
    if (!feedbackInputSchema || !feedbackResultSchema) return;

    expect(feedbackInputSchema.parse({ action: "never_use" }).action).toBe(
      "never_use",
    );
    expect(
      feedbackResultSchema.parse({
        id: "0198f3a2-82dd-7000-8000-000000000024",
        opportunityId: opportunity.id,
        action: "never_use",
        memoryCandidate: {
          id: "0198f3a2-82dd-7000-8000-000000000025",
          status: "pending",
          scope: "creator",
          content: "Avoid this kind of creative direction.",
        },
        createdAt: "2026-08-02T12:05:00.000Z",
      }).memoryCandidate?.scope,
    ).toBe("creator");
  });

  it("requires explicit credit confirmation for a script upgrade", () => {
    expect(
      UpgradeOpportunityInputSchema.safeParse({
        targetLevel: "script",
        confirmedCreditCost: false,
      }).success,
    ).toBe(false);

    expect(
      UpgradeOpportunityResultSchema.parse({
        project: {
          id: "0198f3a2-82dd-7000-8000-000000000020",
          opportunityId: opportunity.id,
          title: opportunity.title,
          status: "active",
          currentLevel: "script",
          currentVersion: 2,
          updatedAt: "2026-08-02T12:04:00.000Z",
        },
        script: {
          id: "0198f3a2-82dd-7000-8000-000000000022",
          projectId: "0198f3a2-82dd-7000-8000-000000000020",
          title: opportunity.title,
          hook: "Two euros. One take. No talking.",
          body: "Needle down. Find the tail. Chop once. Let the drop arrive alone.",
          callToAction: "What would you flip?",
          caption: "One skipped record, one decisive take.",
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
          createdAt: "2026-08-02T12:03:00.000Z",
          updatedAt: "2026-08-02T12:04:00.000Z",
          completedAt: "2026-08-02T12:04:00.000Z",
        },
        credits: { balance: 58, reserved: 0, available: 58 },
      }).script.durationSeconds,
    ).toBe(35);
  });

  it("validates creator DNA, credits, jobs and integration status", () => {
    expect(
      CreatorDnaSchema.parse({
        version: 1,
        summary: "Restrained nocturnal electronic storytelling.",
        confirmed: true,
        traits: [
          {
            id: opportunity.id,
            category: "voice",
            label: "Tone",
            value: "precise and intimate",
            confidence: 0.95,
            evidence: { source: "demo" },
          },
        ],
      }).traits,
    ).toHaveLength(1);
    expect(
      CreditsResponseSchema.parse({ balance: 60, reserved: 2, available: 58 })
        .available,
    ).toBe(58);
    expect(
      GenerationJobSchema.parse({
        id: opportunity.id,
        kind: "storyboard",
        provider: "gemini",
        model: "gemini-3.6-flash",
        status: "running",
        progress: 40,
        createdAt: "2026-08-02T12:00:00.000Z",
        updatedAt: "2026-08-02T12:01:00.000Z",
      }).status,
    ).toBe("running");
    expect(
      IntegrationsResponseSchema.parse({
        integrations: [
          { provider: "tiktok", configured: false, status: "unavailable" },
          { provider: "instagram", configured: false, status: "unavailable" },
        ],
      }).integrations,
    ).toHaveLength(2);
  });
});
