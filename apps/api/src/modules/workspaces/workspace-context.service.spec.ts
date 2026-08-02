import { describe, expect, it, vi } from "vitest";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import type {
  WorkspaceContext,
  WorkspaceRepository,
} from "./workspace.repository.js";
import { WorkspaceContextService } from "./workspace-context.service.js";

const principal: AuthPrincipal = {
  subject: "0198f3a2-82dd-7000-8000-000000000001",
  name: "Nova Sainte",
  email: "nova@example.com",
};

const context: WorkspaceContext = {
  userId: "0198f3a2-82dd-7000-8000-000000000002",
  workspaceId: "0198f3a2-82dd-7000-8000-000000000003",
  creatorProfileId: "0198f3a2-82dd-7000-8000-000000000004",
};

function repository(
  overrides: Partial<WorkspaceRepository> = {},
): WorkspaceRepository {
  return {
    findForAuthUser: vi.fn().mockResolvedValue(null),
    claimDemoWorkspace: vi.fn().mockResolvedValue(null),
    createPersonalWorkspace: vi.fn().mockResolvedValue(context),
    ...overrides,
  };
}

describe("WorkspaceContextService", () => {
  it("returns an existing tenant context without mutating anything", async () => {
    const repo = repository({
      findForAuthUser: vi.fn().mockResolvedValue(context),
    });
    const service = new WorkspaceContextService(repo, true, 60);

    await expect(service.resolve(principal)).resolves.toEqual(context);
    expect(repo.claimDemoWorkspace).not.toHaveBeenCalled();
    expect(repo.createPersonalWorkspace).not.toHaveBeenCalled();
  });

  it("creates a personal workspace for a new account even when demo mode is enabled", async () => {
    const repo = repository({
      claimDemoWorkspace: vi.fn().mockResolvedValue(context),
    });
    const service = new WorkspaceContextService(repo, true, 60);

    await expect(service.resolve(principal)).resolves.toEqual(context);
    expect(repo.claimDemoWorkspace).not.toHaveBeenCalled();
    expect(repo.createPersonalWorkspace).toHaveBeenCalledWith(principal, 60);
  });

  it("atomically claims the seeded demo only when explicitly requested", async () => {
    const repo = repository({
      claimDemoWorkspace: vi.fn().mockResolvedValue(context),
    });
    const service = new WorkspaceContextService(repo, true, 60);

    await expect(
      service.resolve(principal, { allowDemoWorkspace: true }),
    ).resolves.toEqual(context);
    expect(repo.claimDemoWorkspace).toHaveBeenCalledWith(principal);
    expect(repo.createPersonalWorkspace).not.toHaveBeenCalled();
  });

  it("creates an isolated personal workspace when the demo is unavailable", async () => {
    const repo = repository();
    const service = new WorkspaceContextService(repo, true, 60);

    await expect(service.resolve(principal)).resolves.toEqual(context);
    expect(repo.createPersonalWorkspace).toHaveBeenCalledWith(principal, 60);
  });
});
