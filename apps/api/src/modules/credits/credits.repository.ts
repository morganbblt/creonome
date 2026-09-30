export type CreditAccountRecord = {
  balance: number;
  reserved: number;
};

export type CreditLedgerRecord = {
  id: string;
  kind: string;
  balanceDelta: number;
  reservedDelta: number;
  description: string;
  createdAt: Date;
};

export interface CreditsRepository {
  getAccount(workspaceId: string): Promise<CreditAccountRecord | null>;
  listLedger(workspaceId: string): Promise<CreditLedgerRecord[]>;
  /** Resolves `undefined` when the workspace has no credit account. */
  getSpendCap(workspaceId: string): Promise<number | null | undefined>;
  /** Resolves `false` when the workspace has no credit account. */
  setSpendCap(workspaceId: string, spendCap: number | null): Promise<boolean>;
  reserve(
    workspaceId: string,
    amount: number,
    idempotencyKey: string,
    description: string,
  ): Promise<CreditAccountRecord | null>;
  commit(
    workspaceId: string,
    amount: number,
    idempotencyKey: string,
    description: string,
  ): Promise<CreditAccountRecord | null>;
  release(
    workspaceId: string,
    amount: number,
    idempotencyKey: string,
    description: string,
  ): Promise<CreditAccountRecord | null>;
}

export const CREDITS_REPOSITORY = Symbol("CREDITS_REPOSITORY");
