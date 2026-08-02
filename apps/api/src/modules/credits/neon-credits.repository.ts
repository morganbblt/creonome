import { Inject, ServiceUnavailableException } from "@nestjs/common";
import {
  creditAccounts,
  creditLedger,
  type CreonomeDatabase,
} from "@creonome/db";
import { desc, eq, sql } from "drizzle-orm";
import { CREONOME_DATABASE } from "../database/database.module.js";
import type {
  CreditAccountRecord,
  CreditLedgerRecord,
  CreditsRepository,
} from "./credits.repository.js";

type CreditMutation = "reservation" | "commit" | "release";

export class NeonCreditsRepository implements CreditsRepository {
  constructor(
    @Inject(CREONOME_DATABASE)
    private readonly database: CreonomeDatabase | undefined,
  ) {}

  async getAccount(workspaceId: string): Promise<CreditAccountRecord | null> {
    const [account] = await this.requireDatabase()
      .select({
        balance: creditAccounts.balance,
        reserved: creditAccounts.reserved,
      })
      .from(creditAccounts)
      .where(eq(creditAccounts.workspaceId, workspaceId))
      .limit(1);
    return account ?? null;
  }

  listLedger(workspaceId: string): Promise<CreditLedgerRecord[]> {
    return this.requireDatabase()
      .select({
        id: creditLedger.id,
        kind: creditLedger.kind,
        balanceDelta: creditLedger.balanceDelta,
        reservedDelta: creditLedger.reservedDelta,
        description: creditLedger.description,
        createdAt: creditLedger.createdAt,
      })
      .from(creditLedger)
      .where(eq(creditLedger.workspaceId, workspaceId))
      .orderBy(desc(creditLedger.createdAt))
      .limit(100);
  }

  reserve(
    workspaceId: string,
    amount: number,
    idempotencyKey: string,
    description: string,
  ): Promise<CreditAccountRecord | null> {
    return this.mutate(
      workspaceId,
      amount,
      idempotencyKey,
      description,
      "reservation",
    );
  }

  commit(
    workspaceId: string,
    amount: number,
    idempotencyKey: string,
    description: string,
  ): Promise<CreditAccountRecord | null> {
    return this.mutate(
      workspaceId,
      amount,
      idempotencyKey,
      description,
      "commit",
    );
  }

  release(
    workspaceId: string,
    amount: number,
    idempotencyKey: string,
    description: string,
  ): Promise<CreditAccountRecord | null> {
    return this.mutate(
      workspaceId,
      amount,
      idempotencyKey,
      description,
      "release",
    );
  }

  private async mutate(
    workspaceId: string,
    amount: number,
    idempotencyKey: string,
    description: string,
    mutation: CreditMutation,
  ): Promise<CreditAccountRecord | null> {
    const balanceDelta = mutation === "commit" ? -amount : 0;
    const reservedDelta = mutation === "reservation" ? amount : -amount;
    const accountPredicate =
      mutation === "reservation"
        ? sql`balance - reserved >= ${amount}`
        : sql`reserved >= ${amount}`;
    const result = await this.requireDatabase()
      .execute<CreditAccountRecord>(sql`
      with existing as (
        select 1 from credit_ledger where idempotency_key = ${idempotencyKey}
      ), updated as (
        update credit_accounts
        set
          balance = balance + ${balanceDelta},
          reserved = reserved + ${reservedDelta},
          updated_at = now()
        where workspace_id = ${workspaceId}
          and ${accountPredicate}
          and not exists (select 1 from existing)
        returning balance, reserved
      ), inserted as (
        insert into credit_ledger (
          id, workspace_id, kind, balance_delta, reserved_delta,
          idempotency_key, description, metadata, created_at
        )
        select
          uuidv7(), ${workspaceId}, ${mutation}, ${balanceDelta},
          ${reservedDelta}, ${idempotencyKey}, ${description}, '{}'::jsonb, now()
        from updated
      )
      select balance, reserved
      from credit_accounts
      where workspace_id = ${workspaceId}
        and (
          exists (select 1 from existing)
          or exists (select 1 from updated)
        )
    `);
    return result.rows[0] ?? null;
  }

  private requireDatabase(): CreonomeDatabase {
    if (!this.database) {
      throw new ServiceUnavailableException("DATABASE_URL is not configured");
    }
    return this.database;
  }
}
