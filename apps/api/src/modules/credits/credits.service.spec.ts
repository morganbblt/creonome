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
  const repository: CreditsRepository = {
    getAccount: vi.fn().mockResolvedValue({ balance, reserved }),
    listLedger: vi.fn().mockResolvedValue([]),
    reserve: vi.fn().mockResolvedValue({ balance, reserved: reserved + 4 }),
    commit: vi.fn(),
    release: vi.fn(),
  };
  return { service: new CreditsService(workspaces, repository), repository };
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
});
