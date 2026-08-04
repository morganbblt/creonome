import { describe, expect, it, vi } from "vitest";
import { CreonomeApiClient } from "./creonome-api.client";

describe("CreonomeApiClient", () => {
  it("loads the persisted workspace privacy state", async () => {
    const privacy = {
      preferences: {
        modelTrainingOptIn: false,
        keepRushesAfterExport: true,
        updatedAt: "2026-08-02T10:00:00.000Z",
      },
      accountDeletion: null,
    } as const;
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(privacy));
    const client = new CreonomeApiClient(
      "https://api.creonome.app/api/v1",
      async () => "neon-jwt",
      request,
    );

    await expect(client.getPrivacy()).resolves.toEqual(privacy);
    expect(request).toHaveBeenCalledWith(
      "https://api.creonome.app/api/v1/privacy",
      expect.any(Object),
    );
  });

  it("loads the immutable workspace credit ledger", async () => {
    const ledger = { entries: [] } as const;
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(ledger));
    const client = new CreonomeApiClient(
      "https://api.creonome.app/api/v1",
      async () => "neon-jwt",
      request,
    );

    await expect(client.getCreditLedger()).resolves.toEqual(ledger);
    expect(request).toHaveBeenCalledWith(
      "https://api.creonome.app/api/v1/credits/ledger",
      expect.any(Object),
    );
  });

  it("loads the workspace memory review queue", async () => {
    const memories = { pendingCount: 0, pending: [], history: [] } as const;
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(memories));
    const client = new CreonomeApiClient(
      "https://api.creonome.app/api/v1",
      async () => "neon-jwt",
      request,
    );

    await expect(client.getMemoryCandidates()).resolves.toEqual(memories);
    expect(request).toHaveBeenCalledWith(
      "https://api.creonome.app/api/v1/memory-candidates",
      expect.any(Object),
    );
  });

  it("loads the persisted onboarding workspace", async () => {
    const onboarding = {
      status: "pending",
      step: "source",
      readyCount: 0,
      recommendedAssetCount: 3,
      assets: [],
      profile: null,
    } as const;
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(onboarding));
    const client = new CreonomeApiClient(
      "https://api.creonome.app/api/v1",
      async () => "neon-jwt",
      request,
    );

    await expect(client.getOnboarding()).resolves.toEqual(onboarding);
    expect(request).toHaveBeenCalledWith(
      "https://api.creonome.app/api/v1/onboarding",
      expect.any(Object),
    );
  });

  it("loads the mixed workspace library", async () => {
    const library = {
      totalByteSize: 8_400_000,
      items: [
        {
          id: "0198f3a2-82dd-7000-8000-000000000040",
          projectId: "0198f3a2-82dd-7000-8000-000000000020",
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
    } as const;
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(library));
    const client = new CreonomeApiClient(
      "https://api.creonome.app/api/v1",
      async () => "neon-jwt",
      request,
    );

    await expect(client.getLibrary()).resolves.toEqual(library);
    expect(request).toHaveBeenCalledWith(
      "https://api.creonome.app/api/v1/assets",
      expect.any(Object),
    );
  });

  it("loads the project index and a workspace-scoped project detail", async () => {
    const project = {
      id: "0198f3a2-82dd-7000-8000-000000000020",
      opportunityId: "7af6fdcc-8881-48c2-ae5d-3f45df1bd0a2",
      title: "Warehouse tape loop",
      status: "active",
      currentLevel: "script",
      currentVersion: 2,
      updatedAt: "2026-08-02T12:03:00.000Z",
      platform: "tiktok",
      score: 91,
      hasScript: true,
      hasStoryboard: false,
      hasVideo: false,
    } as const;
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ projects: [project] }))
      .mockResolvedValueOnce(
        Response.json({
          ...project,
          script: {
            id: "0198f3a2-82dd-7000-8000-000000000022",
            projectId: project.id,
            title: project.title,
            hook: "Let the room breathe. Then drop the needle.",
            body: "Hold for two seconds, lower the needle, then reveal the kick.",
            callToAction: "What comes after your silence?",
            caption: "The room is part of the arrangement.",
            platforms: ["tiktok"],
            durationSeconds: 35,
          },
          storyboard: null,
          versions: [],
          latestJob: null,
        }),
      );
    const client = new CreonomeApiClient(
      "https://api.creonome.app/api/v1",
      async () => "neon-jwt",
      request,
    );

    await expect(client.getProjects()).resolves.toEqual({
      projects: [project],
    });
    await expect(client.getProject(project.id)).resolves.toMatchObject({
      id: project.id,
      script: { durationSeconds: 35 },
    });
    expect(request).toHaveBeenNthCalledWith(
      2,
      `https://api.creonome.app/api/v1/projects/${project.id}`,
      expect.any(Object),
    );
  });

  it("forwards the Neon access token and validates API responses", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ balance: 60, reserved: 2, available: 58 }),
      );
    const client = new CreonomeApiClient(
      "https://api.creonome.app/api/v1",
      async () => "neon-jwt",
      request,
    );

    await expect(client.getCredits()).resolves.toEqual({
      balance: 60,
      reserved: 2,
      available: 58,
    });
    expect(request).toHaveBeenCalledWith(
      "https://api.creonome.app/api/v1/credits",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer neon-jwt" }),
      }),
    );
  });

  it("fails closed when an upstream payload breaks the shared contract", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ balance: 60 }));
    const client = new CreonomeApiClient(
      "https://api.creonome.app/api/v1",
      async () => "neon-jwt",
      request,
    );

    await expect(client.getCredits()).rejects.toThrow();
  });

  it("lists Creator DNA versions and restores or compares them", async () => {
    const versionsResponse = {
      versions: [
        {
          id: "0198f3a2-82dd-7000-8000-000000000001",
          version: 2,
          summary: "Nocturnal electronic stories.",
          confirmed: true,
          source: "creator_edit",
          restoredFromVersion: null,
          createdAt: "2026-08-02T10:00:00.000Z",
        },
      ],
    } as const;
    const restoredDna = {
      version: 3,
      summary: "Nocturnal electronic stories.",
      confirmed: true,
      traits: [],
    } as const;
    const compareResponse = {
      a: { version: 1, summary: "Old summary" },
      b: { version: 2, summary: "New summary" },
      traits: [],
    } as const;
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(versionsResponse))
      .mockResolvedValueOnce(Response.json(restoredDna))
      .mockResolvedValueOnce(Response.json(compareResponse));
    const client = new CreonomeApiClient(
      "https://api.creonome.app/api/v1",
      async () => "neon-jwt",
      request,
    );

    await expect(client.getCreatorDnaVersions()).resolves.toEqual(
      versionsResponse,
    );
    await expect(client.restoreCreatorDnaVersion(2)).resolves.toEqual(
      restoredDna,
    );
    await expect(
      client.compareCreatorDnaVersions(1, 2),
    ).resolves.toEqual(compareResponse);

    expect(request).toHaveBeenNthCalledWith(
      1,
      "https://api.creonome.app/api/v1/creator-dna/versions",
      expect.any(Object),
    );
    expect(request).toHaveBeenNthCalledWith(
      2,
      "https://api.creonome.app/api/v1/creator-dna/versions/2/restore",
      expect.objectContaining({ method: "POST" }),
    );
    expect(request).toHaveBeenNthCalledWith(
      3,
      "https://api.creonome.app/api/v1/creator-dna/versions/1/compare/2",
      expect.any(Object),
    );
  });

  it("posts validated chat revisions and idempotent script upgrades", async () => {
    const project = {
      id: "0198f3a2-82dd-7000-8000-000000000020",
      opportunityId: "7af6fdcc-8881-48c2-ae5d-3f45df1bd0a2",
      title: "The silence before the drop",
      status: "active",
      currentLevel: "idea",
      currentVersion: 2,
      updatedAt: "2026-08-02T12:03:00.000Z",
    } as const;
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          project,
          version: 2,
          title: project.title,
          pitch: "Hold the room still, then let the first kick arrive alone.",
          hook: "Let the room breathe. Then drop the needle.",
          changeSummary: "Quietened the opening.",
          memoryCandidate: null,
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          project: { ...project, currentLevel: "script" },
          script: {
            id: "0198f3a2-82dd-7000-8000-000000000022",
            projectId: project.id,
            title: project.title,
            hook: "Let the room breathe. Then drop the needle.",
            body: "Hold for two seconds, lower the needle, then reveal the kick.",
            callToAction: "What comes after your silence?",
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
            createdAt: "2026-08-02T12:03:00.000Z",
            updatedAt: "2026-08-02T12:04:00.000Z",
            completedAt: "2026-08-02T12:04:00.000Z",
          },
          credits: { balance: 58, reserved: 0, available: 58 },
        }),
      );
    const client = new CreonomeApiClient(
      "https://api.creonome.app/api/v1",
      async () => "neon-jwt",
      request,
    );

    await client.modifyOpportunity(project.opportunityId, {
      instruction: "Make the opening quieter.",
      memoryScope: "idea",
      lockedFields: [],
    });
    await client.upgradeOpportunity(
      project.opportunityId,
      { targetLevel: "script", confirmedCreditCost: true },
      "upgrade-script-client-1",
    );

    expect(request).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/\/opportunities\/.+\/modify$/),
      expect.objectContaining({ method: "POST" }),
    );
    expect(request).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/\/opportunities\/.+\/upgrade$/),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Idempotency-Key": "upgrade-script-client-1",
        }),
      }),
    );
  });
});
