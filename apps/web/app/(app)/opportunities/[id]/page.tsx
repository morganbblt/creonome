import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OpportunityWorkspace } from "@/src/features/opportunities/opportunity-workspace";
import { loadOpportunityDetail } from "@/src/features/opportunities/opportunity-detail-data";
import { createServerApiClient } from "@/src/lib/api/server-client";

export const metadata: Metadata = { title: "Opportunity" };

type OpportunityPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ panel?: string }>;
};

export default async function OpportunityPage({
  params,
  searchParams,
}: OpportunityPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const result = await loadOpportunityDetail(createServerApiClient(), id);
  if (!result) {
    notFound();
  }

  return (
    <OpportunityWorkspace
      opportunity={result.opportunity}
      initialPanel={query.panel === "modify" ? "modify" : null}
    />
  );
}
