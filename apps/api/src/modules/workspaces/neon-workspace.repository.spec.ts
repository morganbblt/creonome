import { getTableName } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import type { AuthPrincipal } from "../auth/auth-token-verifier.js";
import { NeonWorkspaceRepository } from "./neon-workspace.repository.js";

describe("NeonWorkspaceRepository createPersonalWorkspace", () => {
  it("journals the initial signup credit grant through the credit ledger", async () => {
    const writes: Array<{ table: string; value: Record<string, unknown> }> = [];
    const fakeDatabase = {
      insert(table: Parameters<typeof getTableName>[0]) {
        return {
          values(value: Record<string, unknown>) {
            writes.push({ table: getTableName(table), value });
            return { kind: "insert" };
          },
        };
      },
      batch: vi.fn().mockResolvedValue([]),
    };
    const repository = new NeonWorkspaceRepository(fakeDatabase as never);
    const principal: AuthPrincipal = {
      subject: "auth-user-0198f3a2-82dd-7000-8000-000000000099",
      email: "creator@example.com",
      name: "Creator Example",
    };

    const context = await repository.createPersonalWorkspace(principal, 60);

    expect(writes.map(({ table }) => table)).toEqual([
      "users",
      "workspaces",
      "workspace_members",
      "creator_profiles",
      "credit_accounts",
      "credit_ledger",
    ]);

    const creditAccountWrite = writes.find(
      ({ table }) => table === "credit_accounts",
    );
    expect(creditAccountWrite?.value).toMatchObject({
      workspaceId: context.workspaceId,
      balance: 60,
      reserved: 0,
    });

    const ledgerWrite = writes.find(({ table }) => table === "credit_ledger");
    expect(ledgerWrite?.value).toMatchObject({
      workspaceId: context.workspaceId,
      kind: "grant",
      balanceDelta: 60,
      reservedDelta: 0,
    });
    expect(ledgerWrite?.value.idempotencyKey).toBe(
      `signup-grant:${context.workspaceId}`,
    );
  });
});
