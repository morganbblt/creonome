import type { Metadata } from "next";
import { CreditsDashboard } from "../../../src/features/credits/credits-dashboard";
import { loadCreditOverview } from "../../../src/features/credits/credits-data";
import { createServerApiClient } from "../../../src/lib/api/server-client";

export const metadata: Metadata = { title: "Credits" };

export default async function CreditsPage() {
  const overview = await loadCreditOverview(createServerApiClient());
  return <CreditsDashboard overview={overview} />;
}
