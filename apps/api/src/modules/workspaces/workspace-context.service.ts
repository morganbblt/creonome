import { Inject, Injectable } from "@nestjs/common";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import {
  WORKSPACE_REPOSITORY,
  type WorkspaceContext,
  type WorkspaceRepository,
} from "./workspace.repository.js";

@Injectable()
export class WorkspaceContextService {
  constructor(
    @Inject(WORKSPACE_REPOSITORY)
    private readonly repository: WorkspaceRepository,
    private readonly demoMode: boolean,
    private readonly initialCreditBalance: number,
  ) {}

  async resolve(principal: AuthPrincipal): Promise<WorkspaceContext> {
    const existing = await this.repository.findForAuthUser(principal.subject);
    if (existing) {
      return existing;
    }

    if (this.demoMode) {
      const demo = await this.repository.claimDemoWorkspace(principal);
      if (demo) {
        return demo;
      }
    }

    return this.repository.createPersonalWorkspace(
      principal,
      this.initialCreditBalance,
    );
  }
}
