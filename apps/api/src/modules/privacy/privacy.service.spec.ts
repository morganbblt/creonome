import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import type { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import type { PrivacyRepository } from "./privacy.repository.js";
import { PrivacyService } from "./privacy.service.js";

const principal: AuthPrincipal = {
  subject: "0198f3a2-82dd-7000-8000-000000000001",
};
const context = {
  workspaceId: "0198f3a2-82dd-7000-8000-000000000002",
  userId: "0198f3a2-82dd-7000-8000-000000000003",
  creatorProfileId: "0198f3a2-82dd-7000-8000-000000000004",
};

function setup() {
  const workspaces = {
    resolve: vi.fn().mockResolvedValue(context),
  } as unknown as WorkspaceContextService;
  const repository: PrivacyRepository = {
    getState: vi.fn().mockResolvedValue({
      preferences: {
        modelTrainingOptIn: false,
        keepRushesAfterExport: true,
        updatedAt: new Date("2026-08-02T10:00:00.000Z"),
      },
      accountDeletion: null,
    }),
    updatePreferences: vi.fn().mockImplementation(async (input) => ({
      ...input,
      updatedAt: new Date("2026-08-02T10:01:00.000Z"),
    })),
    buildExport: vi.fn().mockResolvedValue({
      creatorDna: { summary: "Nocturnal and tactile", traits: [] },
    }),
    isWorkspaceOwner: vi.fn().mockResolvedValue(true),
    scheduleAccountDeletion: vi.fn().mockImplementation(async (input) => ({
      id: "0198f3a2-82dd-7000-8000-000000000090",
      status: "scheduled" as const,
      requestedAt: new Date("2026-08-02T10:00:00.000Z"),
      scheduledFor: input.scheduledFor,
    })),
    cancelAccountDeletion: vi.fn().mockResolvedValue(true),
  };
  return {
    repository,
    service: new PrivacyService(workspaces, repository),
  };
}

describe("PrivacyService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-02T10:00:00.000Z"));
  });

  afterEach(() => vi.useRealTimers());

  it("returns persisted preferences and the current deletion state", async () => {
    const { service } = setup();

    await expect(service.getState(principal)).resolves.toEqual({
      preferences: {
        modelTrainingOptIn: false,
        keepRushesAfterExport: true,
        updatedAt: "2026-08-02T10:00:00.000Z",
      },
      accountDeletion: null,
    });
  });

  it("updates both preferences inside the authenticated workspace", async () => {
    const { service, repository } = setup();

    await expect(
      service.updatePreferences(principal, {
        modelTrainingOptIn: true,
        keepRushesAfterExport: false,
      }),
    ).resolves.toMatchObject({
      modelTrainingOptIn: true,
      keepRushesAfterExport: false,
    });
    expect(repository.updatePreferences).toHaveBeenCalledWith({
      workspaceId: context.workspaceId,
      userId: context.userId,
      modelTrainingOptIn: true,
      keepRushesAfterExport: false,
    });
  });

  it("creates a portable JSON download without inventing a background ZIP", async () => {
    const { service, repository } = setup();

    const result = await service.createExport(principal, {
      kind: "creator_dna",
    });

    expect(repository.buildExport).toHaveBeenCalledWith(
      context.workspaceId,
      "creator_dna",
      context.userId,
    );
    expect(result).toMatchObject({
      kind: "creator_dna",
      fileName: "creonome-creator-dna-2026-08-02.json",
      mimeType: "application/json;charset=utf-8",
    });
    expect(JSON.parse(result.content)).toEqual({
      creatorDna: { summary: "Nocturnal and tactile", traits: [] },
    });
  });

  it("schedules confirmed deletion 24 hours later", async () => {
    const { service, repository } = setup();

    await expect(
      service.scheduleAccountDeletion(principal, {
        confirmation: "DELETE MY ACCOUNT",
      }),
    ).resolves.toMatchObject({
      status: "scheduled",
      requestedAt: "2026-08-02T10:00:00.000Z",
      scheduledFor: "2026-08-03T10:00:00.000Z",
    });
    expect(repository.scheduleAccountDeletion).toHaveBeenCalledWith({
      workspaceId: context.workspaceId,
      userId: context.userId,
      scheduledFor: new Date("2026-08-03T10:00:00.000Z"),
    });
  });

  it("rejects account deletion from a non-owner workspace member", async () => {
    const { service, repository } = setup();
    vi.mocked(repository.isWorkspaceOwner).mockResolvedValue(false);

    await expect(
      service.scheduleAccountDeletion(principal, {
        confirmation: "DELETE MY ACCOUNT",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.scheduleAccountDeletion).not.toHaveBeenCalled();
  });

  it("does not report a cancellation when no scheduled request matched", async () => {
    const { service, repository } = setup();
    vi.mocked(repository.cancelAccountDeletion).mockResolvedValue(false);

    await expect(
      service.cancelAccountDeletion(
        principal,
        "0198f3a2-82dd-7000-8000-000000000090",
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
