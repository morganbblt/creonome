import type { AuthPrincipal } from "../auth/auth-token-verifier.js";

export type WorkspaceContext = {
  userId: string;
  workspaceId: string;
  creatorProfileId: string;
};

export interface WorkspaceRepository {
  findForAuthUser(authUserId: string): Promise<WorkspaceContext | null>;
  claimDemoWorkspace(
    principal: AuthPrincipal,
  ): Promise<WorkspaceContext | null>;
  createPersonalWorkspace(
    principal: AuthPrincipal,
    initialCreditBalance: number,
  ): Promise<WorkspaceContext>;
}

export const WORKSPACE_REPOSITORY = Symbol("WORKSPACE_REPOSITORY");
