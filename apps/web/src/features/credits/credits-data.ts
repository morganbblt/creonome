import type { CreditLedger, CreditsResponse } from "@creonome/contracts";

export type CreditOverview = {
  account: CreditsResponse;
  ledger: CreditLedger;
};

type CreditOverviewSource = {
  getCredits(): Promise<CreditsResponse>;
  getCreditLedger(): Promise<CreditLedger>;
};

export async function loadCreditOverview(
  client: CreditOverviewSource,
): Promise<CreditOverview | null> {
  try {
    const [account, ledger] = await Promise.all([
      client.getCredits(),
      client.getCreditLedger(),
    ]);
    return { account, ledger };
  } catch {
    return null;
  }
}
