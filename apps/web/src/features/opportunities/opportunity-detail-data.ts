import type { OpportunityDetail } from "@creonome/contracts";

type OpportunityDetailSource = Pick<
  { getOpportunity(opportunityId: string): Promise<OpportunityDetail> },
  "getOpportunity"
>;

export async function loadOpportunityDetail(
  client: OpportunityDetailSource,
  opportunityId: string,
): Promise<{ opportunity: OpportunityDetail; source: "api" } | null> {
  try {
    return {
      opportunity: await client.getOpportunity(opportunityId),
      source: "api",
    };
  } catch {
    return null;
  }
}
