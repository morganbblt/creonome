import type {
  OpportunityBatch,
  OpportunityStrategy,
} from "@creonome/contracts";
import { demoOpportunities, type DemoOpportunity } from "./demo-opportunities";

type OpportunitySource = Pick<
  { getCurrentOpportunities(): Promise<OpportunityBatch> },
  "getCurrentOpportunities"
>;

const presentationByStrategy = Object.fromEntries(
  demoOpportunities.map(
    ({
      strategy,
      badge,
      duration,
      hook,
      why,
      reserve,
      verdict,
      effort,
      channel,
    }) => [
      strategy,
      { badge, duration, hook, why, reserve, verdict, effort, channel },
    ],
  ),
) as Record<
  OpportunityStrategy,
  Pick<
    DemoOpportunity,
    | "badge"
    | "duration"
    | "hook"
    | "why"
    | "reserve"
    | "verdict"
    | "effort"
    | "channel"
  >
>;

export async function loadTodayOpportunities(
  client: OpportunitySource,
): Promise<{
  source: "api" | "demo";
  generatedAt?: string;
  opportunities: DemoOpportunity[];
}> {
  try {
    const batch = await client.getCurrentOpportunities();
    return {
      source: "api",
      generatedAt: batch.generatedAt,
      opportunities: batch.opportunities.map((opportunity) => ({
        ...opportunity,
        ...presentationByStrategy[opportunity.strategy],
      })),
    };
  } catch {
    return { source: "demo", opportunities: demoOpportunities };
  }
}
