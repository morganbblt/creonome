import {
  Inject,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CreditLedgerSchema,
  CreditsResponseSchema,
  type CreditLedger,
  type CreditsResponse,
} from "@creonome/contracts";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import { WorkspaceContextService } from "../workspaces/workspace-context.service.js";
import {
  CREDITS_REPOSITORY,
  type CreditAccountRecord,
  type CreditsRepository,
} from "./credits.repository.js";

export const creditCosts = {
  opportunity_batch: 3,
  script: 2,
  storyboard: 4,
  video: 12,
  music: 6,
} as const;

export type CreditOperation = keyof typeof creditCosts;

@Injectable()
export class CreditsService {
  constructor(
    @Inject(WorkspaceContextService)
    private readonly workspaces: WorkspaceContextService,
    @Inject(CREDITS_REPOSITORY)
    private readonly repository: CreditsRepository,
  ) {}

  async getAccount(principal: AuthPrincipal): Promise<CreditsResponse> {
    const context = await this.workspaces.resolve(principal);
    return this.toContract(await this.repository.getAccount(context.workspaceId));
  }

  async listLedger(principal: AuthPrincipal): Promise<CreditLedger> {
    const context = await this.workspaces.resolve(principal);
    const entries = await this.repository.listLedger(context.workspaceId);
    return CreditLedgerSchema.parse({
      entries: entries.map((entry) => ({
        ...entry,
        createdAt: entry.createdAt.toISOString(),
      })),
    });
  }

  async estimate(principal: AuthPrincipal, kind: CreditOperation) {
    const account = await this.getAccount(principal);
    const cost = creditCosts[kind];
    return {
      kind,
      cost,
      available: account.available,
      affordable: account.available >= cost,
    };
  }

  async reserve(
    workspaceId: string,
    amount: number,
    idempotencyKey: string,
    description: string,
  ): Promise<CreditsResponse> {
    const account = await this.repository.reserve(
      workspaceId,
      amount,
      idempotencyKey,
      description,
    );
    if (!account) {
      throw new HttpException(
        "Not enough available credits",
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    return this.toContract(account);
  }

  async commit(
    workspaceId: string,
    amount: number,
    idempotencyKey: string,
    description: string,
  ): Promise<CreditsResponse> {
    return this.toContract(
      await this.repository.commit(
        workspaceId,
        amount,
        idempotencyKey,
        description,
      ),
    );
  }

  async release(
    workspaceId: string,
    amount: number,
    idempotencyKey: string,
    description: string,
  ): Promise<CreditsResponse> {
    return this.toContract(
      await this.repository.release(
        workspaceId,
        amount,
        idempotencyKey,
        description,
      ),
    );
  }

  private toContract(account: CreditAccountRecord | null): CreditsResponse {
    if (!account) {
      throw new NotFoundException("Credit account was not found");
    }
    return CreditsResponseSchema.parse({
      ...account,
      available: account.balance - account.reserved,
    });
  }
}
