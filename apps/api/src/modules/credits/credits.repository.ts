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
