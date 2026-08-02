import type { CreditLedger, CreditsResponse } from "@creonome/contracts";
import { describe, expect, it, vi } from "vitest";
import { loadCreditOverview } from "./credits-data";

const account: CreditsResponse = {
  balance: 60,
  reserved: 2,
  available: 58,
};
const ledger: CreditLedger = { entries: [] };

describe("credit overview data", () => {
  it("loads the account and immutable ledger together", async () => {
    const source = {
      getCredits: vi.fn().mockResolvedValue(account),
      getCreditLedger: vi.fn().mockResolvedValue(ledger),
    };

    await expect(loadCreditOverview(source)).resolves.toEqual({
      account,
      ledger,
    });
    expect(source.getCredits).toHaveBeenCalledOnce();
    expect(source.getCreditLedger).toHaveBeenCalledOnce();
  });

  it("fails closed when either workspace read is unavailable", async () => {
    await expect(
      loadCreditOverview({
        getCredits: vi.fn().mockResolvedValue(account),
        getCreditLedger: vi.fn().mockRejectedValue(new Error("offline")),
      }),
    ).resolves.toBeNull();
  });
});
