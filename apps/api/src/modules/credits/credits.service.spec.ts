import { describe, expect, it, vi } from "vitest";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import type { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import type { CreditsRepository } from "./credits.repository.js";
import { CreditsService } from "./credits.service.js";

const principal: AuthPrincipal = {
  subject: "0198f3a2-82dd-7000-8000-000000000001",
};

function setup(balance = 60, reserved = 2) {
  const workspaces = {
    resolve: vi.fn().mockResolvedValue({ workspaceId: "workspace-1" }),
  } as unknown as WorkspaceContextService;
  // Stands in for the credit_accounts.spend_cap column: only
  // "workspace-1" has a credit account.
  const spendCaps = new Map<string, number | null>([["workspace-1", null]]);
  const repository: CreditsRepository = {
    getAccount: vi.fn().mockResolvedValue({ balance, reserved }),
    listLedger: vi.fn().mockResolvedValue([]),
    getSpendCap: vi.fn(async (workspaceId: string) =>
      spendCaps.get(workspaceId),
    ),
    setSpendCap: vi.fn(async (workspaceId: string, spendCap: number | null) => {
      if (!spendCaps.has(workspaceId)) return false;
      spendCaps.set(workspaceId, spendCap);
      return true;
    }),
    reserve: vi.fn().mockResolvedValue({ balance, reserved: reserved + 4 }),
    commit: vi.fn(),
    release: vi.fn(),
  };
  return {
    service: new CreditsService(workspaces, repository),
    repository,
    workspaces,
  };
}

describe("CreditsService", () => {
  it("derives available credits from the canonical account", async () => {
    const { service } = setup();
    await expect(service.getAccount(principal)).resolves.toEqual({
      balance: 60,
      reserved: 2,
      available: 58,
    });
  });

  it("estimates visible costs before any reservation", async () => {
    const { service } = setup();
    await expect(service.estimate(principal, "storyboard")).resolves.toEqual({
      kind: "storyboard",
      cost: 4,
      available: 58,
      affordable: true,
    });
  });

  it("fails a reservation when the atomic repository update cannot fund it", async () => {
    const { service, repository } = setup(2, 0);
    vi.mocked(repository.reserve).mockResolvedValue(null);

    await expect(
      service.reserve("workspace-1", 4, "job:storyboard", "Storyboard"),
    ).rejects.toMatchObject({ status: 402 });
  });

  it("reports no spend cap by default, alongside the most expensive operation", async () => {
    const { service } = setup();
    await expect(service.getSpendCap(principal)).resolves.toEqual({
      spendCap: null,
      maxOperationCost: 12,
    });
  });

  it("persists a configured spend cap and surfaces it back", async () => {
    const { service } = setup();
    await expect(service.setSpendCap(principal, 5)).resolves.toEqual({
      spendCap: 5,
      maxOperationCost: 12,
    });
    await expect(service.getSpendCap(principal)).resolves.toEqual({
      spendCap: 5,
      maxOperationCost: 12,
    });
  });

  it("writes the spend cap through the credits repository, not process memory", async () => {
    const { service, repository } = setup();
    await service.setSpendCap(principal, 7);

    expect(repository.setSpendCap).toHaveBeenCalledWith("workspace-1", 7);
  });

  it("returns 404 instead of pretending to save when the workspace has no credit account", async () => {
    const { service, workspaces } = setup();
    vi.mocked(workspaces.resolve).mockResolvedValue({
      workspaceId: "workspace-without-account",
    } as Awaited<ReturnType<WorkspaceContextService["resolve"]>>);

    await expect(service.setSpendCap(principal, 5)).rejects.toMatchObject({
      status: 404,
    });
    await expect(service.getSpendCap(principal)).rejects.toMatchObject({
      status: 404,
    });
  });

  it("clears a configured spend cap when set to null", async () => {
    const { service } = setup();
    await service.setSpendCap(principal, 5);
    await expect(service.setSpendCap(principal, null)).resolves.toEqual({
      spendCap: null,
      maxOperationCost: 12,
    });
  });

  it("rejects a reservation that would exceed the configured spend cap with an explicit message", async () => {
    const { service, repository } = setup();
    await service.setSpendCap(principal, 5);

    await expect(
      service.reserve("workspace-1", 12, "job:video", "Video"),
    ).rejects.toMatchObject({
      status: 422,
      response: {
        message:
          "Cette action dépasse votre plafond de 5 crédits par génération.",
      },
    });
    expect(repository.reserve).not.toHaveBeenCalled();
  });

  it("allows a reservation exactly at the configured spend cap", async () => {
    const { service } = setup();
    await service.setSpendCap(principal, 4);

    await expect(
      service.reserve("workspace-1", 4, "job:storyboard", "Storyboard"),
    ).resolves.toMatchObject({ available: 54 });
  });

  it("does not enforce a cap for a different workspace", async () => {
    const { service } = setup();
    await service.setSpendCap(principal, 1);

    await expect(
      service.reserve("workspace-other", 12, "job:video", "Video"),
    ).resolves.toMatchObject({ available: 54 });
  });
});
