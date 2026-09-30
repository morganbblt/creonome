import {
  Inject,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import {
  CreditLedgerSchema,
  CreditSpendCapSchema,
  CreditsResponseSchema,
  type CreditLedger,
  type CreditSpendCap,
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

/**
 * The cost of the most expensive generation currently offered. Used both
 * as the default "low balance" warning threshold on the web nav pill and
 * as the ceiling clients see when configuring a per-generation spend cap
 * (bible §12.3 "Prévenir avant solde faible" / "Permettre un plafond par
 * génération").
 */
export const maxCreditCost = Math.max(...Object.values(creditCosts));

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
    return this.getAccountForWorkspace(context.workspaceId);
  }

  /**
   * Same lookup as {@link getAccount}, for callers that already have a
   * workspace id and no end-user `AuthPrincipal` — e.g. an internal
   * generation-job handler invoked by Cloud Tasks.
   */
  async getAccountForWorkspace(workspaceId: string): Promise<CreditsResponse> {
    return this.toContract(await this.repository.getAccount(workspaceId));
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

  async getSpendCap(principal: AuthPrincipal): Promise<CreditSpendCap> {
    const context = await this.workspaces.resolve(principal);
    const spendCap = await this.repository.getSpendCap(context.workspaceId);
    if (spendCap === undefined) {
      throw new NotFoundException("Credit account was not found");
    }
    return this.toSpendCapContract(spendCap);
  }

  async setSpendCap(
    principal: AuthPrincipal,
    spendCap: number | null,
  ): Promise<CreditSpendCap> {
    const context = await this.workspaces.resolve(principal);
    const updated = await this.repository.setSpendCap(
      context.workspaceId,
      spendCap,
    );
    if (!updated) {
      throw new NotFoundException("Credit account was not found");
    }
    return this.toSpendCapContract(spendCap);
  }

  async reserve(
    workspaceId: string,
    amount: number,
    idempotencyKey: string,
    description: string,
  ): Promise<CreditsResponse> {
    // Checked before the atomic reservation rather than inside it so the
    // caller gets an explicit "over your cap" error instead of the generic
    // insufficient-credits one. A cap changed concurrently with this call
    // only applies from the next reservation, which is acceptable.
    const cap = await this.repository.getSpendCap(workspaceId);
    if (cap != null && amount > cap) {
      throw new UnprocessableEntityException(
        `Cette action dépasse votre plafond de ${cap} crédits par génération.`,
      );
    }
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

  private toSpendCapContract(spendCap: number | null): CreditSpendCap {
    return CreditSpendCapSchema.parse({
      spendCap,
      maxOperationCost: maxCreditCost,
    });
  }
}
