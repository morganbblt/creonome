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
  ProjectSchema,
  UpgradeOpportunityInputSchema,
  UpgradeOpportunityResultSchema,
} from "./index.js";

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
      changeSummary: "Quietened the opening while preserving the one-take rule.",
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
